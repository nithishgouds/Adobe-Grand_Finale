from fastapi import FastAPI, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from typing import List, Optional
from pathlib import Path
from datetime import datetime
from urllib.parse import quote
import json
import shutil
import subprocess
import uuid
import sys

DEFAULT_PDF_FOLDER = Path("round1b") / "PDFs"
INPUT_PATH = Path("round1b") / "input.json"
OUTPUT_PATH = Path("round1b") / "output.json"

DEFAULT_PDF_FOLDER.mkdir(parents=True, exist_ok=True)
SESSION_FOLDERS = {}

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)
app.mount("/PDFs", StaticFiles(directory=DEFAULT_PDF_FOLDER), name="pdfs")


def create_session_folder():
    session_id = str(uuid.uuid4())
    # (Keeping a single folder backing all sessions as per your current approach)
    SESSION_FOLDERS[session_id] = DEFAULT_PDF_FOLDER
    return session_id, DEFAULT_PDF_FOLDER


def clear_session_folder(session_id: str):
    if session_id in SESSION_FOLDERS:
        folder_path = SESSION_FOLDERS[session_id]
        for file in folder_path.glob("*"):
            file.unlink()
        del SESSION_FOLDERS[session_id]

# ---- UPLOAD: save PDFs only (no processing) ----


@app.post("/upload")
async def upload_pdfs(
    pdfs: List[UploadFile] = File(...),
    session_id: Optional[str] = Query(None),
    challenge_id: Optional[str] = Query("default_challenge"),
    test_case_name: Optional[str] = Query("default_test_case"),
    description: Optional[str] = Query("default_description"),
    persona_role: Optional[str] = Query("default_role"),
    task: Optional[str] = Query("default_task")
):
    try:
        if not session_id or session_id not in SESSION_FOLDERS:
            session_id, folder_path = create_session_folder()
        else:
            folder_path = SESSION_FOLDERS[session_id]

        documents = []
        for pdf in pdfs:
            file_path = folder_path / pdf.filename
            if file_path.exists():
                continue
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(pdf.file, buffer)
            documents.append(
                {"filename": pdf.filename, "title": Path(pdf.filename).stem})

        return {
            "session_id": session_id,
            "uploaded": [d["filename"] for d in documents],
        }
    except Exception as e:
        return {"error": str(e)}

# ---- PROCESS: run your pipeline on all PDFs present, then return output.json ----


@app.post("/process")
async def process_all(
    session_id: Optional[str] = Query(None),
    challenge_id: Optional[str] = Query("default_challenge"),
    test_case_name: Optional[str] = Query("default_test_case"),
    description: Optional[str] = Query("default_description"),
    persona_role: Optional[str] = Query("default_role"),
    task: Optional[str] = Query("default_task")
):
    try:
        if not session_id or session_id not in SESSION_FOLDERS:
            return {"error": "Invalid session_id"}

        folder_path = SESSION_FOLDERS[session_id]
        pdfs = sorted([p.name for p in folder_path.glob("*.pdf")])

        input_json = {
            "challenge_info": {
                "challenge_id": challenge_id,
                "test_case_name": test_case_name,
                "description": description,
            },
            "documents": [{"filename": n, "title": Path(n).stem} for n in pdfs],
            "persona": {"role": persona_role},
            "job_to_be_done": {"task": task},
        }
        with open(INPUT_PATH, "w", encoding="utf-8") as f:
            json.dump(input_json, f, indent=2)

        skeleton_output = {
            "metadata": {
                "input_documents": pdfs,
                "persona": persona_role,
                "job_to_be_done": task,
                "processing_timestamp": datetime.utcnow().isoformat(),
            },
            "extracted_sections": [],
            "subsection_analysis": [],
        }
        with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
            json.dump(skeleton_output, f, indent=2)

        # Use current interpreter for portability
        subprocess.run(
            ["C:/Users/chitr/Documents/GitHub/Adobe-Finale/backend/venv/Scripts/python.exe", "main.py"], check=False)
        # If you also want relevant pages calculation: subprocess.run([sys.executable, "relevantPages.py"], check=False)

        if OUTPUT_PATH.exists():
            with open(OUTPUT_PATH, "r", encoding="utf-8") as f:
                return {"session_id": session_id, "data": json.load(f)}
        else:
            return {"error": "output.json not found", "session_id": session_id}
    except Exception as e:
        return {"error": str(e)}

# ---- List PDFs (with absolute URLs for the viewer) ----


@app.get("/list-pdfs")
async def list_pdfs(session_id: Optional[str] = Query(None)):
    folder_path = SESSION_FOLDERS.get(session_id, DEFAULT_PDF_FOLDER)
    files = []
    for p in folder_path.glob("*.pdf"):
        files.append({"name": p.name, "url": f"/PDFs/{quote(p.name)}"})
    return {"session_id": session_id, "files": files}

# ---- Fetch output.json if needed ----


@app.get("/output")
async def get_output():
    if OUTPUT_PATH.exists():
        with open(OUTPUT_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"error": "output.json not found"}

# ---- End session & delete PDFs ----


@app.post("/end-session")
async def end_session(session_id: str = Query(...)):
    clear_session_folder(session_id)
    return {"message": f"Session {session_id} ended and PDFs deleted."}
