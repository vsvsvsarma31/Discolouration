
import React, { useRef } from 'react';

interface Props {
  onUpload: (url: string) => void;
}

export const ImageUploader: React.FC<Props> = ({ onUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          onUpload(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div 
      onClick={() => fileInputRef.current?.click()}
      className="w-full max-w-md p-10 border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-3xl cursor-pointer transition-all bg-slate-900/50 flex flex-col items-center justify-center space-y-4 group"
    >
      <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-indigo-900/30 transition-colors">
        <svg className="w-8 h-8 text-slate-400 group-hover:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-lg font-semibold text-slate-200">Initiate Restoration</p>
        <p className="text-sm text-slate-500">Select a corrupted artifact (PNG, JPG)</p>
      </div>
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
        accept="image/*"
      />
    </div>
  );
};
