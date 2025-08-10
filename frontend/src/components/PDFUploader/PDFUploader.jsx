import React from "react";

export default function PDFUploader({ uploadedDocs, setUploadedDocs, setSelectedDoc }) {
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setUploadedDocs(files);
    if (files.length > 0) setSelectedDoc(files[0]);
  };

  return (
    <div>
      <label className="block mb-2 font-medium text-gray-700">
        Upload PDF Documents:
      </label>
      <input
        type="file"
        accept="application/pdf"
        multiple
        onChange={handleFileChange}
        className="block w-full text-sm text-gray-500 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none"
      />

      {uploadedDocs.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {uploadedDocs.map((file, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedDoc(file)}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              {file.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
