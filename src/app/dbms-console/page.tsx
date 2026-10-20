'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import InteractiveErDiagram from '@/components/InteractiveErDiagram';
import MonacoSqlEditor from '@/components/dbms/MonacoSqlEditor';
import InteractiveDataGrid from '@/components/dbms/InteractiveDataGrid';
import QueryJourney from '@/components/dbms/QueryJourney';
import {
  Terminal,
  Play,
  Layers,
  Clock,
  Copy,
  Download,
  Table as TableIcon,
  Code2,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  RotateCcw,
  GitBranch,
  Search,
  ExternalLink,
  Film
} from 'lucide-react';

const PRESET_QUERIES = [
  {
    name: 'v_trending_movies (Bayesian weighted prior)',
    sql: `SELECT
    m.title,
    m.avg_rating,
    m.review_count,
    v.bayesian_score
FROM movies m
LEFT JOIN v_trending_movies v ON m.movie_id = v.movie_id
ORDER BY v.bayesian_score DESC NULLS LAST
LIMIT 8;`
  },
  {
    name: 'Multi-Table JOIN with Aggregation (Movies, Genres, Reviews)',
    sql: `SELECT
    m.title,
    m.director,
    m.avg_rating,
    COUNT(r.review_id) AS total_reviews,
    string_agg(DISTINCT g.name, ', ') AS genres
FROM movies m
JOIN movie_genres mg ON m.movie_id = mg.movie_id
JOIN genres g ON mg.genre_id = g.genre_id
LEFT JOIN reviews r ON m.movie_id = r.movie_id
GROUP BY m.movie_id, m.title, m.director, m.avg_rating
HAVING COUNT(r.review_id) > 0
ORDER BY m.avg_rating DESC;`
  },
  {
    name: 'Window Function: Leaderboard with DENSE_RANK()',
    sql: `SELECT
    u.user_id,
    u.username,
    u.display_name,
    COUNT(r.review_id) AS reviews_written,
    COALESCE(SUM(r.likes_count), 0) AS total_helpful_votes,
    COALESCE(ROUND(AVG(r.rating), 2), 0) AS avg_score_given,
    DENSE_RANK() OVER (ORDER BY COUNT(r.review_id) DESC, COALESCE(SUM(r.likes_count), 0) DESC) AS rank
FROM users u
LEFT JOIN reviews r ON u.user_id = r.user_id
GROUP BY u.user_id, u.username, u.display_name
ORDER BY rank ASC;`
  },
  {
    name: 'PL/pgSQL Function: fn_get_user_analytics(1)',
    sql: `SELECT fn_get_user_analytics(1) AS user_1_analytics;`
  },
  {
    name: 'PL/pgSQL Procedure: fn_recommend_movies(1, 5)',
    sql: `SELECT * FROM fn_recommend_movies(1, 5);`
  },
  {
    name: 'Information Schema: Relational Foreign Keys',
    sql: `SELECT
    tc.table_name AS source_table,
    kcu.column_name AS fk_column,
    ccu.table_name AS target_table,
    ccu.column_name AS target_column
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
ORDER BY tc.table_name;`
  }
];

