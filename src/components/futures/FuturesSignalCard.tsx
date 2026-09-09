'use client';

import React, { useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Zap,
  Shield,
  Clock,
  ExternalLink,
  Copy,
  Check,
  BarChart2,
  X,
  Target,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { BinanceFuturesSignal } from '../../types/futures';
import { formatFuturesPrice } from '../../engine/futuresSignalEngine';

interface FuturesSignalCardProps {
  signal: BinanceFuturesSignal;
  onOpenChart: (symbol: string) => void;
  onDismiss?: (id: string) => void;
}

export const FuturesSignalCard: React.FC<FuturesSignalCardProps> = ({
  signal,
  onOpenChart,
  onDismiss,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeLeverageTab, setActiveLeverageTab] = useState<'both' | 'safe' | 'scalp'>('both');

  const isLong = signal.direction === 'LONG';
  const isSupernova = signal.signalTier === 'SUPERNOVA';

  const handleCopySignal = () => {
    const text = `🎯 [BINANCE FUTURES SIGNAL] ${signal.symbol} (${signal.direction})
━━━━━━━━━━━━━━━━━━━━
⚡ Arah: ${isLong ? '🟢 LONG / BUY' : '🔴 SHORT / SELL'}
🏆 Tier: ${signal.signalTier} (Skor AI: ${signal.overallScore}/100)
📈 Strategi: ${signal.strategyLabel}

💵 Entry Zone: ${signal.entryZone.label}
🎯 Target TP1: $${formatFuturesPrice(signal.targets.tp1.price)} (+${signal.targets.tp1.gainPct.toFixed(1)}%)
🎯 Target TP2: $${formatFuturesPrice(signal.targets.tp2.price)} (+${signal.targets.tp2.gainPct.toFixed(1)}%)
🎯 Target TP3: $${formatFuturesPrice(signal.targets.tp3.price)} (+${signal.targets.tp3.gainPct.toFixed(1)}%)
🛑 Stop Loss: ${signal.stopLoss.label}
⚖️ Risk/Reward: ${signal.riskRewardRatio}x

🛡️ Leverage Aman (Swing): ${signal.leverage.safe.range}
⚡ Leverage Scalp (Kilat): ${signal.leverage.scalp.range}
📊 Funding Rate: ${signal.derivativesData.fundingRatePct.toFixed(4)}%

🔗 Eksekusi di Binance: ${signal.binanceUrl}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`rounded-2xl border transition-all duration-300 relative flex flex-col overflow-hidden font-sans ${
        isSupernova
          ? 'bg-gradient-to-b from-yellow-500/[0.07] via-zinc-950 to-zinc-950 border-yellow-500/40 shadow-[0_0_25px_rgba(234,179,8,0.12)]'
          : isLong
          ? 'bg-zinc-950/90 border-emerald-500/25 hover:border-emerald-500/40 shadow-lg'
          : 'bg-zinc-950/90 border-rose-500/25 hover:border-rose-500/40 shadow-lg'
      }`}
    >
      {/* Supernova Top Glow Accent */}
      {isSupernova && (
        <div className="h-1 w-full bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-500 shadow-[0_0_12px_rgba(234,179,8,0.8)]" />
      )}

      {/* Card Header */}
      <div className="p-4 sm:p-5 border-b border-zinc-800/60 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Direction Icon Badge */}
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm border shadow-inner ${
              isLong
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                : 'bg-rose-500/15 border-rose-500/40 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.25)]'
            }`}
          >
            {isLong ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-black text-lg text-white tracking-wide">
                {signal.symbol}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-black tracking-wider flex items-center gap-1 ${
                  isLong
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}
              >
                {isLong ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                {signal.direction}
              </span>

              {isSupernova && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 flex items-center gap-1 shadow-sm">
                  <Flame className="w-3 h-3 text-yellow-400" />
                  SUPERNOVA
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-zinc-400 font-mono">
                {signal.strategyLabel}
              </span>
              <span className="text-zinc-600">•</span>
              <span className="text-[11px] text-zinc-400 font-mono">
                Skor AI: <strong className="text-white">{signal.overallScore}</strong>/100
              </span>
            </div>
          </div>
        </div>

        {/* Right side: Dismiss & Price */}
        <div className="flex flex-col items-end gap-1">
          {onDismiss && (
            <button
              onClick={() => onDismiss(signal.id)}
              className="text-zinc-500 hover:text-zinc-300 p-1 rounded hover:bg-zinc-800 transition-colors"
              title="Tutup sinyal"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="text-right">
            <span className="text-[11px] text-zinc-500 font-mono block">Harga Saat Ini</span>
            <span className="font-mono font-bold text-sm text-white">
              ${formatFuturesPrice(signal.entryZone.current)}
            </span>
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 sm:p-5 flex flex-col gap-4 flex-1">
        {/* Entry Zone & Stop Loss Box */}
        <div className="grid grid-cols-2 gap-2 bg-zinc-900/60 p-3 rounded-xl border border-zinc-800/80 font-mono text-xs">
          <div>
            <span className="text-[11px] text-zinc-400 block mb-0.5">🎯 Zona Entry</span>
            <span className="font-bold text-emerald-400">{signal.entryZone.label}</span>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-zinc-400 block mb-0.5">🛑 Hard Stop Loss</span>
            <span className="font-bold text-rose-400">{signal.stopLoss.label}</span>
          </div>
        </div>

        {/* 3-Tier Take Profit Ladder */}
        <div className="bg-zinc-900/40 p-3 rounded-xl border border-zinc-800/60 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-zinc-400 border-b border-zinc-800/60 pb-1.5 font-mono">
            <span className="flex items-center gap-1.5 font-bold text-zinc-300">
              <Target className="w-3.5 h-3.5 text-emerald-400" />
              Target Take Profit Berjenjang
            </span>
            <span className="text-[11px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              R:R {signal.riskRewardRatio}x
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center font-mono">
            <div className="bg-zinc-900/80 p-2 rounded-lg border border-zinc-800">
              <span className="text-[10px] text-zinc-400 block font-bold">TP1 (+{signal.targets.tp1.gainPct.toFixed(1)}%)</span>
              <span className="font-bold text-xs text-zinc-200 block mt-0.5">
                ${formatFuturesPrice(signal.targets.tp1.price)}
              </span>
              <span className="text-[9px] text-zinc-500 block">{signal.targets.tp1.eta}</span>
            </div>

            <div className="bg-zinc-900/80 p-2 rounded-lg border border-emerald-500/30 bg-emerald-500/[0.04]">
              <span className="text-[10px] text-emerald-400 block font-bold">TP2 (+{signal.targets.tp2.gainPct.toFixed(1)}%)</span>
              <span className="font-bold text-xs text-emerald-300 block mt-0.5">
                ${formatFuturesPrice(signal.targets.tp2.price)}
              </span>
              <span className="text-[9px] text-emerald-500/70 block">{signal.targets.tp2.eta}</span>
            </div>

            <div className="bg-zinc-900/80 p-2 rounded-lg border border-yellow-500/30 bg-yellow-500/[0.04]">
              <span className="text-[10px] text-yellow-400 block font-bold">TP3 (+{signal.targets.tp3.gainPct.toFixed(1)}%)</span>
              <span className="font-bold text-xs text-yellow-300 block mt-0.5">
                ${formatFuturesPrice(signal.targets.tp3.price)}
              </span>
              <span className="text-[9px] text-yellow-500/70 block">{signal.targets.tp3.eta}</span>
            </div>
          </div>
        </div>

        {/* Dual Leverage Profile Section (Rekomendasi Aman & Scalp) */}
        <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-yellow-400" />
              Rekomendasi Leverage (Pilihan Trader)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Safe / Swing Option */}
            <div className="p-2.5 rounded-lg bg-zinc-900/90 border border-cyan-500/20 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-cyan-400 flex items-center gap-1 font-mono">
                  <Shield className="w-3 h-3" />
                  SAFE / SWING
                </span>
                <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono font-black text-xs">
                  {signal.leverage.safe.range}
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 mt-1 leading-tight">
                {signal.leverage.safe.description}
              </p>
            </div>

            {/* Scalp / Kilat Option */}
            <div className="p-2.5 rounded-lg bg-zinc-900/90 border border-yellow-500/20 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-yellow-400 flex items-center gap-1 font-mono">
                  <Flame className="w-3 h-3" />
                  SCALP / KILAT
                </span>
                <span className="px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 font-mono font-black text-xs">
                  {signal.leverage.scalp.range}
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 mt-1 leading-tight">
                {signal.leverage.scalp.description}
              </p>
            </div>
          </div>
        </div>

        {/* Derivatives Telemetry (Funding Rate, OI, 24h Volume) */}
        <div className="grid grid-cols-3 gap-2 bg-zinc-950/80 p-2.5 rounded-xl border border-zinc-800/80 text-[11px] font-mono">
          <div>
            <span className="text-zinc-500 block text-[10px]">Funding Rate</span>
            <span
              className={`font-bold ${
                signal.derivativesData.fundingRatePct < 0
                  ? 'text-emerald-400'
                  : signal.derivativesData.fundingRatePct > 0.04
                  ? 'text-rose-400'
                  : 'text-zinc-300'
              }`}
            >
              {signal.derivativesData.fundingRatePct > 0 ? '+' : ''}
              {signal.derivativesData.fundingRatePct.toFixed(4)}%
            </span>
          </div>

          <div>
            <span className="text-zinc-500 block text-[10px]">Volume 24 Jam</span>
            <span className="font-bold text-zinc-300">
              ${(signal.derivativesData.volume24hUsd / 1e6).toFixed(1)}M
            </span>
          </div>

          <div className="text-right">
            <span className="text-zinc-500 block text-[10px]">Perubahan 24h</span>
            <span
              className={`font-bold ${
                signal.derivativesData.priceChange24hPct >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {signal.derivativesData.priceChange24hPct >= 0 ? '+' : ''}
              {signal.derivativesData.priceChange24hPct.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Rationale Quote */}
        <p className="text-[11px] text-zinc-400 italic bg-zinc-900/30 p-2.5 rounded-lg border-l-2 border-zinc-700">
          &quot;{signal.rationale}&quot;
        </p>
      </div>

      {/* Card Actions Footer */}
      <div className="p-4 bg-zinc-900/60 border-t border-zinc-800/80 flex items-center gap-2">
        <a
          href={signal.binanceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-zinc-950 font-black text-xs transition-all shadow-[0_0_15px_rgba(234,179,8,0.25)] cursor-pointer"
        >
          <span>Eksekusi di Binance</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>

        <button
          onClick={() => onOpenChart(signal.symbol)}
          className="p-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-600 text-zinc-300 hover:text-white transition-all cursor-pointer"
          title="Buka Grafik TradingView"
        >
          <BarChart2 className="w-4 h-4" />
        </button>

        <button
          onClick={handleCopySignal}
          className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
            copied
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
              : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 hover:border-zinc-600 text-zinc-300 hover:text-white'
          }`}
          title="Salin Sinyal untuk Telegram / Komunitas"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
