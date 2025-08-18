import React, { useEffect, useRef, useState } from "react";

const API_BASE = "http://127.0.0.1:8000";

export default function AbodeSmartApp() {
  const [persona, setPersona] = useState({ profession: "", task: "" });
  const [pastDocs, setPastDocs] = useState([]);
  const [currentDocs, setCurrentDocs] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [isProcessingPast, setIsProcessingPast] = useState(false);
  const [isProcessedPast, setIsProcessedPast] = useState(false);
  const [isProcessingCurrent, setIsProcessingCurrent] = useState(false);
  const [relevantSections, setRelevantSections] = useState([]);
  const viewerApiRef = useRef(null);
  const [adobeReady, setAdobeReady] = useState(false);
  const [insights, setInsights] = useState(null);
  const [podcastUrl, setPodcastUrl] = useState(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [isLoadingPodcast, setIsLoadingPodcast] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef(null);
  const [roleData, setRoleData] = useState(null);
  const [isProcessingRole, setIsProcessingRole] = useState(false);

  const qs = (obj) => new URLSearchParams(obj).toString();
  const absUrl = (name) => `${API_BASE}/PDFs/${encodeURIComponent(name)}`;

  const uploadPast = async (files) => {
    if (!files?.length) return;
    const form = new FormData();
    files.forEach((f) => form.append("pdfs", f));
    const url = `${API_BASE}/upload-past-docs?${qs({
      session_id: sessionId || "",
      persona_role: persona.profession || "default_role",
      task: persona.task || "default_task",
    })}`;
    setIsProcessingPast(true);
    setIsProcessedPast(false);
    const res = await fetch(url, { method: "POST", body: form });
    const data = await res.json();
    if (data?.session_id && !sessionId) setSessionId(data.session_id);
    const added = Array.from(files).map((f) => ({ name: f.name, url: URL.createObjectURL(f) }));
    setPastDocs((prev) => [...prev, ...added]);
    setIsProcessingPast(false);
    setIsProcessedPast(true);
  };

  const uploadCurrent = async (files) => {
    if (!files?.length) return;
    const form = new FormData();
    files.forEach((f) => form.append("pdf", f));
    const url = `${API_BASE}/upload-current-doc?${qs({
      session_id: sessionId || "",
      persona_role: persona.profession || "default_role",
      task: persona.task || "default_task",
    })}`;
    setIsProcessingCurrent(true);
    const res = await fetch(url, { method: "POST", body: form });
    const data = await res.json();
    if (data?.session_id && !sessionId) setSessionId(data.session_id);
    const added = Array.from(files).map((f) => ({ name: f.name, url: URL.createObjectURL(f) }));
    setCurrentDocs((prev) => [...prev, ...added]);
    setIsProcessingCurrent(false);
  };

  const handleRolePersona = async ({ sessionId, persona, setIsProcessingRole, setRoleData }) => {
    try {
      const url = `${API_BASE}/role-task?${qs({
        session_id: sessionId || "",
        persona_role: persona.profession || "default_role",
        task: persona.task || "default_task",
      })}`;

      setIsProcessingRole(true);

      const res = await fetch(url, { method: "POST" });
      const data = await res.json();

      if (data.error) {
        console.error("⚠ Error generating role persona:", data.error);
      } else {
        setRoleData(data);
      }
    } catch (err) {
      console.error("⚠ Network error:", err);
    } finally {
      setIsProcessingRole(false);
    }
  };

  useEffect(() => {
    if (window.AdobeDC) {
      setAdobeReady(true);
      return;
    }
    document.addEventListener("adobe_dc_view_sdk.ready", () => setAdobeReady(true));
  }, []);

  const handleTextSelection = async (selectedText) => {
    if (!sessionId || !selectedText) return;
    try {
      const res = await fetch(`${API_BASE}/select-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, selected_text: selectedText }),
      });
      const responseData = await res.json();
      const sections = responseData?.data?.extracted_sections;
      setRelevantSections(Array.isArray(sections) ? sections : []);
    } catch (err) {
      console.error("Error fetching relevant sections:", err);
      setRelevantSections([]);
    }
  };

  const handleGetRelevantContentClick = async () => {
    if (!viewerApiRef.current) return;
    try {
      const result = await viewerApiRef.current.getSelectedContent();
      const text = result?.data?.trim();
      if (text) {
        handleTextSelection(text);
      } else {
        alert("Please select text in the PDF to find relevant content.");
      }
    } catch (err) {
      console.error("getSelectedContent error:", err);
    }
  };

  const handleInsightsClick = async () => {
    if (!viewerApiRef.current) return;
    setIsLoadingInsights(true);
    setInsights(null);
    try {
      const result = await viewerApiRef.current.getSelectedContent();
      const text = result?.data?.trim();
      if (!text) {
        alert("Please select text to generate insights.");
        setIsLoadingInsights(false);
        return;
      }
      if (!sessionId) {
        setIsLoadingInsights(false);
        return;
      }
      const res = await fetch(`${API_BASE}/insights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, selected_text: text }),
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
    if (isPlaying && audioRef.current) {
      console.log("Stopping current audio");

      // Stop playback and reset
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = "";
      audioRef.current.load();

      setIsPlaying(false);

      // Free object URL memory
      if (podcastUrl) {
        URL.revokeObjectURL(podcastUrl);
        setPodcastUrl(null);
      }

      // Tell backend to cancel synthesis
      if (sessionId) {
        try {
          await fetch(`${API_BASE}/stop-podcast`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: sessionId ,
              selected_text: ""  
            }),
          });
        } catch (err) {
          console.error("Error stopping podcast on backend:", err);
        }
      }

      return;
    }

    setIsLoadingPodcast(true);
    setPodcastUrl(null);

    if (!viewerApiRef.current) {
      setIsLoadingPodcast(false);
      return;
    }

    try {
      const result = await viewerApiRef.current.getSelectedContent();
      const text = result?.data?.trim();
      if (!text) {
        alert("No text selected in the PDF!");
        return;
      }

      if (!sessionId) {
        alert("Session not initialized!");
        return;
      }

      const res = await fetch(`${API_BASE}/podcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          selected_text: text,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      console.log("Podcast response received, processing audio blob...");
      const audioBlob = await res.blob();
      const url = URL.createObjectURL(audioBlob);
      setPodcastUrl(url);
      console.log("Generated podcast URL:", url);

      // Create, play, and store the new audio instance
      console.log("Playing new podcast audio from URL:", url);
      const audio = new Audio(url);
      audioRef.current = audio;
      await audio.play();
      setIsPlaying(true);
      console.log("Audio is now playing:", isPlaying);

      // Reset when audio finishes
      audio.onended = () => {
        setIsPlaying(false);
        if (podcastUrl) {
          URL.revokeObjectURL(podcastUrl);
        }
        audioRef.current = null;
        setPodcastUrl(null);
      };

    } catch (err) {
      console.error("Error fetching podcast:", err);
      alert("Failed to generate podcast. Try again.");
    } finally {
      setIsLoadingPodcast(false);
    }
  };

  const navigateToPage = async (section) => {
    if (selectedDoc?.name !== section.pdfName) {
      const docToOpen = { name: section.pdfName, url: absUrl(section.pdfName) };
      await openInViewer(docToOpen);
    }
    if (viewerApiRef.current) {
      try {
        await viewerApiRef.current.gotoLocation(section.pageNo);
        if (viewerApiRef.current.search && section.title) {
          await viewerApiRef.current.search(section.title, { caseSensitive: false });
        }
      } catch (error) {
        console.error("Error during navigation or text search:", error);
      }
    }
  };

  const openInViewer = async (doc) => {
    if (!adobeReady || !doc?.url) return;
    setSelectedDoc(doc);
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
          embedMode: "SIZED_CONTAINER",
          showAnnotationTools: true,
          enableAnnotationAPIs: true,
          showDownloadPDF: true,
          showPrintPDF: true,
          enableSearchAPIs: true,
        }
      );
      viewerApiRef.current = await viewer.getAPIs();
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

  const Panel = ({ title, children }) => (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col">
      <h3 className="text-base font-semibold text-gray-800 px-4 py-3 border-b border-gray-200 bg-gray-50/70 rounded-t-lg">{title}</h3>
      <div className="p-4 space-y-4">{children}</div>
    </div>
  );

  const FileInput = ({ onChange, multiple = false, disabled = false }) => (
    <input
      type="file"
      multiple={multiple}
      onChange={(e) => onChange(Array.from(e.target.files || []))}
      disabled={disabled}
      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
    />
  );

  const TextInput = ({ placeholder, value, onChange }) => (
    <input
      className="bg-white border border-gray-300 rounded-md w-full p-2.5 text-sm text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 transition"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
    />
  );

  const PrimaryButton = ({ onClick, children, className = "" }) => (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-md bg-blue-950 hover:bg-black text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-800 transition-all ${className}`}
    >
      {children}
    </button>
  );

  const SecondaryButton = ({ onClick, title, children, isLoading = false }) => (
    <button
      onClick={onClick}
      title={title}
      className="px-4 py-2 rounded-md border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
      disabled={isLoading}
    >
      {isLoading ? (
        <svg className="animate-spin h-5 w-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : (
        children
      )}
    </button>
  );

  const ProcessingIndicator = ({ text }) => (
    <div className="flex items-center gap-2 text-sm text-blue-600 p-2 bg-blue-50 rounded-md">
      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span>{text}</span>
    </div>
  );

  const EmptyState = ({ message }) => (
    <div className="text-center py-4">
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );

  return (
    <div className="h-screen w-screen flex flex-col font-sans text-gray-900 bg-gray-100">
      <header className="w-full bg-white border-b border-gray-200 sticky top-0 z-10 h-16 flex-shrink-0">
        <div className="max-w-full mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <svg role="img" viewBox="0 0 24 24" className="h-7 w-7 text-[#FF0000]" xmlns="http://www.w3.org/2000/svg"><title>Adobe</title><path d="M15.1 2H24v20L15.1 2zM8.9 2H0v20L8.9 2zM12 9.4l3.15 7.6L12 17l-3.15-.02.02-7.58z"/></svg>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">Smart Workspace</h1>
          </div>
          {sessionId && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-mono">
              Session: {sessionId.slice(0, 8)}
            </span>
          )}
        </div>
      </header>

      <main className="flex-grow grid grid-cols-12 gap-6 p-6 overflow-hidden">
        <aside className="col-span-3 space-y-6 overflow-y-auto pb-6 pr-3">
          <Panel title="Past Documents">
            <FileInput onChange={uploadPast} multiple disabled={isProcessingPast} />
            {isProcessingPast && <ProcessingIndicator text="Processing documents..." />}
            {isProcessedPast && <div className="text-sm text-green-600">✓ Documents processed successfully.</div>}
            <ul className="space-y-1">
              {pastDocs.length > 0 ? (
                pastDocs.map((d, i) => (
                  <li key={`${d.name}-${i}`}>
                    <button onClick={() => openInViewer(d)} className={`w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors truncate ${selectedDoc?.name === d.name ? "bg-blue-100 font-semibold" : "hover:bg-gray-100"}`} title={d.name}> {d.name} </button>
                  </li>
                ))
              ) : (
                <EmptyState message="Upload reference documents here." />
              )}
            </ul>
          </Panel>

          <Panel title="Current Document">
            <FileInput onChange={uploadCurrent} disabled={isProcessingCurrent} />
            {isProcessingCurrent && <ProcessingIndicator text="Uploading document..." />}
            <ul className="space-y-1">
              {currentDocs.length > 0 ? (
                currentDocs.map((d, i) => (
                  <li key={`${d.name}-${i}`}>
                    <button onClick={() => openInViewer(d)} className={`w-full text-left px-3 py-1.5 text-sm rounded-md transition-colors truncate ${selectedDoc?.name === d.name ? "bg-blue-100 font-semibold" : "hover:bg-gray-100"}`} title={d.name}> {d.name} </button>
                  </li>
                ))
              ) : (
                <EmptyState message="Upload your main document here." />
              )}
            </ul>
          </Panel>

          <Panel title="Persona">
            <TextInput placeholder="Profession (e.g., Legal Analyst)" value={persona.profession} onChange={(e) => setPersona({ ...persona, profession: e.target.value })}/>
            <TextInput placeholder="Task (e.g., Summarize contract risks)" value={persona.task} onChange={(e) => setPersona({ ...persona, task: e.target.value })}/>
            <PrimaryButton 
              onClick={() => handleRolePersona({ sessionId, persona, setIsProcessingRole, setRoleData })}
              className="w-full mt-2"
              disabled={!persona.profession || !persona.task || isProcessingRole}
            >
              {isProcessingRole ? "Processing..." : "Generate Role Persona"}
            </PrimaryButton>
          </Panel>
        </aside>

        <section className="col-span-5 h-full flex flex-col">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm h-full flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 flex-shrink-0 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-base font-semibold truncate text-gray-900">{selectedDoc ? selectedDoc.name : "PDF Viewer"}</h2>
                <p className="text-xs text-gray-500">{selectedDoc ? "Select text and use the actions below" : "Select a document to view"}</p>
              </div>
              <div className="flex items-center gap-2">
                <SecondaryButton onClick={handleInsightsClick} title="Generate Insights" isLoading={isLoadingInsights}>Insights</SecondaryButton>
                <SecondaryButton 
                  onClick={handlePodcastClick} 
                  className="p-2 rounded-full hover:bg-gray-200 disabled:opacity-50" 
                  title={isPlaying ? "Stop Audio" : "Generate Audio Overview"}
                  disabled={isLoadingInsights} // Disable if insights are loading
                >
                  {isLoadingPodcast ? "..." : (isPlaying ? "⏹" : "🎙")}
              </SecondaryButton>
                <PrimaryButton onClick={handleGetRelevantContentClick}>Get Relevant Sections</PrimaryButton>
              </div>
            </div>
            <div id="adobe-dc-view" className="w-full flex-grow rounded-b-lg bg-gray-50" />
          </div>
        </section>

        <aside className="col-span-4 space-y-6 overflow-y-auto pb-6 pr-3">
          <Panel title="Relevant Sections">
            <div className="space-y-2">
              {relevantSections.length > 0 ? (
                relevantSections.map((s, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-3 hover:border-blue-400 transition">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate text-gray-900">{s.pdfName}</div>
                        <div className="text-xs text-gray-500 truncate">Page {s.pageNo} - {s.title}</div>
                      </div>
                      <button onClick={() => navigateToPage(s)} className="shrink-0 px-2.5 py-1 rounded-md border border-blue-600 text-blue-600 text-xs font-semibold hover:bg-blue-50 transition">
                        Go to
                      </button>
                    </div>
                    <p className="text-xs text-gray-600 mt-2 line-clamp-3">{s.snippet}</p>
                  </div>
                ))
              ) : (
                <EmptyState message="Results will appear here." />
              )}
            </div>
          </Panel>

          <Panel title="Insights">
            {insights ? (
              <div className="space-y-4 text-sm">
                {insights.key_takeaways && (
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-1">Key Takeaways</h4>
                    <ul className="list-disc list-inside text-gray-700 space-y-1">
                      {insights.key_takeaways.map((item, i) => <li key={i}>{item}</li>)}
                    </ul>
                  </div>
                )}
                {insights.did_you_know && (
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-1">Did You Know?</h4>
                    <p className="text-gray-700">{insights.did_you_know}</p>
                  </div>
                )}
                {insights.counterpoint && (
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-1">Counterpoint</h4>
                    <p className="text-gray-700">{insights.counterpoint}</p>
                  </div>
                )}
                {insights.inspiration && (
                  <div>
                    <h4 className="font-semibold text-gray-800 mb-1">Inspiration</h4>
                    <p className="text-gray-700">{insights.inspiration}</p>
                  </div>
                )}
              </div>
            ) : (
              <EmptyState message="Insights will appear here." />
            )}
          </Panel>

          {podcastUrl && (
            <Panel title="Audio Overview">
              <div className="space-y-2">
                <audio controls autoPlay src={podcastUrl} className="w-full" />
                <button onClick={() => setPodcastUrl(null)} className="w-full text-center px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-100 font-semibold text-gray-600 transition-colors">
                  Clear Audio
                </button>
              </div>
            </Panel>
          )}
        </aside>
      </main>
    </div>
  );
}