from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import os
import json
import shutil
import subprocess
from pathlib import Path

# --- Constants ---
DEFAULT_PDF_FOLDER = Path("temp") / "PDFs"
INPUT_PATH = Path("temp") / "input.json"
OUTPUT_PATH = Path("temp") / "output.json"

# Ensure folder exists
DEFAULT_PDF_FOLDER.mkdir(parents=True, exist_ok=True)

# --- FastAPI app ---
app = FastAPI()

# Enable CORS at the very beginning
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change to your frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/upload")
async def upload_pdfs(
    pdfs: List[UploadFile] = File(...),
    persona: str = Form(...),
    job_to_be_done: str = Form(...)
):
    try:
        if not persona or not job_to_be_done:
            return {"error": "Persona and job_to_be_done are required"}

        # Save uploaded PDFs
        documents = []
        for pdf in pdfs:
            filename = f"{int(Path().stat().st_mtime)}-{pdf.filename}"
            file_path = DEFAULT_PDF_FOLDER / filename
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(pdf.file, buffer)

            documents.append({
                "filename": filename,
                "title": Path(pdf.filename).stem
            })

        # Build dynamic JSON input for Python
        input_json = {
            "challenge_info": {
                "challenge_id": "round_1b_dynamic",
                "test_case_name": "dynamic_pdf_processing",
                "description": "Dynamic PDF upload and metadata"
            },
            "documents": documents,
            "persona": {"role": persona},
            "job_to_be_done": {"task": job_to_be_done}
        }

        # Create input.json only if it doesn't exist
        if not INPUT_PATH.exists():
            with open(INPUT_PATH, "w", encoding="utf-8") as f:
                json.dump(input_json, f, indent=2)
            print("✅ Created input.json")
        else:
            print("⚠️ input.json already exists — skipping creation")

        # Call Python script
        process = subprocess.Popen(
            ["python3", "main.py"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        stdout, stderr = process.communicate()

        if stdout:
            print("Python output:", stdout.decode())
        if stderr:
            print("Python error:", stderr.decode())

        # After Python finishes, read output.json and send to frontend
        if OUTPUT_PATH.exists():
            with open(OUTPUT_PATH, "r", encoding="utf-8") as f:
                try:
                    return json.load(f)
                except json.JSONDecodeError:
                    return {"error": "Invalid output.json format"}
        else:
            return {"error": "output.json not found"}

    except Exception as e:
        print(e)
        return {"error": "Failed to upload PDFs"}


