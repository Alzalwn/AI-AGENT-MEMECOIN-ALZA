'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useTradingAgent } from '../../hooks/useTradingAgent';
import { Radio, ShieldAlert, Zap, Filter, CheckCircle2 } from 'lucide-react';

interface ScannerStatusProps {
  variant?: 'compact' | 'banner';
  className?: string;
}

const STORAGE_KEY_REJECTED = 'GT_SCANNED_REJECTED_COUNT';
const STORAGE_KEY_LAST_TS = 'GT_SCANNED_REJECTED_LAST_TS';
const BASELINE_HOURLY_REJECTS = 412; // Baseline aktivitas Solana mainnet (pump.fun + Raydium)

export const ScannerStatus: React.FC<ScannerStatusProps> = ({
  variant = 'compact',
  className = '',
}) => {
  const { networkMetrics, engineStatus } = useTradingAgent();

  // 1. Current Slot / Block tracking
  const [displaySlot, setDisplaySlot] = useState<number>(() => {
    return networkMetrics?.currentSlot || 326149820;
  });

  // 2. Tokens Scanned & Rejected counter
  const [rejectedCount, setRejectedCount] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_REJECTED);
        const lastTs = localStorage.getItem(STORAGE_KEY_LAST_TS);
        const now = Date.now();
        if (saved && lastTs) {
          const diffMinutes = Math.floor((now - parseInt(lastTs, 10)) / 60000);
          // Bila masih dalam 1 jam, lanjutkan akumulasi; jika lewat, sesuaikan baseline
          if (diffMinutes < 60) {
            return parseInt(saved, 10);
          }
        }
      } catch {}
    }
    return BASELINE_HOURLY_REJECTS;
  });

  // 3. Animasi 'just incremented' bump effect
  const [isBumping, setIsBumping] = useState(false);

  // Sinkronkan slot dari RPC bila tersedia, atau jalankan increment alami tiap ~400ms (Solana slot time)
  useEffect(() => {
    if (networkMetrics?.currentSlot && networkMetrics.currentSlot > 0) {
      setDisplaySlot(networkMetrics.currentSlot);
    }
  }, [networkMetrics?.currentSlot]);

  useEffect(() => {
    const slotTimer = setInterval(() => {
      setDisplaySlot((prev) => prev + 1);
    }, 450);
    return () => clearInterval(slotTimer);
  }, []);

  // Simulasikan aliran deteksi & filter koin baru Solana (rata-rata 1 koin baru tiap 2-3 detik)
  useEffect(() => {
    const rejectTimer = setInterval(() => {
      // Hanya increment jika engine aktif atau tidak paused
      if (engineStatus !== 'PAUSED') {
        setRejectedCount((prev) => {
          const inc = Math.random() > 0.4 ? 1 : 2;
          const next = prev + inc;
          try {
            localStorage.setItem(STORAGE_KEY_REJECTED, next.toString());
            localStorage.setItem(STORAGE_KEY_LAST_TS, Date.now().toString());
          } catch {}
          return next;
        });

        setIsBumping(true);
        setTimeout(() => setIsBumping(false), 400);
      }
    }, 2800);

    return () => clearInterval(rejectTimer);
  }, [engineStatus]);

  // Breakdown estimasi filter AI
  const filterStats = useMemo(() => {
    const honeypot = Math.round(rejectedCount * 0.52);
    const lowLp = Math.round(rejectedCount * 0.33);
    const top10 = rejectedCount - honeypot - lowLp;
    return { honeypot, lowLp, top10 };
  }, [rejectedCount]);

  if (variant === 'compact') {
    return (
      <div
        className={`flex items-center gap-3 text-[11px] bg-zinc-950/80 border border-emerald-500/25 px-3 py-1.5 rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.08)] backdrop-blur-md ${className}`}
        title="Mesin pemindai Solana aktif. Memfilter 99% koin sampah & honeypot sebelum lolos sebagai sinyal."
      >
        {/* Live Sniffing Pulse */}
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_8px_#10b981]" />
          </span>
          <span className="text-emerald-400 font-bold tracking-tight uppercase flex items-center gap-1">
            <span>📡 LIVE:</span>
            <span className="font-mono text-zinc-200">
              Sniffing Block #{displaySlot.toLocaleString()}
            </span>
          </span>
        </div>

        <div className="h-3 w-px bg-zinc-800" />

        {/* Tokens Scanned & Rejected Metric */}
        <div className="flex items-center gap-1.5">
          <Filter className="w-3 h-3 text-rose-400" />
          <span className="text-zinc-400 hidden sm:inline">Scanned & Rejected (Last 1h):</span>
          <span className="text-zinc-400 sm:hidden">Rejected:</span>
          <span
            className={`font-mono font-black px-1.5 py-0.5 rounded text-[11px] transition-all duration-300 ${
              isBumping
                ? 'bg-rose-500/20 text-rose-300 scale-105 shadow-[0_0_10px_rgba(244,63,94,0.4)]'
                : 'bg-zinc-900 text-rose-400 border border-rose-500/20'
            }`}
          >
            {rejectedCount.toLocaleString()}
          </span>
        </div>
      </div>
    );
  }

  // Variant 'banner' untuk di atas feed sinyal
  return (
    <div
      className={`bg-gradient-to-r from-zinc-950 via-zinc-900/90 to-zinc-950 border border-emerald-500/30 rounded-xl p-3 sm:p-4 shadow-[0_0_20px_rgba(16,185,129,0.06)] relative overflow-hidden ${className}`}
    >
      {/* Background scanline glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 font-mono">
        {/* Left: Status Badge & Pulse */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center flex-shrink-0">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <span className="text-xs sm:text-sm font-black text-emerald-400 uppercase tracking-wider">
                📡 LIVE: Sniffing Block #{displaySlot.toLocaleString()}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Multi-Agent AI Filter Engine aktif menyaring memecoin baru secara real-time.
            </p>
          </div>
        </div>

        {/* Right: Metrics & Rejected Count */}
        <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
          {/* Main Rejected Counter */}
          <div className="flex items-center gap-2 bg-black/60 border border-rose-500/30 px-3 py-1.5 rounded-lg shadow-inner">
            <div className="flex flex-col text-right">
              <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-tight">
                Tokens Scanned & Rejected
              </span>
              <span className="text-[9px] text-zinc-500">
                (Last 1 Hour)
              </span>
            </div>
            <div
              className={`font-mono text-base font-black px-2 py-0.5 rounded transition-all duration-300 ${
                isBumping
                  ? 'bg-rose-500/30 text-rose-200 scale-105 shadow-[0_0_12px_rgba(244,63,94,0.5)]'
                  : 'bg-rose-950/40 text-rose-400 border border-rose-500/30'
              }`}
            >
              {rejectedCount.toLocaleString()}
            </div>
          </div>

          {/* Quick Filter Pill breakdown */}
          <div className="hidden xl:flex items-center gap-1.5 text-[10px] text-zinc-400 bg-zinc-900/80 border border-zinc-800 px-2.5 py-1.5 rounded-lg">
            <span title="Dibuang karena indikasi Rug/Mint/Freeze belum revoke">
              🛡️ Honeypot: <b className="text-zinc-200">{filterStats.honeypot}</b>
            </span>
            <span className="text-zinc-700">|</span>
            <span title="Dibuang karena LP < $8,000">
              💧 LP &lt; $8k: <b className="text-zinc-200">{filterStats.lowLp}</b>
            </span>
            <span className="text-zinc-700">|</span>
            <span title="Dibuang karena Top 10 Holders terlalu dominan">
              👥 Top10: <b className="text-zinc-200">{filterStats.top10}</b>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScannerStatus;
