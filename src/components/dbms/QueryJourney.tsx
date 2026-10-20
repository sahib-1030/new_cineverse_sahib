'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Database,
  ArrowRight,
  Layers,
  Filter,
  Table as TableIcon,
  Sparkles,
  GitCommit,
  CheckCircle2
} from 'lucide-react';

interface QueryJourneyProps {
  sql: string;
  rowCount: number;
  durationMs: number;
  columns: string[];
}

export default function QueryJourney({
  sql,
  rowCount,
  durationMs,
  columns,
}: QueryJourneyProps) {
  // Parse referenced tables from SQL
  const analysis = useMemo(() => {
    const knownTables = [
      'movies',
      'genres',
      'movie_genres',
      'reviews',
      'users',
      'watchlists',
      'watchlist_items',
      'activity_logs',
      'review_likes',
      'follows',
      'people',
      'movie_cast',
      'v_trending_movies',
      'v_recent_activity_feed',
      'db_action_traces',
      'db_action_trace_steps',
      'agent_cases',
      'agent_case_evidence'
    ];

    const referencedTables = knownTables.filter((tbl) =>
      new RegExp(`\\b${tbl}\\b`, 'i').test(sql)
    );

    const operations: string[] = [];
    if (/JOIN\b/i.test(sql)) operations.push('RELATIONAL JOIN');
    if (/WHERE\b/i.test(sql)) operations.push('FILTER PREDICATE');
    if (/GROUP BY\b/i.test(sql)) operations.push('GROUPED AGGREGATION');
    if (/OVER\s*\(/i.test(sql)) operations.push('WINDOW FUNCTION');
    if (/ORDER BY\b/i.test(sql)) operations.push('TOP-K SORT');
    if (/LIMIT\b/i.test(sql)) operations.push('LIMIT SCAN');
    if (operations.length === 0) operations.push('TABLE SCAN & PROJECTION');

    return {
      tables: referencedTables.length > 0 ? referencedTables : ['movies'],
      operations,
    };
  }, [sql]);

  return (
    <div className="p-5 rounded-2xl bg-[#141211] border border-[#2a3547] space-y-5 select-none shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2a3547]/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#38bdf8]" />
          <span className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold">
            QUERY JOURNEY & EXECUTION LINEAGE
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono text-[#8b98aa]">
          <span className="text-emerald-400 font-bold">{rowCount} rows materialized</span>
          <span>•</span>
          <span>{durationMs}ms engine latency</span>
        </div>
      </div>

      {/* 3-Stage Relational Flow Visualization */}
      <div className="grid grid-cols-1 md:grid-cols-11 gap-4 items-center">
        {/* Stage 1: Referenced Source Tables (Left 3 cols) */}
        <div className="md:col-span-3 space-y-2">
          <div className="text-[10px] font-mono text-[#8b98aa] uppercase tracking-wider flex items-center gap-1.5 font-bold">
            <Database className="w-3.5 h-3.5 text-[#ff6b57]" />
            <span>SOURCE RELATIONS ({analysis.tables.length})</span>
          </div>

          <div className="space-y-1.5">
            {analysis.tables.map((tbl) => (
              <div
                key={tbl}
                className="p-2.5 rounded-xl bg-[#1c1917] border border-[#2a3547] flex items-center justify-between text-xs text-white"
              >
                <div className="flex items-center gap-2">
                  <TableIcon className="w-3.5 h-3.5 text-[#ff6b57]" />
                  <span className="font-mono font-bold">{tbl}</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400">READ</span>
              </div>
            ))}
          </div>
        </div>

        {/* Arrow Connector */}
        <div className="hidden md:flex md:col-span-1 justify-center text-[#2a3547]">
          <ArrowRight className="w-5 h-5" />
        </div>

        {/* Stage 2: Applied Operations (Center 3 cols) */}
        <div className="md:col-span-3 space-y-2">
          <div className="text-[10px] font-mono text-[#8b98aa] uppercase tracking-wider flex items-center gap-1.5 font-bold">
            <Filter className="w-3.5 h-3.5 text-amber-400" />
            <span>APPLIED PIPELINE</span>
          </div>

          <div className="space-y-1.5">
            {analysis.operations.map((op, i) => (
              <div
                key={i}
                className="p-2.5 rounded-xl bg-[#201d1a] border border-[#2a3547] flex items-center gap-2 text-xs text-[#cfc2b6]"
              >
                <GitCommit className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="font-mono text-[11px] font-bold text-white">{op}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Arrow Connector */}
        <div className="hidden md:flex md:col-span-1 justify-center text-[#2a3547]">
          <ArrowRight className="w-5 h-5" />
        </div>

        {/* Stage 3: Projected Result Grid (Right 3 cols) */}
        <div className="md:col-span-3 space-y-2">
          <div className="text-[10px] font-mono text-[#8b98aa] uppercase tracking-wider flex items-center gap-1.5 font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>MATERIALIZED TUPLES</span>
          </div>

          <div className="p-3 rounded-xl bg-[#1c1917] border border-[#2a3547] space-y-2 text-xs">
            <div className="flex items-center justify-between text-[11px] font-mono border-b border-white/5 pb-1">
              <span className="text-[#8b98aa]">Tuples returned:</span>
              <span className="text-white font-bold">{rowCount} rows</span>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono border-b border-white/5 pb-1">
              <span className="text-[#8b98aa]">Execution time:</span>
              <span className="text-[#ff6b57] font-bold">{durationMs} ms</span>
            </div>
            <div className="pt-1">
              <span className="text-[10px] font-mono text-[#8b98aa] block mb-1">Columns:</span>
              <div className="flex flex-wrap gap-1">
                {columns.slice(0, 5).map((col) => (
                  <span
                    key={col}
                    className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-[#cfc2b6] border border-white/10"
                  >
                    {col}
                  </span>
                ))}
                {columns.length > 5 && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 text-[#8c7f73]">
                    +{columns.length - 5} more
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
