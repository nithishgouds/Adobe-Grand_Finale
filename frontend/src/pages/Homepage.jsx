import React, { useState } from "react";
// ✅ FIX: Corrected the casing in the import path to match the component file name.
import PDFUploader from "../components/PDFUploader/PDFuploader";
import PersonaJobForm from "../components/PersonaJobForm/PersonaJobForm";
import PDFViewer from "../components/PDFViewer/PDFViewer";

export default function HomePage() {
  const [persona, setPersona] = useState("");
  const [job, setJob] = useState("");
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [setupDone, setIsLoading] = useState(false);

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
              selectedDoc={selectedDoc}
              setSelectedDoc={setSelectedDoc}
              persona={persona}      
              job={job}         
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
    </div>
  );
}
