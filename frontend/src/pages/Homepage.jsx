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
  const [topRelevant, setTopRelevant] = useState([]); // NEW: Top 5 relevant list

  const viewerApiRef = useRef(null);
  const [adobeReady, setAdobeReady] = useState(false);

  const [selectedText, setSelectedText] = useState(""); // To store the latest selected text
  const [insights, setInsights] = useState([]);
  const [podcastUrl, setPodcastUrl] = useState(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [isLoadingPodcast, setIsLoadingPodcast] = useState(false);

  const qs = (obj) => new URLSearchParams(obj).toString();
  const absUrl = (name) => `${API_BASE}/PDFs/${encodeURIComponent(name)}`;

  const refreshListFromApi = async () => {
    const res = await fetch(`${API_BASE}/list-pdfs?${qs({ session_id: sessionId || "" })}`);
    const data = await res.json();
    const files = (data?.files || []).map((f) => ({ name: f.name, url: f.url }));
    // setPastDocs(files) // If needed
  };

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
    setProcessed(false);
  };

  const uploadCurrent = async (files) => {
    if (!files?.length) return;
    const form = new FormData();
    files.forEach((f) => form.append("pdf", f));

    const url = `${API_BASE}/upload-current-doc?${qs({
      session_id: sessionId || "",
      challenge_id: "default_challenge",
      test_case_name: "default_test_case",
      description: "default_description",
      persona_role: persona.profession || "default_role",
      task: persona.task || "default_task",
    })}`;

    form.append("session_id", sessionId || "");

    setProcessing(true);
    const res = await fetch(url, { method: "POST", body: form });
    const data = await res.json();
    if (data?.session_id && !sessionId) setSessionId(data.session_id);

    const added = Array.from(files).map((f) => ({ name: f.name, url: absUrl(f.name) }));
    setCurrentDocs((prev) => [...prev, ...added]);
    setProcessing(false);
  };

  useEffect(() => {
    if (window.AdobeDC) {
      setAdobeReady(true);
      return;
    }
    window.adobe_dc_view_sdk = window.adobe_dc_view_sdk || {};
    window.adobe_dc_view_sdk.ready = () => setAdobeReady(true);
  }, []);

  const handleTextSelection = async (docName, pageNumber, selectedText) => {
    console.log("Selected text:", selectedText);
    try {
      const res = await fetch(`${API_BASE}/select-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          selected_text: selectedText,
        }),
      });
      const responseData = await res.json();

      const sections = responseData?.data?.extracted_sections;
      console.log("Relevant sections:", sections);

      if (Array.isArray(sections) && sections.length) {
        console.log("Setting relevant sections:", sections);
        setRelevantSections(sections);
      } else {
        console.log("No relevant sections found in response");
        setRelevantSections([]);
      }
    } catch (err) {
      console.error("Error fetching relevant sections:", err);
    }
  };

  const handleGetRelevantContentClick = async () => {
    console.log("Get selected content clicked");
    if (!viewerApiRef.current) return;
    try {
      const result = await viewerApiRef.current.getSelectedContent();
      if (result?.data) {
        setSelectedText(result.data); // Store the selected text for other features
        handleTextSelection(selectedDoc?.name, result.pageNumber || 1, result.data);
      } else {
        alert("No text selected in the PDF!");
      }
    } catch (err) {
      console.error("getSelectedContent error:", err);
    }
  };

  const handleInsightsClick = async () => {
    setIsLoadingInsights(true);
    setInsights(null);

    if (!viewerApiRef.current) return;
    try {
      const result = await viewerApiRef.current.getSelectedContent();
      const text = result?.data?.trim();
      if (!text) {
        alert("No text selected in the PDF!");
        return;
      }

      setSelectedText(text);

      if (!sessionId) return;
      console.log("Selected text for insights:", text);

      const res = await fetch(`${API_BASE}/insights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          selected_text: text, // use local variable
        }),
      });

      const data = await res.json();
      setInsights(data?.data?.insights || data?.insights || {});
    } catch (err) {
      console.error("Error fetching insights:", err);
    } finally {
      setIsLoadingInsights(false);
    }
  };
    
  const handlePodcastClick = async () => {
    setIsLoadingPodcast(true);
    setPodcastUrl(null);

    if (!viewerApiRef.current) return;
    try {
      const result = await viewerApiRef.current.getSelectedContent();
      const text = result?.data?.trim();
      if (!text) {
        alert("No text selected in the PDF!");
        return;
      }

      setSelectedText(text);

      if (!sessionId) return;

      const res = await fetch(`${API_BASE}/podcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          selected_text: text, // use local variable
        }),
      });

      const audioBlob = await res.blob();
      const url = URL.createObjectURL(audioBlob);
      setPodcastUrl(url);
    } catch (err) {
      console.error("Error fetching podcast:", err);
    } finally {
      setIsLoadingPodcast(false);
    }
  };


  const navigateToPage = async (section) => {
    if (selectedDoc?.name !== section.pdfName) {
      const docToOpen = { name: section.pdfName, url: absUrl(section.pdfName) };
      setSelectedDoc(docToOpen);
      await openInViewer(docToOpen);
    }

    if (viewerApiRef.current) {
      try {
        await viewerApiRef.current.gotoLocation(section.pageNo);
        if (viewerApiRef.current.search && section.title) {
          await viewerApiRef.current.search(section.title, { caseSensitive: true });
        }
      } catch (error) {
        console.error("Error during navigation or text search:", error);
        if (viewerApiRef.current.gotoLocation) {
            viewerApiRef.current.gotoLocation(section.pageNo);
        }
      }
    }
  };

  const openInViewer = async (doc) => {
    if (!adobeReady || !doc?.url) return;

    const adobeView = new window.AdobeDC.View({
      clientId: import.meta.env.VITE_ADOBE_EMBED_API_KEY || process.env.REACT_APP_ADOBE_EMBED_API_KEY,
      divId: "adobe-dc-view",
    });

    try {
      const viewer = await adobeView.previewFile(
        {
          content: { location: { url: doc.url } },
          metaData: { fileName: doc.name, id: doc.name },
        },
        {
          showAnnotationTools: true,
          enableAnnotationAPIs: true,
          includePDFAnnotations: true,
          showDownloadPDF: true,
          showPrintPDF: true,
          enableSearchAPIs: true,
          enableTextSelection: true,
        }
      );
      const apis = await viewer.getAPIs();
      viewerApiRef.current = apis;
    } catch (error) {
      console.error("Error loading PDF in viewer:", error);
    }
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
            className="mb-2 w-full text-sm"
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
            className="mb-2 w-full text-sm"
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
            {!processed && processing && (
              <span className="text-yellow-600 text-sm">Processing…</span>
            )}
          </div>
          {sessionId && (
            <div className="mt-2 text-xs text-gray-500">
              session: <span className="font-mono">{sessionId.slice(0, 8)}…</span>
            </div>
          )}
        </div>

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

      {/* Right: Viewer and Results */}
      <div className="col-span-6 space-y-4">
        <div className="bg-white rounded-xl border p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
                <div className="font-semibold">PDF Viewer</div>
                <div className="text-xs text-gray-500">
                    {processing ? "processing…" : selectedDoc ? selectedDoc.name : "idle"}
                </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleInsightsClick} className="p-2 rounded-full hover:bg-gray-200 disabled:opacity-50" title="Generate Insights">
                {isLoadingInsights ? "..." : "💡"}
              </button>
              <button onClick={handlePodcastClick} className="p-2 rounded-full hover:bg-gray-200 disabled:opacity-50" title="Generate Audio Overview">
                {isLoadingPodcast ? "..." : "🎙️"}
              </button>
              <button
                onClick={handleGetRelevantContentClick}
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
              >
                Get Relevant Content
              </button>
            </div>
          </div>
          <div id="adobe-dc-view" className="h-[600px] border rounded" />
        </div>
        
        {insights && (
          <div className="bg-white rounded-xl border p-4 relative animate-fade-in">
            <button onClick={() => setInsights(null)} className="absolute top-2 right-3 text-gray-500 hover:text-gray-800 text-xl font-bold">&times;</button>
            <h3 className="font-semibold text-lg mb-2">Insights ✨</h3>
            <div>
              {insights.key_takeaways && (
                  <>
                    <h4 className="font-bold mt-2">Key Takeaways</h4>
                    <ul className="list-disc list-inside text-sm text-gray-700">
                      {insights.key_takeaways.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  </>
              )}
              {insights.did_you_know && (
                  <>
                    <h4 className="font-bold mt-3">Did You Know?</h4>
                    <p className="text-sm text-gray-700">{insights.did_you_know}</p>
                  </>
              )}
               {insights.counterpoint && (
                  <>
                    <h4 className="font-bold mt-3">Counterpoint</h4>
                    <p className="text-sm text-gray-700">{insights.counterpoint}</p>
                  </>
              )}
              {insights.inspiration && (
                  <>
                    <h4 className="font-bold mt-3">Inspiration</h4>
                    <p className="text-sm text-gray-700">{insights.inspiration}</p>
                  </>
              )}
            </div>
          </div>
        )}

        {podcastUrl && (
          <div className="bg-white rounded-xl border p-4 relative animate-fade-in">
            <button onClick={() => setPodcastUrl(null)} className="absolute top-2 right-3 text-gray-500 hover:text-gray-800 text-xl font-bold">&times;</button>
            <h3 className="font-semibold text-lg mb-2">Audio Overview 🎧</h3>
            <audio controls autoPlay src={podcastUrl} className="w-full mt-2">
              Your browser does not support the audio element.
            </audio>
          </div>
        )}

        {!!relevantSections.length && (
          <div className="bg-white rounded-xl border p-3">
            <div className="font-semibold mb-2">Relevant Sections</div>
            <div className="space-y-2">
              {relevantSections.map((s, idx) => (
                <div key={idx} className="border rounded p-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">
                      {s.pdfName} — p.{s.pageNo}
                    </div>
                    <div className="text-sm italic truncate">{s.title}</div>
                    <div className="text-sm text-gray-600 line-clamp-3">{s.snippet}</div>
                  </div>
                  <button
                    onClick={() =>
                      navigateToPage(s)
                    }
                    className="shrink-0 bg-blue-600 text-white px-2 py-1 rounded text-sm"
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