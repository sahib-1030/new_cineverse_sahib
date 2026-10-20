'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Split,
  SlidersHorizontal,
  Star,
  Quote,
  User,
  Film,
  Sparkles
} from 'lucide-react';
import { CountercutCase } from '@/lib/countercut/types';

interface DraggableSplitViewProps {
  activeCase: CountercutCase;
}

export default function DraggableSplitView({ activeCase }: DraggableSplitViewProps) {
  const [sliderPos, setSliderPos] = useState(50); // percentage 0 - 100
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isOpposite = activeCase.mode === 'opposite_critic';

  // Left Content: Primary Film & Alex Rivera Rating
  const leftTitle = activeCase.primaryMovie?.title || 'Film A';
  const leftRating = activeCase.primaryMovie?.userRating || '10.0';
  const leftSubtitle = 'Alex Rivera (You)';

  // Right Content: Secondary Film or Opposite Critic
  const rightTitle = isOpposite
    ? activeCase.oppositeCritic?.displayName || 'Elena Rostov'
    : activeCase.secondaryMovie?.title || 'Film B';
  const rightRating = isOpposite
    ? activeCase.primaryMovie?.criticRating || '4.0'
    : activeCase.secondaryMovie?.userRating || '4.5';
  const rightSubtitle = isOpposite
    ? `@${activeCase.oppositeCritic?.username || 'elena_r'} (Opposing Critic)`
    : 'Contrasting Rating';

  // Find relevant review quotes for each side from evidence
  const leftEvidence = activeCase.evidence?.find(
    (e) => activeCase.primaryMovie && e.title.toLowerCase().includes(activeCase.primaryMovie.title.toLowerCase())
  );
  const rightEvidence = isOpposite
    ? activeCase.evidence?.find((e) => e.author?.toLowerCase().includes('elena') || (e.rating !== undefined && e.rating < 6))
    : activeCase.evidence?.find(
        (e) => activeCase.secondaryMovie && e.title.toLowerCase().includes(activeCase.secondaryMovie.title.toLowerCase())
      );

  // Mouse / Touch Move Handler
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const clampedPct = Math.min(85, Math.max(15, (x / rect.width) * 100));
    setSliderPos(clampedPct);
  };

  // Keyboard navigation when focused
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setSliderPos((prev) => Math.max(15, prev - 5));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setSliderPos((prev) => Math.min(85, prev + 5));
    }
  };

  return (
    <div className="space-y-3 select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Split className="w-4 h-4 text-[#ff6b57]" />
          <span className="text-xs font-mono uppercase tracking-wider text-[#ff6b57] font-bold">
            INTERACTIVE SPLIT COMPARISON (DRAG TO SCRUB)
          </span>
        </div>

        {/* Quick Position Presets */}
        <div className="flex items-center gap-1.5 text-[11px] font-mono">
          <button
            onClick={() => setSliderPos(25)}
            className={`px-2 py-0.5 rounded transition-colors ${
              sliderPos <= 30 ? 'bg-[#ff6b57] text-[#070a0f] font-bold' : 'text-[#8b98aa] hover:text-white bg-[#221f1c]'
            }`}
          >
            25%
          </button>
          <button
            onClick={() => setSliderPos(50)}
            className={`px-2 py-0.5 rounded transition-colors ${
              sliderPos > 40 && sliderPos < 60 ? 'bg-[#ff6b57] text-[#070a0f] font-bold' : 'text-[#8b98aa] hover:text-white bg-[#221f1c]'
            }`}
          >
            50/50
          </button>
          <button
            onClick={() => setSliderPos(75)}
            className={`px-2 py-0.5 rounded transition-colors ${
              sliderPos >= 70 ? 'bg-[#ff6b57] text-[#070a0f] font-bold' : 'text-[#8b98aa] hover:text-white bg-[#221f1c]'
            }`}
          >
            75%
          </button>
        </div>
      </div>

      {/* Main Draggable Container */}
      <div
        ref={containerRef}
        onPointerDown={() => setIsDragging(true)}
        onPointerUp={() => setIsDragging(false)}
        onPointerLeave={() => setIsDragging(false)}
        onPointerMove={handlePointerMove}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        className="relative h-[220px] sm:h-[240px] rounded-2xl border border-[#2a3547] overflow-hidden shadow-2xl cursor-ew-resize focus:outline-none focus:ring-1 focus:ring-[#ff6b57]"
      >
        {/* RIGHT SIDE LAYER (FULL BACKGROUND) */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1c1815] via-[#161413] to-[#080c12] p-6 flex flex-col justify-between text-right">
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#8b98aa]">
              {rightSubtitle}
            </span>
            <h4 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {rightTitle}
            </h4>
            <div className="text-xl sm:text-2xl font-black text-[#cfc2b6] font-mono">
              ★ {rightRating}
            </div>
          </div>

          {rightEvidence && (
            <p className="text-xs text-[#cfc2b6] italic max-w-sm ml-auto line-clamp-3 leading-relaxed border-r-2 border-[#2a3547] pr-3">
              "{rightEvidence.snippet}"
            </p>
          )}

          <div className="text-[10px] font-mono text-[#8c7f73]">
            {isOpposite ? 'Contrasting Critical Thesis' : 'Divergent Taste Verdict'}
          </div>
        </div>

        {/* LEFT SIDE LAYER (CLIPPED BY SLIDER WIDTH) */}
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-br from-[#261d19] via-[#1e1714] to-[#171311] p-6 flex flex-col justify-between border-r border-[#ff6b57] overflow-hidden"
          style={{ width: `${sliderPos}%` }}
        >
          <div className="space-y-1 min-w-[280px]">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#ff6b57]">
              {leftSubtitle}
            </span>
            <h4 className="text-xl sm:text-2xl font-bold text-white tracking-tight truncate">
              {leftTitle}
            </h4>
            <div className="text-xl sm:text-2xl font-black text-[#ff6b57] font-mono">
              ★ {leftRating}
            </div>
          </div>

          {leftEvidence && (
            <p className="text-xs text-[#f7f8fb] italic min-w-[280px] max-w-sm line-clamp-3 leading-relaxed border-l-2 border-[#ff6b57] pl-3">
              "{leftEvidence.snippet}"
            </p>
          )}

          <div className="text-[10px] font-mono text-[#ff6b57] min-w-[280px]">
            Primary Screening Preference
          </div>
        </div>

        {/* DRAGGABLE DIVIDER LINE & HANDLE */}
        <div
          className="absolute inset-y-0 -ml-3 w-6 flex items-center justify-center pointer-events-none"
          style={{ left: `${sliderPos}%` }}
        >
          <div className="w-6 h-6 rounded-full bg-[#ff6b57] text-[#070a0f] flex items-center justify-center shadow-[0_0_12px_#ff6b57] border-2 border-white pointer-events-auto cursor-ew-resize">
            <span className="text-[10px] font-black">↔</span>
          </div>
        </div>
      </div>
    </div>
  );
}
