'use client';

import React, { useState } from 'react';
import { useTradingAgent } from '../../hooks/useTradingAgent';
import {
  Target,
  Clock,
  ExternalLink,
  Copy,
  Check,
  Share2,
  AlertTriangle,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
  Layers
} from 'lucide-react';
import TrailingStopVisualizer from '../TrailingStopVisualizer';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

interface PositionsTableProps {
  onSharePnl?: () => void;
}

export const PositionsTable: React.FC<PositionsTableProps> = ({ onSharePnl }) => {
  const { activePosition, quickSellPosition, manualExitPosition } = useTradingAgent();
  const [copiedCa, setCopiedCa] = useState<boolean>(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCa(true);
    setTimeout(() => setCopiedCa(false), 2000);
  };

  return (
    <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-4 font-mono shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <Target className="w-4 h-4" />
          </div>
          <span className="font-black text-sm tracking-wider text-zinc-100 uppercase">
            Active Position (Single Mutex)
          </span>
        </div>
        <Badge
          variant={activePosition ? 'emerald' : 'zinc'}
          size="xs"
          dot
          pulse={!!activePosition}
        >
          {activePosition ? 'STATUS: IN POSITION' : 'STANDBY (MUTEX READY)'}
        </Badge>
      </div>

      {activePosition ? (
        <div className="space-y-4">
          {/* Token Header Row */}
          <div className="flex items-center justify-between flex-wrap gap-3 bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80">
            <div className="flex items-center gap-3">
              {activePosition.token.iconUrl ? (
                <img
                  src={activePosition.token.iconUrl}
                  alt={activePosition.token.symbol}
                  className="w-10 h-10 rounded-xl object-cover border border-zinc-700"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/40 flex items-center justify-center font-black text-emerald-400 text-sm">
                  {activePosition.token.symbol.slice(1, 3).toUpperCase() || '$'}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-base text-zinc-100">
                    {activePosition.token.symbol}
                  </span>
                  <span className="text-xs text-zinc-400 truncate max-w-[140px]">
                    {activePosition.token.name}
                  </span>
                  <Badge variant="cyan" size="xs">
                    {activePosition.token.platform}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-0.5">
                  <span className="font-mono">
                    {activePosition.token.mint.slice(0, 6)}...
                    {activePosition.token.mint.slice(-4)}
                  </span>
                  <button
                    onClick={() => handleCopy(activePosition.token.mint)}
                    className="hover:text-emerald-400 transition-colors cursor-pointer"
                    title="Salin Mint CA"
                  >
                    {copiedCa ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                  <a
                    href={`https://dexscreener.com/solana/${activePosition.token.mint}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-cyan-400 transition-colors flex items-center gap-0.5"
                  >
                    <span>DEX</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>
            </div>

            {/* PnL Highlights */}
            <div className="text-right">
              <div className="flex items-baseline justify-end gap-1.5">
                <span
                  className={`text-xl font-black ${
                    activePosition.pnlPct >= 0
                      ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                      : 'text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                  }`}
                >
                  {activePosition.pnlPct >= 0 ? '+' : ''}
                  {activePosition.pnlPct}%
                </span>
                <span className="text-xs text-zinc-400">
                  (+{activePosition.rMultiplier}R)
                </span>
              </div>
              <span className="text-xs text-zinc-400 block font-mono">
                {activePosition.pnlSol >= 0 ? '+' : ''}
                {activePosition.pnlSol} SOL
              </span>
            </div>
          </div>

          {/* Metric Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            <div className="bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/80">
              <span className="text-zinc-500 block text-[10px]">Invested (SOL)</span>
              <span className="font-bold text-zinc-200">
                {activePosition.solInvested} SOL
              </span>
            </div>

            <div className="bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/80">
              <span className="text-zinc-500 block text-[10px]">Entry Price</span>
              <span className="font-bold text-zinc-300">
                {activePosition.entryPriceSol.toFixed(8)} SOL
              </span>
            </div>

            <div className="bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/80">
              <span className="text-zinc-500 block text-[10px]">Live Price (DEX)</span>
              <span className="font-black text-emerald-400">
                {activePosition.currentPriceSol.toFixed(8)} SOL
              </span>
            </div>

            <div className="bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/80">
              <span className="text-zinc-500 block text-[10px]">Peak / High-Water</span>
              <span className="font-bold text-cyan-400">
                {activePosition.highestPriceSol.toFixed(8)} SOL
              </span>
            </div>
          </div>

          {/* Dynamic Trailing Stop Corridor Visualizer */}
          <TrailingStopVisualizer position={activePosition} />

          {/* Quick Action Button Bar */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => quickSellPosition(50)}
              leftIcon={<Percent className="w-3.5 h-3.5 text-cyan-400" />}
            >
              Quick Sell 50%
            </Button>

            <Button
              variant="danger"
              size="sm"
              onClick={() => manualExitPosition()}
              leftIcon={<AlertTriangle className="w-3.5 h-3.5" />}
              glow
            >
              Dump 100%
            </Button>

            {onSharePnl && (
              <Button
                variant="secondary"
                size="sm"
                onClick={onSharePnl}
                leftIcon={<Share2 className="w-3.5 h-3.5 text-emerald-400" />}
              >
                Share PnL
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="p-8 text-center space-y-2.5 bg-zinc-950/40 rounded-xl border border-zinc-800/60">
          <Clock className="w-8 h-8 mx-auto text-zinc-600 animate-pulse" />
          <p className="font-bold text-zinc-300 text-xs uppercase tracking-wider">
            Tidak Ada Posisi Terbuka
          </p>
          <p className="text-[11px] text-zinc-500 max-w-sm mx-auto leading-relaxed">
            Single Position Mutex Guard siap mengeksekusi order pertama yang disetujui 5/5 konsensus agen secara otomatis.
          </p>
        </div>
      )}
    </div>
  );
};

export default PositionsTable;
