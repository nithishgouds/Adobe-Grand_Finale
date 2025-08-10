import React, { useState } from "react";
import PDFUploader from "../components/PDFUploader/PDFUploader";
import PersonaJobForm from "../components/PersonaJobForm/PersonaJobForm";
import PDFViewer from "../components/PDFViewer/PDFViewer";

export default function HomePage() {
  const [persona, setPersona] = useState("");
  const [job, setJob] = useState("");
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold text-blue-600">
        Adobe Hackathon Final – Intelligent PDF Explorer
      </h1>

      {/* Persona & Job Form */}
      <div className="bg-white p-4 rounded-lg shadow">
        <PersonaJobForm
          persona={persona}
          job={job}
          setPersona={setPersona}
          setJob={setJob}
        />
      </div>

      {/* PDF Uploader */}
      <div className="bg-white p-4 rounded-lg shadow">
        <PDFUploader
          uploadedDocs={uploadedDocs}
          setUploadedDocs={setUploadedDocs}
          setSelectedDoc={setSelectedDoc}
        />
      </div>

      {/* PDF Viewer */}
      {selectedDoc && (
        <div className="bg-white rounded-lg shadow p-2">
          <PDFViewer file={selectedDoc} persona={persona} job={job} />
        </div>
      )}
    </div>
  );
}
