'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Trophy,
  Star,
  ThumbsUp,
  ArrowRight,
  Sparkles,
  Users
} from 'lucide-react';
import SimilarCinephiles from '@/components/community/SimilarCinephiles';

export default function CommunityPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'matches' | 'leaderboard'>('matches');

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  return (
    <div className="space-y-6 animate-fade-in text-[#f7f8fb]">
      {/* Community Header with Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-[#101620] border border-[#2a3547]/40 shadow-lg">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[2px] text-[#ff6b57]">
            CINEVERSE SOCIAL GRAPH
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-[-1px] mt-1 m-0">
            Community & Cinephile Network
          </h1>
          <p className="text-xs text-[#8b98aa] mt-1 mb-0 max-w-xl">
            Discover fellow film lovers through relational Jaccard taste-matching, or explore the all-time cinephile leaderboard.
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/40 border border-white/10 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('matches')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'matches'
                ? 'bg-[#ff6b57] text-white shadow-sm'
                : 'text-[#8b98aa] hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Taste Matches</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('leaderboard')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              activeTab === 'leaderboard'
                ? 'bg-[#ff6b57] text-white shadow-sm'
                : 'text-[#8b98aa] hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>Leaderboard</span>
          </button>
        </div>
      </div>

      {/* Tab 1: People Taste Match Recommendations */}
      {activeTab === 'matches' && (
        <section className="space-y-6">
          <SimilarCinephiles onFollowToggled={fetchLeaderboard} />
        </section>
      )}

      {/* Tab 2: All-Time Cinephile Leaderboard */}
      {activeTab === 'leaderboard' && (
        <section className="space-y-4">
          <div className="flex items-center justify-between text-xs text-[#8b98aa] px-1">
            <span className="font-mono text-[11px]">
              Computed via PostgreSQL window function <code className="text-[#ff8f7f] font-mono">DENSE_RANK()</code> on reviews & likes
            </span>
            <span className="font-mono text-[10px] bg-black/30 border border-white/5 px-2.5 py-1 rounded-lg">
              View: v_user_leaderboard
            </span>
          </div>

          <div className="bg-[#101620] border border-[#2a3547]/40 rounded-2xl overflow-hidden shadow-lg">
            <div className="p-4 border-b border-white/[0.08] flex items-center justify-between text-xs text-[#8b98aa]">
              <span className="font-bold uppercase tracking-wider text-[10px]">Cinephile</span>
              <div className="flex items-center gap-8 font-mono text-[10px] uppercase tracking-wider">
                <span>Reviews</span>
                <span>Helpful Votes</span>
                <span className="w-12 text-right">Rank</span>
              </div>
            </div>

            {isLoading ? (
              <div className="p-12 text-center text-xs text-[#8b98aa] animate-pulse">
                Calculating window rankings in PostgreSQL...
              </div>
            ) : users.length === 0 ? (
              <div className="p-12 text-center text-xs text-[#8b98aa]">
                No member standings computed yet.
              </div>
            ) : (
              <div className="divide-y divide-white/[0.05]">
                {users.map((u, idx) => {
                  const rank = u.rank || idx + 1;
                  const isTop = rank === 1;
                  const initials = (u.display_name || u.username || 'CV')
                    .split(' ')
                    .map((n: string) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();

                  return (
                    <div
                      key={u.user_id}
                      className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
                    >
                      {/* User Profile */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        <Link href={`/profile/${u.user_id}`} className="shrink-0">
                          {u.avatar_url ? (
                            <img
                              src={u.avatar_url}
                              alt=""
                              className="w-10 h-10 rounded-full object-cover border border-[#2a3547]"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-[#2d5f7d] border border-[#5a7892] text-white flex items-center justify-center font-bold text-xs">
                              {initials}
                            </div>
                          )}
                        </Link>

                        <div className="min-w-0">
                          <Link
                            href={`/profile/${u.user_id}`}
                            className="text-sm font-bold text-white hover:text-[#ff6b57] transition-colors truncate block"
                          >
                            {u.display_name}
                          </Link>
                          <span className="text-[11px] text-[#8b98aa] truncate block">
                            @{u.username} {u.bio ? `· ${u.bio}` : ''}
                          </span>
                        </div>
                      </div>

                      {/* Stats & Rank */}
                      <div className="flex items-center gap-8 font-mono text-xs shrink-0">
                        <div className="w-12 text-right text-[#f7f8fb]">
                          {u.total_reviews}
                        </div>
                        <div className="w-16 text-right text-[#ff9b83] font-semibold">
                          {u.total_likes_received || 0}
                        </div>
                        <div className="w-12 text-right">
                          {isTop ? (
                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-[#ff6b57] text-[#1b100e] text-[11px] font-bold">
                              #1
                            </span>
                          ) : (
                            <span className="text-[#8b98aa] text-xs font-semibold">
                              #{rank}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
