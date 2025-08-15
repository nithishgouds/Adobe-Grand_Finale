from fastapi import FastAPI, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from typing import List
from pydantic import BaseModel
from pathlib import Path
import shutil
import subprocess
import uuid

PDF_FOLDER = Path("round1b") / "PDFs"
PDF_FOLDER.mkdir(parents=True, exist_ok=True)
SESSION_FOLDERS = {}

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/PDFs", StaticFiles(directory=PDF_FOLDER), name="files")


class TextSelectionRequest(BaseModel):
    session_id: str
    selected_text: str


def create_session_folder():
    session_id = str(uuid.uuid4())
    SESSION_FOLDERS[session_id] = PDF_FOLDER
    return session_id, PDF_FOLDER


def clear_session_folder(session_id: str):
    if session_id in SESSION_FOLDERS:
        folder_path = SESSION_FOLDERS[session_id]
        for file_path in folder_path.glob("*"):
            if file_path.is_file():
                file_path.unlink()
        del SESSION_FOLDERS[session_id]
        print(f"Cleared files for session: {session_id}")


@app.post("/upload-past-docs")
async def upload_past_docs(pdfs: List[UploadFile] = File(...)):
    try:
        session_id, folder_path = create_session_folder()
        documents = []
        for pdf in pdfs:
            file_path = folder_path / pdf.filename
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(pdf.file, buffer)
            documents.append(pdf.filename)
        print(f"✅ Saved {len(documents)} PDFs to {folder_path}")
        try:
            subprocess.run(
                [
                    "C:/Users/chitr/Documents/GitHub/Adobe-Finale/backend/venv/Scripts/python.exe", "save_pdfs.py",
                    "--pdf_folder", str(folder_path),
                    "--session_id", session_id
                ],
                check=True
            )
            print("📂 save_pdfs.py executed successfully.")
        except subprocess.CalledProcessError as e:
            print(f"⚠ Error while running save_pdfs.py: {e}")
            return {"error": "Failed to process uploaded documents."}
        return {"session_id": session_id, "uploaded_files": documents}
    except Exception as e:
        return {"error": str(e)}


@app.post("/upload-current-doc")
async def upload_current_doc(pdf: UploadFile = File(...), session_id: str = Query(...)):
    if session_id not in SESSION_FOLDERS:
        return {"error": "Invalid or missing session ID. Please upload past documents first."}
    try:
        folder_path = SESSION_FOLDERS[session_id]
        file_path = folder_path / pdf.filename
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(pdf.file, buffer)
        return {"message": "Current document uploaded successfully", "filename": pdf.filename}
    except Exception as e:
        return {"error": str(e)}


@app.post("/select-text")
async def select_text(request: TextSelectionRequest):
    print(
        f"Received text selection for session {request.session_id}: '{request.selected_text}'")
    return {
        "data": {
            "extracted_sections": [
                {
                    "pdfName": "example_past_doc.pdf",
                    "pageNo": 5,
                    "title": "Analysis of Selected Text",
                    "snippet": f"This section in a past document provides details on '{request.selected_text}'..."
                }
            ]
        }
    }


@app.post("/end-session")
async def end_session(session_id: str):
    clear_session_folder(session_id)
    return {"message": f"Session {session_id} ended and files deleted."}