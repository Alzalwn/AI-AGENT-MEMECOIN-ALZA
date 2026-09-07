'use client';

/**
 * SignalStats — Bar statistik real-time win-rate & performa sinyal
 * Ditampilkan di bagian atas dashboard sebagai ringkasan performa
 */

import React from 'react';
import { SignalStats as SignalStatsType } from '../../types/signal';

interface SignalStatsBarProps {
  stats: SignalStatsType;
}

function StatItem({
  label,
  value,
  sub,
  color = 'text-white',
  pulse = false,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  pulse?: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-3 min-w-[90px]">
      <div className={`text-xs text-white/40 uppercase tracking-widest mb-1 font-medium`}>{label}</div>
      <div className={`font-mono font-bold text-lg ${color} flex items-center gap-1`}>
        {pulse && (
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        )}
        {value}
      </div>
      {sub && <div className="text-xs text-white/30 mt-0.5">{sub}</div>}
    </div>
  );
}

function Divider() {
  return <div className="w-px h-8 bg-white/5 self-center hidden sm:block" />;
}

export function SignalStats({ stats }: SignalStatsBarProps) {
  const winRateColor =
    stats.winRate >= 70 ? 'text-emerald-400' :
    stats.winRate >= 50 ? 'text-yellow-400' : 'text-red-400';

  const rrColor =
    stats.avgRR >= 2.5 ? 'text-emerald-400' :
    stats.avgRR >= 1.5 ? 'text-blue-400' : 'text-white/60';

  return (
    <div className="bg-[#111111] border border-white/5 rounded-xl overflow-hidden">
      {/* Header strip */}
      <div className="bg-white/[0.02] border-b border-white/5 px-4 py-1.5 flex items-center justify-between">
        <span className="text-xs text-white/40 font-medium uppercase tracking-wider">
          📡 Signal Performance
        </span>
        <span className="text-xs text-white/20 font-mono">
          Updated {new Date(stats.lastUpdated).toLocaleTimeString()}
        </span>
      </div>

      {/* Stats row */}
      <div className="flex items-stretch flex-wrap divide-x divide-white/5">
        <StatItem
          label="Win Rate"
          value={`${stats.winRate.toFixed(1)}%`}
          sub={`${stats.winCount}W / ${stats.lossCount}L`}
          color={winRateColor}
        />
        <Divider />
        <StatItem
          label="Avg R/R"
          value={`1 : ${stats.avgRR.toFixed(1)}`}
          sub="realized"
          color={rrColor}
        />
        <Divider />
        <StatItem
          label="TP2+ Rate"
          value={`${stats.tp2Rate.toFixed(0)}%`}
          sub={`TP3: ${stats.tp3Rate.toFixed(0)}%`}
          color="text-violet-400"
        />
        <Divider />
        <StatItem
          label="Today"
          value={String(stats.totalToday)}
          sub="signals"
          color="text-white"
          pulse={true}
        />
        <Divider />
        <StatItem
          label="Total"
          value={String(stats.totalSignals)}
          sub="all time"
          color="text-white/60"
        />
        <Divider />
        <div className="flex items-center gap-3 px-4 py-3 flex-1 min-w-[200px]">
          <div className="flex flex-col gap-1 flex-1">
            <div className="text-xs text-white/40 uppercase tracking-widest mb-1">Tier Breakdown</div>
            <div className="flex items-center gap-1">
              <span className="text-orange-400 text-xs font-mono">🚀 {stats.supernovaCount}</span>
              <span className="text-white/20 text-xs">SUPERNOVA</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-emerald-400 text-xs font-mono">🔥 {stats.highCount}</span>
              <span className="text-white/20 text-xs">HIGH</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-blue-400 text-xs font-mono">⚡ {stats.moderateCount}</span>
              <span className="text-white/20 text-xs">MODERATE</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignalStats;
