'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { X, Plus, Check, LogIn, AlertCircle } from 'lucide-react';
import { Watchlist } from '@/lib/types';
import { useAuth } from '@/lib/AuthContext';

interface AddToWatchlistModalProps {
  isOpen: boolean;
  onClose: () => void;
  movieId: number;
  movieTitle: string;
}

export default function AddToWatchlistModal({ isOpen, onClose, movieId, movieTitle }: AddToWatchlistModalProps) {
  const { user } = useAuth();
  const [lists, setLists] = useState<Watchlist[]>([]);
  const [activeListIds, setActiveListIds] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      fetchLists();
    } else if (isOpen && !user) {
      setIsLoading(false);
    }
  }, [isOpen, user]);

  const fetchLists = async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/lists?userId=${user.user_id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load watchlists');
      setLists(data.lists || []);

      const active = (data.lists || []).filter((l: any) =>
        l.movies?.some((m: any) => m.movie_id === movieId)
      ).map((l: any) => l.watchlist_id);

      setActiveListIds(active);
    } catch (err: any) {
      setError(err.message || 'Error loading watchlists');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleList = async (listId: number) => {
    setIsUpdating(listId);
    setError(null);
    try {
      const isCurrentlyInList = activeListIds.includes(listId);
      const url = isCurrentlyInList
        ? `/api/lists/${listId}?movieId=${movieId}`
        : `/api/lists/${listId}`;

      const res = await fetch(url, {
        method: isCurrentlyInList ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: isCurrentlyInList ? JSON.stringify({ movieId }) : JSON.stringify({ movieId, action: 'add' }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update list');
      }

      if (isCurrentlyInList) {
        setActiveListIds(prev => prev.filter(id => id !== listId));
      } else {
        setActiveListIds(prev => [...prev, listId]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update list');
    } finally {
      setIsUpdating(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-[#1f1c1a] border border-[#2a3547] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-[#f7f8fb]">

        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">Save to List</h2>
            <p className="text-xs text-[#8b98aa] truncate max-w-[250px]">{movieTitle}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-[#8b98aa] hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-red-950/30 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="overflow-y-auto p-4 space-y-2">
          {!user ? (
            <div className="text-center py-6 space-y-3">
              <p className="text-xs text-[#8b98aa]">
                You must be signed in to add films to curated lists.
              </p>
              <Link
                href="/login"
                onClick={onClose}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#f7f8fb] hover:bg-white text-[#080b11] font-bold text-xs transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" /> Sign In
              </Link>
            </div>
          ) : isLoading ? (
            <div className="text-center py-8 text-[#8b98aa] text-xs">Loading your lists...</div>
          ) : lists.length === 0 ? (
            <div className="text-center py-8 space-y-3">
              <p className="text-[#8b98aa] text-xs">You haven't created any lists yet.</p>
              <Link
                href="/lists"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#f7f8fb] text-[#080b11] text-xs font-bold transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Create a Watchlist
              </Link>
            </div>
          ) : (
            lists.map(list => {
              const isActive = activeListIds.includes(list.watchlist_id);
              return (
                <button
                  key={list.watchlist_id}
                  onClick={() => handleToggleList(list.watchlist_id)}
                  disabled={isUpdating === list.watchlist_id}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                    isActive
                      ? 'bg-[#f7f8fb] text-[#080b11] font-bold'
                      : 'bg-black/25 text-[#f7f8fb] hover:bg-white/[0.04] border border-[#2a3547]/40'
                  }`}
                >
                  <span className="truncate text-xs font-medium">{list.name}</span>
                  {isUpdating === list.watchlist_id ? (
                    <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : isActive ? (
                    <Check className="w-4 h-4 stroke-[2.5]" />
                  ) : (
                    <Plus className="w-4 h-4 text-[#8b98aa]" />
                  )}
                </button>
              );
            })
          )}
        </div>

      </div>
    </div>
  );
}
