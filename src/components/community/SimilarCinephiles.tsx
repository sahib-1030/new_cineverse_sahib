'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Sparkles, 
  UserPlus, 
  UserCheck, 
  Film, 
  Flame, 
  Star,
  Users,
  Compass
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { RecommendedUser } from '@/lib/types';

interface SimilarCinephilesProps {
  onFollowToggled?: () => void;
}

export default function SimilarCinephiles({ onFollowToggled }: SimilarCinephilesProps) {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<RecommendedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [followingMap, setFollowingMap] = useState<Record<number, boolean>>({});
  const [loadingFollowId, setLoadingFollowId] = useState<number | null>(null);
  const [isColdStart, setIsColdStart] = useState(false);

  const fetchRecommendations = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/users/recommendations?userId=${user.user_id}`);
      const data = await res.json();
      if (data.recommendations) {
        setRecommendations(data.recommendations);
        setIsColdStart(Boolean(data.isColdStart));
        
        // initialize following map to false
        const initialMap: Record<number, boolean> = {};
        data.recommendations.forEach((u: RecommendedUser) => {
          initialMap[u.user_id] = false;
        });
        setFollowingMap(initialMap);
      }
    } catch (err) {
      console.error('Failed to fetch kindred spirits:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [user]);

  const handleToggleFollow = async (targetUserId: number) => {
    if (!user) return;
    setLoadingFollowId(targetUserId);

    try {
      const res = await fetch(`/api/users/${targetUserId}/follow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentUserId: user.user_id }),
      });
      const data = await res.json();
      if (res.ok) {
        setFollowingMap(prev => ({
          ...prev,
          [targetUserId]: data.isFollowing,
        }));

        setRecommendations(prev =>
          prev.map(rec => {
            if (rec.user_id === targetUserId) {
              return {
                ...rec,
                followers_count: data.followersCount,
              };
            }
            return rec;
          })
        );

        onFollowToggled?.();
      }
    } catch (err) {
      console.error('Follow toggle failed:', err);
    } finally {
      setLoadingFollowId(null);
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'CV';
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  if (!user) {
    return (
      <div className="p-6 rounded-2xl bg-[#101620] border border-[#2a3547]/40 shadow-lg text-center space-y-3">
        <Sparkles className="w-8 h-8 text-[#ff6b57] mx-auto animate-pulse" />
        <h3 className="text-base font-bold text-white">Find Your Film Taste Twins</h3>
        <p className="text-xs text-[#8b98aa] max-w-md mx-auto">
          Sign in to match with cinephiles who share your favorite genres, director obsessions, and rating patterns.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#ff6b57] hover:bg-[#e05845] text-white text-xs font-bold transition-colors"
        >
          Sign in to explore
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-2xl bg-[#101620] border border-[#2a3547]/40 shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[2px] text-[#ff6b57] flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" />
              TASTE MATCH ENGINE
            </span>
            {isColdStart && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-[#9aa7b9] border border-white/10">
                Rate films to personalize
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-[-0.04em] m-0">
            Kindred Spirits & Cinephiles to Follow
          </h2>
          <p className="text-xs text-[#8b98aa] m-0 max-w-xl">
            {isColdStart
              ? 'Top active community reviewers with high taste overlap. Rate more films to compute your exact Jaccard similarity vector!'
              : 'Ranked by Jaccard taste overlap on genres and high-rating affinities in PostgreSQL.'}
          </p>
        </div>

        <button
          onClick={fetchRecommendations}
          disabled={isLoading}
          className="self-start sm:self-auto px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-xs text-[#9aa7b9] hover:text-white font-medium transition-colors flex items-center gap-1.5 shrink-0"
        >
          <Compass className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Matches</span>
        </button>
      </div>

      {/* Grid of Recommendations */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="p-5 rounded-2xl bg-[#101620]/60 border border-white/[0.06] animate-pulse space-y-4 min-h-[170px]"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-white/[0.05]" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-white/[0.08] rounded w-2/3" />
                  <div className="h-3 bg-white/[0.04] rounded w-1/3" />
                </div>
              </div>
              <div className="h-3 bg-white/[0.04] rounded w-full" />
            </div>
          ))}
        </div>
      ) : recommendations.length === 0 ? (
        <div className="p-8 rounded-2xl bg-[#101620] border border-white/[0.06] text-center space-y-2">
          <p className="text-sm text-white font-medium">You’re already following all your top taste matches!</p>
          <p className="text-xs text-[#8b98aa]">
            Check out the leaderboard or explore new releases to expand your network.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {recommendations.map(rec => {
            const isFollowing = followingMap[rec.user_id];
            const isToggling = loadingFollowId === rec.user_id;
            const initials = getInitials(rec.display_name || rec.username);
            const similarityPercent = rec.similarity_pct || Math.round((rec.similarity_score || 0.6) * 100);

            return (
              <div
                key={rec.user_id}
                className="relative flex flex-col justify-between p-5 rounded-2xl bg-[#101620] hover:bg-[#121924] border border-[#2a3547]/50 hover:border-[#ff6b57]/40 transition-all duration-300 shadow-lg group"
              >
                {/* Header row: Avatar, Name, and Match Pill */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <Link
                      href={`/profile/${rec.user_id}`}
                      className="flex items-center gap-3 min-w-0 group/profile"
                    >
                      {rec.avatar_url ? (
                        <img
                          src={rec.avatar_url}
                          alt={rec.display_name}
                          className="w-12 h-12 rounded-full object-cover border border-[#2a3547] group-hover/profile:border-[#ff6b57] transition-colors shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-[linear-gradient(135deg,#2d5f7d,#192231)] border border-[#5a7892] text-white flex items-center justify-center font-bold text-sm shrink-0">
                          {initials}
                        </div>
                      )}

                      <div className="min-w-0">
                        <h4 className="text-sm font-bold text-white group-hover/profile:text-[#ff6b57] transition-colors truncate m-0">
                          {rec.display_name}
                        </h4>
                        <span className="text-[11px] text-[#8b98aa] truncate block">
                          @{rec.username}
                        </span>
                      </div>
                    </Link>

                    {/* Similarity Score Pill */}
                    <div className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#ff6b57]/10 border border-[#ff6b57]/25 text-[#ff8f7f] text-[11px] font-bold">
                      <Flame className="w-3 h-3 text-[#ff6b57] fill-[#ff6b57]" />
                      <span>{similarityPercent}% Match</span>
                    </div>
                  </div>

                  {/* Bio */}
                  {rec.bio && (
                    <p className="text-xs text-[#9aa7b9] line-clamp-2 leading-relaxed mb-3 m-0">
                      {rec.bio}
                    </p>
                  )}

                  {/* Shared Genres Chips */}
                  {rec.shared_genre_names && rec.shared_genre_names.length > 0 && (
                    <div className="mb-4 space-y-1.5">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-[#718096] flex items-center gap-1">
                        <Film className="w-3 h-3" />
                        <span>Mutual Taste Focus</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {rec.shared_genre_names.slice(0, 3).map((genre: string) => (
                          <span
                            key={genre}
                            className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-[10px] font-medium text-[#c3cbd7]"
                          >
                            {genre}
                          </span>
                        ))}
                        {rec.shared_genre_names.length > 3 && (
                          <span className="px-1.5 py-0.5 rounded-md bg-white/[0.02] text-[10px] text-[#718096]">
                            +{rec.shared_genre_names.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Row: Quick Stats & Follow Button */}
                <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between gap-2 mt-2">
                  <div className="flex items-center gap-3 text-[11px] text-[#8b98aa] font-mono">
                    <span title="Total Reviews" className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-[#ff9b83]" />
                      <span>{rec.total_reviews} reviews</span>
                    </span>
                    <span>·</span>
                    <span title="Followers" className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>{rec.followers_count}</span>
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleFollow(rec.user_id)}
                    disabled={isToggling}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 shrink-0 ${
                      isFollowing
                        ? 'bg-white/[0.08] hover:bg-[#ff5c75]/15 text-[#9aa7b9] hover:text-[#ff5c75] border border-white/10 hover:border-[#ff5c75]/30'
                        : 'bg-[#ff6b57] hover:bg-[#e05845] text-white shadow-sm shadow-[#ff6b57]/20 hover:scale-[1.02]'
                    }`}
                  >
                    {isFollowing ? (
                      <>
                        <UserCheck className="w-3.5 h-3.5 text-white" />
                        <span>Following</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5 text-white" />
                        <span>Follow</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
