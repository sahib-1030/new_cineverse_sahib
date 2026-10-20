'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Star, X, Check, AlertCircle, LogIn, GitBranch } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

interface RatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  movieId: number;
  movieTitle: string;
  onSuccess: () => void;
}

export default function RatingModal({ isOpen, onClose, movieId, movieTitle, onSuccess }: RatingModalProps) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [containsSpoilers, setContainsSpoilers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedTraceId, setSavedTraceId] = useState<number | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movieId,
          rating,
          reviewText: reviewText.trim(),
          hasSpoilers: containsSpoilers,
          userId: user?.user_id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save review');
      }

      setSavedTraceId(data.traceId || null);
      setShowSuccess(true);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'An error occurred while logging your rating');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseClean = () => {
    setShowSuccess(false);
    setSavedTraceId(null);
    setRating(0);
    setReviewText('');
    setContainsSpoilers(false);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-[#1f1c1a] border border-[#2a3547] rounded-2xl shadow-2xl overflow-hidden">

        {showSuccess ? (
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-14 h-14 bg-[#ff6b57]/20 border border-[#ff6b57] rounded-full flex items-center justify-center">
              <Check className="w-7 h-7 text-[#ff6b57]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Review Committed</h3>
              <p className="text-xs text-[#8b98aa] mt-1">
                PostgreSQL triggers executed: average rating recalculated and audit provenance captured.
              </p>
            </div>

            <div className="w-full pt-2 space-y-2">
              <Link
                href={`/trace?movieId=${movieId}${savedTraceId ? `&traceId=${savedTraceId}` : ''}`}
                onClick={handleCloseClean}
                className="w-full py-2.5 px-4 rounded-xl bg-[#ff6b57] hover:bg-[#e07f69] text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>Trace this mutation in CineTrace →</span>
              </Link>

              <button
                type="button"
                onClick={handleCloseClean}
                className="w-full py-2 px-4 rounded-xl border border-white/10 hover:bg-white/[0.04] text-xs text-[#9aa7b9] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        ) : !user ? (
          <div className="p-8 text-center space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h2 className="text-base font-bold text-white tracking-tight">Sign In Required</h2>
              <button onClick={onClose} className="p-2 text-[#8d99aa] hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-[#8b98aa]">
              You must be signed in to rate or review <span className="text-white font-medium">"{movieTitle}"</span>.
            </p>
            <div className="pt-2 flex flex-col gap-2">
              <Link
                href="/login"
                onClick={onClose}
                className="w-full py-3 bg-[#f7f8fb] hover:bg-white text-[#080b11] font-bold rounded-xl transition-colors flex items-center justify-center gap-2 text-xs"
              >
                <LogIn className="w-4 h-4" /> Sign In to Continue
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="text-xs text-[#8d99aa] hover:text-white py-1 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">Rate &amp; Review</h2>
                <p className="text-xs text-[#8d99aa] truncate max-w-[280px]">{movieTitle}</p>
              </div>
              <button onClick={onClose} className="p-2 text-[#8d99aa] hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {error && (
                <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <div className="text-xs font-semibold text-[#8d99aa] mb-2 uppercase tracking-wider">Score (1-10)</div>
                <div
                  className="flex items-center gap-1"
                  onMouseLeave={() => setHoveredRating(0)}
                >
                  {Array.from({ length: 10 }).map((_, i) => {
                    const starValue = i + 1;
                    return (
                      <button
                        key={i}
                        type="button"
                        className="p-0.5 focus:outline-none transition-transform hover:scale-110"
                        onMouseEnter={() => setHoveredRating(starValue)}
                        onClick={() => setRating(starValue)}
                      >
                        <Star
                          className={`w-5 h-5 ${
                            starValue <= (hoveredRating || rating)
                              ? 'fill-[#ff6b57] text-[#ff6b57]'
                              : 'text-[#4e4039]'
                          }`}
                        />
                      </button>
                    );
                  })}
                  <span className="ml-3 text-base font-bold text-white w-8">
                    {hoveredRating || rating || 0}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#8d99aa] block mb-1.5 uppercase tracking-wider">
                  Review (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Share your thoughts on the narrative, direction, or performance..."
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#0a0f16] border border-[#58463c] rounded-xl text-xs text-white placeholder-[#7f7360] focus:outline-none focus:border-[#ff6b57] transition-colors resize-none"
                />
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setContainsSpoilers(!containsSpoilers)}
                  className={`w-4 h-4 rounded flex items-center justify-center border ${
                    containsSpoilers ? 'bg-[#ff6b57] border-[#ff6b57]' : 'bg-transparent border-[#58463c]'
                  }`}
                >
                  {containsSpoilers && <Check className="w-3 h-3 text-white" />}
                </button>
                <span className="text-xs text-[#8d99aa]">Contains spoilers</span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || rating === 0}
                className="w-full py-3 bg-[#f7f8fb] hover:bg-white text-[#080b11] font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs"
              >
                {isSubmitting ? 'Committing to PostgreSQL...' : 'Submit Review'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
