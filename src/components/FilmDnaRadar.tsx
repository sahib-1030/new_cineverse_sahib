'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dna,
  Database,
  Code2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Award,
  Layers,
  HelpCircle,
  Clock,
  Compass,
  Users,
  Film
} from 'lucide-react';
import { FilmDnaData, FilmDnaAxis } from '@/lib/types';

interface FilmDnaRadarProps {
  dna: FilmDnaData;
  isLoading?: boolean;
}

export default function FilmDnaRadar({ dna, isLoading }: FilmDnaRadarProps) {
  const [activeAxisKey, setActiveAxisKey] = useState<string | null>(null);
  const [showSql, setShowSql] = useState<boolean>(false);

  if (isLoading || !dna) {
    return (
      <div className="p-6 rounded-2xl bg-[#101620] border border-[#2a3547]/40 text-center animate-pulse space-y-3">
        <Dna className="w-8 h-8 text-[#ff6b57] mx-auto animate-spin" />
        <div className="text-xs font-mono text-[#8b98aa] uppercase tracking-wider">
          Synthesizing taste vectors & analytical metrics...
        </div>
      </div>
    );
  }

  const { archetype, axes, metrics, meta } = dna;
  const numAxes = axes.length;
  const cx = 160;
  const cy = 160;
  const maxRadius = 105;

  // Converts polar coordinates (score 0-100, index 0-5) to Cartesian (x, y)
  const getCoordinates = (value: number, index: number, radiusMultiplier: number = 1) => {
    const angle = (index * 2 * Math.PI) / numAxes - Math.PI / 2;
    const r = (Math.max(8, Math.min(100, value)) / 100) * maxRadius * radiusMultiplier;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  };

  // Generate polygon points for data
  const dataPoints = axes.map((axis, i) => getCoordinates(axis.value, i));
  const polygonPointsString = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');

  // Concentric polygon grid levels (20%, 40%, 60%, 80%, 100%)
  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];

  const activeAxis = axes.find((a) => a.key === activeAxisKey) || axes[0];

  return (
    <div className="p-5 sm:p-6 rounded-2xl bg-[#101620] border border-[#2a3547]/40 space-y-5 shadow-xl text-[#f7f8fb]">
      {/* Header & Protocol Pill */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-[#ff6b57]/15 border border-[#ff6b57]/40 text-[#ff8f7f] flex items-center gap-1.5 shadow-sm">
              <Dna className="w-3 h-3 text-[#ff6b57]" />
              FILMDNA™ RADAR
            </span>
            <span className="text-[11px] font-mono text-[#8b98aa]">
              6-Axis Taste Fingerprint
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight mt-1 mb-0">
            Cinematic Taste Vectors
          </h2>
        </div>

        {/* DBMS Execution Receipt */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="px-2.5 py-1 rounded-lg bg-black/40 border border-white/[0.08] text-[11px] font-mono text-[#61d8ff] flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5" />
            <span>{meta.durationMs}ms</span>
            <span className="text-[#3b4c65]">·</span>
            <span className="text-[#a0afc2]">3 SQL aggregates</span>
          </div>
        </div>
      </div>

      {/* Archetype Banner */}
      <div
        className="rounded-xl p-3.5 sm:p-4 border relative overflow-hidden"
        style={{
          backgroundColor: `${archetype.badgeColor}0e`,
          borderColor: `${archetype.badgeColor}40`,
        }}
      >
        <div className="flex items-start gap-3 relative z-10">
          <div
            className="p-2.5 rounded-xl border shrink-0 text-white shadow-md"
            style={{
              backgroundColor: `${archetype.badgeColor}25`,
              borderColor: `${archetype.badgeColor}60`,
            }}
          >
            <Award className="w-5 h-5" style={{ color: archetype.badgeColor }} />
          </div>

          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono uppercase tracking-wider text-[#8b98aa]">
                Taste Archetype
              </span>
              <span
                className="px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wide"
                style={{
                  backgroundColor: `${archetype.badgeColor}25`,
                  color: archetype.badgeColor,
                }}
              >
                {archetype.title}
              </span>
            </div>
            <p className="text-xs sm:text-[13px] text-white font-medium italic m-0">
              &ldquo;{archetype.motto}&rdquo;
            </p>
            <p className="text-xs text-[#a9b7c8] m-0 leading-relaxed pt-0.5">
              {archetype.description}
            </p>
          </div>
        </div>
      </div>

      {/* Hexagonal Radar Chart Display */}
      <div className="flex flex-col items-center justify-center py-2 relative">
        <svg
          viewBox="0 0 320 320"
          className="w-full max-w-[310px] sm:max-w-[330px] aspect-square overflow-visible select-none drop-shadow-md"
        >
          <defs>
            <linearGradient id="dnaPolygonGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff6b57" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.25" />
            </linearGradient>
            <filter id="dnaGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Concentric Hexagon Grid Rings */}
          {gridLevels.map((level, lvlIdx) => {
            const ringPoints = Array.from({ length: numAxes })
              .map((_, i) => {
                const angle = (i * 2 * Math.PI) / numAxes - Math.PI / 2;
                const r = level * maxRadius;
                return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
              })
              .join(' ');

            return (
              <polygon
                key={lvlIdx}
                points={ringPoints}
                fill="none"
                stroke="#2a3547"
                strokeWidth={level === 1.0 ? '1.5' : '1'}
                strokeOpacity={level === 1.0 ? '0.6' : '0.25'}
                strokeDasharray={level < 1.0 ? '3 3' : undefined}
              />
            );
          })}

          {/* Radial Spokes / Axes */}
          {axes.map((_, i) => {
            const angle = (i * 2 * Math.PI) / numAxes - Math.PI / 2;
            const endX = cx + maxRadius * Math.cos(angle);
            const endY = cy + maxRadius * Math.sin(angle);
            return (
              <line
                key={i}
                x1={cx}
                y1={cy}
                x2={endX}
                y2={endY}
                stroke="#2a3547"
                strokeWidth="1"
                strokeOpacity="0.4"
              />
            );
          })}

          {/* Animated Filled Data Polygon */}
          <polygon
            points={polygonPointsString}
            fill="url(#dnaPolygonGradient)"
            stroke="#ff6b57"
            strokeWidth="2.5"
            strokeLinejoin="round"
            filter="url(#dnaGlow)"
            className="transition-all duration-700 ease-out"
          />

          {/* Vertices & Hover Nodes */}
          {dataPoints.map((pt, i) => {
            const axis = axes[i];
            const isHovered = activeAxisKey === axis.key;
            return (
              <g
                key={axis.key}
                className="cursor-pointer group"
                onMouseEnter={() => setActiveAxisKey(axis.key)}
                onClick={() => setActiveAxisKey(axis.key)}
              >
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 6 : 4}
                  fill={isHovered ? '#61d8ff' : '#ff6b57'}
                  stroke="#101620"
                  strokeWidth="2"
                  className="transition-all duration-200"
                />
              </g>
            );
          })}

          {/* Axis Labels positioned around the Hexagon */}
          {axes.map((axis, i) => {
            const angle = (i * 2 * Math.PI) / numAxes - Math.PI / 2;
            const labelRadius = maxRadius + 28;
            const lx = cx + labelRadius * Math.cos(angle);
            const ly = cy + labelRadius * Math.sin(angle);
            const isSelected = activeAxisKey === axis.key;

            return (
              <text
                key={axis.key}
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="10"
                fontWeight={isSelected ? 'bold' : 'normal'}
                fill={isSelected ? '#61d8ff' : '#94a3b8'}
                className="cursor-pointer select-none font-mono tracking-tight transition-colors"
                onMouseEnter={() => setActiveAxisKey(axis.key)}
                onClick={() => setActiveAxisKey(axis.key)}
              >
                {axis.label}
              </text>
            );
          })}
        </svg>

        {/* Selected Axis Callout */}
        {activeAxis && (
          <div className="w-full mt-3 p-3 rounded-xl bg-black/40 border border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">{activeAxis.label}</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#61d8ff]/20 text-[#61d8ff]">
                  Score: {activeAxis.value}/100
                </span>
              </div>
              <p className="text-[11px] text-[#9bb0c9] m-0 mt-0.5">
                {activeAxis.description}
              </p>
            </div>
            <div className="text-left sm:text-right shrink-0">
              <span className="text-[10px] text-[#8b98aa] block font-mono">Actual Metric</span>
              <strong className="text-xs font-mono text-[#ff9b83]">{activeAxis.rawValue}</strong>
            </div>
          </div>
        )}
      </div>

      {/* Axis Metric Badges Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 border-t border-white/[0.06]">
        {axes.map((axis) => {
          const isSelected = activeAxisKey === axis.key;
          return (
            <button
              key={axis.key}
              type="button"
              onClick={() => setActiveAxisKey(axis.key)}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                isSelected
                  ? 'bg-white/[0.08] border-[#61d8ff]/60 ring-1 ring-[#61d8ff]'
                  : 'bg-black/25 border-white/[0.04] hover:bg-white/[0.04]'
              }`}
            >
              <div className="text-[10px] text-[#8b98aa] truncate">{axis.label}</div>
              <div className="flex items-baseline justify-between gap-1 mt-0.5">
                <span className="text-sm font-bold text-white font-mono">{axis.value}</span>
                <span className="text-[10px] font-mono text-[#ff9b83] truncate">{axis.rawValue}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* SQL Transparency Drawer */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setShowSql(!showSql)}
          className="w-full flex items-center justify-between text-xs font-mono text-[#8b98aa] hover:text-white transition-colors py-1.5 px-2 rounded-lg hover:bg-white/[0.03]"
        >
          <div className="flex items-center gap-1.5">
            <Code2 className="w-3.5 h-3.5 text-[#61d8ff]" />
            <span>Analytical SQL Query Plan</span>
          </div>
          {showSql ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        <AnimatePresence>
          {showSql && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden pt-2"
            >
              <div className="p-3 rounded-xl bg-black/70 border border-[#2a3547]/60 font-mono text-[11px] text-[#86e1fc] space-y-1.5 overflow-x-auto">
                <div className="flex items-center justify-between text-[10px] text-[#8b98aa] border-b border-white/[0.08] pb-1">
                  <span>POSTGRESQL STATISTICAL QUERIES</span>
                  <span>TIME: {meta.durationMs}ms</span>
                </div>
                <pre className="m-0 leading-relaxed text-[#c3e88d] whitespace-pre-wrap">
                  {`-- 1. Genre Diversity Vector
SELECT COUNT(DISTINCT mg.genre_id), (SELECT COUNT(*) FROM genres)
FROM reviews r JOIN movie_genres mg ON mg.movie_id = r.movie_id WHERE r.user_id = $1;

-- 2. Epic Preference & Runtime Profile
SELECT COUNT(*) FILTER (WHERE m.runtime >= 135), AVG(m.runtime)
FROM reviews r JOIN movies m ON m.movie_id = r.movie_id WHERE r.user_id = $1;

-- 3. Temporal Release Dispersion
SELECT STDDEV(EXTRACT(YEAR FROM m.release_date))
FROM reviews r JOIN movies m ON m.movie_id = r.movie_id WHERE r.user_id = $1;`}
                </pre>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
