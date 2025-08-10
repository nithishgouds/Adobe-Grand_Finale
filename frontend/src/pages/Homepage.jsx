import React, { useState, useEffect, useRef } from "react";

// PersonaJobForm Component
function PersonaJobForm({ persona, job, setPersona, setJob }) {
  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Persona Input */}
        <div className="group">
          <label className="block text-sm font-semibold text-slate-700 mb-3 flex items-center">
            <div className="w-5 h-5 rounded bg-gradient-to-r from-[#1473E6] to-[#9747FF] mr-2 flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
            Persona
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="e.g., Undergraduate Chemistry Student"
              value={persona}
              onChange={(e) => setPersona(e.target.value)}
              className="w-full px-6 py-4 bg-gradient-to-r from-white to-slate-50 border-2 border-slate-200 rounded-xl 
                         focus:border-transparent focus:ring-4 focus:ring-blue-500/20 
                         focus:bg-white transition-all duration-300 text-slate-800 font-medium
                         placeholder:text-slate-400 hover:border-slate-300 hover:shadow-md
                         shadow-sm group-hover:shadow-lg"
            />
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#1473E6]/5 to-[#9747FF]/5 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
          </div>
          <p className="mt-2 text-xs text-slate-500 font-medium">
            Define who will be using this document
          </p>
        </div>

        {/* Job Input */}
        <div className="group">
          <label className="block text-sm font-semibold text-slate-700 mb-3 flex items-center">
            <div className="w-5 h-5 rounded bg-gradient-to-r from-[#FF6B35] to-[#F7931E] mr-2 flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
              </svg>
            </div>
            Job to be Done
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="e.g., Identify key concepts for exam preparation"
              value={job}
              onChange={(e) => setJob(e.target.value)}
              className="w-full px-6 py-4 bg-gradient-to-r from-white to-slate-50 border-2 border-slate-200 rounded-xl 
                         focus:border-transparent focus:ring-4 focus:ring-orange-500/20 
                         focus:bg-white transition-all duration-300 text-slate-800 font-medium
                         placeholder:text-slate-400 hover:border-slate-300 hover:shadow-md
                         shadow-sm group-hover:shadow-lg"
            />
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-[#FF6B35]/5 to-[#F7931E]/5 opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
          </div>
          <p className="mt-2 text-xs text-slate-500 font-medium">
            Specify the task or goal to accomplish
          </p>
        </div>
      </div>

      {/* Status Indicator */}
      <div className="flex items-center justify-center mt-6">
        <div className="flex items-center space-x-4">
          <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
            persona ? 'bg-gradient-to-r from-[#1473E6] to-[#9747FF] shadow-md' : 'bg-slate-300'
          }`}></div>
          <div className="text-sm font-medium text-slate-600">Context Configuration</div>
          <div className={`w-3 h-3 rounded-full transition-all duration-300 ${
            job ? 'bg-gradient-to-r from-[#FF6B35] to-[#F7931E] shadow-md' : 'bg-slate-300'
          }`}></div>
        </div>
      </div>

      {/* Quick Suggestions */}
      {(!persona || !job) && (
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
          <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center">
            <svg className="w-4 h-4 text-blue-600 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
            Quick Suggestions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="text-xs">
              <span className="font-medium text-blue-700">Personas:</span>
              <div className="text-slate-600 mt-1 space-y-1">
                <div>• Graduate Research Student</div>
                <div>• Business Analyst</div>
                <div>• Legal Professional</div>
              </div>
            </div>
            <div className="text-xs">
              <span className="font-medium text-orange-700">Jobs:</span>
              <div className="text-slate-600 mt-1 space-y-1">
                <div>• Extract key insights</div>
                <div>• Summarize main points</div>
                <div>• Find specific information</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// PDFUploader Component
function PDFUploader({ uploadedDocs, setUploadedDocs, setSelectedDoc }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    await processFiles(files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files).filter(
      file => file.type === 'application/pdf'
    );
    await processFiles(files);
  };

  const processFiles = async (files) => {
    if (files.length === 0) return;
    
    setIsUploading(true);
    
    // Simulate upload processing
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    setUploadedDocs(files);
    if (files.length > 0) setSelectedDoc(files[0]);
    setIsUploading(false);
  };

  const removeFile = (indexToRemove) => {
    const newDocs = uploadedDocs.filter((_, index) => index !== indexToRemove);
    setUploadedDocs(newDocs);
    
    // If removed file was selected, select the first remaining file or null
    if (newDocs.length > 0) {
      setSelectedDoc(newDocs[0]);
    } else {
      setSelectedDoc(null);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-2xl transition-all duration-300 ${
          isDragOver
            ? 'border-[#1473E6] bg-gradient-to-br from-blue-50 to-indigo-50 scale-[1.02]'
            : isUploading
            ? 'border-[#9747FF] bg-gradient-to-br from-purple-50 to-pink-50'
            : 'border-slate-300 bg-gradient-to-br from-white to-slate-50 hover:border-slate-400 hover:bg-slate-50'
        } p-8 text-center cursor-pointer group`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById('pdf-upload').click()}
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 rounded-2xl opacity-5">
          <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(59,130,246,0.1)_25%,rgba(59,130,246,0.1)_50%,transparent_50%,transparent_75%,rgba(59,130,246,0.1)_75%)] bg-[length:30px_30px]"></div>
        </div>

        <div className="relative z-10">
          {isUploading ? (
            // Upload Loading State
            <div className="space-y-4">
              <div className="w-20 h-20 mx-auto relative">
                <div className="absolute inset-0 bg-gradient-to-r from-[#9747FF] to-[#1473E6] rounded-full animate-spin opacity-20"></div>
                <div className="absolute inset-2 bg-gradient-to-r from-[#9747FF] to-[#1473E6] rounded-full animate-pulse flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-bold text-slate-800">Processing PDFs...</h3>
              <p className="text-slate-600">Analyzing and preparing your documents</p>
            </div>
          ) : (
            // Default Upload State
            <div className="space-y-4">
              <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center transition-all duration-300 ${
                isDragOver 
                  ? 'bg-gradient-to-r from-[#1473E6] to-[#9747FF] scale-110 shadow-xl' 
                  : 'bg-gradient-to-r from-[#FF6B35] to-[#F7931E] group-hover:scale-110 group-hover:shadow-xl'
              }`}>
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              
              <div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">
                  {isDragOver ? 'Drop your PDFs here!' : 'Upload PDF Documents'}
                </h3>
                <p className="text-slate-600 mb-4">
                  {isDragOver 
                    ? 'Release to upload your documents' 
                    : 'Drag & drop your PDF files here, or click to browse'
                  }
                </p>
                
                <div className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-[#1473E6] to-[#9747FF] text-white font-semibold rounded-xl hover:shadow-lg transition-all duration-300 hover:scale-105">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Choose Files
                </div>
              </div>
              
              <div className="text-xs text-slate-500 space-y-1">
                <div>Supported format: PDF only</div>
                <div>Maximum size: 50MB per file</div>
              </div>
            </div>
          )}
        </div>

        {/* Hidden File Input */}
        <input
          id="pdf-upload"
          type="file"
          accept="application/pdf"
          multiple
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Uploaded Files List */}
      {uploadedDocs.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center">
              <svg className="w-5 h-5 mr-2 text-slate-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
              </svg>
              Uploaded Documents ({uploadedDocs.length})
            </h3>
            <div className="text-sm text-slate-500">
              Click to view • Right-click for options
            </div>
          </div>

          <div className="grid gap-3">
            {uploadedDocs.map((file, idx) => (
              <div
                key={idx}
                className={`group relative p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer ${
                  file.name === setSelectedDoc?.name
                    ? 'border-[#1473E6] bg-gradient-to-r from-blue-50 to-indigo-50 shadow-md scale-[1.02]'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                }`}
                onClick={() => setSelectedDoc(file)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 min-w-0 flex-1">
                    {/* PDF Icon with Status */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                      file.name === setSelectedDoc?.name
                        ? 'bg-gradient-to-r from-[#1473E6] to-[#9747FF]'
                        : 'bg-gradient-to-r from-[#FF6B35] to-[#F7931E] group-hover:scale-110'
                    }`}>
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                      </svg>
                    </div>

                    {/* File Info */}
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-slate-800 truncate group-hover:text-[#1473E6] transition-colors">
                        {file.name}
                      </h4>
                      <div className="flex items-center space-x-3 mt-1">
                        <span className="text-sm text-slate-500">{formatFileSize(file.size)}</span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-sm text-slate-500">PDF Document</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDoc(file);
                      }}
                      className="p-2 text-slate-400 hover:text-[#1473E6] hover:bg-blue-50 rounded-lg transition-all duration-200"
                      title="View Document"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(idx);
                      }}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200"
                      title="Remove Document"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Upload Statistics */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl border border-slate-200">
            <div className="text-sm text-slate-600">
              <span className="font-semibold">{uploadedDocs.length}</span> document{uploadedDocs.length !== 1 ? 's' : ''} uploaded
            </div>
            
            <button
              onClick={() => {
                setUploadedDocs([]);
                setSelectedDoc(null);
              }}
              className="text-sm text-slate-500 hover:text-red-500 font-medium transition-colors duration-200 flex items-center space-x-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Clear All</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// PDFViewer Component
