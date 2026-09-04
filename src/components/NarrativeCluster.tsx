'use client';

import React, { useState, useMemo } from 'react';
import { ConsensusResult, TokenSignal } from '../types/terminal';
import { Compass, Sparkles, Target, Info, Layers } from 'lucide-react';
import { PRD_THRESHOLDS } from '../config/constants';

interface NarrativeClusterProps {
  consensusFeed: ConsensusResult[];
  selectedResult: ConsensusResult | null;
  onSelectToken?: (result: ConsensusResult) => void;
}

interface Centroid {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
  radius: number;
  description: string;
}

const CENTROIDS: Centroid[] = [
  {
    id: 'AI / AGENTIC',
    name: 'AI Agents & LLM Meta',
    x: 150,
    y: 110,
    color: '#0DF289',
    radius: 65,
    description: 'Autonomous trading bot & AI model narratives'
  },
  {
    id: 'POLITIFI',
    name: 'Neo-Politifi & Macro',
    x: 350,
    y: 105,
    color: '#00F0FF',
    radius: 60,
    description: 'Election, global geopolitical & political memetics'
  },
  {
    id: 'CULT',
    name: 'Cults & Occult Meme',
    x: 365,
    y: 265,
    color: '#A855F7',
    radius: 60,
    description: 'High-conviction decentralized cults & esoteric symbols'
  },
  {
    id: 'ANIMALS',
    name: 'Animals & Doge Meta',
    x: 145,
    y: 260,
    color: '#F59E0B',
    radius: 55,
    description: 'Classic pet, mascot, and zoo tokens'
  }
];

