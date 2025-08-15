from fastapi import FastAPI, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional
from pathlib import Path
from datetime import datetime
import shutil
import json
import uuid
import subprocess

DEFAULT_PDF_FOLDER = Path("Documents") / "PDFs"
INPUT_PATH = Path("Documents") / "input.json"
OUTPUT_PATH = Path("Documents") / "output.json"

DEFAULT_PDF_FOLDER.mkdir(parents=True, exist_ok=True)
SESSION_FOLDERS = {}

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def create_session_folder():
    session_id = str(uuid.uuid4())
    folder_path = DEFAULT_PDF_FOLDER / session_id
    folder_path.mkdir(parents=True, exist_ok=True)
    SESSION_FOLDERS[session_id] = folder_path
    return session_id, folder_path

@app.post("/upload")
async def upload_pdfs(
    pdfs: List[UploadFile] = File(...),
    session_id: Optional[str] = Query(None),
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
            documents.append({
                "filename": pdf.filename,
                "title": Path(pdf.filename).stem
            })

        input_json = {
            "documents": documents,
            "persona": {"role": persona_role},
            "job_to_be_done": {"task": task}
        }
        with open(INPUT_PATH, "w", encoding="utf-8") as f:
            json.dump(input_json, f, indent=2)

        skeleton_output = {
            "metadata": {
                "input_documents": [doc["filename"] for doc in documents],
                "persona": persona_role,
                "job_to_be_done": task,
                "processing_timestamp": datetime.utcnow().isoformat()
            },
            "extracted_sections": [],
            "subsection_analysis": []
        }
        with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
            json.dump(skeleton_output, f, indent=2)

        subprocess.run(["python", "main.py"], check=False)
        subprocess.run(["python", "relevantPages.py"], check=False)

        if OUTPUT_PATH.exists():
            with open(OUTPUT_PATH, "r", encoding="utf-8") as f:
                return {"session_id": session_id, "data": json.load(f)}
        else:
            return {"error": "output.json not found", "session_id": session_id}

    except Exception as e:
        return {"error": str(e)}

@app.get("/")
def root():
    return {"message": "Backend is running"}
