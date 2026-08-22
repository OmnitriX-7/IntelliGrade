import os
import io
import re
import json
import cv2
import threading
import numpy as np
import uvicorn
import hashlib
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai
from google.genai import types
from PIL import Image
from dotenv import load_dotenv
from supabase import create_client, Client
from web3 import Web3

# Load Environment Variables
load_dotenv()
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")
if not url or not key:
    raise RuntimeError("SUPABASE_URL and SUPABASE_KEY must be set in .env")
supabase: Client = create_client(url, key)

# Configuration Constants
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB per uploaded file
API_SECRET_KEY = os.getenv("API_SECRET_KEY")  # Set this in .env to enable endpoint auth
CHAIN_ID = int(os.getenv("CHAIN_ID", "80002"))  # Polygon Amoy default

# Initialize Web3 Connection
w3 = Web3(Web3.HTTPProvider(os.getenv("BLOCKCHAIN_PROVIDER_URL")))
contract_address = os.getenv("CONTRACT_ADDRESS")
private_key = os.getenv("WALLET_PRIVATE_KEY")

account_address = None
if private_key:
    account_address = w3.eth.account.from_key(private_key).address

# Thread lock to prevent nonce collisions under concurrent requests
_nonce_lock = threading.Lock()

# Load Smart Contract ABI
_base_dir = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(_base_dir, "contract_abi.json"), "r") as file:
    contract_abi = json.load(file)

# Securely Instantiate the Contract
contract = None
if contract_address:
    # Forces the address into the exact checksum format Web3 requires
    checksummed_address = w3.to_checksum_address(contract_address)
    contract = w3.eth.contract(address=checksummed_address, abi=contract_abi)

# Initialize Backend Frameworks
app = FastAPI()
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# CORS — defaults to localhost dev server; set ALLOWED_ORIGINS in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Security & Validation Helpers ---

async def verify_api_key(x_api_key: str = Header(None)):
    """If API_SECRET_KEY is configured in .env, require a matching X-Api-Key header.
    When API_SECRET_KEY is not set, authentication is skipped (open access)."""
    if API_SECRET_KEY and x_api_key != API_SECRET_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing API key.")


def validate_exam_id(exam_id: str):
    """Ensures exam_id is a safe, bounded alphanumeric string."""
    if not re.match(r'^[a-zA-Z0-9_-]{1,50}$', exam_id):
        raise HTTPException(
            status_code=400,
            detail="Invalid exam_id. Use only letters, numbers, hyphens, and underscores (max 50 chars)."
        )


def check_file_size(file_bytes: bytes, filename: str):
    """Rejects files exceeding the configured MAX_FILE_SIZE."""
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File '{filename}' exceeds the {MAX_FILE_SIZE // (1024 * 1024)} MB limit."
        )


# Define Data Models
class QuestionScore(BaseModel):
    question_id: int
    student_response_read: str
    score: float
    remark: str

class GradeReport(BaseModel):
    student_id: str 
    scores: list[QuestionScore]
    total_score: float
    max_score: float
    evaluation_summary: str

# Helper Functions
def extract_qr_code(image_bytes):
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img is None:
        return None
    
    # 1. Primary detector: OpenCV built-in QRCodeDetector (zero OS dependencies)
    try:
        detector = cv2.QRCodeDetector()
        data, _, _ = detector.detectAndDecode(img)
        if data and data.strip():
            return data.strip()
    except Exception:
        pass

    # 2. Fallback detector: pyzbar (only if libzbar is available in the environment)
    try:
        from pyzbar.pyzbar import decode
        decoded_objects = decode(img)
        if decoded_objects:
            return decoded_objects[0].data.decode('utf-8')
    except Exception:
        pass

    return None


# Routes
@app.post("/setup-exam", dependencies=[Depends(verify_api_key)])
async def setup_exam(
    exam_id: str = Form(...),
    exam_name: str = Form(...),
    question_paper: UploadFile = File(...),
    answer_key: UploadFile = File(...)
):
    try:
        validate_exam_id(exam_id)

        qp_bytes = await question_paper.read()
        ak_bytes = await answer_key.read()
        check_file_size(qp_bytes, question_paper.filename)
        check_file_size(ak_bytes, answer_key.filename)

        # Prevent duplicate exam creation — return a clear 409 instead of a DB error
        existing = supabase.table("exams").select("id").eq("id", exam_id).execute()
        if existing.data:
            raise HTTPException(status_code=409, detail=f"Exam '{exam_id}' already exists. Use a different ID.")

        qp_img = Image.open(io.BytesIO(qp_bytes))
        ak_img = Image.open(io.BytesIO(ak_bytes))

        prompt = """
        You are an expert academic evaluator. 
        I have provided two images: 
        1. A blank Question Paper.
        2. The official Answer Key.
        
        Analyze both documents and generate a comprehensive 'Master Grading Criteria'. 
        For each question, specify the exact answer, key phrases to look for, and how many points it is worth. 
        Explicitly state the TOTAL MAX MARKS for the exam.
        Keep the output as clear, structured text.
        """

        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=[prompt, qp_img, ak_img]
        )
        
        supabase.table("exams").insert({
            "id": exam_id,
            "exam_name": exam_name,
            "master_grading_criteria": response.text
        }).execute()

        return {"status": "success", "message": "Exam successfully created!"}

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to setup exam: {str(e)}")

