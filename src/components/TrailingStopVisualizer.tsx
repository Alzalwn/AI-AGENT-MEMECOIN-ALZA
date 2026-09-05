'use client';

import React from 'react';
import { ActivePosition } from '@/types/terminal';
import { ShieldCheck, TrendingUp, AlertTriangle, Crosshair, ArrowUpRight, Flame } from 'lucide-react';

interface TrailingStopVisualizerProps {
  position: ActivePosition;
}

export const TrailingStopVisualizer: React.FC<TrailingStopVisualizerProps> = ({ position }) => {
  const {
    entryPriceSol,
    currentPriceSol,
    highestPriceSol,
    trailingStopPriceSol,
    rMultiplier,
    pnlPct,
    pnlSol
  } = position;

  // Calculate percentage distances
  const isStopInProfit = trailingStopPriceSol > entryPriceSol;
  const stopDistancePct = currentPriceSol > trailingStopPriceSol
    ? +(((currentPriceSol - trailingStopPriceSol) / currentPriceSol) * 100).toFixed(1)
    : 0;
  
  // Calculate relative position within the corridor
  // Corridor spans from (entryPrice * 0.90) to (entryPrice * 1.50 or higher)
  const minCorridor = Math.min(trailingStopPriceSol * 0.98, entryPriceSol * 0.92);
  const target3RPrice = entryPriceSol * 1.30; // +3.0R approx +30%
  const maxCorridor = Math.max(highestPriceSol * 1.05, target3RPrice * 1.05);
  const corridorRange = maxCorridor - minCorridor || 1;

  const getPercent = (price: number) => {
    const raw = ((price - minCorridor) / corridorRange) * 100;
    return Math.min(Math.max(raw, 2), 98);
  };

  const stopPercent = getPercent(trailingStopPriceSol);
  const entryPercent = getPercent(entryPriceSol);
  const currentPercent = getPercent(currentPriceSol);
  const highPercent = getPercent(highestPriceSol);
  const targetPercent = getPercent(target3RPrice);

  // Status State
  let statusBadge = {
    label: 'CORRIDOR STABLE',
    color: 'bg-terminal-cyan/15 text-terminal-cyan border-terminal-cyan/40',
    icon: <TrendingUp className="w-3 h-3" />
  };

  if (isStopInProfit) {
    const lockedGainPct = +(((trailingStopPriceSol - entryPriceSol) / entryPriceSol) * 100).toFixed(1);
    statusBadge = {
      label: `TRAILING IN PROFIT (+${lockedGainPct}% LOCKED)`,
      color: 'bg-terminal-green/20 text-terminal-green border-terminal-green/50',
      icon: <ShieldCheck className="w-3 h-3" />
    };
  } else if (stopDistancePct < 3.5) {
    statusBadge = {
      label: 'STOP-LOSS WARNING (< 3.5% BUFFER)',
      color: 'bg-terminal-amber/20 text-terminal-amber border-terminal-amber/50 animate-pulse',
      icon: <AlertTriangle className="w-3 h-3" />
    };
  } else if (rMultiplier >= 2.5) {
    statusBadge = {
      label: 'EXIT TARGET IMMINENT (>= +2.5R)',
      color: 'bg-yellow-400/20 text-yellow-300 border-yellow-400/50 animate-pulse',
      icon: <Flame className="w-3 h-3 text-yellow-400" />
    };
  }

  return (
    <div className="bg-terminal-bg/90 p-3 rounded-xl border border-terminal-border font-mono text-xs space-y-2.5">
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-terminal-muted flex items-center gap-1.5">
          <Crosshair className="w-3 h-3 text-terminal-green" />
          <span>Dynamic Trailing Corridor</span>
        </span>
        <span className={`text-[9px] px-2 py-0.5 rounded font-bold border flex items-center gap-1 ${statusBadge.color}`}>
          {statusBadge.icon}
          <span>{statusBadge.label}</span>
        </span>
      </div>

      {/* Visual Corridor Bar */}
      <div className="relative pt-4 pb-3">
        {/* Track Bar */}
        <div className="w-full h-2.5 bg-terminal-card rounded-full overflow-hidden border border-terminal-border relative">
          {/* Profit Zone Gradient */}
          <div
            className="absolute top-0 bottom-0 bg-gradient-to-r from-terminal-green/20 via-terminal-green/40 to-terminal-cyan/30"
            style={{
              left: `${entryPercent}%`,
              right: `${100 - targetPercent}%`
            }}
          />
          {/* Active Fill from Stop to Current */}
          <div
            className={`h-full transition-all duration-300 ${
              pnlPct >= 0 ? 'bg-terminal-green/80' : 'bg-terminal-red/80'
            }`}
            style={{
              left: `${Math.min(stopPercent, currentPercent)}%`,
              width: `${Math.abs(currentPercent - stopPercent)}%`,
              position: 'absolute'
            }}
          />
        </div>

        {/* Trailing Stop Pin (Red / Amber) */}
        <div
          className="absolute top-1 transform -translate-x-1/2 flex flex-col items-center pointer-events-none transition-all duration-300"
          style={{ left: `${stopPercent}%` }}
        >
          <span className={`text-[8px] font-bold px-1 rounded ${
            isStopInProfit ? 'bg-terminal-green text-terminal-bg' : 'bg-terminal-red text-terminal-bg'
          }`}>
            STOP
          </span>
          <div className={`w-0.5 h-4 ${isStopInProfit ? 'bg-terminal-green' : 'bg-terminal-red'}`} />
        </div>

        {/* Entry Price Pin (Breakeven Marker) */}
        <div
          className="absolute top-1.5 transform -translate-x-1/2 flex flex-col items-center pointer-events-none"
          style={{ left: `${entryPercent}%` }}
        >
          <span className="text-[7px] text-terminal-muted font-bold">ENTRY</span>
          <div className="w-0.5 h-3.5 bg-terminal-border" />
        </div>

        {/* High-Water Mark Pin (Cyan) */}
        {highestPriceSol > currentPriceSol && (
          <div
            className="absolute top-1.5 transform -translate-x-1/2 flex flex-col items-center pointer-events-none transition-all duration-300"
            style={{ left: `${highPercent}%` }}
          >
            <span className="text-[7px] text-terminal-cyan font-bold">PEAK</span>
            <div className="w-0.5 h-3.5 bg-terminal-cyan/60" />
          </div>
        )}

        {/* Target 3.0R Pin (Gold) */}
        <div
          className="absolute top-1.5 transform -translate-x-1/2 flex flex-col items-center pointer-events-none"
          style={{ left: `${targetPercent}%` }}
        >
          <span className="text-[7px] text-yellow-400 font-bold">+3.0R</span>
          <div className="w-0.5 h-3.5 bg-yellow-400/70" />
        </div>

        {/* Current Live Price Bubble (Green Pulsing Dot) */}
        <div
          className="absolute top-0 transform -translate-x-1/2 flex flex-col items-center z-10 transition-all duration-300"
          style={{ left: `${currentPercent}%` }}
        >
          <div className="w-3.5 h-3.5 rounded-full bg-terminal-green border-2 border-terminal-bg shadow-[0_0_10px_rgba(13,242,137,0.8)] animate-pulse" />
        </div>
      </div>

      {/* Numerical Details Grid */}
      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-terminal-border/60 text-[10px]">
        <div>
          <span className="text-terminal-muted block text-[9px]">Trailing Stop</span>
          <span className={`font-mono font-bold ${isStopInProfit ? 'text-terminal-green' : 'text-terminal-red'}`}>
            {trailingStopPriceSol.toFixed(7)} SOL
          </span>
          <span className="text-[8px] text-terminal-muted block">
            {stopDistancePct > 0 ? `-${stopDistancePct}% buffer` : 'TRIGGERED'}
          </span>
        </div>

        <div className="text-center">
          <span className="text-terminal-muted block text-[9px]">Current Live</span>
          <span className="font-mono font-black text-terminal-green">
            {currentPriceSol.toFixed(7)} SOL
          </span>
          <span className="text-[8px] text-terminal-cyan block">
            +{rMultiplier}R ({pnlPct >= 0 ? '+' : ''}{pnlPct}%)
          </span>
        </div>

        <div className="text-right">
          <span className="text-terminal-muted block text-[9px]">Exit Target (+3R)</span>
          <span className="font-mono font-bold text-yellow-400">
            {target3RPrice.toFixed(7)} SOL
          </span>
          <span className="text-[8px] text-terminal-muted block">
            {currentPriceSol < target3RPrice
              ? `+${(((target3RPrice - currentPriceSol) / currentPriceSol) * 100).toFixed(1)}% to TP`
              : 'REACHED'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TrailingStopVisualizer;
