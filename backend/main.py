import os
import io
import json
import cv2
import numpy as np
import uvicorn
from pyzbar.pyzbar import decode
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai
from google.genai import types
from PIL import Image
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()
url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(url, key)

app = FastAPI()
client = genai.Client()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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

def extract_qr_code(image_bytes):
    nparr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    decoded_objects = decode(img)
    if decoded_objects:
        return decoded_objects[0].data.decode('utf-8')
    return None

@app.post("/setup-exam")
async def setup_exam(
    exam_id: str = Form(...),
    exam_name: str = Form(...),
    question_paper: UploadFile = File(...),
    answer_key: UploadFile = File(...)
):
    try:
        qp_bytes = await question_paper.read()
        ak_bytes = await answer_key.read()

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

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to setup exam: {str(e)}")

@app.post("/upload-and-grade")
async def process_exam(file: UploadFile = File(...), exam_id: str = Form(...)):
    try:
        image_bytes = await file.read()
        file_ext = file.filename.split('.')[-1].lower()
        is_pdf = file_ext == "pdf"
        
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

        existing_eval = supabase.table("exam_evaluations").select("id").eq("exam_id", exam_id).eq("student_id", extracted_id).execute()

        if len(existing_eval.data) > 0:
            eval_record_id = existing_eval.data[0]["id"]
            supabase.table("exam_evaluations").update(evaluation_data).eq("id", eval_record_id).execute()
        else:
            supabase.table("exam_evaluations").insert(evaluation_data).execute()

        return {"status": "success", "review_status": status}

    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)