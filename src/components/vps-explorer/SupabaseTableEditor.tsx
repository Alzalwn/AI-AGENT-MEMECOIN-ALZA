'use client';

import React, { useState, useMemo } from 'react';
import {
  Table as TableIcon,
  Filter,
  ArrowUpDown,
  Search,
  RefreshCw,
  Download,
  Copy,
  Check,
  ExternalLink,
  ChevronRight,
  X,
  Code,
  Layers,
  Sparkles,
  SlidersHorizontal,
  FileJson
} from 'lucide-react';
import { ClosedTrade } from '../../types/terminal';

export interface SnipingRecord {
  id: string;
  timestamp: string;
  rawTimestamp: number;
  tokenSymbol: string;
  tokenName: string;
  mint: string;
  dex: 'Raydium' | 'Pump.fun' | 'Jupiter';
  status: 'WIN' | 'LOSS' | 'PENDING';
  solInvested: number;
  entryPriceSol: number;
  exitPriceSol: number;
  pnlPct: number;
  pnlSol: number;
  exitReason: string;
  jitoTipSol: number;
  holdDurationSec: number;
}

// Sample fallback trades if closedTrades is initially empty
export const SAMPLE_SNIPING_DATA: SnipingRecord[] = [
  {
    id: 'snip-901',
    timestamp: '2026-09-07 10:32:15',
    rawTimestamp: Date.now() - 360000,
    tokenSymbol: 'GROKAI',
    tokenName: 'Grok Super AI',
    mint: 'Grk9...38vL',
    dex: 'Raydium',
    status: 'WIN',
    solInvested: 0.25,
    entryPriceSol: 0.0000412,
    exitPriceSol: 0.0000889,
    pnlPct: 115.7,
    pnlSol: 0.289,
    exitReason: 'TAKE_PROFIT_2X',
    jitoTipSol: 0.003,
    holdDurationSec: 42,
  },
  {
    id: 'snip-902',
    timestamp: '2026-09-07 10:28:44',
    rawTimestamp: Date.now() - 580000,
    tokenSymbol: 'PEPE2',
    tokenName: 'Pepe 2.0 Solana',
    mint: 'Pep8...91kJ',
    dex: 'Pump.fun',
    status: 'LOSS',
    solInvested: 0.20,
    entryPriceSol: 0.0000185,
    exitPriceSol: 0.0000142,
    pnlPct: -23.2,
    pnlSol: -0.046,
    exitReason: 'TRAILING_STOP_LOSS',
    jitoTipSol: 0.002,
    holdDurationSec: 18,
  },
  {
    id: 'snip-903',
    timestamp: '2026-09-07 10:15:02',
    rawTimestamp: Date.now() - 1400000,
    tokenSymbol: 'SOLCAT',
    tokenName: 'Solana Moon Cat',
    mint: 'Cat4...72mM',
    dex: 'Raydium',
    status: 'WIN',
    solInvested: 0.30,
    entryPriceSol: 0.000092,
    exitPriceSol: 0.000215,
    pnlPct: 133.6,
    pnlSol: 0.401,
    exitReason: 'AI_WHALE_EXIT_SIGNAL',
    jitoTipSol: 0.004,
    holdDurationSec: 95,
  },
  {
    id: 'snip-904',
    timestamp: '2026-09-07 10:02:19',
    rawTimestamp: Date.now() - 2200000,
    tokenSymbol: 'NEOBURN',
    tokenName: 'Neo Deflationary',
    mint: 'Neo1...55qP',
    dex: 'Pump.fun',
    status: 'WIN',
    solInvested: 0.15,
    entryPriceSol: 0.0000078,
    exitPriceSol: 0.0000148,
    pnlPct: 89.7,
    pnlSol: 0.134,
    exitReason: 'MANUAL_QUICK_SELL',
    jitoTipSol: 0.0025,
    holdDurationSec: 33,
  },
  {
    id: 'snip-905',
    timestamp: '2026-09-07 09:48:30',
    rawTimestamp: Date.now() - 3000000,
    tokenSymbol: 'RUGGUARD',
    tokenName: 'Rug Guard Token',
    mint: 'Rug7...12xZ',
    dex: 'Raydium',
    status: 'LOSS',
    solInvested: 0.10,
    entryPriceSol: 0.000033,
    exitPriceSol: 0.000028,
    pnlPct: -15.1,
    pnlSol: -0.015,
    exitReason: 'STOP_LOSS_TRIGGERED',
    jitoTipSol: 0.002,
    holdDurationSec: 25,
  },
  {
    id: 'snip-906',
    timestamp: '2026-09-07 09:30:12',
    rawTimestamp: Date.now() - 4100000,
    tokenSymbol: 'CHADAI',
    tokenName: 'Giga Chad AI Agent',
    mint: 'Chad...99aA',
    dex: 'Jupiter',
    status: 'WIN',
    solInvested: 0.40,
    entryPriceSol: 0.000150,
    exitPriceSol: 0.000420,
    pnlPct: 180.0,
    pnlSol: 0.720,
    exitReason: 'TAKE_PROFIT_2.5X',
    jitoTipSol: 0.005,
    holdDurationSec: 140,
  },
  {
    id: 'snip-907',
    timestamp: '2026-09-07 09:12:05',
    rawTimestamp: Date.now() - 5200000,
    tokenSymbol: 'WHALEPUMP',
    tokenName: 'Whale Pump Signal',
    mint: 'Whl3...66bB',
    dex: 'Raydium',
    status: 'WIN',
    solInvested: 0.25,
    entryPriceSol: 0.000062,
    exitPriceSol: 0.000098,
    pnlPct: 58.0,
    pnlSol: 0.145,
    exitReason: 'TRAILING_STOP_LOCK',
    jitoTipSol: 0.003,
    holdDurationSec: 64,
  }
];

