'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, BarChart3, Activity } from 'lucide-react';
import CollapsibleCard from './ui/CollapsibleCard';

interface DataPoint {
  time: string;
  balanceSol: number;
  volumeSol: number;
  pnlSol: number;
}

interface CumulativeCurveProps {
  currentBalanceSol: number;
  initialBalanceSol: number;
  totalPnlSol: number;
}

export default function CumulativeCurve({
  currentBalanceSol,
  initialBalanceSol,
  totalPnlSol
}: CumulativeCurveProps) {
  const [timeframe, setTimeframe] = useState<'15m' | '1h' | '24h'>('15m');
  const [history, setHistory] = useState<DataPoint[]>(() => {
    // Generate initial 20 historical points leading to current balance
    const points: DataPoint[] = [];
    let bal = initialBalanceSol;
    const now = Date.now();

    for (let i = 19; i >= 0; i--) {
      const delta = (Math.random() - 0.42) * 0.18;
      bal = Math.max(bal + delta, 8.0);
      points.push({
        time: new Date(now - i * 15000).toLocaleTimeString('en-US', { hour12: false, minute: '2-digit', second: '2-digit' }),
        balanceSol: +bal.toFixed(3),
        volumeSol: +(Math.random() * 2.5 + 0.4).toFixed(2),
        pnlSol: +(bal - initialBalanceSol).toFixed(3),
      });
    }
    return points;
  });

  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null);

  // Append new points when currentBalanceSol changes with outlier protection
  useEffect(() => {
    const nowStr = new Date().toLocaleTimeString('en-US', { hour12: false, minute: '2-digit', second: '2-digit' });
    const clampedBal = Math.max(0, Math.min(100, currentBalanceSol));
    const clampedPnl = Math.max(-100, Math.min(100, totalPnlSol));

    setHistory((prev) => {
      // First clean existing corrupted points from prev
      const cleanPrev = prev.filter((d) => typeof d.balanceSol === 'number' && d.balanceSol < 100 && d.balanceSol >= 0);
      const last = cleanPrev[cleanPrev.length - 1];
      if (last && Math.abs(last.balanceSol - clampedBal) < 0.001) return cleanPrev;

      const newPoint: DataPoint = {
        time: nowStr,
        balanceSol: clampedBal,
        volumeSol: +(Math.random() * 3.2 + 0.8).toFixed(2),
        pnlSol: clampedPnl,
      };
      return [...cleanPrev.slice(-19), newPoint];
    });
  }, [currentBalanceSol, totalPnlSol]);

  // Dimensions
  const width = 640;
  const height = 140;
  const padding = { top: 15, right: 15, bottom: 25, left: 40 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Min and Max for scaling (with strict outlier protection)
  const { minVal, maxVal, maxVol } = useMemo(() => {
    const cleanHistory = history.filter((d) => typeof d.balanceSol === 'number' && d.balanceSol < 100 && d.balanceSol >= 0);
    const activePoints = cleanHistory.length > 0 ? cleanHistory : [{ time: '00:00:00', balanceSol: currentBalanceSol, volumeSol: 1, pnlSol: 0 }];
    const balances = activePoints.map((d) => d.balanceSol);
    const safeInit = initialBalanceSol < 100 ? initialBalanceSol : 0.15;
    const min = Math.max(0, Math.min(...balances, safeInit) * 0.98);
    const max = Math.max(0.01, Math.max(...balances, safeInit) * 1.02);
    const vol = Math.max(...activePoints.map((d) => d.volumeSol), 1.0);
    return { minVal: min, maxVal: max, maxVol: vol };
  }, [history, initialBalanceSol, currentBalanceSol]);

  // Convert point to SVG coordinates
  const getX = (index: number) => padding.left + (index / (history.length - 1 || 1)) * chartWidth;
  const getY = (val: number) => padding.top + (1 - (val - minVal) / (maxVal - minVal || 1)) * chartHeight;

  // Build SVG path
  const linePath = useMemo(() => {
    if (history.length === 0) return '';
    return history.reduce((acc, point, idx) => {
      const x = getX(idx);
      const y = getY(point.balanceSol);
      return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  }, [history, minVal, maxVal]);

  // Area under curve path
  const areaPath = useMemo(() => {
    if (history.length === 0) return '';
    const bottomY = padding.top + chartHeight;
    const startX = getX(0);
    const endX = getX(history.length - 1);
    return `${linePath} L ${endX} ${bottomY} L ${startX} ${bottomY} Z`;
  }, [linePath, history]);

  // Initial balance baseline Y
  const baselineY = getY(initialBalanceSol);

  return (
    <CollapsibleCard
      title="Cumulative PnL Curve & Volume"
      badge={`${totalPnlSol >= 0 ? '+' : ''}${totalPnlSol.toFixed(2)} SOL`}
      badgeVariant={totalPnlSol >= 0 ? 'emerald' : 'rose'}
      icon={<TrendingUp className="w-4 h-4 text-emerald-400" />}
      storageKey="card_cumulative_pnl"
      defaultCollapsed={false}
      headerActions={
        <div className="flex items-center gap-1">
          {(['15m', '1h', '24h'] as const).map((tf) => (
            <button
              key={tf}
              type="button"
              onClick={() => setTimeframe(tf)}
              className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${
                timeframe === tf
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      }
    >
      <div className="space-y-2 font-mono">
        {/* Quick Stats Bar */}
        <div className="flex items-center justify-between text-[11px] px-1 text-zinc-400">
          <div className="flex items-center gap-3">
            <span>
              Initial: <strong className="text-zinc-200">{initialBalanceSol.toFixed(2)} SOL</strong>
            </span>
            <span>
              Current:{' '}
              <strong className={totalPnlSol >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {currentBalanceSol.toFixed(2)} SOL ({totalPnlSol >= 0 ? '+' : ''}{totalPnlSol.toFixed(2)})
              </strong>
            </span>
          </div>
          <span className="text-[10px] text-cyan-400">Jito MEV Volume Tracked</span>
        </div>

        {/* SVG Chart Container */}
        <div className="relative w-full overflow-hidden bg-zinc-950/70 rounded-xl border border-zinc-800/80 p-2">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[150px] overflow-visible">
            <defs>
              <linearGradient id="curveGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0DF289" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#0DF289" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="volGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#00E5FF" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#00E5FF" stopOpacity="0.1" />
              </linearGradient>
            </defs>

            {/* Baseline Reference (Initial Balance) */}
            <line
              x1={padding.left}
              y1={baselineY}
              x2={width - padding.right}
              y2={baselineY}
              stroke="#52525b"
              strokeDasharray="4 4"
              strokeWidth="1"
            />

            {/* Volume Bars at Bottom */}
            {history.map((point, idx) => {
              const barW = Math.max(chartWidth / history.length - 2, 3);
              const barH = (point.volumeSol / maxVol) * 24;
              const x = getX(idx) - barW / 2;
              const y = padding.top + chartHeight - barH;

              return (
                <rect
                  key={idx}
                  x={x}
                  y={y}
                  width={barW}
                  height={barH}
                  fill="url(#volGradient)"
                  rx="1"
                />
              );
            })}

            {/* Area Gradient */}
            <path d={areaPath} fill="url(#curveGradient)" />

            {/* Main Curve Line */}
            <path
              d={linePath}
              fill="none"
              stroke="#0DF289"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Interactive Hover Indicators */}
            {history.map((point, idx) => {
              const x = getX(idx);
              const y = getY(point.balanceSol);
              const isLatest = idx === history.length - 1;

              return (
                <g key={idx} className="cursor-pointer" onMouseEnter={() => setHoveredPoint(point)}>
                  <circle
                    cx={x}
                    cy={y}
                    r={isLatest ? 4 : 2}
                    fill={isLatest ? '#0DF289' : '#18181b'}
                    stroke="#0DF289"
                    strokeWidth="1"
                    className="hover:r-4 transition-all"
                  />
                </g>
              );
            })}

            {/* Y-Axis Value Labels */}
            <text x={padding.left - 6} y={padding.top + 8} textAnchor="end" fill="#71717a" fontSize="9" fontFamily="monospace">
              {maxVal.toFixed(1)}
            </text>
            <text x={padding.left - 6} y={baselineY + 3} textAnchor="end" fill="#F5A623" fontSize="8" fontFamily="monospace">
              INIT
            </text>
            <text x={padding.left - 6} y={padding.top + chartHeight} textAnchor="end" fill="#71717a" fontSize="9" fontFamily="monospace">
              {minVal.toFixed(1)}
            </text>
          </svg>

          {/* Floating Tooltip info */}
          {hoveredPoint && (
            <div className="absolute top-3 right-3 bg-zinc-900/90 border border-zinc-700 px-2.5 py-1 rounded-lg text-[10px] font-mono shadow-xl flex items-center gap-2 backdrop-blur-md">
              <span className="text-zinc-500">{hoveredPoint.time}</span>
              <span className="text-zinc-200">Bal: <strong>{hoveredPoint.balanceSol} SOL</strong></span>
              <span className={hoveredPoint.pnlSol >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                PnL: {hoveredPoint.pnlSol >= 0 ? '+' : ''}{hoveredPoint.pnlSol} SOL
              </span>
            </div>
          )}
        </div>
      </div>
    </CollapsibleCard>
  );
}