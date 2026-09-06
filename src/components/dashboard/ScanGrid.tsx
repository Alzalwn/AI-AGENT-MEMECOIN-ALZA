'use client';

import React, { useState, useMemo } from 'react';
import { useTradingAgent } from '../../hooks/useTradingAgent';
import { ConsensusResult, AgentId } from '../../types/terminal';
import {
  Grid,
  ShieldCheck,
  AlertOctagon,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Sparkles,
  Info,
  ExternalLink
} from 'lucide-react';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

interface ScanGridProps {
  onInspectToken?: (result: ConsensusResult) => void;
}

export const ScanGrid: React.FC<ScanGridProps> = ({ onInspectToken }) => {
  const { consensusFeed, selectResult, selectedResult } = useTradingAgent();
  const [filterMode, setFilterMode] = useState<'ALL' | 'APPROVED' | 'VETOED'>('ALL');
  const [hoveredCell, setHoveredCell] = useState<{
    result: ConsensusResult;
    index: number;
  } | null>(null);

  // Generate 96 cells array (PRD FR-05 & Sec 5)
  const TOTAL_CELLS = 96;

  // Filtered consensus items
  const displayItems = useMemo(() => {
    let filtered = consensusFeed;
    if (filterMode === 'APPROVED') {
      filtered = filtered.filter(f => f.verdict === 'APPROVED');
    } else if (filterMode === 'VETOED') {
      filtered = filtered.filter(f => f.verdict === 'VETOED');
    }
    return filtered.slice(0, TOTAL_CELLS);
  }, [consensusFeed, filterMode]);

  // Statistics calculation across all feed items
  const stats = useMemo(() => {
    const total = consensusFeed.length;
    if (total === 0) {
      return {
        total: 0,
        approved: 0,
        vetoed: 0,
        passRatePct: 0,
        vetoByAgent: { risk: 0, scanner: 0, narrative: 0, timing: 0 }
      };
    }

    const approved = consensusFeed.filter(f => f.verdict === 'APPROVED').length;
    const vetoed = consensusFeed.filter(f => f.verdict === 'VETOED').length;
    const passRatePct = +((approved / total) * 100).toFixed(1);

    const vetoByAgent = { risk: 0, scanner: 0, narrative: 0, timing: 0 };
    consensusFeed.forEach(f => {
      if (f.verdict === 'VETOED' && f.vetoAgent) {
        if (f.vetoAgent in vetoByAgent) {
          vetoByAgent[f.vetoAgent as keyof typeof vetoByAgent]++;
        }
      }
    });

    return {
      total,
      approved,
      vetoed,
      passRatePct,
      vetoByAgent
    };
  }, [consensusFeed]);

  // Active inspect target
  const activeToken = hoveredCell?.result || selectedResult || consensusFeed[0] || null;

  return (
    <div className="bg-zinc-950/80 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-4 font-mono space-y-4 shadow-xl">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)]">
            <Grid className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-xs sm:text-sm text-zinc-100 uppercase tracking-wider">
                Scan Grid Matrix (96-Cell)
              </h3>
              <Badge variant="cyan" size="xs">
                PRD FR-05
              </Badge>
            </div>
            <p className="text-[10px] text-zinc-400">
              Matriks pemantauan throughput rasio token yang dipindai vs dieksekusi
            </p>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1.5 bg-zinc-900/90 border border-zinc-800 p-1 rounded-xl">
          <button
            onClick={() => setFilterMode('ALL')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
              filterMode === 'ALL'
                ? 'bg-zinc-800 text-zinc-100 shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            ALL (96)
          </button>
          <button
            onClick={() => setFilterMode('APPROVED')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
              filterMode === 'APPROVED'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow'
                : 'text-zinc-400 hover:text-emerald-400'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            PASS ({stats.approved})
          </button>
          <button
            onClick={() => setFilterMode('VETOED')}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
              filterMode === 'VETOED'
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow'
                : 'text-zinc-400 hover:text-rose-400'
            }`}
          >
            <XCircle className="w-3 h-3" />
            VETO ({stats.vetoed})
          </button>
        </div>
      </div>

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px]">
        <div className="bg-zinc-900/60 border border-zinc-800/80 p-2 rounded-xl">
          <span className="text-[10px] text-zinc-500 block uppercase">Pass Rate</span>
          <span className={`text-sm font-black ${stats.passRatePct > 15 ? 'text-emerald-400' : 'text-amber-400'}`}>
            {stats.passRatePct}%
          </span>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800/80 p-2 rounded-xl">
          <span className="text-[10px] text-zinc-500 block uppercase">Risk Veto</span>
          <span className="text-sm font-black text-rose-400">
            {stats.vetoByAgent.risk} <span className="text-[9px] text-zinc-500">tokens</span>
          </span>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800/80 p-2 rounded-xl">
          <span className="text-[10px] text-zinc-500 block uppercase">Scanner Veto</span>
          <span className="text-sm font-black text-amber-400">
            {stats.vetoByAgent.scanner} <span className="text-[9px] text-zinc-500">tokens</span>
          </span>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800/80 p-2 rounded-xl">
          <span className="text-[10px] text-zinc-500 block uppercase">Narrative Veto</span>
          <span className="text-sm font-black text-purple-400">
            {stats.vetoByAgent.narrative} <span className="text-[9px] text-zinc-500">tokens</span>
          </span>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800/80 p-2 rounded-xl col-span-2 sm:col-span-1">
          <span className="text-[10px] text-zinc-500 block uppercase">Timing Veto</span>
          <span className="text-sm font-black text-cyan-400">
            {stats.vetoByAgent.timing} <span className="text-[9px] text-zinc-500">tokens</span>
          </span>
        </div>
      </div>

      {/* 96-Cell Grid Matrix (12 columns x 8 rows) */}
      <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-xl p-3">
        <div className="grid grid-cols-12 gap-1.5 sm:gap-2">
          {Array.from({ length: TOTAL_CELLS }).map((_, index) => {
            const item = displayItems[index];
            const isApproved = item?.verdict === 'APPROVED';
            const isVetoed = item?.verdict === 'VETOED';
            const isSelected = selectedResult && item && selectedResult.token.mint === item.token.mint;
            const isHovered = hoveredCell?.index === index;

            let cellBg = 'bg-zinc-900/80 border-zinc-800 text-zinc-600';
            let glow = '';

            if (isApproved) {
              cellBg = isSelected
                ? 'bg-emerald-500 border-emerald-300 text-black shadow-[0_0_12px_rgba(16,185,129,0.8)]'
                : 'bg-emerald-500/20 border-emerald-500/60 text-emerald-400 hover:bg-emerald-500/40';
              glow = 'hover:shadow-[0_0_10px_rgba(16,185,129,0.5)]';
            } else if (isVetoed) {
              cellBg = isSelected
                ? 'bg-rose-500 border-rose-300 text-white shadow-[0_0_12px_rgba(244,63,94,0.8)]'
                : 'bg-rose-500/15 border-rose-500/50 text-rose-400 hover:bg-rose-500/30';
              glow = 'hover:shadow-[0_0_10px_rgba(244,63,94,0.5)]';
            }

            return (
              <button
                key={index}
                onClick={() => {
                  if (item) {
                    selectResult(item);
                    if (onInspectToken) onInspectToken(item);
                  }
                }}
                onMouseEnter={() => {
                  if (item) setHoveredCell({ result: item, index });
                }}
                onMouseLeave={() => setHoveredCell(null)}
                disabled={!item}
                className={`h-7 sm:h-8 rounded-lg border flex flex-col items-center justify-center transition-all duration-150 relative cursor-pointer ${cellBg} ${glow} ${
                  isSelected ? 'scale-105 z-10' : ''
                } ${!item ? 'opacity-30 cursor-not-allowed border-dashed' : ''}`}
                title={
                  item
                    ? `${item.token.symbol} (${item.verdict}): ${
                        item.vetoReason || 'Approved by 5/5 Agents'
                      }`
                    : `Slot #${index + 1} (Waiting for emission)`
                }
              >
                {item ? (
                  <>
                    <span className="text-[9px] font-black leading-none truncate max-w-full px-0.5">
                      {item.token.symbol.slice(0, 3)}
                    </span>
                    <span className="text-[7px] opacity-70 leading-none mt-0.5">
                      {isApproved ? '✓' : '✗'}
                    </span>
                  </>
                ) : (
                  <span className="text-[8px] text-zinc-700 font-mono">
                    {index + 1}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Token Tooltip / Preview Card */}
      {activeToken && (
        <div className="bg-zinc-900/70 border border-zinc-800 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                activeToken.verdict === 'APPROVED'
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  : 'bg-rose-500/20 border-rose-500/40 text-rose-400'
              }`}
            >
              {activeToken.verdict === 'APPROVED' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <XCircle className="w-4 h-4" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-zinc-100">{activeToken.token.name}</span>
                <span className="text-zinc-500 font-bold">${activeToken.token.symbol}</span>
                <Badge
                  variant={activeToken.verdict === 'APPROVED' ? 'emerald' : 'rose'}
                  size="xs"
                >
                  {activeToken.verdict}
                </Badge>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {activeToken.verdict === 'APPROVED'
                  ? 'Lolos konsensus 5/5 agen AI secara terdistribusi.'
                  : `Veto oleh ${activeToken.vetoAgent?.toUpperCase() || 'AGENT'}: ${
                      activeToken.vetoReason
                    }`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="secondary"
              size="xs"
              onClick={() => {
                selectResult(activeToken);
                if (onInspectToken) onInspectToken(activeToken);
              }}
              leftIcon={<Sparkles className="w-3 h-3 text-cyan-400" />}
            >
              Inspect Consensus
            </Button>
            <a
              href={
                activeToken.token.dexUrl ||
                (activeToken.token.mint.includes('...')
                  ? `https://dexscreener.com/search?q=${encodeURIComponent(activeToken.token.symbol.replace('$', ''))}`
                  : `https://dexscreener.com/search?q=${encodeURIComponent(activeToken.token.mint)}`)
              }
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
              title="View on DexScreener"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScanGrid;
