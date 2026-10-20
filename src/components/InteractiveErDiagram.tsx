'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Key,
  Link2,
  Terminal,
  Search,
  ZoomIn,
  ZoomOut,
  Copy,
  Check,
  Table as TableIcon,
  Maximize2,
  Minimize2,
  Move,
  Route,
  Network,
  ChevronRight,
  X,
  Crosshair,
  MousePointer2,
} from 'lucide-react';

export interface TableNode {
  id: string;
  name: string;
  x: number; // 0-100 percentage
  y: number; // 0-100 percentage
  color: string;
  description: string;
  columns: { name: string; type: string; key?: 'PK' | 'FK' | 'UK' | 'PK, FK' }[];
  ddl: string;
}

export const TABLES: TableNode[] = [
  {
    id: 'users',
    name: 'users',
    x: 68,
    y: 38,
    color: '#ff6b57', // Moss
    description: 'Core member profiles containing authentication credentials, bio, and visual assets.',
    columns: [
      { name: 'user_id', type: 'SERIAL', key: 'PK' },
      { name: 'username', type: 'VARCHAR(50)', key: 'UK' },
      { name: 'email', type: 'VARCHAR(100)', key: 'UK' },
      { name: 'password_hash', type: 'VARCHAR(255)' },
      { name: 'display_name', type: 'VARCHAR(100)' },
      { name: 'bio', type: 'TEXT' },
      { name: 'avatar_url', type: 'VARCHAR(255)' },
      { name: 'banner_url', type: 'VARCHAR(255)' },
      { name: 'created_at', type: 'TIMESTAMP' }
    ],
    ddl: `CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    bio TEXT,
    avatar_url VARCHAR(255),
    banner_url VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`
  },
  {
    id: 'movies',
    name: 'movies',
    x: 36,
    y: 35,
    color: '#ff6b57',
    description: 'Film registry storing release dates, runtime, director, poster URLs, and trigger-cached aggregate ratings.',
    columns: [
      { name: 'movie_id', type: 'SERIAL', key: 'PK' },
      { name: 'tmdb_id', type: 'INTEGER', key: 'UK' },
      { name: 'title', type: 'VARCHAR(255)' },
      { name: 'tagline', type: 'TEXT' },
      { name: 'overview', type: 'TEXT' },
      { name: 'release_date', type: 'DATE' },
      { name: 'runtime', type: 'INTEGER' },
      { name: 'poster_url', type: 'VARCHAR(255)' },
      { name: 'backdrop_url', type: 'VARCHAR(255)' },
      { name: 'trailer_url', type: 'VARCHAR(255)' },
      { name: 'director', type: 'VARCHAR(255)' },
      { name: 'avg_rating', type: 'NUMERIC(3,2)' },
      { name: 'review_count', type: 'INTEGER' },
      { name: 'created_at', type: 'TIMESTAMP' }
    ],
    ddl: `CREATE TABLE movies (
    movie_id SERIAL PRIMARY KEY,
    tmdb_id INTEGER UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    tagline TEXT,
    overview TEXT,
    release_date DATE,
    runtime INTEGER,
    poster_url VARCHAR(255),
    backdrop_url VARCHAR(255),
    trailer_url VARCHAR(255),
    director VARCHAR(255),
    avg_rating NUMERIC(3,2) DEFAULT 0.00,
    review_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`
  },
  {
    id: 'genres',
    name: 'genres',
    x: 6,
    y: 10,
    color: '#e58e74',
    description: 'Taxonomy of film categories used for classification and collaborative filtering.',
    columns: [
      { name: 'genre_id', type: 'SERIAL', key: 'PK' },
      { name: 'name', type: 'VARCHAR(50)', key: 'UK' },
      { name: 'slug', type: 'VARCHAR(50)', key: 'UK' },
      { name: 'icon_name', type: 'VARCHAR(50)' }
    ],
    ddl: `CREATE TABLE genres (
    genre_id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    slug VARCHAR(50) UNIQUE NOT NULL,
    icon_name VARCHAR(50)
);`
  },
  {
    id: 'movie_genres',
    name: 'movie_genres',
    x: 21,
    y: 10,
    color: '#e58e74',
    description: 'Many-to-many bridge linking movies with multiple normalized genres.',
    columns: [
      { name: 'movie_id', type: 'INTEGER', key: 'PK, FK' },
      { name: 'genre_id', type: 'INTEGER', key: 'PK, FK' }
    ],
    ddl: `CREATE TABLE movie_genres (
    movie_id INTEGER REFERENCES movies(movie_id) ON DELETE CASCADE,
    genre_id INTEGER REFERENCES genres(genre_id) ON DELETE CASCADE,
    PRIMARY KEY (movie_id, genre_id)
);`
  },
  {
    id: 'people',
    name: 'people',
    x: 6,
    y: 62,
    color: '#d4bb7e',
    description: 'Cast and crew directory of directors, actors, and writers.',
    columns: [
      { name: 'person_id', type: 'SERIAL', key: 'PK' },
      { name: 'name', type: 'VARCHAR(255)' },
      { name: 'profile_path', type: 'VARCHAR(255)' },
      { name: 'known_for_department', type: 'VARCHAR(100)' },
      { name: 'biography', type: 'TEXT' }
    ],
    ddl: `CREATE TABLE people (
    person_id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    profile_path VARCHAR(255),
    known_for_department VARCHAR(100),
    biography TEXT
);`
  },
  {
    id: 'movie_cast',
    name: 'movie_cast',
    x: 21,
    y: 62,
    color: '#d4bb7e',
    description: 'Bridge linking movies to actors/directors with billing order and character names.',
    columns: [
      { name: 'movie_id', type: 'INTEGER', key: 'PK, FK' },
      { name: 'person_id', type: 'INTEGER', key: 'PK, FK' },
      { name: 'character_name', type: 'VARCHAR(255)' },
      { name: 'job_role', type: 'VARCHAR(100)' },
      { name: 'cast_order', type: 'INTEGER' }
    ],
    ddl: `CREATE TABLE movie_cast (
    movie_id INTEGER REFERENCES movies(movie_id) ON DELETE CASCADE,
    person_id INTEGER REFERENCES people(person_id) ON DELETE CASCADE,
    character_name VARCHAR(255),
    job_role VARCHAR(100) DEFAULT 'Actor',
    cast_order INTEGER,
    PRIMARY KEY (movie_id, person_id)
);`
  },
  {
    id: 'reviews',
    name: 'reviews',
    x: 52,
    y: 10,
    color: '#ff6b57',
    description: 'Reviews and 10-point ratings submitted by users. Triggers recalculate movie stats.',
    columns: [
      { name: 'review_id', type: 'SERIAL', key: 'PK' },
      { name: 'user_id', type: 'INTEGER', key: 'FK' },
      { name: 'movie_id', type: 'INTEGER', key: 'FK' },
      { name: 'rating', type: 'NUMERIC(3,1)' },
      { name: 'review_text', type: 'TEXT' },
      { name: 'has_spoilers', type: 'BOOLEAN' },
      { name: 'likes_count', type: 'INTEGER' },
      { name: 'created_at', type: 'TIMESTAMP' },
      { name: 'updated_at', type: 'TIMESTAMP' }
    ],
    ddl: `CREATE TABLE reviews (
    review_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    movie_id INTEGER REFERENCES movies(movie_id) ON DELETE CASCADE,
    rating NUMERIC(3,1) CHECK (rating >= 1.0 AND rating <= 10.0),
    review_text TEXT,
    has_spoilers BOOLEAN DEFAULT FALSE,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, movie_id)
);`
  },
  {
    id: 'review_likes',
    name: 'review_likes',
    x: 68,
    y: 10,
    color: '#ff6b57',
    description: 'Audit bridge recording helpful votes cast by users on member reviews.',
    columns: [
      { name: 'user_id', type: 'INTEGER', key: 'PK, FK' },
      { name: 'review_id', type: 'INTEGER', key: 'PK, FK' },
      { name: 'created_at', type: 'TIMESTAMP' }
    ],
    ddl: `CREATE TABLE review_likes (
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    review_id INTEGER REFERENCES reviews(review_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, review_id)
);`
  },
  {
    id: 'watchlists',
    name: 'watchlists',
    x: 52,
    y: 72,
    color: '#c29b7f',
    description: 'Curated public or private collections of films assembled by cinephiles.',
    columns: [
      { name: 'watchlist_id', type: 'SERIAL', key: 'PK' },
      { name: 'user_id', type: 'INTEGER', key: 'FK' },
      { name: 'name', type: 'VARCHAR(100)' },
      { name: 'description', type: 'TEXT' },
      { name: 'is_public', type: 'BOOLEAN' },
      { name: 'is_system_default', type: 'BOOLEAN' },
      { name: 'likes_count', type: 'INTEGER' },
      { name: 'created_at', type: 'TIMESTAMP' }
    ],
    ddl: `CREATE TABLE watchlists (
    watchlist_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    is_system_default BOOLEAN DEFAULT FALSE,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`
  },
  {
    id: 'watchlist_items',
    name: 'watchlist_items',
    x: 36,
    y: 72,
    color: '#c29b7f',
    description: 'Bridge linking watchlists to member-selected movies with optional notes.',
    columns: [
      { name: 'watchlist_id', type: 'INTEGER', key: 'PK, FK' },
      { name: 'movie_id', type: 'INTEGER', key: 'PK, FK' },
      { name: 'notes', type: 'VARCHAR(255)' },
      { name: 'added_at', type: 'TIMESTAMP' }
    ],
    ddl: `CREATE TABLE watchlist_items (
    watchlist_id INTEGER REFERENCES watchlists(watchlist_id) ON DELETE CASCADE,
    movie_id INTEGER REFERENCES movies(movie_id) ON DELETE CASCADE,
    notes VARCHAR(255),
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (watchlist_id, movie_id)
);`
  },
  {
    id: 'follows',
    name: 'follows',
    x: 84,
    y: 38,
    color: '#ff6b57',
    description: 'Directed graph relationship mapping follower/following edges between users.',
    columns: [
      { name: 'follower_id', type: 'INTEGER', key: 'PK, FK' },
      { name: 'following_id', type: 'INTEGER', key: 'PK, FK' },
      { name: 'created_at', type: 'TIMESTAMP' }
    ],
    ddl: `CREATE TABLE follows (
    follower_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    following_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (follower_id, following_id)
);`
  },
  {
    id: 'activity_logs',
    name: 'activity_logs',
    x: 68,
    y: 72,
    color: '#7fb5b0',
    description: 'Unified immutable audit log recording reviews, list creations, and watchlist updates via JSONB.',
    columns: [
      { name: 'log_id', type: 'SERIAL', key: 'PK' },
      { name: 'user_id', type: 'INTEGER', key: 'FK' },
      { name: 'activity_type', type: 'VARCHAR(50)' },
      { name: 'target_id', type: 'INTEGER' },
      { name: 'metadata', type: 'JSONB' },
      { name: 'created_at', type: 'TIMESTAMP' }
    ],
    ddl: `CREATE TABLE activity_logs (
    log_id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    target_id INTEGER,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`
  },
  {
    id: 'app_meta',
    name: 'app_meta',
    x: 84,
    y: 72,
    color: '#8da38a',
    description: 'Schema version control, migration history, and metadata registry for idempotent database initialization.',
    columns: [
      { name: 'key', type: 'VARCHAR(100)', key: 'PK' },
      { name: 'value', type: 'TEXT' },
      { name: 'updated_at', type: 'TIMESTAMP' }
    ],
    ddl: `CREATE TABLE app_meta (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`
  },
  {
    id: 'db_action_traces',
    name: 'db_action_traces',
    x: 84,
    y: 10,
    color: '#ff6b57',
    description: 'CineTrace transaction lineage registry capturing authenticated mutation events, trigger executions, and state deltas.',
    columns: [
      { name: 'trace_id', type: 'SERIAL', key: 'PK' },
      { name: 'user_id', type: 'INTEGER', key: 'FK' },
      { name: 'action_type', type: 'VARCHAR(50)' },
      { name: 'target_type', type: 'VARCHAR(50)' },
      { name: 'target_id', type: 'INTEGER' },
      { name: 'mutation_op', type: 'VARCHAR(20)' },
      { name: 'initial_score', type: 'NUMERIC(3,1)' },
      { name: 'final_score', type: 'NUMERIC(3,1)' },
      { name: 'created_at', type: 'TIMESTAMP' },
      { name: 'metadata', type: 'JSONB' }
    ],
    ddl: `CREATE TABLE db_action_traces (
    trace_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    action_type VARCHAR(50) NOT NULL,
    target_type VARCHAR(50) NOT NULL,
    target_id INT NOT NULL,
    mutation_op VARCHAR(20) NOT NULL,
    initial_score NUMERIC(3, 1),
    final_score NUMERIC(3, 1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);`
  }
];

