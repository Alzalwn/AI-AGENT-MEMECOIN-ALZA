'use client';

import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
  Zap,
  Flame,
  AlertTriangle,
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
    ? `$${(stats.total24hVolumeUsd / 1e9).toFixed(2)}B`
    : 'Memuat...';

  return (
    <div className="flex flex-col gap-3 font-sans">
      {/* Squeeze Alert Marquee Banner */}
      {stats?.topSqueezeCoins && stats.topSqueezeCoins.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-2.5 px-4 flex items-center justify-between gap-3 text-xs shadow-sm">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300 font-bold font-mono flex items-center gap-1 shrink-0 text-[10px]">
              <Zap className="w-3 h-3 text-yellow-400" />
              SQUEEZE RADAR
            </span>
            <span className="text-zinc-300 text-xs shrink-0">
              Anomali Funding Terdeteksi:
            </span>
            <div className="flex items-center gap-2 shrink-0">
              {stats.topSqueezeCoins.slice(0, 4).map((coin) => (
                <button
                  key={coin.symbol}
                  onClick={() => onSelectSqueezeSymbol?.(coin.symbol)}
                  className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-mono text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer"
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
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      )}

      {/* 4 Telemetry Metric Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: Market Bias */}
        <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-3.5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 text-xs font-mono">
            <span>Sentimen Derivatif</span>
            {isBullish ? (
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            ) : isBearish ? (
              <TrendingDown className="w-4 h-4 text-rose-400" />
            ) : (
              <Activity className="w-4 h-4 text-cyan-400" />
            )}
          </div>
          <div className="mt-2">
            <span
              className={`text-base sm:text-lg font-black font-mono tracking-tight block ${
                isBullish ? 'text-emerald-400' : isBearish ? 'text-rose-400' : 'text-cyan-300'
              }`}
            >
              {stats?.marketBias || 'NEUTRAL'}
            </span>
            <span className="text-[11px] text-zinc-400 font-mono mt-0.5 block">
              Akun: {stats?.longAccountPct ?? 50}% Long vs {stats?.shortAccountPct ?? 50}% Short
            </span>
          </div>
        </div>

        {/* Metric 2: 24h Futures Volume */}
        <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-3.5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 text-xs font-mono">
            <span>Volume Futures 24 Jam</span>
            <Layers className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="mt-2">
            <span className="text-base sm:text-lg font-black font-mono text-white tracking-tight block">
              {formattedVol}
            </span>
            <span className="text-[11px] text-zinc-400 font-mono mt-0.5 block">
              Total {stats?.totalPairs ?? '300+'} Pasangan USDT-M
            </span>
          </div>
        </div>

        {/* Metric 3: Avg Funding Rate */}
        <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-3.5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 text-xs font-mono">
            <span>Rata-rata Funding Rate</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <span className="text-base sm:text-lg font-black font-mono text-amber-300 tracking-tight block">
              {stats?.avgFundingRate ? `+${stats.avgFundingRate.toFixed(4)}%` : '+0.0100%'}
            </span>
            <span className="text-[11px] text-zinc-400 font-mono mt-0.5 block">
              Siklus Pembayaran per 8 Jam
            </span>
          </div>
        </div>

        {/* Metric 4: Sinyal Aktif */}
        <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-2xl p-3.5 flex flex-col justify-between shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 text-xs font-mono">
            <span>Sinyal Berpeluang Kuat</span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <span className="text-base sm:text-lg font-black font-mono text-emerald-400 tracking-tight block">
              {stats?.activeSignalsCount ?? 0} Sinyal Lolos
            </span>
            <span className="text-[11px] text-zinc-400 font-mono mt-0.5 block">
              Multi-Agent Consensus (3/4+ Lolos)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
