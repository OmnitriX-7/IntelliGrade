# IntelliGrade

An automated exam grading and verification platform that uses multimodal vision AI to evaluate handwritten answer scripts against dynamic rubrics, anchoring every grade to the Polygon blockchain for tamper-proof integrity.

---

## The Problem & The Solution

| Challenge | Traditional Approach | IntelliGrade Solution |
|---|---|---|
| **Handwriting OCR** | Brittle OCR engines fail on cursive, varied handwriting, and poor image scans. | **Gemini 2.5 Flash Multimodal Vision** contextually reads and transcribes full handwritten student scripts directly without traditional OCR pipelines. |
| **Rubric Consistency** | Manual grading by different examiners introduces subjective bias and fatigue. | **AI Rubric Synthesis** combines blank question papers and official answer keys into a structured master grading criteria applied identically to every script. |
| **Grade Tampering** | Scores stored in centralized databases can be modified, manipulated, or accidentally overwritten. | **Polygon Blockchain Fingerprinting** computes a deterministic `SHA-256(Student ID + Exam ID + Score)` hash and writes it to an immutable smart contract. |
| **Student Identification** | Lost or missing student IDs cause grading delays. | **Dual-Route Identification** decodes embedded QR codes for instant lookup, with contextual AI handwriting recognition fallback and manual review flags for unregistered students. |

---

## System Architecture

```
                                  [ TEACHER WORKFLOW ]
                   Blank Question Paper  +  Official Answer Key
                                        │
                                        ▼
                             POST /setup-exam (FastAPI)
                                        │
                                        ▼
                         [ Gemini 2.5 Flash Multimodal ]
                           Synthesizes structured rubric
                                        │
                                        ▼
                             [ Supabase: exams Table ]
                                        │
┌───────────────────────────────────────┴────────────────────────────────────────┐
│                                                                                │
│                                 [ STUDENT WORKFLOW ]                           │
│                          Handwritten Answer Sheet / PDF                        │
│                                        │                                       │
│                                        ▼                                       │
│                         POST /upload-and-grade (FastAPI)                       │
│                                        │                                       │
│                     ┌──────────────────┴──────────────────┐                    │
│                     ▼                                     ▼                    │
│             [ QR Path: pyzbar/OpenCV ]           [ Fallback: AI Vision ]       │
│             Decodes student roll number          Reads handwritten roll number │
│                     └──────────────────┬──────────────────┘                    │
│                                        ▼                                       │
│                         [ Gemini 2.5 Flash Evaluation ]                        │
│                           Grades against stored rubric                         │
│                           Enforces strict Pydantic JSON                        │
│                                        │                                       │
│                     ┌──────────────────┴──────────────────┐                    │
│                     ▼                                     ▼                    │
│          [ Supabase Database ]                 [ SHA-256 Hash Engine ]         │
│          Stores score breakdown,               Generates cryptographic         │
│          transcriptions & review state         fingerprint of score payload    │
│                                                           │                    │
│                                                           ▼                    │
│                                                [ Polygon Amoy Testnet ]        │
│                                                GradeVerifier.sol records hash  │
│                                                Receipt verified & locked       │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Backend & AI
- **Framework:** FastAPI (Python 3.12) with Uvicorn / Gunicorn ASGI server
- **AI Engine:** Google Gemini 2.5 Flash (`google-genai`) for multimodal vision & evaluation
- **Schema Validation:** Pydantic v2 for structured JSON responses
- **Image & QR Processing:** OpenCV (`opencv-python-headless`), `pyzbar`, Pillow (`PIL`)

### Database & Storage
- **Database:** Supabase (PostgreSQL) with Row Level Security (RLS)
- **Client:** `supabase-py` for parameterized queries and conflict-safe upserts

### Blockchain & Verification
- **Smart Contract:** Solidity `^0.8.0` deployed on **Polygon Amoy Testnet**
- **Web3 Integration:** `web3.py` with nonce synchronization lock and on-chain transaction receipt confirmation
- **Contract Address:** `0xfcc16504bE8BbB8a0133Bc56d565E7Cb86B09DE1`

### Frontend & Infrastructure
- **Frontend:** React 19, Vite, clean dashboard styling
- **Containerization:** Docker multi-stage build with native `libzbar0` OS libraries
- **Deployment Targets:** Render (Dockerized backend) + Vercel (Frontend SPA)

---

## Project Structure

```
IntelliGrade/
├── backend/
│   ├── main.py               # FastAPI backend: auth, validation, AI grading, Web3 transactions
│   ├── contract_abi.json     # ABI definition for GradeVerifier smart contract
│   ├── requirements.txt      # Pinned Python dependencies
│   ├── Dockerfile            # Container build with OS-level libzbar0 & OpenCV support
│   └── .env                  # Backend environment variables (gitignored)
├── blockchain/
│   └── GradeVerifier.sol     # Solidity smart contract with immutable grade hash mapping
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── TeacherDashboard.jsx       # Exam setup & bulk answer sheet grading UI
│   │   │   └── TeacherDashboardStyles.js  # Dashboard component styles
│   │   ├── App.jsx                        # Root React component
│   │   └── main.jsx                       # React DOM entry point
│   ├── package.json          # Frontend dependencies & scripts
│   ├── vite.config.js        # Vite build configuration
│   └── index.html            # SPA entry point with SEO metadata
├── .gitignore                # Root gitignore protecting secrets and agent configs
└── README.md                 # Project documentation
```

---

## Environment Configuration

Create a `.env` file in the `backend/` directory:

```env
# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Supabase (Database)
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_KEY=your_supabase_service_role_key

