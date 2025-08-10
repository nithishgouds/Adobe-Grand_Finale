import React from "react";

export default function PersonaJobForm({ persona, job, setPersona, setJob }) {
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