'use client';

import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
  Zap,
  Flame,
  RefreshCw,
} from 'lucide-react';
import { FuturesMarketStats } from '../../types/futures';

interface FuturesHeroStatsProps {
  stats: FuturesMarketStats | null;
  isLoading: boolean;
  onRefresh: () => void;
  onSelectSqueezeSymbol?: (symbol: string) => void;
}

export const FuturesHeroStats: React.FC<FuturesHeroStatsProps> = ({
  stats,
  isLoading,
  onRefresh,
  onSelectSqueezeSymbol,
}) => {
  const isBullish = stats?.marketBias?.includes('BULLISH');
  const isBearish = stats?.marketBias?.includes('BEARISH');

  const formattedVol = stats?.total24hVolumeUsd
    ? `$${(stats.total24hVolumeUsd / 1e9).toFixed(1)}B`
    : 'Memuat...';

  return (
    <div className="flex flex-col gap-2 font-sans">
      {/* Squeeze Alert Marquee Strip */}
      {stats?.topSqueezeCoins && stats.topSqueezeCoins.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl py-1.5 px-3 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300 font-bold font-mono flex items-center gap-1 shrink-0 text-[10px]">
              <Zap className="w-3 h-3 text-yellow-400" />
              SQUEEZE RADAR:
            </span>
            <div className="flex items-center gap-2 shrink-0">
              {stats.topSqueezeCoins.slice(0, 5).map((coin) => (
                <button
                  key={coin.symbol}
                  onClick={() => onSelectSqueezeSymbol?.(coin.symbol)}
                  className="px-2 py-0.5 rounded bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-200 font-mono text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span className="font-bold">{coin.symbol}</span>
                  <span
                    className={
                      coin.potentialType === 'SHORT_SQUEEZE_LONG'
                        ? 'text-emerald-400 font-bold'
                        : 'text-rose-400 font-bold'
                    }
                  >
                    {coin.fundingRatePct.toFixed(3)}%
                  </span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="text-zinc-400 hover:text-zinc-200 p-1 rounded transition-transform cursor-pointer shrink-0"
            title="Refresh Data Pasar"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      )}

      {/* 4 Telemetry Metrics in a Single Compact Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 font-mono">
        {/* Metric 1: Market Bias */}
        <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-2.5 flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
            isBullish ? 'bg-emerald-500/15 text-emerald-400' : isBearish ? 'bg-rose-500/15 text-rose-400' : 'bg-cyan-500/15 text-cyan-400'
          }`}>
            {isBullish ? <TrendingUp className="w-4 h-4" /> : isBearish ? <TrendingDown className="w-4 h-4" /> : <Activity className="w-4 h-4" />}
          </div>
          <div className="overflow-hidden">
            <span className="text-[10px] text-zinc-500 block truncate">Sentimen Pasar</span>
            <div className="flex items-center gap-1.5">
              <span className={`text-xs font-black truncate ${
                isBullish ? 'text-emerald-400' : isBearish ? 'text-rose-400' : 'text-cyan-300'
              }`}>
                {stats?.marketBias || 'NEUTRAL'}
              </span>
              <span className="text-[10px] text-zinc-400 hidden sm:inline">
                ({stats?.longAccountPct ?? 50}% Long)
              </span>
            </div>
          </div>
        </div>

        {/* Metric 2: 24h Futures Volume */}
        <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-2.5 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-yellow-500/15 text-yellow-400 flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div className="overflow-hidden">
            <span className="text-[10px] text-zinc-500 block truncate">Volume 24 Jam</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-white truncate">{formattedVol}</span>
              <span className="text-[10px] text-zinc-400 hidden sm:inline">({stats?.totalPairs ?? '570+'} Pairs)</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Avg Funding Rate */}
        <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-2.5 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
            <Flame className="w-4 h-4" />
          </div>
          <div className="overflow-hidden">
            <span className="text-[10px] text-zinc-500 block truncate">Rata-rata Funding</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-amber-300 truncate">
                {stats?.avgFundingRate ? `+${stats.avgFundingRate.toFixed(4)}%` : '+0.0100%'}
              </span>
              <span className="text-[10px] text-zinc-400 hidden sm:inline">/ 8h</span>
            </div>
          </div>
        </div>

        {/* Metric 4: Sinyal Aktif */}
        <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-2.5 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div className="overflow-hidden">
            <span className="text-[10px] text-zinc-500 block truncate">Sinyal Lolos Filter</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black text-emerald-400 truncate">
                {stats?.activeSignalsCount ?? 0} Sinyal
              </span>
              <span className="text-[10px] text-emerald-500/70 hidden sm:inline">(R:R &ge; 2.5)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