export default function NarrativeCluster({
  consensusFeed,
  selectedResult,
  onSelectToken
}: NarrativeClusterProps) {
  const [hoveredToken, setHoveredToken] = useState<ConsensusResult | null>(null);

  // Map tokens to coordinates in 500x360 2D embedding space
  const tokenPoints = useMemo(() => {
    return consensusFeed.map((item, index) => {
      const { token, verdict } = item;
      const themeLower = (token.narrativeTheme || '').toLowerCase();
      
      let centroid = CENTROIDS[0]; // default AI
      if (themeLower.includes('politi') || themeLower.includes('macro') || themeLower.includes('trump') || themeLower.includes('usa')) {
        centroid = CENTROIDS[1];
      } else if (themeLower.includes('cult') || themeLower.includes('meme') || themeLower.includes('esoteric')) {
        centroid = CENTROIDS[2];
      } else if (themeLower.includes('dog') || themeLower.includes('cat') || themeLower.includes('pepe') || themeLower.includes('animal')) {
        centroid = CENTROIDS[3];
      }

      // Calculate distance based on cosine similarity
      const sim = Math.max(0.2, Math.min(1.0, token.narrativeCosineSim || 0.5));
      const normalizedDist = (1 - sim) * 160 + 10;
      
      // Seed pseudo-random angle by token mint/symbol
      const angleSeed = token.symbol.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) + index * 47;
      const angle = (angleSeed % 360) * (Math.PI / 180);

      const x = Math.max(30, Math.min(470, centroid.x + Math.cos(angle) * normalizedDist));
      const y = Math.max(30, Math.min(330, centroid.y + Math.sin(angle) * normalizedDist));

      return {
        item,
        token,
        verdict,
        sim,
        x,
        y,
        centroid,
        distToCentroid: +(normalizedDist).toFixed(1)
      };
    });
  }, [consensusFeed]);

  const selectedPoint = useMemo(() => {
    if (!selectedResult) return null;
    return tokenPoints.find(p => p.token.id === selectedResult.token.id) || null;
  }, [selectedResult, tokenPoints]);

  return (
    <div className="bg-terminal-panel border border-terminal-border rounded-xl p-3.5 space-y-3 shadow-xl relative">
      {/* Header with Title & Centroid Filter */}
      <div className="flex items-center justify-between border-b border-terminal-border pb-2.5">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-terminal-cyan" />
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-terminal-text flex items-center gap-2">
              Narrative Embedding Cluster 2D
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-terminal-cyan/15 text-terminal-cyan border border-terminal-cyan/30 font-mono">
                COS-SIM &ge; {PRD_THRESHOLDS.MIN_COSINE_SIMILARITY}
              </span>
            </h3>
            <p className="text-[10px] text-terminal-muted">
              Proyeksi Vektor Semantik t-SNE / PCA terhadap Meta Cluster Aktif Solana
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1 text-terminal-green">
            <span className="w-2 h-2 rounded-full bg-terminal-green inline-block shadow-[0_0_6px_#0DF289]"></span>
            Approved (&ge;0.85)
          </span>
          <span className="flex items-center gap-1 text-terminal-amber">
            <span className="w-2 h-2 rounded-full bg-terminal-amber inline-block"></span>
            Borderline
          </span>
          <span className="flex items-center gap-1 text-terminal-red">
            <span className="w-2 h-2 rounded-full bg-terminal-red inline-block"></span>
            Vetoed (&lt;0.85)
          </span>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="relative w-full aspect-[500/360] bg-terminal-bg rounded-lg border border-terminal-border overflow-hidden select-none">
        <svg
          viewBox="0 0 500 360"
          className="w-full h-full"
        >
          <defs>
            <radialGradient id="bgRadialCluster" cx="50%" cy="50%" r="70%">
              <stop offset="0%" stopColor="#0DF289" stopOpacity="0.03" />
              <stop offset="100%" stopColor="#030706" stopOpacity="0.9" />
            </radialGradient>

            <filter id="glowGreenCluster" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Canvas Background */}
          <rect width="500" height="360" fill="url(#bgRadialCluster)" />

          {/* Subtle Grid Lines */}
          <g stroke="#161B19" strokeWidth="1">
            {[60, 120, 180, 240, 300].map(y => (
              <line key={'h' + y} x1="0" y1={y} x2="500" y2={y} strokeDasharray="3 3" />
            ))}
            {[100, 200, 300, 400].map(x => (
              <line key={'v' + x} x1={x} y1="0" x2={x} y2="360" strokeDasharray="3 3" />
            ))}
          </g>

          {/* Render Cluster Centroids (Meta Zones) */}
          {CENTROIDS.map(c => {
            return (
              <g key={c.id} className="transition-opacity duration-300">
                {/* 0.85 Threshold Capture Boundary */}
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={c.radius}
                  fill={c.color}
                  fillOpacity="0.05"
                  stroke={c.color}
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  strokeOpacity="0.4"
                />
                
                {/* Outer halo */}
                <circle
                  cx={c.x}
                  cy={c.y}
                  r={c.radius + 18}
                  fill="none"
                  stroke={c.color}
                  strokeWidth="0.7"
                  strokeOpacity="0.15"
                  strokeDasharray="2 4"
                />

                {/* Centroid Core Pin */}
                <circle
                  cx={c.x}
                  cy={c.y}
                  r="4"
                  fill={c.color}
                  stroke="#030706"
                  strokeWidth="1.5"
                />

                {/* Centroid Label Badge */}
                <text
                  x={c.x}
                  y={c.y - c.radius - 6}
                  textAnchor="middle"
                  fill={c.color}
                  fontSize="9"
                  fontWeight="800"
                  letterSpacing="0.5"
                  className="uppercase"
                >
                  {c.name}
                </text>
                <text
                  x={c.x}
                  y={c.y - c.radius + 4}
                  textAnchor="middle"
                  fill="#667670"
                  fontSize="7.5"
                >
                  Cluster Zone (cos &ge; 0.85)
                </text>
              </g>
            );
          })}

          {/* Connecting Line to Selected Token */}
          {selectedPoint && (
            <g>
              <line
                x1={selectedPoint.centroid.x}
                y1={selectedPoint.centroid.y}
                x2={selectedPoint.x}
                y2={selectedPoint.y}
                stroke={selectedPoint.verdict === 'APPROVED' ? '#0DF289' : '#E5484D'}
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <circle
                cx={selectedPoint.x}
                cy={selectedPoint.y}
                r="12"
                fill="none"
                stroke={selectedPoint.verdict === 'APPROVED' ? '#0DF289' : '#E5484D'}
                strokeWidth="1.5"
                opacity="0.75"
              />
            </g>
          )}

          {/* Render Token Nodes in Embedding Space */}
          {tokenPoints.map(({ item, token, verdict, sim, x, y }) => {
            const isSelected = selectedResult?.token.id === token.id;
            const isApproved = verdict === 'APPROVED';
            const isBorderline = !isApproved && sim >= 0.75;
            
            let fillColor = '#E5484D';
            if (isApproved) fillColor = '#0DF289';
            else if (isBorderline) fillColor = '#F59E0B';

            return (
              <g
                key={token.id}
                className="cursor-pointer transition-transform hover:scale-125"
                onClick={() => onSelectToken && onSelectToken(item)}
                onMouseEnter={() => setHoveredToken(item)}
                onMouseLeave={() => setHoveredToken(null)}
              >
                {/* Node Outer Ring */}
                <circle
                  cx={x}
                  cy={y}
                  r={isSelected ? 6.5 : isApproved ? 5 : 4}
                  fill={fillColor}
                  fillOpacity={isApproved ? 0.9 : 0.75}
                  stroke={isSelected ? '#FFFFFF' : '#030706'}
                  strokeWidth={isSelected ? 2 : 1}
                  filter={isApproved ? 'url(#glowGreenCluster)' : undefined}
                />

                {/* Token Symbol mini label */}
                {(isSelected || isApproved) && (
                  <text
                    x={x}
                    y={y + 11}
                    textAnchor="middle"
                    fill={isSelected ? '#FFFFFF' : fillColor}
                    fontSize="8"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {token.symbol}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredToken && (
          <div
            className="absolute top-3 left-3 bg-terminal-card/95 backdrop-blur border border-terminal-border rounded-lg p-2.5 shadow-2xl text-[11px] pointer-events-none z-20 max-w-[220px] space-y-1"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-terminal-text">{hoveredToken.token.symbol}</span>
              <span className={'text-[9px] px-1.5 py-0.2 rounded font-black ' + (
                hoveredToken.verdict === 'APPROVED'
                  ? 'bg-terminal-green/20 text-terminal-green border border-terminal-green/50'
                  : 'bg-terminal-red/20 text-terminal-red border border-terminal-red/50'
              )}>
                {hoveredToken.verdict}
              </span>
            </div>
            <p className="text-[10px] text-terminal-muted truncate">{hoveredToken.token.name}</p>
            <div className="pt-1 border-t border-terminal-border/50 text-[10px] space-y-0.5">
              <div className="flex justify-between">
                <span className="text-terminal-muted">Cos-Similarity:</span>
                <span className={'font-mono font-bold ' + (
                  hoveredToken.token.narrativeCosineSim >= 0.85 ? 'text-terminal-green' : 'text-terminal-red'
                )}>
                  {hoveredToken.token.narrativeCosineSim.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-terminal-muted">Tema Narasi:</span>
                <span className="text-terminal-cyan truncate max-w-[110px]">
                  {hoveredToken.token.narrativeTheme || 'Meme General'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-terminal-muted">Platform:</span>
                <span className="text-terminal-text">{hoveredToken.token.platform}</span>
              </div>
            </div>
          </div>
        )}

        {/* Selected Token Vector Metrics Overlay */}
        {selectedPoint && (
          <div className="absolute bottom-2 right-2 bg-terminal-panel/90 backdrop-blur border border-terminal-border/80 px-2.5 py-1.5 rounded text-[10px] font-mono space-y-0.5 text-right">
            <div className="text-terminal-muted text-[9px]">Vektor Target Terpilih:</div>
            <div className="font-bold text-terminal-text">
              {selectedPoint.token.symbol} &rarr; {selectedPoint.centroid.id}
            </div>
            <div className="text-terminal-cyan">
              &Delta;v = {(1 - selectedPoint.sim).toFixed(3)} | Cos-Sim: {selectedPoint.sim.toFixed(2)}
            </div>
          </div>
        )}
      </div>

      {/* Cluster Footer Telemetry */}
      <div className="grid grid-cols-4 gap-2 text-center text-[10px] pt-1 border-t border-terminal-border/60">
        {CENTROIDS.map(c => {
          const count = tokenPoints.filter(p => p.centroid.id === c.id).length;
          const approvedCount = tokenPoints.filter(p => p.centroid.id === c.id && p.verdict === 'APPROVED').length;
          const pct = count > 0 ? Math.min(100, (approvedCount / count) * 100) : 0;

          return (
            <div key={c.id} className="p-1.5 rounded bg-terminal-card border border-terminal-border/50 text-left">
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-bold truncate text-[10px]" style={{ color: c.color }}>{c.id}</span>
                <span className="text-[9px] text-terminal-green font-mono font-bold">{approvedCount}/{count}</span>
              </div>
              <div className="w-full bg-terminal-bg h-1 rounded-full overflow-hidden">
                <div
                  className="h-full transition-all"
                  style={{
                    backgroundColor: c.color,
                    width: pct + '%'
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