export interface Connection {
  from: string;
  to: string;
  key: string;
  type: '1:N' | 'M:N' | '1:1';
}

export const CONNECTIONS: Connection[] = [
  { from: 'movie_genres', to: 'movies', key: 'movie_id', type: '1:N' },
  { from: 'movie_genres', to: 'genres', key: 'genre_id', type: '1:N' },
  { from: 'movie_cast', to: 'movies', key: 'movie_id', type: '1:N' },
  { from: 'movie_cast', to: 'people', key: 'person_id', type: '1:N' },
  { from: 'reviews', to: 'movies', key: 'movie_id', type: '1:N' },
  { from: 'reviews', to: 'users', key: 'user_id', type: '1:N' },
  { from: 'review_likes', to: 'reviews', key: 'review_id', type: '1:N' },
  { from: 'review_likes', to: 'users', key: 'user_id', type: '1:N' },
  { from: 'watchlists', to: 'users', key: 'user_id', type: '1:N' },
  { from: 'watchlist_items', to: 'watchlists', key: 'watchlist_id', type: '1:N' },
  { from: 'watchlist_items', to: 'movies', key: 'movie_id', type: '1:N' },
  { from: 'follows', to: 'users', key: 'follower_id', type: '1:N' },
  { from: 'activity_logs', to: 'users', key: 'user_id', type: '1:N' },
  { from: 'db_action_traces', to: 'users', key: 'user_id', type: '1:N' },
];

