import React, { useState } from "react";
import AdobeSmartApp from "./pages/Homepage";

export default function App() {
  const [persona, setPersona] = useState("");
  const [job, setJob] = useState("");

  return (
    <div className="min-h-screen bg-gray-100">
      <AdobeSmartApp/>
    </div>
  );
}