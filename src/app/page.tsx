'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Play, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Movie } from '@/lib/types';
import TrailerModal from '@/components/TrailerModal';
import CinemaShelf from '@/components/discover/CinemaShelf';
import MoodSelector from '@/components/discover/MoodSelector';

const DAYS = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'] as const;

export default function Home() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTrailerOpen, setIsTrailerOpen] = useState(false);
  const [activeTrailerMovie, setActiveTrailerMovie] = useState<Movie | null>(null);
  const [recentEvent, setRecentEvent] = useState<any>(null);
  const [isRecentEventVisible, setIsRecentEventVisible] = useState(false);

  useEffect(() => {
    const fetchMoviesAndEvent = async () => {
      try {
        const [moviesRes, eventRes] = await Promise.all([
          fetch('/api/movies?sortBy=trending&limit=30'),
          fetch('/api/feed?limit=1'),
        ]);

        const moviesData = await moviesRes.json();
        if (moviesData.movies && moviesData.movies.length > 0) {
          setMovies(moviesData.movies);
        }

        const eventData = await eventRes.json();
        if (eventData.activities && eventData.activities.length > 0) {
          setRecentEvent(eventData.activities[0]);
          setIsRecentEventVisible(true);
        }
      } catch (err) {
        console.error('Failed to load discover data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMoviesAndEvent();
  }, []);

  useEffect(() => {
    if (!recentEvent || !isRecentEventVisible) return;
    const timer = window.setTimeout(() => setIsRecentEventVisible(false), 6500);
    return () => window.clearTimeout(timer);
  }, [recentEvent, isRecentEventVisible]);

  // Selection logic matching 01-new-discover.png:
  // Inception as feature hero, Blade Runner 2049 & Interstellar as tall cards
  const heroMovie = movies.find(m => m.title.toLowerCase().includes('inception')) || movies[0] || null;
  const remaining = movies.filter(m => m.movie_id !== heroMovie?.movie_id);
  const sideMovie1 = remaining.find(m => m.title.toLowerCase().includes('blade runner')) || remaining[0] || null;
  const sideMovie2 = remaining.find(m => m.title.toLowerCase().includes('interstellar') && m.movie_id !== sideMovie1?.movie_id) || remaining.find(m => m.movie_id !== sideMovie1?.movie_id) || null;

  const handleOpenTrailer = (movie: Movie) => {
    setActiveTrailerMovie(movie);
    setIsTrailerOpen(true);
  };

  // Day of week edition label
  const todayEdition = `${DAYS[new Date().getDay()]} EDITION`;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-xs font-mono tracking-widest uppercase text-[#8d99aa] animate-pulse">
          Opening screening room...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7 animate-fade-in text-[#f7f8fb]">
      {/* Editorial Lead Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pt-1">
        <div>
          <h1 className="text-[32px] sm:text-[40px] xl:text-[46px] font-black text-[#f7f8fb] tracking-[-0.055em] leading-[0.98] m-0 max-w-2xl">
            Find the film that ruins your sleep.
          </h1>
          <p className="text-sm text-[#98a5b6] mt-2.5 mb-0">
            One unforgettable pick. No endless scroll.
          </p>
        </div>
        <div className="text-[11px] font-sans font-bold tracking-[1.1px] text-[#8491a2] flex items-center gap-1.5 self-start sm:self-auto">
          <span>{todayEdition}</span>
          <span className="text-[#ff6b57]">●</span>
        </div>
      </div>

      {/* Hero Grid Module: Feature Card + 2 Tall Cards */}
      {heroMovie && (
        <section className="grid grid-cols-1 lg:grid-cols-[2.6fr_0.78fr_0.78fr] gap-3 lg:h-[390px]">
          {/* Main Landscape Feature Card */}
          <div className="relative rounded-[14px] overflow-hidden border border-white/[0.12] bg-[#0a0f16] flex flex-col justify-end group shadow-[0_24px_70px_rgba(0,0,0,0.45)] p-6 sm:p-8 min-h-[340px] lg:min-h-0">
            {/* Backdrop Artwork */}
            <div className="absolute inset-0 z-0">
              <img
                src={heroMovie.backdrop_url || heroMovie.poster_url}
                alt={heroMovie.title}
                className="w-full h-full object-cover object-right contrast-110 saturate-110 opacity-90 group-hover:scale-[1.035] transition-transform duration-1000 ease-out"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#06080df8] via-[#06080dc7] to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#06080d] via-transparent to-transparent" />
              <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-[#61d8ff]/50 to-[#ff6b57]/60" />
            </div>

            {/* Feature Copy */}
            <div className="relative z-10 max-w-xl space-y-3">
              <h2 className="text-4xl sm:text-5xl lg:text-[56px] font-black uppercase text-white tracking-[-2px] leading-none m-0">
                {heroMovie.title}
              </h2>

              <div className="flex flex-wrap items-center gap-2.5 text-xs text-[#c7d0dc]">
                <span className="font-bold text-[#ff9b83]">
                  ★ {Number(heroMovie.avg_rating || 9.6).toFixed(1)}
                </span>
                <span>•</span>
                <span>{heroMovie.release_date ? new Date(heroMovie.release_date).getFullYear() : '2010'}</span>
                {heroMovie.genres && heroMovie.genres.length > 0 && (
                  <>
                    <span>•</span>
                    <span>{heroMovie.genres.map(g => g.name).slice(0, 2).join(' / ')}</span>
                  </>
                )}
                {heroMovie.runtime && (
                  <>
                    <span>•</span>
                    <span>{heroMovie.runtime} min</span>
                  </>
                )}
              </div>

              {heroMovie.overview && (
                <p className="text-xs sm:text-[13px] text-[#d8dee8] line-clamp-2 leading-[1.5] max-w-md">
                  {heroMovie.overview}
                </p>
              )}

              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleOpenTrailer(heroMovie)}
                  className="px-4 py-2.5 rounded-[9px] bg-[#f3ece5] hover:bg-white text-[#080b11] text-xs font-bold flex items-center gap-2 shadow-sm transition-colors"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Play the trailer</span>
                </button>
                <Link
                  href={`/movies/${heroMovie.movie_id}`}
                  className="px-4 py-2.5 rounded-[9px] bg-white/[0.08] hover:bg-white/[0.14] border border-white/20 text-[#f5f0ea] text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <span>Open film →</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Tall Card 1 */}
          {sideMovie1 && (
            <Link
              href={`/movies/${sideMovie1.movie_id}`}
              className="relative rounded-[14px] overflow-hidden border border-white/[0.11] bg-[#0d121b] group shadow-lg min-h-[220px] lg:min-h-0 block lg:rotate-[0.6deg] hover:rotate-0 transition-transform duration-500"
            >
              <img
                src={sideMovie1.poster_url}
                alt={sideMovie1.title}
                className="w-full h-full object-cover filter brightness-[0.78] saturate-[0.88] group-hover:scale-105 group-hover:brightness-95 transition-all duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#05070bdc] via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-4 left-3.5 right-3.5 z-10">
                <h3 className="text-[15px] font-bold text-white tracking-tight leading-snug mb-1 truncate">
                  {sideMovie1.title}
                </h3>
                <p className="text-[11px] text-[#c3cbd7] m-0 flex items-center gap-1">
                  <span className="text-[#ff9b83] font-semibold">★ {Number(sideMovie1.avg_rating || 9.8).toFixed(1)}</span>
                  <span>·</span>
                  <span>{sideMovie1.genres?.[0]?.name || (sideMovie1.director || 'Cinema')}</span>
                </p>
              </div>
            </Link>
          )}

          {/* Tall Card 2 */}
          {sideMovie2 && (
            <Link
              href={`/movies/${sideMovie2.movie_id}`}
              className="relative rounded-[14px] overflow-hidden border border-white/[0.11] bg-[#0d121b] group shadow-lg min-h-[220px] lg:min-h-0 block lg:-rotate-[0.45deg] hover:rotate-0 transition-transform duration-500"
            >
              <img
                src={sideMovie2.poster_url}
                alt={sideMovie2.title}
                className="w-full h-full object-cover filter brightness-[0.78] saturate-[0.88] group-hover:scale-105 group-hover:brightness-95 transition-all duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#05070bdc] via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-4 left-3.5 right-3.5 z-10">
                <h3 className="text-[15px] font-bold text-white tracking-tight leading-snug mb-1 truncate">
                  {sideMovie2.title}
                </h3>
                <p className="text-[11px] text-[#c3cbd7] m-0 flex items-center gap-1">
                  <span className="text-[#ff9b83] font-semibold">★ {Number(sideMovie2.avg_rating || 9.7).toFixed(1)}</span>
                  <span>·</span>
                  <span>{sideMovie2.genres?.[0]?.name || (sideMovie2.director || 'Cinema')}</span>
                </p>
              </div>
            </Link>
          )}
        </section>
      )}

      {/* CineMood Emotion-Based Relational Discovery */}
      <MoodSelector onOpenTrailer={handleOpenTrailer} />

      {/* Interactive Living Cinema Shelf */}
      <CinemaShelf
        movies={remaining}
        onOpenTrailer={handleOpenTrailer}
      />

      {/* Dynamic Action / Trace Dock (Appears when genuine recent activity exists) */}
      <AnimatePresence>
      {recentEvent && isRecentEventVisible && (
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          className="fixed bottom-5 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[650px] min-h-[54px] rounded-xl bg-[#0c121b]/94 border border-white/[0.12] shadow-[0_18px_55px_rgba(0,0,0,0.55)] backdrop-blur-xl hidden sm:flex items-center gap-3 px-3.5 py-2.5 z-40"
        >
          {recentEvent.movie_poster && (
            <img
              src={recentEvent.movie_poster}
              alt=""
              className="w-7 h-7 rounded object-cover shrink-0 border border-white/10"
            />
          )}
          <div className="min-w-0 flex-1 truncate">
            <strong className="text-[11px] text-[#f7f8fb] font-bold block truncate">
              {recentEvent.display_name || recentEvent.username} rated {recentEvent.movie_title || 'a film'}
            </strong>
            <em className="text-[10px] text-[#8d99aa] not-italic block truncate">
              That rating just moved through PostgreSQL.
            </em>
          </div>
          <span className="hidden md:inline-block text-[11px] text-[#9aa7b9] shrink-0">
            See the ripple
          </span>
          <Link
            href={`/trace?movieId=${recentEvent.target_id || ''}`}
            className="px-3 py-1.5 rounded-[7px] bg-[#ff6b57] hover:bg-[#e07f69] text-white text-[11px] font-bold shrink-0 transition-colors shadow-sm"
          >
            Trace action →
          </Link>
          <button
            type="button"
            onClick={() => setIsRecentEventVisible(false)}
            className="p-1.5 rounded-md text-[#738095] hover:text-white hover:bg-white/[0.06] transition-colors"
            aria-label="Dismiss activity"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}
      </AnimatePresence>

      {/* Trailer Modal */}
      <TrailerModal
        isOpen={isTrailerOpen}
        onClose={() => setIsTrailerOpen(false)}
        trailerUrl={activeTrailerMovie?.trailer_url}
        title={activeTrailerMovie?.title || ''}
      />
    </div>
  );
}
