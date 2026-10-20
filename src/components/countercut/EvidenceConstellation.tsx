'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Film,
  User,
  Quote,
  Database,
  CheckCircle2,
  ArrowRight,
  Maximize2,
  RotateCcw,
  Layers,
  Info,
  X
} from 'lucide-react';
import { CountercutCase, EvidenceRecord } from '@/lib/countercut/types';

interface EvidenceConstellationProps {
  activeCase: CountercutCase;
  onSelectEvidence?: (evidenceId: string) => void;
}

interface GraphNode {
  id: string;
  type: 'film' | 'critic' | 'evidence' | 'claim';
  title: string;
  subtitle: string;
  x: number;
  y: number;
  data: any;
  highlight?: boolean;
}

interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  dashed?: boolean;
}

export default function EvidenceConstellation({
  activeCase,
  onSelectEvidence,
}: EvidenceConstellationProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'evidence' | 'films'>('all');
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Compute graph nodes and relational edges based on actual PostgreSQL records
  const { nodes, edges } = useMemo(() => {
    const nList: GraphNode[] = [];
    const eList: GraphEdge[] = [];

    const isOpposite = activeCase.mode === 'opposite_critic';

    // 1. Primary Subject Node (Center-Left)
    if (activeCase.primaryMovie) {
      nList.push({
        id: 'node-film-1',
        type: 'film',
        title: activeCase.primaryMovie.title,
        subtitle: `You rated ★ ${activeCase.primaryMovie.userRating || 9.6}`,
        x: 180,
        y: 190,
        data: activeCase.primaryMovie,
      });
    }

    // 2. Secondary Subject Node (Center-Right)
    if (isOpposite && activeCase.oppositeCritic) {
      nList.push({
        id: 'node-critic-opp',
        type: 'critic',
        title: activeCase.oppositeCritic.displayName || 'Elena Rostov',
        subtitle: `@${activeCase.oppositeCritic.username || 'elena_r'} (Opposing)`,
        x: 580,
        y: 190,
        data: activeCase.oppositeCritic,
      });
    } else if (activeCase.secondaryMovie) {
      nList.push({
        id: 'node-film-2',
        type: 'film',
        title: activeCase.secondaryMovie.title,
        subtitle: `You rated ★ ${activeCase.secondaryMovie.userRating || 4.5}`,
        x: 580,
        y: 190,
        data: activeCase.secondaryMovie,
      });
    }

    // Central Contradiction Link between Subject 1 and Subject 2
    if (nList.length >= 2) {
      eList.push({
        id: 'edge-central-delta',
        source: nList[0].id,
        target: nList[1].id,
        label: activeCase.connectorLabel || 'Divergence Delta',
        dashed: false,
      });
    }

    // 3. Evidence Review Nodes (Spread out below and above)
    const evidenceList = activeCase.evidence || [];
    evidenceList.forEach((ev, i) => {
      const isTop = i % 2 === 0;
      const xPos = 240 + (i * 280) / Math.max(1, evidenceList.length - 1);
      const yPos = isTop ? 75 : 305;

      const evNodeId = `node-ev-${ev.id}`;
      nList.push({
        id: evNodeId,
        type: 'evidence',
        title: `#${ev.id} • ${ev.author || 'Review'}`,
        subtitle: `★ ${ev.rating || '9.6'} on ${ev.title}`,
        x: xPos,
        y: yPos,
        data: ev,
      });

      // Link evidence to primary film if titles match
      if (activeCase.primaryMovie && ev.title.toLowerCase().includes(activeCase.primaryMovie.title.toLowerCase())) {
        eList.push({
          id: `edge-ev-${ev.id}-film-1`,
          source: evNodeId,
          target: 'node-film-1',
          label: 'Relational Citation',
          dashed: true,
        });
      }

      // Link evidence to secondary film or opponent
      if (isOpposite) {
        eList.push({
          id: `edge-ev-${ev.id}-opp`,
          source: evNodeId,
          target: 'node-critic-opp',
          label: 'Reviewer Lineage',
          dashed: true,
        });
      } else if (activeCase.secondaryMovie && ev.title.toLowerCase().includes(activeCase.secondaryMovie.title.toLowerCase())) {
        eList.push({
          id: `edge-ev-${ev.id}-film-2`,
          source: evNodeId,
          target: 'node-film-2',
          label: 'Relational Citation',
          dashed: true,
        });
      }
    });

    // 4. Claims as Grounding Anchor Nodes
    const claims = activeCase.claims || [];
    claims.slice(0, 2).forEach((c, idx) => {
      const claimId = `node-claim-${idx}`;
      const xPos = 380;
      const yPos = idx === 0 ? 30 : 350;

      nList.push({
        id: claimId,
        type: 'claim',
        title: `Claim #${idx + 1}`,
        subtitle: c.strength === 'insufficient' ? 'Unsupported' : 'Verified Claim',
        x: xPos,
        y: yPos,
        data: c,
      });

      // Connect claim to cited evidence nodes
      c.evidenceIds?.forEach((eid) => {
        const evTarget = `node-ev-${eid}`;
        if (nList.some((n) => n.id === evTarget)) {
          eList.push({
            id: `edge-claim-${idx}-ev-${eid}`,
            source: claimId,
            target: evTarget,
            label: 'Empirical Grounding',
            dashed: false,
          });
        }
      });
    });

    return { nodes: nList, edges: eList };
  }, [activeCase]);

  // Filtered nodes based on user toggle
  const filteredNodes = useMemo(() => {
    if (filterType === 'all') return nodes;
    if (filterType === 'evidence') return nodes.filter((n) => n.type === 'evidence' || n.type === 'claim');
    if (filterType === 'films') return nodes.filter((n) => n.type === 'film' || n.type === 'critic');
    return nodes;
  }, [nodes, filterType]);

  const activeNode = nodes.find((n) => n.id === selectedNodeId) || null;

  return (
    <div className="rounded-2xl bg-[#101620] border border-[#2a3547] overflow-hidden shadow-2xl relative select-none">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 border-b border-[#2a3547]/60 bg-[#080c12]">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff6b57] shadow-[0_0_8px_#ff6b57]" />
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-[#ff6b57] font-bold block">
              EVIDENCE CONSTELLATION GRAPH
            </span>
            <span className="text-[11px] text-[#8b98aa] block">
              Interactive foreign-key topology: Films • Reviewers • Quotes • Hypotheses
            </span>
          </div>
        </div>

        {/* Graph Controls */}
        <div className="flex items-center gap-2 text-xs">
          {/* Filter Pills */}
          <div className="flex items-center bg-[#221f1c] border border-[#2a3547] rounded-lg p-0.5">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                filterType === 'all'
                  ? 'bg-[#ff6b57] text-[#070a0f] font-bold'
                  : 'text-[#8b98aa] hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('evidence')}
              className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                filterType === 'evidence'
                  ? 'bg-[#ff6b57] text-[#070a0f] font-bold'
                  : 'text-[#8b98aa] hover:text-white'
              }`}
            >
              Evidence Only
            </button>
            <button
              onClick={() => setFilterType('films')}
              className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                filterType === 'films'
                  ? 'bg-[#ff6b57] text-[#070a0f] font-bold'
                  : 'text-[#8b98aa] hover:text-white'
              }`}
            >
              Films & Critics
            </button>
          </div>

          {/* Reset Zoom */}
          <button
            onClick={() => {
              setZoomLevel(1);
              setSelectedNodeId(null);
            }}
            className="w-7 h-7 rounded-lg bg-[#221f1c] border border-[#2a3547] flex items-center justify-center text-[#8b98aa] hover:text-white transition-colors"
            title="Reset View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="relative w-full h-[380px] sm:h-[420px] bg-[#0f0e0d] overflow-hidden">
        {/* Subtle Background Matrix Grid */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #ff6b57 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        <svg
          viewBox="0 0 760 380"
          className="w-full h-full cursor-crosshair"
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'center center',
            transition: 'transform 0.2s ease-out',
          }}
        >
          <defs>
            <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff6b57" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#ff6b57" stopOpacity="0.2" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="glow" />
              <feComposite in="SourceGraphic" in2="glow" operator="over" />
            </filter>
          </defs>

          {/* Render Relational Edges */}
          {edges.map((edge) => {
            const src = nodes.find((n) => n.id === edge.source);
            const tgt = nodes.find((n) => n.id === edge.target);
            if (!src || !tgt) return null;

            const isHighlighted = selectedNodeId === src.id || selectedNodeId === tgt.id;

            return (
              <g key={edge.id} className="transition-opacity duration-300">
                <line
                  x1={src.x}
                  y1={src.y}
                  x2={tgt.x}
                  y2={tgt.y}
                  stroke={isHighlighted ? '#ff6b57' : '#2a3547'}
                  strokeWidth={isHighlighted ? 2.5 : 1.5}
                  strokeDasharray={edge.dashed ? '4,4' : 'none'}
                  strokeOpacity={isHighlighted ? 1 : 0.6}
                  filter={isHighlighted ? 'url(#glow)' : undefined}
                />
                {edge.label && (
                  <text
                    x={(src.x + tgt.x) / 2}
                    y={(src.y + tgt.y) / 2 - 6}
                    fill={isHighlighted ? '#ff6b57' : '#8b98aa'}
                    fontSize="9"
                    fontFamily="monospace"
                    textAnchor="middle"
                    className="select-none"
                  >
                    {edge.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* Render Graph Nodes */}
          {filteredNodes.map((node) => {
            const isSelected = selectedNodeId === node.id;

            let fillColor = '#101620';
            let strokeColor = '#2a3547';
            let iconLetter = 'F';

            if (node.type === 'film') {
              fillColor = '#221915';
              strokeColor = '#ff6b57';
              iconLetter = '🎬';
            } else if (node.type === 'critic') {
              fillColor = '#191f24';
              strokeColor = '#38bdf8';
              iconLetter = '👤';
            } else if (node.type === 'evidence') {
              fillColor = '#1e1c18';
              strokeColor = '#fbbf24';
              iconLetter = '💬';
            } else if (node.type === 'claim') {
              fillColor = '#1e1919';
              strokeColor = '#f87171';
              iconLetter = '💡';
            }

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() => setSelectedNodeId(node.id)}
                className="cursor-pointer group"
              >
                {/* Outer Glow Halo on selection */}
                {isSelected && (
                  <circle
                    r="28"
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="2"
                    strokeOpacity="0.4"
                    className="animate-ping"
                  />
                )}

                {/* Node Base Circle */}
                <circle
                  r="20"
                  fill={fillColor}
                  stroke={isSelected ? '#ffffff' : strokeColor}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                  filter={isSelected ? 'url(#glow)' : undefined}
                  className="transition-transform duration-200 group-hover:scale-110"
                />

                {/* Icon Inside Node */}
                <text
                  textAnchor="middle"
                  dy="5"
                  fontSize="12"
                  className="pointer-events-none select-none"
                >
                  {iconLetter}
                </text>

                {/* Node Title & Subtitle Labels */}
                <text
                  y="34"
                  textAnchor="middle"
                  fill={isSelected ? '#ffffff' : '#f7f8fb'}
                  fontSize="11"
                  fontWeight="bold"
                  className="select-none pointer-events-none"
                >
                  {node.title.length > 20 ? `${node.title.slice(0, 18)}...` : node.title}
                </text>

                <text
                  y="46"
                  textAnchor="middle"
                  fill="#8b98aa"
                  fontSize="9"
                  fontFamily="monospace"
                  className="select-none pointer-events-none"
                >
                  {node.subtitle}
                </text>
              </g>
            );
          })}
        </svg>

        {/* BOTTOM HINT PILL */}
        <div className="absolute bottom-3 left-4 text-[10px] font-mono text-[#8c7f73] pointer-events-none">
          Click any node or link to inspect PostgreSQL source records
        </div>

        {/* ACTIVE NODE SOURCE INSPECTOR CARD */}
        <AnimatePresence>
          {activeNode && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute top-4 right-4 w-72 sm:w-80 bg-[#101620]/95 border border-[#ff6b57] rounded-xl p-4 shadow-2xl backdrop-blur-md z-30 space-y-2.5 text-xs text-[#f7f8fb]"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#ff6b57] font-bold">
                  {activeNode.type.toUpperCase()} SOURCE RECORD
                </span>
                <button
                  onClick={() => setSelectedNodeId(null)}
                  className="text-[#8b98aa] hover:text-white p-0.5 rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="font-bold text-sm text-white">{activeNode.title}</div>
              <div className="text-[11px] font-mono text-[#cfc2b6]">{activeNode.subtitle}</div>

              {/* Node Specific Contents */}
              {activeNode.type === 'evidence' && (
                <div className="space-y-2 pt-1 border-t border-white/5">
                  <p className="text-[11px] italic text-[#d8dee8] leading-relaxed">
                    "{activeNode.data.snippet}"
                  </p>
                  <div className="flex items-center justify-between text-[10px] font-mono text-[#8b98aa]">
                    <span>Source: reviews.review_text</span>
                    <span>PK: #{activeNode.data.targetId || 1}</span>
                  </div>
                  {onSelectEvidence && (
                    <button
                      onClick={() => onSelectEvidence(activeNode.data.id)}
                      className="w-full py-1.5 px-3 rounded-lg bg-[#ff6b57] hover:bg-[#e47d66] text-[#070a0f] font-bold text-[11px] transition-colors"
                    >
                      Focus Evidence Card #{activeNode.data.id} →
                    </button>
                  )}
                </div>
              )}

              {activeNode.type === 'film' && (
                <div className="pt-1 border-t border-white/5 space-y-2">
                  <div className="text-[11px] text-[#8b98aa]">
                    Relational Movie Registry: ID #{activeNode.data.movie_id}
                  </div>
                  <Link
                    href={`/movies/${activeNode.data.movie_id}`}
                    className="block text-center py-1.5 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold text-[11px] transition-colors"
                  >
                    Open Film Archive Page →
                  </Link>
                </div>
              )}

              {activeNode.type === 'critic' && (
                <div className="pt-1 border-t border-white/5 space-y-2">
                  <div className="text-[11px] text-[#8b98aa]">
                    Evaluated User Persona: @{activeNode.data.username} (User #{activeNode.data.userId})
                  </div>
                  <Link
                    href={`/profile/${activeNode.data.userId}`}
                    className="block text-center py-1.5 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-white font-semibold text-[11px] transition-colors"
                  >
                    View Critic Profile →
                  </Link>
                </div>
              )}

              {activeNode.type === 'claim' && (
                <div className="pt-1 border-t border-white/5 space-y-1">
                  <div className="text-[11px] text-[#d8dee8]">{activeNode.data.text}</div>
                  <div className="text-[10px] font-mono text-[#ff6b57]">
                    Linked evidence: {activeNode.data.evidenceIds?.join(', ') || 'None'}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
