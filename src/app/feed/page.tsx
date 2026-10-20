'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Clock,
  Star,
  Bookmark,
  Users,
  LogIn,
  GitBranch,
  ArrowRight
} from 'lucide-react';
import { ActivityLog } from '@/lib/types';
import { useAuth } from '@/lib/AuthContext';
import ErrorMessage from '@/components/ErrorMessage';

const FEATURED_CINEPHILES = [
  { id: 1, name: 'Alex Rivera', username: 'alex', initials: 'AR', role: 'Filmmaker & Cinephile', films: 3 },
  { id: 2, name: 'Sophia Chen', username: 'sophia', initials: 'SC', role: 'Film Critic', films: 4 },
  { id: 3, name: 'Marcus Vance', username: 'marcus', initials: 'MV', role: 'Screenwriter', films: 2 },
];

export default function FeedPage() {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [filter, setFilter] = useState<'all' | 'following'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeed = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const userParam = user ? `&userId=${user.user_id}` : '';
      const res = await fetch(`/api/feed?filter=${filter}${userParam}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load activity feed');
      }
      setActivities(data.activities || []);
    } catch (err: any) {
      setError(err.message || 'Error loading timeline');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, [filter, user]);

  const formatRelativeTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'just now';
    if (hours === 1) return '1 hour ago';
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return '1 day ago';
    return `${days} days ago`;
  };

  return (
    <div className="space-y-6 animate-fade-in text-[#f7f8fb]">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-[#101620] border border-[#2a3547]/40 shadow-lg">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[2px] text-[#ff8f7f]">
            CHRONOLOGICAL TIMELINE
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-[-1px] mt-1 m-0">
            Community Activity
          </h1>
          <p className="text-xs text-[#8b98aa] mt-1 mb-0 max-w-xl">
            Real-time screening records, review submissions, and curated collections logged in PostgreSQL.
          </p>
        </div>

        {/* Filter Switcher */}
        <div className="flex items-center p-1 rounded-xl bg-black/30 border border-[#2a3547]/40 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === 'all'
                ? 'bg-[#f7f8fb] text-[#080b11] font-bold shadow-sm'
                : 'text-[#9aa7b9] hover:text-white'
            }`}
          >
            All activity
          </button>
          <button
            type="button"
            onClick={() => setFilter('following')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === 'following'
                ? 'bg-[#f7f8fb] text-[#080b11] font-bold shadow-sm'
                : 'text-[#9aa7b9] hover:text-white'
            }`}
          >
            Following
          </button>
        </div>
      </div>

      {error && <ErrorMessage message={error} onRetry={fetchFeed} />}

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Main Feed Column */}
        <div className="lg:col-span-8 space-y-3.5">
          {filter === 'following' && !user ? (
            <div className="p-10 text-center rounded-2xl bg-[#101620] border border-[#2a3547]/40 space-y-3">
              <p className="text-xs text-[#8b98aa] m-0">Sign in to see activities from cinephiles you follow.</p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#f7f8fb] text-[#080b11] font-bold text-xs hover:bg-white transition-colors shadow-sm"
              >
                <LogIn className="w-3.5 h-3.5" /> Sign In
              </Link>
            </div>
          ) : isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-[#101620] border border-[#2a3547]/30 animate-pulse" />
            ))
          ) : activities.length === 0 ? (
            <div className="p-10 text-center rounded-2xl bg-[#101620] border border-[#2a3547]/40 space-y-2">
              <p className="text-sm font-bold text-white m-0">No activity logged in this stream yet.</p>
              <p className="text-xs text-[#8b98aa] m-0">Rate a film or follow friends to populate your timeline.</p>
            </div>
          ) : (
            activities.map((act) => {
              const meta = act.metadata || {};
              const isReview = act.activity_type === 'NEW_REVIEW';
              const isList = act.activity_type === 'CREATE_LIST';
              const isWatchlist = act.activity_type === 'WATCHLIST_ADD';
              const isFollow = act.activity_type === 'FOLLOW';

              const initials = (act.display_name || act.username || 'CV')
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase();

              return (
                <div
                  key={act.log_id}
                  className="p-4 rounded-xl bg-[#101620] border border-[#2a3547]/30 hover:border-[#2a3547]/60 transition-colors shadow-sm space-y-2.5"
                >
                  {/* Header Line */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Link href={`/profile/${act.user_id}`} className="shrink-0">
                        {act.avatar_url ? (
                          <img
                            src={act.avatar_url}
                            alt=""
                            className="w-7 h-7 rounded-full object-cover border border-[#2a3547]"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-[#2d5f7d] border border-[#5a7892] flex items-center justify-center font-bold text-[10px] text-white">
                            {initials}
                          </div>
                        )}
                      </Link>

                      <div className="truncate">
                        <Link
                          href={`/profile/${act.user_id}`}
                          className="font-bold text-white hover:text-[#ff6b57] transition-colors"
                        >
                          {act.display_name}
                        </Link>
                        <span className="text-[#8b98aa] mx-1.5">•</span>
                        <span className="text-[#8b98aa]">
                          {isReview && 'rated a film'}
                          {isList && 'created a collection'}
                          {isWatchlist && 'added to watchlist'}
                          {isFollow && 'followed a member'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-[#8f8075] shrink-0 font-mono">
                      <span>{formatRelativeTime(act.created_at)}</span>
                      {isReview && (
                        <Link
                          href={`/trace?movieId=${meta.movie_id || act.target_id}`}
                          className="text-[#ff6b57] hover:underline font-sans font-semibold text-[10px] hidden sm:inline"
                        >
                          Trace →
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Content snippet */}
                  {isReview && (
                    <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-black/25 border border-white/[0.04]">
                      <div className="flex items-center gap-3 min-w-0">
                        {act.movie_poster && (
                          <img
                            src={act.movie_poster}
                            alt=""
                            className="w-8 h-12 rounded object-cover border border-white/10 shrink-0"
                          />
                        )}
                        <div className="min-w-0">
                          <Link
                            href={`/movies/${meta.movie_id || act.target_id}`}
                            className="text-xs font-bold text-white hover:text-[#ff6b57] truncate block"
                          >
                            {act.movie_title || meta.movie_title || 'Film'}
                          </Link>
                          {meta.snippet && (
                            <p className="text-[11px] text-[#9aa7b9] italic truncate mt-0.5 m-0">
                              &ldquo;{meta.snippet}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>

                      {meta.rating && (
                        <div className="flex items-center gap-1 font-bold text-xs text-[#ff9b83] shrink-0 px-2 py-0.5 rounded bg-white/[0.04] border border-white/5">
                          <Star className="w-3 h-3 fill-current" />
                          <span>{Number(meta.rating).toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {isWatchlist && (
                    <div className="p-2.5 rounded-lg bg-black/25 border border-white/[0.04] text-xs text-[#d8dee8] flex items-center gap-2">
                      <Bookmark className="w-3.5 h-3.5 text-[#ff6b57] shrink-0" />
                      <span>Bookmarked <strong>{act.movie_title || 'a movie'}</strong> to collection</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Right Sidebar: Recommended Cinephiles */}
        <aside className="lg:col-span-4 space-y-4">
          <div className="p-5 rounded-2xl bg-[#101620] border border-[#2a3547]/40 space-y-3.5 shadow-lg">
            <div className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#718096]">
              FEATURED CINEPHILES
            </div>

            <div className="space-y-2.5">
              {FEATURED_CINEPHILES.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-[#2d5f7d] text-white border border-[#5a7892] flex items-center justify-center font-bold text-xs shrink-0">
                      {c.initials}
                    </div>
                    <div className="min-w-0">
                      <Link href={`/profile/${c.id}`} className="text-xs font-bold text-white hover:text-[#ff6b57] block truncate">
                        {c.name}
                      </Link>
                      <span className="text-[10px] text-[#8b98aa] block truncate">{c.role}</span>
                    </div>
                  </div>

                  <Link
                    href={`/profile/${c.id}`}
                    className="text-[11px] text-[#ff6b57] hover:underline font-semibold shrink-0"
                  >
                    View →
                  </Link>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-white/[0.08] text-[11px] text-[#8b98aa] leading-relaxed">
              Cineverse activity stream is powered by PostgreSQL trigger <code className="text-[#ff8f7f]">trg_log_review_activity</code>.
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
