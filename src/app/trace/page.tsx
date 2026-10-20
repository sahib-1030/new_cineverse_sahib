'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  GitBranch,
  Database,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Terminal,
  RefreshCw,
  Star,
  ExternalLink,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Eye,
  Code2
} from 'lucide-react';
import { ActionTrace, TraceStep } from '@/lib/trace';
import { useAuth } from '@/lib/AuthContext';

const FRIENDLY_STEP_TITLES = ['Review saved', 'Rating recalculated', 'Activity decision', 'Ranking refreshed'] as const;

export default function CineTracePage() {
  const searchParams = useSearchParams();
  const initialMovieId = searchParams.get('movieId') || '1'; // Default Inception (1)
  const initialTraceId = searchParams.get('traceId');

  const { user } = useAuth();
  const [trace, setTrace] = useState<ActionTrace | null>(null);
  const [movieId, setMovieId] = useState<string>(initialMovieId);
  const [rating, setRating] = useState<number>(9.5);
  const [reviewText, setReviewText] = useState<string>('Masterpiece of narrative structure and practical cinematography.');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [moviesList, setMoviesList] = useState<any[]>([]);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [expandedStepIdx, setExpandedStepIdx] = useState<number | null>(null);
  const [showRawJson, setShowRawJson] = useState<boolean>(false);

  // Auto-advance player for replay (read-only in-memory stepping across recorded snapshots)
  useEffect(() => {
    if (!isPlaying || !trace?.steps || trace.steps.length === 0) return;
    const timer = setInterval(() => {
      setActiveStepIndex((prev) => {
        if (prev >= trace.steps.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 2000);
    return () => clearInterval(timer);
  }, [isPlaying, trace?.steps]);

  const handleStepBack = () => {
    setIsPlaying(false);
    setActiveStepIndex((prev) => Math.max(0, prev - 1));
  };

  const handleStepForward = () => {
    setIsPlaying(false);
    if (trace?.steps) {
      setActiveStepIndex((prev) => Math.min(trace.steps.length - 1, prev + 1));
    }
  };

  const handleResetReplay = () => {
    setIsPlaying(false);
    setActiveStepIndex(0);
  };

  const handleTogglePlay = () => {
    if (!trace?.steps || trace.steps.length === 0) return;
    if (activeStepIndex >= trace.steps.length - 1) {
      setActiveStepIndex(0);
    }
    setIsPlaying(!isPlaying);
  };

  // Load existing traces and movie metadata
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        // Load movies list for quick selector
        const moviesRes = await fetch('/api/movies?limit=15');
        const moviesData = await moviesRes.json();
        if (moviesData.movies) {
          setMoviesList(moviesData.movies);
        }

        // Fetch trace
        let traceUrl = '/api/dbms/trace';
        if (initialTraceId) {
          traceUrl += `?traceId=${initialTraceId}`;
        } else if (initialMovieId) {
          traceUrl += `?movieId=${initialMovieId}`;
        }

        const traceRes = await fetch(traceUrl);
        const traceData = await traceRes.json();
        if (traceData.trace) {
          setTrace(traceData.trace);
          setMovieId(String(traceData.trace.target_id));
          setActiveStepIndex(0);
        }
      } catch (err) {
        console.error('Failed to load trace:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, [initialMovieId, initialTraceId]);

  // Handle live mutation trace execution
  const handleCaptureTrace = async () => {
    setIsSubmitting(true);
    setFeedbackMessage(null);
    try {
      const res = await fetch('/api/dbms/trace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movieId: parseInt(movieId, 10),
          rating: Number(rating),
          reviewText,
          userId: user?.user_id,
        }),
      });

      const data = await res.json();
      if (data.trace) {
        setTrace(data.trace);
        setActiveStepIndex(0);
        setIsPlaying(false);
        setFeedbackMessage(`Mutation executed! Operation: ${data.trace.mutation_op}. ${data.trace.steps.length} database steps captured.`);
      } else if (data.error) {
        setFeedbackMessage(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setFeedbackMessage(`Execution failed: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedMovie = moviesList.find(m => String(m.movie_id) === String(movieId)) || {
    movie_id: movieId,
    title: trace?.movie_title || 'Inception',
    poster_url: trace?.movie_poster || 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEhniE9iAOhHP.jpg',
    director: 'Christopher Nolan',
    release_date: '2010-07-16',
    avg_rating: trace?.final_score || '9.6',
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-xs font-mono tracking-widest uppercase text-[#8d99aa] animate-pulse">
          Loading CineTrace provenance...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in text-[#f7f8fb]">
      {/* Top Breadcrumb & Status */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 text-xs text-[#95a2b5]">
        <div className="flex items-center gap-2">
          <strong className="text-white font-bold">{selectedMovie.title}</strong>
          <span className="opacity-40">/</span>
          <span>Reviews</span>
          <span className="opacity-40">/</span>
          <span className="text-[#ff6b57] font-semibold">CineTrace</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="border border-emerald-400/25 text-emerald-300 bg-emerald-400/[0.06] rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.12em] font-bold">
            LIVE POSTGRES
          </span>
        </div>
      </div>

      {/* Main Headline */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h1 className="text-[32px] sm:text-[40px] font-black text-[#f7f8fb] tracking-[-0.055em] leading-none m-0">
            Watch one rating ripple through the stack.
          </h1>
          <p className="text-sm text-[#98a5b6] mt-2 mb-0 leading-relaxed max-w-xl">
            One save. Four real database effects. No fake diagrams.
          </p>
        </div>

        {/* Film Card Banner */}
        <div className="flex items-center gap-3 bg-[#111824] border border-[#2d3a4d] rounded-xl p-2.5 sm:px-3.5 sm:py-2.5 min-w-[240px] shrink-0">
          <img
            src={selectedMovie.poster_url}
            alt={selectedMovie.title}
            className="w-9 h-13 object-cover rounded shadow-sm shrink-0 border border-white/10"
          />
          <div className="min-w-0">
            <strong className="text-[13px] font-bold text-white block truncate">
              {selectedMovie.title}
            </strong>
            <small className="text-[11px] text-[#9daabd] block truncate">
              {selectedMovie.release_date ? new Date(selectedMovie.release_date).getFullYear() : '2010'} · {selectedMovie.director || 'Cinema'}
            </small>
            <small className="text-[11px] text-[#ff9b83] font-semibold block">
              ★ {Number(selectedMovie.avg_rating || 9.5).toFixed(1)} community score
            </small>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex items-center gap-3 py-1" aria-hidden="true">
        <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-[#ff8f7f]">You save a rating</span>
        <div className="relative h-px flex-1 bg-gradient-to-r from-[#ff6b57] via-[#8b7cff] to-[#61d8ff]">
          {(trace?.steps || [1, 2, 3, 4]).map((_, idx) => (
            <span
              key={idx}
              className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border ${idx === activeStepIndex ? 'border-[#ff6b57] bg-[#ff6b57] shadow-[0_0_18px_rgba(255,107,87,0.8)]' : 'border-[#61d8ff]/70 bg-[#080c12]'}`}
              style={{ left: `${((idx + 1) / ((trace?.steps?.length || 4) + 1)) * 100}%` }}
            />
          ))}
        </div>
        <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-[#76ddff]">The data changes</span>
      </div>

      {/* 3-Column Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr_290px] gap-4 min-h-[580px]">
        {/* Left Column: Your Rating & Mutation Trigger */}
        <div className="bg-[#0d131d] border border-white/[0.10] rounded-[14px] p-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-black text-white m-0 tracking-tight">Stage a rating</h2>
              <p className="text-[11px] text-[#a79d93] leading-relaxed mt-1">
                Submit a rating and capture the full transaction while it moves through Postgres.
              </p>
            </div>

            {/* Movie Switcher */}
            <div>
              <label className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#8190a3] block mb-1.5">
                SELECT FILM
              </label>
              <select
                value={movieId}
                onChange={(e) => setMovieId(e.target.value)}
                className="w-full bg-[#0a0f16] border border-[#2d3a4d] rounded-lg px-2.5 py-1.5 text-xs text-[#f7f8fb] focus:border-[#ff6b57] focus:outline-none"
              >
                {moviesList.map(m => (
                  <option key={m.movie_id} value={m.movie_id}>
                    {m.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="h-px bg-white/10" />

            {/* Score Given Slider & Display */}
            <div>
              <div className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#8190a3]">
                SCORE GIVEN
              </div>
              <div className="text-5xl font-black tracking-tighter text-[#f7f8fb] mt-1 mb-1">
                {Number(rating).toFixed(1)} <span className="text-sm text-[#95a2b5] font-normal">/ 10</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="10.0"
                step="0.5"
                value={rating}
                onChange={(e) => setRating(parseFloat(e.target.value))}
                className="w-full accent-[#ff6b57] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-[#a79d93] font-mono mt-0.5">
                <span>1.0</span>
                <span>5.0</span>
                <span>10.0</span>
              </div>
            </div>

            {/* Optional Review Text */}
            <div>
              <label className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#8190a3] block mb-1">
                REVIEW NOTES (OPTIONAL)
              </label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                rows={2}
                placeholder="Notes for relational record..."
                className="w-full bg-[#0a0f16] border border-[#2d3a4d] rounded-lg p-2 text-xs text-[#f7f8fb] focus:border-[#ff6b57] focus:outline-none resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleCaptureTrace}
                disabled={isSubmitting}
                className="w-full py-2.5 px-3 rounded-lg bg-[#f7f8fb] hover:bg-white text-[#080b11] text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Executing mutation...</span>
                  </>
                ) : (
                  <>
                    <span>Save rating & capture trace →</span>
                  </>
                )}
              </button>

              <Link
                href="/dbms-console"
                className="w-full py-2 px-3 rounded-lg border border-[#40516a] hover:border-[#5f6f88] text-[#c4d3e3] text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors block text-center"
              >
                <span>Inspect affected schema</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            {feedbackMessage && (
              <div className="p-2 rounded bg-black/40 border border-[#ff6b57]/40 text-[11px] text-[#ff8f7f]">
                {feedbackMessage}
              </div>
            )}
          </div>

          {/* Database Objects & Warning */}
          <div className="pt-4 border-t border-white/10 space-y-2">
            <div className="text-[10px] font-bold tracking-[1.5px] uppercase text-[#8190a3]">
              ACTUAL DATABASE OBJECTS
            </div>
            <div className="text-[11px] font-mono text-[#c9d2de] leading-relaxed">
              <div>• reviews <span className="text-[#8b98aa]">(relational table)</span></div>
              <div>• trg_update_movie_rating <span className="text-[#8b98aa]">(trigger)</span></div>
              <div>• trg_log_review_activity <span className="text-[#8b98aa]">(trigger)</span></div>
              <div>• v_trending_movies <span className="text-[#8b98aa]">(analytical view)</span></div>
            </div>

            <div className="text-[10px] text-[#91a0b3] leading-snug p-2 rounded bg-white/[0.02] border border-[#2b384a]/60 mt-2">
              <strong>What you’re seeing:</strong> insert-only triggers stay quiet on updates, so the trace records a deliberate skip instead of inventing activity.
            </div>
          </div>
        </div>

        {/* Center Column: Transaction Journey Lineage with Step Replayer */}
        <div className="bg-[#0a0f16] border border-white/[0.10] rounded-[14px] p-5 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight m-0">
                Transaction replay
              </h2>
              <p className="text-[11px] text-[#8b98aa] mt-0.5 mb-0">
                Step through the actual statements generated by your rating.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#9db2c8] border border-[#3d4e66] px-2 py-0.5 rounded font-mono">
                SCRUBBABLE REPLAY
              </span>
            </div>
          </div>

          {/* Time Scrubber / Step Player Control Bar */}
          <div className="bg-[#080c12] border border-[#2a3547] rounded-xl p-3 my-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTogglePlay}
                  className="w-8 h-8 rounded-lg bg-[#ff6b57] hover:bg-[#e07f69] text-white flex items-center justify-center transition-colors shadow-sm"
                  title={isPlaying ? 'Pause replay' : 'Play transaction replay'}
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleStepBack}
                  disabled={activeStepIndex === 0}
                  className="w-7 h-7 rounded-lg bg-[#131b27] hover:bg-[#1b2635] border border-[#2a3547] text-[#b8c2d0] hover:text-white flex items-center justify-center disabled:opacity-30 transition-colors"
                  title="Previous step"
                >
                  <SkipBack className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleStepForward}
                  disabled={!trace?.steps || activeStepIndex >= trace.steps.length - 1}
                  className="w-7 h-7 rounded-lg bg-[#131b27] hover:bg-[#1b2635] border border-[#2a3547] text-[#b8c2d0] hover:text-white flex items-center justify-center disabled:opacity-30 transition-colors"
                  title="Next step"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleResetReplay}
                  className="w-7 h-7 rounded-lg bg-[#131b27] hover:bg-[#1b2635] border border-[#2a3547] text-[#b8c2d0] hover:text-white flex items-center justify-center transition-colors"
                  title="Reset to step 1"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-[#8b98aa]">
                  STEP <span className="text-[#ff6b57] font-bold">{activeStepIndex + 1}</span> / {trace?.steps?.length || 4}
                </span>
                {trace?.steps && trace.steps[activeStepIndex] && (
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                    trace.steps[activeStepIndex].status === 'SKIPPED'
                      ? 'bg-amber-950/60 border border-amber-600/50 text-amber-300'
                      : 'bg-emerald-950/60 border border-emerald-600/50 text-emerald-300'
                  }`}>
                    {trace.steps[activeStepIndex].status}
                  </span>
                )}
              </div>
            </div>

            {/* Interactive Scrubber Track */}
            <div className="flex items-center gap-1.5 pt-1">
              {(trace?.steps || [1, 2, 3, 4]).map((st: any, idx: number) => {
                const isActive = idx === activeStepIndex;
                const isPast = idx < activeStepIndex;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setIsPlaying(false);
                      setActiveStepIndex(idx);
                    }}
                    className={`flex-1 h-2 rounded-full transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#ff6b57] shadow-[0_0_8px_#ff6b57]'
                        : isPast
                          ? 'bg-[#5f6f88]'
                          : 'bg-[#161f2c] hover:bg-[#28364a]'
                    }`}
                    title={`Jump to step ${idx + 1}: ${FRIENDLY_STEP_TITLES[idx] || st?.step_title || ''}`}
                  />
                );
              })}
            </div>
          </div>

          {/* Steps List */}
          <div className="flex-1 py-2 space-y-3 overflow-y-auto relative">
            {trace?.steps && trace.steps.length > 0 ? (
              trace.steps.map((step, idx) => {
                const isSkipped = step.status === 'SKIPPED';
                const isActive = idx === activeStepIndex;
                const isExpanded = expandedStepIdx === idx;

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setIsPlaying(false);
                      setActiveStepIndex(idx);
                    }}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isActive
                        ? 'border-[#ff6b57] bg-[#131b27]/60 shadow-lg ring-1 ring-[#ff6b57]/40'
                        : 'border-[#2d3a4d]/60 bg-[#0a0f16] hover:border-[#445570] hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Step Number Circle */}
                      <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${
                        isActive
                          ? 'bg-[#ff6b57] text-[#080b11] font-black shadow-sm'
                          : isSkipped
                            ? 'bg-[#161f2c] border border-[#445570] text-[#8b98aa]'
                            : 'bg-[#131b27] border border-[#657994] text-[#b7cbdf]'
                      }`}>
                        {step.step_order}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-xs font-bold text-white tracking-tight m-0 truncate">
                            {FRIENDLY_STEP_TITLES[idx] || step.step_title}
                          </h3>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isActive && (
                              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#ff6b57]/20 text-[#ff8f7f] font-bold">
                                ACTIVE
                              </span>
                            )}
                            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                              isSkipped ? 'bg-amber-900/30 text-amber-300' : 'bg-black/40 text-[#a9c4de]'
                            }`}>
                              {step.operation}
                            </span>
                          </div>
                        </div>

                        <p className="text-[11px] text-[#8b98aa] mt-1 mb-2 leading-relaxed">
                          {step.description}
                        </p>

                        <div className="flex items-center justify-between pt-1 text-[10px] text-[#738196]">
                          <span className="font-mono text-[#ff8f7f]">
                            Target: {step.target_object}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedStepIdx(isExpanded ? null : idx);
                            }}
                            className="text-[#ff6b57] hover:underline flex items-center gap-1"
                          >
                            <Code2 className="w-3 h-3" />
                            <span>{isExpanded ? 'Hide SQL' : 'Inspect SQL'}</span>
                          </button>
                        </div>

                        {/* Expandable Captured SQL Block */}
                        {(isExpanded || (isActive && step.sql_preview)) && (
                          <div className="mt-2.5 font-mono text-[11px] text-[#cbd5e2] bg-[#06080d] rounded-lg p-2.5 border border-[#202b3b] overflow-x-auto">
                            <div className="text-[9px] uppercase tracking-wider text-[#7e8da1] mb-1 font-bold">
                              CAPTURED ENGINE STATEMENT
                            </div>
                            <span className="text-[#ff8f7f]">{step.target_object}</span> &nbsp;
                            <span className="text-[#9aa7b9]">{step.sql_preview}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 text-[#8b98aa] text-xs font-mono">
                No trace steps available. Click "Save review & capture trace" to generate lineage.
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-white/10 text-[10px] text-[#8b98aa] flex items-center justify-between">
            <span>Trace #{trace?.trace_id || '1'} · Captured at runtime</span>
            <span className="text-[#ff6b57] font-mono">Operation: {trace?.mutation_op || 'INSERT'}</span>
          </div>
        </div>

        {/* Right Column: Before / After Data State & Delta Inspector */}
        <div className="bg-[#0d131d] border border-white/[0.10] rounded-[14px] p-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-white m-0 tracking-tight">Row diff</h2>
                <p className="text-[11px] text-[#8795a7] leading-relaxed mt-0.5 mb-0">
                  See exactly what changed in the database.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRawJson(!showRawJson)}
                className="text-[10px] font-mono px-2 py-1 rounded bg-[#0a0f16] border border-[#2a3547] text-[#c5cfdd] hover:text-white"
              >
                {showRawJson ? 'View Diff' : 'View JSON'}
              </button>
            </div>

            {/* Overall Movie Average Comparison */}
            <div>
              <div className="text-[10px] font-bold tracking-[1.3px] uppercase text-[#a7b4c6]">
                OVERALL RATING DELTA
              </div>
              <div className="flex items-center justify-between gap-2 my-2">
                <div className="bg-[#0a0f16] rounded-lg p-3 w-[46%] border border-[#2b394c]">
                  <span className="text-[11px] text-[#8f9daf] block">Initial Score</span>
                  <b className="text-2xl font-black text-white block mt-1 tracking-tight">
                    {trace?.initial_score ? Number(trace.initial_score).toFixed(1) : '9.5'}
                  </b>
                </div>
                <ArrowRight className="w-4 h-4 text-[#8b7cff] shrink-0" />
                <div className="bg-[#0a0f16] rounded-lg p-3 w-[46%] border border-[#2b394c]">
                  <span className="text-[11px] text-[#8f9daf] block">Recalculated</span>
                  <b className="text-2xl font-black text-[#ff9b83] block mt-1 tracking-tight">
                    {trace?.final_score ? Number(trace.final_score).toFixed(1) : Number(selectedMovie.avg_rating || 9.6).toFixed(1)}
                  </b>
                </div>
              </div>
            </div>

            {/* Focused Step Row Delta */}
            <div className="space-y-2">
              <div className="text-[10px] font-bold tracking-[1.3px] uppercase text-[#a7b4c6] flex items-center justify-between">
                <span>STEP {activeStepIndex + 1} AFFECTED STATE</span>
                <span className="text-[#ff6b57] font-mono lowercase">
                  {trace?.steps?.[activeStepIndex]?.target_object || 'records'}
                </span>
              </div>

              {trace?.steps && trace.steps[activeStepIndex] ? (
                (() => {
                  const step = trace.steps[activeStepIndex];
                  if (showRawJson) {
                    return (
                      <div className="rounded-lg bg-[#080c12] border border-[#304055] p-2.5 font-mono text-[10px] text-[#c5cfdd] max-h-[220px] overflow-auto space-y-2">
                        <div>
                          <b className="text-[#8795a7] block">BEFORE STATE:</b>
                          <pre className="whitespace-pre-wrap">{JSON.stringify(step.before_state, null, 2) || 'null (new record)'}</pre>
                        </div>
                        <div className="pt-2 border-t border-white/10">
                          <b className="text-[#ff6b57] block">AFTER STATE:</b>
                          <pre className="whitespace-pre-wrap">{JSON.stringify(step.after_state, null, 2) || 'null'}</pre>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="rounded-lg bg-[#0a0f16] border border-[#304055] p-3 font-mono text-[11px] text-[#c5cfdd] space-y-2">
                      <div className="flex items-center justify-between border-b border-white/10 pb-1.5 text-[10px]">
                        <span className="font-bold text-[#9abfe1] uppercase">
                          OBJECT: {step.target_object}
                        </span>
                        <span className="text-[#8b98aa]">
                          TYPE: {step.step_type}
                        </span>
                      </div>

                      {step.after_state && typeof step.after_state === 'object' ? (
                        <div className="space-y-1.5 pt-1">
                          {Object.entries(step.after_state).map(([k, v]) => {
                            const prevVal = step.before_state?.[k];
                            const hasChanged = prevVal !== undefined && prevVal !== v;
                            return (
                              <div key={k} className="flex items-center justify-between gap-2 text-[11px]">
                                <span className="text-[#8b98aa] truncate">{k}:</span>
                                <div className="text-right truncate font-bold">
                                  {hasChanged ? (
                                    <span>
                                      <span className="text-[#6e7d92] line-through mr-1">{String(prevVal)}</span>
                                      <span className="text-[#ff9b83]">→ {String(v)}</span>
                                    </span>
                                  ) : (
                                    <span className="text-[#dde5ef]">{String(v)}</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-xs text-[#8b98aa] italic py-2">
                          {step.status === 'SKIPPED'
                            ? 'Step bypassed according to trigger registration (AFTER INSERT).'
                            : 'Executed statement verified in runtime transaction.'}
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : (
                <div className="rounded-lg bg-[#0a0f16] border border-[#304055] p-3 text-xs text-[#8b98aa] font-mono">
                  Select a step on the timeline to inspect delta.
                </div>
              )}
            </div>
          </div>

          {/* Footer Card Notice */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-between text-[11px] text-[#8795a7]">
            <span>Read-only replay · No re-mutation</span>
            <span className="text-[10px] bg-[#34465f] text-[#dbe8f5] px-2.5 py-1 rounded-full font-bold">
              CINETRACE ENGINE
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
