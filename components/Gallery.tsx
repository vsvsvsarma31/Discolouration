
import React from 'react';
import { RestoredImage } from '../types';

interface Props {
  images: RestoredImage[];
}

export const Gallery: React.FC<Props> = ({ images }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {images.map((img) => (
        <div 
          key={img.id} 
          className="glass rounded-xl overflow-hidden group hover:scale-[1.02] transition-transform shadow-lg"
        >
          <div className="aspect-square relative overflow-hidden">
            <img 
              src={img.currentUrl} 
              alt="Restored artifact" 
              className="w-full h-full object-cover" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
              <span className="text-xs text-indigo-300 font-bold uppercase tracking-wider">Restored Artifact</span>
            </div>
          </div>
          <div className="p-4 border-t border-slate-800">
            <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase font-bold tracking-widest">
              <span>{new Date(img.timestamp).toLocaleDateString()}</span>
              <span className="text-emerald-500">CLEAN</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
