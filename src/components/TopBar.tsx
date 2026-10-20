'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Search, Clock } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

interface TopBarProps {
  onOpenMobileMenu: () => void;
  onOpenSearch: () => void;
}

export default function TopBar({ onOpenMobileMenu, onOpenSearch }: TopBarProps) {
  const pathname = usePathname();
  const { user } = useAuth();

  const getBreadcrumb = () => {
    if (pathname === '/') return { section: 'Discover', sub: 'For you' };
    if (pathname.startsWith('/movies/')) return { section: 'Film Archive', sub: 'Details' };
    if (pathname === '/trace') return { section: 'CineTrace', sub: 'Provenance' };
    if (pathname === '/dbms-console') return { section: 'DB Studio', sub: 'SQL Console' };
    if (pathname === '/feed') return { section: 'Activity', sub: 'Community' };
    if (pathname === '/lists') return { section: 'Collections', sub: 'Curated' };
    if (pathname.startsWith('/lists/')) return { section: 'Collections', sub: 'Archive' };
    if (pathname === '/community') return { section: 'Community', sub: 'Leaderboard' };
    if (pathname.startsWith('/profile/')) return { section: 'Profile', sub: 'Film Taste' };
    return { section: 'Cineverse', sub: 'Cinema' };
  };

  const getInitials = (name?: string) => {
    if (!name) return 'AR';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const { section, sub } = getBreadcrumb();

  return (
    <header className="flex items-center justify-between pb-4 select-none shrink-0 border-b border-white/[0.07]">
      {/* Left Breadcrumb & Mobile Menu Trigger */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-xl bg-white/[0.04] border border-[#2a3547]/40 text-[#c7cfda] hover:text-[#f7f8fb]"
          aria-label="Open navigation menu"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="text-[11px] uppercase tracking-[0.12em] text-[#8d99aa] flex items-center gap-2">
          <strong className="font-bold text-[#f7f8fb]">{section}</strong>
          <span className="opacity-40">/</span>
          <span className="text-[#8d99aa]">{sub}</span>
        </div>
      </div>

      {/* Right Side Header Items */}
      <div className="flex items-center gap-4 text-xs text-[#ddd5ca]">
        <button
          type="button"
          onClick={onOpenSearch}
          className="lg:hidden p-2 rounded-xl bg-white/[0.04] border border-[#2a3547]/40 text-[#c7cfda] hover:text-[#f7f8fb]"
          aria-label="Search"
        >
          <Search className="w-4 h-4" />
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs text-[#8d99aa]">
          <Clock className="w-3.5 h-3.5 text-[#8d99aa]" />
          <span>Private film archive</span>
        </div>

        <span className="hidden sm:inline-block text-[#2a3547]">│</span>

        {user && (
          <Link
            href={`/profile/${user.user_id}`}
            className="w-[31px] h-[31px] rounded-full bg-[#2d5f7d] text-[#f7f8fb] border border-[#5a7892] flex items-center justify-center font-bold text-[11px] hover:opacity-90 transition-opacity"
            title={user.display_name}
          >
            {getInitials(user.display_name)}
          </Link>
        )}
      </div>
    </header>
  );
}
