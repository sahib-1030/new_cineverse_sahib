'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Database, X, Copy, Check, ArrowUpRight, GitBranch } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function DbmsInspectorDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const pathname = usePathname();

  const [currentQueryMeta, setCurrentQueryMeta] = useState<{
    pageName: string;
    subtext: string;
    badge: string;
    sql: string;
    concepts: string[];
    explanation: string;
  }>({
    pageName: 'Discover / Trending films',
    subtext: 'Illustrative query pattern for ranking and catalog discovery.',
    badge: 'EXAMPLE SQL PATTERN',
    sql: `SELECT m.title, m.avg_rating,
       v.bayesian_score
FROM movies m
LEFT JOIN v_trending_movies v
  ON v.movie_id = m.movie_id
ORDER BY v.bayesian_score DESC NULLS LAST
LIMIT 8;`,
    concepts: ['JOIN', 'BAYESIAN PRIOR', 'VIEW'],
    explanation: 'The analytical view ranks films using weighted Bayesian smoothing before joining with the movie catalog.'
  });

  useEffect(() => {
    if (pathname === '/') {
      setCurrentQueryMeta({
        pageName: 'Discover / Trending films',
        subtext: 'Illustrative query pattern for ranking and catalog discovery.',
        badge: 'EXAMPLE SQL PATTERN',
        sql: `SELECT m.title, m.avg_rating,
       v.bayesian_score
FROM movies m
LEFT JOIN v_trending_movies v
  ON v.movie_id = m.movie_id
ORDER BY v.bayesian_score DESC NULLS LAST
LIMIT 8;`,
        concepts: ['JOIN', 'BAYESIAN PRIOR', 'VIEW'],
        explanation: 'The analytical view ranks films using weighted Bayesian smoothing before joining with the movie catalog.'
      });
    } else if (pathname?.startsWith('/movies/')) {
      setCurrentQueryMeta({
        pageName: 'Film Details & Reviews',
        subtext: 'Normalized multi-table lookup with trigger-synchronized aggregate ratings.',
        badge: 'EXAMPLE SQL PATTERN',
        sql: `SELECT m.*,
       json_agg(DISTINCT p.*) AS cast,
       json_agg(r.*) AS reviews
FROM movies m
LEFT JOIN movie_cast mc ON m.movie_id = mc.movie_id
LEFT JOIN people p ON mc.person_id = p.person_id
LEFT JOIN reviews r ON m.movie_id = r.movie_id
WHERE m.movie_id = $1
GROUP BY m.movie_id;`,
        concepts: ['3-WAY JOIN', 'JSON_AGG', 'TRIGGER SYNC'],
        explanation: 'Aggregates credits and member critiques in a single query while reading trigger-synced rating columns.'
      });
    } else if (pathname === '/trace') {
      setCurrentQueryMeta({
        pageName: 'CineTrace / Mutation Lineage',
        subtext: 'Real-time transaction provenance tracking 4 distinct database effects.',
        badge: 'LIVE PROVENANCE ENGINE',
        sql: `SELECT t.*, s.step_order, s.target_object, s.operation, s.status
FROM db_action_traces t
JOIN db_action_trace_steps s ON t.trace_id = s.trace_id
WHERE t.trace_id = $1
ORDER BY s.step_order ASC;`,
        concepts: ['TRANSACTION PROVENANCE', 'JSONB SNAPSHOTS', 'TRIGGER AUDITING'],
        explanation: 'Tracks mutation from reviews table through rating trigger, audit logging, and downstream Bayesian ranking.'
      });
    } else if (pathname === '/feed') {
      setCurrentQueryMeta({
        pageName: 'Social Activity Feed',
        subtext: 'Audit timeline populated by PostgreSQL triggers.',
        badge: 'EXAMPLE SQL PATTERN',
        sql: `SELECT al.*, u.username, u.avatar_url,
       m.title, m.poster_url
FROM activity_logs al
JOIN users u ON al.user_id = u.user_id
LEFT JOIN movies m ON al.target_id = m.movie_id
ORDER BY al.created_at DESC LIMIT 30;`,
        concepts: ['AUDIT LOG', 'TRIGGERS', 'EVENT SOURCING'],
        explanation: 'Entries are automatically logged by trg_log_review_activity and trg_log_watchlist_add triggers.'
      });
    } else if (pathname === '/community') {
      setCurrentQueryMeta({
        pageName: 'Community Leaderboard',
        subtext: 'SQL window function ranking cinephiles by reviews and helpful votes.',
        badge: 'EXAMPLE SQL PATTERN',
        sql: `SELECT u.user_id, u.username,
       COUNT(r.review_id) AS total_reviews,
       SUM(r.likes_count) AS total_likes,
       DENSE_RANK() OVER (
         ORDER BY COUNT(r.review_id) DESC,
                  SUM(r.likes_count) DESC
       ) AS rank
FROM users u
LEFT JOIN reviews r ON u.user_id = r.user_id
GROUP BY u.user_id;`,
        concepts: ['DENSE_RANK()', 'WINDOW FUNCTION', 'GROUP BY'],
        explanation: 'Evaluates community ranking using DENSE_RANK() over aggregate review and helpful vote counts.'
      });
    } else if (pathname === '/lists' || pathname?.startsWith('/lists/')) {
      setCurrentQueryMeta({
        pageName: 'Curated Collections',
        subtext: 'Many-to-many relationship with custom user ordering.',
        badge: 'EXAMPLE SQL PATTERN',
        sql: `SELECT w.watchlist_id, w.name, w.description,
       COUNT(wi.movie_id) AS movie_count,
       u.display_name AS owner_name
FROM watchlists w
JOIN users u ON w.user_id = u.user_id
LEFT JOIN watchlist_items wi ON w.watchlist_id = wi.watchlist_id
GROUP BY w.watchlist_id, u.display_name;`,
        concepts: ['MANY-TO-MANY', 'FOREIGN KEYS', 'CASCADE DELETES'],
        explanation: 'Watchlists join to movies via watchlist_items with ON DELETE CASCADE integrity.'
      });
    }
  }, [pathname]);

  const handleCopy = () => {
    navigator.clipboard.writeText(currentQueryMeta.sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Don't render floating pill on /dbms-console itself to avoid clutter
  if (pathname === '/dbms-console') return null;

  return (
    <>
      {/* Compact contextual database trigger */}
      <div className="fixed bottom-4 right-4 z-30">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="h-9 w-9 flex items-center justify-center rounded-full bg-[#0d121b]/78 hover:bg-[#192231] text-[#f7f8fb] border border-white/[0.10] shadow-[0_10px_25px_rgba(0,0,0,0.38)] backdrop-blur-md transition-all group"
          aria-label="Open Query Lens"
          title="Query Lens"
        >
          <Database className="w-3.5 h-3.5 text-[#ff6b57] group-hover:scale-110 transition-transform" />
        </button>
      </div>

      {/* Slide-over Drawer Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm animate-fade-in"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-lg bg-[#101620] border-l border-[#2a3547] h-full overflow-y-auto p-6 sm:p-7 flex flex-col justify-between shadow-2xl text-[#f7f8fb]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between pb-4 border-b border-white/[0.08]">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[2px] text-[#ff8f7f]">
                    DATABASE LENS
                  </div>
                  <h2 className="text-xl font-bold text-white tracking-tight mt-0.5 m-0">
                    Query Lens
                  </h2>
                  <p className="text-xs text-[#8b98aa] mt-0.5 m-0">
                    Contextual PostgreSQL patterns behind the current screen.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg bg-white/[0.04] text-[#8b98aa] hover:text-white"
                  aria-label="Close drawer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Current Screen Card */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-[#2a3547]/40 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold text-[#718096]">
                    Current Screen
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#162238]/30 border border-[#3b4d66]/40 text-[#b9d7ee] font-bold">
                    {currentQueryMeta.badge}
                  </span>
                </div>
                <h3 className="text-xs font-bold text-white m-0">
                  {currentQueryMeta.pageName}
                </h3>
                <p className="text-[11px] text-[#8b98aa] m-0">
                  {currentQueryMeta.subtext}
                </p>
              </div>

              {/* Relational Concepts */}
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#718096]">
                  RELATIONAL CONCEPTS
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {currentQueryMeta.concepts.map((concept, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/5 text-[11px] font-mono text-[#c9d2de]"
                    >
                      {concept}
                    </span>
                  ))}
                </div>
              </div>

              {/* Query Deconstruction */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#718096]">
                    SQL QUERY PATTERN
                  </div>
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="flex items-center gap-1 text-[11px] text-[#ff6b57] hover:underline"
                  >
                    {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy SQL'}</span>
                  </button>
                </div>
                <div className="rounded-xl bg-[#070a0f] border border-[#202b3b] p-3.5 font-mono text-xs text-[#c9d2de] overflow-x-auto leading-relaxed">
                  <pre className="whitespace-pre-wrap">{currentQueryMeta.sql}</pre>
                </div>
              </div>

              {/* What This Does */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-[#2a3547]/40 space-y-1">
                <div className="text-[10px] font-bold uppercase text-[#718096]">
                  TECHNICAL EXPLANATION
                </div>
                <p className="text-xs text-[#d8dee8] leading-relaxed m-0">
                  {currentQueryMeta.explanation}
                </p>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="pt-4 border-t border-white/[0.08] mt-6 space-y-2">
              <Link
                href="/dbms-console"
                onClick={() => setIsOpen(false)}
                className="w-full py-2.5 rounded-xl bg-[#f7f8fb] hover:bg-white text-[#080b11] text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <span>Open in DB Studio</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/trace"
                onClick={() => setIsOpen(false)}
                className="w-full py-2 rounded-xl bg-white/[0.03] border border-white/10 hover:border-white/20 text-xs font-semibold text-[#b9d7ee] flex items-center justify-center gap-2 transition-colors"
              >
                <GitBranch className="w-3.5 h-3.5 text-[#ff6b57]" />
                <span>Open CineTrace Provenance</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
