import React from "react";

export default function PersonaJobForm({ persona, job, setPersona, setJob }) {
  return (
    <div className="flex flex-col md:flex-row gap-4">
      <input
        type="text"
        placeholder="Enter Persona (e.g., Undergraduate Chemistry Student)"
        value={persona}
        onChange={(e) => setPersona(e.target.value)}
        className="flex-1 px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
      />
      <input
        type="text"
        placeholder="Enter Job to be Done (e.g., Identify key concepts...)"
        value={job}
        onChange={(e) => setJob(e.target.value)}
        className="flex-1 px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}
