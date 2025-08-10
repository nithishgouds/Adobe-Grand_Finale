import React, { useState } from "react";
import HomePage from "./pages/Homepage";

export default function App() {
  const [persona, setPersona] = useState("");
  const [job, setJob] = useState("");

  return (
    <div className="min-h-screen bg-gray-100">
      <HomePage persona={persona} job={job} setPersona={setPersona} setJob={setJob} />
    </div>
  );
}