'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Flame,
  Award,
  Calendar,
  Clock,
  RefreshCw,
  KeyRound,
  Ban,
  CheckCircle2,
} from 'lucide-react';
import { BinanceIncomeRecord } from '@/lib/binanceAuthClient';
import { BINANCE_STORAGE_KEY, SavedBinanceConfig, BinanceConnectModal } from './BinanceConnectModal';

export const DailyPerformanceSummary: React.FC = () => {
  const [incomeRecords, setIncomeRecords] = useState<BinanceIncomeRecord[]>([]);
  const [totalRealizedPnl, setTotalRealizedPnl] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<SavedBinanceConfig | null>(null);
  const [timeRangeHours, setTimeRangeHours] = useState<number>(24);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState<boolean>(false);

  const loadConfig = useCallback(() => {
    try {
      const raw = localStorage.getItem(BINANCE_STORAGE_KEY);
      if (raw) setConfig(JSON.parse(raw));
      else setConfig(null);
    } catch {
      setConfig(null);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const fetchIncome = useCallback(async () => {
    if (!config || !config.apiKey || !config.apiSecret) return;

    setIsLoading(true);
    setError(null);

    try {
      const startTime = Date.now() - timeRangeHours * 60 * 60 * 1000;
      const res = await fetch('/api/futures/binance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_daily_income',
          startTime,
          apiKey: config.apiKey,
          apiSecret: config.apiSecret,
          isTestnet: config.isTestnet,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mengambil riwayat income');
      }

      setIncomeRecords(data.income || []);
      setTotalRealizedPnl(parseFloat(data.totalRealizedPnl || '0'));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Koneksi error');
    } finally {
      setIsLoading(false);
    }
  }, [config, timeRangeHours]);

  useEffect(() => {
    if (config) {
      fetchIncome();
    }
  }, [config, fetchIncome]);

  // Statistics Calculation
  const winTrades = incomeRecords.filter((r) => parseFloat(r.income) > 0);
  const lossTrades = incomeRecords.filter((r) => parseFloat(r.income) < 0);
  const totalTrades = winTrades.length + lossTrades.length;
  const winRate = totalTrades > 0 ? (winTrades.length / totalTrades) * 100 : 0;

  // Check Consecutive Losses (2-Strike Rule)
  // Income records biasanya terurut dari lama ke baru, balik untuk analisa trade terbaru
  const sortedDesc = [...incomeRecords].sort((a, b) => b.time - a.time);
  let consecutiveLosses = 0;
  for (const record of sortedDesc) {
    const pnl = parseFloat(record.income);
    if (pnl < 0) {
      consecutiveLosses++;
    } else if (pnl > 0) {
      break; // stop when hit a winning trade
    }
  }

  const isTwoStrikeTriggered = consecutiveLosses >= 2;

  // Estimate Wallet Drawdown if wallet balance is available
  const balance = config?.walletBalance ? parseFloat(config.walletBalance) : 100;
  const drawdownPct = balance > 0 && totalRealizedPnl < 0 ? Math.abs((totalRealizedPnl / balance) * 100) : 0;
  const isDrawdownCapTriggered = drawdownPct >= 5.0;
  const isGreedCapReached = balance > 0 && totalRealizedPnl > 0 && (totalRealizedPnl / balance) * 100 >= 5.0;

  if (!config) {
    return (
      <div className="bg-[#0b0e14]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-6 text-center font-sans shadow-2xl">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-3 text-amber-400">
          <KeyRound className="w-6 h-6 animate-pulse" />
        </div>
        <h4 className="text-sm font-black font-mono text-zinc-100 uppercase tracking-wider mb-1">
          Koneksikan API Binance untuk Laporan Harian
        </h4>
        <p className="text-xs text-zinc-400 max-w-md mx-auto mb-4">
          Hubungkan akun Binance untuk memonitor riwayat Realized P&amp;L harian, rasio kemenangan (Win Rate), dan mengaktifkan proteksi otomatis 2-Strike Loss.
        </p>
        <button
          onClick={() => setIsConnectModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-mono font-bold text-xs shadow-lg cursor-pointer transition-all active:scale-95"
        >
          Hubungkan Kunci API
        </button>
        <BinanceConnectModal
          isOpen={isConnectModalOpen}
          onClose={() => setIsConnectModalOpen(false)}
          onConnectionSuccess={() => {
            loadConfig();
            setIsConnectModalOpen(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="bg-[#0b0e14]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-5 shadow-2xl font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black font-mono text-zinc-100 uppercase tracking-wider">
              Daily Performance &amp; Drawdown Guard
            </h3>
            <p className="text-[11px] text-zinc-400">
              Evaluasi kinerja harian dan penegakan disiplin Perintah Trader #9 &amp; #10
            </p>
          </div>
        </div>

        {/* Time Range Selector & Refresh */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-zinc-900 border border-zinc-700/80 rounded-xl p-1 text-xs font-mono">
            {[
              { hours: 24, label: '24 Jam' },
              { hours: 72, label: '3 Hari' },
              { hours: 168, label: '7 Hari' },
            ].map(({ hours, label }) => (
              <button
                key={hours}
                onClick={() => setTimeRangeHours(hours)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  timeRangeHours === hours
                    ? 'bg-cyan-500 text-black shadow-md'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={fetchIncome}
            disabled={isLoading}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-700/80 hover:bg-zinc-800 text-zinc-200 transition-colors cursor-pointer"
            title="Muat Ulang"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* CRITICAL SOP GUARDS ALERTS */}
      <div className="my-4 space-y-2.5">
        {/* 2-Strike Alert */}
        {isTwoStrikeTriggered && (
          <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/60 flex items-start gap-3 text-red-200 animate-pulse">
            <Ban className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-mono font-black text-xs uppercase tracking-wider text-red-300 block mb-0.5">
                🛑 PROTOKOL 2-STRIKE LOSS AKTIF! (PERINTAH TRADER #9)
              </span>
              <p className="text-xs text-red-200/90 leading-relaxed">
                Anda telah mengalami <strong>{consecutiveLosses} kekalahan beruntun</strong> baru-baru ini. SOP melarang keras revenge trading! Segera tutup terminal, tinggalkan chart, dan lakukan cooling-down minimal 12 jam.
              </p>
            </div>
          </div>
        )}

        {/* 5% Drawdown Cap Alert */}
        {isDrawdownCapTriggered && (
          <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/60 flex items-start gap-3 text-red-200">
            <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-mono font-black text-xs uppercase tracking-wider text-red-300 block mb-0.5">
                ⚠️ 5% DAILY DRAWDOWN CAP TERCAPAI
              </span>
              <p className="text-xs text-red-200/90 leading-relaxed">
                Total kerugian hari ini mencapai <strong>{drawdownPct.toFixed(1)}% dari modal</strong>. Demi menjaga modal Anda agar tidak rungkad, sistem memerintahkan STOP TRADING sampai sesi besok.
              </p>
            </div>
          </div>
        )}

        {/* Greed Cap Alert */}
        {isGreedCapReached && (
          <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/50 flex items-start gap-3 text-emerald-200">
            <Flame className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-mono font-black text-xs uppercase tracking-wider text-emerald-300 block mb-0.5">
                🏆 TARGET PROFIT HARIAN TERCAPAI (PERINTAH TRADER #10)
              </span>
              <p className="text-xs text-emerald-200/90 leading-relaxed">
                Portofolio harian tumbuh di atas +5%! Jangan serakah atau memaksakan trade tambahan. Amankan sebagian keuntungan ke Dompet Spot atau Rekening Bank.
              </p>
            </div>
          </div>
        )}

        {/* Safe Status */}
        {!isTwoStrikeTriggered && !isDrawdownCapTriggered && (
          <div className="p-3 rounded-xl bg-zinc-900/60 border border-white/5 flex items-center gap-2.5 text-xs font-mono text-zinc-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Status Proteksi Disiplin:</strong> Aman. Tidak ada pelanggaran 2-Strike maupun 5% Drawdown Cap.
            </span>
          </div>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
        {/* Net Realized PnL */}
        <div className={`p-3.5 rounded-xl border ${
          totalRealizedPnl >= 0
            ? 'bg-emerald-950/20 border-emerald-500/30'
            : 'bg-red-950/20 border-red-500/30'
        }`}>
          <span className="text-[10px] font-mono text-zinc-400 block mb-1">REALIZED PnL ({timeRangeHours}H)</span>
          <span className={`text-lg font-mono font-black ${
            totalRealizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400'
          }`}>
            {totalRealizedPnl >= 0 ? '+' : ''}${totalRealizedPnl.toFixed(2)} USD
          </span>
        </div>

        {/* Win Rate */}
        <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/5">
          <span className="text-[10px] font-mono text-zinc-400 block mb-1">WIN RATE</span>
          <span className="text-lg font-mono font-black text-cyan-300">
            {winRate.toFixed(1)}%
          </span>
          <span className="text-[10px] font-mono text-zinc-500 block">
            ({winTrades.length} Menang / {lossTrades.length} Kalah)
          </span>
        </div>

        {/* Total Trades */}
        <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/5">
          <span className="text-[10px] font-mono text-zinc-400 block mb-1">TOTAL EKSEKUSI</span>
          <span className="text-lg font-mono font-black text-zinc-100">
            {totalTrades} Trade
          </span>
          <span className="text-[10px] font-mono text-zinc-500 block">
            {incomeRecords.length} Catatan PnL
          </span>
        </div>

        {/* Current Loss Streak */}
        <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/5">
          <span className="text-[10px] font-mono text-zinc-400 block mb-1">STREAK LOSS TERAKHIR</span>
          <span className={`text-lg font-mono font-black ${
            consecutiveLosses >= 2 ? 'text-red-400 animate-pulse' : 'text-zinc-300'
          }`}>
            {consecutiveLosses} Loss {consecutiveLosses >= 2 ? '⚠️' : '✅'}
          </span>
          <span className="text-[10px] font-mono text-zinc-500 block">
            Max toleransi: 2x
          </span>
        </div>
      </div>

      {/* Trade Income Log */}
      <div className="mt-4">
        <h4 className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider mb-2.5 flex items-center justify-between">
          <span>Riwayat Realized PnL ({incomeRecords.length})</span>
          <span className="text-[10px] text-zinc-500">Binance Official Income Feed</span>
        </h4>

        {incomeRecords.length === 0 ? (
          <div className="py-8 text-center border border-dashed border-white/10 rounded-xl">
            <Clock className="w-6 h-6 text-zinc-600 mx-auto mb-1.5" />
            <p className="text-xs font-mono text-zinc-400">
              Belum ada trade yang ditutup dalam kurun {timeRangeHours} jam terakhir.
            </p>
          </div>
        ) : (
          <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
            {sortedDesc.slice(0, 30).map((record) => {
              const pnl = parseFloat(record.income);
              const isProfit = pnl >= 0;
              return (
                <div
                  key={`${record.tranId}-${record.time}`}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-900/70 border border-white/5 text-xs font-mono"
                >
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      isProfit ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {isProfit ? 'WIN' : 'LOSS'}
                    </span>
                    <span className="font-bold text-white">{record.symbol || 'USDT'}</span>
                    <span className="text-[10px] text-zinc-500">
                      {new Date(record.time).toLocaleTimeString('id-ID')}
                    </span>
                  </div>
                  <span className={`font-bold ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                    {pnl >= 0 ? '+' : ''}${pnl.toFixed(4)} USD
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
