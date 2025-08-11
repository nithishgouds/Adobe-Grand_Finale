/**
 * AdobeSmartSingleFile.jsx
 * Updated: fixes for PDF viewer, upload -> backend integration, and UI layout.
 *
 * Requirements:
 * - Tailwind CSS
 * - (optional) Adobe Embed SDK: add <script src="https://documentcloud.adobe.com/view-sdk/main.js"></script> to index.html
 * - Set env var: VITE_ADOBE_EMBED_API_KEY or REACT_APP_ADOBE_EMBED_API_KEY if you want Adobe preview
 *
 * Notes:
 * - processFiles(files) attempts POST to http://localhost:8000/upload and falls back to local processing if it fails.
 * - Uses browser SpeechSynthesis for TTS.
 */
import React, { useEffect, useRef, useState } from "react";

export default function AdobeSmartApp() {
  // ======= Top-level state ========
  const [persona, setPersona] = useState("");
  const [job, setJob] = useState("");
  const [uploadedDocs, setUploadedDocs] = useState([]); // stores File objects
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [processDone, setProcessDone] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [viewerBlobUrl, setViewerBlobUrl] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Adobe refs
  const adobeViewRef = useRef(null);
  const adobeArrayBufferRef = useRef(null);
  const iframeRef = useRef(null);

  // Chat / TTS state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([{ from: "bot", text: "Hi — I'm your local assistant. Add persona & upload a PDF." }]);
  const [chatInput, setChatInput] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const synthUtteranceRef = useRef(null);

  // Cleanup blob urls
  useEffect(() => {
    return () => {
      if (viewerBlobUrl) URL.revokeObjectURL(viewerBlobUrl);
    };
  }, [viewerBlobUrl]);

  // When a doc is selected: create blob URL and prepare ArrayBuffer for Adobe
  useEffect(() => {
    if (!selectedDoc) {
      setViewerBlobUrl(null);
      adobeArrayBufferRef.current = null;
      return;
    }

    // release previous blob
    setViewerBlobUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(selectedDoc);
    });

    // prepare arrayBuffer for Adobe embed if present
    (async () => {
      try {
        const ab = await selectedDoc.arrayBuffer();
        adobeArrayBufferRef.current = ab;
        // initialize preview if Adobe SDK loaded and clientId available
        if (window.AdobeDC) {
          initAdobeViewer(adobeArrayBufferRef.current, selectedDoc.name);
        }
      } catch (err) {
        console.warn("ArrayBuffer preparation failed:", err);
      }
    })();

    setCurrentPage(1);
  }, [selectedDoc]);

  // ======== Adobe init (safe) ========
  const initAdobeViewer = (arrayBuffer, filename) => {
    try {
      if (!window.AdobeDC) {
        adobeViewRef.current = null;
        return;
      }

      // safe clientId retrieval
      const clientId =
        (typeof import.meta !== "undefined" && import.meta.env?.VITE_ADOBE_EMBED_API_KEY) ||
        process.env.REACT_APP_ADOBE_EMBED_API_KEY ||
        "";

      if (!clientId) {
        // don't attempt to create view without clientId
        adobeViewRef.current = null;
        return;
      }

      // create view if needed
      if (!adobeViewRef.current) {
        adobeViewRef.current = new window.AdobeDC.View({
          clientId,
          divId: "adobe-dc-view",
        });
      }

      const previewConfig = {
        embedMode: "SIZED_CONTAINER",
        defaultViewMode: "FIT_WIDTH",
        showAnnotationTools: false,
        showLeftHandPanel: true,
        dockPageControls: false,
      };

      adobeViewRef.current.previewFile(
        {
          content: { promise: Promise.resolve(arrayBuffer) },
          metaData: { fileName: filename },
        },
        previewConfig
      );

      // register page change callback if supported
      try {
        if (adobeViewRef.current.registerCallback && window.AdobeDC?.View?.Enum?.CallbackType) {
          adobeViewRef.current.registerCallback(
            window.AdobeDC.View.Enum.CallbackType.PAGE_VIEW,
            (event) => {
              if (event?.data?.pageNumber) setCurrentPage(event.data.pageNumber);
            },
            {}
          );
        }
      } catch (err) {
        // some SDK versions may not support PAGE_VIEW: ignore
      }
    } catch (err) {
      console.warn("Adobe viewer init error:", err);
      adobeViewRef.current = null;
    }
  };

  // ====== Mock suggestion generator (fallback) ======
  const generateMockOutput = (files, personaVal, jobVal) => {
    const out = [];
    if (!files || files.length === 0) return out;
    const base = files[0];
    for (let i = 0; i < 3; i++) {
      const page = Math.min(1 + i * 3, 50);
      out.push({
        id: `${base.name}-s${i + 1}`,
        title: `Top insight ${i + 1}`,
        fileName: base.name,
        page,
        snippet: `Sample excerpt from ${base.name} (page ${page}) relevant to "${jobVal || "task"}" for ${personaVal || "user"}.`,
      });
    }
    return out;
  };

  // ======= processFiles -> performs POST to backend and fallback =======
  // Accepts: Array<File>
  const processFiles = async (files) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);

    try {
      if (!persona || !job) {
        alert("Please provide persona and job before uploading.");
        setIsUploading(false);
        return;
      }

      // build form data
      const formData = new FormData();
      files.forEach((file) => formData.append("pdfs", file));
      formData.append("persona", persona);
      formData.append("job_to_be_done", job);

      // try backend
      const res = await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        // try to read body for error info but still fallback
        const txt = await res.text().catch(() => "");
        throw new Error(`Upload failed: ${res.status} ${txt}`);
      }

      const data = await res.json().catch(() => ({}));

      // Backend is expected to return processed metadata (optionally).
      // For client UI we keep local File objects for preview; backend may return info in data.files.
      setUploadedDocs((prev) => {
        // merge server-declared file list if you want; here we append actual uploaded Files for correct preview behavior
        const merged = [...prev, ...files];
        return merged;
      });

      setProcessDone(true);
      setSelectedDoc(files[0]);

      // If backend returned suggestions or output.json path, use it; otherwise fallback to mock
      if (data?.suggestions && Array.isArray(data.suggestions) && data.suggestions.length > 0) {
        setSuggestions(data.suggestions);
      } else if (data?.output_path) {
        // optionally fetch output.json from returned path
        try {
          const outRes = await fetch(data.output_path);
          const outJson = await outRes.json();
          setSuggestions(outJson.suggestions || generateMockOutput(files, persona, job));
        } catch {
          setSuggestions(generateMockOutput(files, persona, job));
        }
      } else {
        setSuggestions(generateMockOutput(files, persona, job));
      }

      // done
    } catch (err) {
      console.error("processFiles error:", err);
      // fallback to local state & mock suggestions so UX doesn't break
      setUploadedDocs((prev) => [...prev, ...files]);
      setProcessDone(true);
      setSelectedDoc(files[0]);
      setSuggestions(generateMockOutput(files, persona, job));
      // show user warning
      alert("Upload to backend failed; falling back to local processing. Check server logs.");
    } finally {
      setIsUploading(false);
      setIsAnalyzing(false);
    }
  };

  // Remove file
  const removeFile = (indexToRemove) => {
    const newDocs = uploadedDocs.filter((_, i) => i !== indexToRemove);
    setUploadedDocs(newDocs);
    if (selectedDoc && uploadedDocs[indexToRemove]?.name === selectedDoc.name) {
      setSelectedDoc(newDocs.length > 0 ? newDocs[0] : null);
    }
    if (newDocs.length === 0) {
      setProcessDone(false);
      setSuggestions([]);
    }
  };

  // Jump to suggestion (Adobe API then fallback)
  const jumpToSuggestion = async (sugg) => {
    const page = sugg.page || 1;
    try {
      if (adobeViewRef.current && typeof adobeViewRef.current.getAPIs === "function") {
        const apis = await adobeViewRef.current.getAPIs();
        if (apis && typeof apis.gotoPage === "function") {
          apis.gotoPage(page);
          return;
        }
      }
    } catch (err) {
      // ignore and fallback
    }

    if (viewerBlobUrl) {
      // open in new tab with page anchor — works with browser built-in PDF viewers
      window.open(viewerBlobUrl + `#page=${page}`, "_blank");
      return;
    }

    // simulated fallback
    setCurrentPage(page);
    alert(`Jumped to page ${page} (simulated)`);
  };

  // Chat helpers (mock)
  const generateChatReply = (q) => {
    const base = `Context${persona ? `: ${persona}` : ""}${job ? ` | Job: ${job}` : ""}.`;
    if (!selectedDoc) return base + " Upload and select a document to get doc-specific answers.";
    if (q.toLowerCase().includes("summar")) {
      return base + ` Quick summary for ${selectedDoc.name}: ${suggestions[0]?.snippet || "No snippet available."}`;
    }
    return base + " I can point you to pages, read snippets, or play audio.";
  };
  const sendChat = (text) => {
    if (!text) return;
    setChatMessages((m) => [...m, { from: "user", text }]);
    setChatInput("");
    setTimeout(() => {
      const reply = generateChatReply(text);
      setChatMessages((m) => [...m, { from: "bot", text: reply }]);
    }, 500 + Math.random() * 700);
  };

  // TTS
  const speakText = (text) => {
    if (!window.speechSynthesis) return alert("TTS not supported in this browser.");
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    synthUtteranceRef.current = u;
    u.onstart = () => setIsSpeaking(true);
    u.onend = () => setIsSpeaking(false);
    u.onerror = () => setIsSpeaking(false);
    u.rate = 1;
    u.pitch = 1;
    window.speechSynthesis.speak(u);
  };

  // Utility for file size
  const formatFileSize = (bytes) => {
    if (!bytes) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // ---------- Child components (kept inside single file) ----------
  function PersonaJobForm() {
  return (
    <div className="space-y-4 z-20"> {/* z-20 to keep it on top of accidental overlays */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Persona</label>
          <input
            autoFocus
            autoComplete="off"
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
            placeholder="e.g., Undergraduate Chemistry Student"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#1473E6]/40"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Job</label>
          <input
            autoComplete="off"
            value={job}
            onChange={(e) => setJob(e.target.value)}
            placeholder="e.g., Identify key concepts"
            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${persona ? "bg-gradient-to-r from-[#1473E6] to-[#9747FF]" : "bg-slate-300"}`}></div>
        <div className="text-sm text-slate-600">Context</div>
        <div className={`w-3 h-3 rounded-full ${job ? "bg-gradient-to-r from-[#FF6B35] to-[#F7931E]" : "bg-slate-300"}`}></div>
      </div>
    </div>
  );
}

  function PDFUploader() {
    const onFileChange = async (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;
      await processFiles(files);
    };

    const onDrop = async (e) => {
      e.preventDefault();
      const dtFiles = Array.from(e.dataTransfer.files || []);
      if (dtFiles.length === 0) return;
      await processFiles(dtFiles);
    };

    return (
      <div className="space-y-4">
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          className={`p-6 rounded-2xl border-2 border-dashed ${isUploading ? "border-[#9747FF]" : "border-slate-200"} bg-white`}
          onClick={() => document.getElementById("upload-input")?.click()}
        >
          <input id="upload-input" type="file" accept="application/pdf" multiple className="hidden" onChange={onFileChange} />
          <div className="text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-gradient-to-r from-[#FF6B35] to-[#F7931E] flex items-center justify-center text-white mb-3">PDF</div>
            <div className="font-semibold">{isUploading ? "Uploading..." : "Upload PDFs"}</div>
            <div className="text-sm text-slate-500">Drag & drop or click to select (PDF only)</div>
          </div>
        </div>

        {/* uploaded docs */}
        {uploadedDocs.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Uploaded ({uploadedDocs.length})</div>
            <div className="space-y-2">
              {uploadedDocs.map((f, idx) => (
                <div key={idx} className={`p-3 rounded-lg flex items-center justify-between ${selectedDoc?.name === f.name ? "bg-blue-50 border border-blue-200" : "bg-white border border-slate-100"}`}>
                  <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setSelectedDoc(f)}>
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-[#1473E6] to-[#9747FF] text-white flex items-center justify-center">{f.name?.slice(0,1).toUpperCase()}</div>
                    <div className="min-w-0">
                      <div className="text-sm truncate">{f.name}</div>
                      <div className="text-xs text-slate-500">{formatFileSize(f.size)}</div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button onClick={() => setSelectedDoc(f)} className="text-slate-500 p-2">View</button>
                    <button onClick={() => removeFile(idx)} className="text-red-500 p-2">Remove</button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between p-3 mt-2 bg-slate-50 rounded-lg">
              <div className="text-sm text-slate-600">{uploadedDocs.length} document{uploadedDocs.length !== 1 ? "s" : ""}</div>
              <div className="flex items-center space-x-2">
                <button onClick={() => { setUploadedDocs([]); setSelectedDoc(null); setProcessDone(false); setSuggestions([]); }} className="text-sm text-slate-500">Clear</button>
                <button onClick={() => processFiles(uploadedDocs)} className="px-3 py-1 rounded bg-[#1473E6] text-white text-sm">Process</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  function PDFViewer() {
    // compute viewer height for better space usage
    const viewerHeight = "640px"; // adjust as needed; can be dynamic

    return (
      <div className="rounded-2xl overflow-hidden shadow-lg border bg-white">
        <div className="px-4 py-3 bg-gradient-to-r from-[#1473E6] to-[#9747FF] text-white flex items-center justify-between">
          <div>
            <div className="font-bold">{selectedDoc?.name || "Document Viewer"}</div>
            <div className="text-xs">{selectedDoc ? selectedDoc.name : "Upload a PDF to preview."}</div>
          </div>
          <div className="text-sm">Page {currentPage}</div>
        </div>

        <div style={{ minHeight: viewerHeight }} className="relative bg-white">
          {/* Adobe embed container */}
          <div id="adobe-dc-view" className="w-full h-full">
            {/* if no doc selected */}
            {!selectedDoc && (
              <div className="w-full h-full flex items-center justify-center p-8">
                <div className="text-center">
                  <h3 className="text-xl font-semibold">Welcome to Adobe Smart PDF Viewer</h3>
                  <p className="text-sm text-slate-500">Select a document to preview — Adobe preview used if available.</p>
                </div>
              </div>
            )}

            {/* fallback: iframe of blob url */}
            {selectedDoc && !window.AdobeDC && viewerBlobUrl && (
              <iframe ref={iframeRef} title="pdf-fallback" src={viewerBlobUrl} className="w-full h-full border-0" />
            )}
          </div>

          {/* overlay for analyzing/uploading */}
          {(isUploading || isAnalyzing) && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
              <div className="text-center">
                <div className="mb-2 font-semibold">{isUploading ? "Uploading files..." : "Analyzing document..."}</div>
                <div className="text-sm text-slate-600">This may take a few seconds</div>
              </div>
            </div>
          )}
        </div>

        <div className="px-4 py-3 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
          <div>
            <span className="font-semibold">Active Context:</span>
            {persona && <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">{persona}</span>}
            {job && <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">{job.length > 30 ? job.substring(0,30)+"..." : job}</span>}
          </div>
          <div>Adobe Embed API (if configured)</div>
        </div>
      </div>
    );
  }

  function RightColumn() {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-white rounded-xl shadow border">
          <div className="flex items-center justify-between mb-3">
            <div className="font-bold">Top Suggestions</div>
            <div className="text-xs text-slate-500">{processDone ? "ready" : "idle"}</div>
          </div>

          {!processDone && <div className="text-sm text-slate-500">Process files to get suggestions</div>}
          {processDone && suggestions.length === 0 && <div className="text-sm text-slate-500">No suggestions found</div>}

          {suggestions.map((s) => (
            <div key={s.id} className="p-2 border rounded mb-2 flex items-start justify-between">
              <div className="min-w-0 mr-2">
                <div className="font-medium truncate">{s.title}</div>
                <div className="text-xs text-slate-500">{s.fileName} • page {s.page}</div>
                <div className="text-xs text-slate-500 mt-1 truncate">{s.snippet}</div>
              </div>
              <div className="flex flex-col items-end space-y-2">
                <button onClick={() => jumpToSuggestion(s)} className="bg-[#1473E6] text-white px-2 py-1 rounded text-sm">Open</button>
                <div className="flex space-x-1">
                  <button onClick={() => speakText(s.snippet)} className="text-xs px-2 py-1 border rounded">Play</button>
                  <button onClick={() => { navigator.clipboard?.writeText(s.snippet); alert("Copied"); }} className="text-xs px-2 py-1 border rounded">Copy</button>
                </div>
              </div>
            </div>
          ))}

          <div className="mt-3">
            <button onClick={async () => {
              // example: fetch output.json (replace URL as needed)
              try {
                const res = await fetch("/output.json");
                const j = await res.json();
                setSuggestions(j.suggestions || generateMockOutput(uploadedDocs, persona, job));
                setProcessDone(true);
              } catch {
                // fallback
                setSuggestions(generateMockOutput(uploadedDocs, persona, job));
                setProcessDone(true);
                alert("Failed to fetch /output.json — used mock suggestions");
              }
            }} className="px-3 py-2 bg-[#1473E6] text-white rounded">Load output.json (optional)</button>
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl shadow border">
          <div className="font-bold mb-2">Audio & Notes</div>
          <div className="text-sm text-slate-600 mb-3">Play suggestion snippets or the whole summary</div>
          <div className="flex space-x-2">
            <button onClick={() => speakText(suggestions[0]?.snippet || "No suggestion available")} className="px-3 py-2 rounded bg-[#9747FF] text-white">Play Top</button>
            <button onClick={() => speakText(suggestions.map(s=>s.snippet).join("\n\n"))} className="px-3 py-2 rounded bg-[#FF6B35] text-white">Play All</button>
          </div>
        </div>
      </div>
    );
  }

  function ChatPopup() {
    return (
      <div>
        <div className="fixed bottom-6 right-6 z-50">
          <button onClick={() => setIsChatOpen(s => !s)} className="w-14 h-14 rounded-full bg-gradient-to-r from-[#1473E6] to-[#9747FF] text-white shadow-lg">?</button>

          {isChatOpen && (
            <div className="mt-3 w-[360px] bg-white rounded-lg shadow-lg overflow-hidden">
              <div className="px-3 py-2 bg-gradient-to-r from-[#1473E6] to-[#9747FF] text-white flex justify-between">
                <div>Do you know — Assistant</div>
                <div className="text-xs">Local</div>
              </div>

              <div className="p-3 h-64 overflow-auto">
                {chatMessages.map((m, i) => (
                  <div key={i} className={`${m.from==="bot"?"text-left":"text-right"} mb-3`}>
                    <div className={`${m.from==="bot"?"bg-slate-100 text-slate-900":"bg-[#1473E6] text-white"} inline-block px-3 py-2 rounded-lg`}>{m.text}</div>
                  </div>
                ))}
              </div>

              <div className="p-3 border-t flex gap-2">
                <input value={chatInput} onChange={(e)=>setChatInput(e.target.value)} className="flex-1 border rounded px-3 py-2" placeholder="Ask something..." />
                <button onClick={() => sendChat(chatInput)} className="px-3 py-2 bg-[#1473E6] text-white rounded">Send</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---------- Main layout ----------
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#1473E6] to-[#FF6B35]">Adobe Smart</h1>
          <p className="text-slate-600">Persona-driven PDF suggestions</p>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-3 space-y-6">
            <div className="p-4 bg-white rounded-xl shadow">
              <PersonaJobForm />
            </div>

            <div className="p-4 bg-white rounded-xl shadow">
              <PDFUploader />
            </div>
          </div>

          <div className="col-span-12 lg:col-span-6">
            {selectedDoc ? <PDFViewer /> : (
              <div className="h-[640px] flex items-center justify-center bg-white rounded-xl shadow border">
                <div className="text-center">
                  <h3 className="text-xl font-semibold">No document selected</h3>
                  <p className="text-slate-500">Upload and select a PDF to preview</p>
                </div>
              </div>
            )}
          </div>

          <div className="col-span-12 lg:col-span-3">
            <RightColumn />
          </div>
        </div>
      </div>

      <ChatPopup />
    </div>
  );
}
