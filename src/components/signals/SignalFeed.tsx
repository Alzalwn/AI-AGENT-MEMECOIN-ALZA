'use client';

/**
 * SignalFeed — Live feed panel sinyal aktif real-time
 * Menampilkan semua sinyal aktif/historis, diurutkan berdasarkan confidence score
 * Dengan filter tier dan search token
 */

import React, { useState, useMemo } from 'react';
import { TradingSignal, SignalTier } from '../../types/signal';
import { SignalCard } from './SignalCard';

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

function EmptyState({ isScanning }: { isScanning?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
      {isScanning ? (
        <>
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-2 border-emerald-500/30 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full border-2 border-emerald-500/50 flex items-center justify-center animate-ping absolute" />
              <span className="text-2xl relative z-10">📡</span>
            </div>
          </div>
          <div>
            <p className="text-white/60 font-medium">Memindai Token Baru...</p>
            <p className="text-white/30 text-sm mt-1">
              Menunggu sinyal yang memenuhi 5/5 konsensus AI
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-white/20">
            <span className="inline-block w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            Scanner aktif — Risk, Honeypot, Momentum, Moonshot, Grok
          </div>
        </>
      ) : (
        <>
          <span className="text-4xl">🔇</span>
          <p className="text-white/40 text-sm">Belum ada sinyal. Aktifkan scanner untuk mulai.</p>
        </>
      )}
    </div>
  );
}

export function SignalFeed({ signals, isScanning = false }: SignalFeedProps) {
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

      {/* ─── FEED ─── */}
      {filtered.length === 0 ? (
        <EmptyState isScanning={isScanning} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 auto-rows-min">
          {filtered.map((signal) => (
            <div
              key={signal.id}
              className="animate-fade-in"
              style={{ animationFillMode: 'both' }}
            >
              <SignalCard signal={signal} compact={true} />
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
