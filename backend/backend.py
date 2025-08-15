from fastapi import FastAPI, UploadFile, File, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from typing import List, Optional
from pydantic import BaseModel
from pathlib import Path
import json
import shutil
import subprocess
import uuid
from datetime import datetime

# --- Configuration ---
PDF_FOLDER = Path("round1b") / "PDFs"
INPUT_PATH = Path("round1b") / "input.json"
OUTPUT_PATH = Path("round1b") / "output.json"
PDF_FOLDER.mkdir(parents=True, exist_ok=True)
SESSION_FOLDERS = {}

app = FastAPI()

# --- Middleware ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Static File Serving (Crucial for Viewer) ---
app.mount("/files", StaticFiles(directory=PDF_FOLDER), name="files")

# --- Pydantic Models ---
class TextSelectionRequest(BaseModel):
    session_id: str
    selected_text: str

# --- Helper Functions ---
def create_session_folder():
    session_id = str(uuid.uuid4())
    SESSION_FOLDERS[session_id] = PDF_FOLDER
    return session_id, PDF_FOLDER

def clear_session_folder(session_id: str):
    if session_id in SESSION_FOLDERS:
        folder_path = SESSION_FOLDERS[session_id]
        # Only delete files, not the folder itself
        for file_path in folder_path.glob("*"):
            if file_path.is_file():
                file_path.unlink()
        del SESSION_FOLDERS[session_id]
        print(f"Cleared files for session: {session_id}")

# --- API Endpoints ---
@app.post("/upload-past-docs")
async def upload_past_docs(
    pdfs: List[UploadFile] = File(...),
    persona_role: Optional[str] = Query("default_role"),
    task: Optional[str] = Query("default_task")
):
    """
    Handles uploading the knowledge base of PAST documents and starts a session.
    """
    try:
        session_id, folder_path = create_session_folder()
        
        documents = []
        for pdf in pdfs:
            file_path = folder_path / pdf.filename
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(pdf.file, buffer)
            documents.append({"filename": pdf.filename, "title": Path(pdf.filename).stem})

        # Here you would run your heavy processing on the past docs
        print(f"Processing {len(documents)} past documents for session {session_id}...")
        # (Your main.py, etc., would go here)
        print("Processing complete.")

        # Return the session ID and the list of uploaded files
        return {"session_id": session_id, "uploaded_files": [doc["filename"] for doc in documents]}

    except Exception as e:
        return {"error": str(e)}

@app.post("/upload-current-doc")
async def upload_current_doc(
    pdf: UploadFile = File(...),
    session_id: str = Query(...)
):
    """
    Handles uploading the CURRENT document to be viewed. Does NOT re-process.
    """
    if not session_id or session_id not in SESSION_FOLDERS:
        return {"error": "Invalid or missing session ID. Please upload past documents first."}
    
    try:
        folder_path = SESSION_FOLDERS[session_id]
        file_path = folder_path / pdf.filename
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(pdf.file, buffer)
            
        # Simply confirm the upload so the frontend can display it
        return {"message": "Current document uploaded successfully", "filename": pdf.filename}

    except Exception as e:
        return {"error": str(e)}

@app.post("/select-text")
async def select_text(request: TextSelectionRequest):
    """
    Receives selected text (from the current doc) and finds relevant info 
    in the past docs. This is a placeholder.
    """
    print(f"Received text selection for session {request.session_id}: '{request.selected_text}'")
    
    mock_response = {
        "extracted_sections": [
            {
                "pdfName": "example_past_doc.pdf", # This should come from your past docs
                "pageNo": 5,
                "title": "Analysis of Selected Text",
                "snippet": f"This section in a past document provides details on '{request.selected_text}'..."
            }
        ]
    }
    return {"data": mock_response}

@app.post("/end-session")
async def end_session(session_id: str):
    clear_session_folder(session_id)
    return {"message": f"Session {session_id} ended and files deleted."}