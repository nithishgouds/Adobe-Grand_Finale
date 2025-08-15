import React, { useEffect, useRef, useState } from "react";

const API_BASE = "http://127.0.0.1:8000"

export default function AbodeSmartApp() {
  const [persona, setPersona] = useState({ name: "", profession: "", task: "" });

  const [pastDocs, setPastDocs] = useState([]);
  const [currentDocs, setCurrentDocs] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);

  const [sessionId, setSessionId] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [processed, setProcessed] = useState(false);

  const [relevantSections, setRelevantSections] = useState([]);
  const [topRelevant, setTopRelevant] = useState([]); // NEW: Top 5 relevant list

  const viewRef = useRef(null);
  const [adobeReady, setAdobeReady] = useState(false);

  const qs = (obj) => new URLSearchParams(obj).toString();
  const absUrl = (name) => `${API_BASE}/PDFs/${encodeURIComponent(name)}`;

  const refreshListFromApi = async () => {
    const res = await fetch(`${API_BASE}/list-pdfs?${qs({ session_id: sessionId || "" })}`);
    const data = await res.json();
    const files = (data?.files || []).map((f) => ({ name: f.name, url: f.url }));
  };

  const uploadPast = async (files) => {
    if (!files?.length) return;
    const form = new FormData();
    files.forEach((f) => form.append("pdfs", f));

    const url = `${API_BASE}/upload?${qs({
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
    setProcessed(false);
  };

  const uploadCurrent = async (files) => {
    if (!files?.length) return;
    const form = new FormData();
    files.forEach((f) => form.append("pdfs", f));

    const url = `${API_BASE}/upload?${qs({
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
    setCurrentDocs((prev) => [...prev, ...added]);
    
    setProcessing(false);
    setProcessed(false);
  };

  const processAll = async () => {
    if (!sessionId) {
      alert("Please upload at least one PDF first.");
      return;
    }

    setProcessing(true);
    const url = `${API_BASE}/process?${qs({
      session_id: sessionId,
      persona_role: persona.profession || "default_role",
      task: persona.task || "default_task",
      challenge_id: "default_challenge",
      test_case_name: "default_test_case",
      description: "default_description",
    })}`;
    const res = await fetch(url, { method: "POST" });
    const data = await res.json();
    setProcessing(false);
    setProcessed(true);

    if (currentDocs.length) {
      openInViewer(currentDocs[0]);
      setSelectedDoc(currentDocs[0]);
    }
  };

  useEffect(() => {
    if (window.AdobeDC) {
      setAdobeReady(true);
      return;
    }
    window.adobe_dc_view_sdk = window.adobe_dc_view_sdk || {};
    window.adobe_dc_view_sdk.ready = () => setAdobeReady(true);
  }, []);

  // NEW: Handle text selection API call
  const handleTextSelection = async (pdfName, pageNo, selectedText) => {
    try {
      const res = await fetch(`${API_BASE}/select-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pdf_name: pdfName,
          page_no: pageNo,
          selected_text: selectedText,
        }),
      });
      const data = await res.json();
      if (Array.isArray(data) && data.length) {
        updateRelevantList(data);
      }
    } catch (err) {
      console.error("Error fetching top relevant:", err);
    }
  };

  // NEW: Update relevant list and auto-navigate to first
  const updateRelevantList = (list) => {
    setTopRelevant(list);
    if (list.length > 0) {
      navigateToPage(list[0]);
    }
  };

  // NEW: Navigate to PDF and page
  const navigateToPage = (item) => {
    openInViewer({ name: item.pdf_name, url: absUrl(item.pdf_name) });
    setSelectedDoc({ name: item.pdf_name, url: absUrl(item.pdf_name) });
    setTimeout(() => {
      if (viewRef.current) {
        viewRef.current.gotoLocation(item.page_no);
      }
    }, 500);
  };

  const openInViewer = (doc) => {
    if (!adobeReady) return;
    const clientId =
      import.meta.env.VITE_ADOBE_EMBED_API_KEY || process.env.REACT_APP_ADOBE_EMBED_API_KEY;

    viewRef.current = new window.AdobeDC.View({
      clientId,
      divId: "adobe-dc-view",
    });

    viewRef.current.previewFile(
      {
        content: { location: { url: doc.url } },
        metaData: { fileName: doc.name },
      },
      {
        showAnnotationTools: false,
        dockPageControls: true,
      }
    );

    // NEW: Listen for text selection
    viewRef.current.registerCallback(
      window.AdobeDC.View.Enum.CallbackType.EVENT_LISTENER,
      (event) => {
        if (event.type === "TEXT_SELECTED") {
          const { selectedText, pageNumber } = event.data;
          handleTextSelection(doc.name, pageNumber, selectedText);
        }
      }
    );
  };

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
      {/* Left: Persona + Past Library */}
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
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold">Past Library</div>
          </div>
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

      {/* Middle: Current Session + Controls */}
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
            <button
              onClick={processAll}
              className="bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-50"
              disabled={!currentDocs.length || processing}
            >
              {processing ? "Processing..." : "Process All & Open Top"}
            </button>
            {processed && <span className="text-green-600 text-sm">Processed ✓</span>}
          </div>
          {sessionId && (
            <div className="mt-2 text-xs text-gray-500">
              session: <span className="font-mono">{sessionId.slice(0, 8)}…</span>
            </div>
          )}
        </div>

        {/* NEW: Top 5 Relevant */}
        {!!topRelevant.length && (
          <div className="bg-white rounded-xl border p-3 mt-4">
            <div className="font-semibold mb-2">Top 5 Relevant</div>
            <ul className="space-y-2">
              {topRelevant.map((item, idx) => (
                <li key={idx} className="border rounded p-2 flex justify-between">
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {item.pdf_name} — p.{item.page_no}
                    </div>
                    <div className="text-sm italic truncate">{item.section_title}</div>
                    <div className="text-sm text-gray-600 line-clamp-2">{item.sub_text}</div>
                  </div>
                  <button
                    onClick={() => navigateToPage(item)}
                    className="shrink-0 bg-blue-600 text-white px-2 py-1 rounded"
                  >
                    Navigate
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Right: Viewer */}
      <div className="col-span-6 space-y-4">
        <div className="bg-white rounded-xl border p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold">PDF Viewer</div>
            <div className="text-xs text-gray-500">
              {processing ? "processing…" : selectedDoc ? selectedDoc.name : "idle"}
            </div>
          </div>
          <div id="adobe-dc-view" className="h-[600px] border rounded" />
        </div>

        {!!relevantSections.length && (
          <div className="bg-white rounded-xl border p-3">
            <div className="font-semibold mb-2">Relevant Sections</div>
            <div className="space-y-2">
              {relevantSections.map((s, idx) => (
                <div
                  key={idx}
                  className="border rounded p-2 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{s.PDF_name} — p.{s.page_no}</div>
                    <div className="text-sm italic truncate">{s.Section_title}</div>
                    <div className="text-sm text-gray-600 line-clamp-3">{s.Snippet}</div>
                  </div>
                  <button
                    onClick={() =>
                      navigateToPage({ pdf_name: s.PDF_name, page_no: s.page_no })
                    }
                    className="shrink-0 bg-blue-600 text-white px-2 py-1 rounded"
                  >
                    Navigate
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}