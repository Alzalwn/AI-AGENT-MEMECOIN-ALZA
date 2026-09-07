'use client';

import React, { useState } from 'react';
import { useTradingAgent } from '../../hooks/useTradingAgent';
import {
  Activity,
  Compass,
  ShieldCheck,
  History,
  TrendingUp,
  Lock,
  Unlock,
  Wallet,
  ExternalLink,
  AlertTriangle,
  Sparkles,
  Layers,
  Copy,
  Check,
  Grid,
  ChevronDown,
  ChevronsUpDown,
  Maximize2,
  Rocket,
  ShieldAlert
} from 'lucide-react';
import { ClosedTrade } from '../../types/terminal';
import StrategyRadar from '../StrategyRadar';
import NarrativeCluster from '../NarrativeCluster';
import KellyRiskEngine from '../KellyRiskEngine';
import TradeHistoryLedger from '../TradeHistoryLedger';
import ScanGrid from './ScanGrid';
import { TerminalCandlestickChart } from './TerminalCandlestickChart';
import CollapsibleCard from '../ui/CollapsibleCard';

interface ConsensusEvaluatorProps {
  onOpenGemini: () => void;
  onOpenJupiterSwap: () => void;
  onShareTrade?: (trade: ClosedTrade) => void;
  onOpenAnalytics?: () => void;
}

