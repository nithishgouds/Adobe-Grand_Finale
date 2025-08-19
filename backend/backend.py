import io
from fastapi import FastAPI, UploadFile, File, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi import BackgroundTasks
from typing import List, Optional, Dict
from pydantic import BaseModel
from pathlib import Path
import shutil
import subprocess
import uuid
import datetime
from relevant_pages import get_relevant_pages
import azure.cognitiveservices.speech as speechsdk
import google.generativeai as genai
import os
import json
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv

load_dotenv()

PDF_FOLDER = Path("round1b") / "PDFs"
INPUT_PATH = Path("round1b") / "input.json"
OUTPUT_PATH = Path("round1b") / "output.json"

PDF_FOLDER.mkdir(parents=True, exist_ok=True)
SESSION_FOLDERS = {}

app = FastAPI()

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
model = genai.GenerativeModel("gemini-1.5-flash")

AZURE_SPEECH_KEY = os.getenv("AZURE_SPEECH_KEY")
AZURE_REGION = os.getenv("AZURE_REGION")

PODCAST_CANCEL_FLAGS = {}

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

class ChatRequest(BaseModel):
    session_id: str
    selected_text: str
    current_prompt: str
    history: List[Dict[str, str]]

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
        print(f"Saved {len(documents)} PDFs to {folder_path}")
        try:
            subprocess.run(
                [
                    "C:/Users/S SRI NITHISH GOUD/Documents/Adobe-Finale/.venv/Scripts/python.exe", "save_pdfs.py",
                    "--pdf_folder", str(folder_path),
                    "--session_id", session_id
                ],
                check=True
            )
            print("save_pdfs.py executed successfully.")
        except subprocess.CalledProcessError as e:
            print(f"Error while running save_pdfs.py: {e}")
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
        
        print(f"Current doc saved: {file_path}")
        
        try:
            subprocess.run(
                [
                    "C:/Users/S SRI NITHISH GOUD/Documents/Adobe-Finale/.venv/Scripts/python.exe",
                    "save_pdfs.py",
                    "--pdf_folder", str(folder_path),
                    "--session_id", session_id
                ],
                check=True
            )
            print("save_pdfs.py executed successfully for current doc.")
        except subprocess.CalledProcessError as e:
            print(f"⚠ Error while running save_pdfs.py for current doc: {e}")
            return {"error": "Failed to process current document."}
        
        return {
            "message": "Current document uploaded and indexed successfully",
            "filename": pdf.filename
        }
    except Exception as e:
        return {"error": str(e)}

@app.post("/select-text")
async def select_text(request: TextSelectionRequest):
    try:
        session_id = request.session_id
        selected_text = request.selected_text.strip()
        
        print("calling relevant pages from select text")
        
        if session_id not in SESSION_FOLDERS:
            return {"error": "Invalid or missing session ID. Please upload documents first."}
        
        results = get_relevant_pages(selected_text, top_k=5)
        
        print("relevant text from select text....")
        if not results:
            return {
                "data": {
                    "extracted_sections": [
                        {
                            "pdfName": "N/A",
                            "pageNo": -1,
                            "title": "No Matches Found",
                            "snippet": f"No relevant content found for '{selected_text}'.",
                            "score": None
                        }
                    ]
                }
            }
        
        return {"data": {"extracted_sections": results}}
    
    except Exception as e:
        return {"error": str(e)}

@app.post("/end-session")
async def end_session(session_id: str):
    folder_path = Path("round1b")
    if folder_path.exists() and folder_path.is_dir():
        shutil.rmtree(folder_path)
    SESSION_FOLDERS.pop(session_id, None)
    folder_path = Path("round1b") / "PDFs"
    folder_path.mkdir(parents=True, exist_ok=True)
    return {"message": f"Session {session_id} ended and folder round1b deleted."}

@app.post("/insights")
async def get_insights(request: TextSelectionRequest):
    session_id = request.session_id
    selected_text = request.selected_text.strip()
    
    if session_id not in SESSION_FOLDERS:
        return {"error": "Invalid or missing session ID. Please upload documents first."}
    
    try:
        results = get_relevant_pages(selected_text, top_k=10)
        
        if not results:
            return {
                "insights": [
                    {
                        "pdfName": "N/A",
                        "pageNo": -1,
                        "title": "No Matches Found",
                        "snippet": f"No relevant content found for '{selected_text}'.",
                        "score": None
                    }
                ]
            }
        
        prompt = f"""
        You are an analytical assistant. Based ONLY on the following context, generate insights about "{selected_text}".

        Context:
        ---
        {results}
        ---

        Generate a JSON object with the following keys:
        - "key_takeaways": A list of 2-3 main points.
        - "did_you_know": An interesting, lesser-known fact from the context.
        - "counterpoint": A potential contradiction or alternative perspective mentioned in the context.
        - "inspiration": A creative idea or connection between different parts of the context.

        Do not use any information outside of the provided context.
        """
        
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                response_mime_type="application/json"
            )
        )
        
        try:
            insights_json = json.loads(response.text)
        except json.JSONDecodeError:
            insights_json = {"raw_output": response.text}
            
        return {"insights": insights_json}
    
    except Exception as e:
        return {"error": str(e)}

