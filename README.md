# IntelliGrade

**AI-powered exam evaluation with blockchain-backed grade integrity.**

IntelliGrade is a full-stack platform that uses Google Gemini's multimodal vision capabilities to read, interpret, and grade handwritten or digital exam scripts — no brittle OCR required. Every graded result is permanently anchored to the Polygon blockchain via a SHA-256 cryptographic fingerprint, making unauthorized score tampering instantly detectable.

---

## Features

- **Multimodal AI Evaluation** — Submits raw exam images or PDFs directly to Gemini 2.5 Flash, which reads handwriting contextually and evaluates answers against a generated master rubric. Eliminates the fragility of traditional OCR pipelines.
- **Auto-Generated Grading Rubric** — Teachers upload a blank question paper and official answer key. The AI synthesizes a structured Master Grading Criteria document that drives all subsequent evaluations for that exam.
- **Dual-Route Identity Detection** — Student identity is extracted via embedded QR code (fast path) or Gemini's handwriting recognition of a roll number (fallback path), with a manual review flag raised for unregistered IDs.
- **Schema-Enforced JSON Output** — LLM responses are constrained to a strict Pydantic schema (`GradeReport`), guaranteeing a structured, validated payload with per-question scores, transcriptions, and remarks on every call.
- **Blockchain Integrity Anchoring** — A SHA-256 fingerprint derived from `Student ID + Exam ID + Score` is written to a Solidity smart contract on Polygon Amoy Testnet, creating an immutable source of truth for every grade.
- **Tamper Detection** — Any modification to a score in the Supabase database breaks the hash consistency against the on-chain record, enabling instant, cryptographically provable tamper detection.
- **Dockerized Deployment** — Backend runs in a Docker container on Render, with `libzbar0` and OpenCV bundled at the OS level for reliable QR decoding in any environment.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React, deployed on Vercel |
| **Backend** | FastAPI (Python 3.12), Uvicorn |
| **AI Engine** | Google Gemini 2.5 Flash (`google-genai`) |
| **QR Decoding** | pyzbar + OpenCV (`opencv-python-headless`) |
| **Database & Auth** | Supabase (PostgreSQL) |
| **Blockchain** | Solidity smart contract on Polygon Amoy Testnet, Web3.py |
| **Infrastructure** | Docker container on Render |

---

## Architecture & Data Flow

```
[Teacher Upload]                         [Student Submission]
Question Paper + Answer Key              Image / PDF answer script
        │                                         │
        ▼                                         ▼
┌─────────────────────────────────────────────────────────────┐
│                        FastAPI Backend                      │
│                                                             │
│  POST /setup-exam              POST /upload-and-grade       │
│  ─────────────────             ──────────────────────────   │
│  Gemini analyzes both          1. QR decode (pyzbar/cv2)    │
│  documents and generates          OR handwriting OCR        │
│  a Master Grading Criteria     2. Gemini evaluates script   │
│  stored in Supabase               against stored criteria   │
│                                3. Pydantic schema enforced  │
└───────────────────────────────────┬─────────────────────────┘
                                    │
                    Structured GradeReport JSON
                                    │
              ┌─────────────────────┴─────────────────────┐
              │ Route 1                                    │ Route 2
              ▼                                            ▼
  ┌───────────────────────┐                  ┌────────────────────────┐
  │     Supabase DB       │                  │  SHA-256 Hash Generated│
  │  exam_evaluations     │                  │  from score payload    │
  │  students             │                  └─────────────┬──────────┘
  │  exams                │                                │
  └───────────────────────┘                                ▼
                                             ┌────────────────────────┐
                                             │  Polygon Amoy Testnet  │
                                             │  Smart Contract        │
                                             │  recordGradeHash()     │
                                             └────────────────────────┘
```

### Verification Cryptography

Each grading instance produces a deterministic fingerprint:

```
Payload  =  "Student:{student_id}|Exam:{exam_id}|Score:{total_score}"
Hash     =  SHA-256(Payload)
```

This hash is written on-chain at grading time. Any subsequent modification to `total_score` in Supabase produces a different hash, which no longer matches the immutable on-chain record — making tampering immediately verifiable by anyone.

