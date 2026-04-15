
import React from 'react';

export const Header = ({ theme, onToggleTheme }) => {
  const isDark = theme === 'dark';
  return (
    <header className="px-6 py-6 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className={`w-8 h-8 rounded flex items-center justify-center ${isDark ? 'bg-indigo-600' : 'bg-amber-600'}`}>
          <div className="w-3 h-3 bg-white rotate-45" />
        </div>
        <h1 className="text-xl font-black tracking-tighter">DISCOLORATION.</h1>
      </div>
      <button onClick={onToggleTheme} className={`px-4 py-2 rounded-full border text-[10px] font-bold uppercase tracking-widest ${isDark ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10' : 'border-amber-200 text-amber-700 bg-amber-50'}`}>
        {isDark ? 'Dark View' : 'Light View'}
      </button>
    </header>
  );
};
