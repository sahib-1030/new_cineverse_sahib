'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Search, Menu, X, User, Film } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/lib/AuthContext';

export default function Navbar() {
  const { user: currentUser, logout } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/movies?search=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setSearchResults(data.movies || []);
      } catch (err) {
        console.error(err);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  return (
    <>
      <nav 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          isScrolled ? 'bg-black/80 backdrop-blur-xl border-b border-gray-900' : 'bg-transparent'
        }`}
      >
        <div className="max-w-[1600px] mx-auto px-6 sm:px-12 lg:px-24">
          <div className="flex items-center justify-between h-20">
            
            {/* Brand */}
            <Link href="/" className="text-xl font-bold tracking-tighter text-white">
              CINEVERSE.
            </Link>

            {/* Desktop Links */}
            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
              <Link href="/" className="hover:text-white transition-colors">Discover</Link>
              <Link href="/feed" className="hover:text-white transition-colors">Feed</Link>
              <Link href="/lists" className="hover:text-white transition-colors">Lists</Link>
              <Link href="/dbms-console" className="hover:text-white transition-colors">DBMS Console</Link>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsSearchOpen(true)}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <Search className="w-5 h-5" />
                <span className="hidden sm:inline-block text-xs border border-gray-800 rounded px-1.5 py-0.5">⌘K</span>
              </button>

              <div className="h-4 w-px bg-gray-800 hidden sm:block"></div>

              {currentUser ? (
                <div className="relative">
                  <button 
                    onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                    className="flex items-center gap-2 group focus:outline-none"
                  >
                    {currentUser.avatar_url ? (
                      <img src={currentUser.avatar_url} alt="Profile" className="w-8 h-8 rounded-full border border-gray-800 object-cover group-hover:border-gray-600 transition-colors" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-400 group-hover:text-white group-hover:border-gray-600 transition-colors overflow-hidden">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </button>
                  {isProfileMenuOpen && (
                    <div className="absolute right-0 mt-3 w-48 bg-black border border-gray-800 rounded-xl shadow-2xl overflow-hidden py-1">
                      <div className="px-4 py-3 border-b border-gray-900">
                        <p className="text-sm font-medium text-white truncate">{currentUser.display_name}</p>
                        <p className="text-xs text-gray-500 truncate">{currentUser.email}</p>
                      </div>
                      <Link href={`/profile/${currentUser.user_id}`} onClick={() => setIsProfileMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-900 transition-colors">
                        Profile
                      </Link>
                      <button 
                        onClick={async () => {
                          setIsProfileMenuOpen(false);
                          await logout();
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-900 transition-colors"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link href="/login" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Search Overlay */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xl flex items-start justify-center pt-20 sm:pt-32 px-4 animate-fade-in">
          <div className="w-full max-w-3xl bg-black border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[70vh]">
            
            <div className="flex items-center px-6 py-4 border-b border-gray-900">
              <Search className="w-6 h-6 text-gray-500 mr-4" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search films, directors, actors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-xl sm:text-2xl font-light text-white placeholder-gray-600 focus:outline-none"
              />
              <button 
                onClick={() => setIsSearchOpen(false)}
                className="p-2 text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {searchQuery && (
              <div className="overflow-y-auto p-2">
                {searchResults.length > 0 ? (
                  searchResults.map((m) => (
                    <button
                      key={m.movie_id}
                      onClick={() => {
                        setIsSearchOpen(false);
                        router.push(`/movies/${m.movie_id}`);
                      }}
                      className="w-full flex items-center gap-4 p-4 hover:bg-gray-900 rounded-xl transition-colors text-left"
                    >
                      {m.poster_url ? (
                        <img src={m.poster_url} alt={m.title} className="w-12 h-16 object-cover rounded" />
                      ) : (
                        <div className="w-12 h-16 bg-gray-800 rounded flex items-center justify-center">
                          <Film className="w-4 h-4 text-gray-600" />
                        </div>
                      )}
                      <div>
                        <div className="text-lg font-medium text-white">{m.title}</div>
                        <div className="text-sm text-gray-500">
                          {m.release_date ? new Date(m.release_date).getFullYear() : 'N/A'} • {m.director}
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-8 text-center text-gray-500">No results found for "{searchQuery}"</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
