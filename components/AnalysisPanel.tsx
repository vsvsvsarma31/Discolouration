
import React from 'react';

interface Props {
  analysis: string;
  onProceed: () => void;
  onBack: () => void;
}

export const AnalysisPanel: React.FC<Props> = ({ analysis, onProceed, onBack }) => {
  // Simple markdown-ish bolding for points
  const formattedAnalysis = analysis.split('\n').map((line, i) => {
    if (line.trim().startsWith('-') || line.trim().startsWith('*')) {
      return <li key={i} className="mb-2 ml-4 list-disc">{line.replace(/^[-*]\s*/, '')}</li>;
    }
    return <p key={i} className="mb-4">{line}</p>;
  });

  return (
    <div className="glass rounded-2xl p-8 space-y-6 animate-in slide-in-from-right-8 duration-500">
      <div className="flex items-center space-x-3 text-emerald-400 mb-2">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="text-2xl font-bold">Analysis Complete</h3>
      </div>
      
      <div className="prose prose-invert text-slate-300 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {formattedAnalysis}
      </div>

      <div className="pt-6 space-y-3">
        <button 
          onClick={onProceed}
          className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition-colors font-bold text-lg shadow-xl shadow-indigo-900/20"
        >
          Begin Restoration (Edit)
        </button>
        <button 
          onClick={onBack}
          className="w-full py-4 rounded-xl text-slate-400 hover:text-white transition-colors font-medium"
        >
          Back to Scan
        </button>
      </div>
    </div>
  );
};