interface SupabaseTableEditorProps {
  realTrades?: ClosedTrade[];
  onRefresh?: () => void;
}

export const SupabaseTableEditor: React.FC<SupabaseTableEditorProps> = ({
  realTrades,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'WIN' | 'LOSS' | 'PENDING'>('ALL');
  const [sortBy, setSortBy] = useState<'time' | 'profit' | 'pnlPct'>('time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedRecord, setSelectedRecord] = useState<SnipingRecord | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Map real closedTrades if available, otherwise use sample records
  const allRecords = useMemo<SnipingRecord[]>(() => {
    if (realTrades && realTrades.length > 0) {
      return realTrades.map((t, idx) => ({
        id: t.id || `trade-${idx}`,
        timestamp: new Date(t.exitTimestamp || t.entryTimestamp || Date.now())
          .toISOString()
          .replace('T', ' ')
          .substring(0, 19),
        rawTimestamp: t.exitTimestamp || t.entryTimestamp || Date.now(),
        tokenSymbol: t.token?.symbol || 'UNKNOWN',
        tokenName: t.token?.name || 'Solana Memecoin',
        mint: t.token?.mint ? `${t.token.mint.slice(0, 4)}...${t.token.mint.slice(-4)}` : 'N/A',
        dex: ((t.token as any)?.dex || t.token?.platform || 'Raydium') as any,
        status: t.pnlPct >= 0 ? 'WIN' : 'LOSS',
        solInvested: t.solInvested || 0.1,
        entryPriceSol: t.entryPriceSol || 0,
        exitPriceSol: t.exitPriceSol || 0,
        pnlPct: t.pnlPct || 0,
        pnlSol: t.pnlSol || 0,
        exitReason: t.exitReason || 'TAKE_PROFIT',
        jitoTipSol: t.jitoTipSol || 0.002,
        holdDurationSec: t.holdDurationSec || 30,
      }));
    }
    return SAMPLE_SNIPING_DATA;
  }, [realTrades]);

  // Filter & Sort
  const filteredRecords = useMemo(() => {
    return allRecords
      .filter((rec) => {
        if (statusFilter !== 'ALL' && rec.status !== statusFilter) return false;
        if (!searchTerm) return true;
        const query = searchTerm.toLowerCase();
        return (
          rec.tokenSymbol.toLowerCase().includes(query) ||
          rec.tokenName.toLowerCase().includes(query) ||
          rec.mint.toLowerCase().includes(query) ||
          rec.exitReason.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortBy === 'time') diff = a.rawTimestamp - b.rawTimestamp;
        else if (sortBy === 'profit') diff = a.pnlSol - b.pnlSol;
        else if (sortBy === 'pnlPct') diff = a.pnlPct - b.pnlPct;
        return sortOrder === 'desc' ? -diff : diff;
      });
  }, [allRecords, statusFilter, searchTerm, sortBy, sortOrder]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    if (onRefresh) onRefresh();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const exportCsv = () => {
    const headers = ['ID,Timestamp,Token,Mint,Status,Invested_SOL,Entry_SOL,Exit_SOL,PnL_Pct,Profit_SOL,ExitReason\n'];
    const rows = filteredRecords.map(r =>
      `"${r.id}","${r.timestamp}","${r.tokenSymbol}","${r.mint}","${r.status}",${r.solInvested},${r.entryPriceSol},${r.exitPriceSol},${r.pnlPct},${r.pnlSol},"${r.exitReason}"`
    );
    const blob = new Blob([headers.join('') + rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `supabase_sniping_history_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col w-full h-full bg-[#121212] text-zinc-300 font-sans select-none border border-[#2e2e2e] rounded-xl overflow-hidden shadow-2xl">
      {/* Supabase Top Table Toolbar */}
      <div className="h-12 bg-[#171717] border-b border-[#2e2e2e] px-4 flex items-center justify-between gap-3 shrink-0">
        {/* Left: Schema & Table Badge */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#1c1c1c] border border-[#2e2e2e] text-xs font-mono text-zinc-400">
            <span className="text-zinc-500">schema</span>
            <span className="text-zinc-300 font-semibold">public</span>
          </div>
          <span className="text-zinc-600">/</span>
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#3ecf8e]/10 border border-[#3ecf8e]/30 text-xs font-mono text-[#3ecf8e] font-semibold">
            <TableIcon className="w-3.5 h-3.5" />
            <span>sniping_history</span>
          </div>
          <span className="text-[11px] font-mono text-zinc-500 hidden sm:inline">
            ({filteredRecords.length} rows)
          </span>
        </div>

        {/* Center & Right: Search, Filter, Sort, Actions */}
        <div className="flex items-center gap-2">
          {/* Quick Search */}
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search symbol, mint, reason..."
              className="bg-[#1c1c1c] border border-[#2e2e2e] focus:border-[#3ecf8e] text-xs text-zinc-200 placeholder-zinc-500 pl-8 pr-3 py-1 rounded-md outline-none transition-all w-36 sm:w-56"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 text-zinc-500 hover:text-zinc-300"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Status Filter Pill */}
          <div className="flex items-center bg-[#1c1c1c] border border-[#2e2e2e] rounded-md p-0.5 text-xs font-mono">
            {(['ALL', 'WIN', 'LOSS'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`px-2 py-0.5 rounded text-[11px] transition-all ${
                  statusFilter === filter
                    ? 'bg-[#2e2e2e] text-zinc-100 font-bold shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Sort Dropdown */}
          <button
            onClick={() => {
              if (sortBy === 'time') {
                setSortBy('profit');
              } else if (sortBy === 'profit') {
                setSortBy('pnlPct');
              } else {
                setSortBy('time');
              }
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#1c1c1c] hover:bg-[#242424] border border-[#2e2e2e] text-xs text-zinc-300 transition-colors"
            title="Toggle sort field (Time -> Profit -> PnL %)"
          >
            <ArrowUpDown className="w-3 h-3 text-[#3ecf8e]" />
            <span className="capitalize text-[11px] font-mono">{sortBy}</span>
          </button>

          {/* Sort Direction Toggle */}
          <button
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="px-2 py-1 rounded-md bg-[#1c1c1c] hover:bg-[#242424] border border-[#2e2e2e] text-[10px] font-mono text-zinc-400 uppercase"
            title="Sort Direction"
          >
            {sortOrder}
          </button>

          {/* Export CSV */}
          <button
            onClick={exportCsv}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#1c1c1c] hover:bg-[#242424] border border-[#2e2e2e] text-xs text-zinc-300 transition-colors"
            title="Export to CSV"
          >
            <Download className="w-3 h-3 text-zinc-400" />
            <span className="text-[11px] font-mono">CSV</span>
          </button>

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            className={`p-1.5 rounded-md bg-[#1c1c1c] hover:bg-[#242424] border border-[#2e2e2e] text-zinc-400 hover:text-[#3ecf8e] transition-colors ${
              isRefreshing ? 'animate-spin text-[#3ecf8e]' : ''
            }`}
            title="Refresh Table Data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Table Container with Sticky Header */}
      <div className="flex-1 overflow-auto bg-[#141414] relative">
        <table className="w-full text-left border-collapse font-sans text-xs">
          {/* Supabase Sticky Table Header */}
          <thead className="sticky top-0 z-20 bg-[#1a1a1a] border-b border-[#2e2e2e] text-[11px] font-mono text-zinc-400 uppercase tracking-wider select-none shadow-sm">
            <tr>
              <th className="py-2.5 px-3 w-12 text-center text-zinc-500 border-r border-[#262626]">#</th>
              <th className="py-2.5 px-4 border-r border-[#262626]">Timestamp (UTC)</th>
              <th className="py-2.5 px-4 border-r border-[#262626]">Token & Mint</th>
              <th className="py-2.5 px-3 border-r border-[#262626] text-center">Status</th>
              <th className="py-2.5 px-4 border-r border-[#262626] text-right">Harga Beli</th>
              <th className="py-2.5 px-4 border-r border-[#262626] text-right">Harga Jual</th>
              <th className="py-2.5 px-4 border-r border-[#262626] text-right">PnL (%)</th>
              <th className="py-2.5 px-4 border-r border-[#262626] text-right">Net Profit</th>
              <th className="py-2.5 px-4 border-r border-[#262626]">Exit Trigger</th>
              <th className="py-2.5 px-3 text-center">Action</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-[#222222] font-mono text-xs">
            {filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-zinc-500 font-sans">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <TableIcon className="w-8 h-8 text-zinc-600" />
                    <p className="text-sm">Tidak ada riwayat transaksi yang cocok dengan kriteria filter.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredRecords.map((record, index) => {
                const isWin = record.status === 'WIN';
                const isSelected = selectedRecord?.id === record.id;

                return (
                  <tr
                    key={record.id}
                    onClick={() => setSelectedRecord(record)}
                    className={`group transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#1e2923] border-l-2 border-l-[#3ecf8e]'
                        : 'hover:bg-[#1a1a1a]'
                    }`}
                  >
                    {/* Index */}
                    <td className="py-2.5 px-3 text-center text-zinc-500 text-[11px] border-r border-[#202020]">
                      {index + 1}
                    </td>

                    {/* Timestamp */}
                    <td className="py-2.5 px-4 text-zinc-400 whitespace-nowrap border-r border-[#202020]">
                      {record.timestamp}
                    </td>

                    {/* Token & Mint */}
                    <td className="py-2.5 px-4 whitespace-nowrap border-r border-[#202020]">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-zinc-100">${record.tokenSymbol}</span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#202020] text-zinc-400 border border-[#2b2b2b]">
                          {record.dex}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(record.mint, record.id);
                          }}
                          className="text-[11px] text-zinc-500 hover:text-zinc-300 flex items-center gap-0.5"
                          title="Salin Mint Address"
                        >
                          <span>{record.mint}</span>
                          {copiedId === record.id ? (
                            <Check className="w-2.5 h-2.5 text-[#3ecf8e]" />
                          ) : (
                            <Copy className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Status Pill Badge (Supabase Emerald / Red) */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap border-r border-[#202020]">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          isWin
                            ? 'bg-[#3ecf8e]/10 text-[#3ecf8e] border-[#3ecf8e]/30 shadow-[0_0_6px_rgba(62,207,142,0.15)]'
                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {record.status}
                      </span>
                    </td>

                    {/* Entry Price */}
                    <td className="py-2.5 px-4 text-right text-zinc-300 whitespace-nowrap border-r border-[#202020]">
                      {record.entryPriceSol.toFixed(7)} SOL
                    </td>

                    {/* Exit Price */}
                    <td className="py-2.5 px-4 text-right text-zinc-300 whitespace-nowrap border-r border-[#202020]">
                      {record.exitPriceSol.toFixed(7)} SOL
                    </td>

                    {/* PnL % */}
                    <td className="py-2.5 px-4 text-right whitespace-nowrap border-r border-[#202020]">
                      <span
                        className={`font-bold ${
                          record.pnlPct >= 0 ? 'text-[#3ecf8e]' : 'text-rose-400'
                        }`}
                      >
                        {record.pnlPct >= 0 ? `+${record.pnlPct.toFixed(1)}%` : `${record.pnlPct.toFixed(1)}%`}
                      </span>
                    </td>

                    {/* Net Profit SOL */}
                    <td className="py-2.5 px-4 text-right whitespace-nowrap border-r border-[#202020]">
                      <span
                        className={`font-bold ${
                          record.pnlSol >= 0 ? 'text-[#3ecf8e]' : 'text-rose-400'
                        }`}
                      >
                        {record.pnlSol >= 0 ? `+${record.pnlSol.toFixed(4)}` : record.pnlSol.toFixed(4)} SOL
                      </span>
                    </td>

                    {/* Exit Reason */}
                    <td className="py-2.5 px-4 text-zinc-400 whitespace-nowrap border-r border-[#202020]">
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-[#1e1e1e] border border-[#2b2b2b] text-zinc-300">
                        {record.exitReason}
                      </span>
                    </td>

                    {/* Inspector Action */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRecord(record);
                        }}
                        className="p-1 rounded bg-[#1c1c1c] hover:bg-[#282828] text-zinc-400 hover:text-[#3ecf8e] transition-colors border border-[#2e2e2e]"
                        title="Inspect Row JSON"
                      >
                        <Code className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Supabase Bottom Status Bar */}
      <div className="h-8 bg-[#171717] border-t border-[#2e2e2e] px-4 flex items-center justify-between text-[11px] font-mono text-zinc-500 shrink-0">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#3ecf8e]" />
            <span>Connection: Direct Postgres Replica</span>
          </span>
          <span>•</span>
          <span>Read-only Snapshot</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Total: {filteredRecords.length} items</span>
          <span>Page: 1 of 1</span>
        </div>
      </div>

      {/* Supabase Side Drawer: Row JSON Inspector */}
      {selectedRecord && (
        <div className="fixed inset-y-0 right-0 w-full sm:w-[440px] bg-[#171717] border-l border-[#2e2e2e] shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-200">
          {/* Drawer Header */}
          <div className="h-14 px-5 border-b border-[#2e2e2e] flex items-center justify-between bg-[#1c1c1c]">
            <div className="flex items-center gap-2">
              <FileJson className="w-4 h-4 text-[#3ecf8e]" />
              <div>
                <h3 className="text-xs font-bold text-zinc-100 font-mono">Row Inspector</h3>
                <p className="text-[10px] text-zinc-500 font-mono">id: {selectedRecord.id}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopy(JSON.stringify(selectedRecord, null, 2), 'drawer-copy')}
                className="px-2.5 py-1 rounded bg-[#252525] hover:bg-[#303030] text-xs font-mono text-zinc-300 flex items-center gap-1.5 border border-[#333333]"
              >
                {copiedId === 'drawer-copy' ? <Check className="w-3 h-3 text-[#3ecf8e]" /> : <Copy className="w-3 h-3" />}
                <span>{copiedId === 'drawer-copy' ? 'Copied' : 'Copy JSON'}</span>
              </button>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1 rounded text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Drawer Body: Structured properties + Raw JSON */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 font-mono text-xs">
            {/* Quick Metrics Badge */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded bg-[#1c1c1c] border border-[#2e2e2e]">
                <span className="text-[10px] text-zinc-500 uppercase block">Status</span>
                <span className={`text-sm font-bold ${selectedRecord.status === 'WIN' ? 'text-[#3ecf8e]' : 'text-rose-400'}`}>
                  {selectedRecord.status} ({selectedRecord.pnlPct >= 0 ? `+${selectedRecord.pnlPct.toFixed(1)}%` : `${selectedRecord.pnlPct.toFixed(1)}%`})
                </span>
              </div>
              <div className="p-2.5 rounded bg-[#1c1c1c] border border-[#2e2e2e]">
                <span className="text-[10px] text-zinc-500 uppercase block">Net Profit</span>
                <span className={`text-sm font-bold ${selectedRecord.pnlSol >= 0 ? 'text-[#3ecf8e]' : 'text-rose-400'}`}>
                  {selectedRecord.pnlSol >= 0 ? `+${selectedRecord.pnlSol.toFixed(4)}` : selectedRecord.pnlSol.toFixed(4)} SOL
                </span>
              </div>
            </div>

            {/* Properties List */}
            <div className="space-y-2 border border-[#2e2e2e] rounded-lg p-3 bg-[#141414]">
              <div className="flex justify-between py-1 border-b border-[#222222]">
                <span className="text-zinc-500">Token</span>
                <span className="text-zinc-200 font-semibold">${selectedRecord.tokenSymbol} ({selectedRecord.tokenName})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#222222]">
                <span className="text-zinc-500">Mint Address</span>
                <span className="text-zinc-200">{selectedRecord.mint}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#222222]">
                <span className="text-zinc-500">DEX / Platform</span>
                <span className="text-zinc-200">{selectedRecord.dex}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#222222]">
                <span className="text-zinc-500">Sol Invested</span>
                <span className="text-zinc-200">{selectedRecord.solInvested} SOL</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#222222]">
                <span className="text-zinc-500">Entry Price</span>
                <span className="text-zinc-200">{selectedRecord.entryPriceSol.toFixed(8)} SOL</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#222222]">
                <span className="text-zinc-500">Exit Price</span>
                <span className="text-zinc-200">{selectedRecord.exitPriceSol.toFixed(8)} SOL</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#222222]">
                <span className="text-zinc-500">Hold Duration</span>
                <span className="text-zinc-200">{selectedRecord.holdDurationSec}s</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-zinc-500">Exit Reason</span>
                <span className="text-emerald-400">{selectedRecord.exitReason}</span>
              </div>
            </div>

            {/* Raw JSON Code Block */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-zinc-400 font-bold uppercase">Record Document (JSON)</span>
              </div>
              <pre className="p-3 bg-[#0d0d0d] border border-[#262626] rounded-lg text-[11px] text-[#3ecf8e] overflow-x-auto leading-relaxed">
                {JSON.stringify(selectedRecord, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupabaseTableEditor;
