'use client';

import React, { useState } from 'react';
import { Zap, ChevronDown, ChevronUp, ExternalLink, BarChart2 } from 'lucide-react';
import { FuturesMarketStats } from '../../types/futures';

interface FundingRateHeatmapProps {
  stats: FuturesMarketStats | null;
  onSelectCoin: (symbol: string) => void;
  onOpenChart: (symbol: string) => void;
}

export const FundingRateHeatmap: React.FC<FundingRateHeatmapProps> = ({
  stats,
  onSelectCoin,
  onOpenChart,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const squeezeCoins = stats?.topSqueezeCoins || [];

  if (squeezeCoins.length === 0) return null;

  return (
    <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl overflow-hidden font-sans">
      {/* Header Bar */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-3 py-2 bg-zinc-900/40 flex items-center justify-between cursor-pointer hover:bg-zinc-900/70 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-400">
            <Zap className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-xs text-zinc-200 font-mono tracking-wide">
              Funding Rate & Squeeze Matrix
            </h4>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-500/15 text-yellow-300 border border-yellow-500/30 font-mono">
              {squeezeCoins.length} Anomali
            </span>
            <span className="text-[10px] text-zinc-500 hidden md:inline font-mono">
              (Klik untuk melihat potensi short/long squeeze)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-mono">
          <span className="text-[10px] hidden sm:inline">{isExpanded ? 'Tutup' : 'Buka Matrix'}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {/* Expanded Table */}
      {isExpanded && (
        <div className="p-4 border-t border-zinc-800/80">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {squeezeCoins.map((item) => {
              const isShortSqueeze = item.potentialType === 'SHORT_SQUEEZE_LONG';
              return (
                <div
                  key={item.symbol}
                  className={`p-3 rounded-xl border flex items-center justify-between transition-all ${
                    isShortSqueeze
                      ? 'bg-emerald-500/[0.04] border-emerald-500/30 hover:border-emerald-500/50'
                      : 'bg-rose-500/[0.04] border-rose-500/30 hover:border-rose-500/50'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-white">
                        {item.symbol}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          isShortSqueeze
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {isShortSqueeze ? '⚡ SHORT SQUEEZE' : '💥 LONG SQUEEZE'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 font-mono text-xs">
                      <span className="text-zinc-400">Funding:</span>
                      <span
                        className={`font-bold ${
                          isShortSqueeze ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {item.fundingRatePct.toFixed(4)}%
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => onSelectCoin(item.symbol)}
                      className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-all cursor-pointer font-mono"
                      title="Filter kartu sinyal koin ini"
                    >
                      Pilih
                    </button>
                    <button
                      onClick={() => onOpenChart(item.symbol)}
                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-all cursor-pointer"
                      title="Lihat Grafik TradingView"
                    >
                      <BarChart2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