@app.post("/upload-and-grade", dependencies=[Depends(verify_api_key)])
async def process_exam(file: UploadFile = File(...), exam_id: str = Form(...)):
    try:
        validate_exam_id(exam_id)

        image_bytes = await file.read()
        check_file_size(image_bytes, file.filename)

        # Robust file type detection: check extension AND content type
        file_ext = os.path.splitext(file.filename or "")[1].lower()
        is_pdf = file_ext == ".pdf" or file.content_type == "application/pdf"
        
        exam_res = supabase.table("exams").select("master_grading_criteria").eq("id", exam_id).execute()
        if len(exam_res.data) == 0:
            raise HTTPException(status_code=404, detail="Exam ID does not exist in the database.")
        
        criteria = exam_res.data[0]["master_grading_criteria"]

        if is_pdf:
            qr_found = False
            extracted_id = None
            prompt = f"EVALUATION CRITERIA: {criteria}\n1. Read the document and look for the handwritten Student Roll Number.\n2. First transcribe exactly what the student wrote for each question, then evaluate strictly."
            document_content = types.Part.from_bytes(data=image_bytes, mime_type="application/pdf")
            contents_to_send = [prompt, document_content]
        else:
            extracted_id = extract_qr_code(image_bytes)
            qr_found = True if extracted_id else False
            img_pil = Image.open(io.BytesIO(image_bytes))
            if qr_found:
                prompt = f"EVALUATION CRITERIA: {criteria}\nEvaluate strictly. First transcribe exactly what the student wrote, then grade it. The student_id is known: {extracted_id}. Hardcode this into the student_id field."
            else:
                prompt = f"EVALUATION CRITERIA: {criteria}\n1. Look for the handwritten Student Roll Number.\n2. First transcribe exactly what the student wrote for each question, then evaluate strictly."
            contents_to_send = [prompt, img_pil]

        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=contents_to_send,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=GradeReport,
            )
        )
        
        data = json.loads(response.text)
        if not qr_found:
            extracted_id = data["student_id"]

        if not extracted_id or extracted_id.strip() == "":
            raise HTTPException(status_code=422, detail="Could not determine student ID from the submission.")

        detailed_summary = ""
        extracted_list = []
        for qs in data["scores"]:
            detailed_summary += f"Q{qs['question_id']}: {qs['score']} marks - {qs['remark']}\n"
            extracted_list.append(f"Q{qs['question_id']}: {qs['student_response_read']}")
            
        detailed_summary += f"\nOverall: {data['evaluation_summary']}"

        student_check = supabase.table("students").select("student_id, full_name").eq("student_id", extracted_id).execute()

        needs_review = False
        student_name = "Unknown"

        if not student_check.data:
            supabase.table("students").insert({
                "student_id": extracted_id,
                "full_name": student_name
            }).execute()
            needs_review = True
        else:
            student_name = student_check.data[0].get("full_name", "Unknown")

        status = "unregistered_needs_review" if needs_review else "graded"

        evaluation_data = {
            "exam_id": exam_id,
            "student_id": extracted_id,
            "student_name": student_name,
            "raw_extracted_id": extracted_id,
            "total_score": data["total_score"],
            "max_score": data["max_score"],
            "evaluation_summary": detailed_summary,
            "extracted_answers": extracted_list,
            "extraction_method": "QR" if qr_found else "Handwriting",
            "review_status": status,
            "needs_review_mark": needs_review
        }

        # NOTE: Requires a UNIQUE constraint on (exam_id, student_id) in Supabase
        supabase.table("exam_evaluations").upsert(
            evaluation_data,
            on_conflict="exam_id,student_id"
        ).execute()

        # Push to Blockchain (with nonce lock and receipt verification)
        blockchain_anchored = False
        if contract and private_key:
            try:
                record_key = f"{exam_id}_{extracted_id}"
                raw_data_string = f"Student:{extracted_id}|Exam:{exam_id}|Score:{data['total_score']}"
                data_hash = hashlib.sha256(raw_data_string.encode()).hexdigest()
                
                # Lock to prevent nonce collisions when multiple requests arrive simultaneously
                with _nonce_lock:
                    nonce = w3.eth.get_transaction_count(account_address, 'pending')
                    tx = contract.functions.recordGradeHash(record_key, data_hash).build_transaction({
                        'chainId': CHAIN_ID,
                        'gas': 200000,
                        'maxFeePerGas': w3.to_wei('30', 'gwei'),
                        'maxPriorityFeePerGas': w3.to_wei('25', 'gwei'),
                        'nonce': nonce,
                    })
                    signed_tx = w3.eth.account.sign_transaction(tx, private_key=private_key)
                    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)

                # Wait for confirmation outside the lock so other requests aren't blocked
                receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=60)
                if receipt.status == 1:
                    blockchain_anchored = True
                else:
                    raise Exception("Transaction reverted on-chain")

            except Exception as blockchain_err:
                print(f"Blockchain Error: {blockchain_err}")
                # Flag the evaluation so the teacher knows the on-chain anchor is missing
                supabase.table("exam_evaluations").update({
                    "review_status": "blockchain_pending"
                }).eq("exam_id", exam_id).eq("student_id", extracted_id).execute()

        return {"status": "success", "review_status": status, "blockchain_anchored": blockchain_anchored}

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=10000)