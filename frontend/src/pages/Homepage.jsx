import React, { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react"

const API_BASE = window._env_?.VITE_API_BASE || import.meta.env.VITE_API_BASE || "/api";

export default function AbodeSmartApp() {
  const [persona, setPersona] = useState({ profession: "", task: "" })
  const [pastDocs, setPastDocs] = useState([])
  const [currentDocs, setCurrentDocs] = useState([])
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [isProcessingPast, setIsProcessingPast] = useState(false)
  const [isProcessedPast, setIsProcessedPast] = useState(false)
  const [isProcessingCurrent, setIsProcessingCurrent] = useState(false)
  const [relevantSections, setRelevantSections] = useState([])
  const viewerApiRef = useRef(null)
  const [adobeReady, setAdobeReady] = useState(false)
  const [insights, setInsights] = useState(null)
  const [podcastUrl, setPodcastUrl] = useState(null)
  const [isLoadingInsights, setIsLoadingInsights] = useState(false)
  const [isLoadingPodcast, setIsLoadingPodcast] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef(null)
  const [roleData, setRoleData] = useState(null)
  const [personaSections, setPersonaSections] = useState([])
  const [isProcessingRole, setIsProcessingRole] = useState(false)
  const [chatHistory, setChatHistory] = useState([])
  const [isChatting, setIsChatting] = useState(false)
  const chatContainerRef = useRef(null)
  const leftSidebarRef = useRef(null)
  const rightSidebarRef = useRef(null)
  const scrollPositions = useRef({ left: 0, right: 0 })
  const [shouldRestoreScroll, setShouldRestoreScroll] = useState(false)
  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false)
  const [isChatModalOpen, setIsChatModalOpen] = useState(false)

  const qs = (obj) => new URLSearchParams(obj).toString()
  const absUrl = (name) => `${API_BASE}/PDFs/${encodeURIComponent(name)}`

  const handleLeftScroll = useCallback(() => {
    if (leftSidebarRef.current) {
      scrollPositions.current.left = leftSidebarRef.current.scrollTop
    }
  }, [])

  const handleRightScroll = useCallback(() => {
    if (rightSidebarRef.current) {
      scrollPositions.current.right = rightSidebarRef.current.scrollTop
    }
  }, [])

  useLayoutEffect(() => {
    if (shouldRestoreScroll) {
      if (leftSidebarRef.current) {
        leftSidebarRef.current.scrollTop = scrollPositions.current.left
      }
      if (rightSidebarRef.current) {
        rightSidebarRef.current.scrollTop = scrollPositions.current.right
      }
      setShouldRestoreScroll(false)
    }
  }, [shouldRestoreScroll])

  const uploadPast = async (files) => {
    if (!files?.length) return
    const form = new FormData()
    files.forEach((f) => form.append("pdfs", f))
    const url = `${API_BASE}/upload-past-docs?${qs({
      session_id: sessionId || "",
      persona_role: persona.profession || "default_role",
      task: persona.task || "default_task",
    })}`
    setIsProcessingPast(true)
    setIsProcessedPast(false)
    const res = await fetch(url, { method: "POST", body: form })
    const data = await res.json()
    console.log("Upload Past Response:", data)
    if (data?.session_id && !sessionId) setSessionId(data.session_id)
    const added = Array.from(files).map((f) => ({ name: f.name, url: URL.createObjectURL(f) }))
    setPastDocs((prev) => [...prev, ...added])
    setIsProcessingPast(false)
    setIsProcessedPast(true)
  }

  const uploadCurrent = async (files) => {
    if (!files?.length) return
    const form = new FormData()
    files.forEach((f) => form.append("pdf", f))
    const url = `${API_BASE}/upload-current-doc?${qs({
      session_id: sessionId || "",
      persona_role: persona.profession || "default_role",
      task: persona.task || "default_task",
    })}`
    setIsProcessingCurrent(true)
    const res = await fetch(url, { method: "POST", body: form })
    const data = await res.json()
    if (data?.session_id && !sessionId) setSessionId(data.session_id)
    const added = Array.from(files).map((f) => ({ name: f.name, url: URL.createObjectURL(f) }))
    setCurrentDocs((prev) => [...prev, ...added])
    setIsProcessingCurrent(false)
  }

  const handleRolePersona = async ({ sessionId, persona, setIsProcessingRole, setRoleData }) => {
    try {
      const url = `${API_BASE}/role-task?${qs({
        session_id: sessionId || "",
        persona_role: persona.profession || "default_role",
        task: persona.task || "default_task",
      })}`
      setIsProcessingRole(true)
      setPersonaSections([])
      const res = await fetch(url, { method: "POST" })
      const responsePayload = await res.json()
      if (responsePayload.error) {
        setPersonaSections([])
      } else {
        const actualData = responsePayload.data
        setRoleData(actualData)
        const extracted = actualData?.extracted_sections || []
        const analysis = actualData?.subsection_analysis || []
        const combinedSections = extracted.map(section => {
          const matchingAnalysis = analysis.find(
            item => item.document === section.document && item.page_number === section.page_number
          )
          return {
            pdfName: section.document,
            title: section.section_title,
            pageNo: section.page_number,
            snippet: matchingAnalysis?.refined_text || "No additional text found.",
          }
        })
        setPersonaSections(combinedSections)
      }
    } catch (err) {
    } finally {
      setIsProcessingRole(false)
    }
  }

  useEffect(() => {
    if (window.AdobeDC) {
      setAdobeReady(true)
      return
    }
    document.addEventListener("adobe_dc_view_sdk.ready", () => setAdobeReady(true))
  }, [])

  const handleTextSelection = async (selectedText) => {
    if (!sessionId || !selectedText) return
    try {
      const res = await fetch(`${API_BASE}/select-text`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, selected_text: selectedText }),
      })
      const responseData = await res.json()
      const sections = responseData?.data?.extracted_sections
      setRelevantSections(Array.isArray(sections) ? sections : [])
    } catch (err) {
      setRelevantSections([])
    }
  }

  const handleGetRelevantContentClick = async () => {
    if (!viewerApiRef.current) return
    try {
      const result = await viewerApiRef.current.getSelectedContent()
      const text = result?.data?.trim()
      if (text) {
        handleTextSelection(text)
      } else {
        alert("Please select text in the PDF to find relevant content.")
      }
    } catch (err) {
    }
  }

  const handleInsightsClick = async () => {
    if (!viewerApiRef.current) return
    setIsLoadingInsights(true)
    setInsights(null)
    try {
      const result = await viewerApiRef.current.getSelectedContent()
      const text = result?.data?.trim()
      if (!text) {
        alert("Please select text to generate insights.")
        setIsLoadingInsights(false)
        return
      }
      if (!sessionId) {
        setIsLoadingInsights(false)
        return
      }
      const res = await fetch(`${API_BASE}/insights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, selected_text: text }),
      })
      const data = await res.json()
      setInsights(data?.data?.insights || data?.insights || {})
    } catch (err) {
    } finally {
      setIsLoadingInsights(false)
    }
  }

  const handlePodcastClick = async () => {
    if (isPlaying && audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current.src = ""
      audioRef.current.load()
      setIsPlaying(false)
      if (podcastUrl) {
        URL.revokeObjectURL(podcastUrl)
        setPodcastUrl(null)
      }
      if (sessionId) {
        try {
          await fetch(`${API_BASE}/stop-podcast`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: sessionId, selected_text: "" }),
          })
        } catch (err) {
        }
      }
      return
    }
    setIsLoadingPodcast(true)
    setPodcastUrl(null)
    if (!viewerApiRef.current) {
      setIsLoadingPodcast(false)
      return
    }
    try {
      const result = await viewerApiRef.current.getSelectedContent()
      const text = result?.data?.trim()
      if (!text) {
        alert("No text selected in the PDF!")
        setIsLoadingPodcast(false)
        return
      }
      if (!sessionId) {
        alert("Session not initialized!")
        setIsLoadingPodcast(false)
        return
      }
      const res = await fetch(`${API_BASE}/podcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          selected_text: text,
        }),
      })
      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`)
      }
      const audioBlob = await res.blob()
      const url = URL.createObjectURL(audioBlob)
      setPodcastUrl(url)
      const audio = new Audio(url)
      audioRef.current = audio
      await audio.play()
      setIsPlaying(true)
      setIsLoadingPodcast(false)
      audio.onended = () => {
        setIsPlaying(false)
        if (podcastUrl) {
          URL.revokeObjectURL(podcastUrl)
        }
        audioRef.current = null
        setPodcastUrl(null)
      }
    } catch (err) {
      alert("Failed to generate podcast. Try again.")
      setIsLoadingPodcast(false)
    }
  }

  const handleChatSubmit = async (prompt) => {
    if (!prompt.trim() || !sessionId) return
    setIsChatting(true)
    const userMessage = { role: "user", content: prompt }
    setChatHistory(prev => [...prev, userMessage])
    try {
      const selectionResult = await viewerApiRef.current?.getSelectedContent()
      const selectedText = selectionResult?.data?.trim() || "No specific text is selected."
      const historyForApi = chatHistory.reduce((acc, msg, index) => {
        if (msg.role === 'user') {
          const assistantMsg = chatHistory[index + 1]
          if (assistantMsg && assistantMsg.role === 'assistant') {
            acc.push({ user: msg.content, assistant: assistantMsg.content })
          }
        }
        return acc
      }, [])
      const res = await fetch(`${API_BASE}/chatbot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          selected_text: selectedText,
          current_prompt: userMessage.content,
          history: historyForApi,
        }),
      })
      if (!res.ok) throw new Error(`Server error: ${res.status}`)
      const data = await res.json()
      const assistantMessage = { role: "assistant", content: data.response }
      setChatHistory(prev => [...prev, assistantMessage])
    } catch (err) {
      const errorMessage = { role: "assistant", content: "Sorry, I encountered an error. Please try again." }
      setChatHistory(prev => [...prev, errorMessage])
    } finally {
      setIsChatting(false)
    }
  }
  
  const handlePersonaSubmit = (newPersona) => {
    setPersona(newPersona)
    handleRolePersona({
        sessionId,
        persona: newPersona,
        setIsProcessingRole,
        setRoleData
    })
    setIsPersonaModalOpen(false)
  }

  const handleChatModalSubmit = (prompt) => {
    handleChatSubmit(prompt)
    setIsChatModalOpen(false)
  }

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [chatHistory])

  const navigateToPage = async (section) => {
    const docName = section.pdfName || section.document
    if (selectedDoc?.name !== docName) {
      const docToOpen = { name: docName, url: absUrl(docName) }
      await openInViewer(docToOpen)
    }
    if (viewerApiRef.current) {
      try {
        await viewerApiRef.current.gotoLocation(section.pageNo || section.page_number)
        if (viewerApiRef.current.search && (section.title || section.section_title)) {
          await viewerApiRef.current.search(section.title || section.section_title, { caseSensitive: false })
        }
      } catch (error) {
      }
    }
  }

  const openInViewer = async (doc) => {
    if (!adobeReady || !doc?.url) return
    setSelectedDoc(doc)
    const adobeView = new window.AdobeDC.View({
      clientId: window._env_?.VITE_ADOBE_EMBED_API_KEY || import.meta.env.VITE_ADOBE_EMBED_API_KEY || process.env.REACT_APP_ADOBE_EMBED_API_KEY,
      divId: "adobe-dc-view",
    })
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
      )
      viewerApiRef.current = await viewer.getAPIs()
    } catch (error) {
    }
  }

  useEffect(() => {
    const onClose = () => {
      if (!sessionId) return
      fetch(`${API_BASE}/end-session?${qs({ session_id: sessionId })}`, {
        method: "POST",
        keepalive: true,
      })
    }
    window.addEventListener("beforeunload", onClose)
    return () => window.removeEventListener("beforeunload", onClose)
  }, [sessionId])

  useEffect(() => {
    const leftSidebar = leftSidebarRef.current
    const rightSidebar = rightSidebarRef.current
    if (leftSidebar) {
      leftSidebar.addEventListener('scroll', handleLeftScroll)
    }
    if (rightSidebar) {
      rightSidebar.addEventListener('scroll', handleRightScroll)
    }
    return () => {
      if (leftSidebar) {
        leftSidebar.removeEventListener('scroll', handleLeftScroll)
      }
      if (rightSidebar) {
        rightSidebar.removeEventListener('scroll', handleRightScroll)
      }
    }
  }, [handleLeftScroll, handleRightScroll])

  const Panel = ({ title, children, isFlex = false }) => (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col ${isFlex ? 'flex-1 min-h-0' : ''}`}>
      <h3 className="text-base font-semibold text-gray-800 px-4 py-3 border-b border-gray-200 bg-gray-50/70 rounded-t-lg">{title}</h3>
      <div className={`p-4 flex flex-col gap-4 ${isFlex ? 'flex-1 min-h-0' : ''}`}>{children}</div>
    </div>
  )

  const FileInput = ({ onChange, multiple = false, disabled = false }) => (
    <input
      type="file"
      multiple={multiple}
      onChange={(e) => onChange(Array.from(e.target.files || []))}
      disabled={disabled}
      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
    />
  )

  const TextInput = ({ placeholder, value, onChange, onKeyDown }) => (
    <input
      className="bg-white border border-gray-300 rounded-md w-full p-2.5 text-sm text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 transition"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
    />
  )

  const PrimaryButton = ({ onClick, children, className = "", disabled = false, type = "button" }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      type={type}
      className={`px-4 py-2 rounded-md bg-blue-950 hover:bg-black text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-800 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed ${className}`}
    >
      {children}
    </button>
  )

  const SecondaryButton = ({ onClick, title, children, isLoading = false, disabled = false }) => (
    <button
      onClick={onClick}
      title={title}
      className="px-4 py-2 rounded-md border border-gray-300 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      disabled={isLoading || disabled}
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
  )
    
  const PersonaModal = ({ isOpen, onClose, onSubmit, initialPersona, isProcessing }) => {
    const [localPersona, setLocalPersona] = useState(initialPersona);

    useEffect(() => {
        if (isOpen) {
            setLocalPersona(initialPersona);
        }
    }, [initialPersona, isOpen]);

    const handleChange = (field, value) => {
        setLocalPersona(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(localPersona);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center transition-opacity" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-6">
                        <h2 className="text-xl font-bold text-gray-800 mb-1">Set Your Persona</h2>
                        <p className="text-sm text-gray-500 mb-6">Define your role and task to tailor the results.</p>
                        <div className="space-y-4">
                            <TextInput placeholder="Profession (e.g., Legal Analyst)" value={localPersona.profession || ''} onChange={(e) => handleChange('profession', e.target.value)} />
                            <TextInput placeholder="Task (e.g., Summarize contract risks)" value={localPersona.task || ''} onChange={(e) => handleChange('task', e.target.value)} />
                        </div>
                    </div>
                    <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end items-center gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50" disabled={isProcessing}>
                            Cancel
                        </button>
                        <PrimaryButton type="submit" disabled={!localPersona.profession || !localPersona.task || isProcessing}>
                            {isProcessing ? "Processing..." : "Generate Persona"}
                        </PrimaryButton>
                    </div>
                </form>
            </div>
        </div>
    );
  };

  const ChatModal = ({ isOpen, onClose, onSubmit, isProcessing }) => {
    const [prompt, setPrompt] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!prompt.trim()) return;
        onSubmit(prompt);
        setPrompt("");
    };
    
    useEffect(() => {
      if(!isOpen) {
        setPrompt("");
      }
    }, [isOpen])

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg m-4" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSubmit}>
                    <div className="p-6">
                        <h2 className="text-xl font-bold text-gray-800 mb-1">Ask the Chatbot</h2>
                        <p className="text-sm text-gray-500 mb-6">Ask a question about the selected text or the document in general.</p>
                        <textarea
                            className="bg-white border border-gray-300 rounded-md w-full p-2.5 text-sm text-gray-800 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 transition"
                            placeholder="Type your question here..."
                            rows="4"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end items-center gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50" disabled={isProcessing}>
                            Cancel
                        </button>
                        <PrimaryButton type="submit" disabled={!prompt.trim() || isProcessing}>
                            {isProcessing ? "Thinking..." : "Send"}
                        </PrimaryButton>
                    </div>
                </form>
            </div>
        </div>
    );
  };

  const ProcessingIndicator = ({ text }) => (
    <div className="flex items-center gap-2 text-sm text-blue-600 p-2 bg-blue-50 rounded-md">
      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span>{text}</span>
    </div>
  )

  const EmptyState = ({ message }) => (
    <div className="text-center py-4">
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  )

  return (
    <div className="h-screen w-screen flex flex-col font-sans text-gray-900 bg-gray-100">
      <header className="w-full bg-white border-b border-gray-200 sticky top-0 z-10 h-16 flex-shrink-0">
        <div className="max-w-full mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <svg role="img" viewBox="0 0 24 24" className="h-7 w-7 text-[#FF0000]" xmlns="http://www.w3.org/2000/svg"><title>Adobe</title><path d="M15.1 2H24v20L15.1 2zM8.9 2H0v20L8.9 2zM12 9.4l3.15 7.6L12 17l-3.15-.02.02-7.58z"/></svg>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">Smart Workspace</h1>
          </div>
          <p className="text-lg text-gray-700 font-bold">Changing the world through personalized digital experiences</p>
        </div>
      </header>
      <main className="flex-grow grid grid-cols-12 gap-6 p-6 overflow-hidden">
        <aside ref={leftSidebarRef} className="col-span-3 overflow-y-auto pb-6">
          <div className="space-y-6">
            <Panel title="Past Documents">
              <FileInput onChange={uploadPast} multiple disabled={isProcessingPast} />
              {isProcessingPast && <ProcessingIndicator text="Processing documents..." />}
              {isProcessedPast && <div className="text-sm text-green-600">✓ Documents processed successfully.</div>}
              <div className="overflow-y-auto max-h-60 pr-2 -mr-2">
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
              </div>
            </Panel>
            <Panel title="Current Document">
              <FileInput onChange={uploadCurrent} disabled={isProcessingCurrent} />
              {isProcessingCurrent && <ProcessingIndicator text="Uploading document..." />}
              <div className="overflow-y-auto max-h-60 pr-2 -mr-2">
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
              </div>
            </Panel>
            <Panel title="Persona">
                <div className="flex flex-col items-start gap-2">
                    {persona.profession && persona.task ? (
                        <>
                            <div className="text-sm w-full">
                                <p className="font-semibold truncate">Profession:</p>
                                <p className="text-gray-600 truncate">{persona.profession}</p>
                                <p className="font-semibold mt-2 truncate">Task:</p>
                                <p className="text-gray-600 truncate">{persona.task}</p>
                            </div>
                            <PrimaryButton onClick={() => setIsPersonaModalOpen(true)} className="w-full mt-2">
                                {isProcessingRole ? "Processing..." : "Update Persona"}
                            </PrimaryButton>
                        </>
                    ) : (
                        <PrimaryButton onClick={() => setIsPersonaModalOpen(true)} className="w-full">
                            Set Persona & Task
                        </PrimaryButton>
                    )}
                    {isProcessingRole && !isPersonaModalOpen && <ProcessingIndicator text="Applying persona..." />}
                </div>
            </Panel>
            <Panel title="Persona-Based Sections">
                <div className="space-y-2 overflow-y-auto max-h-72 pr-2 -mr-2">
                {personaSections.length > 0 ? (
                    personaSections.map((s, idx) => (
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
                    <EmptyState message="Results from Persona generation will appear here." />
                )}
                </div>
            </Panel>
          </div>
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
                  title={isPlaying ? "Stop Audio" : "Generate Audio Overview"}
                  isLoading={isLoadingPodcast}
                  disabled={isLoadingInsights}
                >
                  {isPlaying ? "⏹️" : "🎙️"}
                </SecondaryButton>
                <PrimaryButton onClick={handleGetRelevantContentClick}>Get Relevant Sections</PrimaryButton>
              </div>
            </div>
            <div id="adobe-dc-view" className="w-full flex-grow rounded-b-lg bg-gray-50" />
          </div>
        </section>
        <aside ref={rightSidebarRef} className="col-span-4 overflow-y-auto pb-6">
          <div className="space-y-6">
            <Panel title="Relevant Sections">
              <div className="space-y-2 overflow-y-auto max-h-72 pr-2 -mr-2">
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
              <div className="space-y-4 text-sm overflow-y-auto max-h-72 pr-2 -mr-2">
                {insights ? (
                  <>
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
                  </>
                ) : (
                  <EmptyState message="Insights will appear here." />
                )}
              </div>
            </Panel>
            <Panel title="Chatbot">
              <div className="flex flex-col h-96">
                <div ref={chatContainerRef} className="flex-grow space-y-4 overflow-y-auto p-1 pr-2 mb-4">
                  {chatHistory.length > 0 ? (
                    chatHistory.map((msg, idx) => (
                      <div key={idx} className={`flex items-end ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`rounded-lg px-3 py-2 max-w-xs lg:max-w-sm text-sm break-words ${
                            msg.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-800'
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState message="Ask a question about selected text or the document." />
                  )}
                  {isChatting && (
                    <div className="flex justify-start">
                      <div className="bg-gray-200 text-gray-800 rounded-lg px-3 py-2">
                        <span className="animate-pulse">...</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0 border-t border-gray-200 pt-4 mt-auto">
                    <PrimaryButton onClick={() => setIsChatModalOpen(true)} className="w-full" disabled={isChatting}>
                        Ask a Question
                    </PrimaryButton>
                </div>
              </div>
            </Panel>
          </div>
        </aside>
      </main>
      <PersonaModal
        isOpen={isPersonaModalOpen}
        onClose={() => setIsPersonaModalOpen(false)}
        onSubmit={handlePersonaSubmit}
        initialPersona={persona}
        isProcessing={isProcessingRole}
      />
      <ChatModal
        isOpen={isChatModalOpen}
        onClose={() => setIsChatModalOpen(false)}
        onSubmit={handleChatModalSubmit}
        isProcessing={isChatting}
      />
    </div>
  )
}