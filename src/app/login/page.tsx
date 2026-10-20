'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

const DEMO_USERS = [
  { name: 'Alex Rivera', email: 'alex@cineverse.io', role: 'Filmmaker', initials: 'AR' },
  { name: 'Sophia Chen', email: 'sophia@cineverse.io', role: 'Film Critic', initials: 'SC' },
  { name: 'Marcus Vance', email: 'marcus@cineverse.io', role: 'Screenwriter', initials: 'MV' },
];

export default function LoginPage() {
  const { user, login, register, isLoading: isAuthLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    displayName: ''
  });

  useEffect(() => {
    if (!isAuthLoading && user) {
      router.push('/');
    }
  }, [user, isAuthLoading, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleDemoLogin = async (demoEmail: string) => {
    setError('');
    setLoading(true);
    setFormData(prev => ({ ...prev, email: demoEmail, password: 'password123' }));

    const result = await login(demoEmail, 'password123');
    setLoading(false);
    if (result.success) {
      router.push('/');
    } else {
      setError(result.error || 'Demo sign in failed');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const res = await login(formData.email, formData.password);
        if (res.success) {
          router.push('/');
        } else {
          setError(res.error || 'Sign in failed');
        }
      } else {
        const res = await register({
          username: formData.username,
          displayName: formData.displayName,
          email: formData.email,
          password: formData.password,
        });
        if (res.success) {
          router.push('/');
        } else {
          setError(res.error || 'Registration failed');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#06080d] text-[#f7f8fb] flex items-center justify-center p-4 sm:p-6 lg:p-10 font-sans selection:bg-[#26364a] selection:text-white relative">
      {/* Ambient background light */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: 'radial-gradient(ellipse at 85% 8%, rgba(58, 38, 32, 0.45), transparent 46%), radial-gradient(ellipse at 13% 95%, rgba(45, 37, 28, 0.35), transparent 45%)'
        }}
      />

      {/* Contained Framed Canvas */}
      <div className="w-full max-w-4xl bg-gradient-to-r from-[#181716] via-[#10100f] to-[#0b1018] rounded-[24px] sm:rounded-[28px] border border-[#54433c] shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative z-10">

        {/* Left Column: Atmospheric Cinema Art Panel */}
        <div className="lg:col-span-5 relative p-8 sm:p-10 flex flex-col justify-between overflow-hidden bg-[#141210] min-h-[280px] lg:min-h-full border-b lg:border-b-0 lg:border-r border-[#54433c]/40">
          <div
            className="absolute inset-0 bg-cover bg-center filter brightness-50 contrast-125 saturate-75 opacity-40 pointer-events-none"
            style={{
              backgroundImage: 'url("https://image.tmdb.org/t/p/original/8ZTVqvKDQ8emSGUEMjsS4yHAwrp.jpg")',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#141210] via-[#141210]/60 to-transparent pointer-events-none" />

          {/* Brand */}
          <div className="relative z-10">
            <div className="text-2xl font-black tracking-tight text-white flex items-baseline gap-0.5">
              <span>CINEVERSE</span>
              <span className="text-[#ff6b57]">.</span>
            </div>
            <div className="text-[10px] font-sans uppercase tracking-[2px] text-[#8b98aa] mt-1">
              The Private Screening Room
            </div>
          </div>

          <div className="relative z-10 space-y-2 max-w-xs mt-12 lg:mt-0">
            <p className="text-xs text-[#d8dee8] leading-relaxed m-0 italic">
              &ldquo;Cinema is a matter of what&apos;s in the frame and what&apos;s out.&rdquo;
            </p>
            <span className="text-[10px] text-[#718096] block font-mono">
              — Martin Scorsese
            </span>
          </div>
        </div>

        {/* Right Column: Sign In / Register Form */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-between space-y-6">
          <div className="space-y-5">
            {/* Form Mode Tabs */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight m-0">
                  {isLogin ? 'Sign in to Cineverse' : 'Create an account'}
                </h1>
                <p className="text-xs text-[#8b98aa] mt-0.5 mb-0">
                  {isLogin ? 'Access your watchlist and ratings' : 'Join our cinephile collective'}
                </p>
              </div>

              <div className="flex items-center p-1 rounded-xl bg-black/30 border border-white/5 text-xs">
                <button
                  type="button"
                  onClick={() => setIsLogin(true)}
                  className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                    isLogin ? 'bg-[#f7f8fb] text-[#080b11] font-bold shadow-sm' : 'text-[#8b98aa] hover:text-white'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setIsLogin(false)}
                  className={`px-3 py-1 rounded-lg font-semibold transition-colors ${
                    !isLogin ? 'bg-[#f7f8fb] text-[#080b11] font-bold shadow-sm' : 'text-[#8b98aa] hover:text-white'
                  }`}
                >
                  Register
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-xl bg-red-950/30 border border-red-500/30 text-xs text-red-300">
                {error}
              </div>
            )}

            {/* Quick Demo Accounts */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#718096] block">
                QUICK SIGN IN (DEMO CINEPHILES)
              </span>
              <div className="grid grid-cols-3 gap-2">
                {DEMO_USERS.map((demo) => (
                  <button
                    key={demo.email}
                    type="button"
                    onClick={() => handleDemoLogin(demo.email)}
                    disabled={loading}
                    className="p-2.5 rounded-xl bg-white/[0.03] border border-[#2a3547]/40 hover:border-[#ff6b57]/50 text-left transition-colors group flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between text-[10px] font-mono text-[#8b98aa] mb-1">
                      <span className="w-5 h-5 rounded-full bg-[#2d5f7d] text-white flex items-center justify-center font-bold text-[9px]">
                        {demo.initials}
                      </span>
                      <span className="text-[#ff6b57] group-hover:translate-x-0.5 transition-transform">→</span>
                    </div>
                    <div>
                      <strong className="text-xs font-bold text-white block truncate">
                        {demo.name}
                      </strong>
                      <span className="text-[10px] text-[#8f8075] block truncate">
                        {demo.role}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Actual Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
              {!isLogin && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-[#8b98aa] block mb-1">Display Name</label>
                    <input
                      type="text"
                      name="displayName"
                      required
                      placeholder="e.g. Alex Rivera"
                      value={formData.displayName}
                      onChange={handleChange}
                      className="w-full bg-[#0a0f16] border border-[#58463c] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff6b57]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#8b98aa] block mb-1">Username</label>
                    <input
                      type="text"
                      name="username"
                      required
                      placeholder="e.g. alex_cine"
                      value={formData.username}
                      onChange={handleChange}
                      className="w-full bg-[#0a0f16] border border-[#58463c] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff6b57]"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="text-xs font-semibold text-[#8b98aa] block mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="alex@cineverse.io"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full bg-[#0a0f16] border border-[#58463c] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#ff6b57]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#8b98aa] block mb-1">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    required
                    placeholder="password123"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full bg-[#0a0f16] border border-[#58463c] rounded-xl pl-3 pr-10 py-2 text-xs text-white focus:outline-none focus:border-[#ff6b57]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-[#8b98aa] hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-[#f7f8fb] hover:bg-white text-[#080b11] font-bold text-xs transition-colors shadow-sm disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying in PostgreSQL...</span>
                  </span>
                ) : (
                  <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                )}
              </button>
            </form>
          </div>

          <div className="text-[11px] text-[#8f8075] text-center pt-2 border-t border-white/[0.08]">
            Passwords verified via scrypt hashes &amp; signed HMAC session tokens.
          </div>
        </div>
      </div>
    </div>
  );
}