const CANVAS_WIDTH = 1240;
const CANVAS_HEIGHT = 740;
const NODE_WIDTH = 174;
const NODE_HEIGHT = 108;
const TABLE_BY_ID = new Map(TABLES.map(table => [table.id, table]));

type InspectorTab = 'columns' | 'relationships' | 'ddl';
type ViewMode = 'explore' | 'impact';

function edgePath(fromId: string, toId: string) {
  const from = TABLE_BY_ID.get(fromId);
  const to = TABLE_BY_ID.get(toId);
  if (!from || !to) return '';

  const fromX = (from.x / 100) * CANVAS_WIDTH + NODE_WIDTH / 2;
  const fromY = (from.y / 100) * CANVAS_HEIGHT + NODE_HEIGHT / 2;
  const toX = (to.x / 100) * CANVAS_WIDTH + NODE_WIDTH / 2;
  const toY = (to.y / 100) * CANVAS_HEIGHT + NODE_HEIGHT / 2;
  const horizontal = Math.abs(toX - fromX) > Math.abs(toY - fromY);
  const sx = horizontal ? fromX + (toX > fromX ? NODE_WIDTH / 2 : -NODE_WIDTH / 2) : fromX;
  const sy = horizontal ? fromY : fromY + (toY > fromY ? NODE_HEIGHT / 2 : -NODE_HEIGHT / 2);
  const tx = horizontal ? toX + (toX > fromX ? -NODE_WIDTH / 2 : NODE_WIDTH / 2) : toX;
  const ty = horizontal ? toY : toY + (toY > fromY ? -NODE_HEIGHT / 2 : NODE_HEIGHT / 2);

  if (horizontal) {
    const bend = Math.max(34, Math.abs(tx - sx) * 0.44);
    return `M ${sx} ${sy} C ${sx + (tx > sx ? bend : -bend)} ${sy}, ${tx + (tx > sx ? -bend : bend)} ${ty}, ${tx} ${ty}`;
  }
  const bend = Math.max(28, Math.abs(ty - sy) * 0.46);
  return `M ${sx} ${sy} C ${sx} ${sy + (ty > sy ? bend : -bend)}, ${tx} ${ty + (ty > sy ? -bend : bend)}, ${tx} ${ty}`;
}

