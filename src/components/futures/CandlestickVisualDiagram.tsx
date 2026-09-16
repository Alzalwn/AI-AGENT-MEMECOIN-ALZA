'use client';

import React from 'react';
import { CandlestickPatternItem } from '../../data/CandlestickDictionaryData';

interface CandlestickVisualDiagramProps {
  pattern: CandlestickPatternItem;
}

export const CandlestickVisualDiagram: React.FC<CandlestickVisualDiagramProps> = ({ pattern }) => {
  const { diagram } = pattern;
  const { candles, entryLevelPct, stopLossLevelPct, tp1LevelPct, tp2LevelPct } = diagram;

  // ViewBox coordinates
  const svgWidth = 420;
  const svgHeight = 240;
  const paddingY = 25;
  const chartHeight = svgHeight - paddingY * 2;

  // Helper untuk konversi persentase vertikal (0 = bawah, 100 = atas) ke koordinat Y SVG
  const getY = (pct: number) => {
    const clamped = Math.max(0, Math.min(100, pct));
    return svgHeight - paddingY - (clamped / 100) * chartHeight;
  };

  const candleCount = candles.length;
  const candleAreaWidth = svgWidth - 140; // Sisakan 140px di kanan untuk label level
  const candleSpacing = candleAreaWidth / (candleCount + 1);
  const candleBodyWidth = Math.min(36, candleSpacing * 0.55);

  const entryY = getY(entryLevelPct);
  const slY = getY(stopLossLevelPct);
  const tp1Y = getY(tp1LevelPct);
  const tp2Y = getY(tp2LevelPct);

  return (
    <div className="w-full bg-[#080a0f] border border-white/10 rounded-2xl p-4 shadow-inner flex flex-col items-center">
      <div className="w-full flex items-center justify-between text-xs text-zinc-400 font-mono mb-2 px-1">
        <span className="font-bold flex items-center gap-1.5 text-zinc-300">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          ANATOMI &amp; TINGKAT EKSEKUSI (SOP LEVEL)
        </span>
        <span className="text-[11px] text-zinc-500">R:R Rekomendasi: {pattern.recommendedRr}</span>
      </div>

      <div className="w-full overflow-x-auto flex justify-center">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full max-w-[480px] h-auto select-none"
        >
          <defs>
            {/* Gradient untuk Take Profit */}
            <linearGradient id="tpGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.3" />
            </linearGradient>
            {/* Gradient untuk Stop Loss */}
            <linearGradient id="slGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#b91c1c" stopOpacity="0.3" />
            </linearGradient>
            {/* Gradient untuk Entry */}
            <linearGradient id="entryGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#0891b2" stopOpacity="0.3" />
            </linearGradient>
          </defs>

          {/* Background Grid Lines */}
          <line x1="10" y1={getY(25)} x2={svgWidth - 10} y2={getY(25)} stroke="#ffffff" strokeOpacity="0.05" strokeDasharray="3 3" />
          <line x1="10" y1={getY(50)} x2={svgWidth - 10} y2={getY(50)} stroke="#ffffff" strokeOpacity="0.05" strokeDasharray="3 3" />
          <line x1="10" y1={getY(75)} x2={svgWidth - 10} y2={getY(75)} stroke="#ffffff" strokeOpacity="0.05" strokeDasharray="3 3" />

          {/* Level Line: TP 2 */}
          <line
            x1="20"
            y1={tp2Y}
            x2={svgWidth - 90}
            y2={tp2Y}
            stroke="#10b981"
            strokeWidth="1.5"
            strokeDasharray="4 3"
            strokeOpacity="0.6"
          />
          <rect x={svgWidth - 85} y={tp2Y - 9} width="78" height="18" rx="4" fill="#10b981" fillOpacity="0.2" stroke="#10b981" strokeWidth="1" />
          <text x={svgWidth - 46} y={tp2Y + 3.5} fill="#34d399" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
            TP2 EXPAND
          </text>

          {/* Level Line: TP 1 */}
          <line
            x1="20"
            y1={tp1Y}
            x2={svgWidth - 90}
            y2={tp1Y}
            stroke="#10b981"
            strokeWidth="1.5"
            strokeDasharray="4 3"
            strokeOpacity="0.8"
          />
          <rect x={svgWidth - 85} y={tp1Y - 9} width="78" height="18" rx="4" fill="#10b981" fillOpacity="0.25" stroke="#10b981" strokeWidth="1" />
          <text x={svgWidth - 46} y={tp1Y + 3.5} fill="#10b981" fontSize="9" fontWeight="bold" fontFamily="monospace" textAnchor="middle">
            TP1 (50% BE)
          </text>

          {/* Level Line: ENTRY TRIGGER */}
          <line
            x1="20"
            y1={entryY}
            x2={svgWidth - 90}
            y2={entryY}
            stroke="#06b6d4"
            strokeWidth="2"
            strokeDasharray="2 2"
          />
          <rect x={svgWidth - 85} y={entryY - 10} width="78" height="20" rx="4" fill="#06b6d4" fillOpacity="0.25" stroke="#06b6d4" strokeWidth="1.5" />
          <text x={svgWidth - 46} y={entryY + 4} fill="#22d3ee" fontSize="10" fontWeight="900" fontFamily="monospace" textAnchor="middle">
            🎯 ENTRY
          </text>

          {/* Level Line: STOP LOSS SERVER */}
          <line
            x1="20"
            y1={slY}
            x2={svgWidth - 90}
            y2={slY}
            stroke="#ef4444"
            strokeWidth="2"
            strokeDasharray="3 3"
          />
          <rect x={svgWidth - 85} y={slY - 10} width="78" height="20" rx="4" fill="#ef4444" fillOpacity="0.25" stroke="#ef4444" strokeWidth="1.5" />
          <text x={svgWidth - 46} y={slY + 4} fill="#f87171" fontSize="10" fontWeight="900" fontFamily="monospace" textAnchor="middle">
            🛑 SL SERVER
          </text>

          {/* Candles Rendering */}
          {candles.map((candle, idx) => {
            const cx = candleSpacing * (idx + 1);
            const highY = getY(candle.highPct);
            const lowY = getY(candle.lowPct);
            const openY = getY(candle.openPct);
            const closeY = getY(candle.closePct);

            const bodyTop = Math.min(openY, closeY);
            const bodyHeight = Math.max(3, Math.abs(closeY - openY));
            const color = candle.isGreen ? '#10b981' : '#ef4444';
            const bodyFill = candle.isGreen ? '#059669' : '#dc2626';

            return (
              <g key={idx}>
                {/* Upper Wick */}
                <line
                  x1={cx}
                  y1={highY}
                  x2={cx}
                  y2={bodyTop}
                  stroke={color}
                  strokeWidth="2"
                  strokeLinecap="round"
                />

                {/* Lower Wick */}
                <line
                  x1={cx}
                  y1={bodyTop + bodyHeight}
                  x2={cx}
                  y2={lowY}
                  stroke={color}
                  strokeWidth="2"
                  strokeLinecap="round"
                />

                {/* Body Box */}
                <rect
                  x={cx - candleBodyWidth / 2}
                  y={bodyTop}
                  width={candleBodyWidth}
                  height={bodyHeight}
                  rx="3"
                  fill={bodyFill}
                  stroke={color}
                  strokeWidth="1.5"
                  className="filter drop-shadow"
                />

                {/* Candle Label below chart */}
                {candle.label && (
                  <text
                    x={cx}
                    y={svgHeight - 6}
                    fill="#a1a1aa"
                    fontSize="9.5"
                    fontFamily="monospace"
                    textAnchor="middle"
                    fontWeight="600"
                  >
                    {candle.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Invalidation Rule Notice */}
      <div className="w-full mt-2 pt-2 border-t border-white/5 text-[11px] text-zinc-400 font-mono flex items-center justify-between">
        <span className="text-red-400 font-bold">Titik Pembatalan (Invalidation):</span>
        <span className="text-zinc-300 text-right">{diagram.invalidationDescription}</span>
      </div>
    </div>
  );
};
