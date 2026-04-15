
import React from 'react';

export const Header = ({ theme, onToggleTheme }) => {
  const isDark = theme === 'dark';

  return (
    <header className="px-6 py-6 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className={`w-8 h-8 rounded transition-all duration-500 flex items-center justify-center shadow-lg ${
          isDark 
            ? 'bg-indigo-600 shadow-indigo-500/30' 
            : 'bg-amber-600 shadow-amber-500/30'
        }`}>
          <div className="w-3 h-3 bg-white rotate-45" />
        </div>
        <h1 className={`text-xl font-black tracking-tighter transition-colors duration-500 ${
          isDark ? 'text-white' : 'text-slate-900'
        }`}>
          DISCOLORATION<span className={`${isDark ? 'text-indigo-500' : 'text-amber-600'} text-2xl leading-none`}>.</span>
        </h1>
      </div>
      
      <div className="flex items-center">
        <button
          onClick={onToggleTheme}
          className={`flex items-center space-x-2 px-4 py-2 rounded-full border transition-all duration-300 ${
            isDark 
              ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20' 
              : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
          }`}
          aria-label="Toggle Theme"
        >
          {isDark ? (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
              <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">Dark View</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707-.707M14 12a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">Light View</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
