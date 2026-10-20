'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Clock,
  Terminal,
  CheckCircle2,
  Layers,
  Database,
  ArrowRight
} from 'lucide-react';
import { CountercutCase, ToolReceipt } from '@/lib/countercut/types';

interface InvestigationStepPlayerProps {
  activeCase: CountercutCase;
  onJumpToEvidence?: (evidenceId?: string) => void;
}

export default function InvestigationStepPlayer({
  activeCase,
  onJumpToEvidence,
}: InvestigationStepPlayerProps) {
  const receipts = activeCase.toolReceipts || [];
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Auto-play timer (advances step every 2.5 seconds when playing)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && receipts.length > 0) {
      interval = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev < receipts.length - 1) {
            return prev + 1;
          } else {
            setIsPlaying(false);
            return prev;
          }
        });
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isPlaying, receipts.length]);

  if (receipts.length === 0) return null;

  const currentReceipt = receipts[currentStep] || receipts[0];

  const handleNext = () => {
    setCurrentStep((prev) => (prev < receipts.length - 1 ? prev + 1 : 0));
  };

  const handlePrev = () => {
    setCurrentStep((prev) => (prev > 0 ? prev - 1 : receipts.length - 1));
  };

  return (
    <div className="rounded-2xl bg-[#101620] border border-[#2a3547] overflow-hidden shadow-xl text-[#f7f8fb] select-none">
      {/* Player Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-[#2a3547]/60 bg-[#080c12]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#38bdf8]" />
          <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold">
            RECORDED INVESTIGATION TIMELINE
          </span>
          <span className="text-[10px] font-mono text-[#8b98aa]">
            ({receipts.length} verified tool receipts)
          </span>
        </div>

        {/* Step Progress Indicators */}
        <div className="flex items-center gap-1.5">
          {receipts.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setCurrentStep(idx);
                setIsPlaying(false);
              }}
              className={`h-1.5 rounded-full transition-all ${
                idx === currentStep
                  ? 'w-6 bg-cyan-400 shadow-[0_0_6px_#38bdf8]'
                  : idx < currentStep
                  ? 'w-3 bg-cyan-700/60'
                  : 'w-2 bg-white/10 hover:bg-white/20'
              }`}
              title={`Jump to step ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Main Playback Body */}
      <div className="p-5 sm:p-6 space-y-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.15 }}
            className="space-y-3"
          >
            {/* Step Meta Badge & Function Call Name */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/40 text-cyan-300 font-bold">
                  STEP {currentStep + 1} OF {receipts.length}
                </span>
                <span className="text-[#8b98aa]">→</span>
                <span className="text-[#ff6b57] font-bold text-sm">
                  {currentReceipt.toolName}()
                </span>
              </div>

              {/* Execution Latency & Records */}
              <div className="flex items-center gap-3 text-[11px] font-mono text-[#8b98aa]">
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{(currentReceipt as any).recordsReturned ?? currentReceipt.resultCount ?? 0} records</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-[#8b98aa]" />
                  <span>{(currentReceipt as any).latencyMs ?? currentReceipt.durationMs ?? 0}ms</span>
                </span>
              </div>
            </div>

            {/* Code / Argument Receipt Box (Bencho Code Reveal style) */}
            <div className="p-3.5 rounded-xl bg-[#0e0d0c] border border-[#2a3547]/80 font-mono text-xs space-y-2">
              <div className="flex items-center justify-between text-[10px] text-[#8c7f73] uppercase tracking-wider">
                <span>SQL TOOL EXECUTION PAYLOAD</span>
                <span>DATABASE DISPATCH</span>
              </div>
              <div className="text-[#cfc2b6] leading-relaxed break-all">
                <span className="text-[#ff6b57]">{currentReceipt.toolName}</span>
                <span className="text-white">(</span>
                <span className="text-[#8b98aa]">
                  {JSON.stringify((currentReceipt as any).args || {})}
                </span>
                <span className="text-white">)</span>
              </div>
            </div>

            {/* Outcome Explanation */}
            <div className="p-3 rounded-xl bg-[#221f1c] border border-white/5 flex items-start gap-3">
              <Database className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <div className="text-xs text-[#d8dee8] leading-relaxed">
                <span>{currentReceipt.description || `Tool ${currentReceipt.toolName} returned ${currentReceipt.resultCount ?? 0} records.`}</span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Player Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#2a3547]/40">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setCurrentStep(0);
                setIsPlaying(false);
              }}
              className="p-2 rounded-lg bg-[#221f1c] hover:bg-[#2c2825] border border-[#2a3547] text-[#8b98aa] hover:text-white transition-colors"
              title="Restart Timeline"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handlePrev}
              className="p-2 rounded-lg bg-[#221f1c] hover:bg-[#2c2825] border border-[#2a3547] text-[#8b98aa] hover:text-white transition-colors"
              title="Previous Step"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-[#0c1417] font-bold text-xs flex items-center gap-1.5 transition-colors shadow-md"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Replay Steps</span>
                </>
              )}
            </button>
            <button
              onClick={handleNext}
              className="p-2 rounded-lg bg-[#221f1c] hover:bg-[#2c2825] border border-[#2a3547] text-[#8b98aa] hover:text-white transition-colors"
              title="Next Step"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>

          {onJumpToEvidence && (
            <button
              onClick={() => onJumpToEvidence()}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
            >
              <span>Jump to Evidence Rail</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
