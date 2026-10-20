'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Play,
  ArrowRight,
  Database,
  Code2,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Flame,
  Search,
  Loader2,
  CheckCircle2,
  Layers
} from 'lucide-react';
import { Movie, MoodDefinition, CineMoodResult } from '@/lib/types';

interface MoodSelectorProps {
  onOpenTrailer: (movie: Movie) => void;
}

const DEFAULT_MOODS: MoodDefinition[] = [
  {
    id: 'mind-bending',
    label: 'Mind-Bending',
    emoji: '🌀',
    description: 'Cerebral labyrinths, ontological paradoxes, and nonlinear narratives.',
    primaryGenres: ['sci-fi', 'thriller'],
    minRating: 8.2,
    accentColor: '#a855f7',
  },
  {
    id: 'adrenaline-rush',
    label: 'Adrenaline Rush',
    emoji: '⚡',
    description: 'High-octane momentum, edge-of-seat suspense, and razor-sharp tension.',
    primaryGenres: ['action', 'thriller'],
    minRating: 7.8,
    accentColor: '#f59e0b',
  },
  {
    id: 'make-me-cry',
    label: 'Make Me Cry',
    emoji: '😭',
    description: 'Devastating dramas and heartfelt stakes that deliver profound catharsis.',
    primaryGenres: ['drama', 'romance'],
    minRating: 8.0,
    accentColor: '#60a5fa',
  },
  {
    id: 'existential-wonder',
    label: 'Existential Wonder',
    emoji: '🌌',
    description: 'Cosmic scale, breathtaking vistas, and contemplation of humanity.',
    primaryGenres: ['sci-fi', 'drama'],
    minRating: 8.4,
    accentColor: '#06b6d4',
  },
  {
    id: 'cozy-escapism',
    label: 'Cozy Escapism',
    emoji: '☕',
    description: 'Comforting, whimsical, and heartwarming worlds to decompress and recharge.',
    primaryGenres: ['comedy', 'animation'],
    minRating: 7.5,
    accentColor: '#10b981',
  },
  {
    id: 'dark-noir',
    label: 'Dark & Gritty',
    emoji: '🌧️',
    description: 'Morally ambiguous antiheroes, brooding atmospheres, and urban realism.',
    primaryGenres: ['thriller', 'drama'],
    minRating: 8.0,
    accentColor: '#94a3b8',
  },
  {
    id: 'pure-serotonin',
    label: 'Pure Serotonin',
    emoji: '✨',
    description: 'Laugh-out-loud charm, sparkling banter, and effortless joy.',
    primaryGenres: ['comedy', 'romance', 'animation'],
    minRating: 7.5,
    accentColor: '#ec4899',
  },
  {
    id: 'spine-chilling',
    label: 'Spine-Chilling',
    emoji: '🕯️',
    description: 'Visceral dread, lingering shadows, and psychological suspense.',
    primaryGenres: ['horror', 'thriller'],
    minRating: 7.2,
    accentColor: '#ef4444',
  },
];

