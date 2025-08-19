## Docker Commands
### Build Command

- Run this from inside your solution folder (where Dockerfile is located):

```
docker build --platform linux/amd64 -t yourimageidentifier .
```

### Run Command

```
docker run `
>> -v C:/path/to/credentials:/credentials `
>> -e ADOBE_EMBED_API_KEY= YOUR KEY`
>> -e GEMINI_API_KEY= YOUR KEY`
>> -e AZURE_SPEECH_KEY= YOUR KEY`
>> -e AZURE_REGION=centralindia `
>> -p 8080:8080 `
>> yourimageidentifier
```
---
# Project Adobe-Finale: Intelligent Document Analysis & Content Generation Platform

[![Python Version](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)
[![Framework](https://img.shields.io/badge/Framework-FastAPI-green.svg)](https://fastapi.tiangolo.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

This project provides a powerful backend service that transforms a collection of PDF documents into an interactive, queryable knowledge base. Users can upload documents, get context-aware insights from selected text, generate conversational podcasts, and interact with a chatbot that answers questions based solely on the provided document set.

---

##  Core Features

* **Multi-Document Management**: Upload and manage multiple PDF documents within distinct user sessions.
* **Contextual Insights**: Select any piece of text from a document to instantly retrieve the most relevant sections from all other uploaded documents.
* **AI-Generated Summaries**: Automatically generate key takeaways, interesting facts, potential counterpoints, and creative ideas based on the retrieved context.
* **On-the-Fly Podcast Generation**: Create and stream a conversational audio podcast between two AI speakers (Alice and Bob) discussing the selected text and its related insights.
* **RAG-Powered Chatbot**: Engage in a conversation with an AI assistant that uses Retrieval-Augmented Generation (RAG) to answer questions using information found only within the uploaded documents.
* **Session-Based Processing**: All document processing, indexing, and interactions are sandboxed within a unique session ID, ensuring data isolation.
* **Persona-Driven Extraction**: Run a batch process to extract information tailored to a specific role (e.g., "Legal Analyst") and task (e.g., "Find all clauses related to liability").

---

## How It Works: Architecture Overview

The application is built around a Retrieval-Augmented Generation (RAG) pipeline to provide accurate, context-aware responses.

1.  **Ingestion & Indexing**:
    * When PDFs are uploaded, the `save_pdfs.py` script is triggered.
    * It uses **PyMuPDF** to parse each document, intelligently identifying and extracting sections based on headings and document structure.
    * The content of each section is converted into a vector embedding using a **Sentence-Transformer** model.
    * These embeddings are stored in a **FAISS** vector index for efficient similarity search. The corresponding text and metadata (document name, page number) are saved alongside.

2.  **Retrieval**:
    * When a user selects text or asks a question, the query is also converted into a vector embedding.
    * FAISS is used to perform a similarity search, quickly retrieving the most semantically relevant text chunks from the indexed documents.

3.  **Augmentation & Generation**:
    * The retrieved text chunks (the "context") are prepended to the user's original prompt.
    * This combined payload is sent to the **Google Gemini 1.5 Flash** model. By providing relevant context directly in the prompt, the model can generate highly accurate and relevant insights, chatbot responses, or podcast scripts without hallucinating.

4.  **Synthesis (Podcast)**:
    * For the podcast feature, the generated script is streamed line-by-line to the **Azure Cognitive Services for Speech** API, which synthesizes high-quality audio that is streamed back to the user in real-time.



---

##  Tech Stack

* **Backend Framework**: **FastAPI**
* **Generative AI Model**: **Google Gemini 1.5 Flash**
* **Text-to-Speech (TTS)**: **Azure Cognitive Services**
* **Vector Embeddings**: **Sentence-Transformers** (`intfloat/e5-base-v2`)
* **Vector Database/Index**: **FAISS** (Facebook AI Similarity Search)
* **PDF Processing**: **PyMuPDF (`fitz`)**, `pymupdf4llm`
* **Programming Language**: **Python**
---
##  Getting Started: Local Setup & Running

Follow these instructions to set up and run the project on your local machine.

### Prerequisites

* Python 3.9+
* Git

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd Adobe-Finale
```

### 2. Set Up a Virtual Environment

It's highly recommended to use a virtual environment to manage dependencies.

- On Windows:

```bash
python -m venv .venv
.venv\Scripts\activate
```

- On macOS/Linux:

```bash!
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install Dependencies

```bash!
pip install -r requirements.txt
```


### 4. Configure Environment Variables


Create a file named `.env` in the `backend` directory. This file will store your API keys and secrets. Add the following keys with your credentials:


```toml!
# backend/.env

# Google Gemini API Key
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"

# Azure Text-to-Speech Credentials
AZURE_SPEECH_KEY="YOUR_AZURE_SPEECH_KEY"
AZURE_REGION="YOUR_AZURE_SERVICE_REGION"

# frontend/.env
# Adobe Embed API Key
VITE_ADOBE_EMBED_API_KEY="YOUR_ADOBE_EMBED_API_KEY"
```


### 5. Run the Backend Server


Once the setup is complete, you can start the FastAPI server using `uvicorn`.

```bash!
uvicorn backend.backend:app --reload
```

- `backend.backend`: Refers to the `backend.py` file and the `app` instance within it.


- `--reload`: Enables hot-reloading, so the server restarts automatically after code changes.

The application will now be running at `http://127.0.0.1:8000`.

You can access the interactive API documentation (powered by Swagger UI) at `http://127.0.0.1:8000/docs`.


---


### API Endpoints

Here are the primary API endpoints available:

- `POST /upload-past-docs`: Upload a list of historical PDF documents to start a new session.
- `POST /upload-current-doc`: Add a new "current" PDF to an existing session.
- `POST /select-text`: Send selected text from a document to find relevant passages from the knowledge base.
- `POST /insights`: Generate detailed insights (takeaways, facts, counterpoints) based on selected text.
- `POST /podcast`: Generate and stream a conversational audio podcast based on selected text.
- `POST /chatbot`: Send a prompt to the chatbot for a conversational response.
- `POST /end-session`: Clear all data and indexes associated with a session.

---

### Project Structure

```

Adobe-Finale/
│
├── .venv/                  # Virtual environment directory
├── backend/                # Main backend source code
│   ├── round1b/            # Working directory for session data, indexes, and PDFs
│   │   ├── PDFs/           # Storage for uploaded PDFs
│   │   ├── mysession_index.faiss  # FAISS vector index
│   │   └── mysession_metadata.json # Metadata for indexed content
│   ├── backend.py          # FastAPI application, API endpoints, and core logic
│   ├── main.py             # Script for persona-based batch processing
│   ├── process_pdfs.py     # Utility for advanced PDF parsing and heading extraction
│   ├── relevant_pages.py   # Module for querying the FAISS index
│   ├── save_pdfs.py        # Module for processing and indexing uploaded PDFs
│   └── requirements.txt    # Python package dependencies
│
├── frontend/               # (Placeholder for frontend application)
│
├── .gitignore              # Git ignore file
├── LICENSE                 # Project license
└── README.md               # This documentation file
```



