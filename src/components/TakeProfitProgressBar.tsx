'use client';

import React from 'react';
import { ActivePosition } from '@/types/terminal';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  ShieldAlert,
  Zap,
  Flame,
  AlertOctagon,
  Timer
} from 'lucide-react';
import Badge from './ui/Badge';

interface TakeProfitProgressBarProps {
  position: ActivePosition;
  defaultTargetTpPct?: number;
  defaultStopLossPct?: number;
  defaultMaxHoldTimeSec?: number;
}

export const TakeProfitProgressBar: React.FC<TakeProfitProgressBarProps> = ({
  position,
  defaultTargetTpPct = 100,
  defaultStopLossPct = -25,
  defaultMaxHoldTimeSec = 180
}) => {
  const {
    entryPriceSol,
    currentPriceSol,
    pnlPct,
    pnlSol,
    entryTimestamp
  } = position;

  // 1. Resolve Targets & Risk Parameters
  const targetTpPct = position.targetTpPct ?? defaultTargetTpPct;
  const targetTpPriceSol =
    position.targetTpPriceSol ?? +(entryPriceSol * (1 + targetTpPct / 100)).toFixed(8);

  const stopLossPct = position.stopLossPct ?? defaultStopLossPct;
  const stopLossPriceSol =
    position.stopLossPriceSol ?? +(entryPriceSol * (1 + stopLossPct / 100)).toFixed(8);

  const maxHoldTimeSec = position.maxHoldTimeSec ?? defaultMaxHoldTimeSec;
  const holdDurationSec =
    position.holdDurationSec ?? Math.max(0, Math.round((Date.now() - entryTimestamp) / 1000));
  const remainingTtlSec = Math.max(0, maxHoldTimeSec - holdDurationSec);

  // 2. Velocity & ETA
  const velocity = position.velocityPctPerSec ?? 0;
  const etaSeconds = position.etaToTpSeconds;
  const momentumStatus = position.momentumStatus ?? (velocity >= 1.0 ? 'ACCELERATING' : velocity >= 0.1 ? 'STEADY' : velocity >= -0.2 ? 'STAGNANT' : 'DROPPING');

  // 3. Calculate Progress towards Target TP (0% to 100%)
  const rawProgress = targetTpPct > 0 ? (pnlPct / targetTpPct) * 100 : 0;
  const progressPct = Math.min(100, Math.max(0, rawProgress));
  const isTargetHit = pnlPct >= targetTpPct;

  // Format TTL (MM:SS)
  const ttlMin = Math.floor(remainingTtlSec / 60);
  const ttlSec = remainingTtlSec % 60;
  const ttlString = `${ttlMin.toString().padStart(2, '0')}:${ttlSec.toString().padStart(2, '0')}`;

  // Momentum Visual Config
  const momentumBadgeConfig = {
    ACCELERATING: {
      label: 'ACCELERATING',
      color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.3)]',
      icon: <Flame className="w-3 h-3 text-emerald-400 animate-pulse" />
    },
    STEADY: {
      label: 'STEADY MOMENTUM',
      color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
      icon: <TrendingUp className="w-3 h-3 text-cyan-400" />
    },
    STAGNANT: {
      label: 'MOMENTUM DATAR / STAGNAN',
      color: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      icon: <Clock className="w-3 h-3 text-amber-400" />
    },
    DROPPING: {
      label: 'MOMENTUM HILANG (KOREKSI)',
      color: 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse',
      icon: <TrendingDown className="w-3 h-3 text-rose-400" />
    }
  }[momentumStatus];

  return (
    <div className="bg-zinc-950/70 border border-zinc-800/90 rounded-xl p-3 font-mono space-y-2.5">
      {/* Top Header: Current PnL, ETA, and Target */}
      <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-zinc-400 font-bold uppercase text-[10px] tracking-wider flex items-center gap-1">
            <Target className="w-3 h-3 text-emerald-400" />
            <span>Target TP Tracker</span>
          </span>
          <span
            className={`font-black text-xs ${
              pnlPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            PNL: {pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(1)}%
          </span>
        </div>

        {/* Dynamic ETA / Momentum Text */}
        <div className="flex items-center gap-1.5">
          {isTargetHit ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/60 animate-bounce flex items-center gap-1">
              <Zap className="w-3 h-3 text-yellow-300" />
              TARGET TP TERCAPAI (+{targetTpPct}%)
            </span>
          ) : etaSeconds !== null && etaSeconds !== undefined && etaSeconds > 0 ? (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
              <Clock className="w-3 h-3 text-cyan-400 animate-spin" style={{ animationDuration: '4s' }} />
              ETA to TP: ~{etaSeconds < 60 ? `${etaSeconds} detik` : `${Math.floor(etaSeconds / 60)}m ${etaSeconds % 60}s`}
            </span>
          ) : momentumStatus === 'STAGNANT' ? (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              ETA: Stagnan (~0%/dtk)
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 flex items-center gap-1">
              <AlertOctagon className="w-3 h-3 text-rose-400" />
              ETA: Momentum Hilang
            </span>
          )}

          <span className="text-[10px] text-zinc-400 font-bold">
            Target: <span className="text-emerald-400">+{targetTpPct}%</span>
          </span>
        </div>
      </div>

      {/* Visual Progress Bar: Current PNL [======>    ] Target */}
      <div className="space-y-1">
        <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800 relative">
          {/* Active Fill Track */}
          <div
            className={`h-full transition-all duration-300 rounded-full ${
              isTargetHit
                ? 'bg-gradient-to-r from-emerald-500 via-cyan-400 to-yellow-300 shadow-[0_0_12px_rgba(16,185,129,0.8)]'
                : pnlPct >= 0
                ? 'bg-gradient-to-r from-emerald-600 via-emerald-400 to-cyan-400'
                : 'bg-rose-500/40'
            }`}
            style={{ width: `${progressPct}%` }}
          />

          {/* Target Flag Marker */}
          <div className="absolute top-0 bottom-0 right-0 w-0.5 bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.9)]" />
        </div>

        {/* Progress Scale Sub-Labels */}
        <div className="flex items-center justify-between text-[9px] text-zinc-500">
          <span>Entry: {entryPriceSol.toFixed(8)} SOL</span>
          <span className="text-zinc-400 font-semibold">
            Progress TP: {progressPct.toFixed(0)}%
          </span>
          <span className="text-emerald-400 font-bold">
            TP: +{targetTpPct}% ({targetTpPriceSol.toFixed(8)} SOL)
          </span>
        </div>
      </div>

      {/* Quantitative Metric Badges: Velocity, Momentum, SL, and TTL */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[10px]">
        {/* 1. Price Velocity */}
        <div className="bg-zinc-900/60 p-2 rounded-lg border border-zinc-800/80">
          <span className="text-zinc-500 block text-[9px]">Price Velocity</span>
          <div className="flex items-center gap-1 font-bold mt-0.5">
            <span
              className={
                velocity > 0.05
                  ? 'text-emerald-400'
                  : velocity < -0.1
                  ? 'text-rose-400'
                  : 'text-zinc-400'
              }
            >
              {velocity >= 0 ? '+' : ''}
              {velocity.toFixed(2)}%/dtk
            </span>
          </div>
        </div>

        {/* 2. Momentum State */}
        <div className="bg-zinc-900/60 p-2 rounded-lg border border-zinc-800/80">
          <span className="text-zinc-500 block text-[9px]">Momentum State</span>
          <div className="flex items-center gap-1 font-bold mt-0.5 truncate">
            {momentumBadgeConfig.icon}
            <span className="text-zinc-300 text-[9px] truncate">
              {momentumBadgeConfig.label}
            </span>
          </div>
        </div>

        {/* 3. Stop Loss Level */}
        <div className="bg-zinc-900/60 p-2 rounded-lg border border-zinc-800/80">
          <span className="text-zinc-500 block text-[9px]">Stop Loss Limit</span>
          <div className="flex items-center gap-1 font-bold text-rose-400 mt-0.5">
            <ShieldAlert className="w-3 h-3 text-rose-400" />
            <span>
              {stopLossPct}% ({stopLossPriceSol.toFixed(8)} SOL)
            </span>
          </div>
        </div>

        {/* 4. Time-to-Live (TTL) Fallback */}
        <div
          className={`p-2 rounded-lg border ${
            remainingTtlSec < 30
              ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
              : remainingTtlSec < 60
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-300'
          }`}
        >
          <span className="text-zinc-500 block text-[9px]">Max Hold (TTL)</span>
          <div className="flex items-center gap-1 font-bold mt-0.5">
            <Timer className="w-3 h-3" />
            <span>
              {ttlString} <span className="text-[8px] text-zinc-500 font-normal">/ {maxHoldTimeSec}s</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TakeProfitProgressBar;
