
import React, { useState } from 'react';

interface Props {
  onApply: (instruction: string) => void;
  onCancel: () => void;
  loading: boolean;
}

export const EditorPanel: React.FC<Props> = ({ onApply, onCancel, loading }) => {
  const [instruction, setInstruction] = useState('');

  const suggestions = [
    "Restore natural colors and contrast",
    "Remove artifacts and digital noise",
    "Add a vintage film restoration filter",
    "Fix lighting and shadow inconsistencies",
    "Enhance resolution and clarity"
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (instruction.trim()) {
      onApply(instruction);
    }
  };

  return (
    <div className="glass rounded-2xl p-8 space-y-6 animate-in slide-in-from-right-8 duration-500">
      <div className="space-y-2">
        <h3 className="text-2xl font-bold text-indigo-300">Restoration Engine</h3>
        <p className="text-slate-400">Issue direct commands to the neural reconstruction core.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="e.g. 'Remove the reddish tint from the sky and sharpen the focus on the foreground subjects'"
          className="w-full h-32 bg-slate-900/80 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
        />
        
        <div className="flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setInstruction(s)}
              className="text-xs px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
            >
              + {s}
            </button>
          ))}
        </div>

        <div className="pt-4 flex gap-4">
          <button
            type="submit"
            disabled={loading || !instruction.trim()}
            className="flex-grow py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition-colors font-bold text-lg shadow-xl shadow-indigo-900/20 disabled:opacity-50"
          >
            Execute Command
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-4 rounded-xl border border-slate-700 hover:bg-slate-800 transition-colors font-semibold"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};