export const ConsensusEvaluator: React.FC<ConsensusEvaluatorProps> = ({
  onOpenGemini,
  onOpenJupiterSwap,
  onShareTrade,
  onOpenAnalytics
}) => {
  const [copiedMint, setCopiedMint] = useState<boolean>(false);
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(
    new Set(['scanner', 'narrative', 'risk', 'timing', 'exit'])
  );

  const handleCopyMint = (mint: string) => {
    navigator.clipboard.writeText(mint);
    setCopiedMint(true);
    setTimeout(() => setCopiedMint(false), 2000);
  };

  const toggleAgent = (agentKey: string) => {
    setExpandedAgents((prev) => {
      const next = new Set(prev);
      if (next.has(agentKey)) {
        next.delete(agentKey);
      } else {
        next.add(agentKey);
      }
      return next;
    });
  };

  const toggleAllAgents = () => {
    const allKeys = ['scanner', 'narrative', 'risk', 'timing', 'exit'];
    if (expandedAgents.size === allKeys.length) {
      setExpandedAgents(new Set());
    } else {
      setExpandedAgents(new Set(allKeys));
    }
  };

  const {
    visualMode,
    setVisualMode,
    selectedResult,
    consensusFeed,
    selectResult,
    closedTrades,
    telemetry
  } = useTradingAgent();

  const targetResult = selectedResult || consensusFeed[0] || null;

  const isHoneypotDetected = Boolean(
    targetResult &&
    (targetResult.verdict === 'VETOED' &&
      (targetResult.vetoReason?.includes('HONEYPOT') ||
        targetResult.token.isHoneypotDetected ||
        (targetResult.honeypotCheck && !targetResult.honeypotCheck.isSafeToSell)))
  );

  return (
    <section className="flex flex-col gap-4 font-mono">
      {/* 1. Engine Visualizer (Collapsible & Maximizable) */}
      <CollapsibleCard
        title="Engine Visualizer"
        badge={visualMode.toUpperCase()}
        badgeVariant={
          visualMode === 'radar' || visualMode === 'ledger'
            ? 'emerald'
            : visualMode === 'kelly'
            ? 'amber'
            : visualMode === 'grid'
            ? 'purple'
            : 'cyan'
        }
        icon={<Activity className="w-4 h-4 text-emerald-400" />}
        storageKey="card_engine_visualizer"
        defaultCollapsed={false}
      >
        <div className="space-y-3">
          {/* Visual Mode Tab Switcher */}
          <div className="flex items-center gap-1.5 bg-zinc-950/70 p-1.5 rounded-xl border border-zinc-800/80 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setVisualMode('radar')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                visualMode === 'radar'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-transparent'
              }`}
            >
              <Activity className="w-3.5 h-3.5" /> 4D Manifold
            </button>

            <button
              onClick={() => setVisualMode('cluster')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                visualMode === 'cluster'
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-[0_0_8px_rgba(0,229,255,0.2)]'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-transparent'
              }`}
            >
              <Compass className="w-3.5 h-3.5" /> 2D Cluster
            </button>

            <button
              onClick={() => setVisualMode('kelly')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                visualMode === 'kelly'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50 shadow-[0_0_8px_rgba(245,166,35,0.2)]'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-transparent'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Kelly Risk
            </button>

            <button
              onClick={() => setVisualMode('ledger')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                visualMode === 'ledger'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-transparent'
              }`}
            >
              <History className="w-3.5 h-3.5" /> Ledger ({closedTrades.length})
            </button>

            <button
              onClick={() => setVisualMode('chart')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                visualMode === 'chart'
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-[0_0_8px_rgba(0,229,255,0.2)]'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-transparent'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" /> DEX Chart
            </button>

            <button
              onClick={() => setVisualMode('grid')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                visualMode === 'grid'
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50 shadow-[0_0_8px_rgba(168,85,247,0.2)]'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-transparent'
              }`}
            >
              <Grid className="w-3.5 h-3.5" /> Scan Grid (96)
            </button>
          </div>

          {/* Visual Component Render */}
          <div className="transition-all duration-300">
            {visualMode === 'radar' && <StrategyRadar selectedResult={targetResult} />}
            {visualMode === 'cluster' && (
              <NarrativeCluster
                consensusFeed={consensusFeed}
                selectedResult={targetResult}
                onSelectToken={(res) => selectResult(res)}
                onInspectGemini={() => onOpenGemini()}
              />
            )}
            {visualMode === 'kelly' && (
              <KellyRiskEngine
                telemetry={telemetry}
                selectedResult={targetResult}
              />
            )}
            {visualMode === 'ledger' && (
              <TradeHistoryLedger
                trades={closedTrades}
                onSelectTradeForShare={(trade) => onShareTrade && onShareTrade(trade)}
                onOpenAnalytics={onOpenAnalytics}
              />
            )}
            {visualMode === 'grid' && (
              <ScanGrid onInspectToken={(res) => selectResult(res)} />
            )}
            {visualMode === 'chart' && (
              targetResult ? (
                <TerminalCandlestickChart token={targetResult.token} />
              ) : (
                <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-8 shadow-xl h-[340px] flex items-center justify-center text-zinc-500 text-xs">
                  Pilih token di Desk Feed untuk memuat candlestick chart
                </div>
              )
            )}
          </div>
        </div>
      </CollapsibleCard>

      {/* 2. 5-Agent Consensus Breakdown Card (Collapsible & Maximizable) */}
      {targetResult && (
        <CollapsibleCard
          title={`${targetResult.token.symbol} Consensus Analysis`}
          subtitle={targetResult.token.name}
          badge={isHoneypotDetected ? 'VETOED - HONEYPOT DETECTED' : targetResult.verdict}
          badgeVariant={targetResult.verdict === 'APPROVED' ? 'emerald' : 'rose'}
          icon={<ShieldCheck className="w-4 h-4 text-cyan-400" />}
          storageKey="card_consensus_eval"
          defaultCollapsed={false}
          headerActions={
            <button
              type="button"
              onClick={onOpenJupiterSwap}
              className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-400 font-bold text-[10px] flex items-center gap-1.5 transition-all cursor-pointer"
              title="Buka Jupiter Swap Modal"
            >
              <Layers className="w-3 h-3" />
              <span className="hidden sm:inline">Swap</span>
            </button>
          }
        >
          <div className="space-y-3 pt-1">
            {/* Token Quick Header */}
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-zinc-800/60">
              <div className="flex items-center gap-2.5">
                {targetResult.token.iconUrl ? (
                  <img
                    src={targetResult.token.iconUrl}
                    alt={targetResult.token.symbol}
                    className="w-7 h-7 rounded-lg object-cover border border-zinc-700"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-black text-xs">
                    {targetResult.token.symbol.slice(1, 3)}
                  </div>
                )}
                <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono">
                  <span>
                    {targetResult.token.mint.slice(0, 6)}...{targetResult.token.mint.slice(-4)}
                  </span>
                  <button
                    onClick={() => handleCopyMint(targetResult.token.mint)}
                    className="hover:text-emerald-400 transition-colors cursor-pointer"
                    title="Salin Mint CA"
                  >
                    {copiedMint ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                  <a
                    href={`https://rugcheck.xyz/tokens/${targetResult.token.mint}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-400 hover:underline flex items-center gap-0.5 font-bold"
                  >
                    <span>Rugcheck</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                  <a
                    href={
                      targetResult.token.dexUrl ||
                      (targetResult.token.mint.includes('...')
                        ? `https://dexscreener.com/search?q=${encodeURIComponent(targetResult.token.symbol.replace('$', ''))}`
                        : `https://dexscreener.com/search?q=${encodeURIComponent(targetResult.token.mint)}`)
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:underline flex items-center gap-0.5 font-bold"
                    title="Lihat di DexScreener"
                  >
                    <span>DEX</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-1.5 text-[10px]">
                <span className="text-zinc-500">Consensus:</span>
                <span className="font-bold text-cyan-400 font-mono">
                  {targetResult.consensusLatencyMs}ms
                </span>
              </div>
            </div>

            {/* Honeypot VETO Danger Banner */}
            {isHoneypotDetected && (
              <div className="bg-red-950/80 border-2 border-red-500/80 rounded-xl p-3 shadow-[0_0_20px_rgba(239,68,68,0.35)] space-y-2 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded bg-red-500/20 text-red-400 border border-red-500/50">
                      <ShieldAlert className="w-4 h-4 text-red-400" />
                    </div>
                    <span className="text-xs font-black uppercase tracking-wider text-red-300">
                      ⚠️ VETOED - HONEYPOT DETECTED (DEFENSE SHIELD)
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/30 text-red-200 font-black border border-red-400/50">
                    TRANSAKSI DIBLOKIR
                  </span>
                </div>
                <p className="text-[11px] text-red-200 leading-relaxed font-sans">
                  {targetResult.honeypotCheck?.reason || targetResult.vetoReason || 'Token terdeteksi sebagai Honeypot on-chain (tidak bisa di-swap/dijual kembali). Eksekusi pembelian otomatis & manual dibatalkan.'}
                </p>
                {targetResult.honeypotCheck && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[10px]">
                    <div className="bg-black/40 p-1.5 rounded border border-red-500/30">
                      <span className="text-zinc-400 block">Freeze Authority:</span>
                      <span className={`font-bold ${targetResult.honeypotCheck.checks.freezeAuthority.status === 'PASS' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {targetResult.honeypotCheck.checks.freezeAuthority.status === 'PASS' ? 'REVOKED (PASS)' : 'ACTIVE (VETO)'}
                      </span>
                    </div>
                    <div className="bg-black/40 p-1.5 rounded border border-red-500/30">
                      <span className="text-zinc-400 block">Token-2022 Tax:</span>
                      <span className={`font-bold ${targetResult.honeypotCheck.checks.token2022Extensions.status === 'PASS' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {targetResult.honeypotCheck.checks.token2022Extensions.transferFeePct}% Tax
                      </span>
                    </div>
                    <div className="bg-black/40 p-1.5 rounded border border-red-500/30">
                      <span className="text-zinc-400 block">Sell Simulation:</span>
                      <span className={`font-bold ${targetResult.honeypotCheck.checks.simulation.status === 'PASS' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {targetResult.honeypotCheck.checks.simulation.status}
                      </span>
                    </div>
                    <div className="bg-black/40 p-1.5 rounded border border-red-500/30">
                      <span className="text-zinc-400 block">Deployer:</span>
                      <span className={`font-bold ${targetResult.honeypotCheck.checks.deployer.status === 'CLEAN' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {targetResult.honeypotCheck.checks.deployer.status}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Moonshot Predictor Engine (Pump Potential Matrix) */}
            {targetResult.moonshot && (
              <div className="bg-zinc-950/90 border border-zinc-800/90 rounded-xl p-3 space-y-2.5 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      <Rocket className="w-4 h-4 animate-bounce" />
                    </div>
                    <div>
                      <span className="text-[11px] font-black uppercase tracking-wider text-zinc-100 flex items-center gap-1.5">
                        Moonshot Predictor Engine
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded font-black tracking-normal ${
                            targetResult.moonshot.tier === 'SUPERNOVA'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.4)]'
                              : targetResult.moonshot.tier === 'HIGH_POTENTIAL'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : targetResult.moonshot.tier === 'MODERATE'
                              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {targetResult.moonshot.tier === 'SUPERNOVA' ? '🚀 SUPERNOVA (1000x)' : targetResult.moonshot.tier}
                        </span>
                      </span>
                      <span className="text-[9px] text-zinc-500 block">
                        Multi-Factor On-Chain Momentum & Anti-Rug Algorithmic Classifier
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-zinc-500 block">Pump Probability</span>
                    <span
                      className={`text-xl font-black font-mono tracking-tight ${
                        targetResult.moonshot.moonshotScore >= 80
                          ? 'text-amber-400'
                          : targetResult.moonshot.moonshotScore >= 60
                          ? 'text-emerald-400'
                          : targetResult.moonshot.moonshotScore >= 40
                          ? 'text-cyan-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {targetResult.moonshot.moonshotScore}%
                    </span>
                  </div>
                </div>

                {/* Animated Probability Progress Bar */}
                <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-800 p-0.5">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      targetResult.moonshot.moonshotScore >= 80
                        ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                        : targetResult.moonshot.moonshotScore >= 60
                        ? 'bg-gradient-to-r from-emerald-500 to-cyan-400'
                        : targetResult.moonshot.moonshotScore >= 40
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-500'
                        : 'bg-gradient-to-r from-rose-600 to-rose-400'
                    }`}
                    style={{ width: `${Math.max(4, targetResult.moonshot.moonshotScore)}%` }}
                  />
                </div>

                {/* 4 Quantitative Pillar Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] pt-1">
                  {/* Pillar 1: Order Flow */}
                  <div className="bg-zinc-900/60 p-2 rounded-xl border border-zinc-800/80 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-zinc-400 text-[9px]">
                      <span>1. Order Flow</span>
                      <span className="font-bold text-emerald-400">
                        {targetResult.moonshot.pillars.orderFlow.score}/30
                      </span>
                    </div>
                    <div className="mt-1">
                      <span className="font-bold text-zinc-200 block text-[11px]">
                        {targetResult.moonshot.pillars.orderFlow.txVelocityPerSec} Tx/s
                      </span>
                      <span className="text-[9px] text-zinc-500">
                        Buy/Sell: <strong className="text-emerald-400">{targetResult.moonshot.pillars.orderFlow.buySellRatio.toFixed(1)}x</strong>
                      </span>
                    </div>
                  </div>

                  {/* Pillar 2: Anti-Bundling */}
                  <div className="bg-zinc-900/60 p-2 rounded-xl border border-zinc-800/80 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-zinc-400 text-[9px]">
                      <span>2. Anti-Bundling</span>
                      <span
                        className={`font-bold ${
                          targetResult.moonshot.pillars.distribution.isBundlingDetected
                            ? 'text-rose-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {targetResult.moonshot.pillars.distribution.score}/25
                      </span>
                    </div>
                    <div className="mt-1">
                      <span className="font-bold text-zinc-200 block text-[11px]">
                        Top 10: {targetResult.moonshot.pillars.distribution.top10HolderPct}%
                      </span>
                      <span
                        className={`text-[9px] font-bold ${
                          targetResult.moonshot.pillars.distribution.isBundlingDetected
                            ? 'text-rose-400'
                            : 'text-cyan-400'
                        }`}
                      >
                        {targetResult.moonshot.pillars.distribution.isBundlingDetected
                          ? 'BUNDLING DUMP RISK'
                          : 'Organic Distribution'}
                      </span>
                    </div>
                  </div>

                  {/* Pillar 3: Smart Money */}
                  <div className="bg-zinc-900/60 p-2 rounded-xl border border-zinc-800/80 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-zinc-400 text-[9px]">
                      <span>3. Smart Money</span>
                      <span className="font-bold text-amber-400">
                        {targetResult.moonshot.pillars.smartMoney.score}/25
                      </span>
                    </div>
                    <div className="mt-1">
                      <span className="font-bold text-zinc-200 block text-[11px]">
                        {targetResult.moonshot.pillars.smartMoney.detectedCount} Whales In
                      </span>
                      <span className="text-[9px] text-zinc-500 truncate block">
                        {targetResult.moonshot.pillars.smartMoney.walletLabels[0] || 'Retail Organic'}
                      </span>
                    </div>
                  </div>

                  {/* Pillar 4: Absolute Security */}
                  <div className="bg-zinc-900/60 p-2 rounded-xl border border-zinc-800/80 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-zinc-400 text-[9px]">
                      <span>4. Absolute Safety</span>
                      <span
                        className={`font-bold ${
                          targetResult.moonshot.pillars.security.isAbsoluteSafe
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {targetResult.moonshot.pillars.security.score}/20
                      </span>
                    </div>
                    <div className="mt-1">
                      <span className="font-bold text-zinc-200 block text-[11px]">
                        {targetResult.moonshot.pillars.security.isAbsoluteSafe ? 'CLEAN AUDIT' : 'BREACH'}
                      </span>
                      <span className="text-[9px] text-zinc-500">
                        LP Burn: <strong className="text-emerald-400">{targetResult.moonshot.pillars.security.lpBurntPct}%</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Algorithmic Pump Thesis Statement */}
                <div className="p-2 rounded-lg bg-zinc-900/80 border border-zinc-800 text-[10px] space-y-1">
                  <span className="text-zinc-500 font-bold block text-[9px] uppercase tracking-wider">
                    Quantitative Pump Thesis:
                  </span>
                  <p className="text-zinc-300 leading-relaxed font-mono">
                    {targetResult.moonshot.pumpThesis}
                  </p>
                </div>
              </div>
            )}

            {/* Key Security Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
              <div
                className={`p-2 rounded-xl border flex flex-col items-center justify-center text-center ${
                  targetResult.token.mintAuthorityRevoked
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}
              >
                <span className="text-[9px] text-zinc-500">Mint Auth</span>
                <span className="font-bold flex items-center gap-0.5">
                  {targetResult.token.mintAuthorityRevoked ? (
                    <Lock className="w-2.5 h-2.5" />
                  ) : (
                    <Unlock className="w-2.5 h-2.5" />
                  )}
                  {targetResult.token.mintAuthorityRevoked ? 'REVOKED' : 'ACTIVE'}
                </span>
              </div>

              <div
                className={`p-2 rounded-xl border flex flex-col items-center justify-center text-center ${
                  targetResult.token.freezeAuthorityRevoked
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}
              >
                <span className="text-[9px] text-zinc-500">Freeze Auth</span>
                <span className="font-bold flex items-center gap-0.5">
                  {targetResult.token.freezeAuthorityRevoked ? (
                    <Lock className="w-2.5 h-2.5" />
                  ) : (
                    <Unlock className="w-2.5 h-2.5" />
                  )}
                  {targetResult.token.freezeAuthorityRevoked ? 'REVOKED' : 'ACTIVE'}
                </span>
              </div>

              <div
                className={`p-2 rounded-xl border flex flex-col items-center justify-center text-center ${
                  targetResult.token.burntLiquidityPct >= 90
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                }`}
              >
                <span className="text-[9px] text-zinc-500">LP Burn/Lock</span>
                <span className="font-bold">
                  {targetResult.token.burntLiquidityPct >= 90
                    ? `${targetResult.token.burntLiquidityPct}% BURN`
                    : `${targetResult.token.burntLiquidityPct}% LP`}
                </span>
              </div>

              <div
                className={`p-2 rounded-xl border flex flex-col items-center justify-center text-center ${
                  targetResult.token.top10HolderPct <= 20
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                    : targetResult.token.top10HolderPct <= 35
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}
              >
                <span className="text-[9px] text-zinc-500">Top 10 Holders</span>
                <span className="font-bold">{targetResult.token.top10HolderPct}%</span>
              </div>
            </div>

            {/* Creator / Deployer Linkage Info */}
            {targetResult.token.creatorAddress && (
              <div className="flex items-center justify-between text-[10px] bg-zinc-950/80 px-3 py-1.5 rounded-xl border border-zinc-800">
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <Wallet className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Deployer:</span>
                  <a
                    href={`https://solscan.io/account/${targetResult.token.creatorAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-cyan-400 hover:underline font-bold flex items-center gap-0.5"
                  >
                    <span>
                      {targetResult.token.creatorAddress.slice(0, 4)}...
                      {targetResult.token.creatorAddress.slice(-4)}
                    </span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
                {targetResult.token.creatorBalancePct !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded font-bold font-mono text-[9px] ${
                      targetResult.token.creatorBalancePct > 15
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                        : 'bg-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    Hold: {targetResult.token.creatorBalancePct}%
                  </span>
                )}
              </div>
            )}

            {/* Honeypot Alert if detected */}
            {targetResult.token.isHoneypotDetected && (
              <div className="bg-rose-500/20 border border-rose-500/50 text-rose-400 px-3 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-2 animate-pulse">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>CRITICAL: Honeypot Terdeteksi! Token tidak dapat dijual kembali.</span>
              </div>
            )}

            {/* Rugcheck Detected Risks Chips (if any) */}
            {targetResult.token.rugcheckRisks && targetResult.token.rugcheckRisks.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1.5 border-t border-zinc-800/60">
                <span className="text-[9px] text-zinc-500 font-bold self-center mr-1">Risks:</span>
                {targetResult.token.rugcheckRisks.slice(0, 5).map((risk, idx) => {
                  const isRiskDanger =
                    risk.toLowerCase().includes('danger') ||
                    risk.toLowerCase().includes('honeypot') ||
                    risk.toLowerCase().includes('freeze');
                  const isRiskWarn =
                    risk.toLowerCase().includes('warn') ||
                    risk.toLowerCase().includes('top') ||
                    risk.toLowerCase().includes('holder');
                  return (
                    <span
                      key={idx}
                      title={risk}
                      className={`text-[9px] px-1.5 py-0.5 rounded font-mono truncate max-w-[150px] ${
                        isRiskDanger
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : isRiskWarn
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                      }`}
                    >
                      {risk}
                    </span>
                  );
                })}
              </div>
            )}

            {/* 5-Agent Breakdown Accordion Section */}
            <div className="pt-2 border-t border-zinc-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  5-Agent Consensus Breakdown
                </span>
                <button
                  type="button"
                  onClick={toggleAllAgents}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <ChevronsUpDown className="w-3 h-3" />
                  <span>
                    {expandedAgents.size === 5 ? 'Collapse All' : 'Expand All'}
                  </span>
                </button>
              </div>

              {/* Individual Agent Accordion Cards */}
              <div className="space-y-2">
                {(['scanner', 'narrative', 'risk', 'timing', 'exit'] as const).map((agentKey) => {
                  const verdict = targetResult.verdicts[agentKey];
                  const isPass = verdict.status === 'APPROVE';
                  const isExpanded = expandedAgents.has(agentKey);

                  return (
                    <div
                      key={agentKey}
                      className={`rounded-xl border transition-all duration-200 overflow-hidden ${
                        isPass
                          ? 'bg-zinc-950/60 border-zinc-800/80'
                          : 'bg-rose-500/10 border-rose-500/30'
                      }`}
                    >
                      {/* Accordion Item Header */}
                      <button
                        type="button"
                        onClick={() => toggleAgent(agentKey)}
                        className="w-full p-2.5 flex items-center justify-between text-left hover:bg-zinc-800/30 transition-colors cursor-pointer"
                        aria-expanded={isExpanded}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              isPass ? 'bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]' : 'bg-rose-500'
                            }`}
                          />
                          <span className="font-bold text-zinc-200 uppercase text-[11px]">
                            {verdict.agentName}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[9px] px-2 py-0.5 rounded font-black ${
                              isPass
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-rose-500/20 text-rose-400'
                            }`}
                          >
                            {verdict.status}
                          </span>
                          <ChevronDown
                            className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                          />
                        </div>
                      </button>

                      {/* Accordion Item Content Drawer */}
                      {isExpanded && (
                        <div className="px-3 pb-3 pt-1 border-t border-zinc-800/50 space-y-2 text-xs">
                          <p className="text-[10px] text-zinc-400 leading-relaxed">
                            {verdict.reason}
                          </p>

                          <div className="flex items-center justify-between text-[9px] text-zinc-500 pt-1.5 border-t border-zinc-800/60">
                            <span>
                              Metric: <strong className="text-zinc-200">{verdict.metricValue}</strong>
                            </span>
                            <span>
                              Target: <strong className="text-zinc-200">{verdict.threshold}</strong>
                            </span>
                            <span className="text-zinc-400 font-mono">{verdict.latencyMs}ms</span>
                          </div>

                          {agentKey === 'narrative' && (
                            <div className="pt-1 flex justify-end">
                              <button
                                type="button"
                                onClick={onOpenGemini}
                                className="px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-400 text-[10px] flex items-center gap-1 font-bold transition-all cursor-pointer"
                              >
                                <Sparkles className="w-3 h-3" />
                                Deep Dive Gemini AI
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CollapsibleCard>
      )}
    </section>
  );
};

export default ConsensusEvaluator;
