'use client';

import React, { useMemo } from 'react';
import { TokenSignal, ConsensusResult } from '../types/terminal';
import { PRD_THRESHOLDS } from '../config/constants';

interface StrategyRadarProps {
  selectedResult: ConsensusResult | null;
}

export default function StrategyRadar({ selectedResult }: StrategyRadarProps) {
  // Compute normalized 0-100 scores for each of the 4 axes
  const { themeScore, liquidityScore, timingScore, riskScore, coherenceScore, isApproved } = useMemo(() => {
    if (!selectedResult) {
      return {
        themeScore: 0,
        liquidityScore: 0,
        timingScore: 0,
        riskScore: 0,
        coherenceScore: 0,
        isApproved: false,
      };
    }

    const t = selectedResult.token;

    // 1. Theme Score (Target: Cosine Sim >= 0.85)
    const theme = Math.min(Math.max(Math.round((t.narrativeCosineSim / 1.0) * 100), 10), 100);

    // 2. Liquidity Score (Target: LP >= $5,000 & 100% burnt)
    const lpRatio = Math.min(t.initialLpUsd / 20000, 1.0);
    const burntRatio = t.burntLiquidityPct / 100;
    const liquidity = Math.min(Math.max(Math.round((lpRatio * 0.6 + burntRatio * 0.4) * 100), 10), 100);

    // 3. Timing Score (Target: Volume Delta > 0 & Buyers >= 3)
    const volScore = t.volumeDelta15s > 0 ? Math.min(t.volumeDelta15s / 10, 1.0) : 0;
    const buyersScore = Math.min(t.uniqueBuyersCount / 10, 1.0);
    const timing = Math.min(Math.max(Math.round((volScore * 0.5 + buyersScore * 0.5) * 100), 10), 100);

    // 4. Risk Score (Target: Mint & Freeze revoked, Top 10 <= 15%)
    let risk = 100;
    if (!t.mintAuthorityRevoked) risk -= 45;
    if (!t.freezeAuthorityRevoked) risk -= 35;
    if (t.top10HolderPct > PRD_THRESHOLDS.MAX_TOP10_HOLDERS_PCT) {
      const penalty = (t.top10HolderPct - PRD_THRESHOLDS.MAX_TOP10_HOLDERS_PCT) * 2;
      risk -= Math.min(penalty, 40);
    }
    const safeRisk = Math.max(risk, 5);

    const coherence = Math.round((theme + liquidity + timing + safeRisk) / 4);

    return {
      themeScore: theme,
      liquidityScore: liquidity,
      timingScore: timing,
      riskScore: safeRisk,
      coherenceScore: coherence,
      isApproved: selectedResult.verdict === 'APPROVED',
    };
  }, [selectedResult]);

  // Center coordinate of SVG is (120, 120), radius = 80
  const cx = 120;
  const cy = 120;
  const r = 80;

  // 4 Axes:
  // Top: Theme (0, -1)
  // Right: Liquidity (1, 0)
  // Bottom: Timing (0, 1)
  // Left: Risk (-1, 0)
  const topX = cx;
  const topY = cy - (themeScore / 100) * r;

  const rightX = cx + (liquidityScore / 100) * r;
  const rightY = cy;

  const bottomX = cx;
  const bottomY = cy + (timingScore / 100) * r;

  const leftX = cx - (riskScore / 100) * r;
  const leftY = cy;

  const polygonPoints = `${topX},${topY} ${rightX},${rightY} ${bottomX},${bottomY} ${leftX},${leftY}`;

  return (
    <div className="bg-terminal-panel border border-terminal-border rounded-xl p-3.5 flex flex-col gap-2.5 shadow-xl">
      <div className="flex items-center justify-between border-b border-terminal-border pb-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-terminal-cyan animate-pulse" />
          <span className="font-bold text-terminal-text text-[11px] uppercase tracking-wider">
            4D Strategy Manifold
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-terminal-muted">Coherence:</span>
          <span className={`text-[11px] font-black font-mono ${isApproved ? 'text-terminal-green glow-green' : 'text-terminal-red'}`}>
            {coherenceScore}%
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* SVG Radar Visual */}
        <div className="relative w-[240px] h-[240px] shrink-0">
          <svg viewBox="0 0 240 240" className="w-full h-full overflow-visible">
            {/* Background Grid Rings */}
            {[0.25, 0.5, 0.75, 1.0].map((level) => {
              const ringR = r * level;
              const points = `${cx},${cy - ringR} ${cx + ringR},${cy} ${cx},${cy + ringR} ${cx - ringR},${cy}`;
              return (
                <polygon
                  key={level}
                  points={points}
                  fill="none"
                  stroke="#1E2C26"
                  strokeWidth="1"
                  strokeDasharray={level === 1.0 ? 'none' : '3 3'}
                />
              );
            })}

            {/* Crosshair Axis Lines */}
            <line x1={cx - r} y1={cy} x2={cx + r} y2={cy} stroke="#1E2C26" strokeWidth="1" />
            <line x1={cx} y1={cy - r} x2={cx} y2={cy + r} stroke="#1E2C26" strokeWidth="1" />

            {/* Data Polygon */}
            {selectedResult && (
              <>
                <polygon
                  points={polygonPoints}
                  fill={isApproved ? 'rgba(13, 242, 137, 0.25)' : 'rgba(229, 72, 77, 0.25)'}
                  stroke={isApproved ? '#0DF289' : '#E5484D'}
                  strokeWidth="2"
                  className="transition-all duration-300 ease-out"
                />
                {/* Vertex Dots */}
                <circle cx={topX} cy={topY} r="3.5" fill={isApproved ? '#0DF289' : '#E5484D'} className="transition-all duration-300" />
                <circle cx={rightX} cy={rightY} r="3.5" fill={isApproved ? '#0DF289' : '#E5484D'} className="transition-all duration-300" />
                <circle cx={bottomX} cy={bottomY} r="3.5" fill={isApproved ? '#0DF289' : '#E5484D'} className="transition-all duration-300" />
                <circle cx={leftX} cy={leftY} r="3.5" fill={isApproved ? '#0DF289' : '#E5484D'} className="transition-all duration-300" />
              </>
            )}

            {/* Labels around the radar */}
            <text x={cx} y={cy - r - 8} textAnchor="middle" fill="#9AA8A1" fontSize="9" fontWeight="bold" fontFamily="monospace">
              THEME ({themeScore}%)
            </text>
            <text x={cx + r + 8} y={cy + 3} textAnchor="start" fill="#9AA8A1" fontSize="9" fontWeight="bold" fontFamily="monospace">
              LIQ ({liquidityScore}%)
            </text>
            <text x={cx} y={cy + r + 14} textAnchor="middle" fill="#9AA8A1" fontSize="9" fontWeight="bold" fontFamily="monospace">
              TIMING ({timingScore}%)
            </text>
            <text x={cx - r - 8} y={cy + 3} textAnchor="end" fill="#9AA8A1" fontSize="9" fontWeight="bold" fontFamily="monospace">
              RISK ({riskScore}%)
            </text>
          </svg>
        </div>

        {/* 4-Axis Metric Legend Cards */}
        <div className="w-full space-y-1.5 flex-1 text-[10px]">
          <div className="bg-terminal-card p-2 rounded border border-terminal-border flex items-center justify-between">
            <span className="text-terminal-muted flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-terminal-cyan" />
              Theme Cos-Sim:
            </span>
            <span className={`font-mono font-bold ${themeScore >= 85 ? 'text-terminal-green' : 'text-terminal-red'}`}>
              {selectedResult ? `${selectedResult.token.narrativeCosineSim} / 0.85` : '-'}
            </span>
          </div>

          <div className="bg-terminal-card p-2 rounded border border-terminal-border flex items-center justify-between">
            <span className="text-terminal-muted flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-terminal-green" />
              Pool Liquidity:
            </span>
            <span className={`font-mono font-bold ${liquidityScore >= 50 ? 'text-terminal-green' : 'text-terminal-red'}`}>
              {selectedResult ? `$${selectedResult.token.initialLpUsd.toLocaleString()}` : '-'}
            </span>
          </div>

          <div className="bg-terminal-card p-2 rounded border border-terminal-border flex items-center justify-between">
            <span className="text-terminal-muted flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-terminal-amber" />
              Volume Momentum:
            </span>
            <span className={`font-mono font-bold ${timingScore >= 40 ? 'text-terminal-green' : 'text-terminal-red'}`}>
              {selectedResult ? `+${selectedResult.token.volumeDelta15s} SOL` : '-'}
            </span>
          </div>

          <div className="bg-terminal-card p-2 rounded border border-terminal-border flex items-center justify-between">
            <span className="text-terminal-muted flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-terminal-red" />
              Security / Top 10:
            </span>
            <span className={`font-mono font-bold ${riskScore >= 70 ? 'text-terminal-green' : 'text-terminal-red'}`}>
              {selectedResult ? `${selectedResult.token.top10HolderPct}% (Max 15%)` : '-'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}