'use client';

import { X } from 'lucide-react';

export default function VideoPlayer({ videoUrl, onClose }: { videoUrl: string, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative w-full max-w-4xl bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl scale-in-center">
        
        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-950">
          <h3 className="text-lg font-medium text-white">Candidate Introduction</h3>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="aspect-video bg-black flex items-center justify-center">
          <video 
            src={videoUrl} 
            controls 
            autoPlay 
            className="w-full h-full object-contain"
          >
            Your browser does not support the video tag.
          </video>
        </div>
      </div>
    </div>
  );
}
