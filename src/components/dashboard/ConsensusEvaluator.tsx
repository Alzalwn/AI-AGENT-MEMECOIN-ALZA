'use client';

import React from 'react';
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
  Layers
} from 'lucide-react';
import StrategyRadar from '../StrategyRadar';
import NarrativeCluster from '../NarrativeCluster';
import KellyRiskEngine from '../KellyRiskEngine';
import TradeHistoryLedger from '../TradeHistoryLedger';

interface ConsensusEvaluatorProps {
  onOpenGemini: () => void;
  onOpenJupiterSwap: () => void;
}

export const ConsensusEvaluator: React.FC<ConsensusEvaluatorProps> = ({
  onOpenGemini,
  onOpenJupiterSwap
}) => {
  const {
    visualMode,
    setVisualMode,
    selectedResult,
    consensusFeed,
    selectResult,
    closedTrades,
    telemetry,
    activePosition
  } = useTradingAgent();

  const targetResult = selectedResult || consensusFeed[0] || null;

  return (
    <section className="flex flex-col gap-4 font-mono">
      {/* Visual Mode Tab Switcher */}
      <div className="flex items-center gap-1.5 bg-zinc-900/60 backdrop-blur-md p-1.5 rounded-2xl border border-zinc-800/80">
        <button
          onClick={() => setVisualMode('radar')}
          className={`flex-1 py-1.5 px-2 rounded-xl text-[10px] font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            visualMode === 'radar'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-transparent'
          }`}
        >
          <Activity className="w-3.5 h-3.5" /> 4D Manifold
        </button>

        <button
          onClick={() => setVisualMode('cluster')}
          className={`flex-1 py-1.5 px-2 rounded-xl text-[10px] font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            visualMode === 'cluster'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-[0_0_8px_rgba(0,229,255,0.2)]'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-transparent'
          }`}
        >
          <Compass className="w-3.5 h-3.5" /> 2D Cluster
        </button>

        <button
          onClick={() => setVisualMode('kelly')}
          className={`flex-1 py-1.5 px-2 rounded-xl text-[10px] font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            visualMode === 'kelly'
              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50 shadow-[0_0_8px_rgba(245,166,35,0.2)]'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-transparent'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" /> Kelly Risk
        </button>

        <button
          onClick={() => setVisualMode('ledger')}
          className={`flex-1 py-1.5 px-2 rounded-xl text-[10px] font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            visualMode === 'ledger'
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-transparent'
          }`}
        >
          <History className="w-3.5 h-3.5" /> Ledger ({closedTrades.length})
        </button>

        <button
          onClick={() => setVisualMode('chart')}
          className={`flex-1 py-1.5 px-2 rounded-xl text-[10px] font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            visualMode === 'chart'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 shadow-[0_0_8px_rgba(0,229,255,0.2)]'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-transparent'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" /> DEX Chart
        </button>
      </div>

      {/* Visual Component Render */}
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
          onSelectTradeForShare={() => {}}
        />
      )}
      {visualMode === 'chart' && (
        <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-4 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <span className="font-black text-xs text-zinc-100 uppercase tracking-wider">
                Live DEX Screener Candlestick Chart
              </span>
            </div>
            {targetResult && (
              <span className="text-xs text-zinc-400">
                Pair: <strong className="text-emerald-400">{targetResult.token.symbol} / SOL</strong>
              </span>
            )}
          </div>
          {targetResult ? (
            <div className="w-full h-[400px] rounded-xl overflow-hidden border border-zinc-800 relative bg-zinc-950">
              <iframe
                src={`https://dexscreener.com/solana/${targetResult.token.mint}?embed=1&theme=dark&trades=0&info=0`}
                className="w-full h-full border-0"
                title={`Chart ${targetResult.token.symbol}`}
              />
            </div>
          ) : (
            <div className="h-[400px] flex items-center justify-center text-zinc-600 text-xs">
              Pilih token di Desk Feed untuk memuat candlestick chart
            </div>
          )}
        </div>
      )}

      {/* 5-Agent Consensus Breakdown Card */}
      {targetResult && (
        <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-4 shadow-xl space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
            <div className="flex items-center gap-3">
              {targetResult.token.iconUrl ? (
                <img
                  src={targetResult.token.iconUrl}
                  alt={targetResult.token.symbol}
                  className="w-8 h-8 rounded-xl object-cover border border-zinc-700"
                />
              ) : (
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-black text-xs">
                  {targetResult.token.symbol.slice(1, 3)}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm text-zinc-100">
                    {targetResult.token.symbol}
                  </span>
                  <span className="text-xs text-zinc-500 truncate max-w-[120px]">
                    {targetResult.token.name}
                  </span>
                </div>
                <span className="text-[10px] text-zinc-500 font-mono">
                  {targetResult.token.mint.slice(0, 6)}...{targetResult.token.mint.slice(-4)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onOpenJupiterSwap}
                className="px-3 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-400 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Swap Jupiter</span>
              </button>

              <span
                className={`px-3 py-1 rounded-xl text-xs font-black tracking-wider ${
                  targetResult.verdict === 'APPROVED'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/50'
                }`}
              >
                {targetResult.verdict}
              </span>
            </div>
          </div>

          {/* Key Security Grid */}
          <div className="grid grid-cols-4 gap-2 text-[10px]">
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

          {/* 5-Agent Breakdown List */}
          <div className="space-y-2 pt-1">
            {(['scanner', 'narrative', 'risk', 'timing', 'exit'] as const).map((agentKey) => {
              const verdict = targetResult.verdicts[agentKey];
              const isPass = verdict.status === 'APPROVE';

              return (
                <div
                  key={agentKey}
                  className={`p-2.5 rounded-xl border text-xs flex flex-col gap-1 transition-all ${
                    isPass
                      ? 'bg-zinc-950/60 border-zinc-800'
                      : 'bg-rose-500/10 border-rose-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-200 uppercase text-[11px] flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isPass ? 'bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]' : 'bg-rose-500'
                        }`}
                      />
                      {verdict.agentName}
                    </span>
                    <span
                      className={`text-[9px] px-2 py-0.2 rounded font-black ${
                        isPass
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      {verdict.status}
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-relaxed">
                    {verdict.reason}
                  </p>
                  <div className="flex items-center justify-between text-[9px] text-zinc-500 pt-1 border-t border-zinc-800/60">
                    <span>
                      Metric: <strong className="text-zinc-200">{verdict.metricValue}</strong>
                    </span>
                    <span>
                      Target: <strong className="text-zinc-200">{verdict.threshold}</strong>
                    </span>
                    <span>{verdict.latencyMs}ms</span>
                  </div>
                  {agentKey === 'narrative' && (
                    <div className="pt-1 flex justify-end">
                      <button
                        onClick={onOpenGemini}
                        className="px-2 py-0.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-400 text-[10px] flex items-center gap-1 font-bold transition-all cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" />
                        Deep Dive Gemini AI
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};

export default ConsensusEvaluator;