export default function MoodSelector({ onOpenTrailer }: MoodSelectorProps) {
  const [selectedMoodId, setSelectedMoodId] = useState<string>('mind-bending');
  const [customInput, setCustomInput] = useState<string>('');
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [moodResult, setMoodResult] = useState<CineMoodResult | null>(null);
  const [showSqlInspector, setShowSqlInspector] = useState<boolean>(false);

  const fetchMoodMovies = async (moodId?: string, customText?: string) => {
    setIsLoading(true);
    try {
      let url = '/api/mood?';
      if (customText) {
        url += `custom=${encodeURIComponent(customText)}`;
      } else if (moodId) {
        url += `mood=${encodeURIComponent(moodId)}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      if (res.ok && data.movies) {
        setMoodResult(data);
      }
    } catch (err) {
      console.error('Error fetching mood movies:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load with default mood
  useEffect(() => {
    fetchMoodMovies('mind-bending');
  }, []);

  const handleSelectPreset = (id: string) => {
    setSelectedMoodId(id);
    setIsCustomMode(false);
    setCustomInput('');
    fetchMoodMovies(id);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;
    setIsCustomMode(true);
    fetchMoodMovies(undefined, customInput.trim());
  };

  const activePreset = DEFAULT_MOODS.find((m) => m.id === selectedMoodId);

  return (
    <section className="space-y-4 rounded-2xl bg-gradient-to-b from-[#101620] to-[#0c1017] border border-[#2a3547]/50 p-5 sm:p-7 shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
      {/* Header and Protocol Identifier */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-white/[0.07]">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-[#ff6b57]/15 border border-[#ff6b57]/40 text-[#ff8f7f] flex items-center gap-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff6b57] animate-pulse" />
              CINEMOOD™ PROTOCOL
            </span>
            <span className="text-[11px] font-mono text-[#8b98aa] hidden sm:inline">
              Emotion-Based Relational Filtering
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1.5 mb-0">
            Browse by Feeling, Not Just Genres.
          </h2>
          <p className="text-xs text-[#9bb0c9] mt-1 mb-0 max-w-2xl leading-relaxed">
            Select an emotional wavelength. PostgreSQL correlates genres, runtime limits, and Bayesian rating thresholds to match your current headspace.
          </p>
        </div>

        {/* DBMS Execution Receipt Badge */}
        {moodResult && (
          <div className="flex items-center gap-2 self-start md:self-auto">
            <div className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/[0.08] flex items-center gap-2 text-[11px] font-mono text-[#a3b3c6]">
              <Database className="w-3.5 h-3.5 text-[#61d8ff]" />
              <span>
                <strong className="text-white font-semibold">{moodResult.meta.durationMs}ms</strong> query
              </span>
              <span className="text-[#3b4c65]">·</span>
              <span className="text-[#a0afc2]">{moodResult.movies.length} matches</span>
            </div>
          </div>
        )}
      </div>

      {/* Preset Mood Pills Strip */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between text-xs text-[#8b98aa] font-medium">
          <span>Curated Wavelengths</span>
          <span className="text-[11px] font-mono text-[#61d8ff]">Instant SQL Index Evaluation</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {DEFAULT_MOODS.map((mood) => {
            const isSelected = !isCustomMode && selectedMoodId === mood.id;
            return (
              <button
                key={mood.id}
                type="button"
                onClick={() => handleSelectPreset(mood.id)}
                className={`group px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all duration-200 ${
                  isSelected
                    ? 'bg-gradient-to-r from-[#1c2638] to-[#162030] text-white ring-2 ring-[#ff6b57]/80 shadow-[0_0_20px_rgba(255,107,87,0.25)]'
                    : 'bg-black/30 hover:bg-white/[0.06] text-[#b6c4d7] hover:text-white border border-white/[0.06]'
                }`}
              >
                <span className="text-base group-hover:scale-110 transition-transform">{mood.emoji}</span>
                <span>{mood.label}</span>
                {isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ff6b57] ml-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Headspace Bar */}
      <form onSubmit={handleCustomSubmit} className="relative pt-1">
        <div className="flex items-center gap-2 rounded-xl bg-black/40 border border-white/[0.08] p-1.5 focus-within:border-[#61d8ff]/60 transition-colors">
          <div className="pl-2 text-[#8b98aa]">
            <Sparkles className="w-4 h-4 text-[#61d8ff]" />
          </div>
          <input
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            placeholder="Or describe your exact feeling... (e.g., 'Rainy noir mystery with deep stakes' or 'Nostalgic 80s space journey')"
            className="flex-1 bg-transparent border-none text-xs text-white placeholder-[#6f7e94] focus:outline-none px-2 py-1"
          />
          <button
            type="submit"
            disabled={isLoading || !customInput.trim()}
            className="px-3.5 py-1.5 rounded-lg bg-[#61d8ff] hover:bg-[#85e2ff] disabled:opacity-40 text-[#080b11] text-xs font-bold flex items-center gap-1.5 transition-colors shadow-sm"
          >
            {isLoading && isCustomMode ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <span>Curate</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Curator Banner & Active Wavelength Details */}
      {moodResult && (
        <div className="rounded-xl bg-[#0a0f16]/80 border border-white/[0.06] p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-2xl sm:text-3xl p-2 rounded-xl bg-black/40 border border-white/10 shadow-inner">
                {moodResult.emoji}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white tracking-tight m-0">
                    {moodResult.moodLabel}
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.06] text-[#61d8ff]">
                    {moodResult.movies.length} Titles Found
                  </span>
                </div>
                <p className="text-xs text-[#b8c7db] mt-0.5 mb-0 italic">
                  &ldquo;{moodResult.reason}&rdquo;
                </p>
              </div>
            </div>

            {/* Matched Genre Tags & SQL toggle */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-1 text-[11px] font-mono text-[#8b98aa]">
                <span>Genres:</span>
                {moodResult.matchedGenres.map((g) => (
                  <span key={g} className="px-2 py-0.5 rounded bg-[#2a3547]/50 text-[#e2e8f0] uppercase text-[10px]">
                    {g}
                  </span>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setShowSqlInspector(!showSqlInspector)}
                className="px-2.5 py-1 rounded-lg bg-black/50 hover:bg-black/80 border border-white/10 text-[11px] font-mono text-[#61d8ff] flex items-center gap-1.5 transition-colors"
                title="Toggle SQL Query Viewer"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>SQL</span>
                {showSqlInspector ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {/* SQL Inspector Collapsible Drawer */}
          <AnimatePresence>
            {showSqlInspector && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden pt-2 border-t border-white/[0.05]"
              >
                <div className="p-3 rounded-lg bg-black/70 border border-[#2a3547]/60 font-mono text-[11px] text-[#86e1fc] space-y-1.5 overflow-x-auto">
                  <div className="flex items-center justify-between text-[10px] text-[#8b98aa] border-b border-white/[0.08] pb-1">
                    <span>LIVE POSTGRESQL QUERY EXECUTED</span>
                    <span>LATENCY: {moodResult.meta.durationMs}ms</span>
                  </div>
                  <pre className="m-0 leading-relaxed text-[#c3e88d] whitespace-pre-wrap">
                    {moodResult.meta.sql}
                  </pre>
                  {moodResult.meta.params && moodResult.meta.params.length > 0 && (
                    <div className="pt-1 text-[10px] text-[#f78c6c]">
                      Parameters: {JSON.stringify(moodResult.meta.params)}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Movie Results Screening Tray */}
      {isLoading ? (
        <div className="py-16 text-center space-y-2">
          <Loader2 className="w-6 h-6 animate-spin text-[#ff6b57] mx-auto" />
          <div className="text-xs font-mono text-[#8b98aa] tracking-wider uppercase">
            Evaluating Bayesian ranks & emotional affinities...
          </div>
        </div>
      ) : moodResult && moodResult.movies.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-3 sm:gap-4 pt-1">
          {moodResult.movies.map((movie) => (
            <div
              key={movie.movie_id}
              className="group relative rounded-xl overflow-hidden bg-[#0a0f16] border border-white/[0.08] hover:border-[#ff6b57]/50 transition-all duration-300 flex flex-col shadow-md hover:shadow-xl hover:-translate-y-1"
            >
              {/* Poster Image */}
              <div className="relative aspect-[2/3] w-full overflow-hidden bg-black">
                <img
                  src={movie.poster_url}
                  alt={movie.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 filter brightness-95 group-hover:brightness-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f16] via-transparent to-transparent opacity-80" />

                {/* Rating Badge */}
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md border border-white/10 text-[11px] font-bold text-[#ff9b83] flex items-center gap-1 shadow-sm">
                  <span>★</span>
                  <span>{Number(movie.avg_rating).toFixed(1)}</span>
                </div>

                {/* Bayesian Credibility Score */}
                {movie.bayesian_score && (
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-[#61d8ff]/20 backdrop-blur-md border border-[#61d8ff]/30 text-[9px] font-mono text-[#a5f3fc]">
                    BAYES {Number(movie.bayesian_score).toFixed(2)}
                  </div>
                )}

                {/* Quick Play Trailer Hover Action */}
                <button
                  type="button"
                  onClick={() => onOpenTrailer(movie)}
                  className="absolute inset-0 m-auto w-10 h-10 rounded-full bg-[#f3ece5]/90 hover:bg-white text-[#080b11] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg transform group-hover:scale-105"
                  aria-label="Play trailer"
                >
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </button>
              </div>

              {/* Movie Details */}
              <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                <div>
                  <Link
                    href={`/movies/${movie.movie_id}`}
                    className="text-xs sm:text-[13px] font-bold text-white hover:text-[#ff6b57] transition-colors line-clamp-1 block"
                    title={movie.title}
                  >
                    {movie.title}
                  </Link>
                  <div className="flex items-center gap-1.5 text-[10px] text-[#8b98aa] mt-0.5">
                    <span>{movie.release_date ? new Date(movie.release_date).getFullYear() : '—'}</span>
                    <span>·</span>
                    <span>{movie.runtime}m</span>
                    {movie.genres && movie.genres.length > 0 && (
                      <>
                        <span>·</span>
                        <span className="text-[#a8b8cc] truncate">{movie.genres[0].name}</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Bottom Card Actions */}
                <div className="flex items-center justify-between pt-1 border-t border-white/[0.05] text-[10px]">
                  <Link
                    href={`/movies/${movie.movie_id}`}
                    className="text-[#61d8ff] hover:underline font-medium flex items-center gap-0.5"
                  >
                    <span>View</span>
                    <ArrowRight className="w-2.5 h-2.5" />
                  </Link>

                  <Link
                    href={`/trace?movieId=${movie.movie_id}`}
                    className="text-[#ff8f7f] hover:underline font-mono"
                    title="Inspect transaction provenance"
                  >
                    Trace →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-10 text-center text-xs text-[#8b98aa] rounded-xl bg-black/20 border border-white/5 space-y-2">
          <p className="m-0">No films met this precise mood criteria.</p>
          <button
            type="button"
            onClick={() => handleSelectPreset('mind-bending')}
            className="text-[#ff6b57] hover:underline text-xs font-semibold"
          >
            Reset to Mind-Bending →
          </button>
        </div>
      )}
    </section>
  );
}