function PDFViewer({ file, persona, job }) {
  const viewerRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Placeholder for backend call with enhanced UX
  const fetchRelevantSections = (page) => {
    setIsAnalyzing(true);
    console.log("Fetching relevant sections for:", {
      persona,
      job,
      page
    });
    
    // Simulate API call with loading state
    setTimeout(() => {
      setIsAnalyzing(false);
    }, 1500);
    
    // TODO: Replace with actual backend API call
  };

  useEffect(() => {
    if (!file) return;

    // Since we can't use Adobe SDK in this environment, we'll show a placeholder
    const simulatePageChange = () => {
      const newPage = Math.floor(Math.random() * 10) + 1;
      setCurrentPage(newPage);
      fetchRelevantSections(newPage);
    };

    // Simulate page changes every 10 seconds
    const interval = setInterval(simulatePageChange, 10000);

    return () => clearInterval(interval);
  }, [file, persona, job]);

  return (
    <div className="bg-white shadow-2xl rounded-2xl overflow-hidden border border-slate-200">
      {/* Premium Header with Adobe-style branding */}
      <div className="relative bg-gradient-to-r from-[#1473E6] via-[#0D66D0] to-[#9747FF] p-6">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_25%,rgba(255,255,255,0.1)_50%,transparent_50%,transparent_75%,rgba(255,255,255,0.1)_75%)] bg-[length:20px_20px]"></div>
        </div>
        
        <div className="relative flex justify-between items-center">
          <div className="flex items-center space-x-4">
            {/* PDF Icon */}
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20,8H17V6a2,2,0,0,0-2-2H9A2,2,0,0,0,7,6V8H4a2,2,0,0,0-2,2V18a2,2,0,0,0,2,2H20a2,2,0,0,0,2-2V10A2,2,0,0,0,20,8ZM9,6h6V8H9Zm7,12a1,1,0,0,1-1,1H9a1,1,0,0,1-1-1V14a1,1,0,0,1,1-1h6a1,1,0,0,1,1,1Z"/>
              </svg>
            </div>
            
            <div>
              <h2 className="text-white font-bold text-xl flex items-center">
                PDF Intelligent Viewer
                <div className="ml-3 px-3 py-1 bg-white/20 rounded-full text-sm font-medium">
                  Adobe Powered
                </div>
              </h2>
              <p className="text-white/80 text-sm font-medium mt-1">
                {file?.name || 'Document Viewer'}
              </p>
            </div>
          </div>
          
          {/* Status Panel */}
          <div className="text-right">
            <div className="flex items-center space-x-3 mb-2">
              <div className="text-white/90 text-sm font-medium">
                Page {currentPage}
              </div>
              {isAnalyzing && (
                <div className="flex items-center space-x-2 bg-white/20 px-3 py-1 rounded-full">
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
                  <span className="text-white text-xs font-medium">Analyzing</span>
                </div>
              )}
            </div>
            
            {/* Context Indicators */}
            <div className="flex space-x-2">
              {persona && (
                <div className="bg-white/20 px-3 py-1 rounded-full text-xs text-white font-medium">
                  👤 {persona.split(' ').slice(0, 2).join(' ')}
                </div>
              )}
              {job && (
                <div className="bg-white/20 px-3 py-1 rounded-full text-xs text-white font-medium">
                  🎯 Active
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20">
          <div className="h-full bg-gradient-to-r from-white to-white/80 transition-all duration-300" 
               style={{ width: `${(currentPage / 10) * 100}%` }}></div>
        </div>
      </div>

      {/* Viewer Container */}
      <div className="relative">
        {/* PDF Preview Area - Since we can't embed Adobe SDK, show a placeholder */}
        <div className="w-full h-[700px] bg-gradient-to-br from-slate-50 to-white flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-24 h-24 mx-auto bg-gradient-to-r from-[#1473E6] to-[#9747FF] rounded-2xl flex items-center justify-center">
              <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-800">PDF Viewer Ready</h3>
            <p className="text-slate-600 max-w-md">
              In a production environment, this would display the PDF using Adobe's PDF Embed API.
              The viewer would show: {file?.name || 'your document'}
            </p>
            <div className="flex items-center justify-center space-x-4 mt-6">
              <div className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm font-medium">
                Persona: {persona || 'Not set'}
              </div>
              <div className="px-4 py-2 bg-orange-100 text-orange-800 rounded-lg text-sm font-medium">
                Job: {job || 'Not set'}
              </div>
            </div>
          </div>
        </div>
        
        {/* Analysis Overlay */}
        {isAnalyzing && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 relative">
                <div className="absolute inset-0 bg-gradient-to-r from-[#1473E6] to-[#9747FF] rounded-full animate-spin opacity-20"></div>
                <div className="absolute inset-2 bg-gradient-to-r from-[#1473E6] to-[#9747FF] rounded-full animate-pulse"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Analyzing Content</h3>
              <p className="text-slate-600 text-sm">
                Processing page {currentPage} for {persona ? 'personalized' : 'general'} insights...
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer with Context Summary */}
      <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-6 py-4 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-sm text-slate-600">
              <span className="font-semibold">Active Context:</span>
            </div>
            {persona && (
              <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                {persona}
              </div>
            )}
            {job && (
              <div className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                {job.length > 30 ? job.substring(0, 30) + '...' : job}
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
            </svg>
            <span>Powered by Adobe PDF Embed API</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main App Component
export default function HomePage() {
  const [persona, setPersona] = useState("");
  const [job, setJob] = useState("");
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Adobe-style background pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(59,130,246,0.03)_25%,rgba(59,130,246,0.03)_50%,transparent_50%,transparent_75%,rgba(59,130,246,0.03)_75%)] bg-[length:40px_40px]"></div>
      
      <div className="relative z-10 max-w-7xl mx-auto p-8 space-y-8">
        {/* Premium Header with Adobe Gradient */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-r from-[#FF0000] via-[#FF6B35] to-[#F7931E] mb-6 shadow-xl">
            <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
            </svg>
          </div>
          
          <h1 className="text-5xl font-bold bg-gradient-to-r from-[#1473E6] via-[#9747FF] to-[#FF6B35] bg-clip-text text-transparent mb-4">
            Adobe Hackathon Final
          </h1>
          <p className="text-xl text-slate-600 font-medium">
            Intelligent PDF Explorer
          </p>
          <div className="w-24 h-1 bg-gradient-to-r from-[#FF0000] to-[#F7931E] mx-auto mt-4 rounded-full"></div>
        </div>

        {/* Persona & Job Form - Premium Container */}
        <div className="group">
          <div className="bg-white/80 backdrop-blur-xl p-8 rounded-2xl shadow-2xl border border-white/20 hover:shadow-3xl transition-all duration-500 hover:scale-[1.02]">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-[#1473E6] to-[#9747FF] flex items-center justify-center mr-4 shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Define Your Context</h2>
            </div>
            <PersonaJobForm
              persona={persona}
              job={job}
              setPersona={setPersona}
              setJob={setJob}
            />
          </div>
        </div>

        {/* PDF Uploader - Premium Container */}
        <div className="group">
          <div className="bg-white/80 backdrop-blur-xl p-8 rounded-2xl shadow-2xl border border-white/20 hover:shadow-3xl transition-all duration-500 hover:scale-[1.02]">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-[#FF6B35] to-[#F7931E] flex items-center justify-center mr-4 shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-800">Upload Documents</h2>
            </div>
            <PDFUploader
              uploadedDocs={uploadedDocs}
              setUploadedDocs={setUploadedDocs}
              setSelectedDoc={setSelectedDoc}
            />
          </div>
        </div>

        {/* PDF Viewer - Premium Container */}
        {selectedDoc && (
          <div className="group animate-fadeIn">
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/30 overflow-hidden hover:shadow-3xl transition-all duration-500">
              <div className="bg-gradient-to-r from-[#1473E6] via-[#9747FF] to-[#FF6B35] p-1">
                <div className="bg-white/95 backdrop-blur-sm rounded-2xl overflow-hidden">
                  <PDFViewer file={selectedDoc} persona={persona} job={job} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Floating Action Indicators */}
        <div className="fixed bottom-8 right-8 flex flex-col space-y-3">
          <div className="w-12 h-12 bg-gradient-to-r from-[#1473E6] to-[#9747FF] rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform cursor-pointer">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>
      
      {/* Tailwind Test Indicator */}
      <div className="bg-red-500 text-white p-4 text-center font-bold">
        TAILWIND TEST - If this is red, it's working!
      </div>
    </div>
  );
}