# Blockchain / Web3 (Polygon Amoy)
BLOCKCHAIN_PROVIDER_URL=https://polygon-amoy.drpc.org
CONTRACT_ADDRESS=0xfcc16504bE8BbB8a0133Bc56d565E7Cb86B09DE1
WALLET_PRIVATE_KEY=your_wallet_private_key
CHAIN_ID=80002

# Security & CORS
ALLOWED_ORIGINS=http://localhost:5173,https://your-frontend.vercel.app
API_SECRET_KEY=your_optional_api_secret_key
```

---

## Getting Started

### Prerequisites
- Python 3.12+
- Node.js 18+ & npm
- C/C++ runtime or `libzbar0` (for local QR decoding outside Docker)

---

### 1. Running the Backend Locally

```bash
# Navigate to backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Start the FastAPI server
python main.py
```

- API Server: `http://localhost:10000`
- Interactive API Docs (Swagger): `http://localhost:10000/docs`

---

### 2. Running the Frontend Locally

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```

- Web Dashboard: `http://localhost:5173`

---

### 3. Running with Docker

```bash
cd backend
docker build -t intelligrade-backend .
docker run -p 10000:10000 --env-file .env intelligrade-backend
```

---

## API Reference

### `POST /setup-exam`
Uploads a blank question paper and an answer key to synthesize an AI master rubric.

| Field | Type | Description |
|---|---|---|
| `exam_id` | `string` (Form) | Alphanumeric identifier (e.g. `cs401-midterm`, max 50 chars) |
| `exam_name` | `string` (Form) | Human-readable title of the exam |
| `question_paper` | `file` (Image) | Blank question paper image (max 10 MB) |
| `answer_key` | `file` (Image) | Official answer key image (max 10 MB) |

**Sample Response:**
```json
{
  "status": "success",
  "message": "Exam successfully created!"
}
```

---

### `POST /upload-and-grade`
Submits a student's answer sheet (Image or PDF) for AI grading against the stored exam rubric.

| Field | Type | Description |
|---|---|---|
| `exam_id` | `string` (Form) | Target exam identifier |
| `file` | `file` (Image/PDF) | Student's handwritten answer script (max 10 MB) |

**Sample Response:**
```json
{
  "status": "success",
  "review_status": "graded",
  "blockchain_anchored": true
}
```

---

## Database Schema (Supabase)

### `exams`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `text` | Primary Key | Unique exam identifier |
| `exam_name` | `text` | Not Null | Display name of the exam |
| `master_grading_criteria` | `text` | Not Null | AI-synthesized rubric with question breakdown |
| `created_at` | `timestamptz` | Default `now()` | Timestamp of creation |

### `students`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `student_id` | `text` | Primary Key | Roll number / student identifier |
| `full_name` | `text` | Default `'Unknown'` | Student's full name |
| `created_at` | `timestamptz` | Default `now()` | Timestamp of registration |

### `exam_evaluations`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `bigint` | Primary Key (Identity) | Auto-incrementing record ID |
| `exam_id` | `text` | FK → `exams(id)` | Associated exam |
| `student_id` | `text` | FK → `students(student_id)` | Associated student |
| `total_score` | `float8` | Not Null | Final score awarded by AI |
| `max_score` | `float8` | Not Null | Maximum possible marks |
| `evaluation_summary` | `text` | Not Null | Per-question score & reasoning breakdown |
| `extracted_answers` | `text[]` | Nullable | Exact text transcribed from handwriting |
| `extraction_method` | `text` | `'QR'` / `'Handwriting'` | How student identity was resolved |
| `review_status` | `text` | Not Null | `'graded'`, `'unregistered_needs_review'`, or `'blockchain_pending'` |
| `needs_review_mark` | `boolean` | Default `false` | Flag for teacher review |
| `—` | `UNIQUE` | `(exam_id, student_id)` | Prevents duplicate evaluations per exam |

---

## Cryptographic Verification

Each evaluation generates an immutable SHA-256 fingerprint:

```
Payload  = "Student:{student_id}|Exam:{exam_id}|Score:{total_score}"
Hash     = SHA-256(Payload)
```

The hash is submitted to `GradeVerifier.sol` via `recordGradeHash(recordKey, dataHash)`:
1. The transaction is signed server-side using the deployer wallet.
2. Thread locks ensure sequential nonce allocation under concurrent grading requests.
3. The server awaits transaction confirmation receipt on Polygon Amoy before marking `blockchain_anchored: true`.
4. Anyone can independently verify that a student's database score has not been tampered with by re-hashing the score payload and calling `getGradeHash(recordKey)` on-chain.

---

## License

This project is licensed under the MIT License.