export default function InteractiveErDiagram() {
  const observatoryRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const panRef = useRef({ x: -45, y: -18 });
  const [selectedTable, setSelectedTable] = useState<TableNode>(TABLES[1]);
  const [hoveredTable, setHoveredTable] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [zoomLevel, setZoomLevel] = useState(86);
  const [pan, setPan] = useState({ x: -45, y: -18 });
  const [viewMode, setViewMode] = useState<ViewMode>('explore');
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('columns');
  const [copiedDdl, setCopiedDdl] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(document.fullscreenElement === observatoryRef.current);
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionPreference = () => setReduceMotion(motionQuery.matches);
    handleMotionPreference();
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    motionQuery.addEventListener('change', handleMotionPreference);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      motionQuery.removeEventListener('change', handleMotionPreference);
    };
  }, []);

  const matches = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return new Set(TABLES.map(table => table.id));
    return new Set(TABLES.filter(table => table.name.toLowerCase().includes(query) || table.columns.some(column => column.name.toLowerCase().includes(query))).map(table => table.id));
  }, [searchQuery]);

  const connectedIds = useMemo(() => {
    const ids = new Set([selectedTable.id]);
    CONNECTIONS.forEach(connection => {
      if (connection.from === selectedTable.id) ids.add(connection.to);
      if (connection.to === selectedTable.id) ids.add(connection.from);
    });
    return ids;
  }, [selectedTable]);

  const outgoing = useMemo(() => CONNECTIONS.filter(connection => connection.from === selectedTable.id), [selectedTable]);
  const incoming = useMemo(() => CONNECTIONS.filter(connection => connection.to === selectedTable.id), [selectedTable]);

  const focusTable = (table: TableNode) => {
    setSelectedTable(table);
    setInspectorTab('columns');
  };

  const resetView = () => {
    setZoomLevel(isFullscreen ? 95 : 86);
    panRef.current = { x: -45, y: -18 };
    setPan(panRef.current);
  };

  const toggleFullscreen = async () => {
    if (!observatoryRef.current) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await observatoryRef.current.requestFullscreen();
      setZoomLevel(95);
      panRef.current = { x: 0, y: 0 };
      setPan(panRef.current);
    }
  };

  const handleCopyDdl = async () => {
    await navigator.clipboard.writeText(selectedTable.ddl);
    setCopiedDdl(true);
    window.setTimeout(() => setCopiedDdl(false), 1500);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('[data-schema-node], button, input')) return;
    dragRef.current = { x: event.clientX, y: event.clientY, panX: panRef.current.x, panY: panRef.current.y };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsPanning(true);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanning) return;
    panRef.current = { x: dragRef.current.panX + event.clientX - dragRef.current.x, y: dragRef.current.panY + event.clientY - dragRef.current.y };
    if (canvasRef.current) {
      canvasRef.current.style.transform = `translate3d(${panRef.current.x}px, ${panRef.current.y}px, 0) scale(${zoomLevel / 100})`;
    }
  };

  const stopPanning = () => {
    if (isPanning) setPan(panRef.current);
    setIsPanning(false);
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    setZoomLevel(current => Math.min(135, Math.max(58, current - event.deltaY * 0.08)));
  };

  const canvasHeightClass = isFullscreen ? 'h-[calc(100vh-154px)]' : 'lg:h-[650px]';

  return (
    <div ref={observatoryRef} className={`relative overflow-hidden bg-[#070b11] text-cv-text ${isFullscreen ? 'h-screen w-screen' : 'min-h-[760px] rounded-xl'}`}>
      <header className="relative z-30 border-b border-white/[0.09] bg-[#090e16]/95 px-4 py-4 backdrop-blur-xl xl:px-5">
        <div className={`flex flex-col gap-4 ${isFullscreen ? 'xl:flex-row xl:items-center xl:justify-between' : '2xl:flex-row 2xl:items-center 2xl:justify-between'}`}>
          <div className="min-w-0 shrink-0">
            <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#61d8ff]"><Network className="h-3.5 w-3.5" /> Relational observatory</div>
            <h2 className="whitespace-nowrap text-xl font-bold tracking-[-0.025em] text-white md:text-2xl">Schema Relationship Map</h2>
            <p className="mt-1 text-xs text-[#8190a3]">Follow a table. See every dependency light up.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex h-9 items-center border border-white/[0.1] bg-[#0d131d] p-1">
              {(['explore', 'impact'] as ViewMode[]).map(mode => (
                <button key={mode} type="button" onClick={() => setViewMode(mode)} aria-pressed={viewMode === mode} className={`flex h-7 items-center gap-1.5 px-3 text-[10px] font-bold uppercase tracking-[0.12em] transition-all ${viewMode === mode ? 'bg-[#ff6b57] text-[#090b10] shadow-[0_0_22px_rgba(255,107,87,0.25)]' : 'text-[#8391a5] hover:text-white'}`}>
                  {mode === 'explore' ? <MousePointer2 className="h-3 w-3" /> : <Route className="h-3 w-3" />}
                  {mode === 'explore' ? 'Explore' : 'Impact path'}
                </button>
              ))}
            </div>

            <label className="relative min-w-[210px] flex-1 xl:w-[250px] xl:flex-none">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#718096]" />
              <input value={searchQuery} onChange={event => setSearchQuery(event.target.value)} placeholder="Search tables or columns…" className="h-9 w-full border border-white/[0.11] bg-[#0d131d] pl-9 pr-8 font-mono text-[11px] text-white outline-none transition-colors placeholder:text-[#5f6d80] focus:border-[#61d8ff]/70" />
              {searchQuery && <button type="button" onClick={() => setSearchQuery('')} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#718096] hover:text-white"><X className="h-3 w-3" /></button>}
            </label>

            <div className="flex h-9 items-center border border-white/[0.1] bg-[#0d131d]">
              <button type="button" onClick={() => setZoomLevel(value => Math.max(58, value - 10))} aria-label="Zoom out" className="grid h-full w-9 place-items-center text-[#8391a5] hover:bg-white/[0.04] hover:text-white"><ZoomOut className="h-3.5 w-3.5" /></button>
              <span className="min-w-14 border-x border-white/[0.08] text-center font-mono text-[10px] text-white">{Math.round(zoomLevel)}%</span>
              <button type="button" onClick={() => setZoomLevel(value => Math.min(135, value + 10))} aria-label="Zoom in" className="grid h-full w-9 place-items-center text-[#8391a5] hover:bg-white/[0.04] hover:text-white"><ZoomIn className="h-3.5 w-3.5" /></button>
            </div>

            <button type="button" onClick={resetView} aria-label="Reset canvas view" className="grid h-9 w-9 place-items-center border border-white/[0.1] bg-[#0d131d] text-[#8391a5] hover:border-white/[0.2] hover:text-white"><Crosshair className="h-3.5 w-3.5" /></button>
            <button type="button" onClick={toggleFullscreen} aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} className="flex h-9 items-center gap-2 border border-[#ff6b57]/60 bg-[#ff6b57]/10 px-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#ff8f7f] transition-all hover:bg-[#ff6b57] hover:text-[#090b10]">
              {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}<span className="hidden sm:inline">{isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}</span>
            </button>
          </div>
        </div>
      </header>

      <div className={`grid min-h-0 lg:grid-cols-[190px_minmax(0,1fr)_270px] ${canvasHeightClass}`}>
        <aside className="hidden min-h-0 border-r border-white/[0.09] bg-[#090e16] lg:flex lg:flex-col">
          <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
            <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#aab5c5]"><TableIcon className="h-3.5 w-3.5 text-[#61d8ff]" /> Tables</span>
            <span className="font-mono text-[9px] text-[#66758a]">{TABLES.length} total</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2.5">
            {TABLES.filter(table => matches.has(table.id)).map(table => {
              const selected = selectedTable.id === table.id;
              const related = connectedIds.has(table.id) && !selected;
              return (
                <button key={table.id} type="button" onClick={() => focusTable(table)} onMouseEnter={() => setHoveredTable(table.id)} onMouseLeave={() => setHoveredTable(null)} className={`group mb-0.5 flex w-full items-center gap-2.5 border-l-2 px-2.5 py-2 text-left transition-all ${selected ? 'border-[#ff6b57] bg-[#ff6b57]/10 text-white' : related ? 'border-[#61d8ff]/40 text-[#b6c7dc] hover:bg-white/[0.035]' : 'border-transparent text-[#758297] hover:bg-white/[0.035] hover:text-white'}`}>
                  <TableIcon className={`h-3.5 w-3.5 shrink-0 ${selected ? 'text-[#ff6b57]' : related ? 'text-[#61d8ff]' : 'text-[#536174]'}`} />
                  <span className="min-w-0 flex-1 truncate font-mono text-[10px] font-semibold">{table.name}</span><span className="font-mono text-[8px] text-[#5f6d80]">{table.columns.length}</span>
                </button>
              );
            })}
            {matches.size === 0 && <div className="px-3 py-8 text-center font-mono text-[10px] text-[#66758a]">No schema match.</div>}
          </div>
          <div className="border-t border-white/[0.08] p-3 font-mono text-[9px] leading-5 text-[#5f6d80]">
            <div className="flex items-center gap-2"><Move className="h-3 w-3" /> Drag empty space to pan</div>
            <div className="flex items-center gap-2"><ZoomIn className="h-3 w-3" /> Ctrl / ⌘ + wheel to zoom</div>
          </div>
        </aside>

        <main className={`relative min-h-0 overflow-hidden bg-[#070b11] lg:h-auto ${isFullscreen ? 'h-[calc(100vh-154px)]' : 'h-[520px]'}`}>
          <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_48%_44%,rgba(97,216,255,0.055),transparent_32%),radial-gradient(circle_at_50%_50%,rgba(139,124,255,0.035),transparent_62%)]" />
          <div className={`relative h-full w-full touch-none overflow-hidden ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={stopPanning} onPointerCancel={stopPanning} onWheel={handleWheel}>
            <div ref={canvasRef} className="absolute left-0 top-0 origin-top-left select-none will-change-transform" style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT, transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoomLevel / 100})`, transition: isPanning ? 'none' : 'transform 180ms ease-out' }}>
              <div className="pointer-events-none absolute inset-0 opacity-25" style={{ backgroundImage: 'radial-gradient(circle, rgba(119,145,178,.55) 0.8px, transparent 0.8px)', backgroundSize: '22px 22px' }} />

              <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full" viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}>
                <defs>
                  <filter id="schema-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
                  <marker id="schema-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 1 1 L 9 5 L 1 9" fill="none" stroke="currentColor" strokeWidth="1.5" /></marker>
                </defs>
                {CONNECTIONS.map((connection, index) => {
                  const path = edgePath(connection.from, connection.to);
                  const active = connection.from === selectedTable.id || connection.to === selectedTable.id;
                  const hovered = hoveredTable === connection.from || hoveredTable === connection.to;
                  const muted = viewMode === 'impact' && !active;
                  const color = active ? '#61d8ff' : hovered ? '#8b7cff' : '#34445a';
                  return (
                    <g key={`${connection.from}-${connection.to}-${connection.key}`} opacity={muted ? 0.1 : active ? 1 : 0.5}>
                      {active && <path d={path} fill="none" stroke={color} strokeWidth="8" strokeOpacity="0.09" filter="url(#schema-glow)" />}
                      <path d={path} fill="none" stroke={color} strokeWidth={active ? 1.75 : 1} strokeDasharray={active ? '6 5' : undefined} markerEnd="url(#schema-arrow)" style={{ color }} />
                      {active && !reduceMotion && <><circle r="3.4" fill="#61d8ff" filter="url(#schema-glow)"><animateMotion dur={`${2.4 + (index % 3) * 0.5}s`} repeatCount="indefinite" path={path} /></circle><circle r="1.8" fill="#ffffff"><animateMotion dur={`${2.4 + (index % 3) * 0.5}s`} begin="-1.15s" repeatCount="indefinite" path={path} /></circle></>}
                    </g>
                  );
                })}
              </svg>

              {TABLES.map(table => {
                const selected = selectedTable.id === table.id;
                const related = connectedIds.has(table.id) && !selected;
                const hovered = hoveredTable === table.id;
                const muted = (searchQuery.length > 0 && !matches.has(table.id)) || (viewMode === 'impact' && !connectedIds.has(table.id));
                const primaryKey = table.columns.find(column => column.key?.includes('PK'));
                const foreignKeyCount = table.columns.filter(column => column.key?.includes('FK')).length;
                return (
                  <button key={table.id} type="button" data-schema-node onClick={() => focusTable(table)} onMouseEnter={() => setHoveredTable(table.id)} onMouseLeave={() => setHoveredTable(null)} style={{ left: (table.x / 100) * CANVAS_WIDTH, top: (table.y / 100) * CANVAS_HEIGHT, width: NODE_WIDTH, height: NODE_HEIGHT, opacity: muted ? 0.16 : 1 }} className={`absolute z-10 overflow-hidden border text-left backdrop-blur-md transition-[opacity,border-color,background-color,box-shadow,transform] duration-200 ${selected ? 'scale-[1.04] border-[#ff6b57] bg-[#14151d] shadow-[0_0_0_1px_rgba(255,107,87,.35),0_0_32px_rgba(255,107,87,.22)]' : related ? 'border-[#61d8ff]/65 bg-[#0c141e] shadow-[0_0_18px_rgba(97,216,255,.08)]' : hovered ? 'border-[#8b7cff]/80 bg-[#101622]' : 'border-[#40506a]/65 bg-[#0b111a]/95'}`}>
                    <div className="flex h-11 items-center gap-2.5 border-b border-white/[0.08] px-3"><TableIcon className={`h-4 w-4 ${selected ? 'text-[#ff6b57]' : related ? 'text-[#61d8ff]' : 'text-[#8391a5]'}`} /><span className="min-w-0 flex-1 truncate font-mono text-[11px] font-bold text-white">{table.name}</span>{selected && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#ff6b57]" />}</div>
                    <div className="px-3 py-2 font-mono text-[9px]"><div className="flex items-center justify-between text-[#91a0b4]"><span className="flex min-w-0 items-center gap-1 truncate"><Key className="h-2.5 w-2.5 text-[#f2c95c]" />{primaryKey?.name || 'no primary key'}</span><span>{table.columns.length} cols</span></div><div className="mt-2 flex items-center justify-between border-t border-white/[0.06] pt-1.5 text-[#59697f]"><span>public</span><span>{foreignKeyCount} FK</span></div></div>
                  </button>
                );
              })}
            </div>

            <div className="pointer-events-none absolute bottom-4 left-4 z-20 flex items-center gap-2 border border-white/[0.09] bg-[#090e16]/85 px-3 py-2 font-mono text-[9px] text-[#718096] backdrop-blur-md"><Move className="h-3 w-3 text-[#61d8ff]" /> Drag to pan <span className="text-[#3f4d60]">/</span> Ctrl + wheel to zoom</div>
            <div className="absolute bottom-4 right-4 z-20 hidden h-[92px] w-[150px] overflow-hidden border border-white/[0.12] bg-[#080d14]/90 p-2 shadow-2xl backdrop-blur-md xl:block">
              <div className="relative h-full w-full">
                {CONNECTIONS.map(connection => {
                  const from = TABLE_BY_ID.get(connection.from)!;
                  const to = TABLE_BY_ID.get(connection.to)!;
                  return <span key={`${connection.from}-${connection.to}`} className="absolute h-px origin-left bg-[#334158]" style={{ left: `${from.x}%`, top: `${from.y}%`, width: `${Math.hypot(to.x - from.x, to.y - from.y)}%`, transform: `rotate(${Math.atan2(to.y - from.y, to.x - from.x) * (180 / Math.PI)}deg)` }} />;
                })}
                {TABLES.map(table => <button key={table.id} type="button" aria-label={`Focus ${table.name}`} onClick={() => focusTable(table)} className={`absolute h-1.5 w-2.5 -translate-x-1/2 -translate-y-1/2 border ${selectedTable.id === table.id ? 'border-[#ff8f7f] bg-[#ff6b57]' : connectedIds.has(table.id) ? 'border-[#61d8ff] bg-[#163244]' : 'border-[#52627a] bg-[#141c28]'}`} style={{ left: `${table.x + 7}%`, top: `${table.y + 7}%` }} />)}
              </div>
            </div>
          </div>
        </main>

        <aside className={`min-h-0 overflow-y-auto border-t border-white/[0.09] bg-[#090e16] lg:block lg:border-l lg:border-t-0 ${isFullscreen ? 'hidden' : 'block'}`}>
          <div className="border-b border-white/[0.08] p-4">
            <div className="flex items-start gap-3"><div className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center border border-[#ff6b57]/60 bg-[#ff6b57]/10 text-[#ff6b57]"><TableIcon className="h-4 w-4" /></div><div className="min-w-0 flex-1"><div className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#6f7e92]">public schema</div><h3 className="truncate font-mono text-lg font-bold text-white">{selectedTable.name}</h3><p className="mt-2 text-[11px] leading-5 text-[#8190a3]">{selectedTable.description}</p></div></div>
            <div className="mt-4 grid grid-cols-3 gap-px bg-white/[0.08]"><div className="bg-[#0c121b] px-2 py-2 text-center"><strong className="block font-mono text-sm text-white">{selectedTable.columns.length}</strong><span className="text-[8px] uppercase tracking-wider text-[#637187]">Columns</span></div><div className="bg-[#0c121b] px-2 py-2 text-center"><strong className="block font-mono text-sm text-[#61d8ff]">{outgoing.length}</strong><span className="text-[8px] uppercase tracking-wider text-[#637187]">Outgoing</span></div><div className="bg-[#0c121b] px-2 py-2 text-center"><strong className="block font-mono text-sm text-[#8b7cff]">{incoming.length}</strong><span className="text-[8px] uppercase tracking-wider text-[#637187]">Incoming</span></div></div>
          </div>

          <div className="sticky top-0 z-10 grid grid-cols-3 border-b border-white/[0.09] bg-[#090e16]/95 px-3 pt-2 backdrop-blur-md">
            {(['columns', 'relationships', 'ddl'] as InspectorTab[]).map(tab => <button key={tab} type="button" onClick={() => setInspectorTab(tab)} className={`border-b-2 px-1 py-2.5 text-[9px] font-bold uppercase tracking-[0.1em] transition-colors ${inspectorTab === tab ? 'border-[#ff6b57] text-[#ff8f7f]' : 'border-transparent text-[#66758a] hover:text-white'}`}>{tab}</button>)}
          </div>

          <div className="p-3">
            {inspectorTab === 'columns' && <div className="divide-y divide-white/[0.065] border-y border-white/[0.08]">{selectedTable.columns.map(column => <div key={column.name} className="group flex items-center gap-2 py-2.5 font-mono text-[10px]"><span className="grid h-5 w-5 shrink-0 place-items-center">{column.key?.includes('PK') ? <Key className="h-3 w-3 text-[#f2c95c]" /> : column.key?.includes('FK') ? <Link2 className="h-3 w-3 text-[#61d8ff]" /> : <span className="h-1 w-1 rounded-full bg-[#3f4d60]" />}</span><span className="min-w-0 flex-1 truncate text-[#dce5f2]">{column.name}</span><span className="text-right text-[9px] text-[#66758a]">{column.type}</span>{column.key && <span className="text-[8px] font-bold text-[#ff8f7f]">{column.key}</span>}</div>)}</div>}

            {inspectorTab === 'relationships' && <div className="space-y-2">
              {outgoing.map(connection => { const target = TABLE_BY_ID.get(connection.to)!; return <button key={`${connection.to}-${connection.key}`} type="button" onClick={() => focusTable(target)} className="group flex w-full items-center gap-2 border border-[#61d8ff]/20 bg-[#61d8ff]/[0.035] p-3 text-left hover:border-[#61d8ff]/60"><Route className="h-3.5 w-3.5 text-[#61d8ff]" /><span className="min-w-0 flex-1 font-mono text-[10px] text-white"><strong className="text-[#61d8ff]">{connection.key}</strong> → {connection.to}</span><ChevronRight className="h-3 w-3 text-[#516078] transition-transform group-hover:translate-x-0.5" /></button>; })}
              {incoming.map(connection => { const source = TABLE_BY_ID.get(connection.from)!; return <button key={`${connection.from}-${connection.key}`} type="button" onClick={() => focusTable(source)} className="group flex w-full items-center gap-2 border border-[#8b7cff]/20 bg-[#8b7cff]/[0.035] p-3 text-left hover:border-[#8b7cff]/60"><Link2 className="h-3.5 w-3.5 text-[#8b7cff]" /><span className="min-w-0 flex-1 font-mono text-[10px] text-[#c7d1df]">{connection.from} <strong className="text-[#8b7cff]">references</strong> {connection.key}</span><ChevronRight className="h-3 w-3 text-[#516078] transition-transform group-hover:translate-x-0.5" /></button>; })}
              {outgoing.length === 0 && incoming.length === 0 && <p className="py-8 text-center font-mono text-[10px] text-[#66758a]">No foreign-key relationships.</p>}
            </div>}

            {inspectorTab === 'ddl' && <div><div className="mb-2 flex items-center justify-between"><span className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.15em] text-[#718096]"><Terminal className="h-3.5 w-3.5" /> Definition</span><button type="button" onClick={handleCopyDdl} className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-[#61d8ff] hover:text-white">{copiedDdl ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}{copiedDdl ? 'Copied' : 'Copy DDL'}</button></div><pre className="overflow-x-auto border border-white/[0.09] bg-[#060a10] p-3 font-mono text-[9px] leading-[1.7] text-[#9fb0c5] selection:bg-[#ff6b57]/30">{selectedTable.ddl}</pre></div>}
          </div>
        </aside>
      </div>

      <div className="pointer-events-none absolute left-1/2 top-[116px] z-20 hidden -translate-x-1/2 items-center gap-2 border border-white/[0.08] bg-[#090e16]/75 px-3 py-1.5 font-mono text-[9px] text-[#66758a] backdrop-blur-md md:flex"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#61d8ff]" />{connectedIds.size - 1} live dependencies from public.{selectedTable.name}</div>
    </div>
  );
}
