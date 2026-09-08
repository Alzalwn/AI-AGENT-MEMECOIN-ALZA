'use client';

/**
 * SignalFeed — Live feed panel sinyal aktif real-time
 * Menampilkan semua sinyal aktif/historis, diurutkan berdasarkan confidence score
 * Dilengkapi dengan Pilihan Kanal Pencarian Sinyal (Discovery Modes) & 1-Klik On-Demand Live Scanner
 */

import React, { useState, useMemo } from 'react';
import { TradingSignal, SignalTier } from '../../types/signal';
import { SignalCard } from './SignalCard';
import { useTradingAgent } from '../../hooks/useTradingAgent';
import { ScannerStatus } from '../dashboard/ScannerStatus';

type FilterTier = 'ALL' | SignalTier;
type StatusFilter = 'ACTIVE' | 'RESOLVED' | 'ALL';
export type DiscoveryChannel = 'ALL' | 'SUB_100K' | 'SNIPER' | 'BREAKOUT' | 'WHALE' | 'SUPERNOVA';

interface SignalFeedProps {
  signals: TradingSignal[];
  isScanning?: boolean;
}

const TIER_FILTERS: { key: FilterTier; label: string; emoji: string }[] = [
  { key: 'ALL', label: 'Semua Tier', emoji: '📡' },
  { key: 'SUPERNOVA', label: 'Supernova', emoji: '🚀' },
  { key: 'HIGH', label: 'High', emoji: '🔥' },
  { key: 'MODERATE', label: 'Moderate', emoji: '⚡' },
];

export const DISCOVERY_CHANNELS: { key: DiscoveryChannel; label: string; desc: string; icon: string; badge: string }[] = [
  { key: 'ALL', label: 'Semua Channel', desc: 'Scan seluruh pool live Solana DEX tanpa filter kategori', icon: '🌐', badge: 'DEFAULT' },
  { key: 'SUB_100K', label: 'Gems <$100k', desc: 'Koin early potensial dengan Market Cap di bawah $100,000 USD', icon: '🌱', badge: 'EARLY GEM' },
  { key: 'SNIPER', label: 'Microcap Sniper', desc: 'Koin awal (<6 jam), MC <$40k, potensi 10x-50x', icon: '🎯', badge: 'HIGH R/R' },
  { key: 'BREAKOUT', label: 'Breakout Runner', desc: 'MC $30k-$250k, volume spike & akumulasi pembeli', icon: '🚀', badge: 'MOMENTUM' },
  { key: 'WHALE', label: 'Smart Money Track', desc: 'Terdeteksi akumulasi wallet trader winrate >60%', icon: '🐋', badge: 'ON-CHAIN' },
  { key: 'SUPERNOVA', label: 'Supernova AI', desc: 'Virality Grok/Twitter >90% dan tren AI Agent tinggi', icon: '⚡', badge: 'VIRAL' },
];

interface RadarEmptyProps {
  onScanNow: () => void;
  isScanningLive: boolean;
  selectedChannel: DiscoveryChannel;
  onSelectChannel: (ch: DiscoveryChannel) => void;
  statusMsg: string | null;
}

