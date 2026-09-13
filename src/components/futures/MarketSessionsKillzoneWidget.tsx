'use client';

import React, { useState, useEffect } from 'react';
import {
  Globe,
  Clock,
  Zap,
  ShieldAlert,
  Compass,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { MarketSessionInfo } from '../../types/futures';

export const MarketSessionsKillzoneWidget: React.FC = () => {
  const [currentWibTime, setCurrentWibTime] = useState<string>('--:--:-- WIB');
  const [activeHourWib, setActiveHourWib] = useState<number>(new Date().getHours());

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      // Calculate WIB (UTC+7)
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const wibDate = new Date(utc + 3600000 * 7);

      const h = wibDate.getHours();
      const m = wibDate.getMinutes();
      const s = wibDate.getSeconds();

      setActiveHourWib(h);
      setCurrentWibTime(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} WIB`
      );
    };

    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // Determine session status based on WIB hour
  const getSessions = (hour: number): MarketSessionInfo[] => {
    // 1. Asia: 07:00 - 14:00 WIB
    const isAsia = hour >= 7 && hour < 14;
    // 2. London: 14:00 - 21:00 WIB
    const isLondon = hour >= 14 && hour < 21;
    // 3. New York: 19:00 - 03:00 WIB
    const isNY = hour >= 19 || hour < 3;
    // 4. Overlap Killzone: 19:00 - 22:00 WIB
    const isOverlap = hour >= 19 && hour < 22;

    return [
      {
        sessionName: 'LONDON_NY_OVERLAP',
        displayName: '⚡ LONDON & NY OVERLAP (KILLZONE)',
        timeRangeWib: '19:00 – 22:00 WIB',
        volatilityLevel: 'EXTREME_KILLZONE',
        status: isOverlap ? 'ACTIVE' : hour < 19 && hour >= 14 ? 'UPCOMING' : 'CLOSED',
        description:
          'Jendela paling likuid dan volatil di dunia. Pertemuan bank Eropa dan Wall Street. Waktu terbaik mengeksekusi sinyal tren.',
        recommendedBias: 'Momentum Breakout & Trend Following memiliki win-rate tertinggi di jam ini.',
      },
      {
        sessionName: 'NEW_YORK',
        displayName: '🗽 SESI NEW YORK (WALL STREET)',
        timeRangeWib: '19:00 – 03:00 WIB',
        volatilityLevel: 'HIGH',
        status: isNY ? 'ACTIVE' : hour >= 14 ? 'UPCOMING' : 'CLOSED',
        description:
          'Ekspansi tren institusional dan pengumuman data makroekonomi AS (CPI, FOMC, NFP).',
        recommendedBias: 'Ikuti arah reaksi pasar setelah rilis berita makro, hindari melawan tren utama.',
      },
      {
        sessionName: 'LONDON',
        displayName: '🏛️ SESI LONDON (EROPA)',
        timeRangeWib: '14:00 – 21:00 WIB',
        volatilityLevel: 'HIGH',
        status: isLondon ? 'ACTIVE' : hour >= 7 ? 'UPCOMING' : 'CLOSED',
        description:
          'Sering terjadi fenomena "Judas Swing": manipulasi penembusan palsu atas High/Low Asia sebelum arah sebenarnya terbentuk.',
        recommendedBias: 'Tunggu sweep likuiditas sesi Asia sebelum membuka posisi pembalikan.',
      },
      {
        sessionName: 'ASIA',
        displayName: '⛩️ SESI ASIA (TOKYO & SYDNEY)',
        timeRangeWib: '07:00 – 14:00 WIB',
        volatilityLevel: 'MEDIUM',
        status: isAsia ? 'ACTIVE' : hour < 7 ? 'UPCOMING' : 'CLOSED',
        description:
          'Fase pembentukan rentang harga awal (Asia Range). Pergerakan cenderung sideway / mean-reverting.',
        recommendedBias: 'Trading batas support/resistance (Range Trading) atau bersiap mencatat level high/low Asia.',
      },
    ];
  };

  const sessions = getSessions(activeHourWib);
  const activeKillzone = sessions.find((s) => s.sessionName === 'LONDON_NY_OVERLAP')?.status === 'ACTIVE';

  return (
    <div className="bg-[#0b0e14] border border-blue-500/30 rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden font-sans">
      {/* Background glow */}
      <div className="absolute top-0 left-1/3 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-400">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-white tracking-wide font-mono">
                RADAR SESI PASAR GLOBAL & ICT KILLZONES
              </h3>
              {activeKillzone ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
                  ⚡ KILLZONE AKTIF
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40">
                  WIB Telemetry
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-400">
              Peta waktu likuiditas perbankan global untuk memaksimalkan akurasi eksekusi sinyal
            </p>
          </div>
        </div>

        {/* Real-time WIB Digital Clock */}
        <div className="flex items-center gap-2 bg-black/60 border border-white/10 px-3 py-1.5 rounded-xl font-mono text-xs self-start sm:self-auto">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-zinc-400">Waktu Indonesia Barat:</span>
          <span className="text-cyan-300 font-bold tracking-widest">{currentWibTime}</span>
        </div>
      </div>

      {/* Grid of Sessions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {sessions.map((ses) => {
          const isActive = ses.status === 'ACTIVE';
          const isUpcoming = ses.status === 'UPCOMING';

          return (
            <div
              key={ses.sessionName}
              className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                isActive
                  ? ses.sessionName === 'LONDON_NY_OVERLAP'
                    ? 'bg-amber-950/20 border-amber-500/60 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                    : 'bg-blue-950/20 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                  : isUpcoming
                  ? 'bg-black/40 border-white/10'
                  : 'bg-black/20 border-white/5 opacity-70'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-2">
                  <span className="text-xs font-mono font-black text-white">{ses.displayName}</span>
                  <span
                    className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      isActive
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse'
                        : isUpcoming
                        ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                        : 'bg-zinc-800 text-zinc-500'
                    }`}
                  >
                    {ses.status}
                  </span>
                </div>

                <div className="text-[11px] font-mono text-cyan-300 font-bold mb-2">
                  ⏰ {ses.timeRangeWib}
                </div>

                <p className="text-[11px] text-zinc-300 leading-relaxed mb-3">
                  {ses.description}
                </p>
              </div>

              <div className="pt-2 border-t border-white/5 text-[10px] font-mono text-zinc-400">
                <span className="text-amber-400 font-bold">Bias AI: </span>
                <span>{ses.recommendedBias}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
