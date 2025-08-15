from fastapi import FastAPI, UploadFile, File, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from typing import List, Dict
from pydantic import BaseModel
from pathlib import Path
import shutil
import subprocess
import uuid
import sys  # ✅ FIX: Import sys to get the python executable path

# This is the root folder for all publicly served files
PUBLIC_FOLDER = Path("public")
PUBLIC_FOLDER.mkdir(parents=True, exist_ok=True)

# Keep track of the full path for each session
SESSION_FOLDERS: Dict[str, Path] = {}

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ FIX: Serve files from the new, more generic 'public' folder
app.mount("/files", StaticFiles(directory=PUBLIC_FOLDER), name="files")

class TextSelectionRequest(BaseModel):
    pdf_name: str
    page_no: int
    selected_text: str


def create_session_folder() -> str:
    # ✅ FIX: Create a unique sub-folder for each session
    session_id = str(uuid.uuid4())
    session_path = PUBLIC_FOLDER / session_id
    session_path.mkdir(exist_ok=True)
    SESSION_FOLDERS[session_id] = session_path
    return session_id

def run_processing_script(folder_path: str, session_id: str):
    """Function to be run in the background."""
    print(f"📂 Starting background processing for session {session_id}...")
    try:
        # ✅ FIX: Use sys.executable to get the current python interpreter path. It's portable!
        subprocess.run(
            [
                "C:/Users/chitr/Documents/GitHub/Adobe-Finale/backend/venv/Scripts/python.exe", "save_pdfs.py",
                "--pdf_folder", folder_path,
                "--session_id", session_id
            ],
            check=True,
            capture_output=True,  # Capture stdout/stderr for better logging
            text=True
        )
        print(
            f"✅ save_pdfs.py executed successfully for session: {session_id}.")
    except subprocess.CalledProcessError as e:
        print(f"⚠ Error while running save_pdfs.py for session {session_id}:")
        print(f"--- STDOUT ---\n{e.stdout}")
        print(f"--- STDERR ---\n{e.stderr}")


@app.post("/upload-past-docs")
async def upload_past_docs(background_tasks: BackgroundTasks, pdfs: List[UploadFile] = File(...)):
    try:
        session_id = create_session_folder()
        folder_path = SESSION_FOLDERS[session_id]

        documents = []
        for pdf in pdfs:
            # ✅ FIX: Save the file inside its unique session folder
            file_path = folder_path / pdf.filename
            with file_path.open("wb") as buffer:
                shutil.copyfileobj(pdf.file, buffer)
            documents.append(pdf.filename)

        print(f"✅ Saved {len(documents)} PDFs to {folder_path}")

        # ✅ FIX: Run the heavy script in the background to avoid timeouts
        background_tasks.add_task(
            run_processing_script, str(folder_path), session_id)

        return {"session_id": session_id, "uploaded_files": documents}
    except Exception as e:
        return {"error": str(e)}


@app.post("/upload-current-doc")
async def upload_current_doc(pdf: UploadFile = File(...), session_id: str = Query(...)):
    if session_id not in SESSION_FOLDERS:
        return {"error": "Invalid session ID."}
    try:
        folder_path = SESSION_FOLDERS[session_id]
        file_path = folder_path / pdf.filename
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(pdf.file, buffer)

        return {
            "message": "Current document uploaded successfully",
            "filename": pdf.filename
        }
    except Exception as e:
        return {"error": str(e)}


@app.post("/select-text")
async def select_text(request: TextSelectionRequest):
    # This is a placeholder. You would add your logic here.
    print(
        f"Received text selection: '{request.selected_text}' from {request.pdf_name} p.{request.page_no}")
    return [
        {
            "pdf_name": "example_past_doc.pdf",
            "page_no": 5,
            "section_title": "Analysis of Selected Text",
            "sub_text": f"This mock section from a past document provides details on '{request.selected_text}'..."
        }
    ]


@app.post("/end-session")
# ✅ FIX: Use Query to be consistent
async def end_session(session_id: str = Query(...)):
    if session_id in SESSION_FOLDERS:
        folder_path = SESSION_FOLDERS[session_id]
        # ✅ FIX: This now safely deletes only the specific session's folder
        shutil.rmtree(folder_path)
        del SESSION_FOLDERS[session_id]
        print(f"Cleared files and folder for session: {session_id}")
        return {"message": f"Session {session_id} ended and files deleted."}
    return {"error": "Session not found."}