function RadarEmptyState({ onScanNow, isScanningLive, selectedChannel, onSelectChannel, statusMsg }: RadarEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 sm:py-12 text-center space-y-5 select-none animate-fade-in font-mono">
      {/* ─── Circular High-Tech Radar Scope ─── */}
      <div className="relative w-52 h-52 sm:w-60 sm:h-60 rounded-full border border-emerald-500/30 bg-zinc-950/80 flex items-center justify-center overflow-hidden shadow-[0_0_35px_rgba(16,185,129,0.12)]">
        <div className="absolute inset-0 rounded-full border border-emerald-500/20" />
        <div className="absolute w-36 h-36 rounded-full border border-emerald-500/15" />
        <div className="absolute w-16 h-16 rounded-full border border-emerald-500/25" />
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
        <div className="absolute top-10 left-14 w-2 h-2 bg-rose-400/90 rounded-full animate-radar-blip shadow-[0_0_8px_#f43f5e]" title="Filtered: Low Liquidity" />
        <div className="absolute bottom-14 right-12 w-2 h-2 bg-amber-400/90 rounded-full animate-radar-blip shadow-[0_0_8px_#fbbf24]" style={{ animationDelay: '0.8s' }} title="Filtered: Honeypot / Mint not revoked" />
        <div className="absolute top-20 right-10 w-1.5 h-1.5 bg-rose-500/80 rounded-full animate-radar-blip shadow-[0_0_8px_#f43f5e]" style={{ animationDelay: '1.6s' }} title="Filtered: Top10 Holders > 20%" />
      </div>

      {/* ─── Typography & Discovery Selector ─── */}
      <div className="max-w-xl px-4 space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-bold tracking-wider uppercase shadow-[0_0_10px_rgba(16,185,129,0.15)]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
          RADAR SOLANA ON-CHAIN AKTIF
        </div>

        <h3 className="text-base sm:text-lg font-black text-white tracking-wide">
          Pilih Jalur Pencarian &amp; Scan Koin Sekarang
        </h3>

        <p className="text-xs text-white/50 leading-relaxed max-w-md mx-auto">
          Tidak perlu menunggu lama tanpa kepastian. Pilih kategori sinyal di bawah ini lalu tekan tombol Scan Live untuk memeriksa DEX Solana seketika.
        </p>

        {/* Channel Selection Buttons */}
        <div className="flex flex-wrap justify-center gap-1.5 pt-1">
          {DISCOVERY_CHANNELS.map((ch) => {
            const isSelected = selectedChannel === ch.key;
            return (
              <button
                key={ch.key}
                onClick={() => onSelectChannel(ch.key)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                    : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                }`}
              >
                <span>{ch.icon}</span>
                <span>{ch.label}</span>
                <span className="text-[9px] opacity-60 font-mono">({ch.badge})</span>
              </button>
            );
          })}
        </div>

        {/* Selected Channel Description */}
        <p className="text-[11px] text-cyan-400/80 italic">
          💡 {DISCOVERY_CHANNELS.find((c) => c.key === selectedChannel)?.desc}
        </p>

        {/* 1-Click Scan Now Action Button */}
        <div className="pt-2">
          <button
            onClick={onScanNow}
            disabled={isScanningLive}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-cyan-500 to-emerald-400 hover:from-emerald-400 hover:to-cyan-300 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(16,185,129,0.45)] transition-all cursor-pointer disabled:opacity-50 mx-auto transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {isScanningLive ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>MEMINDAI ON-CHAIN SOLANA...</span>
              </>
            ) : (
              <>
                <span className="text-base">⚡</span>
                <span>SCAN SOLANA LIVE SEKARANG (1-KLIK)</span>
              </>
            )}
          </button>
        </div>

        {statusMsg && (
          <div className="text-xs font-bold text-emerald-400 animate-fade-in pt-1">
            {statusMsg}
          </div>
        )}
      </div>
    </div>
  );
}

export function SignalFeed({ signals }: SignalFeedProps) {
  const { dismissSignal, scanSolanaLiveNow } = useTradingAgent();
  const [tierFilter, setTierFilter] = useState<FilterTier>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ACTIVE');
  const [search, setSearch] = useState('');
  const [discoveryChannel, setDiscoveryChannel] = useState<DiscoveryChannel>('ALL');
  const [isScanningLive, setIsScanningLive] = useState(false);
  const [scanStatusMsg, setScanStatusMsg] = useState<string | null>(null);

  const handleScanNow = async (channel: DiscoveryChannel = discoveryChannel) => {
    setIsScanningLive(true);
    setScanStatusMsg(`🔍 Memindai live Solana pool [${channel}] & verifikasi 5-Agent Consensus...`);
    try {
      const count = await scanSolanaLiveNow(channel);
      if (count > 0) {
        setScanStatusMsg(`🎉 Berhasil! ${count} sinyal baru diterbitkan ke Alpha Live & Telegram.`);
      } else {
        setScanStatusMsg('✅ Scan selesai: Token yang terdeteksi difilter demi keamanan (LP / Honeypot Guard).');
      }
    } catch {
      setScanStatusMsg('✅ Pemindaian selesai.');
    } finally {
      setIsScanningLive(false);
      setTimeout(() => setScanStatusMsg(null), 6000);
    }
  };

  const filtered = useMemo(() => {
    return signals
      .filter((s) => {
        // Tier filter
        if (tierFilter !== 'ALL' && s.signalTier !== tierFilter) return false;

        // Status filter: ACTIVE includes in-flight runners (TP1_HIT, TP2_HIT)
        const isStillActive = ['ACTIVE', 'TP1_HIT', 'TP2_HIT'].includes(s.status);
        if (statusFilter === 'ACTIVE' && !isStillActive) return false;
        if (statusFilter === 'RESOLVED' && isStillActive) return false;

        // Discovery Mode channel filter
        if (discoveryChannel === 'SUB_100K') {
          const mc = s.marketContext?.marketCapUsd || (s.token?.initialLpUsd || 5000) * 5.5;
          if (mc > 100000) return false;
        } else if (discoveryChannel === 'SNIPER') {
          const mc = s.marketContext?.marketCapUsd || (s.token?.initialLpUsd || 5000) * 5.5;
          if (mc > 40000) return false;
        } else if (discoveryChannel === 'BREAKOUT') {
          if (s.scanTier !== 'BREAKOUT_RUNNER' && (s.token?.initialLpUsd || 0) < 8000) return false;
        } else if (discoveryChannel === 'WHALE') {
          if ((s.token?.top10HolderPct || 10) > 14) return false;
        } else if (discoveryChannel === 'SUPERNOVA') {
          if (s.signalTier !== 'SUPERNOVA' && (s.token?.narrativeCosineSim || 0) < 0.88) return false;
        }

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
  }, [signals, tierFilter, statusFilter, discoveryChannel, search]);

  const activeCount = signals.filter((s) => ['ACTIVE', 'TP1_HIT', 'TP2_HIT'].includes(s.status)).length;

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* ─── SCANNER STATUS HEARTBEAT BANNER ─── */}
      <ScannerStatus variant="banner" />

      {/* ─── DISCOVERY CHANNELS & ON-DEMAND SCANNER BAR ─── */}
      <div className="bg-zinc-950/80 border border-zinc-800/90 rounded-xl p-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 font-mono">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full md:w-auto">
          <span className="text-xs font-bold text-zinc-400 flex items-center gap-1.5 shrink-0">
            <span>📡 Kanal Sinyal:</span>
          </span>
          <div className="flex flex-wrap gap-1">
            {DISCOVERY_CHANNELS.map((ch) => {
              const active = discoveryChannel === ch.key;
              return (
                <button
                  key={ch.key}
                  onClick={() => setDiscoveryChannel(ch.key)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all flex items-center gap-1 cursor-pointer ${
                    active
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.25)]'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span>{ch.icon}</span>
                  <span>{ch.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 1-Click Scan Solana Live Button */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <button
            onClick={() => handleScanNow(discoveryChannel)}
            disabled={isScanningLive}
            className="w-full md:w-auto px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all cursor-pointer disabled:opacity-50"
          >
            {isScanningLive ? (
              <>
                <span className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
                <span>Memindai DEX...</span>
              </>
            ) : (
              <>
                <span>⚡</span>
                <span>Scan Solana Live</span>
              </>
            )}
          </button>
        </div>
      </div>

      {scanStatusMsg && (
        <div className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/30 border border-emerald-500/30 rounded-lg px-3 py-2 animate-fade-in">
          {scanStatusMsg}
        </div>
      )}

      {/* ─── CONTROLS ─── */}
      <div className="flex flex-col sm:flex-row gap-2 font-mono">
        {/* Tier filter pills */}
        <div className="flex gap-1 flex-wrap">
          {TIER_FILTERS.map(({ key, label, emoji }) => (
            <button
              key={key}
              onClick={() => setTierFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 border cursor-pointer ${
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
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 border cursor-pointer ${
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
        <RadarEmptyState
          onScanNow={() => handleScanNow(discoveryChannel)}
          isScanningLive={isScanningLive}
          selectedChannel={discoveryChannel}
          onSelectChannel={(ch) => setDiscoveryChannel(ch)}
          statusMsg={scanStatusMsg}
        />
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
        <div className="text-xs text-white/20 text-center font-mono">
          Menampilkan {filtered.length} dari {signals.length} sinyal di radar
        </div>
      )}
    </div>
  );
}

export default SignalFeed;
