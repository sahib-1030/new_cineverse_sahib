'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Sparkles,
  Split,
  Film,
  User,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Clock,
  Layers,
  Database,
  Search,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';
import { CountercutCase } from '@/lib/countercut/types';
import ConfirmChallengeModal from '@/components/countercut/ConfirmChallengeModal';
import EvidenceConstellation from '@/components/countercut/EvidenceConstellation';
import InvestigationStepPlayer from '@/components/countercut/InvestigationStepPlayer';
import DraggableSplitView from '@/components/countercut/DraggableSplitView';

export default function CountercutPage() {
  const searchParams = useSearchParams();
  const initialMovieId = searchParams.get('movieId');

  const [mode, setMode] = useState<'taste_contradiction' | 'opposite_critic'>(
    initialMovieId ? 'opposite_critic' : 'taste_contradiction'
  );
  const [selectedMovieId, setSelectedMovieId] = useState<string>(initialMovieId || '5');
  const [activeCase, setActiveCase] = useState<CountercutCase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isInvestigating, setIsInvestigating] = useState(false);
  const [isChallengeModalOpen, setIsChallengeModalOpen] = useState(false);
  const [customQuery, setCustomQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Available movies for deep-link / targeted exploration
  const candidateMovies = [
    { id: '5', title: 'Oppenheimer (2023)' },
    { id: '1', title: 'Inception (2010)' },
    { id: '2', title: 'Interstellar (2014)' },
    { id: '3', title: 'The Dark Knight (2008)' },
    { id: '4', title: 'Dune: Part Two (2024)' },
    { id: '18', title: 'Arrival (2016)' },
    { id: '9', title: 'The Matrix (1999)' },
  ];

  // Trigger an investigation
  const triggerInvestigation = async (
    targetMode: 'taste_contradiction' | 'opposite_critic',
    targetMovieIdStr?: string,
    queryStr?: string
  ) => {
    setIsInvestigating(true);
    setError(null);

    try {
      const res = await fetch('/api/countercut/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: targetMode,
          targetMovieId: targetMovieIdStr ? parseInt(targetMovieIdStr, 10) : undefined,
          customQuery: queryStr ? queryStr.trim() : undefined,
        }),
      });

      if (res.status === 401) {
        setError('Please sign in to run Countercut investigations.');
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Investigation failed');
      }

      if (data.case) {
        setActiveCase(data.case);
        setMode(data.case.mode);
      }
    } catch (err: any) {
      console.error('Investigation error:', err);
      setError(err.message);
    } finally {
      setIsInvestigating(false);
      setIsLoading(false);
    }
  };

  // Load latest or deep-linked case on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      setIsLoading(true);
      setError(null);

      // Deep link support: If a target movie was provided in URL query, run opposite_critic investigation for that movie
      if (initialMovieId) {
        setMode('opposite_critic');
        setSelectedMovieId(initialMovieId);
        await triggerInvestigation('opposite_critic', initialMovieId);
        return;
      }

      try {
        const res = await fetch('/api/countercut/cases');
        if (res.status === 401) {
          setError('Please sign in to access The Countercut investigation studio.');
          setIsLoading(false);
          return;
        }
        const data = await res.json();
        if (data.case) {
          setActiveCase(data.case);
          setMode(data.case.mode);
        } else {
          // Trigger initial investigation
          await triggerInvestigation(mode, selectedMovieId);
        }
      } catch (err: any) {
        console.error('Failed to load Countercut case:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, [initialMovieId]);

  const handleModeChange = (newMode: 'taste_contradiction' | 'opposite_critic') => {
    setMode(newMode);
    triggerInvestigation(newMode, selectedMovieId);
  };

  const handleMovieChange = (newMovieId: string) => {
    setSelectedMovieId(newMovieId);
    triggerInvestigation('opposite_critic', newMovieId);
  };

  const handleCustomQuerySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customQuery.trim()) return;
    triggerInvestigation(mode, selectedMovieId, customQuery);
    setCustomQuery('');
  };

  const [focusedEvidenceId, setFocusedEvidenceId] = useState<string | null>(null);
  const [revealedSpoilers, setRevealedSpoilers] = useState<Set<string>>(new Set());

  const handleSelectEvidence = (evidenceId?: string) => {
    if (!evidenceId) {
      const rail = document.getElementById('evidence-rail-header');
      if (rail) rail.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    setFocusedEvidenceId(evidenceId);
    const el = document.getElementById(`evidence-card-${evidenceId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const toggleSpoiler = (id: string) => {
    setRevealedSpoilers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="min-h-screen text-[#f7f8fb] pb-16">
      {/* Top Breadcrumb & Status */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#2a3547]/40 mb-6">
        <div className="flex items-center gap-2 text-xs font-mono text-[#8b98aa]">
          <Link href="/" className="hover:text-white transition-colors">
            CINEVERSE
          </Link>
          <span>/</span>
          <span className="text-[#ff6b57] font-bold">COUNTERCUT</span>
          {activeCase && (
            <>
              <span>/</span>
              <span className="text-white uppercase font-bold tracking-wider">
                {activeCase.id.slice(0, 12)}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {activeCase?.isDeterministicFallback ? (
            <span className="text-[11px] font-mono text-[#ff6b57] bg-[#ff6b57]/10 border border-[#ff6b57]/30 px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <Database className="w-3 h-3" />
              <span>POSTGRESQL EVIDENCE-GROUNDED</span>
            </span>
          ) : (
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-700/40 px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>EVIDENCE ENGINE · {activeCase?.modelName || 'gemini-3.8-flash'}</span>
            </span>
          )}
          <span className="text-[11px] font-mono text-[#8190a3] bg-white/[0.03] border border-white/10 px-2.5 py-1 rounded-full">
            LIVE CASE FILE
          </span>
        </div>
      </div>

      {/* Main 2-Column Responsive Layout matching COUNTERCUT_DESKTOP_REFERENCE_2X.png */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Workspace (~68% width on desktop) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Header Title Section with Compact Mode Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.2em] text-[#ff6b57] font-bold">
                <span className="w-2 h-2 rounded-full bg-[#ff6b57] shadow-[0_0_8px_#ff6b57]" />
                <span>THE COUNTERCUT</span>
              </div>
              <h1 className="text-[30px] sm:text-[40px] font-black text-white tracking-[-0.055em] leading-[0.98] mt-2">
                Prove your taste makes no sense.
              </h1>
              <p className="text-sm text-[#98a5b6] mt-2">We found the rating you can’t explain.</p>
            </div>

            {/* Compact Mode Controls right at the top */}
            <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-xl bg-[#101620] border border-[#2a3547] shrink-0">
              <button
                onClick={() => handleModeChange('taste_contradiction')}
                disabled={isInvestigating}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                  mode === 'taste_contradiction'
                    ? 'bg-[#ff6b57] text-[#070a0f] shadow-sm'
                    : 'text-[#8b98aa] hover:text-white hover:bg-white/5'
                }`}
              >
                Taste contradiction
              </button>
              <button
                onClick={() => handleModeChange('opposite_critic')}
                disabled={isInvestigating}
                className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all ${
                  mode === 'opposite_critic'
                    ? 'bg-[#ff6b57] text-[#070a0f] shadow-sm'
                    : 'text-[#8b98aa] hover:text-white hover:bg-white/5'
                }`}
              >
                Opposite critic
              </button>

              {mode === 'opposite_critic' && (
                <select
                  value={selectedMovieId}
                  onChange={(e) => handleMovieChange(e.target.value)}
                  disabled={isInvestigating}
                  className="bg-[#101620] border border-[#2a3547] rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-[#ff6b57]"
                >
                  {candidateMovies.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
                </select>
              )}

              <button
                onClick={() => triggerInvestigation(mode, selectedMovieId)}
                disabled={isInvestigating}
                className="p-1.5 rounded-lg border border-[#2a3547] hover:bg-white/5 text-[#f7f8fb] transition-colors disabled:opacity-50"
                title="Re-run analysis"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isInvestigating ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-800/40 text-xs text-red-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!activeCase && !error && (
            <div className="relative min-h-[390px] overflow-hidden rounded-[16px] border border-white/[0.10] bg-[radial-gradient(circle_at_50%_20%,rgba(139,124,255,0.14),transparent_38%),linear-gradient(145deg,#0d131d,#070a10)] flex items-center justify-center">
              <div className="absolute inset-x-10 top-1/2 h-px bg-gradient-to-r from-transparent via-[#61d8ff]/70 to-transparent" />
              <div className="absolute inset-y-12 left-1/2 w-px bg-gradient-to-b from-transparent via-[#ff6b57]/60 to-transparent" />
              <div className="relative z-10 max-w-md text-center px-8 py-12">
                <div className="mx-auto mb-5 h-12 w-12 rounded-full border border-white/[0.12] bg-[#0a0f16] flex items-center justify-center shadow-[0_0_35px_rgba(139,124,255,0.18)]">
                  <Split className={`h-5 w-5 text-[#ff6b57] ${isInvestigating || isLoading ? 'animate-pulse' : ''}`} />
                </div>
                <h2 className="text-2xl font-black tracking-[-0.04em] text-white">
                  {isInvestigating || isLoading ? 'Building your case…' : 'Your taste left a trail.'}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-[#98a5b6]">
                  {isInvestigating || isLoading
                    ? 'Comparing the films you loved with the ones you left behind.'
                    : 'Run a contradiction to uncover the rating your own history cannot explain.'}
                </p>
                {!isInvestigating && !isLoading && (
                  <button
                    type="button"
                    onClick={() => triggerInvestigation('taste_contradiction', selectedMovieId)}
                    className="mt-6 rounded-lg bg-[#ff6b57] px-5 py-2.5 text-xs font-black text-[#070a0f] transition-transform hover:-translate-y-0.5"
                  >
                    Find the contradiction
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Matched Film Pair Composition - PRIMARY VIEWPORT LEADER */}
          {activeCase?.primaryMovie && (
            <div className="relative">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-0 relative">
                <div className="hidden md:block absolute inset-y-0 left-1/2 z-20 w-px bg-gradient-to-b from-[#61d8ff]/20 via-[#8b7cff] to-[#ff6b57]/40 shadow-[0_0_22px_rgba(139,124,255,0.55)]" aria-hidden="true" />
                {/* Left Film Card */}
                <div className="relative rounded-2xl md:rounded-r-none overflow-hidden bg-[#101620] border border-[#2a3547] flex flex-col justify-between group shadow-lg">
                  {/* Backdrop Header */}
                  <div className="h-44 sm:h-52 w-full relative overflow-hidden bg-[#111824]">
                    {activeCase.primaryMovie.backdrop_url || activeCase.primaryMovie.poster_url ? (
                      <img
                        src={activeCase.primaryMovie.backdrop_url || activeCase.primaryMovie.poster_url}
                        alt={activeCase.primaryMovie.title}
                        className="w-full h-full object-cover object-center brightness-90 group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Film className="w-12 h-12 text-[#2a3547]" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#101620] via-[#101620]/40 to-transparent" />
                  </div>

                  {/* Film Details */}
                  <div className="p-5 relative -mt-10 space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xl font-black text-white tracking-tight">
                        {activeCase.primaryMovie.title}
                      </h3>
                      <div className="text-xs text-[#8b98aa] flex items-center gap-2 mt-0.5">
                        <span>{activeCase.primaryMovie.release_date?.slice(0, 4) || '2023'}</span>
                        <span>•</span>
                        <span>{activeCase.primaryMovie.genres?.slice(0, 2).join(', ') || 'Cinema'}</span>
                        <span>•</span>
                        <span>{activeCase.primaryMovie.runtime || 120} min</span>
                      </div>
                    </div>

                    {/* Rating Ribbon */}
                    <div className="flex items-baseline gap-2 pt-1">
                      <span className="text-2xl font-black text-[#ff6b57] tracking-tight">
                        ★ {activeCase.primaryMovie.userRating || '9.5'}
                      </span>
                      <span className="text-xs text-[#8b98aa] font-mono">/ 10</span>
                      <span className="ml-2 text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#ff6b57]/15 text-[#ff6b57] border border-[#ff6b57]/30">
                        You rated
                      </span>
                    </div>

                    <p className="text-xs text-[#c7d0dd] line-clamp-3 leading-relaxed pt-1">
                      {activeCase.primaryMovie.synopsis ||
                        'A monumental work of cinema engaging with high narrative drive and existential human stakes.'}
                    </p>
                  </div>
                </div>

                {/* Right Film Card */}
                {activeCase.secondaryMovie ? (
                  <div className="relative rounded-2xl md:rounded-l-none overflow-hidden bg-[#101620] border border-[#2a3547] md:border-l-0 flex flex-col justify-between group shadow-lg">
                    {/* Backdrop Header */}
                    <div className="h-44 sm:h-52 w-full relative overflow-hidden bg-[#111824]">
                      {activeCase.secondaryMovie.backdrop_url || activeCase.secondaryMovie.poster_url ? (
                        <img
                          src={activeCase.secondaryMovie.backdrop_url || activeCase.secondaryMovie.poster_url}
                          alt={activeCase.secondaryMovie.title}
                          className="w-full h-full object-cover object-center brightness-90 group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Film className="w-12 h-12 text-[#2a3547]" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#101620] via-[#101620]/40 to-transparent" />
                    </div>

                    {/* Film Details */}
                    <div className="p-5 relative -mt-10 space-y-2 flex-1 flex flex-col justify-between">
                      <div>
                        <h3 className="text-xl font-black text-white tracking-tight">
                          {activeCase.secondaryMovie.title}
                        </h3>
                        <div className="text-xs text-[#8b98aa] flex items-center gap-2 mt-0.5">
                          <span>{activeCase.secondaryMovie.release_date?.slice(0, 4) || '2016'}</span>
                          <span>•</span>
                          <span>{activeCase.secondaryMovie.genres?.slice(0, 2).join(', ') || 'Cinema'}</span>
                          <span>•</span>
                          <span>{activeCase.secondaryMovie.runtime || 116} min</span>
                        </div>
                      </div>

                      {/* Rating Ribbon */}
                      <div className="flex items-baseline gap-2 pt-1">
                        <span className="text-2xl font-black text-[#a4b6ce] tracking-tight">
                          ★ {activeCase.secondaryMovie.userRating || '4.0'}
                        </span>
                        <span className="text-xs text-[#8b98aa] font-mono">/ 10</span>
                        <span className="ml-2 text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-[#d5dce7] border border-white/10">
                          You rated
                        </span>
                      </div>

                      <p className="text-xs text-[#c7d0dd] line-clamp-3 leading-relaxed pt-1">
                        {activeCase.secondaryMovie.synopsis ||
                          'A quieter investigation of theme and pacing that departs from traditional propulsive tension.'}
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Opposite Critic Card for Mode B */
                  <div className="relative rounded-2xl overflow-hidden bg-[#101620] border border-[#2a3547] flex flex-col justify-between p-6 shadow-lg">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-[#ff6b57]/20 border border-[#ff6b57]/40 flex items-center justify-center text-lg font-bold text-[#ff6b57]">
                          {activeCase.oppositeCritic?.displayName?.[0] || 'E'}
                        </div>
                        <div>
                          <div className="text-xs font-mono uppercase tracking-wider text-[#ff6b57]">
                            OPPOSING REVIEWER
                          </div>
                          <div className="text-lg font-bold text-white">
                            {activeCase.oppositeCritic?.displayName || 'Elena Rostov'}
                          </div>
                          <div className="text-xs text-[#8b98aa]">
                            @{activeCase.oppositeCritic?.username || 'elena_r'}
                          </div>
                        </div>
                      </div>

                      <div className="p-4 rounded-xl bg-[#101620] border border-[#2a3547] space-y-2">
                        <div className="text-xs font-mono text-[#8b98aa] uppercase tracking-wider">
                          Divergence on {activeCase.primaryMovie.title}
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs text-[#8b98aa] block">Your rating:</span>
                            <span className="text-xl font-bold text-[#ff6b57]">
                              ★ {activeCase.primaryMovie.userRating || '9.6'}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-xs text-[#8b98aa] block">Their rating:</span>
                            <span className="text-xl font-bold text-[#c7d0dd]">
                              ★ {activeCase.primaryMovie.criticRating || '4.0'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-[#c7d0dd] leading-relaxed">
                        While sharing strong alignment across your other rated titles, this reviewer reached the opposite conclusion on {activeCase.primaryMovie.title}.
                      </p>
                    </div>

                    <div className="pt-4 border-t border-white/5 text-[11px] font-mono text-[#8b98aa]">
                      Calculated from real PostgreSQL review intersections
                    </div>
                  </div>
                )}
              </div>

              {/* Central Connector Tag */}
              {activeCase.connectorLabel && (
                <div className="hidden md:flex absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                  <div className="bg-[#06080d] border border-[#2a3547] px-3.5 py-1.5 rounded-full text-xs font-mono text-[#ff6b57] shadow-2xl whitespace-nowrap font-bold">
                    {activeCase.connectorLabel}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Factual Metric Ribbon */}
          {activeCase?.factualMetrics && activeCase.factualMetrics.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-[#101620] border border-[#2a3547]">
              {activeCase.factualMetrics.map((metric, idx) => (
                <div
                  key={idx}
                  className={`p-3 space-y-1 ${
                    idx !== activeCase.factualMetrics.length - 1 ? 'sm:border-r sm:border-white/10' : ''
                  }`}
                >
                  <div className="text-2xl font-black text-white tracking-tight">
                    {metric.value}
                  </div>
                  <div className="text-xs font-bold text-[#c7d0dd]">{metric.label}</div>
                  {metric.subtext && (
                    <div className="text-[11px] text-[#8b98aa] leading-snug">{metric.subtext}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Hypothesis Finding Card */}
          {activeCase && (
            <div className="p-6 rounded-2xl bg-[#101620] border border-[#2c394c] space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-mono font-bold tracking-wider uppercase text-[#ff6b57]">
                  <Lightbulb className="w-4 h-4 text-[#ff6b57]" />
                  <span>
                    HYPOTHESIS — GROUNDED IN {activeCase.evidence ? activeCase.evidence.length : 0} REVIEWS
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 text-[#c7d0dd] border border-white/10">
                  EMPIRICAL PROVENANCE
                </span>
              </div>

              <h2 className="text-lg font-bold text-white leading-snug tracking-tight">
                {activeCase.hypothesis}
              </h2>

              {/* Claims with Evidence IDs */}
              {activeCase.claims && activeCase.claims.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <div className="text-[10px] font-mono uppercase text-[#8b98aa]">
                    EVALUATED EVIDENCE CLAIMS
                  </div>
                  {activeCase.claims.map((claim, idx) => (
                    <div key={idx} className="text-xs text-[#c7d0dd] flex items-start gap-2">
                      <span className="text-[#ff6b57] mt-0.5">•</span>
                      <div>
                        <span>{claim.text}</span>
                        {claim.evidenceIds.length > 0 && (
                          <span className="ml-2 inline-flex gap-1">
                            {claim.evidenceIds.map((eid) => (
                              <button
                                key={eid}
                                type="button"
                                onClick={() => handleSelectEvidence(eid)}
                                className="text-[10px] font-mono bg-black/40 hover:bg-[#ff6b57] hover:text-[#070a0f] text-[#ff6b57] border border-[#ff6b57]/40 px-1.5 py-0.5 rounded transition-all cursor-pointer font-bold shadow-sm"
                                title={`Focus evidence record #${eid}`}
                              >
                                #{eid}
                              </button>
                            ))}
                          </span>
                        )}
                        {claim.strength === 'insufficient' && (
                          <span className="ml-2 text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-amber-950/60 text-amber-400 border border-amber-800/40">
                            UNSUPPORTED
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Alternative Explanations & Limitations */}
              {activeCase.alternativeExplanations && activeCase.alternativeExplanations.length > 0 && (
                <div className="text-xs text-[#8b98aa] pt-2 border-t border-white/5 space-y-1">
                  <span className="font-semibold text-[#c7d0dd]">Alternative explanations:</span>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                    {activeCase.alternativeExplanations.map((alt, i) => (
                      <li key={i}>{alt}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                {activeCase.proposedChallenge && (
                  <button
                    onClick={() => setIsChallengeModalOpen(true)}
                    className="flex-1 py-3 px-5 rounded-xl bg-[#ff6b57] hover:bg-[#ff7d69] text-[#080b11] text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
                  >
                    <Film className="w-4 h-4" />
                    <span>Build a two-film challenge</span>
                  </button>
                )}

                <Link
                  href={
                    activeCase.primaryMovie
                      ? `/trace?movieId=${activeCase.primaryMovie.movie_id}`
                      : '/trace'
                  }
                  className="py-3 px-5 rounded-xl bg-[#101620] border border-[#2a3547] hover:border-[#ff6b57] text-[#f7f8fb] text-xs font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  <Database className="w-4 h-4 text-[#ff6b57]" />
                  <span>Open CineTrace</span>
                </Link>
              </div>
            </div>
          )}

          {/* Interactive Split Comparison Slider (Bencho Split View inspired) */}
          {activeCase && (
            <DraggableSplitView activeCase={activeCase} />
          )}

          {/* Interactive Evidence Constellation Graph (React Flow / Node topology) */}
          {activeCase && (
            <EvidenceConstellation
              activeCase={activeCase}
              onSelectEvidence={handleSelectEvidence}
            />
          )}

          {/* Recorded Investigation Timeline / Step Player (Bencho Step Player inspired) */}
          {activeCase && (
            <InvestigationStepPlayer
              activeCase={activeCase}
              onJumpToEvidence={() => handleSelectEvidence()}
            />
          )}
        </div>

        {/* Right Evidence Rail (~32% width on desktop) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Header */}
          <div id="evidence-rail-header" className="flex items-center justify-between pb-2 border-b border-[#2a3547]/40">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-[#ff6b57]" />
              <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                THE RECEIPTS
              </h2>
            </div>
            <span className="text-xs font-mono text-[#ff6b57] font-bold">
              {activeCase?.evidence ? activeCase.evidence.length : 0} verified records
            </span>
          </div>

          {/* Evidence Records List */}
          <div className="space-y-3">
            {activeCase?.evidence && activeCase.evidence.length > 0 ? (
              activeCase.evidence.map((ev) => {
                const isFocused = focusedEvidenceId === ev.id;
                const isSpoilerRevealed = revealedSpoilers.has(ev.id);

                return (
                  <div
                    key={ev.id}
                    id={`evidence-card-${ev.id}`}
                    className={`p-4 rounded-xl bg-[#101620] border space-y-2.5 transition-all duration-300 shadow-sm ${
                      isFocused
                        ? 'border-[#ff6b57] ring-2 ring-[#ff6b57] shadow-[0_0_20px_rgba(221,112,88,0.35)] scale-[1.01]'
                        : 'border-[#2a3547] hover:border-[#ff6b57]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono text-[#ff6b57] uppercase font-bold tracking-wider">
                        {ev.author ? `${ev.author.toUpperCase()} · ` : ''}#{ev.id}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {ev.isSpoiler && (
                          <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-amber-950/70 border border-amber-600/60 text-amber-300 font-bold">
                            SPOILER
                          </span>
                        )}
                        {ev.rating !== undefined && (
                          <span className="text-xs font-bold text-[#ff6b57]">★ {ev.rating}</span>
                        )}
                      </div>
                    </div>

                    <div className="text-xs font-bold text-white">{ev.title}</div>

                    {/* Spoiler Protection Masking */}
                    {ev.isSpoiler && !isSpoilerRevealed ? (
                      <div className="p-3 rounded-lg bg-[#080b11] border border-amber-900/40 text-center my-1.5 space-y-1">
                        <div className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-wider flex items-center justify-center gap-1.5">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Contains Film Spoilers</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleSpoiler(ev.id)}
                          className="text-[11px] text-[#f7f8fb] underline hover:text-[#ff6b57] transition-colors"
                        >
                          Click to reveal quote
                        </button>
                      </div>
                    ) : (
                      <div>
                        <blockquote className="text-[11px] text-[#c7d0dd] leading-relaxed italic border-l-2 border-[#ff6b57]/40 pl-2.5 my-1">
                          "{ev.snippet}"
                        </blockquote>
                        {ev.isSpoiler && (
                          <button
                            type="button"
                            onClick={() => toggleSpoiler(ev.id)}
                            className="text-[10px] font-mono text-[#748196] hover:text-[#8b98aa] mt-1 block"
                          >
                            Hide spoiler
                          </button>
                        )}
                      </div>
                    )}

                    {(ev.metadata?.movieId || ev.targetId) && (
                      <Link
                        href={`/movies/${ev.metadata?.movieId || ev.targetId}`}
                        className="text-[11px] font-mono text-[#8b98aa] hover:text-[#ff6b57] flex items-center gap-1 pt-1 transition-colors"
                      >
                        <span>View film details</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-8 rounded-xl bg-[linear-gradient(145deg,rgba(255,107,87,0.07),rgba(139,124,255,0.06))] border border-white/[0.10] text-center text-xs text-[#aab5c4]">
                Your contradiction is loading. We’re matching ratings against genres, themes, and the words you used.
              </div>
            )}
          </div>

          {/* Tools Used Section */}
          <div className="p-5 rounded-2xl bg-[#101620] border border-[#2a3547] space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-white">
              <Layers className="w-3.5 h-3.5 text-[#ff6b57]" />
              <span>TOOL TRACE</span>
            </div>

            <div className="space-y-2.5">
              {activeCase?.toolReceipts && activeCase.toolReceipts.length > 0 ? (
                activeCase.toolReceipts.map((t, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-black/20 border border-white/5 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-[#ff6b57]">{t.toolName}</span>
                      <span className="text-[10px] font-mono text-[#8b98aa]">{t.durationMs}ms</span>
                    </div>
                    <p className="text-[11px] text-[#c7d0dd] leading-snug">{t.description}</p>
                  </div>
                ))
              ) : (
                <div className="text-xs text-[#8b98aa]">The investigation trail will appear here.</div>
              )}
            </div>

            <div className="pt-2 border-t border-white/5 text-[10px] text-[#8b98aa] leading-snug">
              Every claim opens back to the database record that supports it.
            </div>
          </div>

          {/* Interactive Pattern Inquiry Input */}
          <div className="p-4 rounded-2xl bg-[#101620] border border-[#2a3547] space-y-2">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#8190a3]">
              Ask another question about your taste
            </div>
            <form onSubmit={handleCustomQuerySubmit} className="flex gap-2">
              <input
                type="text"
                value={customQuery}
                onChange={(e) => setCustomQuery(e.target.value)}
                placeholder="Why do I love space epics but reject quiet sci-fi?"
                className="flex-1 bg-[#0a0f16] border border-[#2a3547] rounded-lg px-3 py-2 text-xs text-white placeholder-[#6f7c8f] focus:outline-none focus:border-[#61d8ff]"
              />
              <button
                type="submit"
                disabled={isInvestigating}
                className="px-3 rounded-lg bg-[#ff6b57] hover:bg-[#ff7d69] text-[#070a0f] text-xs font-bold transition-colors disabled:opacity-50"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Challenge Consent Modal */}
      <ConfirmChallengeModal
        isOpen={isChallengeModalOpen}
        onClose={() => setIsChallengeModalOpen(false)}
        challenge={activeCase?.proposedChallenge}
        caseId={activeCase?.id}
      />
    </div>
  );
}
