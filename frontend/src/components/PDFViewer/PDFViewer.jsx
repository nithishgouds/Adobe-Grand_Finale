import React, { useEffect, useRef, useState } from "react";

export default function PDFViewer({ file, persona, job }) {
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

    const initAdobeViewer = async () => {
      if (!window.AdobeDC) return;

      const adobeDCView = new window.AdobeDC.View({
        clientId: import.meta.env.VITE_ADOBE_EMBED_API_KEY,
        divId: "adobe-dc-view",
      });

      const arrayBuffer = await file.arrayBuffer();

      const previewConfig = {
        embedMode: "SIZED_CONTAINER",
        showAnnotationTools: false,
        showLeftHandPanel: false,
        dockPageControls: false,
      };

      adobeDCView.previewFile(
        {
          content: { promise: Promise.resolve(arrayBuffer) },
          metaData: { fileName: file.name },
        },
        previewConfig
      );

      // Register event listener for page changes
      adobeDCView.registerCallback(
        window.AdobeDC.View.Enum.CallbackType.PAGE_VIEW,
        (event) => {
          if (event && event.data && event.data.pageNumber) {
            const newPage = event.data.pageNumber;
            setCurrentPage(newPage);
            fetchRelevantSections(newPage);
          }
        },
        {}
      );
    };

    if (window.AdobeDC) {
      initAdobeViewer();
    } else {
      document.addEventListener("adobe_dc_view_sdk.ready", initAdobeViewer);
    }

    return () => {
      document.removeEventListener("adobe_dc_view_sdk.ready", initAdobeViewer);
    };
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
        {/* Adobe PDF Embed API container */}
        <div
          id="adobe-dc-view"
          ref={viewerRef}
          className="w-full h-[700px] bg-gradient-to-br from-slate-50 to-white"
        />
        
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