def generate_podcast_script(selected_text: str, insights: dict) -> list:
    prompt = f"""
    You are a podcast script generator.
    Based on the following text and insights, create a 2-3 minute conversation between Alice (female) and Bob (male).
    Selected Text:
    "{selected_text}"
    Insights:
    {json.dumps(insights, indent=2)}
    Rules:
    - ONLY output valid JSON
    - Format: [{{ "speaker": "Alice", "line": "..." }}, {{ "speaker": "Bob", "line": "..." }}]
    - No markdown, no commentary.
    - Alternate speakers naturally, 12–20 lines total.
    """
    response = model.generate_content(
        prompt,
        generation_config=genai.types.GenerationConfig(
            response_mime_type="application/json"
        )
    )
    try:
        return json.loads(response.text)
    except json.JSONDecodeError:
        raise ValueError(f"Model did not return valid JSON: {response.text}")

def synthesize_voice(text: str, voice: str) -> bytes:
    speech_config = speechsdk.SpeechConfig(
        subscription=AZURE_SPEECH_KEY,
        region=AZURE_REGION
    )
    speech_config.set_speech_synthesis_output_format(
        speechsdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3
    )
    speech_config.speech_synthesis_voice_name = voice
    
    synthesizer = speechsdk.SpeechSynthesizer(
        speech_config=speech_config, audio_config=None
    )
    result = synthesizer.speak_text_async(text).get()
    
    if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
        return result.audio_data
    else:
        raise Exception(f"TTS failed: {result.reason}")

@app.post("/podcast")
async def podcast(request: TextSelectionRequest):
    session_id = request.session_id
    selected_text = request.selected_text.strip()
    
    if session_id not in SESSION_FOLDERS:
        raise HTTPException(status_code=400, detail="Invalid session ID.")
    
    try:
        insights_data = await get_insights(request)
        insights = insights_data["insights"]
        
        dialogue = generate_podcast_script(selected_text, insights)
        
        async def audio_stream_generator():
            for turn in dialogue:
                speaker = turn["speaker"]
                line = turn["line"]
                
                voice = "en-US-JennyNeural" if speaker == "Alice" else "en-US-GuyNeural"
                
                print(f"{speaker}: {line}")
                
                audio_chunk = synthesize_voice(line, voice)
                yield audio_chunk
        return StreamingResponse(audio_stream_generator(), media_type="audio/mpeg")
    
    except ValueError as e:
        raise HTTPException(
            status_code=503, detail=f"Error generating script: {e}")
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"An unexpected error occurred: {e}")

@app.post("/role-task")
async def generate_role_persona(
    session_id: Optional[str] = Query(None),
    persona_role: Optional[str] = Query("default_role"),
    task: Optional[str] = Query("default_task")
):
    try:
        if not session_id or session_id not in SESSION_FOLDERS:
            session_id, folder_path = create_session_folder()
        else:
            folder_path = SESSION_FOLDERS[session_id]
        
        pdf_files = list(folder_path.glob("*.pdf"))
        if not pdf_files:
            return {"error": "No PDFs found in session folder.", "session_id": session_id}
        
        documents = [{"filename": f.name, "title": f.stem} for f in pdf_files]
        
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
                "processing_timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
            },
            "extracted_sections": [],
            "subsection_analysis": []
        }
        with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
            json.dump(skeleton_output, f, indent=2)
            
        subprocess.run(["C:/Users/S SRI NITHISH GOUD/Documents/Adobe-Finale/.venv/Scripts/python.exe", "main.py"], check=False)
        
        if OUTPUT_PATH.exists():
            with open(OUTPUT_PATH, "r", encoding="utf-8") as f:
                return {"session_id": session_id, "data": json.load(f)}
        else:
            return {"error": "output.json not found", "session_id": session_id}
            
    except Exception as e:
        return {"error": str(e)}

@app.post("/stop-podcast")
async def stop_podcast(request: TextSelectionRequest):
    PODCAST_CANCEL_FLAGS[request.session_id] = True
    return {"message": f"Stopped podcast for {request.session_id}"}

@app.post("/chatbot")
async def pdf_chatbot(request: ChatRequest):
    session_id = request.session_id
    selected_text = request.selected_text.strip()
    current_prompt = request.current_prompt.strip()
    history = request.history

    if not session_id or session_id not in SESSION_FOLDERS:
        raise HTTPException(
            status_code=400, 
            detail="Invalid or missing session ID. Please upload documents first."
        )

    try:
        query_for_retrieval = f"{current_prompt}\nContext from document: {selected_text}"
        relevant_chunks = get_relevant_pages(query_for_retrieval, top_k=5)
        
        formatted_history = "\n".join([f"User: {turn['user']}\nAssistant: {turn['assistant']}" for turn in history])

        prompt = f"""
        You are a helpful assistant for answering questions based on provided documents.

        Chat History:
        {formatted_history}

        Relevant Information from Documents:
        ---
        {json.dumps(relevant_chunks, indent=2)}
        ---
        
        Selected Text from Current Document:
        ---
        {selected_text}
        ---

        User's Current Question: {current_prompt}

        Based on the chat history, the relevant information, AND the selected text provided, answer the user's current question.
        If the information is not available in the provided context, state that you cannot find an answer in the documents.
        Do not use any external knowledge.
        
        Answer:
        """

        response = model.generate_content(prompt)

        return {"response": response.text}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))