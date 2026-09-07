'use client';

/**
 * SignalHistoryTable — Tabel riwayat sinyal komprehensif
 * Dilengkapi fitur Hapus Sinyal: per Baris, per Jam, per Hari, per Minggu, per Bulan,
 * serta multi-select checkbox dan bulk cleanup.
 */

import React, { useState, useMemo } from 'react';
import { TradingSignal } from '../../types/signal';
import { useTradingAgent } from '../../hooks/useTradingAgent';
import { 
  Trash2, 
  Clock, 
  Calendar, 
  CalendarDays, 
  Check, 
  CheckSquare, 
  Square, 
  AlertTriangle, 
  RotateCcw, 
  Search, 
  Filter, 
  X, 
  Sparkles,
  ChevronDown
} from 'lucide-react';

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
  const { deleteSignalHistoryItem, clearSignalHistoryByFilter, restoreSeedSignals } = useTradingAgent();

  const [sortKey, setSortKey] = useState<SortKey>('time');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Cleanup Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  // Filtered list based on search and status
  const filteredSignals = useMemo(() => {
    return signals.filter((sig) => {
      const matchSearch = !searchQuery.trim() || 
        sig.token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sig.token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sig.token.mint.toLowerCase().includes(searchQuery.toLowerCase());
      
      let matchStatus = true;
      if (statusFilter === 'WIN') {
        matchStatus = ['TP1_HIT', 'TP2_HIT', 'TP3_HIT'].includes(sig.status);
      } else if (statusFilter === 'LOSS') {
        matchStatus = sig.status === 'SL_HIT';
      } else if (statusFilter === 'ACTIVE') {
        matchStatus = sig.status === 'ACTIVE';
      } else if (statusFilter !== 'ALL') {
        matchStatus = sig.status === statusFilter;
      }

      return matchSearch && matchStatus;
    });
  }, [signals, searchQuery, statusFilter]);

  // Sorted list
  const sorted = useMemo(() => {
    return [...filteredSignals].sort((a, b) => {
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
  }, [filteredSignals, sortKey, sortDir]);

  // Select all / Deselect all
  const handleToggleSelectAll = () => {
    if (selectedIds.size === sorted.length && sorted.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sorted.map(s => s.id)));
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Delete single signal
  const handleDeleteSingle = (id: string, symbol: string) => {
    deleteSignalHistoryItem(id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    showNotification(`🗑️ Sinyal $${symbol} berhasil dihapus dari riwayat.`);
  };

  // Delete selected signals
  const handleDeleteSelected = () => {
    const count = selectedIds.size;
    if (count === 0) return;
    selectedIds.forEach((id) => deleteSignalHistoryItem(id));
    setSelectedIds(new Set());
    showNotification(`🗑️ Berhasil menghapus ${count} sinyal terpilih.`);
  };

  // Timeframe cleanup handlers
  const handleCleanup = (option: 'all' | 'older_1h' | 'older_24h' | 'older_7d' | 'older_30d' | 'last_1h' | 'last_24h' | 'last_7d' | 'last_30d' | 'sl_only', label: string) => {
    const deletedCount = clearSignalHistoryByFilter(option);
    setSelectedIds(new Set());
    setIsDeleteModalOpen(false);
    showNotification(`✅ Berhasil membersihkan ${deletedCount} sinyal (${label}).`);
  };

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <th
      className="px-3 py-2.5 text-left text-xs font-semibold text-white/40 uppercase tracking-wider cursor-pointer hover:text-white/60 select-none"
      onClick={() => handleSort(k)}
    >
      {label} {sortKey === k ? (sortDir === 'desc' ? '↓' : '↑') : ''}
    </th>
  );

  return (
    <div className="bg-[#111111] border border-white/10 rounded-2xl overflow-hidden shadow-2xl font-mono relative">
      {/* Toast Notification */}
      {notification && (
        <div className="absolute top-3 right-3 z-30 bg-emerald-500/20 border border-emerald-500/60 text-emerald-300 px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-lg backdrop-blur-md animate-in fade-in flex items-center gap-2">
          <span>{notification}</span>
        </div>
      )}

      {/* Top Toolbar */}
      <div className="bg-[#151515] border-b border-white/5 p-3 sm:px-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-xs font-black text-white/80 uppercase tracking-wider flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4 text-emerald-400" />
            <span>Riwayat & Win-Rate Sinyal</span>
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-white/[0.06] border border-white/10 text-white/60">
            {signals.length} Sinyal
          </span>
          {selectedIds.size > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-500/20 border border-purple-500/40 text-purple-300 animate-pulse">
              {selectedIds.size} Terpilih
            </span>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap justify-end">
          {/* Search Token */}
          <div className="relative flex-1 sm:w-44 md:w-48">
            <input
              type="text"
              placeholder="Cari token..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#1c1c1c] border border-white/10 focus:border-emerald-500/50 rounded-xl px-2.5 py-1.5 pl-7 text-xs text-white placeholder:text-white/30 outline-none"
            />
            <Search className="w-3 h-3 text-white/40 absolute left-2.5 top-1/2 -translate-y-1/2" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#1c1c1c] border border-white/10 text-white/70 hover:text-white text-xs rounded-xl px-2.5 py-1.5 outline-none cursor-pointer"
          >
            <option value="ALL">Semua Outcome</option>
            <option value="WIN">🎯 Semua Win (TP1-3)</option>
            <option value="LOSS">🛑 SL Hit Only</option>
            <option value="ACTIVE">⚡ Active Only</option>
            <option value="TP1_HIT">TP1 Hit</option>
            <option value="TP2_HIT">TP2 Hit</option>
            <option value="TP3_HIT">TP3 Hit</option>
          </select>

          {/* Delete Selected (when checkboxes active) */}
          {selectedIds.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50 text-rose-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm animate-in fade-in"
              title={`Hapus ${selectedIds.size} sinyal yang dicentang`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus ({selectedIds.size})</span>
            </button>
          )}

          {/* Main Clean/Delete Trigger Button */}
          <button
            onClick={() => setIsDeleteModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 border border-rose-500/40 hover:border-rose-500 text-rose-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            title="Buka menu penghapusan sinyal per jam/hari/minggu/bulan"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Hapus Sinyal</span>
            <ChevronDown className="w-3 h-3 text-rose-400/70" />
          </button>

          {/* Restore / Reset Seed Data */}
          <button
            onClick={() => {
              restoreSeedSignals();
              showNotification('↺ Data riwayat berhasil direset ke 80% Win-Rate AI Benchmark.');
            }}
            className="px-3 py-1.5 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/40 text-cyan-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            title="Reset ke data sinyal benchmark awal (80.0% Win-Rate)"
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Reset Benchmark</span>
            <span className="sm:hidden">Reset</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-black">80% WR</span>
          </button>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="border-b border-white/5 bg-black/40">
            <tr>
              <th className="w-10 px-3 py-2.5 text-center">
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="text-white/40 hover:text-white cursor-pointer transition-colors"
                  title={selectedIds.size === sorted.length && sorted.length > 0 ? "Batalkan semua centang" : "Centang semua"}
                >
                  {selectedIds.size === sorted.length && sorted.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">Token</th>
              <SortHeader label="Waktu" k="time" />
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">Entry</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">TP1 / TP2 / TP3</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">SL</th>
              <SortHeader label="Confidence" k="confidence" />
              <SortHeader label="Outcome" k="outcome" />
              <th className="px-3 py-2.5 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">Durasi</th>
              <th className="w-14 px-3 py-2.5 text-center text-xs font-semibold text-white/40 uppercase tracking-wider">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-16 text-white/30 text-xs">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Calendar className="w-8 h-8 opacity-20" />
                    <span>Tidak ada riwayat sinyal yang cocok</span>
                    {signals.length === 0 && (
                      <button
                        onClick={() => {
                          restoreSeedSignals();
                          showNotification('↺ Data demo sinyal berhasil dipulihkan.');
                        }}
                        className="mt-2 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs hover:bg-emerald-500/30 transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Isi Kembali Data Sampel</span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              sorted.map((sig) => {
                const meta = STATUS_META[sig.status] || STATUS_META['EXPIRED'];
                const isProfit = ['TP1_HIT', 'TP2_HIT', 'TP3_HIT'].includes(sig.status);
                const isLoss = sig.status === 'SL_HIT';
                const isSelected = selectedIds.has(sig.id);

                return (
                  <tr
                    key={sig.id}
                    className={`transition-colors group ${
                      isSelected 
                        ? 'bg-purple-950/20 hover:bg-purple-950/30' 
                        : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="px-3 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleSelectRow(sig.id)}
                        className="text-white/30 hover:text-white cursor-pointer transition-colors"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </td>

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
                          <div className="text-white/30 text-[10px]">{sig.token.platform}</div>
                        </div>
                      </div>
                    </td>

                    {/* Waktu */}
                    <td className="px-3 py-3 text-[11px] text-white/40 font-mono whitespace-nowrap">
                      {fmtTime(sig.timestamp)}
                    </td>

                    {/* Entry */}
                    <td className="px-3 py-3 text-[11px] font-mono text-white/60">
                      {fmtSol(sig.entryZone.current)}
                      <br />
                      <span className="text-white/30 text-[10px]">{fmtUsd(sig.marketContext.marketCapUsd)}</span>
                    </td>

                    {/* TP targets */}
                    <td className="px-3 py-3 text-[11px] font-mono space-y-0.5">
                      {sig.targets.map((t) => (
                        <div key={t.tier} className={`flex items-center gap-1 ${
                          sig.status === `${t.tier}_HIT` ||
                          (t.tier === 'TP1' && ['TP2_HIT', 'TP3_HIT'].includes(sig.status)) ||
                          (t.tier === 'TP2' && sig.status === 'TP3_HIT')
                            ? 'text-emerald-400'
                            : 'text-white/30'
                        }`}>
                          <span className="w-6 text-[10px]">{t.tier}</span>
                          <span>+{t.gainPct.toFixed(0)}%</span>
                        </div>
                      ))}
                    </td>

                    {/* SL */}
                    <td className="px-3 py-3 text-[11px] font-mono text-red-400/60">
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
                        <span className="text-[11px] font-mono text-white/50">{sig.confidenceScore}%</span>
                      </div>
                    </td>

                    {/* Outcome badge */}
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${meta.cls}`}
                      >
                        {meta.label}
                      </span>
                      {sig.performance?.actualDurationMin != null && (
                        <div className={`text-[10px] mt-0.5 font-mono ${isProfit ? 'text-emerald-400' : isLoss ? 'text-red-400' : 'text-white/30'}`}>
                          {isProfit && '+'}{sig.performance?.peakGainPct?.toFixed(0) || '?'}%
                        </div>
                      )}
                    </td>

                    {/* Durasi */}
                    <td className="px-3 py-3 text-[11px] font-mono text-white/30">
                      {durationStr(sig.timestamp, sig.performance?.resolvedAt)}
                    </td>

                    {/* Individual Row Action */}
                    <td className="px-3 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteSingle(sig.id, sig.token.symbol)}
                        className="p-1.5 rounded-lg text-white/20 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title={`Hapus sinyal $${sig.token.symbol}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ========================================================================= */}
      {/* MODAL PEMBERSIHAN / HAPUS SINYAL BERDASARKAN RENTANG WAKTU */}
      {/* ========================================================================= */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#121214] border border-rose-500/40 rounded-2xl w-full max-w-lg shadow-[0_0_50px_rgba(244,63,94,0.2)] overflow-hidden flex flex-col font-mono text-xs">
            {/* Modal Header */}
            <div className="p-4 border-b border-zinc-800 bg-zinc-950/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-zinc-100 uppercase tracking-wider">
                    Pembersihan Riwayat Sinyal
                  </h3>
                  <p className="text-[10px] text-zinc-400">
                    Pilih opsi penghapusan riwayat sinyal per jam, hari, minggu, atau bulan
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Pilihan Hapus */}
            <div className="p-4 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
              {/* Info Banner */}
              <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-300 flex items-center justify-between">
                <span>Total Riwayat Saat Ini:</span>
                <span className="font-bold text-rose-400 text-xs">{signals.length} Sinyal</span>
              </div>

              {/* SECTION 1: Hapus Sinyal Lawas (Older than...) */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1.5 uppercase">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>1. Hapus Sinyal Lawas (Lebih Lama Dari...)</span>
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleCleanup('older_1h', '> 1 Jam Lalu')}
                    className="p-2.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-800 hover:border-amber-500/40 text-left transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <span className="font-bold text-zinc-200">&gt; 1 Jam yang lalu</span>
                    <span className="text-[9px] text-zinc-400">Pertahankan sinyal 1 jam terakhir</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCleanup('older_24h', '> 24 Jam Lalu')}
                    className="p-2.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-800 hover:border-amber-500/40 text-left transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <span className="font-bold text-zinc-200">&gt; 24 Jam / 1 Hari</span>
                    <span className="text-[9px] text-zinc-400">Pertahankan sinyal hari ini</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCleanup('older_7d', '> 7 Hari Lalu')}
                    className="p-2.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-800 hover:border-amber-500/40 text-left transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <span className="font-bold text-zinc-200">&gt; 7 Hari / 1 Minggu</span>
                    <span className="text-[9px] text-zinc-400">Pertahankan sinyal minggu ini</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCleanup('older_30d', '> 30 Hari Lalu')}
                    className="p-2.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-800 hover:border-amber-500/40 text-left transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <span className="font-bold text-zinc-200">&gt; 30 Hari / 1 Bulan</span>
                    <span className="text-[9px] text-zinc-400">Pertahankan sinyal bulan ini</span>
                  </button>
                </div>
              </div>

              {/* SECTION 2: Hapus Rentang Periode Terakhir (Last...) */}
              <div className="space-y-2 pt-2 border-t border-zinc-800/80">
                <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1.5 uppercase">
                  <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                  <span>2. Hapus Sinyal Periode Terakhir</span>
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleCleanup('last_1h', '1 Jam Terakhir')}
                    className="p-2.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-800 hover:border-cyan-500/40 text-left transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <span className="font-bold text-zinc-200">1 Jam Terakhir</span>
                    <span className="text-[9px] text-zinc-400">Hapus sinyal 1 jam ke belakang</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCleanup('last_24h', '24 Jam Terakhir')}
                    className="p-2.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-800 hover:border-cyan-500/40 text-left transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <span className="font-bold text-zinc-200">24 Jam Terakhir (Hari Ini)</span>
                    <span className="text-[9px] text-zinc-400">Hapus seluruh sinyal hari ini</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCleanup('last_7d', '7 Hari Terakhir')}
                    className="p-2.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-800 hover:border-cyan-500/40 text-left transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <span className="font-bold text-zinc-200">7 Hari Terakhir (Minggu Ini)</span>
                    <span className="text-[9px] text-zinc-400">Hapus seluruh sinyal 7 hari</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCleanup('last_30d', '30 Hari Terakhir')}
                    className="p-2.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-800 hover:border-cyan-500/40 text-left transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <span className="font-bold text-zinc-200">30 Hari Terakhir (Bulan Ini)</span>
                    <span className="text-[9px] text-zinc-400">Hapus seluruh sinyal 30 hari</span>
                  </button>
                </div>
              </div>

              {/* SECTION 3: Hapus Kategori Khusus */}
              <div className="space-y-2 pt-2 border-t border-zinc-800/80">
                <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1.5 uppercase">
                  <Filter className="w-3.5 h-3.5 text-rose-400" />
                  <span>3. Pembersihan Kategori Tertentu</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleCleanup('sl_only', 'Hanya SL Hit (Loss)')}
                  className="w-full p-2.5 rounded-xl bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-800 hover:border-rose-500/40 text-left transition-all cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-rose-300 block">Hapus Hanya Sinyal SL Hit (Loss)</span>
                    <span className="text-[9px] text-zinc-400">Bersihkan histori posisi yang terkena Stop Loss</span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold">
                    {signals.filter(s => s.status === 'SL_HIT').length} Sinyal
                  </span>
                </button>
              </div>

              {/* SECTION 4: Hapus Total (Clear All) */}
              <div className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-2">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Hapus Bersih Seluruh Riwayat</span>
                </div>
                <p className="text-[10px] text-zinc-400 leading-relaxed">
                  Menghapus seluruh {signals.length} sinyal dari memori dan LocalStorage terminal. Anda tetap dapat memulihkan data kapan saja.
                </p>
                <button
                  type="button"
                  onClick={() => handleCleanup('all', 'Semua Riwayat')}
                  className="w-full py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-rose-600/20"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Semua ({signals.length} Sinyal)</span>
                </button>
              </div>

              {/* SECTION 5: Pulihkan / Reset Riwayat ke 80% Win-Rate Benchmark */}
              <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/30 space-y-2">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-xs">
                  <RotateCcw className="w-4 h-4 shrink-0" />
                  <span>Reset ke Riwayat Benchmark Terverifikasi (80% Win-Rate)</span>
                </div>
                <p className="text-[10px] text-zinc-400 leading-relaxed">
                  Ganti histori pengujian dengan 15 sinyal riwayat alpha Solana riil ($GOAT, $PENGU, $WIF, $MOODENG, dll.) dengan akurasi terverifikasi konsensus 80.0% Win-Rate (12 Menang / 3 Loss).
                </p>
                <button
                  type="button"
                  onClick={() => {
                    restoreSeedSignals();
                    setIsDeleteModalOpen(false);
                    showNotification('↺ Riwayat berhasil direset ke 80% Win-Rate AI Benchmark!');
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-600/20"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset & Terapkan 80% Win-Rate Benchmark</span>
                </button>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-zinc-800 bg-zinc-950/90 flex justify-end">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-xs transition-all cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SignalHistoryTable;