---

## Project Structure

```
IntelliGrade/
├── backend/
│   ├── main.py               # FastAPI app, all routes and logic
│   ├── contract_abi.json     # ABI for the deployed Solidity contract
│   ├── requirements.txt      # Python dependencies
│   ├── Dockerfile            # Docker build with libzbar0 + OpenCV
│   └── .env                  # Local environment variables (not committed)
└── frontend/
    ├── src/
    │   └── components/
    │       ├── TeacherDashboard.jsx
    │       └── TeacherDashboardStyles.js
    └── ...
```

---

## Environment Setup

Create a `.env` file inside the `backend/` directory:

```env
# Supabase
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_service_role_key

# Google Gemini
GEMINI_API_KEY=your_google_gemini_api_key

# Polygon / Web3
BLOCKCHAIN_PROVIDER_URL=your_polygon_amoy_rpc_url
CONTRACT_ADDRESS=your_deployed_contract_address
WALLET_PRIVATE_KEY=your_wallet_private_key
```

> **Security note:** The wallet associated with `WALLET_PRIVATE_KEY` only needs enough MATIC to cover gas fees for `recordGradeHash()` transactions. Keep its balance minimal.

---

## Running Locally

**Prerequisites:** Docker, or Python 3.12+ with `libzbar0` installed on your system.

### With Docker (recommended)

```bash
cd backend
docker build -t intelligrade-backend .
docker run -p 10000:10000 --env-file .env intelligrade-backend
```

### Without Docker

```bash
# macOS
brew install zbar

# Ubuntu / Debian
sudo apt-get install libzbar0

cd backend
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 10000 --reload
```

The API will be available at `http://localhost:10000`.

---

## API Reference

### `POST /setup-exam`

Creates a new exam and generates a Master Grading Criteria using AI.

| Field | Type | Description |
|---|---|---|
| `exam_id` | `string` (form) | Unique exam identifier (e.g. `oop-midterm`) |
| `exam_name` | `string` (form) | Human-readable exam name |
| `question_paper` | `file` (image) | Blank question paper |
| `answer_key` | `file` (image) | Official answer key |

**Response:**
```json
{ "status": "success", "message": "Exam successfully created!" }
```

---

### `POST /upload-and-grade`

Grades a student's answer script against a stored exam rubric.

| Field | Type | Description |
|---|---|---|
| `exam_id` | `string` (form) | The exam to grade against |
| `file` | `file` (image or PDF) | Student's answer script |

**Response:**
```json
{ "status": "success", "review_status": "graded" }
```

`review_status` is either `"graded"` (student found in DB) or `"unregistered_needs_review"` (student ID not recognised).

---

## Deployment

The backend is deployed as a Docker web service on **Render**. The `Dockerfile` installs `libzbar0` at the OS level before installing Python packages, which is required for `pyzbar` to locate the native zbar shared library at runtime.

The frontend is deployed on **Vercel** and communicates with the Render backend via the `API_BASE_URL` constant defined in `TeacherDashboard.jsx`.

---

## Database Schema (Supabase)

**`exams`**
| Column | Type | Description |
|---|---|---|
| `id` | `text` (PK) | Unique exam ID |
| `exam_name` | `text` | Human-readable name |
| `master_grading_criteria` | `text` | AI-generated rubric |

**`students`**
| Column | Type | Description |
|---|---|---|
| `student_id` | `text` (PK) | Roll number / QR payload |
| `full_name` | `text` | Student's full name |

**`exam_evaluations`**
| Column | Type | Description |
|---|---|---|
| `id` | `uuid` (PK) | Auto-generated |
| `exam_id` | `text` | Foreign key to `exams` |
| `student_id` | `text` | Foreign key to `students` |
| `total_score` | `float` | Score awarded |
| `max_score` | `float` | Maximum possible score |
| `evaluation_summary` | `text` | Per-question breakdown |
| `extraction_method` | `text` | `"QR"` or `"Handwriting"` |
| `review_status` | `text` | `"graded"` or `"unregistered_needs_review"` |
