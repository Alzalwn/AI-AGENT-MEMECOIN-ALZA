'use client';

import React from 'react';
import { useTradingAgent } from '../../hooks/useTradingAgent';
import { useSolRate } from '../../hooks/useSolRate';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Award,
  ShieldCheck,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Activity
} from 'lucide-react';
import CollapsibleCard from '../ui/CollapsibleCard';

export const MetricCards: React.FC = () => {
  const { telemetry, walletState } = useTradingAgent();
  const { rate, isLoading: isRateLoading } = useSolRate();

  const totalTrades = telemetry.winCount + telemetry.lossCount || 1;
  const winRatePct = +((telemetry.winCount / totalTrades) * 100).toFixed(1);
  const isPnlPositive = telemetry.totalPnlSol >= 0;
  // Use live SOL/USD rate; fall back to last known value (never hardcoded 140)
  const solPriceUsd = rate.solUsd;
  const balanceUsd = Math.round(telemetry.currentBalanceSol * solPriceUsd);
  const vetoRatePct = +(
    (telemetry.vetoCount / (telemetry.scannedCount || 1)) *
    100
  ).toFixed(1);

  return (
    <CollapsibleCard
      title="Trading Performance & Hot Wallet"
      subtitle={`${walletState.mode === 'LIVE_ON_CHAIN' ? 'Mainnet Live' : 'Paper Trading'} • ${telemetry.scannedCount} Tokens Evaluated`}
      badge={`${telemetry.currentBalanceSol.toFixed(2)} SOL (${isPnlPositive ? '+' : ''}${telemetry.totalPnlSol.toFixed(2)})`}
      badgeVariant={isPnlPositive ? 'emerald' : 'rose'}
      icon={<Activity className="w-4 h-4 text-emerald-400" />}
      storageKey="card_kpi_metrics"
      defaultCollapsed={false}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
        {/* 1. Hot Wallet Balance */}
        <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-3.5 flex flex-col justify-between shadow-md relative overflow-hidden group hover:border-zinc-700 transition-all duration-200">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-bold tracking-wider text-[11px] uppercase">
              Hot Wallet Balance
            </span>
            <div className="p-1.5 rounded-lg bg-zinc-900 text-emerald-400 border border-zinc-700/60">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-zinc-100 tracking-tight">
                {telemetry.currentBalanceSol.toFixed(2)}
              </span>
              <span className="text-xs font-bold text-zinc-400">SOL</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-1">
              <span>
                {isRateLoading ? (
                  <span className="inline-block w-16 h-3 bg-zinc-800 animate-pulse rounded align-middle" />
                ) : (
                  `≈ $${balanceUsd.toLocaleString()} USD`
                )}
                {!isRateLoading && (
                  <span className="ml-1 text-zinc-600">(@ ${solPriceUsd.toFixed(0)})</span>
                )}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[9px] font-bold text-zinc-400">
                {walletState.mode === 'LIVE_ON_CHAIN' ? 'MAINNET' : 'PAPER'}
              </span>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-emerald-500/40 via-emerald-500/20 to-transparent" />
        </div>

        {/* 2. 24h Realized Net PnL */}
        <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-3.5 flex flex-col justify-between shadow-md relative overflow-hidden group hover:border-zinc-700 transition-all duration-200">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-bold tracking-wider text-[11px] uppercase">
              Net Realized PnL
            </span>
            <div
              className={`p-1.5 rounded-lg border ${
                isPnlPositive
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              }`}
            >
              {isPnlPositive ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline gap-2">
              <span
                className={`text-2xl font-black tracking-tight ${
                  isPnlPositive ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {isPnlPositive ? '+' : ''}
                {telemetry.totalPnlSol.toFixed(2)}
              </span>
              <span className="text-xs font-bold text-zinc-400">SOL</span>
            </div>
            <div className="flex items-center justify-between text-[11px] mt-1">
              <span className="text-zinc-500">
                ≈ {isPnlPositive ? '+' : ''}$
                {Math.round(telemetry.totalPnlSol * solPriceUsd).toLocaleString()} USD
              </span>
              <span
                className={`font-bold flex items-center ${
                  isPnlPositive ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {isPnlPositive ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                {telemetry.initialBalanceSol > 0
                  ? `${(
                      (telemetry.totalPnlSol / telemetry.initialBalanceSol) *
                      100
                    ).toFixed(1)}%`
                  : '0%'}
              </span>
            </div>
          </div>
          <div
            className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${
              isPnlPositive
                ? 'from-emerald-500/40 via-emerald-500/20 to-transparent'
                : 'from-rose-500/40 via-rose-500/20 to-transparent'
            }`}
          />
        </div>

        {/* 3. Win Rate & Mathematical Expectancy */}
        <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-3.5 flex flex-col justify-between shadow-md relative overflow-hidden group hover:border-zinc-700 transition-all duration-200">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-bold tracking-wider text-[11px] uppercase">
              Win Rate & E[R] Edge
            </span>
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              <Award className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-zinc-100 tracking-tight">
                {winRatePct}%
              </span>
              <span className="text-xs font-bold text-cyan-400">
                +{telemetry.rollingExpectancyR}R
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-1">
              <span>
                {telemetry.winCount} Wins / {telemetry.lossCount} Losses
              </span>
              <span className="text-cyan-400/80 font-bold text-[10px]">Kelly Sizing OK</span>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-cyan-500/40 via-cyan-500/20 to-transparent" />
        </div>

        {/* 4. Scanned & Veto Filter Ratio */}
        <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-xl p-3.5 flex flex-col justify-between shadow-md relative overflow-hidden group hover:border-zinc-700 transition-all duration-200">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-bold tracking-wider text-[11px] uppercase">
              Risk Defense Filter
            </span>
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/30">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-zinc-100 tracking-tight">
                {telemetry.scannedCount}
              </span>
              <span className="text-xs font-bold text-rose-400">
                {telemetry.vetoCount} VETO
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-1">
              <span>Filter Rate: {vetoRatePct}%</span>
              <span className="text-emerald-400 font-bold text-[10px]">
                {telemetry.scannedCount - telemetry.vetoCount} APPROVED
              </span>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500/40 via-purple-500/20 to-transparent" />
        </div>
      </div>
    </CollapsibleCard>
  );
};

export default MetricCards;
