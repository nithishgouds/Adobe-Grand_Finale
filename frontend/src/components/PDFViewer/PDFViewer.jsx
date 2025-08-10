import React, { useEffect, useRef, useState } from "react";

export default function PDFViewer({ file, persona, job }) {
  const viewerRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [snippets, setSnippets] = useState([]);

  // Placeholder backend call
  const fetchRelevantSections = (page) => {
    console.log("Fetching relevant sections for:", {
      persona,
      job,
      page,
    });

    // Simulate placeholder results
    setSnippets([
      {
        id: 1,
        title: `Relevant Topic for Page ${page}`,
        text: "This is a placeholder snippet. It will be replaced by backend results.",
      },
      {
        id: 2,
        title: "Additional Insight",
        text: "Did you know? This fact will be dynamically generated later.",
      },
    ]);
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

      adobeDCView.previewFile(
        {
          content: { promise: Promise.resolve(arrayBuffer) },
          metaData: { fileName: file.name },
        },
        {
          embedMode: "SIZED_CONTAINER",
          showAnnotationTools: false,
          showLeftHandPanel: false,
          dockPageControls: false,
        }
      );

      adobeDCView.registerCallback(
        window.AdobeDC.View.Enum.CallbackType.PAGE_VIEW,
        (event) => {
          if (event?.data?.pageNumber) {
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
    <div className="bg-white shadow-lg rounded-lg overflow-hidden border border-gray-200 flex">
      {/* PDF Viewer Column */}
      <div className="flex-1 min-w-[70%] flex flex-col">
        <div className="bg-gradient-to-r from-[#1473E6] to-[#0D66D0] p-3 flex justify-between items-center">
          <h2 className="text-white font-semibold text-lg">PDF Viewer</h2>
          <span className="text-sm text-white opacity-90">
            Page {currentPage}
          </span>
        </div>
        <div id="adobe-dc-view" ref={viewerRef} className="w-full h-[600px]" />
      </div>

      {/* Sidebar Column */}
      <div className="w-[30%] bg-gray-50 border-l border-gray-300 p-4 overflow-y-auto">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">
          Relevant Sections
        </h3>
        {snippets.length === 0 ? (
          <p className="text-gray-500 italic">
            No snippets yet — scroll through the PDF to load relevant content.
          </p>
        ) : (
          snippets.map((snippet) => (
            <div
              key={snippet.id}
              className="mb-4 p-3 bg-white rounded shadow-sm border border-gray-200"
            >
              <h4 className="font-bold text-blue-600">{snippet.title}</h4>
              <p className="text-gray-700 text-sm mt-1">{snippet.text}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
