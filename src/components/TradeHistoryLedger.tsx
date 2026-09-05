'use client';

import React, { useState } from 'react';
import { Download, History, TrendingUp, TrendingDown, Clock, ShieldCheck, FileSpreadsheet, FileCode, Check, Share2 } from 'lucide-react';
import { ClosedTrade } from '../types/terminal';

interface TradeHistoryLedgerProps {
  trades: ClosedTrade[];
  onClearTrades?: () => void;
  onSelectTradeForShare?: (trade: ClosedTrade) => void;
}

export default function TradeHistoryLedger({
  trades,
  onClearTrades,
  onSelectTradeForShare,
}: TradeHistoryLedgerProps) {
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  // Compute aggregate stats
  const totalTrades = trades.length;
  const wins = trades.filter((t) => t.pnlSol > 0).length;
  const losses = totalTrades - wins;
  const winRate = totalTrades > 0 ? +((wins / totalTrades) * 100).toFixed(1) : 0;
  const totalRealizedPnlSol = +trades.reduce((acc, t) => acc + t.pnlSol, 0).toFixed(4);
  const avgHoldSec = totalTrades > 0 ? Math.round(trades.reduce((acc, t) => acc + t.holdDurationSec, 0) / totalTrades) : 0;

  // Export to CSV
  const handleExportCsv = () => {
    if (trades.length === 0) return;
    const headers = ['ID', 'Token Symbol', 'Token Mint', 'Entry Price (SOL)', 'Exit Price (SOL)', 'SOL Invested', 'PnL (SOL)', 'PnL (%)', 'R-Multiplier', 'Hold Duration (sec)', 'Exit Reason', 'Entry Time', 'Exit Time', 'Jito Tip (SOL)'];
    const rows = trades.map((t) => [
      t.id,
      t.token.symbol,
      t.token.mint,
      t.entryPriceSol,
      t.exitPriceSol,
      t.solInvested,
      t.pnlSol,
      t.pnlPct,
      t.rMultiplier,
      t.holdDurationSec,
      `"${t.exitReason}"`,
      new Date(t.entryTimestamp).toISOString(),
      new Date(t.exitTimestamp).toISOString(),
      t.jitoTipSol,
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `grok_trencher_trades_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setDownloadSuccess('CSV Exported');
    setTimeout(() => setDownloadSuccess(null), 2500);
  };

  // Export to JSON
  const handleExportJson = () => {
    if (trades.length === 0) return;
    const jsonString = JSON.stringify(trades, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `grok_trencher_trades_${Date.now()}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setDownloadSuccess('JSON Exported');
    setTimeout(() => setDownloadSuccess(null), 2500);
  };

  return (
    <div className="bg-terminal-panel border border-terminal-border rounded-xl p-3.5 space-y-3 shadow-xl font-mono select-none">
      
      {/* Header & Action Bar */}
      <div className="flex items-center justify-between border-b border-terminal-border pb-2.5 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-terminal-green" />
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-terminal-text flex items-center gap-2">
              Historical Trade Ledger &amp; Quant Log
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-terminal-card border border-terminal-border text-terminal-muted">
                {totalTrades} TRADES CLOSED
              </span>
            </h3>
            <p className="text-[10px] text-terminal-muted">
              Buku besar eksekusi real-time dengan metrik expectancy $E[R]$ dan kalkulasi PnL bersih
            </p>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          {downloadSuccess && (
            <span className="text-[10px] text-terminal-green flex items-center gap-1">
              <Check className="w-3 h-3" /> {downloadSuccess}
            </span>
          )}
          <button
            onClick={handleExportCsv}
            disabled={trades.length === 0}
            className="px-2.5 py-1 rounded bg-terminal-card hover:bg-terminal-card/80 border border-terminal-border text-terminal-text text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title="Download CSV Spreadsheet"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-terminal-green" /> Export CSV
          </button>
          <button
            onClick={handleExportJson}
            disabled={trades.length === 0}
            className="px-2.5 py-1 rounded bg-terminal-card hover:bg-terminal-card/80 border border-terminal-border text-terminal-text text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            title="Download JSON File"
          >
            <FileCode className="w-3.5 h-3.5 text-terminal-cyan" /> JSON
          </button>
        </div>
      </div>

      {/* Aggregate Stats Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div className="p-2 rounded-lg bg-terminal-card border border-terminal-border">
          <span className="text-[10px] text-terminal-muted block">TOTAL REALIZED PNL</span>
          <span className={`font-bold text-sm ${totalRealizedPnlSol >= 0 ? 'text-terminal-green glow-green' : 'text-terminal-red'}`}>
            {totalRealizedPnlSol >= 0 ? '+' : ''}{totalRealizedPnlSol} SOL
          </span>
        </div>
        <div className="p-2 rounded-lg bg-terminal-card border border-terminal-border">
          <span className="text-[10px] text-terminal-muted block">WINRATE (W / L)</span>
          <span className="font-bold text-sm text-terminal-cyan">
            {winRate}% ({wins}W / {losses}L)
          </span>
        </div>
        <div className="p-2 rounded-lg bg-terminal-card border border-terminal-border">
          <span className="text-[10px] text-terminal-muted block">AVG HOLD DURATION</span>
          <span className="font-bold text-sm text-terminal-text">
            {avgHoldSec} detik
          </span>
        </div>
        <div className="p-2 rounded-lg bg-terminal-card border border-terminal-border">
          <span className="text-[10px] text-terminal-muted block">JITO TIP ALLOCATION</span>
          <span className="font-bold text-sm text-terminal-amber">
            0.000050 SOL / tx
          </span>
        </div>
      </div>

      {/* Trades Table */}
      <div className="overflow-x-auto max-h-[260px] overflow-y-auto scrollbar-thin border border-terminal-border rounded-lg">
        {trades.length === 0 ? (
          <div className="p-8 text-center text-terminal-muted text-xs">
            Belum ada trade yang ditutup. Posisi aktif yang ditutup akan otomatis dicatat di sini.
          </div>
        ) : (
          <table className="w-full text-left text-[11px]">
            <thead className="bg-terminal-card text-terminal-muted text-[10px] uppercase sticky top-0 border-b border-terminal-border">
              <tr>
                <th className="p-2">Waktu</th>
                <th className="p-2">Token</th>
                <th className="p-2">Entry</th>
                <th className="p-2">Exit</th>
                <th className="p-2">Durasi</th>
                <th className="p-2">PnL (%)</th>
                <th className="p-2">PnL (SOL)</th>
                <th className="p-2">R-Mult</th>
                <th className="p-2">Alasan Penutupan</th>
                <th className="p-2 text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-terminal-border/50">
              {trades.map((trade) => {
                const isWin = trade.pnlSol >= 0;
                return (
                  <tr key={trade.id} className="hover:bg-terminal-card/50 transition-colors">
                    <td className="p-2 text-terminal-muted text-[10px]">
                      {new Date(trade.exitTimestamp).toLocaleTimeString()}
                    </td>
                    <td className="p-2 font-bold text-terminal-text flex items-center gap-1.5">
                      {trade.token.iconUrl ? (
                        <img src={trade.token.iconUrl} alt={trade.token.symbol} className="w-4 h-4 rounded-full object-cover" />
                      ) : (
                        <span className="w-4 h-4 rounded-full bg-terminal-border flex items-center justify-center text-[8px]">
                          {trade.token.symbol.slice(0, 2)}
                        </span>
                      )}
                      <span>{trade.token.symbol}</span>
                    </td>
                    <td className="p-2 font-mono text-terminal-muted">{trade.entryPriceSol}</td>
                    <td className="p-2 font-mono text-terminal-text">{trade.exitPriceSol}</td>
                    <td className="p-2 text-terminal-muted">{trade.holdDurationSec}s</td>
                    <td className={`p-2 font-bold ${isWin ? 'text-terminal-green' : 'text-terminal-red'}`}>
                      {trade.pnlPct >= 0 ? '+' : ''}{trade.pnlPct}%
                    </td>
                    <td className={`p-2 font-bold font-mono ${isWin ? 'text-terminal-green' : 'text-terminal-red'}`}>
                      {trade.pnlSol >= 0 ? '+' : ''}{trade.pnlSol} SOL
                    </td>
                    <td className="p-2 font-bold text-terminal-cyan">
                      +{trade.rMultiplier}R
                    </td>
                    <td className="p-2 text-[10px] text-terminal-muted truncate max-w-[150px]">
                      {trade.exitReason}
                    </td>
                    <td className="p-2 text-center">
                      <button
                        onClick={() => onSelectTradeForShare?.(trade)}
                        className="p-1 rounded bg-terminal-card border border-terminal-border hover:border-terminal-green text-terminal-muted hover:text-terminal-green transition-colors cursor-pointer"
                        title="Generate PnL Share Card"
                      >
                        <Share2 className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}
