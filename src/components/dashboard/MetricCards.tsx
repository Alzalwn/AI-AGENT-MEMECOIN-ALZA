'use client';

import React, { useState } from 'react';
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
  Activity,
  RefreshCw,
  Rocket,
  ChevronDown
} from 'lucide-react';
import CollapsibleCard from '../ui/CollapsibleCard';

export const MetricCards: React.FC = () => {
  const { telemetry, walletState, refreshWalletBalance, consensusFeed, selectedResult } = useTradingAgent();
  const { rate, isLoading: isRateLoading } = useSolRate();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMoonshotDetailsOpen, setIsMoonshotDetailsOpen] = useState(false);

  const handleManualRefresh = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await refreshWalletBalance?.();
    } finally {
      setTimeout(() => setIsRefreshing(false), 800);
    }
  };

  const totalTrades = telemetry.winCount + telemetry.lossCount || 1;
  const winRatePct = +((telemetry.winCount / totalTrades) * 100).toFixed(1);
  const isPnlPositive = telemetry.totalPnlSol >= 0;
  // Use live SOL/USD rate; fall back to last known value (never hardcoded 140)
  const solPriceUsd = rate.solUsd;
  const currentSolBalance = walletState.isConnected
    ? walletState.balanceSol
    : telemetry.currentBalanceSol;
  const balanceUsd = Math.round(currentSolBalance * solPriceUsd);
  const vetoRatePct = +(
    (telemetry.vetoCount / (telemetry.scannedCount || 1)) *
    100
  ).toFixed(1);

  const formattedBalance =
    currentSolBalance < 1 && currentSolBalance > 0
      ? currentSolBalance.toFixed(4)
      : currentSolBalance.toFixed(2);

  return (
    <CollapsibleCard
      title="Trading Performance & Hot Wallet"
      subtitle={`${walletState.mode === 'LIVE_ON_CHAIN' ? 'Mainnet Live' : 'Paper Trading'} • ${telemetry.scannedCount} Tokens Evaluated`}
      badge={`${formattedBalance} SOL (${isPnlPositive ? '+' : ''}${telemetry.totalPnlSol.toFixed(2)})`}
      badgeVariant={isPnlPositive ? 'emerald' : 'rose'}
      icon={<Activity className="w-4 h-4 text-emerald-400" />}
      storageKey="card_kpi_metrics"
      defaultCollapsed={false}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono">
        {/* 1. Hot Wallet Balance */}
        <div
          className={`bg-zinc-950/70 border rounded-xl p-3.5 flex flex-col justify-between shadow-md relative overflow-hidden group transition-all duration-300 ${
            walletState.balanceFlashState === 'up'
              ? 'border-emerald-500/80 shadow-[0_0_20px_rgba(16,185,129,0.35)] bg-emerald-950/20'
              : walletState.balanceFlashState === 'down'
              ? 'border-rose-500/80 shadow-[0_0_20px_rgba(244,63,94,0.35)] bg-rose-950/20'
              : 'border-zinc-800/80 hover:border-zinc-700'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <div className="flex items-center gap-1.5">
              <span className="font-bold tracking-wider text-[11px] uppercase text-zinc-300">
                Hot Wallet Balance
              </span>
              {walletState.isBalanceLive ? (
                <span
                  className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-emerald-500/15 text-emerald-400 border border-emerald-500/40"
                  title="Real-time WebSocket connection.onAccountChange (@solana/web3.js) aktif"
                >
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                  </span>
                  LIVE
                </span>
              ) : (
                <span
                  className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-zinc-800/90 text-zinc-500 border border-zinc-700/50"
                  title="Menunggu WebSocket subscription on-chain"
                >
                  RPC
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleManualRefresh}
                className="p-1 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 border border-zinc-700/60 transition-all cursor-pointer"
                title="Sinkronkan saldo on-chain sekarang (manual fallback)"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-emerald-400' : ''}`} />
              </button>
              <div
                className={`p-1.5 rounded-lg border transition-all duration-300 ${
                  walletState.balanceFlashState === 'up'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60'
                    : walletState.balanceFlashState === 'down'
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/60'
                    : 'bg-zinc-900 text-emerald-400 border-zinc-700/60'
                }`}
              >
                <Wallet className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
          <div className="mt-2.5">
            <div className="flex items-baseline gap-2">
              <span
                className={`text-2xl font-black tracking-tight transition-all duration-300 ${
                  walletState.balanceFlashState === 'up'
                    ? 'text-emerald-300 scale-105 inline-block drop-shadow-[0_0_10px_rgba(16,185,129,0.8)]'
                    : walletState.balanceFlashState === 'down'
                    ? 'text-rose-400 scale-105 inline-block drop-shadow-[0_0_10px_rgba(244,63,94,0.8)]'
                    : 'text-zinc-100'
                }`}
              >
                {formattedBalance}
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
          <div
            className={`absolute bottom-0 left-0 right-0 h-0.5 transition-all duration-500 ${
              walletState.balanceFlashState === 'up'
                ? 'bg-emerald-400 shadow-[0_0_10px_#10b981]'
                : walletState.balanceFlashState === 'down'
                ? 'bg-rose-500 shadow-[0_0_10px_#f43f5e]'
                : 'bg-gradient-to-r from-emerald-500/40 via-emerald-500/20 to-transparent'
            }`}
          />
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

            {/* Moonshot Predictor Indicator connected directly under Risk Defense Filter */}
            {(() => {
              const candidate =
                selectedResult ||
                consensusFeed.find((c) => c.verdict === 'APPROVED') ||
                consensusFeed[0];
              const moonshot = candidate?.moonshot;

              return (
                <div className="mt-2.5 pt-2 border-t border-zinc-800/80">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-zinc-400 font-bold flex items-center gap-1">
                      <Rocket className="w-3 h-3 text-amber-400" />
                      Moonshot Predictor:
                    </span>
                    {moonshot ? (
                      <button
                        type="button"
                        onClick={() => setIsMoonshotDetailsOpen((prev) => !prev)}
                        className={`text-[9px] px-2 py-0.5 rounded font-black border transition-all cursor-pointer flex items-center gap-1 ${
                          moonshot.tier === 'SUPERNOVA'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-[0_0_8px_rgba(245,158,11,0.35)]'
                            : moonshot.tier === 'HIGH_POTENTIAL'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            : moonshot.tier === 'MODERATE'
                            ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                            : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        <span>{candidate.token.symbol}</span>
                        <span className="font-mono">({moonshot.moonshotScore}%)</span>
                        <ChevronDown
                          className={`w-2.5 h-2.5 transition-transform duration-200 ${
                            isMoonshotDetailsOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                    ) : (
                      <span className="text-[9px] text-zinc-500 font-mono">Scanning...</span>
                    )}
                  </div>

                  {/* Collapsible Moonshot Pump Thesis Drawer */}
                  {isMoonshotDetailsOpen && moonshot && (
                    <div className="mt-2 p-2 rounded-lg bg-zinc-900/90 border border-zinc-700/60 text-[10px] space-y-1.5 animate-fadeIn">
                      <div className="flex items-center justify-between font-bold">
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-black ${
                            moonshot.tier === 'SUPERNOVA'
                              ? 'text-amber-300 bg-amber-500/20'
                              : moonshot.tier === 'HIGH_POTENTIAL'
                              ? 'text-emerald-400 bg-emerald-500/20'
                              : moonshot.tier === 'MODERATE'
                              ? 'text-cyan-400 bg-cyan-500/20'
                              : 'text-rose-400 bg-rose-500/20'
                          }`}
                        >
                          {moonshot.tier === 'SUPERNOVA' ? '🚀 1000x SUPERNOVA' : moonshot.tier}
                        </span>
                        <span className="font-mono text-zinc-300">
                          Score: <strong className="text-emerald-400 font-bold">{moonshot.moonshotScore}%</strong>
                        </span>
                      </div>

                      <p className="text-[9px] text-zinc-300 leading-relaxed italic border-l-2 border-amber-400/80 pl-1.5 bg-zinc-950/40 py-1 rounded-r">
                        {moonshot.pumpThesis}
                      </p>

                      <div className="grid grid-cols-2 gap-1 text-[8px] font-mono pt-1 text-zinc-400">
                        <div className="bg-zinc-950/80 p-1 rounded border border-zinc-800">
                          <span>Order Flow: </span>
                          <strong className="text-emerald-400">
                            {moonshot.pillars.orderFlow.txVelocityPerSec} Tx/s ({moonshot.pillars.orderFlow.buySellRatio.toFixed(1)}x)
                          </strong>
                        </div>
                        <div className="bg-zinc-950/80 p-1 rounded border border-zinc-800">
                          <span>Top 10: </span>
                          <strong
                            className={
                              moonshot.pillars.distribution.isBundlingDetected
                                ? 'text-rose-400'
                                : 'text-cyan-400'
                            }
                          >
                            {moonshot.pillars.distribution.top10HolderPct}%{' '}
                            {moonshot.pillars.distribution.isBundlingDetected ? 'BUNDLED' : 'Clean'}
                          </strong>
                        </div>
                        <div className="bg-zinc-950/80 p-1 rounded border border-zinc-800">
                          <span>Smart Money: </span>
                          <strong
                            className={
                              moonshot.pillars.smartMoney.detectedCount > 0
                                ? 'text-amber-400'
                                : 'text-zinc-500'
                            }
                          >
                            {moonshot.pillars.smartMoney.detectedCount} Wallets Active
                          </strong>
                        </div>
                        <div className="bg-zinc-950/80 p-1 rounded border border-zinc-800">
                          <span>Security Wall: </span>
                          <strong
                            className={
                              moonshot.pillars.security.isAbsoluteSafe
                                ? 'text-emerald-400'
                                : 'text-rose-400'
                            }
                          >
                            {moonshot.pillars.security.isAbsoluteSafe
                              ? 'Mint/Freeze Revoked'
                              : 'BREACH'}
                          </strong>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500/40 via-purple-500/20 to-transparent" />
        </div>
      </div>
    </CollapsibleCard>
  );
};

export default MetricCards;
