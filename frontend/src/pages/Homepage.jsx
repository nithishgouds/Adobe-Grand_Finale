import React, { useState, useEffect, useRef } from "react";

const BACKEND_URL = "http://localhost:8000";

export default function AdobeSmartApp() {
  const [persona, setPersona] = useState({ profession: "Researcher", task: "Find relevant sections" });
  const [pastDocs, setPastDocs] = useState([]); // Holds filenames of past docs
  const [currentDoc, setCurrentDoc] = useState(null); // Holds file object of current doc
  const [processing, setProcessing] = useState(false);
  const [relevantSections, setRelevantSections] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const viewerRef = useRef(null);

  // --- API CALL 1: Upload PAST Docs and Start Session ---
  const handlePastDocsUpload = async (files) => {
    if (files.length === 0) return;
    setProcessing(true);
    
    const formData = new FormData();
    files.forEach(file => formData.append("pdfs", file));

    const params = new URLSearchParams({
        persona_role: persona.profession,
        task: persona.task,
    });

    try {
        const response = await fetch(`${BACKEND_URL}/upload-past-docs?${params.toString()}`, {
            method: 'POST',
            body: formData,
        });
        const result = await response.json();
        if (result.error) throw new Error(result.error);

        setSessionId(result.session_id);
        setPastDocs(result.uploaded_files);
        alert(`Session started! ${result.uploaded_files.length} past documents are ready for analysis.`);
    } catch (error) {
        console.error("Error uploading past documents:", error);
    } finally {
        setProcessing(false);
    }
  };

  // --- API CALL 2: Upload CURRENT Doc to View ---
  const handleCurrentDocUpload = async (file) => {
    if (!file) return;
    if (!sessionId) {
        alert("Please upload the past documents first to start a session.");
        return;
    }
    setProcessing(true);
    setCurrentDoc(file);

    const formData = new FormData();
    formData.append("pdf", file);

    try {
        const response = await fetch(`${BACKEND_URL}/upload-current-doc?session_id=${sessionId}`, {
            method: 'POST',
            body: formData,
        });
        const result = await response.json();
        if (result.error) throw new Error(result.error);

        // On successful upload, immediately display it in the viewer
        autoNavigate({ pdfName: result.filename, pageNo: 1 });
    } catch (error) {
        console.error("Error uploading current document:", error);
    } finally {
        setProcessing(false);
    }
  };

  // --- API CALL 3: Handle Text Selection ---
  const handleTextSelection = async () => {
    if (!sessionId || !currentDoc) {
        alert("Please upload both past and current documents first.");
        return;
    }
    const selectedText = window.getSelection().toString().trim();
    if (!selectedText) {
        alert("Please select some text in the document to analyze.");
        return;
    }
    setProcessing(true);
    try {
        const response = await fetch(`${BACKEND_URL}/select-text`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: sessionId, selected_text: selectedText }),
        });
        const result = await response.json();
        setRelevantSections(result.data.extracted_sections || []);
    } catch (error) {
        console.error("Error handling text selection:", error);
    } finally {
        setProcessing(false);
    }
  };

  // --- Viewer Navigation ---
  const autoNavigate = (section) => {
    if (viewerRef.current && section.pdfName) {
      const pdfUrl = `${BACKEND_URL}/files/${section.pdfName}`;
      viewerRef.current.previewFile({
        content: { location: { url: pdfUrl } },
        metaData: { fileName: section.pdfName }
      });
    }
  };
  
  // --- Session Cleanup ---
  const endSession = async () => {
    if (sessionId) {
        await fetch(`${BACKEND_URL}/end-session?session_id=${sessionId}`, { method: 'POST' });
        setSessionId(null);
        setPastDocs([]);
        setCurrentDoc(null);
        setRelevantSections([]);
        alert("Session ended and all files have been cleared from the server.");
    }
  };

  // --- Adobe Viewer Initialization ---
  useEffect(() => {
    const initializeAdobeViewer = () => {
        if (!import.meta.env.VITE_ADOBE_EMBED_API_KEY) return;
        viewerRef.current = new window.AdobeDC.View({
            clientId: import.meta.env.VITE_ADOBE_EMBED_API_KEY,
            divId: "adobe-dc-view"
        });
    };
    window.AdobeDC ? initializeAdobeViewer() : document.addEventListener("adobe_dc_view_sdk.ready", initializeAdobeViewer);
    return () => document.removeEventListener("adobe_dc_view_sdk.ready", initializeAdobeViewer);
  }, []);

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
        <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Adobe Smart App</h1>
            {sessionId && <button onClick={endSession} className="bg-red-500 text-white px-4 py-2 rounded">End Session</button>}
        </div>

        {/* Persona Form */}
        <div className="bg-white shadow rounded p-4">
            <h2 className="font-bold mb-2">1. Define Persona</h2>
            {/* ... Persona inputs ... */}
        </div>

        {/* Past Docs Upload */}
        <div className="bg-white shadow rounded p-4">
            <h2 className="font-bold mb-2">2. Upload Past Documents (Knowledge Base)</h2>
            <input type="file" multiple onChange={(e) => handlePastDocsUpload(Array.from(e.target.files))} disabled={!!sessionId} />
            {sessionId && <p className="text-green-600 mt-2">✓ Session started with {pastDocs.length} documents.</p>}
        </div>

        {/* Current Doc Upload */}
        <div className="bg-white shadow rounded p-4">
            <h2 className="font-bold mb-2">3. Upload Current Document (To View and Analyze)</h2>
            <input type="file" onChange={(e) => handleCurrentDocUpload(e.target.files[0])} disabled={!sessionId} />
            {currentDoc && <p className="text-green-600 mt-2">✓ Viewing: {currentDoc.name}</p>}
        </div>
      
        <div className="grid grid-cols-2 gap-4">
            {/* PDF Viewer */}
            <div className="bg-white shadow rounded p-4">
                <h2 className="font-bold mb-2">PDF Viewer</h2>
                {processing && <p className="text-yellow-500">Processing...</p>}
                <div id="adobe-dc-view" className="h-96 border"></div>
            </div>

            {/* Relevant Sections */}
            <div className="bg-white shadow rounded p-4">
                <h2 className="font-bold mb-2">Relevant Sections from Past Docs</h2>
                <button onClick={handleTextSelection} className="bg-green-500 text-white px-3 py-2 rounded mb-2 w-full">Find Info for Selected Text</button>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                    {/* ... Relevant sections rendering ... */}
                </div>
            </div>
        </div>
    </div>
  );
}