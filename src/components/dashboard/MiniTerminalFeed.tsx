'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useTradingAgent } from '../../hooks/useTradingAgent';
import {
  Terminal as TerminalIcon,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Flame,
  ArrowDown,
  Trash2,
  Search,
  Zap,
  Activity,
  Droplets,
  TrendingUp,
  Cpu
} from 'lucide-react';
import CollapsibleCard from '../ui/CollapsibleCard';
import Badge from '../ui/Badge';

export const MiniTerminalFeed: React.FC = () => {
  const { logs, clearLogs, consensusFeed } = useTradingAgent();
  const [filterMode, setFilterMode] = useState<'ALL' | 'APPROVED' | 'VETOED'>('ALL');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Filter logs for Decision / Scan / Risk / Execution events
  const decisionLogs = useMemo(() => {
    return logs.filter((log) => {
      const isDecision = log.category === 'DECISION' || log.category === 'SCAN' || log.category === 'RISK' || log.message.includes('DRY-RUN');
      if (!isDecision) return false;

      if (filterMode === 'APPROVED') {
        const isAppr = log.level === 'SUCCESS' || log.message.includes('APPROVED') || log.message.includes('lolos');
        if (!isAppr) return false;
      } else if (filterMode === 'VETOED') {
        const isVeto = log.level === 'WARN' || log.level === 'DANGER' || log.message.includes('VETO') || log.message.includes('ditolak');
        if (!isVeto) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return log.message.toLowerCase().includes(q);
      }

      return true;
    });
  }, [logs, filterMode, searchQuery]);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = 0; // Newest at top
    }
  }, [decisionLogs, autoScroll]);

  // Extract step badges from structured log string if present
  const renderFormattedDecision = (msg: string) => {
    const isDryRun = msg.includes('DRY-RUN');
    const isApproved = msg.includes('APPROVED') || msg.includes('lolos 5/5');
    const isVeto = msg.includes('VETO') || msg.includes('ditolak');

    return (
      <div className="flex flex-col gap-1 w-full">
        <div className="flex items-center gap-1.5 flex-wrap">
          {isDryRun && (
            <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[9px] font-black tracking-wider flex items-center gap-1">
              <span>🧪 DRY-RUN INTERCEPT</span>
            </span>
          )}

          {isApproved && (
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] font-black tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-2.5 h-2.5" />
              <span>PASSED 5/5</span>
            </span>
          )}

          {isVeto && (
            <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[9px] font-black tracking-wider flex items-center gap-1">
              <XCircle className="w-2.5 h-2.5" />
              <span>VETOED</span>
            </span>
          )}

          <span className="text-[11px] text-zinc-200 font-mono flex-1 leading-relaxed break-words">
            {msg}
          </span>
        </div>
      </div>
    );
  };

  return (
    <CollapsibleCard
      title="Decision Engine Terminal Feed"
      subtitle="Verifikasi Langkah Likuiditas, Honeypot, dan Momentum Real-Time"
      badge="⚡ 5-AGENT DECISION STREAM"
      badgeVariant="emerald"
      icon={<Cpu className="w-4 h-4 text-emerald-400" />}
      storageKey="card_mini_terminal_feed"
      defaultCollapsed={false}
      headerActions={
        <div className="flex items-center gap-1.5 font-mono">

          <button
            type="button"
            onClick={() => setAutoScroll((v) => !v)}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
              autoScroll
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400'
            }`}
            title="Toggle Auto Scroll"
          >
            <ArrowDown className="w-3 h-3" />
            <span className="hidden sm:inline">Auto</span>
          </button>

          <button
            type="button"
            onClick={clearLogs}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
            title="Bersihkan Log Terminal"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      }
    >
      <div className="flex flex-col h-[260px] font-mono text-xs">
        {/* Terminal Top Bar: Filter Buttons & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pb-2.5 border-b border-zinc-800/80">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none w-full sm:w-auto">
            {(['ALL', 'APPROVED', 'VETOED'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setFilterMode(mode)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                  filterMode === mode
                    ? mode === 'APPROVED'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-black'
                      : mode === 'VETOED'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 font-black'
                      : 'bg-zinc-200 text-zinc-950 font-black'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800'
                }`}
              >
                {mode === 'ALL' && 'SEMUA'}
                {mode === 'APPROVED' && '✅ LOLOS (5/5)'}
                {mode === 'VETOED' && '🛑 DITOLAK (VETO)'}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-56">
            <Search className="w-3 h-3 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari koin atau alasan..."
              className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-cyan-500 text-zinc-200 pl-7 pr-6 py-1 rounded-lg text-[10px] focus:outline-none transition-all placeholder:text-zinc-600"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-[10px]"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Live Monospace Terminal Screen */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto space-y-1.5 pt-2 pr-1.5 bg-black/40 rounded-xl p-2.5 border border-zinc-900 select-text scrollbar-thin scrollbar-thumb-zinc-800 font-mono shadow-inner"
        >
          {decisionLogs.length > 0 ? (
            decisionLogs.map((log) => {
              const time = new Date(log.timestamp).toLocaleTimeString('id-ID', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              });

              return (
                <div
                  key={log.id}
                  className="flex items-start gap-2 py-1 px-2 rounded hover:bg-zinc-900/60 border border-transparent hover:border-zinc-800/80 transition-colors group text-[10px]"
                >
                  <span className="text-zinc-600 shrink-0 select-none">[{time}]</span>

                  {renderFormattedDecision(log.message)}
                </div>
              );
            })
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-zinc-600 space-y-2">
              <TerminalIcon className="w-6 h-6 animate-pulse opacity-50" />
              <p className="text-[11px] font-bold text-zinc-500">
                {searchQuery ? `Tidak ada log yang cocok dengan "${searchQuery}"` : 'Menunggu pemindaian koin baru oleh Decision Engine...'}
              </p>
              <p className="text-[10px] text-zinc-600 max-w-xs">
                Setiap koin yang masuk akan diperiksa bertahap: [1] Likuiditas ➔ [2] Honeypot ➔ [3] Momentum.
              </p>
            </div>
          )}
        </div>

        {/* Terminal Status Footer */}
        <div className="pt-2 flex items-center justify-between text-[9px] text-zinc-500 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Decision Feed Active</span>
            </span>
            <span className="hidden sm:inline text-zinc-700">|</span>
            <span className="hidden sm:inline text-zinc-400">
              Filter Konsensus: <b className="text-emerald-400">5/5 Skor + Zero-Rug</b>
            </span>
          </div>

          <div className="text-zinc-500">
            {decisionLogs.length} event tercatat
          </div>
        </div>
      </div>
    </CollapsibleCard>
  );
};

export default MiniTerminalFeed;
