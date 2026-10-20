'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Compass,
  Clock,
  Layers,
  Users,
  Terminal,
  Search,
  MoreHorizontal,
  LogOut,
  User as UserIcon,
  Sparkles,
  GitBranch,
  Bookmark,
  Split
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

interface SidebarProps {
  onOpenSearch: () => void;
  onCloseMobile?: () => void;
}

export default function Sidebar({ onOpenSearch, onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout, login } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/' && pathname === '/') return true;
    if (path !== '/' && pathname.startsWith(path)) return true;
    return false;
  };

  const getInitials = (name?: string) => {
    if (!name) return 'AR';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const navItemClass = (active: boolean) => `
    relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 select-none
    ${active
      ? 'bg-white/[0.07] text-white border border-white/[0.10] shadow-[inset_3px_0_0_#ff6b57] font-semibold'
      : 'text-[#aeb8c6] hover:text-white hover:bg-white/[0.04] border border-transparent'
    }
  `;

  return (
    <aside className="w-full h-full flex flex-col justify-between text-[#f7f8fb] select-none">
      <div className="space-y-6">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-2 pt-1">
          <Link
            href="/"
            onClick={onCloseMobile}
            className="flex items-center gap-0.5 group"
          >
            <span className="text-[22px] font-black tracking-[-0.075em] text-[#f7f8fb] group-hover:text-white transition-colors">
              CINEVERSE
            </span>
            <span className="text-[22px] font-black text-[#ff6b57]">.</span>
          </Link>
        </div>

        {/* Search Trigger Input */}
        <div className="px-1">
          <button
            type="button"
            onClick={onOpenSearch}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/[0.025] hover:bg-white/[0.055] border border-white/[0.08] text-left text-xs text-[#8d99aa] hover:text-[#f7f8fb] transition-colors group"
          >
            <div className="flex items-center gap-2.5 truncate">
              <Search className="w-3.5 h-3.5 text-[#8d99aa] group-hover:text-[#f7f8fb]" />
              <span className="truncate">Search films, people...</span>
            </div>
            <kbd className="text-[10px] font-mono text-[#8d99aa] border border-[#2a3547]/60 rounded px-1.5 py-0.5 group-hover:border-[#826b59] transition-colors shrink-0">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Nav Section: EXPLORE */}
        <div className="space-y-1">
          <div className="px-3 text-[10px] font-sans uppercase tracking-[2px] text-[#718096] font-bold mb-2">
            Explore
          </div>
          <Link
            href="/"
            onClick={onCloseMobile}
            className={navItemClass(isActive('/'))}
          >
            <Compass className={`w-4 h-4 shrink-0 ${isActive('/') ? 'text-[#ff6b57]' : 'text-[#8290a4]'}`} />
            <span>Discover</span>
          </Link>

          <Link
            href="/feed"
            onClick={onCloseMobile}
            className={navItemClass(isActive('/feed'))}
          >
            <Clock className={`w-4 h-4 shrink-0 ${isActive('/feed') ? 'text-[#ff6b57]' : 'text-[#8290a4]'}`} />
            <span>Activity</span>
          </Link>

          <Link
            href="/lists"
            onClick={onCloseMobile}
            className={navItemClass(isActive('/lists'))}
          >
            <Layers className={`w-4 h-4 shrink-0 ${isActive('/lists') ? 'text-[#ff6b57]' : 'text-[#8290a4]'}`} />
            <span>Collections</span>
          </Link>

          <Link
            href="/community"
            onClick={onCloseMobile}
            className={navItemClass(isActive('/community'))}
          >
            <Users className={`w-4 h-4 shrink-0 ${isActive('/community') ? 'text-[#ff6b57]' : 'text-[#8290a4]'}`} />
            <span>Community</span>
          </Link>
        </div>

        {/* Nav Section: DATABASE */}
        <div className="space-y-1">
          <div className="px-3 text-[10px] font-sans uppercase tracking-[2px] text-[#718096] font-bold mb-2">
            Database
          </div>
          <Link
            href="/trace"
            onClick={onCloseMobile}
            className={navItemClass(isActive('/trace'))}
          >
            <GitBranch className={`w-4 h-4 shrink-0 ${isActive('/trace') ? 'text-[#ff6b57]' : 'text-[#8290a4]'}`} />
            <span>CineTrace</span>
          </Link>

          <Link
            href="/dbms-console"
            onClick={onCloseMobile}
            className={navItemClass(isActive('/dbms-console'))}
          >
            <Terminal className={`w-4 h-4 shrink-0 ${isActive('/dbms-console') ? 'text-[#ff6b57]' : 'text-[#8290a4]'}`} />
            <span>DB Studio</span>
          </Link>

          <Link
            href="/countercut"
            onClick={onCloseMobile}
            className={navItemClass(isActive('/countercut'))}
          >
            <Split className={`w-4 h-4 shrink-0 ${isActive('/countercut') ? 'text-[#ff6b57]' : 'text-[#8290a4]'}`} />
            <span>Countercut</span>
          </Link>
        </div>
      </div>

      {/* User Card at Bottom */}
      <div className="pt-4 border-t border-white/[0.08] relative">
        {user ? (
          <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.025] border border-white/[0.08]">
            <Link
              href={`/profile/${user.user_id}`}
              onClick={onCloseMobile}
              className="flex items-center gap-2.5 min-w-0 flex-1 hover:opacity-90 transition-opacity"
            >
              <div className="w-8 h-8 rounded-full bg-[linear-gradient(135deg,#ff6b57,#8b7cff)] text-white border border-white/20 flex items-center justify-center font-bold text-xs shrink-0 tracking-wider">
                {getInitials(user.display_name)}
              </div>
              <div className="min-w-0 flex-1 text-left">
                <div className="text-xs font-semibold text-[#f7f8fb] truncate">
                  {user.display_name}
                </div>
                <div className="text-[11px] text-[#8793a4] truncate">
                  Your profile →
                </div>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1.5 text-[#8793a4] hover:text-[#f7f8fb] hover:bg-white/[0.05] rounded-lg transition-colors ml-1 shrink-0"
              aria-label="User menu"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-[#f7f8fb] hover:bg-white text-[#080b11] text-xs font-bold transition-colors"
          >
            <span>Sign In</span>
          </Link>
        )}

        {/* Profile Dropdown Menu */}
        {isMenuOpen && user && (
          <div className="absolute bottom-16 left-0 right-0 p-1.5 rounded-2xl bg-[#121924] border border-[#2a3547] shadow-2xl space-y-1 z-50 animate-fade-in text-xs">
            <Link
              href={`/profile/${user.user_id}`}
              onClick={() => { setIsMenuOpen(false); onCloseMobile?.(); }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-[#f7f8fb] hover:bg-white/[0.05] transition-colors"
            >
              <UserIcon className="w-3.5 h-3.5 text-[#9aa7b9]" />
              <span>View Profile</span>
            </Link>

            <button
              type="button"
              onClick={async () => {
                setIsMenuOpen(false);
                const nextEmail = user.email === 'alex@cineverse.io' ? 'sophia@cineverse.io' : 'alex@cineverse.io';
                await login(nextEmail, 'password123');
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[#f7f8fb] hover:bg-white/[0.05] transition-colors text-left"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#ff6b57]" />
              <span>Switch Demo Profile</span>
            </button>

            <div className="h-px bg-white/[0.08] my-1" />

            <button
              type="button"
              onClick={async () => {
                setIsMenuOpen(false);
                await logout();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[#ff5c75] hover:bg-[#ff5c75]/10 transition-colors text-left"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
