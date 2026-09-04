'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, BarChart3, Activity } from 'lucide-react';

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

  // Append new points when currentBalanceSol changes
  useEffect(() => {
    const nowStr = new Date().toLocaleTimeString('en-US', { hour12: false, minute: '2-digit', second: '2-digit' });
    setHistory((prev) => {
      const last = prev[prev.length - 1];
      if (last && Math.abs(last.balanceSol - currentBalanceSol) < 0.001) return prev;

      const newPoint: DataPoint = {
        time: nowStr,
        balanceSol: currentBalanceSol,
        volumeSol: +(Math.random() * 3.2 + 0.8).toFixed(2),
        pnlSol: totalPnlSol,
      };
      return [...prev.slice(1), newPoint];
    });
  }, [currentBalanceSol, totalPnlSol]);

  // Dimensions
  const width = 640;
  const height = 140;
  const padding = { top: 15, right: 15, bottom: 25, left: 40 };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Min and Max for scaling
  const { minVal, maxVal, maxVol } = useMemo(() => {
    const balances = history.map((d) => d.balanceSol);
    const min = Math.min(...balances, initialBalanceSol) * 0.98;
    const max = Math.max(...balances, initialBalanceSol) * 1.02;
    const vol = Math.max(...history.map((d) => d.volumeSol), 1.0);
    return { minVal: min, maxVal: max, maxVol: vol };
  }, [history, initialBalanceSol]);

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
    <div className="bg-terminal-panel border border-terminal-border rounded-xl p-3.5 space-y-2.5 shadow-xl">
      <div className="flex items-center justify-between border-b border-terminal-border pb-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-terminal-green" />
          <span className="font-bold text-terminal-text text-[11px] uppercase tracking-wider">
            Cumulative PnL Curve & Jito MEV Volume
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span className="text-terminal-muted">
            Initial: <strong className="text-terminal-text">{initialBalanceSol.toFixed(2)} SOL</strong>
          </span>
          <span className="text-terminal-muted">
            Current: <strong className={totalPnlSol >= 0 ? 'text-terminal-green glow-green' : 'text-terminal-red'}>
              {currentBalanceSol.toFixed(2)} SOL ({totalPnlSol >= 0 ? '+' : ''}{totalPnlSol.toFixed(2)})
            </strong>
          </span>
        </div>
      </div>

      {/* SVG Chart Container */}
      <div className="relative w-full overflow-hidden bg-terminal-card/60 rounded-lg border border-terminal-border">
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
            stroke="#6E7A75"
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
                  fill={isLatest ? '#0DF289' : '#1E2C26'}
                  stroke="#0DF289"
                  strokeWidth="1"
                  className="hover:r-4 transition-all"
                />
              </g>
            );
          })}

          {/* Y-Axis Value Labels */}
          <text x={padding.left - 6} y={padding.top + 8} textAnchor="end" fill="#6E7A75" fontSize="9" fontFamily="monospace">
            {maxVal.toFixed(1)}
          </text>
          <text x={padding.left - 6} y={baselineY + 3} textAnchor="end" fill="#F5A623" fontSize="8" fontFamily="monospace">
            INIT
          </text>
          <text x={padding.left - 6} y={padding.top + chartHeight} textAnchor="end" fill="#6E7A75" fontSize="9" fontFamily="monospace">
            {minVal.toFixed(1)}
          </text>
        </svg>

        {/* Floating Tooltip info */}
        {hoveredPoint && (
          <div className="absolute top-2 right-2 bg-terminal-bg/90 border border-terminal-border px-2.5 py-1 rounded text-[10px] font-mono shadow-md flex items-center gap-2">
            <span className="text-terminal-muted">{hoveredPoint.time}</span>
            <span className="text-terminal-text">Bal: <strong>{hoveredPoint.balanceSol} SOL</strong></span>
            <span className={hoveredPoint.pnlSol >= 0 ? 'text-terminal-green' : 'text-terminal-red'}>
              PnL: {hoveredPoint.pnlSol >= 0 ? '+' : ''}{hoveredPoint.pnlSol} SOL
            </span>
          </div>
        )}
      </div>
    </div>
  );
}