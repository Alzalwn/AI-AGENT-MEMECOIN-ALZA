'use client';

/**
 * SignalFeed — Live feed panel sinyal aktif real-time
 * Menampilkan semua sinyal aktif/historis, diurutkan berdasarkan confidence score
 * Dengan filter tier dan search token
 */

import React, { useState, useMemo } from 'react';
import { TradingSignal, SignalTier } from '../../types/signal';
import { SignalCard } from './SignalCard';
import { useTradingAgent } from '../../hooks/useTradingAgent';
import { ScannerStatus } from '../dashboard/ScannerStatus';

type FilterTier = 'ALL' | SignalTier;
type StatusFilter = 'ACTIVE' | 'RESOLVED' | 'ALL';

interface SignalFeedProps {
  signals: TradingSignal[];
  isScanning?: boolean;
}

const TIER_FILTERS: { key: FilterTier; label: string; emoji: string }[] = [
  { key: 'ALL', label: 'Semua', emoji: '📡' },
  { key: 'SUPERNOVA', label: 'Supernova', emoji: '🚀' },
  { key: 'HIGH', label: 'High', emoji: '🔥' },
  { key: 'MODERATE', label: 'Moderate', emoji: '⚡' },
];

function RadarEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-10 sm:py-14 text-center space-y-5 select-none animate-fade-in">
      {/* ─── Circular High-Tech Radar Scope ─── */}
      <div className="relative w-56 h-56 sm:w-64 sm:h-64 rounded-full border border-emerald-500/30 bg-zinc-950/80 flex items-center justify-center overflow-hidden shadow-[0_0_35px_rgba(16,185,129,0.12)]">
        {/* Outer Ring */}
        <div className="absolute inset-0 rounded-full border border-emerald-500/20" />

        {/* Middle Ring */}
        <div className="absolute w-40 h-40 rounded-full border border-emerald-500/15" />

        {/* Inner Ring */}
        <div className="absolute w-20 h-20 rounded-full border border-emerald-500/25" />

        {/* Crosshairs */}
        <div className="absolute w-full h-[1px] bg-emerald-500/20" />
        <div className="absolute h-full w-[1px] bg-emerald-500/20" />

        {/* Rotating Radar Sweep Beam */}
        <div
          className="absolute inset-0 rounded-full animate-radar-sweep pointer-events-none"
          style={{
            background:
              'conic-gradient(from 0deg, rgba(16, 185, 129, 0.35) 0deg, rgba(16, 185, 129, 0.08) 55deg, transparent 80deg, transparent 360deg)',
          }}
        />

        {/* Center Beacon Core */}
        <div className="relative z-10 w-3.5 h-3.5 bg-emerald-400 rounded-full shadow-[0_0_15px_#10b981] flex items-center justify-center">
          <div className="w-6 h-6 rounded-full border border-emerald-400/40 animate-ping absolute" />
        </div>

        {/* Simulated Blips of Filtered Junk Coins */}
        <div
          className="absolute top-12 left-16 w-2 h-2 bg-rose-400/90 rounded-full animate-radar-blip shadow-[0_0_8px_#f43f5e]"
          title="Filtered: Low Liquidity (<$8k)"
        />
        <div
          className="absolute bottom-16 right-14 w-2 h-2 bg-amber-400/90 rounded-full animate-radar-blip shadow-[0_0_8px_#fbbf24]"
          style={{ animationDelay: '0.8s' }}
          title="Filtered: Honeypot / Mint not revoked"
        />
        <div
          className="absolute top-24 right-12 w-1.5 h-1.5 bg-rose-500/80 rounded-full animate-radar-blip shadow-[0_0_8px_#f43f5e]"
          style={{ animationDelay: '1.6s' }}
          title="Filtered: Top10 Holders > 25%"
        />
      </div>

      {/* ─── Typography & Status ─── */}
      <div className="max-w-md px-4 space-y-2 font-mono">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-bold tracking-wider uppercase shadow-[0_0_10px_rgba(16,185,129,0.15)]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
          RADAR SCANNER ONLINE
        </div>

        <h3 className="text-base sm:text-lg font-black text-white tracking-wide">
          Menunggu anomali Smart Money...
        </h3>

        <p className="text-xs sm:text-sm text-white/50 leading-relaxed">
          Filter ketat memblokir 99% koin sampah.
        </p>

        <p className="text-[11px] text-zinc-500 pt-1 leading-normal">
          Bot memindai setiap pool baru Solana secara real-time. Hanya token yang lolos 5/5 AI Consensus (Honeypot Shield, LP Terbakar &amp; Momentum) yang akan diterbitkan.
        </p>
      </div>
    </div>
  );
}

