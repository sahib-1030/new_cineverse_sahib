'use client';

import React, { useEffect, useState } from 'react';
import { X, Play } from 'lucide-react';

interface TrailerModalProps {
  isOpen: boolean;
  onClose: () => void;
  trailerUrl?: string;
  title: string;
}

export default function TrailerModal({ isOpen, onClose, trailerUrl, title }: TrailerModalProps) {
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && trailerUrl) {
      // Very basic YouTube URL parser
      let videoId = '';
      if (trailerUrl.includes('youtube.com/watch?v=')) {
        videoId = trailerUrl.split('v=')[1]?.split('&')[0];
      } else if (trailerUrl.includes('youtu.be/')) {
        videoId = trailerUrl.split('youtu.be/')[1]?.split('?')[0];
      }
      
      if (videoId) {
        setEmbedUrl(`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`);
      }
    }
  }, [isOpen, trailerUrl]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-3xl flex items-center justify-center p-4 sm:p-8 animate-fade-in">
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 p-4 text-gray-500 hover:text-white transition-colors bg-gray-900/50 rounded-full"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="w-full max-w-6xl aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl relative flex items-center justify-center border border-gray-900">
        {!trailerUrl || !embedUrl ? (
          <div className="text-center space-y-4">
            <Play className="w-12 h-12 text-gray-800 mx-auto" />
            <p className="text-gray-500 text-lg">Trailer not available for {title}</p>
          </div>
        ) : (
          <iframe
            src={embedUrl}
            title={`${title} Trailer`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full border-0"
          ></iframe>
        )}
      </div>
    </div>
  );
}
