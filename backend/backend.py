from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import json
import shutil
import subprocess
from pathlib import Path
import time
from datetime import datetime

DEFAULT_PDF_FOLDER = Path("round1b") / "PDFs"
INPUT_PATH = Path("round1b") / "input.json"
OUTPUT_PATH = Path("round1b") / "output.json"

DEFAULT_PDF_FOLDER.mkdir(parents=True, exist_ok=True)
INPUT_PATH.parent.mkdir(parents=True, exist_ok=True)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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

        documents = []
        timestamp = int(time.time())

        for pdf in pdfs:
            filename = f"{timestamp}-{pdf.filename}"
            file_path = DEFAULT_PDF_FOLDER / filename
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(pdf.file, buffer)

            documents.append({
                "filename": filename,
                "title": Path(pdf.filename).stem
            })

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

        with open(INPUT_PATH, "w", encoding="utf-8") as f:
            json.dump(input_json, f, indent=2)

        skeleton_output = {
            "metadata": {
                "input_documents": [doc["title"] + ".pdf" for doc in documents],
                "persona": persona,
                "job_to_be_done": job_to_be_done,
                "processing_timestamp": datetime.utcnow().isoformat()
            },
            "extracted_sections": [],
            "subsection_analysis": []
        }
        with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
            json.dump(skeleton_output, f, indent=2)

        process = subprocess.Popen(
            ["python", "main.py"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        stdout, stderr = process.communicate()

        if stdout:
            print("Python output:", stdout.decode())
        if stderr:
            print("Python error:", stderr.decode())

        if OUTPUT_PATH.exists():
            with open(OUTPUT_PATH, "r", encoding="utf-8") as f:
                try:
                    return json.load(f)
                except json.JSONDecodeError:
                    return {"error": "Invalid output.json format"}
        else:
            return {"error": "output.json not found after running main.py"}

    except Exception as e:
        print("❌ Exception:", e)
        return {"error": "Failed to upload PDFs"}
