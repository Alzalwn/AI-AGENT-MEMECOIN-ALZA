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
  RotateCcw,
  RefreshCw,
  Flame,
  Coins,
  Wallet,
  DollarSign
} from 'lucide-react';
import TrailingStopVisualizer from '../TrailingStopVisualizer';
import TakeProfitProgressBar from '../TakeProfitProgressBar';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import CollapsibleCard from '../ui/CollapsibleCard';
import type { TokenHolding } from '@/types/trading';

interface PositionsTableProps {
  onSharePnl?: () => void;
}

export const PositionsTable: React.FC<PositionsTableProps> = ({ onSharePnl }) => {
  const {
    activePosition,
    quickSellPosition,
    manualExitPosition,
    resetPositionMutex,
    agentConfig,
    updateAgentConfig,
    appendLog,
    walletHoldings,
    isHoldingsLoading,
    totalHoldingsValueUsd,
    totalHoldingsValueSol,
    refreshHoldings,
    sellTokenHolding,
    dumpAllHoldingsToSol,
    unwrapWsolOrCloseAccount,
    emergencyStopAllTrading,
    engineStatus,
    walletState
  } = useTradingAgent();

  const [copiedCa, setCopiedCa] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'SNIPER' | 'HOLDINGS'>('SNIPER');
  const [sellingMint, setSellingMint] = useState<string | null>(null);
  const [unwrappingMint, setUnwrappingMint] = useState<string | null>(null);
  const [isDumpingAll, setIsDumpingAll] = useState<boolean>(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCa(text);
    setTimeout(() => setCopiedCa(null), 2000);
  };

  const handleSingleTokenSell = async (mint: string, percentage: number = 100) => {
    setSellingMint(mint);
    try {
      await sellTokenHolding(mint, percentage);
    } finally {
      setSellingMint(null);
    }
  };

  const handleDumpAll = async () => {
    if (confirm('🚨 Konfirmasi: Jual SEMUA token di dompet Phantom ke SOL sekaligus?')) {
      setIsDumpingAll(true);
      try {
        await dumpAllHoldingsToSol();
      } finally {
        setIsDumpingAll(false);
      }
    }
  };

  const handleUnwrapWsol = async (mint: string, isToken2022: boolean = false) => {
    setUnwrappingMint(mint);
    try {
      await unwrapWsolOrCloseAccount(mint, isToken2022);
    } finally {
      setUnwrappingMint(null);
    }
  };

  const WSOL_MINT = 'So11111111111111111111111111111111111111112';
  const memeHoldings = walletHoldings.filter((h) => h.mint !== WSOL_MINT && h.uiAmount > 0);

  const safeEntryPrice = activePosition?.entryPriceSol || 0.0001;
  const safeCurrentPrice = activePosition?.currentPriceSol || safeEntryPrice;
  const safeHighestPrice = activePosition?.highestPriceSol || safeCurrentPrice;
  const safeTrailingStopPrice = activePosition?.trailingStopPriceSol || +(safeEntryPrice * 0.85);
  const safePnlPct = activePosition?.pnlPct ?? 0;
  const safePnlSol = activePosition?.pnlSol ?? 0;
  const safeRMultiplier = activePosition?.rMultiplier ?? 0;
  const safeEntryTime = activePosition?.entryTimestamp || Date.now();

  const totalBadgeLabel = activePosition
    ? `MUTEX ACTIVE • ${activePosition.token.symbol} (${safePnlPct >= 0 ? '+' : ''}${safePnlPct}%)`
    : memeHoldings.length > 0
    ? `${memeHoldings.length} TOKEN TERBUKA DI DOMPET`
    : 'MUTEX READY';

  return (
    <CollapsibleCard
      title="Active Position & Wallet Holdings"
      subtitle={
        activePosition
          ? activePosition.token.name
          : memeHoldings.length > 0
          ? `${memeHoldings.length} Token Terdeteksi di Dompet Phantom`
          : undefined
      }
      badge={totalBadgeLabel}
      badgeVariant={activePosition ? 'amber' : memeHoldings.length > 0 ? 'rose' : 'zinc'}
      icon={<Target className="w-4 h-4 text-emerald-400" />}
      storageKey="card_active_position"
      defaultCollapsed={false}
      headerActions={
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => refreshHoldings()}
            disabled={isHoldingsLoading}
            className="text-[10px] px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-all font-bold cursor-pointer flex items-center gap-1 disabled:opacity-50"
            title="Refresh saldo token di dompet on-chain"
          >
            <RefreshCw className={`w-3 h-3 text-cyan-400 ${isHoldingsLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          {activePosition && (
            <button
              type="button"
              onClick={() => resetPositionMutex()}
              className="text-[10px] px-2 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 transition-all font-bold cursor-pointer flex items-center gap-1"
              title="Tutup paksa posisi ini dan kosongkan slot mutex agar bot bisa mencari koin baru"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Reset Mutex</span>
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-3 font-mono">
        {/* Anti-Fee Drainage & Transparency Banner */}
        <div className="p-3 rounded-xl bg-zinc-950/90 border border-zinc-800 flex items-center justify-between flex-wrap gap-2.5 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${engineStatus === 'PAUSED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'}`}>
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs font-bold flex-wrap">
                <span className="text-zinc-200">Mode Bot:</span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                  engineStatus === 'PAUSED'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse'
                }`}>
                  {engineStatus === 'PAUSED' ? '🛡️ PAUSED (AMAN • TIDAK ADA TRANSAKSI OTOMATIS)' : '⚡ BERJALAN'}
                </span>
                <span className="text-[10px] text-zinc-400">
                  Priority Fee: <b className="text-cyan-400">0.000010 SOL (~$0.001)</b>
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 mt-0.5">
                💡 <span className="text-zinc-300">Tidak ada biaya admin server.</span> Dana Anda aman berada di token Phantom ($15.98) & deposit sewa akun.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {engineStatus !== 'PAUSED' && (
              <button
                type="button"
                onClick={() => emergencyStopAllTrading()}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>🛑 STOP SEMUA BOT</span>
              </button>
            )}
            {memeHoldings.length > 0 && (
              <button
                type="button"
                onClick={() => setActiveTab('HOLDINGS')}
                className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Lihat {memeHoldings.length} Token</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs between Active Sniper Slot & Wallet Holdings */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('SNIPER')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'SNIPER'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>Sniper Slot</span>
              {activePosition && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('HOLDINGS')}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'HOLDINGS'
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Token Dompet ({walletHoldings.length})</span>
              {memeHoldings.length > 0 && (
                <span className="px-1.5 py-0.2 bg-rose-500/30 text-rose-400 text-[9px] rounded-full border border-rose-500/40">
                  {memeHoldings.length}
                </span>
              )}
            </button>
          </div>

          {/* Quick Stats Summary */}
          <div className="text-[11px] text-zinc-400 hidden sm:flex items-center gap-2">
            <span>Nilai Token:</span>
            <span className="font-bold text-emerald-400">${totalHoldingsValueUsd.toFixed(2)}</span>
            <span className="text-zinc-600">|</span>
            <span className="font-bold text-cyan-400">{totalHoldingsValueSol.toFixed(4)} SOL</span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* VIEW 1: ACTIVE SNIPER POSITION (SINGLE MUTEX GUARD) */}
        {/* ========================================================================= */}
        {activeTab === 'SNIPER' && (
          <>
            {activePosition ? (
              <div className="space-y-3">
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
                          {copiedCa === activePosition.token.mint ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                        <a
                          href={`https://dexscreener.com/search?q=${encodeURIComponent(activePosition.token.mint)}`}
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
                          safePnlPct >= 0
                            ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]'
                            : 'text-rose-400 drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                        }`}
                      >
                        {safePnlPct >= 0 ? '+' : ''}
                        {safePnlPct}%
                      </span>
                      <span className="text-xs text-zinc-400">
                        (+{safeRMultiplier}R)
                      </span>
                    </div>
                    <span className="text-xs text-zinc-400 block font-mono">
                      {safePnlSol >= 0 ? '+' : ''}
                      {safePnlSol} SOL
                    </span>
                  </div>
                </div>

                {/* Metric Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div className="bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/80">
                    <span className="text-zinc-500 block text-[10px]">Invested (SOL)</span>
                    <span className="font-bold text-zinc-200">
                      {activePosition.solInvested || 0} SOL
                    </span>
                  </div>

                  <div className="bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/80">
                    <span className="text-zinc-500 block text-[10px]">Entry Price</span>
                    <span className="font-bold text-zinc-300">
                      {safeEntryPrice.toFixed(8)} SOL
                    </span>
                  </div>

                  <div className="bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/80">
                    <span className="text-zinc-500 block text-[10px]">Live Price (DEX)</span>
                    <span className="font-black text-emerald-400">
                      {safeCurrentPrice.toFixed(8)} SOL
                    </span>
                  </div>

                  <div className="bg-zinc-950/60 p-2.5 rounded-xl border border-zinc-800/80">
                    <span className="text-zinc-500 block text-[10px]">Peak / High-Water</span>
                    <span className="font-bold text-cyan-400">
                      {safeHighestPrice.toFixed(8)} SOL
                    </span>
                  </div>
                </div>

                {/* Take Profit Progress Bar with Real-Time Velocity & ETA */}
                <TakeProfitProgressBar
                  position={activePosition}
                  defaultTargetTpPct={agentConfig.takeProfitPct ?? 100}
                  defaultStopLossPct={agentConfig.stopLossPct ?? -25}
                  defaultMaxHoldTimeSec={agentConfig.maxHoldTimeSec ?? 180}
                />

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
                      Rincian Order & Exit Target (Smart Arbiter)
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
                    <div className="px-3 pb-3 pt-1 border-t border-zinc-800/60 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[10px]">
                      <div className="bg-zinc-900/60 p-2 rounded-lg border border-zinc-800">
                        <span className="text-zinc-500 block">Take Profit Target:</span>
                        <span className="font-mono text-emerald-400 font-bold">
                          +{activePosition.targetTpPct ?? agentConfig.takeProfitPct ?? 100}% ({(activePosition.targetTpPriceSol ?? safeEntryPrice * 2).toFixed(8)} SOL)
                        </span>
                      </div>
                      <div className="bg-zinc-900/60 p-2 rounded-lg border border-zinc-800">
                        <span className="text-zinc-500 block">Stop Loss Level:</span>
                        <span className="font-mono text-rose-400 font-bold">
                          {activePosition.stopLossPct ?? agentConfig.stopLossPct ?? -25}% ({(activePosition.stopLossPriceSol ?? safeEntryPrice * 0.75).toFixed(8)} SOL)
                        </span>
                      </div>
                      <div className="bg-zinc-900/60 p-2 rounded-lg border border-zinc-800">
                        <span className="text-zinc-500 block">Trailing Stop Floor:</span>
                        <span className="font-mono text-amber-400 font-bold">
                          {safeTrailingStopPrice.toFixed(8)} SOL
                        </span>
                      </div>
                      <div className="bg-zinc-900/60 p-2 rounded-lg border border-zinc-800">
                        <span className="text-zinc-500 block">Entry Timestamp:</span>
                        <span className="font-mono text-zinc-300 font-bold">
                          {new Date(safeEntryTime).toLocaleTimeString('id-ID')}
                        </span>
                      </div>
                      <div className="bg-zinc-900/60 p-2 rounded-lg border border-zinc-800">
                        <span className="text-zinc-500 block">Hold Duration / TTL:</span>
                        <span className="font-mono text-cyan-300 font-bold">
                          {Math.max(0, Math.round((Date.now() - safeEntryTime) / 1000))}s / Max {activePosition.maxHoldTimeSec ?? agentConfig.maxHoldTimeSec ?? 180}s
                        </span>
                      </div>
                      <div className="bg-zinc-900/60 p-2 rounded-lg border border-zinc-800">
                        <span className="text-zinc-500 block">Exit Strategy Mode:</span>
                        <span className="font-mono text-purple-400 font-bold">
                          Dynamic Trailing + Momentum
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Action Button Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
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

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => resetPositionMutex()}
                    className="border-rose-500/40 text-rose-400 hover:bg-rose-500/10"
                    leftIcon={<RotateCcw className="w-3.5 h-3.5 text-rose-400" />}
                    title="Kosongkan slot mutex jika posisi macet atau saldo di dompet 0"
                  >
                    Reset Mutex
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
              <div className="p-6 text-center space-y-3 bg-zinc-950/40 rounded-xl border border-zinc-800/60 font-mono">
                <Clock className="w-8 h-8 mx-auto text-zinc-600 animate-pulse" />
                <p className="font-bold text-zinc-300 text-xs uppercase tracking-wider">
                  Tidak Ada Posisi Terbuka di Sniper Slot
                </p>
                <p className="text-[11px] text-zinc-500 max-w-sm mx-auto leading-relaxed">
                  Single Position Mutex Guard siap mengeksekusi order baru saat 5/5 konsensus agen setuju.
                </p>

                {memeHoldings.length > 0 && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('HOLDINGS')}
                      className="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/40 font-bold text-xs transition-all inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/10"
                    >
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span>Lihat & Likuidasi {memeHoldings.length} Token di Dompet Phantom</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: WALLET HOLDINGS & OPEN POSITIONS LIQUIDATOR */}
        {/* ========================================================================= */}
        {activeTab === 'HOLDINGS' && (
          <div className="space-y-3">
            {/* Header Alert & Emergency Dump All Button */}
            {memeHoldings.length > 0 ? (
              <div className="bg-rose-950/30 border border-rose-500/40 p-3 rounded-xl flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-rose-500/20 text-rose-400">
                    <Flame className="w-5 h-5 animate-bounce" />
                  </div>
                  <div>
                    <h4 className="font-black text-rose-300 text-xs flex items-center gap-1.5">
                      <span>{memeHoldings.length} Token Terbuka di Dompet Phantom</span>
                    </h4>
                    <p className="text-[10px] text-zinc-400">
                      Total Nilai: <span className="text-emerald-400 font-bold">${totalHoldingsValueUsd.toFixed(2)}</span> (~{totalHoldingsValueSol.toFixed(4)} SOL). Likuidasi langsung kembali ke SOL via Jupiter.
                    </p>
                  </div>
                </div>

                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleDumpAll}
                  disabled={isDumpingAll}
                  leftIcon={<Flame className={`w-3.5 h-3.5 ${isDumpingAll ? 'animate-spin' : ''}`} />}
                  glow
                >
                  {isDumpingAll ? 'Sedang Likuidasi...' : '🚨 DUMP ALL KE SOL'}
                </Button>
              </div>
            ) : (
              <div className="bg-zinc-900/50 border border-zinc-800 p-3 rounded-xl text-center text-xs text-zinc-400">
                Semua token memecoin telah dilikuidasi atau dompet hanya memegang SOL.
              </div>
            )}

            {/* Token Holdings List */}
            {walletHoldings.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs">
                {isHoldingsLoading ? 'Memuat token akun on-chain...' : 'Tidak ada token SPL terdeteksi di dompet ini.'}
              </div>
            ) : (
              <div className="space-y-2">
                {walletHoldings.map((token) => {
                  const isWSOL = token.mint === WSOL_MINT;
                  const isSellingThis = sellingMint === token.mint;

                  return (
                    <div
                      key={token.mint}
                      className={`p-3 rounded-xl border transition-all flex items-center justify-between flex-wrap gap-3 ${
                        isWSOL
                          ? 'bg-zinc-950/40 border-zinc-800/60'
                          : 'bg-zinc-950/80 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      {/* Token Identity */}
                      <div className="flex items-center gap-3">
                        {token.iconUrl ? (
                          <img
                            src={token.iconUrl}
                            alt={token.symbol}
                            className="w-9 h-9 rounded-xl object-cover border border-zinc-700"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center font-black text-cyan-400 text-xs">
                            {token.symbol.slice(0, 3)}
                          </div>
                        )}

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm text-zinc-100">{token.symbol}</span>
                            <span className="text-[11px] text-zinc-400 truncate max-w-[100px]">
                              {token.name}
                            </span>
                            {isWSOL && <Badge variant="zinc" size="xs">Wrapped SOL</Badge>}
                            {token.isToken2022 && <Badge variant="purple" size="xs">Token-2022</Badge>}
                          </div>

                          <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-0.5">
                            <span>
                              {token.mint.slice(0, 5)}...{token.mint.slice(-4)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(token.mint)}
                              className="hover:text-emerald-400 transition-colors cursor-pointer"
                              title="Salin Mint"
                            >
                              {copiedCa === token.mint ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                            <a
                              href={`https://dexscreener.com/search?q=${encodeURIComponent(token.mint)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-cyan-400 hover:underline flex items-center gap-0.5"
                            >
                              <span>DEX</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                            <a
                              href={`https://solscan.io/token/${token.mint}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-zinc-400 hover:underline flex items-center gap-0.5"
                            >
                              <span>Solscan</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          </div>
                        </div>
                      </div>

                      {/* Holdings Balance & Valuation */}
                      <div className="text-right">
                        <div className="font-black text-sm text-zinc-200">
                          {token.uiAmount.toLocaleString(undefined, { maximumFractionDigits: 4 })} {token.symbol}
                        </div>
                        <div className="text-[11px] text-emerald-400 font-bold flex items-center justify-end gap-1.5">
                          <span>${token.valueUsd.toFixed(2)}</span>
                          <span className="text-zinc-500 text-[10px] font-normal">
                            (~{token.valueSol.toFixed(4)} SOL)
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons for this token */}
                      {!isWSOL ? (
                        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end pt-1 sm:pt-0 border-t sm:border-t-0 border-zinc-800/80">
                          {token.uiAmount > 0 ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleSingleTokenSell(token.mint, 50)}
                                disabled={isSellingThis || isDumpingAll}
                                className="px-2.5 py-1 text-[10px] rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 hover:border-zinc-700 font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1"
                              >
                                <span>Jual 50%</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSingleTokenSell(token.mint, 100)}
                                disabled={isSellingThis || isDumpingAll}
                                className="px-3 py-1 text-[10px] rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 hover:border-rose-500 font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1 shadow-sm shadow-rose-500/10"
                              >
                                <Flame className={`w-3 h-3 ${isSellingThis ? 'animate-spin' : ''}`} />
                                <span>{isSellingThis ? 'Memproses...' : 'Jual 100%'}</span>
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleUnwrapWsol(token.mint, token.isToken2022)}
                              disabled={unwrappingMint === token.mint}
                              className="px-2.5 py-1 text-[10px] rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1"
                              title="Tutup akun kosong ini dan tarik kembali ~0.002 SOL sewa ke dompet"
                            >
                              <RotateCcw className={`w-3 h-3 ${unwrappingMint === token.mint ? 'animate-spin' : ''}`} />
                              <span>{unwrappingMint === token.mint ? 'Menarik...' : 'Tarik Sewa (~0.002 SOL)'}</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleUnwrapWsol(token.mint, token.isToken2022)}
                            disabled={unwrappingMint === token.mint}
                            className="px-3 py-1.5 text-xs rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 hover:border-emerald-500 font-bold transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-sm shadow-emerald-500/10"
                            title="Konversi WSOL kembali ke SOL asli dan kembalikan deposit sewa akun"
                          >
                            <RotateCcw className={`w-3.5 h-3.5 ${unwrappingMint === token.mint ? 'animate-spin' : ''}`} />
                            <span>{unwrappingMint === token.mint ? 'Mengembalikan SOL...' : '⚡ Unwrap WSOL ke Native SOL'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </CollapsibleCard>
  );
};

export default PositionsTable;
