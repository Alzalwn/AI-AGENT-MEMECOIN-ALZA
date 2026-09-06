'use client';

import React from 'react';
import { useTradingAgent } from '../../hooks/useTradingAgent';
import { Activity, AlertTriangle } from 'lucide-react';
import Badge from '../ui/Badge';
import { DeskFeedSkeletonItem } from '../ui/Skeleton';

export const DeskFeed: React.FC = () => {
  const {
    consensusFeed,
    selectedResult,
    selectResult,
    dataSource,
    networkMetrics
  } = useTradingAgent();

  return (
    <section className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-4 flex flex-col gap-3 font-mono shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <Activity className="w-4 h-4" />
          </div>
          <span className="font-black text-xs tracking-wider text-zinc-100 uppercase">
            Desk Feed ({dataSource === 'REAL_SOLANA' ? 'Live Pump.fun & Raydium' : 'Simulator'})
          </span>
        </div>
        <span className="text-[10px] text-zinc-500">SLOT: #{networkMetrics.currentSlot}</span>
      </div>

      {/* Feed List */}
      <div className="flex-1 overflow-y-auto space-y-2 max-h-[640px] pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
        {consensusFeed.length > 0 ? (
          consensusFeed.map((item) => {
            const isSelected = selectedResult?.token.id === item.token.id;
            const isApproved = item.verdict === 'APPROVED';

            return (
              <div
                key={item.token.id}
                onClick={() => selectResult(item)}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-zinc-900 border-emerald-500/80 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                    : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/80'
                }`}
              >
                {/* Top Token Info */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    {item.token.iconUrl ? (
                      <img
                        src={item.token.iconUrl}
                        alt={item.token.symbol}
                        className="w-6 h-6 rounded-lg object-cover border border-zinc-700"
                      />
                    ) : (
                      <span className="w-6 h-6 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-black text-zinc-200">
                        {item.token.symbol.slice(1, 3)}
                      </span>
                    )}
                    <span className="font-black text-sm text-zinc-100">
                      {item.token.symbol}
                    </span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                      {item.token.platform}
                    </span>
                    {item.token.isRealData && (
                      <span className="text-[8px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
                        ON-CHAIN
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-zinc-500">{item.consensusLatencyMs}ms</span>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded font-black tracking-wider ${
                        isApproved
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/50'
                      }`}
                    >
                      {item.verdict}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-zinc-400">
                  <span className="truncate max-w-[140px]">{item.token.name}</span>
                  <span>LP: ${item.token.initialLpUsd.toLocaleString()}</span>
                  <span>Cos-Sim: {item.token.narrativeCosineSim}</span>
                </div>

                {/* Bonding Curve or Top 10 Pill */}
                <div className="mt-2 flex items-center justify-between text-[9px] bg-zinc-950/80 px-2.5 py-1.5 rounded-lg border border-zinc-800/80">
                  <div className="flex items-center gap-1.5">
                    {item.token.platform === 'Pump.fun' &&
                    item.token.bondingCurveProgress !== undefined ? (
                      <>
                        <span className="text-zinc-500">Curve:</span>
                        <span className="text-cyan-400 font-bold font-mono">
                          {item.token.bondingCurveProgress}%
                        </span>
                        <div className="w-14 bg-zinc-900 h-1 rounded-full overflow-hidden border border-zinc-800">
                          <div
                            className="h-full bg-cyan-400"
                            style={{ width: `${item.token.bondingCurveProgress}%` }}
                          />
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-1 text-zinc-400">
                        <span>Top10:</span>
                        <span className="text-zinc-200 font-bold font-mono">
                          {item.token.top10HolderPct}%
                        </span>
                      </div>
                    )}
                  </div>

                  <span
                    className={`px-1.5 py-0.2 rounded font-bold text-[8px] ${
                      item.token.rugcheckScore === 'GOOD'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : item.token.rugcheckScore === 'WARNING'
                        ? 'bg-amber-500/20 text-amber-400'
                        : 'bg-rose-500/20 text-rose-400'
                    }`}
                  >
                    RUGCHECK: {item.token.rugcheckScore || 'GOOD'}
                    {item.token.rugcheckNumericScore !== undefined
                      ? ` (${item.token.rugcheckNumericScore})`
                      : ''}
                  </span>
                </div>

                {!isApproved && item.vetoReason && (
                  <div className="mt-1.5 text-[10px] text-rose-400 bg-rose-500/10 px-2 py-1 rounded-lg border border-rose-500/20 flex items-start gap-1">
                    <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                    <span className="truncate">
                      [{item.vetoAgent?.toUpperCase()}] {item.vetoReason}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="space-y-2">
            <div className="text-[10px] text-zinc-500 font-bold px-1 py-0.5 animate-pulse">
              Menghubungkan ke Solana mempool & mensinkronisasi feed...
            </div>
            <DeskFeedSkeletonItem />
            <DeskFeedSkeletonItem />
            <DeskFeedSkeletonItem />
            <DeskFeedSkeletonItem />
          </div>
        )}
      </div>
    </section>
  );
};

export default DeskFeed;
