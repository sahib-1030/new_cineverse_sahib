'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import CommandPalette from './CommandPalette';
import DbmsInspectorDrawer from './DbmsInspectorDrawer';
import { X } from 'lucide-react';

function AppShellContent({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isLoginPage = pathname === '/login';

  // Keyboard shortcut Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Auth redirection in useEffect
  useEffect(() => {
    if (!isLoading && !user && !isLoginPage) {
      router.push('/login');
    }
  }, [isLoading, user, isLoginPage, router]);

  // Login page: render children directly
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Loading state
  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-[#06080d] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#2a3547] border-t-[#ff6b57] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#06080d] text-[#f7f8fb] p-0 sm:p-3 lg:p-4 flex flex-col items-center justify-center font-sans selection:bg-[#ff6b57] selection:text-[#070a0f] relative overflow-hidden">
      {/* Projector beams and chromatic edge light */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: 'radial-gradient(ellipse at 84% -8%, rgba(97,216,255,0.10), transparent 38%), radial-gradient(ellipse at 6% 108%, rgba(139,124,255,0.11), transparent 42%), linear-gradient(112deg, transparent 62%, rgba(255,107,87,0.035) 80%, transparent 92%)'
        }}
      />

      {/* Contained Framed Application Workspace */}
      <div className="w-full max-w-[1600px] h-screen sm:h-[calc(100vh-1.5rem)] lg:h-[calc(100vh-2rem)] max-h-[1040px] bg-[linear-gradient(115deg,#0d121b_0%,#080c12_48%,#0a0f17_100%)] rounded-none sm:rounded-[24px] border-0 sm:border border-white/[0.11] flex flex-col lg:flex-row overflow-hidden shadow-[0_32px_120px_rgba(0,0,0,0.72)] relative z-10">

        {/* Desktop Left Rail Sidebar */}
        <div className="hidden lg:flex w-[224px] xl:w-[236px] bg-[#0b1018]/95 border-r border-white/[0.08] shrink-0 p-5 overflow-y-auto">
          <Sidebar onOpenSearch={() => setIsSearchOpen(true)} />
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="w-[280px] max-w-[84vw] h-full bg-[#0b1018] border-r border-white/[0.10] p-5 overflow-y-auto relative">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="absolute top-4 right-4 p-2 text-[#8d99aa] hover:text-[#f7f8fb] rounded-lg"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
              <Sidebar
                onOpenSearch={() => { setIsMobileMenuOpen(false); setIsSearchOpen(true); }}
                onCloseMobile={() => setIsMobileMenuOpen(false)}
              />
            </div>
            <div
              className="flex-1"
              onClick={() => setIsMobileMenuOpen(false)}
            />
          </div>
        )}

        {/* Main Screening Content Area */}
        <main className="flex-1 h-full overflow-y-auto bg-transparent px-4 sm:px-7 lg:px-8 xl:px-9 py-4 sm:py-5 flex flex-col relative">
          <TopBar
            onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
            onOpenSearch={() => setIsSearchOpen(true)}
          />

          <div className="flex-1 pt-3 pb-8">
            {children}
          </div>
        </main>
      </div>

      {/* Global Command Palette & Lens */}
      <CommandPalette
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
      <DbmsInspectorDrawer />
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppShellContent>{children}</AppShellContent>
    </AuthProvider>
  );
}
