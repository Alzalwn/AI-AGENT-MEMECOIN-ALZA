'use client';

/**
 * SignalHistoryTable — Tabel riwayat sinyal bergaya Supabase Table Editor
 * Menampilkan semua sinyal dengan outcome, gain aktual, dan durasi
 */

import React, { useState } from 'react';
import { TradingSignal } from '../../types/signal';

function fmtSol(n: number): string {
  if (n < 0.0001) return n.toFixed(8);
  return n.toFixed(6);
}
function fmtUsd(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}
function fmtTime(ts: number): string {
  return new Date(ts).toLocaleString('id-ID', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
  });
}
function durationStr(startMs: number, endMs?: number): string {
  const diff = Math.round(((endMs ?? Date.now()) - startMs) / 60000);
  if (diff < 60) return `${diff}m`;
  return `${Math.floor(diff / 60)}h ${diff % 60}m`;
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  ACTIVE:     { label: 'Active', cls: 'text-emerald-400 bg-emerald-500/10' },
  TP1_HIT:    { label: 'TP1 ✓', cls: 'text-blue-400 bg-blue-500/10' },
  TP2_HIT:    { label: 'TP2 ✓✓', cls: 'text-violet-400 bg-violet-500/10' },
  TP3_HIT:    { label: 'TP3 💎', cls: 'text-yellow-400 bg-yellow-500/10' },
  SL_HIT:     { label: 'SL Hit', cls: 'text-red-400 bg-red-500/10' },
  EXPIRED:    { label: 'Expired', cls: 'text-gray-500 bg-gray-500/10' },
  CANCELLED:  { label: 'Cancelled', cls: 'text-gray-500 bg-gray-500/10' },
};

type SortKey = 'time' | 'confidence' | 'outcome';

interface SignalHistoryTableProps {
  signals: TradingSignal[];
}

export function SignalHistoryTable({ signals }: SignalHistoryTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('time');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };
  const setDir = setSortDir;

  const sorted = [...signals].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'time') cmp = a.timestamp - b.timestamp;
    if (sortKey === 'confidence') cmp = a.confidenceScore - b.confidenceScore;
    if (sortKey === 'outcome') {
      const scoreMap: Record<string, number> = {
        TP3_HIT: 5, TP2_HIT: 4, TP1_HIT: 3, ACTIVE: 2, EXPIRED: 1, CANCELLED: 1, SL_HIT: 0
      };
      cmp = (scoreMap[a.status] ?? 0) - (scoreMap[b.status] ?? 0);
    }
    return sortDir === 'desc' ? -cmp : cmp;
  });

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <th
      className="px-3 py-2.5 text-left text-xs font-semibold text-white/40 uppercase tracking-wider cursor-pointer hover:text-white/60 select-none"
      onClick={() => handleSort(k)}
    >
      {label} {sortKey === k ? (sortDir === 'desc' ? '↓' : '↑') : ''}
    </th>
  );

  return (
    <div className="bg-[#111111] border border-white/5 rounded-xl overflow-hidden">
      <div className="bg-white/[0.02] border-b border-white/5 px-4 py-2.5 flex items-center justify-between">
        <span className="text-xs font-medium text-white/50 uppercase tracking-wider">
          📚 Riwayat Sinyal
        </span>
        <span className="text-xs text-white/20">{signals.length} sinyal</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-white/5">
            <tr>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">Token</th>
              <SortHeader label="Waktu" k="time" />
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">Entry</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">TP1 / TP2 / TP3</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">SL</th>
              <SortHeader label="Confidence" k="confidence" />
              <SortHeader label="Outcome" k="outcome" />
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">Durasi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-white/20 text-sm">
                  Belum ada riwayat sinyal
                </td>
              </tr>
            ) : (
              sorted.map((sig) => {
                const meta = STATUS_META[sig.status] || STATUS_META['EXPIRED'];
                const isProfit = ['TP1_HIT', 'TP2_HIT', 'TP3_HIT'].includes(sig.status);
                const isLoss = sig.status === 'SL_HIT';
                return (
                  <tr
                    key={sig.id}
                    className="hover:bg-white/[0.02] transition-colors group"
                  >
                    {/* Token */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        {sig.token.iconUrl && (
                          <img
                            src={sig.token.iconUrl}
                            alt={sig.token.symbol}
                            className="w-6 h-6 rounded-full"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        )}
                        <div>
                          <div className="font-mono font-bold text-white text-xs">${sig.token.symbol}</div>
                          <div className="text-white/30 text-xs">{sig.token.platform}</div>
                        </div>
                      </div>
                    </td>

                    {/* Waktu */}
                    <td className="px-3 py-3 text-xs text-white/40 font-mono whitespace-nowrap">
                      {fmtTime(sig.timestamp)}
                    </td>

                    {/* Entry */}
                    <td className="px-3 py-3 text-xs font-mono text-white/60">
                      {fmtSol(sig.entryZone.current)}
                      <br />
                      <span className="text-white/30">{fmtUsd(sig.marketContext.marketCapUsd)}</span>
                    </td>

                    {/* TP targets */}
                    <td className="px-3 py-3 text-xs font-mono space-y-0.5">
                      {sig.targets.map((t) => (
                        <div key={t.tier} className={`flex items-center gap-1 ${
                          sig.status === `${t.tier}_HIT` ||
                          (t.tier === 'TP1' && ['TP2_HIT', 'TP3_HIT'].includes(sig.status)) ||
                          (t.tier === 'TP2' && sig.status === 'TP3_HIT')
                            ? 'text-emerald-400'
                            : 'text-white/30'
                        }`}>
                          <span className="w-6">{t.tier}</span>
                          <span>+{t.gainPct.toFixed(0)}%</span>
                        </div>
                      ))}
                    </td>

                    {/* SL */}
                    <td className="px-3 py-3 text-xs font-mono text-red-400/60">
                      {sig.stopLoss.pctFromEntry}%
                    </td>

                    {/* Confidence */}
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 h-1 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${sig.confidenceScore}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono text-white/50">{sig.confidenceScore}%</span>
                      </div>
                    </td>

                    {/* Outcome badge */}
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${meta.cls}`}
                      >
                        {meta.label}
                      </span>
                      {sig.performance?.actualDurationMin != null && (
                        <div className={`text-xs mt-0.5 font-mono ${isProfit ? 'text-emerald-400' : isLoss ? 'text-red-400' : 'text-white/30'}`}>
                          {isProfit && '+'}{sig.performance?.peakGainPct?.toFixed(0) || '?'}%
                        </div>
                      )}
                    </td>

                    {/* Durasi */}
                    <td className="px-3 py-3 text-xs font-mono text-white/30">
                      {durationStr(sig.timestamp, sig.performance?.resolvedAt)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default SignalHistoryTable;
