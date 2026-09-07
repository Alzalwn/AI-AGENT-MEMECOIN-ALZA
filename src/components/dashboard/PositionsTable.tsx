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
  ChevronDown,
  Percent,
  Shield,
  Layers,
  ArrowUpRight,
  TrendingUp,
  RotateCcw
} from 'lucide-react';
import TrailingStopVisualizer from '../TrailingStopVisualizer';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import CollapsibleCard from '../ui/CollapsibleCard';

interface PositionsTableProps {
  onSharePnl?: () => void;
}

export const PositionsTable: React.FC<PositionsTableProps> = ({ onSharePnl }) => {
  const { activePosition, quickSellPosition, manualExitPosition } = useTradingAgent();
  const [copiedCa, setCopiedCa] = useState<boolean>(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCa(true);
    setTimeout(() => setCopiedCa(false), 2000);
  };

  return (
    <CollapsibleCard
      title="Active Position (Single Mutex)"
      subtitle={activePosition ? activePosition.token.name : undefined}
      badge={
        activePosition
          ? `MUTEX ACTIVE • ${activePosition.token.symbol} (${activePosition.pnlPct >= 0 ? '+' : ''}${activePosition.pnlPct}%)`
          : 'MUTEX READY'
      }
      badgeVariant={
        activePosition
          ? 'amber'
          : 'zinc'
      }
      icon={<Target className="w-4 h-4 text-emerald-400" />}
      storageKey="card_active_position"
      defaultCollapsed={false}
      headerActions={
        activePosition ? (
          <button
            type="button"
            onClick={() => manualExitPosition()}
            className="text-[10px] px-2 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 transition-all font-bold cursor-pointer flex items-center gap-1"
            title="Tutup posisi ini dan kosongkan slot mutex"
          >
            <RotateCcw className="w-3 h-3" />
            <span className="hidden sm:inline">Reset Mutex</span>
          </button>
        ) : undefined
      }
    >
      {activePosition ? (
        <div className="space-y-3 font-mono">
          {/* Token Header Row */}
          <div className="flex items-center justify-between flex-wrap gap-3 bg-zinc-950/70 p-3 rounded-xl border border-zinc-800/80">
            <div className="flex items-center gap-2.5">
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
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-base text-zinc-100">
                    {activePosition.token.symbol}
                  </span>
                  <span className="text-xs text-zinc-400 truncate max-w-[120px]">
                    {activePosition.token.name}
                  </span>
                  <Badge variant="cyan" size="xs">
                    {activePosition.token.platform}
                  </Badge>
                  <Badge variant="amber" size="xs">
                    MUTEX ACTIVE
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-0.5">
                  <span className="font-mono">
                    {activePosition.token.mint.slice(0, 6)}...
                    {activePosition.token.mint.slice(-4)}
                  </span>
                  <button
                    type="button"
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
                    href={
                      activePosition.token.dexUrl ||
                      (activePosition.token.mint.includes('...')
                        ? `https://dexscreener.com/search?q=${encodeURIComponent(activePosition.token.symbol.replace('$', ''))}`
                        : `https://dexscreener.com/search?q=${encodeURIComponent(activePosition.token.mint)}`)
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:underline flex items-center gap-0.5 font-bold"
                    title="Lihat di DexScreener"
                  >
                    <span>DEX</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                  <a
                    href={`https://rugcheck.xyz/tokens/${activePosition.token.mint}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:underline flex items-center gap-0.5 font-bold"
                    title="Cek Rugcheck"
                  >
                    <span>Rugcheck</span>
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

          {/* Collapsible Detailed Trade Drawer */}
          <div className="border border-zinc-800/70 rounded-xl overflow-hidden bg-zinc-950/50">
            <button
              type="button"
              onClick={() => setIsDetailsOpen((prev) => !prev)}
              className="w-full px-3 py-2 flex items-center justify-between text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50 transition-colors cursor-pointer"
              aria-expanded={isDetailsOpen}
            >
              <span className="font-bold flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-cyan-400" />
                Rincian Order & Exit Target
              </span>
              <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                <span>{isDetailsOpen ? 'Sembunyikan' : 'Lihat Detail'}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform duration-200 ${
                    isDetailsOpen ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </button>

            {isDetailsOpen && (
              <div className="px-3 pb-3 pt-1 border-t border-zinc-800/60 grid grid-cols-2 gap-2 text-[10px]">
                <div className="bg-zinc-900/60 p-2 rounded-lg border border-zinc-800">
                  <span className="text-zinc-500 block">Trailing Stop Floor:</span>
                  <span className="font-mono text-amber-400 font-bold">
                    {activePosition.trailingStopPriceSol.toFixed(8)} SOL
                  </span>
                </div>
                <div className="bg-zinc-900/60 p-2 rounded-lg border border-zinc-800">
                  <span className="text-zinc-500 block">Entry Time:</span>
                  <span className="font-mono text-zinc-300 font-bold">
                    {new Date(activePosition.entryTimestamp).toLocaleTimeString('id-ID')}
                  </span>
                </div>
                <div className="bg-zinc-900/60 p-2 rounded-lg border border-zinc-800">
                  <span className="text-zinc-500 block">Stop Loss Level:</span>
                  <span className="font-mono text-rose-400 font-bold">
                    -{(activePosition.entryPriceSol * 0.15).toFixed(8)} SOL (-15%)
                  </span>
                </div>
                <div className="bg-zinc-900/60 p-2 rounded-lg border border-zinc-800">
                  <span className="text-zinc-500 block">Take Profit Target:</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    +{(activePosition.entryPriceSol * 0.50).toFixed(8)} SOL (+50%)
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Action Button Bar */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => quickSellPosition(50)}
              leftIcon={<Percent className="w-3.5 h-3.5 text-cyan-400" />}
            >
              Sell 50%
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
                Share
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="p-8 text-center space-y-2.5 bg-zinc-950/40 rounded-xl border border-zinc-800/60 font-mono">
          <Clock className="w-8 h-8 mx-auto text-zinc-600 animate-pulse" />
          <p className="font-bold text-zinc-300 text-xs uppercase tracking-wider">
            Tidak Ada Posisi Terbuka
          </p>
          <p className="text-[11px] text-zinc-500 max-w-sm mx-auto leading-relaxed">
            Single Position Mutex Guard siap mengeksekusi order pertama yang disetujui 5/5 konsensus agen secara otomatis.
          </p>
        </div>
      )}
    </CollapsibleCard>
  );
};

export default PositionsTable;
