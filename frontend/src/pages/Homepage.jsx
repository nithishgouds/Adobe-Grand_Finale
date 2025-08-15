import React, { useEffect, useRef, useState } from "react";

const API_BASE = "http://127.0.0.1:8000";

export default function AbodeSmartApp() {
  const [persona, setPersona] = useState({ name: "", profession: "", task: "" });
  const [pastDocs, setPastDocs] = useState([]);
  const [currentDocs, setCurrentDocs] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [processed, setProcessed] = useState(false);
  const [relevantSections, setRelevantSections] = useState([]);
  const [topRelevant, setTopRelevant] = useState([]);

  // State to track what's currently loaded in the viewer
  const [currentPdfInViewer, setCurrentPdfInViewer] = useState(null);
  const [adobeReady, setAdobeReady] = useState(false);

  // Ref to hold the Adobe viewer instance's APIs
  const viewerApiRef = useRef(null);

  const qs = (obj) => new URLSearchParams(obj).toString();
  const absUrl = (sessionId, name) => `${API_BASE}/files/${sessionId}/${encodeURIComponent(name)}`;

  // 1. ✅ Correctly load the Adobe Embed SDK script
  useEffect(() => {
    if (window.AdobeDC) {
      setAdobeReady(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://documentcloud.adobe.com/view-sdk/viewer.js";
    script.onload = () => setAdobeReady(true);
    document.body.appendChild(script);
  }, []);

  // --- API Functions (Largely unchanged) ---
  const uploadPast = async (files) => {
    if (!files?.length) return;
    const form = new FormData();
    files.forEach((f) => form.append("pdfs", f));
    const url = `${API_BASE}/upload-past-docs?${qs({
      session_id: sessionId || "",
      challenge_id: "default_challenge",
      test_case_name: "default_test_case",
      description: "default_description",
      persona_role: persona.profession || "default_role",
      task: persona.task || "default_task",
    })}`;
    setProcessing(true);
    const res = await fetch(url, { method: "POST", body: form });
    const data = await res.json();
    if (data?.session_id && !sessionId) setSessionId(data.session_id);
    const added = Array.from(files).map((f) => ({ name: f.name, url: absUrl(f.name) }));
    setPastDocs((prev) => [...prev, ...added]);
    setProcessing(false);
  };

  const uploadCurrent = async (files) => {
    if (!files?.length) return;
    if (!sessionId) return alert("Please upload at least one past document first.");
    const form = new FormData();
    files.forEach((f) => form.append("pdf", f));
    const url = `${API_BASE}/upload-current-doc?${qs({
      session_id: sessionId,
      challenge_id: "default_challenge",
      test_case_name: "default_test_case",
      description: "default_description",
      persona_role: persona.profession || "default_role",
      task: persona.task || "default_task",
    })}`;
    setProcessing(true);
    await fetch(url, { method: "POST", body: form });
    const added = Array.from(files).map((f) => ({ name: f.name, url: absUrl(f.name) }));
    setCurrentDocs((prev) => [...prev, ...added]);
    setProcessing(false);
    setProcessed(true);
  };
  
  // 2. ✅ Function to handle the text selection API call
  const handleTextSelection = async (pdfName, pageNo, selectedText) => {
    if (!selectedText?.trim()) return; // Don't send empty selections
    console.log(`Text selected in ${pdfName} (p.${pageNo}): "${selectedText}"`);
    try {
      const res = await fetch(`${API_BASE}/select-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pdf_name: pdfName,
          page_no: pageNo,
          selected_text: selectedText, // Ensure key matches backend
        }),
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        updateRelevantList(data);
      }
    } catch (err) {
      console.error("Error fetching relevant sections:", err);
    }
  };
  
  // 3. ✅ Function to update the list and navigate to the top result
  const updateRelevantList = (list) => {
    setTopRelevant(list);
    if (list.length > 0) {
      navigateToPage(list[0]);
    }
  };

  // 4. ✅ Main function to open a PDF in the viewer with proper event listeners
  const openInViewer = (doc) => {
    if (!adobeReady || !doc?.url) return;
    
    // Track the document being loaded
    setCurrentPdfInViewer(doc);

    const adobeView = new window.AdobeDC.View({
      clientId: import.meta.env.VITE_ADOBE_EMBED_API_KEY || process.env.REACT_APP_ADOBE_EMBED_API_KEY,
      divId: "adobe-dc-view",
    });

    adobeView.previewFile({
        content: { location: { url: doc.url } },
        metaData: { 
          fileName: doc.name,
          id: doc.name, // Ensure the ID matches the name for consistency
         },
      }, {
        // Enable all tools and APIs
        showAnnotationTools: true,
        enableAnnotationAPIs: true,
        includePDFAnnotations: true,
        showDownloadPDF: true,
        showPrintPDF: true,
        enableSearchAPIs: true,
        // CRITICAL: This enables the text selection event
        enableTextSelection: true,
      })
      .then((viewer) => {
        // This is the modern, promise-based way to get APIs
        viewer.getAPIs().then((apis) => {
          // Store the APIs in a ref for later use (like navigation)
          viewerApiRef.current = apis;

          // Register the event listener for text selection
          apis.addEventListener(
            window.AdobeDC.View.Enum.Events.TEXT_SELECT,
            (event) => {
              if (event.data?.selectedText) {
                // Use the currently loaded PDF's info for the API call
                handleTextSelection(doc.name, event.data.pageNumber, event.data.selectedText);
              }
            }
          );
        });
      });
  };

  // 5. ✅ Robust navigation function that uses the viewer's API
  const navigateToPage = (item) => {
    // If the correct document is already in the viewer, just go to the page
    if (viewerApiRef.current && currentPdfInViewer?.name === item.pdf_name) {
      viewerApiRef.current.gotoLocation(item.page_no);
    } else {
      // Otherwise, load the new document first
      const docToOpen = { name: item.pdf_name, url: absUrl(item.pdf_name) };
      setSelectedDoc(docToOpen);
      openInViewer(docToOpen);

      // Give it time to load, then navigate
      setTimeout(() => {
        viewerApiRef.current?.gotoLocation(item.page_no);
      }, 1000); // 1s delay might need adjustment
    }
  };

  // Session cleanup effect
  useEffect(() => {
    const onClose = () => {
      if (!sessionId) return;
      fetch(`${API_BASE}/end-session?${qs({ session_id: sessionId })}`, {
        method: "POST",
        keepalive: true,
      });
    };
    window.addEventListener("beforeunload", onClose);
    return () => window.removeEventListener("beforeunload", onClose);
  }, [sessionId]);

  return (
    <div className="p-4 grid grid-cols-12 gap-4">
      {/* --- Left Column: Persona & Past Library --- */}
      <div className="col-span-3 space-y-4">
        <div className="bg-white rounded-xl border p-3">
          <div className="font-semibold mb-2">Persona</div>
          <div className="space-y-2">
            <input
              className="border rounded w-full p-2"
              placeholder="Name"
              value={persona.name}
              onChange={(e) => setPersona({ ...persona, name: e.target.value })}
            />
            <input
              className="border rounded w-full p-2"
              placeholder="Profession"
              value={persona.profession}
              onChange={(e) => setPersona({ ...persona, profession: e.target.value })}
            />
            <input
              className="border rounded w-full p-2"
              placeholder="Task to be done"
              value={persona.task}
              onChange={(e) => setPersona({ ...persona, task: e.target.value })}
            />
          </div>
        </div>
        <div className="bg-white rounded-xl border p-3">
          <div className="font-semibold mb-2">Past Library</div>
          <input
            type="file"
            multiple
            onChange={(e) => uploadPast(Array.from(e.target.files || []))}
            className="mb-2"
          />
          <ul className="max-h-60 overflow-auto space-y-1">
            {pastDocs.map((d, i) => (
              <li key={`${d.name}-${i}`}>
                <button
                  onClick={() => {
                    openInViewer(d);
                    setSelectedDoc(d);
                  }}
                  className="w-full text-left px-2 py-1 rounded hover:bg-gray-100 truncate"
                  title={d.name}
                >
                  {d.name}
                </button>
              </li>
            ))}
            {!pastDocs.length && <li className="text-sm text-gray-500">No files yet</li>}
          </ul>
        </div>
      </div>

      {/* --- Middle Column: Current Session & Relevant List --- */}
      <div className="col-span-3 space-y-4">
        <div className="bg-white rounded-xl border p-3">
          <div className="font-semibold mb-2">Current Session</div>
          <input
            type="file"
            multiple
            onChange={(e) => uploadCurrent(Array.from(e.target.files || []))}
            className="mb-2"
          />
          <ul className="max-h-60 overflow-auto space-y-1">
            {currentDocs.map((d, i) => (
              <li key={`${d.name}-${i}`}>
                <button
                  onClick={() => {
                    openInViewer(d);
                    setSelectedDoc(d);
                  }}
                  className="w-full text-left px-2 py-1 rounded hover:bg-gray-100 truncate"
                  title={d.name}
                >
                  {d.name}
                </button>
              </li>
            ))}
            {!currentDocs.length && <li className="text-sm text-gray-500">No current files yet</li>}
          </ul>
          <div className="flex items-center gap-2 mt-3">
            {processed && <span className="text-green-600 text-sm">Processed ✓</span>}
            {!processed && processing && <span className="text-yellow-600 text-sm">Processing…</span>}
          </div>
          {sessionId && (
            <div className="mt-2 text-xs text-gray-500">
              session: <span className="font-mono">{sessionId.slice(0, 8)}…</span>
            </div>
          )}
        </div>
        {!!topRelevant.length && (
          <div className="bg-white rounded-xl border p-3 mt-4">
            <div className="font-semibold mb-2">Relevant Sections</div>
            <ul className="space-y-2">
              {topRelevant.map((item, idx) => (
                <li key={idx} className="border rounded p-2 flex justify-between items-center">
                  <div className="min-w-0">
                    <div className="font-medium truncate" title={item.pdf_name}>
                      {item.pdf_name} — p.{item.page_no}
                    </div>
                    <div className="text-sm italic truncate" title={item.section_title}>{item.section_title}</div>
                    <div className="text-sm text-gray-600 line-clamp-2">{item.sub_text}</div>
                  </div>
                  <button
                    onClick={() => navigateToPage(item)}
                    className="shrink-0 bg-blue-600 text-white px-3 py-1 rounded ml-2"
                  >
                    Go
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* --- Right Column: Viewer --- */}
      <div className="col-span-6">
        <div className="bg-white rounded-xl border p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold">PDF Viewer</div>
            <div className="text-xs text-gray-500 truncate" title={selectedDoc?.name}>
              {processing ? "processing…" : selectedDoc ? selectedDoc.name : "No document selected"}
            </div>
          </div>
          <div id="adobe-dc-view" className="h-[750px] border rounded" />
        </div>
      </div>
    </div>
  );
}