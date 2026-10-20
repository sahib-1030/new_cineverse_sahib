'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Film,
  X,
  Check,
  Search,
  ArrowRight
} from 'lucide-react';
import { Watchlist, Movie } from '@/lib/types';
import { useAuth } from '@/lib/AuthContext';
import ErrorMessage from '@/components/ErrorMessage';

export default function ListsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [lists, setLists] = useState<Watchlist[]>([]);
  const [allMovies, setAllMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form State
  const [listName, setListName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedMovieIds, setSelectedMovieIds] = useState<number[]>([]);
  const [movieSearch, setMovieSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchLists = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/lists');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load watchlists');
      setLists(data.lists || []);
    } catch (err: any) {
      setError(err.message || 'Error loading watchlists');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMovies = async () => {
    try {
      const res = await fetch('/api/movies?limit=50');
      const data = await res.json();
      setAllMovies(data.movies || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchLists();
    fetchMovies();
  }, []);

  const toggleMovieSelection = (movieId: number) => {
    setSelectedMovieIds((prev) =>
      prev.includes(movieId) ? prev.filter((id) => id !== movieId) : [...prev, movieId]
    );
  };

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!listName.trim()) return;

    if (!user) {
      router.push('/login');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.user_id,
          name: listName.trim(),
          description: description.trim(),
          movieIds: selectedMovieIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to assemble list');
      }

      setIsCreateModalOpen(false);
      setListName('');
      setDescription('');
      setSelectedMovieIds([]);
      fetchLists();
    } catch (err: any) {
      setSubmitError(err.message || 'Error saving collection');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-[#f7f8fb]">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-[#101620] border border-[#2a3547]/40 shadow-lg">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[2px] text-[#ff8f7f]">
            CURATED ARCHIVE
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-[-1px] mt-1 m-0">
            Collections
          </h1>
          <p className="text-xs text-[#8b98aa] mt-1 mb-0 max-w-xl">
            Thematic film selections and bespoke watchlists assembled by the Cineverse community.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (!user) {
              router.push('/login');
            } else {
              setIsCreateModalOpen(true);
            }
          }}
          className="px-4 py-2.5 rounded-xl bg-[#f7f8fb] hover:bg-white text-[#080b11] font-bold text-xs flex items-center gap-2 shadow-sm transition-colors shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create a list</span>
        </button>
      </div>

      {error && <ErrorMessage message={error} onRetry={fetchLists} />}

      {/* Collections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-72 rounded-2xl bg-[#101620] border border-[#2a3547]/30 animate-pulse" />
          ))
        ) : lists.length === 0 ? (
          <div className="col-span-full p-12 text-center rounded-2xl bg-[#101620] border border-[#2a3547]/40 space-y-2">
            <Film className="w-8 h-8 text-[#8b98aa] mx-auto opacity-40" />
            <h3 className="text-sm font-bold text-white m-0">No collections curated yet</h3>
            <p className="text-xs text-[#8b98aa] m-0">Be the first to curate a cinematic watchlist for the community.</p>
          </div>
        ) : (
          lists.map((list) => {
            const previewMovies = list.movies?.slice(0, 3) || [];
            const curatorInitials = (list.owner_display_name || list.owner_username || 'CU')
              .split(' ')
              .map(n => n[0])
              .slice(0, 2)
              .join('')
              .toUpperCase();

            return (
              <div
                key={list.watchlist_id}
                className="group flex flex-col justify-between rounded-2xl bg-[#101620] border border-[#2a3547]/40 hover:border-[#ff6b57]/40 transition-all p-5 shadow-sm overflow-hidden"
              >
                <div>
                  {/* Layered Poster Stack */}
                  <div className="relative h-44 w-full mb-4 rounded-xl bg-black/40 border border-[#2a3547]/30 flex items-center justify-center overflow-hidden">
                    {previewMovies.length > 0 ? (
                      <div className="relative w-full h-full flex items-center justify-center">
                        {previewMovies.map((m, idx) => {
                          const offsets = [
                            'z-30 translate-x-0 scale-100 shadow-xl',
                            'z-20 -translate-x-10 rotate-[-5deg] scale-90 opacity-80',
                            'z-10 translate-x-10 rotate-[5deg] scale-90 opacity-80',
                          ];
                          return (
                            <img
                              key={m.movie_id}
                              src={m.poster_url || 'https://image.tmdb.org/t/p/w500/9gk7adHYeDvHkCSEhniE9iAOhHP.jpg'}
                              alt={m.title}
                              className={`absolute w-22 h-34 rounded-lg object-cover border border-white/10 transition-transform duration-300 group-hover:scale-105 ${offsets[idx] || 'hidden'}`}
                            />
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center text-[#7f7360] text-xs font-mono">
                        0 films in list
                      </div>
                    )}
                  </div>

                  {/* Header & Badges */}
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#8b98aa] mb-1.5">
                    <span className="uppercase text-[#ff6b57] font-bold">
                      {list.is_public ? 'Public' : 'Private'}
                    </span>
                    <span>{list.movie_count || previewMovies.length} films</span>
                  </div>

                  <Link href={`/lists/${list.watchlist_id}`}>
                    <h2 className="text-base font-bold text-white group-hover:text-[#ff6b57] transition-colors truncate m-0">
                      {list.name}
                    </h2>
                  </Link>

                  {list.description && (
                    <p className="text-xs text-[#8b98aa] line-clamp-2 mt-1 leading-relaxed m-0">
                      {list.description}
                    </p>
                  )}
                </div>

                {/* Curator Line */}
                <div className="pt-4 border-t border-white/[0.08] mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-[#2d5f7d] border border-[#5a7892] text-white flex items-center justify-center font-bold text-[9px] shrink-0">
                      {curatorInitials}
                    </div>
                    <span className="text-xs text-[#c7cfda] truncate">
                      {list.owner_display_name || list.owner_username || 'Curator'}
                    </span>
                  </div>

                  <Link
                    href={`/lists/${list.watchlist_id}`}
                    className="text-xs text-[#ff6b57] hover:underline font-semibold flex items-center gap-1 shrink-0"
                  >
                    <span>View list</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create List Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg bg-[#1f1c1a] border border-[#2a3547] rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
              <h2 className="text-base font-bold text-white m-0">Curate New Collection</h2>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-[#8b98aa] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {submitError && (
              <div className="p-3 rounded-lg bg-red-950/30 border border-red-500/30 text-xs text-red-300">
                {submitError}
              </div>
            )}

            <form onSubmit={handleCreateList} className="space-y-4 overflow-y-auto flex-1 pr-1">
              <div>
                <label className="text-xs font-semibold text-[#8b98aa] block mb-1 uppercase tracking-wider">
                  Collection Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Essential 70s Neo-Noir"
                  value={listName}
                  onChange={(e) => setListName(e.target.value)}
                  className="w-full bg-[#0a0f16] border border-[#58463c] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff6b57]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#8b98aa] block mb-1 uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="A short note explaining the thematic thread..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#0a0f16] border border-[#58463c] rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#ff6b57] resize-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-[#8b98aa] uppercase tracking-wider">
                    Add Films ({selectedMovieIds.length} selected)
                  </label>
                  <span className="text-[10px] text-[#8b98aa]">Click posters to add</span>
                </div>

                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#8b98aa]" />
                  <input
                    type="text"
                    placeholder="Search available catalog..."
                    value={movieSearch}
                    onChange={(e) => setMovieSearch(e.target.value)}
                    className="w-full bg-[#0a0f16] border border-[#58463c] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#7f7360] focus:outline-none focus:border-[#ff6b57]"
                  />
                </div>

                <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1 bg-black/20 rounded-xl border border-white/5">
                  {allMovies
                    .filter(m => m.title.toLowerCase().includes(movieSearch.toLowerCase()))
                    .slice(0, 16)
                    .map(m => {
                      const isSelected = selectedMovieIds.includes(m.movie_id);
                      return (
                        <button
                          key={m.movie_id}
                          type="button"
                          onClick={() => toggleMovieSelection(m.movie_id)}
                          className={`relative aspect-[2/3] rounded-lg overflow-hidden border transition-all ${
                            isSelected
                              ? 'border-[#ff6b57] ring-2 ring-[#ff6b57]/50'
                              : 'border-white/10 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img src={m.poster_url} alt="" className="w-full h-full object-cover" />
                          {isSelected && (
                            <div className="absolute inset-0 bg-[#ff6b57]/30 flex items-center justify-center">
                              <Check className="w-4 h-4 text-white font-bold" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !listName.trim()}
                className="w-full py-2.5 rounded-xl bg-[#f7f8fb] hover:bg-white text-[#080b11] font-bold text-xs transition-colors shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? 'Assembling in database...' : 'Publish Collection'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
