'use client';

import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export default function ErrorMessage({
  title = 'Something went wrong',
  message,
  onRetry,
  className = '',
}: ErrorMessageProps) {
  return (
    <div
      className={`rounded-2xl bg-rose-500/10 border border-rose-500/20 p-6 text-center max-w-lg mx-auto space-y-3 animate-fade-in ${className}`}
    >
      <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
        <AlertCircle className="w-5 h-5" />
      </div>
      <h3 className="text-sm font-bold text-white tracking-tight">{title}</h3>
      <p className="text-xs text-rose-300 leading-relaxed font-mono">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-gray-200 text-black text-xs font-semibold transition-colors mt-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Try Again</span>
        </button>
      )}
    </div>
  );
}
