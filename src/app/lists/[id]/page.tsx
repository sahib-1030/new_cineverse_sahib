'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  Film,
  ChevronLeft,
  Trash2,
  X,
  Share2,
  Check,
  Lock,
  Globe
} from 'lucide-react';
import { Watchlist, Movie } from '@/lib/types';
import MovieCard from '@/components/MovieCard';
import { useAuth } from '@/lib/AuthContext';
import ErrorMessage from '@/components/ErrorMessage';

export default function SingleListPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const listId = params.id as string;

  const [list, setList] = useState<Watchlist | null>(null);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeletingList, setIsDeletingList] = useState(false);
  const [removingMovieId, setRemovingMovieId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const fetchList = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/lists/${listId}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load list');
      }
      setList(data.list);
      setMovies(data.movies || []);
    } catch (err: any) {
      setError(err.message || 'Error loading list');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (listId) fetchList();
  }, [listId]);

  const isOwner = Boolean(user && list && user.user_id === list.user_id);

  const handleDeleteList = async () => {
    if (!isOwner) return;
    setIsDeletingList(true);
    try {
      const res = await fetch(`/api/lists/${listId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete list');
      }
      router.push('/lists');
    } catch (err: any) {
      setError(err.message || 'Error deleting list');
      setIsDeletingList(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleRemoveMovie = async (movieId: number) => {
    if (!isOwner) return;
    setRemovingMovieId(movieId);
    try {
      const res = await fetch(`/api/lists/${listId}?movieId=${movieId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to remove movie');
      }
      setMovies((prev) => prev.filter((m) => m.movie_id !== movieId));
    } catch (err: any) {
      setError(err.message || 'Failed to remove movie');
    } finally {
      setRemovingMovieId(null);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="text-xs font-mono tracking-widest uppercase text-[#8d99aa] animate-pulse">
          Opening collection...
        </div>
      </div>
    );
  }

  if (error || !list) {
    return (
      <div className="flex flex-col items-center justify-center p-6 space-y-4 max-w-xl mx-auto my-12 text-center text-[#f7f8fb]">
        <ErrorMessage message={error || 'List not found'} onRetry={fetchList} />
        <Link href="/lists" className="text-xs text-[#ff6b57] hover:underline flex items-center gap-1.5 font-bold">
          <ChevronLeft className="w-4 h-4" /> Return to Collections
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in text-[#f7f8fb]">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 text-xs text-[#8b98aa]">
        <Link href="/lists" className="hover:text-white flex items-center gap-1 transition-colors">
          <ChevronLeft className="w-4 h-4" />
          <span>All Collections</span>
        </Link>
        <span className="font-mono text-[11px] text-[#ff8f7f] uppercase font-bold">
          {list.is_public ? 'Public Collection' : 'Private'}
        </span>
      </div>

      {/* Collection Header Banner */}
      <div className="p-6 rounded-2xl bg-[#101620] border border-[#2a3547]/40 shadow-lg flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-2 max-w-2xl">
          <div className="text-[10px] font-bold uppercase tracking-[2px] text-[#da8e77]">
            CURATED LIST · {movies.length} FILMS
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-[-1px] m-0">
            {list.name}
          </h1>
          {list.description && (
            <p className="text-xs sm:text-[13px] text-[#d8dee8] leading-relaxed m-0">
              {list.description}
            </p>
          )}
          <div className="text-xs text-[#8b98aa] pt-1">
            Curated by{' '}
            <Link href={`/profile/${list.user_id}`} className="text-white font-semibold hover:text-[#ff6b57] transition-colors">
              {list.owner_display_name || list.owner_username || 'Member'}
            </Link>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
          <button
            type="button"
            onClick={handleShare}
            className="px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/10 hover:border-white/20 text-xs font-semibold text-[#f7f8fb] flex items-center gap-1.5 transition-colors"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Share2 className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Link copied' : 'Share'}</span>
          </button>

          {isOwner && (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="px-3.5 py-2 rounded-xl bg-red-950/20 border border-red-500/30 hover:bg-red-950/40 text-xs font-semibold text-red-300 flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete list</span>
            </button>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-[#1f1c1a] border border-[#2a3547] rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white m-0">Delete this collection?</h3>
            <p className="text-xs text-[#8b98aa] leading-relaxed m-0">
              This action will remove "{list.name}" and its relational watchlist_items from PostgreSQL. Film records will remain untouched.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleDeleteList}
                disabled={isDeletingList}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-colors"
              >
                {isDeletingList ? 'Deleting...' : 'Confirm delete'}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-xl border border-white/10 hover:bg-white/[0.04] text-xs text-[#8b98aa]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Films Shelf */}
      {movies.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#101620] border border-[#2a3547]/40 space-y-2">
          <Film className="w-8 h-8 text-[#8b98aa] mx-auto opacity-40" />
          <h3 className="text-sm font-bold text-white m-0">This collection is currently empty</h3>
          <p className="text-xs text-[#8b98aa] m-0">Browse films in Discover and use "Save to a list" to curate this collection.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3.5">
          {movies.map((movie) => (
            <div key={movie.movie_id} className="relative group">
              <MovieCard movie={movie} />
              {isOwner && (
                <button
                  type="button"
                  onClick={() => handleRemoveMovie(movie.movie_id)}
                  disabled={removingMovieId === movie.movie_id}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/80 hover:bg-red-600 text-white transition-colors opacity-0 group-hover:opacity-100 shadow-md"
                  title="Remove from list"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
