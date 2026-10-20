'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import {
  Search,
  Film,
  Sparkles,
  Terminal,
  GitBranch,
  Layers,
  Compass,
  Clock,
  Users,
  User,
  Star,
  ArrowRight,
  Database,
  Play,
  X
} from 'lucide-react';
import { Movie } from '@/lib/types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Keyboard shortcut listener
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          setSearch('');
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [isOpen, onClose]);

  // Dynamic movie search from real PostgreSQL data
  useEffect(() => {
    if (!search.trim()) {
      setMovies([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/movies?search=${encodeURIComponent(search.trim())}&limit=8`);
        if (res.ok) {
          const data = await res.json();
          setMovies(data.movies || []);
        }
      } catch (err) {
        console.error('Command palette movie search error:', err);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [search]);

  if (!isOpen) return null;

  const handleSelect = (url: string) => {
    onClose();
    router.push(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      {/* Click outside backdrop */}
      <div className="fixed inset-0" onClick={onClose} />

      <div
        className="relative w-full max-w-2xl bg-[#101620] border border-[#2a3547] rounded-2xl shadow-[0_25px_70px_rgba(0,0,0,0.85)] overflow-hidden text-[#f7f8fb] z-10 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <Command label="Command Menu" className="w-full flex flex-col">
          {/* Header Search Input */}
          <div className="flex items-center px-4 py-3.5 border-b border-[#2a3547]/60 gap-3">
            <Search className="w-5 h-5 text-[#ff6b57] shrink-0" />
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Search cinema, workbenches, critics, or type a command..."
              className="flex-1 bg-transparent border-0 text-sm text-[#f7f8fb] placeholder-[#8c7f73] focus:outline-none font-sans"
              autoFocus
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="text-[#8b98aa] hover:text-white p-1 rounded hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <kbd className="hidden sm:inline-flex items-center text-[10px] font-mono px-2 py-0.5 rounded bg-[#221f1c] border border-[#2a3547] text-[#8b98aa]">
              ESC
            </kbd>
          </div>

          {/* Scrollable Command Body */}
          <Command.List className="max-h-[60vh] overflow-y-auto p-2 space-y-2 text-xs">
            <Command.Empty className="py-8 text-center text-[#8b98aa] font-mono text-xs">
              {isLoading ? 'Searching database...' : 'No matching films or commands found.'}
            </Command.Empty>

            {/* Quick Navigation / Workstations */}
            <Command.Group
              heading="WORKSTATIONS & TOOLS"
              className="text-[10px] font-mono uppercase tracking-wider text-[#ff6b57] px-2 py-1 font-bold"
            >
              <Command.Item
                onSelect={() => handleSelect('/countercut')}
                className="flex items-center justify-between px-3 py-2 rounded-xl text-[#f7f8fb] hover:bg-[#221f1c] hover:text-[#ff6b57] cursor-pointer transition-colors group select-none"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#ff6b57]/15 border border-[#ff6b57]/30 flex items-center justify-center text-[#ff6b57]">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-sm block">The Countercut Studio</span>
                    <span className="text-[11px] text-[#8b98aa] block">
                      Multi-step agentic taste investigation & opponent discovery
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-[#8b98aa] group-hover:text-white">
                  /countercut
                </span>
              </Command.Item>

              <Command.Item
                onSelect={() => handleSelect('/trace')}
                className="flex items-center justify-between px-3 py-2 rounded-xl text-[#f7f8fb] hover:bg-[#221f1c] hover:text-[#ff6b57] cursor-pointer transition-colors group select-none"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <GitBranch className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-sm block">CineTrace Provenance Replay</span>
                    <span className="text-[11px] text-[#8b98aa] block">
                      Inspect review mutations through live PostgreSQL rows & triggers
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-[#8b98aa] group-hover:text-white">
                  /trace
                </span>
              </Command.Item>

              <Command.Item
                onSelect={() => handleSelect('/dbms-console')}
                className="flex items-center justify-between px-3 py-2 rounded-xl text-[#f7f8fb] hover:bg-[#221f1c] hover:text-[#ff6b57] cursor-pointer transition-colors group select-none"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Database className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="font-bold text-sm block">DB Studio — Query Workbench & IDE</span>
                    <span className="text-[11px] text-[#8b98aa] block">
                      Full SQL editor, schema explorer, trigger lab & ER diagram
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-[#8b98aa] group-hover:text-white">
                  /dbms-console
                </span>
              </Command.Item>
            </Command.Group>

            {/* Core Destinations */}
            <Command.Group
              heading="CINEMA ARCHIVE"
              className="text-[10px] font-mono uppercase tracking-wider text-[#8b98aa] px-2 py-1 font-bold pt-2 border-t border-[#2a3547]/40"
            >
              <Command.Item
                onSelect={() => handleSelect('/')}
                className="flex items-center justify-between px-3 py-2 rounded-xl text-[#f7f8fb] hover:bg-[#221f1c] hover:text-white cursor-pointer transition-colors select-none"
              >
                <div className="flex items-center gap-2.5">
                  <Compass className="w-4 h-4 text-[#8b98aa]" />
                  <span>Discover / Screening Room</span>
                </div>
                <span className="text-[10px] font-mono text-[#8b98aa]">/</span>
              </Command.Item>

              <Command.Item
                onSelect={() => handleSelect('/lists')}
                className="flex items-center justify-between px-3 py-2 rounded-xl text-[#f7f8fb] hover:bg-[#221f1c] hover:text-white cursor-pointer transition-colors select-none"
              >
                <div className="flex items-center gap-2.5">
                  <Layers className="w-4 h-4 text-[#8b98aa]" />
                  <span>Curated Film Collections</span>
                </div>
                <span className="text-[10px] font-mono text-[#8b98aa]">/lists</span>
              </Command.Item>

              <Command.Item
                onSelect={() => handleSelect('/feed')}
                className="flex items-center justify-between px-3 py-2 rounded-xl text-[#f7f8fb] hover:bg-[#221f1c] hover:text-white cursor-pointer transition-colors select-none"
              >
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-[#8b98aa]" />
                  <span>Live Activity Feed</span>
                </div>
                <span className="text-[10px] font-mono text-[#8b98aa]">/feed</span>
              </Command.Item>

              <Command.Item
                onSelect={() => handleSelect('/community')}
                className="flex items-center justify-between px-3 py-2 rounded-xl text-[#f7f8fb] hover:bg-[#221f1c] hover:text-white cursor-pointer transition-colors select-none"
              >
                <div className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-[#8b98aa]" />
                  <span>Community Critics & Leaderboard</span>
                </div>
                <span className="text-[10px] font-mono text-[#8b98aa]">/community</span>
              </Command.Item>
            </Command.Group>

            {/* Dynamic Real Film Results */}
            {movies.length > 0 && (
              <Command.Group
                heading={`MATCHING FILMS (${movies.length})`}
                className="text-[10px] font-mono uppercase tracking-wider text-[#ff6b57] px-2 py-1 font-bold pt-2 border-t border-[#2a3547]/40"
              >
                {movies.map((m) => (
                  <Command.Item
                    key={m.movie_id}
                    onSelect={() => handleSelect(`/movies/${m.movie_id}`)}
                    className="flex items-center justify-between px-3 py-2 rounded-xl hover:bg-[#221f1c] text-[#f7f8fb] cursor-pointer transition-colors group select-none"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {m.poster_url ? (
                        <img
                          src={m.poster_url}
                          alt=""
                          className="w-8 h-11 object-cover rounded bg-black/40 border border-[#2a3547] shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-11 rounded bg-[#221f1c] border border-[#2a3547] flex items-center justify-center shrink-0">
                          <Film className="w-4 h-4 text-[#8b98aa]" />
                        </div>
                      )}
                      <div className="truncate">
                        <div className="font-bold text-sm text-white group-hover:text-[#ff6b57] transition-colors truncate">
                          {m.title}
                        </div>
                        <div className="text-[11px] text-[#8b98aa] flex items-center gap-2">
                          <span className="text-[#ff6b57] font-bold">
                            ★ {Number(m.avg_rating || 0).toFixed(1)}
                          </span>
                          <span>•</span>
                          <span>{m.release_date ? new Date(m.release_date).getFullYear() : 'Cinema'}</span>
                          {m.genres && m.genres.length > 0 && (
                            <>
                              <span>•</span>
                              <span>{m.genres[0].name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-[11px] font-mono text-[#ff6b57]">Open</span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#ff6b57]" />
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Critics & Seed Personas */}
            <Command.Group
              heading="CRITICS & PROFILES"
              className="text-[10px] font-mono uppercase tracking-wider text-[#8b98aa] px-2 py-1 font-bold pt-2 border-t border-[#2a3547]/40"
            >
              <Command.Item
                onSelect={() => handleSelect('/profile/1')}
                className="flex items-center justify-between px-3 py-2 rounded-xl text-[#f7f8fb] hover:bg-[#221f1c] hover:text-white cursor-pointer transition-colors select-none"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-[#ff6b57]/20 border border-[#ff6b57]/40 flex items-center justify-center text-[10px] font-bold text-[#ff6b57]">
                    AR
                  </div>
                  <div>
                    <span className="font-bold block">Alex Rivera</span>
                    <span className="text-[10px] text-[#8b98aa]">Active Screening Critic (You)</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-[#8b98aa]">User #1</span>
              </Command.Item>

              <Command.Item
                onSelect={() => handleSelect('/profile/4')}
                className="flex items-center justify-between px-3 py-2 rounded-xl text-[#f7f8fb] hover:bg-[#221f1c] hover:text-white cursor-pointer transition-colors select-none"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-[10px] font-bold text-cyan-400">
                    ER
                  </div>
                  <div>
                    <span className="font-bold block">Elena Rostov</span>
                    <span className="text-[10px] text-[#8b98aa]">Sound Designer & Countercut Opponent</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-[#8b98aa]">User #4</span>
              </Command.Item>
            </Command.Group>
          </Command.List>

          {/* Footer Navigation Hints */}
          <div className="p-3 border-t border-[#2a3547]/50 bg-[#080c12] flex items-center justify-between text-[11px] font-mono text-[#8b98aa]">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-[#221f1c] border border-[#2a3547] text-[#f7f8fb]">↑</kbd>
                <kbd className="px-1.5 py-0.5 rounded bg-[#221f1c] border border-[#2a3547] text-[#f7f8fb]">↓</kbd>
                <span>Navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-[#221f1c] border border-[#2a3547] text-[#f7f8fb]">↵</kbd>
                <span>Select</span>
              </span>
            </div>
            <div className="text-[10px] text-[#ff6b57] font-semibold">
              CINEVERSE CMD WORKBENCH
            </div>
          </div>
        </Command>
      </div>
    </div>
  );
}