export function SignalFeed({ signals, isScanning = false }: SignalFeedProps) {
  const { dismissSignal } = useTradingAgent();
  const [tierFilter, setTierFilter] = useState<FilterTier>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ACTIVE');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return signals
      .filter((s) => {
        // Tier filter
        if (tierFilter !== 'ALL' && s.signalTier !== tierFilter) return false;

        // Status filter: ACTIVE includes in-flight runners (TP1_HIT, TP2_HIT)
        const isStillActive = ['ACTIVE', 'TP1_HIT', 'TP2_HIT'].includes(s.status);
        if (statusFilter === 'ACTIVE' && !isStillActive) return false;
        if (statusFilter === 'RESOLVED' && isStillActive) return false;

        // Search filter
        if (search.trim()) {
          const q = search.toLowerCase();
          return (
            s.token.symbol.toLowerCase().includes(q) ||
            s.token.name.toLowerCase().includes(q) ||
            s.token.mint.toLowerCase().includes(q)
          );
        }
        return true;
      })
      // Sort: ACTIVE first (by confidence desc), then RESOLVED by time desc
      .sort((a, b) => {
        const aActive = ['ACTIVE', 'TP1_HIT', 'TP2_HIT'].includes(a.status);
        const bActive = ['ACTIVE', 'TP1_HIT', 'TP2_HIT'].includes(b.status);
        if (aActive && !bActive) return -1;
        if (!aActive && bActive) return 1;
        if (aActive && bActive) {
          return b.confidenceScore - a.confidenceScore;
        }
        return b.timestamp - a.timestamp;
      });
  }, [signals, tierFilter, statusFilter, search]);

  const activeCount = signals.filter((s) => ['ACTIVE', 'TP1_HIT', 'TP2_HIT'].includes(s.status)).length;

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* ─── SCANNER STATUS HEARTBEAT BANNER ─── */}
      <ScannerStatus variant="banner" />

      {/* ─── CONTROLS ─── */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Tier filter pills */}
        <div className="flex gap-1 flex-wrap">
          {TIER_FILTERS.map(({ key, label, emoji }) => (
            <button
              key={key}
              onClick={() => setTierFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 border ${
                tierFilter === key
                  ? 'bg-white/10 border-white/20 text-white'
                  : 'bg-transparent border-white/5 text-white/40 hover:text-white/60 hover:border-white/10'
              }`}
            >
              {emoji} {label}
            </button>
          ))}
        </div>

        {/* Status toggle */}
        <div className="flex gap-1 sm:ml-auto">
          {(['ACTIVE', 'RESOLVED', 'ALL'] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 border ${
                statusFilter === s
                  ? 'bg-white/10 border-white/20 text-white'
                  : 'bg-transparent border-white/5 text-white/40 hover:text-white/60'
              }`}
            >
              {s === 'ACTIVE' ? `🟢 Active (${activeCount})` : s === 'RESOLVED' ? '📚 History' : '📡 All'}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Cari token / CA..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-white/[0.03] border border-white/5 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/20 focus:outline-none focus:border-white/20 min-w-[160px]"
        />
      </div>

      {/* ─── FEED / RADAR EMPTY STATE ─── */}
      {filtered.length === 0 ? (
        <RadarEmptyState />
      ) : (
        <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 auto-rows-min">
          {filtered.map((signal) => (
            <div
              key={signal.id}
              className="animate-fade-in"
              style={{ animationFillMode: 'both' }}
            >
              <SignalCard signal={signal} compact={true} onDismiss={dismissSignal} />
            </div>
          ))}
        </div>
      )}

      {/* ─── RESULTS COUNT ─── */}
      {filtered.length > 0 && (
        <div className="text-xs text-white/20 text-center">
          Menampilkan {filtered.length} dari {signals.length} sinyal
        </div>
      )}
    </div>
  );
}

export default SignalFeed;
