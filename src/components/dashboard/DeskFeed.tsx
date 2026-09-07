'use client';

import React, { useState, useMemo } from 'react';
import { useTradingAgent } from '../../hooks/useTradingAgent';
import { 
  Activity, 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check, 
  ExternalLink, 
  Search, 
  SlidersHorizontal,
  Zap,
  ChevronsUpDown,
  Lock,
  Unlock,
  Coins
} from 'lucide-react';
import Badge from '../ui/Badge';
import { DeskFeedSkeletonItem } from '../ui/Skeleton';
import CollapsibleCard from '../ui/CollapsibleCard';

export const DeskFeed: React.FC = () => {
  const {
    consensusFeed,
    selectedResult,
    selectResult,
    dataSource,
    networkMetrics
  } = useTradingAgent();

  // Item-level accordion expansion state
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [filterVerdict, setFilterVerdict] = useState<'ALL' | 'APPROVED' | 'VETOED'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedMint, setCopiedMint] = useState<string | null>(null);

  const toggleExpand = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleExpandAll = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (expandedIds.size === consensusFeed.length) {
      setExpandedIds(new Set());
    } else {
      setExpandedIds(new Set(consensusFeed.map((item) => item.token.id)));
    }
  };

  const handleCopy = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedMint(text);
    setTimeout(() => setCopiedMint(null), 2000);
  };

  // Filtered and searched feed
  const filteredFeed = useMemo(() => {
    return consensusFeed.filter((item) => {
      if (filterVerdict === 'APPROVED' && item.verdict !== 'APPROVED') return false;
      if (filterVerdict === 'VETOED' && item.verdict !== 'VETOED') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSymbol = item.token.symbol.toLowerCase().includes(q);
        const matchName = item.token.name.toLowerCase().includes(q);
        const matchMint = item.token.mint.toLowerCase().includes(q);
        if (!matchSymbol && !matchName && !matchMint) return false;
      }
      return true;
    });
  }, [consensusFeed, filterVerdict, searchQuery]);

  return (
    <CollapsibleCard
      id="desk-feed-panel"
      title={`Desk Feed (${dataSource === 'REAL_SOLANA' ? 'Live Pump.fun & Raydium' : 'Simulator'})`}
      icon={<Activity className="w-4 h-4" />}
      storageKey="DESK_FEED"
      badge={
        <span className="text-[10px] text-zinc-500 hidden sm:inline font-mono">
          SLOT: #{networkMetrics.currentSlot}
        </span>
      }
      headerActions={
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={handleExpandAll}
            className="px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer"
            title={expandedIds.size === consensusFeed.length ? 'Tutup Semua Item' : 'Buka Semua Item (Accordion)'}
          >
            <ChevronsUpDown className="w-3 h-3 text-cyan-400" />
            <span className="hidden md:inline">
              {expandedIds.size === consensusFeed.length ? 'Tutup Semua' : 'Buka Semua'}
            </span>
          </button>
        </div>
      }
      bodyClassName="space-y-3"
    >
      {/* Search & Filter Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap pb-1">
        <div className="relative flex-1 min-w-[140px]">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari simbol, nama, atau CA..."
            className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-emerald-500/80 text-zinc-100 pl-8 pr-3 py-1.5 rounded-xl text-xs font-mono placeholder:text-zinc-600 focus:outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Verdict Filter Buttons */}
        <div className="flex items-center gap-1 bg-zinc-950/60 p-0.5 rounded-xl border border-zinc-800/80">
          <button
            onClick={() => setFilterVerdict('ALL')}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
              filterVerdict === 'ALL'
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Semua ({consensusFeed.length})
          </button>
          <button
            onClick={() => setFilterVerdict('APPROVED')}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
              filterVerdict === 'APPROVED'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-zinc-500 hover:text-emerald-400'
            }`}
          >
            Approved
          </button>
          <button
            onClick={() => setFilterVerdict('VETOED')}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
              filterVerdict === 'VETOED'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'text-zinc-500 hover:text-rose-400'
            }`}
          >
            Vetoed
          </button>
        </div>
      </div>

      {/* Feed List Container */}
      <div className="overflow-y-auto space-y-2 max-h-[640px] pr-1 scrollbar-thin scrollbar-thumb-zinc-800">
        {filteredFeed.length > 0 ? (
          filteredFeed.map((item) => {
            const isSelected = selectedResult?.token.id === item.token.id;
            const isApproved = item.verdict === 'APPROVED';
            const isExpanded = expandedIds.has(item.token.id);

            return (
              <div
                key={item.token.id}
                onClick={() => selectResult(item)}
                className={`rounded-xl border transition-all cursor-pointer overflow-hidden ${
                  isSelected
                    ? 'bg-zinc-900 border-emerald-500/80 shadow-[0_0_14px_rgba(16,185,129,0.25)]'
                    : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/80'
                }`}
              >
                {/* 1. Collapsed Summary Row (Always Visible) */}
                <div className="p-3 flex items-center justify-between gap-2 select-none">
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    {/* Token Icon */}
                    {item.token.iconUrl ? (
                      <img
                        src={item.token.iconUrl}
                        alt={item.token.symbol}
                        className="w-7 h-7 rounded-lg object-cover border border-zinc-700 shrink-0"
                      />
                    ) : (
                      <span className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] font-black text-zinc-200 shrink-0">
                        {item.token.symbol.replace('$', '').slice(0, 2).toUpperCase() || 'TK'}
                      </span>
                    )}

                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-sm text-zinc-100 truncate">
                          {item.token.symbol}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 shrink-0">
                          {item.token.platform}
                        </span>
                        {item.token.isRealData && (
                          <span className="text-[8px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30 shrink-0">
                            ON-CHAIN
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-zinc-500 truncate max-w-[150px] sm:max-w-[200px]">
                        {item.token.name}
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Quick Action & Expand Chevron */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-zinc-400 font-mono hidden sm:inline">
                      ${item.token.initialLpUsd.toLocaleString()}
                    </span>


                    {/* Verdict Pill */}
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded font-black tracking-wider ${
                        isApproved
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/50'
                      }`}
                    >
                      {item.verdict}
                    </span>

                    {/* Accordion Toggle Chevron Indicator */}
                    <button
                      onClick={(e) => toggleExpand(item.token.id, e)}
                      className="p-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition-all cursor-pointer"
                      title={isExpanded ? 'Tutup Detail' : 'Buka Detail (Accordion)'}
                      aria-label="Toggle Detail Token"
                    >
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-300 ${
                          isExpanded ? '-rotate-180 text-cyan-400' : 'rotate-0 text-zinc-500'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* 2. Expanded Detail Drawer (Accordion Body) */}
                <div
                  className={`transition-all duration-300 ease-in-out border-t border-zinc-800/80 bg-zinc-950/80 ${
                    isExpanded ? 'max-h-[400px] opacity-100 p-3.5 space-y-2.5' : 'max-h-0 opacity-0 overflow-hidden p-0'
                  }`}
                >
                  {/* CA & Quick Links Row */}
                  <div className="flex items-center justify-between text-[11px] gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 font-mono text-zinc-400">
                      <span className="text-zinc-500">CA:</span>
                      <span className="text-zinc-200 font-bold">
                        {item.token.mint.slice(0, 6)}...{item.token.mint.slice(-6)}
                      </span>
                      <button
                        onClick={(e) => handleCopy(item.token.mint, e)}
                        className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-emerald-400 transition-colors cursor-pointer"
                        title="Salin Contract Address"
                      >
                        {copiedMint === item.token.mint ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>

                    <div className="flex items-center gap-2 font-bold text-[10px]">
                      <a
                        href={`https://rugcheck.xyz/tokens/${item.token.mint}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-cyan-400 hover:underline flex items-center gap-0.5"
                      >
                        <span>Rugcheck</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                      <a
                        href={
                          item.token.dexUrl ||
                          `https://dexscreener.com/solana/${item.token.mint}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-emerald-400 hover:underline flex items-center gap-0.5"
                      >
                        <span>DexScreener</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                      <a
                        href={`https://solscan.io/token/${item.token.mint}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-purple-400 hover:underline flex items-center gap-0.5"
                      >
                        <span>Solscan</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  </div>

                  {/* Deep Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
                    <div className="p-2 rounded-lg bg-zinc-900/90 border border-zinc-800">
                      <span className="text-zinc-500 block text-[9px]">LP LIQUIDITY</span>
                      <span className="font-bold text-zinc-200">
                        ${item.token.initialLpUsd.toLocaleString()}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-zinc-900/90 border border-zinc-800">
                      <span className="text-zinc-500 block text-[9px]">NARRATIVE COS-SIM</span>
                      <span className="font-bold text-cyan-400">
                        {item.token.narrativeCosineSim}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-zinc-900/90 border border-zinc-800">
                      <span className="text-zinc-500 block text-[9px]">MINT / FREEZE AUTH</span>
                      <span className="font-bold flex items-center gap-1">
                        {item.token.mintAuthorityRevoked ? (
                          <span className="text-emerald-400">REVOKED</span>
                        ) : (
                          <span className="text-rose-400">ACTIVE</span>
                        )}
                      </span>
                    </div>

                    <div className="p-2 rounded-lg bg-zinc-900/90 border border-zinc-800">
                      <span className="text-zinc-500 block text-[9px]">RUGCHECK SCORE</span>
                      <span
                        className={`font-bold ${
                          item.token.rugcheckScore === 'GOOD'
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {item.token.rugcheckScore || 'GOOD'}
                      </span>
                    </div>
                  </div>

                  {/* Curve or Top 10 Holders Row */}
                  <div className="flex items-center justify-between text-[10px] bg-zinc-900/60 p-2 rounded-lg border border-zinc-800/80">
                    {item.token.platform === 'Pump.fun' && item.token.bondingCurveProgress !== undefined ? (
                      <div className="flex items-center gap-2 w-full">
                        <span className="text-zinc-500 text-[9px]">Bonding Curve:</span>
                        <div className="flex-1 bg-zinc-950 h-1.5 rounded-full overflow-hidden border border-zinc-800">
                          <div
                            className="h-full bg-cyan-400"
                            style={{ width: `${item.token.bondingCurveProgress}%` }}
                          />
                        </div>
                        <span className="text-cyan-400 font-mono font-bold">
                          {item.token.bondingCurveProgress}%
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between w-full">
                        <span className="text-zinc-500">Top 10 Holders:</span>
                        <span className="text-zinc-200 font-bold font-mono">
                          {item.token.top10HolderPct}% (Aman &lt; 25%)
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Veto Reason if Vetoed */}
                  {!isApproved && item.vetoReason && (
                    <div className="text-[10px] text-rose-400 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20 flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-400" />
                      <span>
                        <strong>[{item.vetoAgent?.toUpperCase()} VETO]:</strong> {item.vetoReason}
                      </span>
                    </div>
                  )}
                </div>
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
    </CollapsibleCard>
  );
};

export default DeskFeed;
