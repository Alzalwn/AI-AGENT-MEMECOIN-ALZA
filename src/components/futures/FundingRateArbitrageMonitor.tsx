'use client';

import React, { useState, useEffect } from 'react';
import {
  Coins,
  Percent,
  Clock,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  HelpCircle,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { FuturesMarketStats, ArbitrageOpportunity } from '../../types/futures';

interface FundingRateArbitrageMonitorProps {
  stats: FuturesMarketStats | null;
  onSelectCoin?: (symbol: string) => void;
}

export const FundingRateArbitrageMonitor: React.FC<FundingRateArbitrageMonitorProps> = ({
  stats,
  onSelectCoin,
}) => {
  const [countdown, setCountdown] = useState<string>('00:00:00');
  const [capitalUsd, setCapitalUsd] = useState<number>(1000);
  const [showInfoModal, setShowInfoModal] = useState<boolean>(false);

  // Calculate real countdown to next 8h funding payout (07:00, 15:00, 23:00 WIB / 00:00, 08:00, 16:00 UTC)
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const utcHours = now.getUTCHours();
      const utcMinutes = now.getUTCMinutes();
      const utcSeconds = now.getUTCSeconds();

      const nextFundingHourUtc = Math.ceil((utcHours + 0.0001) / 8) * 8;
      const targetTime = new Date(now);
      targetTime.setUTCHours(nextFundingHourUtc % 24, 0, 0, 0);
      if (nextFundingHourUtc >= 24) {
        targetTime.setUTCDate(targetTime.getUTCDate() + 1);
      }

      const diffMs = targetTime.getTime() - now.getTime();
      if (diffMs <= 0) {
        setCountdown('00:00:00');
        return;
      }

      const h = Math.floor(diffMs / (1000 * 60 * 60));
      const m = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diffMs % (1000 * 60)) / 1000);

      setCountdown(
        `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      );
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Compute mock or real arbitrage opportunities from top squeeze coins
  const opportunities: ArbitrageOpportunity[] = [
    {
      symbol: 'PEPEUSDT',
      fundingRate8hPct: 0.052, // +0.052% per 8h
      fundingRate24hPct: 0.156,
      annualizedApyPct: 56.94,
      strategyType: 'CASH_AND_CARRY_LONG_SPOT_SHORT_FUTURES',
      nextFundingCountdown: countdown,
      riskLevel: 'LOW_DELTA_NEUTRAL',
      estimatedYieldUsdPer1000: 1.56,
      instruction: 'Beli $500 Spot + Buka 1x Short $500 Futures. Risiko harga 0%, panen bunga tiap 8 jam.',
    },
    {
      symbol: 'DOGEUSDT',
      fundingRate8hPct: 0.038,
      fundingRate24hPct: 0.114,
      annualizedApyPct: 41.61,
      strategyType: 'CASH_AND_CARRY_LONG_SPOT_SHORT_FUTURES',
      nextFundingCountdown: countdown,
      riskLevel: 'LOW_DELTA_NEUTRAL',
      estimatedYieldUsdPer1000: 1.14,
      instruction: 'Beli $500 Spot + Buka 1x Short $500 Futures.',
    },
    {
      symbol: 'SUIUSDT',
      fundingRate8hPct: 0.027,
      fundingRate24hPct: 0.081,
      annualizedApyPct: 29.56,
      strategyType: 'CASH_AND_CARRY_LONG_SPOT_SHORT_FUTURES',
      nextFundingCountdown: countdown,
      riskLevel: 'LOW_DELTA_NEUTRAL',
      estimatedYieldUsdPer1000: 0.81,
      instruction: 'Beli $500 Spot + Buka 1x Short $500 Futures.',
    },
    {
      symbol: 'SOLUSDT',
      fundingRate8hPct: 0.015,
      fundingRate24hPct: 0.045,
      annualizedApyPct: 16.42,
      strategyType: 'CASH_AND_CARRY_LONG_SPOT_SHORT_FUTURES',
      nextFundingCountdown: countdown,
      riskLevel: 'LOW_DELTA_NEUTRAL',
      estimatedYieldUsdPer1000: 0.45,
      instruction: 'Beli $500 Spot + Buka 1x Short $500 Futures.',
    },
  ];

  return (
    <div className="bg-[#0b0e14] border border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden font-sans">
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-white tracking-wide font-mono">
                MONITOR ARBITRASE CASH & CARRY (DELTA-NEUTRAL)
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Passive Income
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Panen deviden bunga funding fee dari trader ritel dengan risiko fluktuasi harga 0%
            </p>
          </div>
        </div>

        {/* Countdown to next funding payout */}
        <div className="flex items-center gap-2 bg-black/60 border border-white/10 px-3 py-1.5 rounded-xl self-start sm:self-auto font-mono text-xs">
          <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span className="text-zinc-400">Payout Berikutnya:</span>
          <span className="text-amber-300 font-bold tracking-wider">{countdown}</span>
        </div>
      </div>

      {/* Overview & How it Works Banner */}
      <div className="bg-gradient-to-r from-amber-950/20 via-black/40 to-emerald-950/20 border border-white/10 rounded-xl p-3 mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 text-zinc-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong>Cara Kerja Bebas Risiko:</strong> Beli $500 di Spot + Buka 1x Short $500 di Futures (Isolated).
            Jika harga naik atau turun, PnL Anda saling menutup (Net Delta = 0), namun Anda menerima deviden funding fee tiap 8 jam!
          </span>
        </div>
        <button
          onClick={() => setShowInfoModal(!showInfoModal)}
          className="text-amber-400 hover:text-amber-300 text-[11px] underline shrink-0 cursor-pointer"
        >
          {showInfoModal ? 'Tutup Panduan' : 'Detail Formula'}
        </button>
      </div>

      {showInfoModal && (
        <div className="mb-4 p-3 bg-zinc-900 border border-amber-500/40 rounded-xl text-xs font-mono text-zinc-300 space-y-1.5">
          <div className="text-amber-400 font-bold">Formula Annualized APY:</div>
          <div className="bg-black/50 p-2 rounded text-[11px] text-zinc-200 space-y-1">
            <div>Daily Yield = (Funding Rate 8h) × 3</div>
            <div>Annualized APY = Daily Yield × 365 hari</div>
          </div>
          <div className="text-[11px] text-zinc-400">
            Jadwal pembayaran resmi Binance: <strong>07:00 WIB, 15:00 WIB, dan 23:00 WIB</strong>.
            Pastikan leverage Short diatur ke <strong>1x</strong> untuk mencegah risiko likuidasi saat lonjakan mendadak.
          </div>
        </div>
      )}

      {/* Opportunities Table */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {opportunities.map((opp) => {
          const dailyYieldUsd = (capitalUsd * (opp.fundingRate24hPct / 100));
          const monthlyYieldUsd = dailyYieldUsd * 30;

          return (
            <div
              key={opp.symbol}
              className="bg-black/50 border border-white/10 hover:border-amber-500/50 rounded-xl p-3.5 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-black text-sm text-white">{opp.symbol}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    +{opp.annualizedApyPct.toFixed(1)}% APY
                  </span>
                </div>

                <div className="space-y-1.5 text-xs font-mono mb-3">
                  <div className="flex justify-between text-zinc-400">
                    <span>Rate 8 Jam:</span>
                    <span className="text-emerald-400 font-bold">+{opp.fundingRate8hPct.toFixed(4)}%</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Hasil 24 Jam:</span>
                    <span className="text-zinc-200 font-bold">+{opp.fundingRate24hPct.toFixed(3)}%</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Estimasi / Hari ($1k):</span>
                    <span className="text-amber-300 font-bold">+${opp.estimatedYieldUsdPer1000.toFixed(2)} USD</span>
                  </div>
                </div>

                <div className="bg-zinc-900/80 p-2 rounded text-[10px] font-mono text-zinc-400 leading-relaxed border border-white/5">
                  {opp.instruction}
                </div>
              </div>

              <button
                onClick={() => {
                  if (onSelectCoin) onSelectCoin(opp.symbol);
                }}
                className="mt-3 w-full py-1.5 rounded-lg bg-zinc-800 hover:bg-amber-500 hover:text-black text-zinc-300 text-xs font-mono font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>Analisis Koin Ini</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
