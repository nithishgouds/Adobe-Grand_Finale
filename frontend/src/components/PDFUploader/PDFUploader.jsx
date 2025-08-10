import React, { useState } from "react";

export default function PDFUploader({ uploadedDocs, setUploadedDocs, selectedDoc, setSelectedDoc, persona, job }) {
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

    try {
      if (!persona || !job || files.length === 0) {
        alert("Please provide persona, job, and at least one file");
        return;
      }

      const formData = new FormData();
      files.forEach((file) => formData.append("pdfs", file));
      formData.append("persona", persona);
      formData.append("job_to_be_done", job);

      const res = await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      console.log(res);

      // ✅ backend should return processed document info
      setUploadedDocs(data.files || files);
      if (files.length > 0) setSelectedDoc(files[0]);
    } catch (err) {
      console.error(err);
      alert("Error uploading files");
    } finally {
      setIsUploading(false);
    }
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
                  // ✅ FIX: Changed uploadedDocs?.name to selectedDoc?.name
                  file.name === selectedDoc?.name
                    ? 'border-[#1473E6] bg-gradient-to-r from-blue-50 to-indigo-50 shadow-md scale-[1.02]'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                }`}
                onClick={() => setSelectedDoc(file)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 min-w-0 flex-1">
                    {/* PDF Icon with Status */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                      file.name === selectedDoc?.name
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
                        {file.name === selectedDoc?.name && (
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-xs text-green-600 font-medium">Active</span>
                          </div>
                        )}
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

                {/* Selection Indicator */}
                {file.name === selectedDoc?.name && (
                  <div className="absolute top-2 right-2 w-6 h-6 bg-gradient-to-r from-[#1473E6] to-[#9747FF] rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/>
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Upload Statistics */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl border border-slate-200">
            <div className="text-sm text-slate-600">
              <span className="font-semibold">{uploadedDocs.length}</span> document{uploadedDocs.length !== 1 ? 's' : ''} uploaded
              {selectedDoc && (
                <>
                  <span className="mx-2">•</span>
                  <span className="font-medium text-[#1473E6]">{selectedDoc.name}</span> selected
                </>
              )}
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