export default function DbmsConsolePage() {
  const [activeTab, setActiveTab] = useState<'query' | 'schema' | 'triggers' | 'functions'>('query');
  const [sql, setSql] = useState(PRESET_QUERIES[0].sql);
  const allowWrite = false; // Public SQL workbench is read-only
  const [isExecuting, setIsExecuting] = useState(false);
  const [queryResults, setQueryResults] = useState<{
    columns: string[];
    rows: any[];
    rowCount?: number;
    durationMs?: number;
  } | null>(null);
  const [executionError, setExecutionError] = useState<string | null>(null);
  const [schemaData, setSchemaData] = useState<any>(null);
  const [tableFilter, setTableFilter] = useState('');
  const [selectedTable, setSelectedTable] = useState<string>('movies');
  const [copiedSql, setCopiedSql] = useState(false);
  const [resultsView, setResultsView] = useState<'grid' | 'journey'>('grid');
  const [moviesList, setMoviesList] = useState<any[]>([]);
  const [selectedMovieId, setSelectedMovieId] = useState<number | null>(1);
  const [contextualMovie, setContextualMovie] = useState<{
    movieId: number;
    title: string;
    posterUrl: string;
    avgRating: number | string;
    director: string;
    reviewCount?: number;
    bayesianScore?: number;
  }>({
    movieId: 1,
    title: 'Inception',
    posterUrl: 'https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg',
    avgRating: 9.6,
    director: 'Christopher Nolan',
    reviewCount: 14,
    bayesianScore: 9.42,
  });

  // Trigger Lab test state
  const [triggerMovieId, setTriggerMovieId] = useState('1');
  const [triggerScore, setTriggerScore] = useState('9.8');
  const [triggerTestResult, setTriggerTestResult] = useState<any>(null);
  const [isTestingTrigger, setIsTestingTrigger] = useState(false);

  const handleSelectMovie = (id: number | null, title?: string) => {
    const found = moviesList.find(m => (id !== null && m.movie_id === id) || (title && m.title.toLowerCase() === title.toLowerCase()));
    setSelectedMovieId(found?.movie_id ?? id);
    if (found) {
      setContextualMovie({
        movieId: found.movie_id,
        title: found.title,
        posterUrl: found.poster_url || 'https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg',
        avgRating: found.avg_rating,
        director: found.director,
        reviewCount: found.review_count,
        bayesianScore: found.bayesian_score,
      });
    } else if (title) {
      setContextualMovie(prev => ({
        ...prev,
        movieId: id ?? 0,
        title,
      }));
    }
  };

  // Load live schema and engine metadata
  useEffect(() => {
    fetch('/api/dbms/schema')
      .then(r => r.json())
      .then(data => {
        setSchemaData(data);
      })
      .catch(console.error);

    fetch('/api/movies?limit=50')
      .then(r => r.json())
      .then(data => {
        if (data.movies) {
          setMoviesList(data.movies);
        }
      })
      .catch(console.error);

    // Initial query execution
    handleExecute(PRESET_QUERIES[0].sql);
  }, []);

  const handleExecute = async (sqlToRun?: string) => {
    const code = sqlToRun || sql;
    setIsExecuting(true);
    setExecutionError(null);
    try {
      const res = await fetch('/api/dbms/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: code, allowWrite }),
      });
      const data = await res.json();
      if (!data.success) {
        setExecutionError(data.error || 'Execution failed');
        setQueryResults(null);
      } else {
        setQueryResults(data);
        if (data.rows && data.rows.length > 0) {
          const first = data.rows[0];
          const mid = first.movie_id ? Number(first.movie_id) : null;
          const mtitle = first.title || null;
          if (mid || mtitle) {
            handleSelectMovie(mid, mtitle);
          }
        }
      }
    } catch (err: any) {
      setExecutionError(err.message || 'Network request failed');
      setQueryResults(null);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 1500);
  };

  const handleExportCsv = () => {
    if (!queryResults || !queryResults.rows || queryResults.rows.length === 0) return;
    const cols = queryResults.columns;
    const csvRows = [
      cols.join(','),
      ...queryResults.rows.map(row =>
        cols.map(col => {
          const val = row[col];
          if (val === null || val === undefined) return '';
          const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
          return `"${str.replace(/"/g, '""')}"`;
        }).join(',')
      )
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cineverse_query_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleTestTrigger = async () => {
    setIsTestingTrigger(true);
    try {
      const res = await fetch('/api/dbms/test-trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movieId: parseInt(triggerMovieId, 10),
          rating: parseFloat(triggerScore),
        }),
      });
      const data = await res.json();
      setTriggerTestResult(data);
    } catch (err: any) {
      setTriggerTestResult({ error: err.message });
    } finally {
      setIsTestingTrigger(false);
    }
  };

  const tablesList = schemaData?.tables ? Object.keys(schemaData.tables) : [
    'movies', 'reviews', 'users', 'movie_genres', 'genres',
    'watchlists', 'watchlist_items', 'activity_logs', 'review_likes',
    'follows', 'people', 'movie_cast', 'app_meta', 'db_action_traces'
  ];

  const filteredTables = tablesList.filter(t =>
    t.toLowerCase().includes(tableFilter.toLowerCase())
  );

  const engineLabel = schemaData?.engine?.label || 'POSTGRESQL 16 ENGINE';

  return (
    <div className="space-y-4 animate-fade-in text-[#f7f8fb]">
      {/* Engine status */}
      <div className="flex items-center justify-end border-b border-white/[0.07] pb-3 text-xs text-[#8d99aa]">
        <div className="flex items-center gap-2">
          <span className="border border-emerald-400/25 rounded-full text-emerald-300 bg-emerald-400/[0.06] px-3 py-1 text-[10px] uppercase tracking-[0.12em] font-bold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{engineLabel}</span>
          </span>
        </div>
      </div>

      {/* Heading & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-[32px] sm:text-[40px] font-black text-[#f7f8fb] tracking-[-0.055em] leading-none m-0">
            The database has a pulse.
          </h1>
          <p className="text-sm text-[#98a5b6] mt-2 mb-0">
            Write SQL. Watch every title, review, and ranking answer back.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 bg-[#101620] p-1 rounded-xl border border-[#2a3547]/50 self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('query')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'query'
                ? 'bg-[#f7f8fb] text-[#080b11] font-bold shadow-sm'
                : 'text-[#9aa7b9] hover:text-white'
            }`}
          >
            Query
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('schema')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'schema'
                ? 'bg-[#f7f8fb] text-[#080b11] font-bold shadow-sm'
                : 'text-[#9aa7b9] hover:text-white'
            }`}
          >
            Schema
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('triggers')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'triggers'
                ? 'bg-[#f7f8fb] text-[#080b11] font-bold shadow-sm'
                : 'text-[#9aa7b9] hover:text-white'
            }`}
          >
            Triggers
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('functions')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'functions'
                ? 'bg-[#f7f8fb] text-[#080b11] font-bold shadow-sm'
                : 'text-[#9aa7b9] hover:text-white'
            }`}
          >
            Functions & views
          </button>
        </div>
      </div>

      {/* TAB 1: QUERY (DB STUDIO 3-PANE WORKSPACE) */}
      {activeTab === 'query' && (
        <div className="grid grid-cols-1 lg:grid-cols-[215px_1fr_270px] gap-0 min-h-[600px] rounded-[14px] overflow-hidden border border-white/[0.10] bg-[#080c12]">
          {/* Left Column: Schema Browser */}
          <div className="bg-[#0d131d] border-r border-white/[0.08] p-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="text-sm font-bold text-white tracking-tight">
                Schema browser
              </div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#7f8c9f]" />
                <input
                  type="text"
                  placeholder="Filter tables..."
                  value={tableFilter}
                  onChange={(e) => setTableFilter(e.target.value)}
                  className="w-full bg-[#0a0f16] border border-[#303d51] rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-[#f7f8fb] placeholder-[#7f8c9f] focus:outline-none focus:border-[#ff6b57]"
                />
              </div>

              {/* Table List */}
              <div className="space-y-1 max-h-[380px] overflow-y-auto pr-1">
                {filteredTables.map(tableName => {
                  const cols = schemaData?.tables?.[tableName]?.length || 0;
                  const isSelected = selectedTable === tableName;
                  return (
                    <button
                      key={tableName}
                      type="button"
                      onClick={() => {
                        setSelectedTable(tableName);
                        setSql(`SELECT * FROM ${tableName} LIMIT 10;`);
                        handleExecute(`SELECT * FROM ${tableName} LIMIT 10;`);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium text-left transition-colors ${
                        isSelected
                          ? 'bg-[#25384e]/60 text-white font-semibold'
                          : 'text-[#b8c2d0] hover:text-white hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-[#8492a4] font-mono text-[10px]">▦</span>
                        <span className="truncate">{tableName}</span>
                      </div>
                      {cols > 0 && (
                        <span className="text-[10px] font-mono text-[#8492a4] shrink-0">
                          {cols} cols
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-3 border-t border-white/[0.08] text-[10px] text-[#758399] font-mono">
              Public schema · {tablesList.length} core tables
            </div>
          </div>

          {/* Center Column: SQL Editor & Results Table */}
          <div className="flex flex-col gap-0 min-w-0 border-r border-white/[0.08]">
            {/* Editor Box */}
            <div className="bg-[#080c12] border-0 border-b border-white/[0.08] flex flex-col overflow-hidden h-[330px]">
              {/* Editor Header Bar */}
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#2a3749] bg-black/20 text-xs">
                <div className="flex items-center gap-3">
                  <strong className="text-white font-bold text-xs">query_01.sql</strong>
                  <span className="text-[10px] text-[#758399]">● unsaved</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="hidden sm:inline text-[10px] font-mono text-[#758399]">
                    ⌘↵ to run
                  </span>
                  <button
                    type="button"
                    onClick={handleCopySql}
                    className="text-[11px] text-[#c7cfda] hover:text-white flex items-center gap-1 transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedSql ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Presets Bar */}
              <div className="px-4 py-1.5 bg-[#080c12] border-b border-[#2a3749]/60 flex items-center gap-2">
                <span className="text-[10px] font-bold text-[#8190a3] uppercase tracking-wider shrink-0">
                  Preset:
                </span>
                <select
                  onChange={(e) => {
                    const preset = PRESET_QUERIES.find(p => p.name === e.target.value);
                    if (preset) {
                      setSql(preset.sql);
                      handleExecute(preset.sql);
                    }
                  }}
                  className="bg-transparent text-xs text-[#ff6b57] focus:outline-none w-full cursor-pointer truncate"
                >
                  {PRESET_QUERIES.map(p => (
                    <option key={p.name} value={p.name} className="bg-[#0b1018] text-[#f7f8fb]">
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Monaco SQL Editor Component */}
              <div className="flex-1 p-2 bg-[#080c12]">
                <MonacoSqlEditor
                  value={sql}
                  onChange={setSql}
                  onRun={() => handleExecute()}
                  height="210px"
                />
              </div>

              {/* Editor Footer Bar */}
              <div className="flex items-center justify-between px-3.5 py-2 border-t border-white/[0.08] bg-black/20 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled
                    title="Arbitrary writes are disabled; use Trigger Lab for a controlled demonstration"
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                      allowWrite
                        ? 'bg-amber-950/60 border border-amber-600/50 text-amber-300'
                        : 'bg-white/[0.03] border border-white/10 text-[#758399]'
                    }`}
                  >
                    <span>{allowWrite ? '⚠️ Write Mode enabled' : '♢ Read-only mode'}</span>
                  </button>
                  <span className="hidden md:inline text-[11px] text-[#758399]">
                    · Live PostgreSQL API
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleExecute(`EXPLAIN ${sql}`)}
                    disabled={isExecuting}
                    className="px-3 py-1.5 rounded-lg border border-[#2b384b] hover:bg-white/[0.04] text-[11px] text-[#b8c2d0] transition-colors"
                  >
                    EXPLAIN
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExecute()}
                    disabled={isExecuting}
                    className="px-4 py-1.5 rounded-lg bg-[#ff6b57] hover:bg-[#e07f69] text-white text-[11px] font-bold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Run query</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Results Box with View Toggle (Grid vs Query Journey) */}
            <div className="bg-[#0a0f16] border-0 flex flex-col overflow-hidden min-h-[290px] flex-1">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#2b384b] bg-black/20 text-xs">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-[#080c12] p-0.5 rounded-lg border border-[#2a3547]/60">
                    <button
                      type="button"
                      onClick={() => setResultsView('grid')}
                      className={`px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                        resultsView === 'grid'
                          ? 'bg-[#f7f8fb] text-[#080b11] font-bold shadow-sm'
                          : 'text-[#9aa7b9] hover:text-white'
                      }`}
                    >
                      Result Grid
                    </button>
                    <button
                      type="button"
                      onClick={() => setResultsView('journey')}
                      className={`px-2.5 py-1 rounded text-xs font-semibold transition-all flex items-center gap-1 ${
                        resultsView === 'journey'
                          ? 'bg-[#f7f8fb] text-[#080b11] font-bold shadow-sm'
                          : 'text-[#9aa7b9] hover:text-white'
                      }`}
                    >
                      <Sparkles className="w-3 h-3 text-[#ff6b57]" />
                      <span>Query Journey</span>
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {queryResults && (
                    <span className="text-[11px] text-[#758399] font-mono">
                      {queryResults.rows?.length || 0} rows · {queryResults.durationMs || 0}ms
                    </span>
                  )}
                </div>
              </div>

              {/* Content Panel: Grid or Flow */}
              <div className="p-3 flex-1 overflow-auto">
                {executionError ? (
                  <div className="p-4 bg-red-950/20 border-l-4 border-red-500 rounded text-xs text-red-200 font-mono space-y-1">
                    <strong className="block text-red-400 font-bold">Query Error:</strong>
                    <div>{executionError}</div>
                  </div>
                ) : resultsView === 'journey' ? (
                  <QueryJourney
                    sql={sql}
                    rowCount={queryResults?.rowCount ?? queryResults?.rows?.length ?? 0}
                    durationMs={queryResults?.durationMs || 12}
                    columns={queryResults?.columns || []}
                  />
                ) : (
                  <InteractiveDataGrid
                    columns={queryResults?.columns || []}
                    rows={queryResults?.rows || []}
                    onSelectMovie={handleSelectMovie}
                    selectedMovieId={selectedMovieId}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Data Lineage & Live Film Inspector */}
          <aside className="bg-[#0d131d] p-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-bold text-white m-0">Now playing in the product</h2>
                <p className="text-[11px] text-[#9ca9ba] leading-relaxed mt-1">
                  Pick a result row and follow it from raw record to the screen your audience sees.
                </p>
              </div>

              {/* Contextual Film Card */}
              <div className="h-[155px] rounded-xl overflow-hidden relative border border-[#3a4a60] p-3.5 flex flex-col justify-end shadow-md group bg-[#0b1119]">
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/50 to-transparent z-[1]" />
                <img
                  src={contextualMovie.posterUrl}
                  alt={contextualMovie.title}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500';
                  }}
                  className="absolute inset-0 w-full h-full object-cover filter brightness-[0.6] group-hover:scale-105 transition-transform duration-500"
                />
                <div className="relative z-10">
                  <div className="flex items-center gap-1.5 mb-1">
                    <TableIcon className="w-3.5 h-3.5 text-[#ff6b57]" />
                    <span className="text-[10px] font-mono text-[#ff6b57] uppercase font-bold tracking-wider">
                      RECORD #{contextualMovie.movieId}
                    </span>
                  </div>
                  <strong className="text-base font-bold text-white block leading-tight truncate">
                    {contextualMovie.title}
                  </strong>
                  <small className="text-[10px] text-[#a9c7dd] block mt-0.5">
                    ★ {Number(contextualMovie.avgRating || 9.5).toFixed(1)} community rating · {contextualMovie.director || 'Cinema'}
                  </small>
                  <div className="flex items-center gap-2 mt-2">
                    <Link
                      href={`/movies/${contextualMovie.movieId}`}
                      className="text-[10px] text-[#f7f8fb] hover:text-[#ff6b57] underline flex items-center gap-0.5"
                    >
                      <span>Film profile</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </Link>
                    <span className="text-white/20">•</span>
                    <Link
                      href={`/countercut?movieId=${contextualMovie.movieId}`}
                      className="text-[10px] text-[#ff6b57] hover:underline flex items-center gap-0.5"
                    >
                      <span>Investigate in Countercut</span>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Data Lineage Flow */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#a4b0c0] mb-2">
                  DATA LINEAGE
                </div>
                <div className="font-mono text-[11px] text-[#c4cedc] bg-[#090e15] p-3 rounded-lg border border-[#344256] space-y-1.5 leading-relaxed">
                  <div><span className="text-[#ff6b57] font-bold">movies</span></div>
                  <div className="text-[#8b98aa] pl-3">↳ movie_id: {contextualMovie.movieId}, score: {Number(contextualMovie.avgRating || 9.0).toFixed(1)}</div>
                  <div><span className="text-[#ff6b57] font-bold">v_trending_movies</span></div>
                  <div className="text-[#8b98aa] pl-3">↳ weighted Bayesian ranking prior</div>
                  <div><span className="text-[#ff6b57] font-bold">Discover & Shelves</span></div>
                  <div className="text-[#8b98aa] pl-3">↳ materialized in 3D perspective shelf</div>
                </div>
              </div>

              {/* Link to CineTrace */}
              <Link
                href={`/trace?movieId=${contextualMovie.movieId}`}
                className="w-full py-2.5 px-3 rounded-lg border border-[#5f6f88] hover:border-[#ff6b57] bg-white/[0.02] text-[#b6c7dc] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors block text-center"
              >
                <span>Trace mutation lineage for this film →</span>
              </Link>
            </div>

            <p className="text-[10px] text-[#758297] mt-3 leading-relaxed border-t border-white/[0.08] pt-3">
              Values, execution latency, and relational integrity are powered by the live database engine.
            </p>
          </aside>
        </div>
      )}

      {/* TAB 2: SCHEMA (INTERACTIVE ER DIAGRAM) */}
      {activeTab === 'schema' && (
        <div className="overflow-hidden rounded-2xl border border-[#2b384b] bg-[#0a0f16]">
          <InteractiveErDiagram />
        </div>
      )}

      {/* TAB 3: TRIGGERS (TRIGGER LAB) */}
      {activeTab === 'triggers' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Trigger 1: Rating Recalculation Tester */}
            <div className="bg-[#0d131d] border border-[#2b384a] rounded-2xl p-5 space-y-4">
              <div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#ff6b57]/20 text-[#ff8f7f] font-bold uppercase">
                  AFTER INSERT OR UPDATE OR DELETE ON reviews
                </span>
                <h3 className="text-base font-bold text-white mt-2 mb-1">
                  trg_update_movie_rating
                </h3>
                <p className="text-xs text-[#8b98aa] leading-relaxed">
                  Automatically recalculates <code className="text-[#ff8f7f]">movies.avg_rating</code> and <code className="text-[#ff8f7f]">review_count</code> in real time when any user rates a film.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[10px] font-bold text-[#8190a3] uppercase tracking-wider block mb-1">
                    Movie ID
                  </label>
                  <input
                    type="number"
                    value={triggerMovieId}
                    onChange={(e) => setTriggerMovieId(e.target.value)}
                    className="w-full bg-[#0a0f16] border border-[#2d3a4d] rounded-lg p-2 text-xs text-white focus:outline-none focus:border-[#ff6b57]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-[#8190a3] uppercase tracking-wider block mb-1">
                    New Test Score (1-10)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="10"
                    value={triggerScore}
                    onChange={(e) => setTriggerScore(e.target.value)}
                    className="w-full bg-[#0a0f16] border border-[#2d3a4d] rounded-lg p-2 text-xs text-white focus:outline-none focus:border-[#ff6b57]"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleTestTrigger}
                disabled={isTestingTrigger}
                className="w-full py-2.5 px-4 rounded-lg bg-[#f7f8fb] hover:bg-white text-[#080b11] text-xs font-bold transition-colors flex items-center justify-center gap-2"
              >
                {isTestingTrigger ? 'Executing trigger...' : 'Simulate Rating Mutation & Verify Trigger'}
              </button>

              {triggerTestResult && (
                <div className="font-mono text-xs p-3 rounded-lg bg-[#070a0f] border border-[#202b3b] space-y-1.5">
                  <div className="text-[10px] text-[#ff8f7f] font-bold">TRIGGER EXECUTION REPORT:</div>
                  <div>Movie: {triggerTestResult.movie?.title}</div>
                  <div>Previous Avg: {triggerTestResult.before?.avg_rating || '—'} (reviews: {triggerTestResult.before?.review_count || '—'})</div>
                  <div className="text-green-400">New Avg: {triggerTestResult.after?.avg_rating} (reviews: {triggerTestResult.after?.review_count})</div>
                  <div className="text-[10px] text-[#8b98aa]">Trigger: trg_update_movie_rating executed automatically by PostgreSQL!</div>
                </div>
              )}
            </div>

            {/* Trigger 2 & 3 Descriptions */}
            <div className="space-y-4">
              <div className="bg-[#0d131d] border border-[#2b384a] rounded-2xl p-5 space-y-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#ff6b57]/20 text-[#ff8f7f] font-bold uppercase">
                  AFTER INSERT ON reviews
                </span>
                <h3 className="text-base font-bold text-white mt-1 mb-0.5">
                  trg_log_review_activity
                </h3>
                <p className="text-xs text-[#8b98aa] leading-relaxed">
                  Automatically inserts an audit log entry in <code className="text-[#ff8f7f]">activity_logs</code> containing movie metadata and rating details whenever a brand new review is submitted.
                </p>
                <div className="text-[11px] font-mono text-[#c9d2de] bg-[#070a0f] p-2.5 rounded border border-[#202b3b]">
                  INSERT INTO activity_logs (user_id, activity_type, target_id, metadata)...
                </div>
              </div>

              <div className="bg-[#0d131d] border border-[#2b384a] rounded-2xl p-5 space-y-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#ff6b57]/20 text-[#ff8f7f] font-bold uppercase">
                  AFTER INSERT OR DELETE ON review_likes
                </span>
                <h3 className="text-base font-bold text-white mt-1 mb-0.5">
                  trg_update_review_likes
                </h3>
                <p className="text-xs text-[#8b98aa] leading-relaxed">
                  Synchronizes total helpful votes counter on <code className="text-[#ff8f7f]">reviews.likes_count</code> automatically when users like or unlike reviews.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: FUNCTIONS & VIEWS */}
      {activeTab === 'functions' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Stored Procedures */}
          <div className="bg-[#0d131d] border border-[#2b384a] rounded-2xl p-5 space-y-4">
            <h3 className="text-base font-bold text-white m-0">
              Stored Procedures & Analytical Functions
            </h3>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-[#0a0f16] border border-[#2d3a4d] space-y-1.5">
                <div className="flex items-center justify-between">
                  <strong className="text-xs font-mono text-[#ff8f7f]">fn_recommend_movies(p_user_id, p_limit)</strong>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('query');
                      setSql(`SELECT * FROM fn_recommend_movies(1, 6);`);
                      handleExecute(`SELECT * FROM fn_recommend_movies(1, 6);`);
                    }}
                    className="text-[11px] text-[#ff6b57] hover:underline font-bold"
                  >
                    Run in Query Tab →
                  </button>
                </div>
                <p className="text-xs text-[#8b98aa]">
                  Collaborative genre-affinity algorithm matching high-rated user favorites with unreviewed films.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#0a0f16] border border-[#2d3a4d] space-y-1.5">
                <div className="flex items-center justify-between">
                  <strong className="text-xs font-mono text-[#ff8f7f]">fn_get_user_analytics(p_user_id)</strong>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('query');
                      setSql(`SELECT fn_get_user_analytics(1) AS user_1_analytics;`);
                      handleExecute(`SELECT fn_get_user_analytics(1) AS user_1_analytics;`);
                    }}
                    className="text-[11px] text-[#ff6b57] hover:underline font-bold"
                  >
                    Run in Query Tab →
                  </button>
                </div>
                <p className="text-xs text-[#8b98aa]">
                  Aggregates total watch time, average rating, rating distribution histogram (1-10), and top genres.
                </p>
              </div>
            </div>
          </div>

          {/* Analytical Views */}
          <div className="bg-[#0d131d] border border-[#2b384a] rounded-2xl p-5 space-y-4">
            <h3 className="text-base font-bold text-white m-0">
              Advanced Relational Views
            </h3>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-[#0a0f16] border border-[#2d3a4d] space-y-1.5">
                <div className="flex items-center justify-between">
                  <strong className="text-xs font-mono text-[#ff8f7f]">v_trending_movies</strong>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('query');
                      setSql(`SELECT * FROM v_trending_movies LIMIT 10;`);
                      handleExecute(`SELECT * FROM v_trending_movies LIMIT 10;`);
                    }}
                    className="text-[11px] text-[#ff6b57] hover:underline font-bold"
                  >
                    Query View →
                  </button>
                </div>
                <p className="text-xs text-[#8b98aa]">
                  Ranks films using a true Bayesian weighted score with global mean rating prior and smoothing threshold.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#0a0f16] border border-[#2d3a4d] space-y-1.5">
                <div className="flex items-center justify-between">
                  <strong className="text-xs font-mono text-[#ff8f7f]">v_user_leaderboard</strong>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('query');
                      setSql(`SELECT * FROM v_user_leaderboard LIMIT 10;`);
                      handleExecute(`SELECT * FROM v_user_leaderboard LIMIT 10;`);
                    }}
                    className="text-[11px] text-[#ff6b57] hover:underline font-bold"
                  >
                    Query View →
                  </button>
                </div>
                <p className="text-xs text-[#8b98aa]">
                  Calculates community ranking with SQL window function <code className="text-[#ff8f7f]">DENSE_RANK()</code>.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#0a0f16] border border-[#2d3a4d] space-y-1.5">
                <div className="flex items-center justify-between">
                  <strong className="text-xs font-mono text-[#ff8f7f]">v_recent_activity_feed</strong>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('query');
                      setSql(`SELECT * FROM v_recent_activity_feed LIMIT 10;`);
                      handleExecute(`SELECT * FROM v_recent_activity_feed LIMIT 10;`);
                    }}
                    className="text-[11px] text-[#ff6b57] hover:underline font-bold"
                  >
                    Query View →
                  </button>
                </div>
                <p className="text-xs text-[#8b98aa]">
                  Unified polymorphic-safe feed joining audit logs with users, movies, and custom watchlists.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
