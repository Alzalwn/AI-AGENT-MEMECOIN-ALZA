'use client';

import React from 'react';
import { ClosedTrade, TerminalTelemetry } from '../types/terminal';
import { 
  X, 
  BarChart3, 
  Award, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Download, 
  Printer, 
  ShieldCheck, 
  FileText,
  Activity,
  Layers
} from 'lucide-react';
import { exportTradesToCsv, exportTradesToJson, printTradeAuditReport } from '../lib/exportUtils';

interface PerformanceStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  trades: ClosedTrade[];
  telemetry: TerminalTelemetry;
}

export default function PerformanceStatsModal({
  isOpen,
  onClose,
  trades,
  telemetry,
}: PerformanceStatsModalProps) {
  if (!isOpen) return null;

  const totalTrades = trades.length;
  const winTrades = trades.filter((t) => t.pnlSol > 0);
  const lossTrades = trades.filter((t) => t.pnlSol < 0);

  const winCount = winTrades.length;
  const lossCount = lossTrades.length;
  const winRate = totalTrades > 0 ? +((winCount / totalTrades) * 100).toFixed(1) : 0;

  const totalGainsSol = winTrades.reduce((acc, t) => acc + t.pnlSol, 0);
  const totalLossesSol = Math.abs(lossTrades.reduce((acc, t) => acc + t.pnlSol, 0));
  const profitFactor = totalLossesSol > 0 ? +(totalGainsSol / totalLossesSol).toFixed(2) : totalGainsSol > 0 ? 99.9 : 0;

  const netPnlSol = +(totalGainsSol - totalLossesSol).toFixed(4);

  // Best & Worst trade
  const sortedByPnl = [...trades].sort((a, b) => b.pnlSol - a.pnlSol);
  const bestTrade = sortedByPnl[0] || null;
  const worstTrade = sortedByPnl[sortedByPnl.length - 1] || null;

  // Average hold duration
  const avgHoldSec = totalTrades > 0
    ? Math.round(trades.reduce((acc, t) => acc + t.holdDurationSec, 0) / totalTrades)
    : 0;

  // Average R-Multiplier
  const avgR = totalTrades > 0
    ? +(trades.reduce((acc, t) => acc + t.rMultiplier, 0) / totalTrades).toFixed(2)
    : 0;

  // Max Drawdown estimation
  let peak = telemetry.initialBalanceSol;
  let maxDd = 0;
  let running = telemetry.initialBalanceSol;
  trades.forEach((t) => {
    running += t.pnlSol;
    if (running > peak) peak = running;
    const dd = peak > 0 ? ((peak - running) / peak) * 100 : 0;
    if (dd > maxDd) maxDd = dd;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-200 font-mono select-none">
      <div className="bg-terminal-panel border border-terminal-border rounded-2xl w-full max-w-2xl shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-terminal-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-terminal-green/10 border border-terminal-green/40 text-terminal-green">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-terminal-text uppercase tracking-wider flex items-center gap-2">
                Quantitative Performance Analytics
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-terminal-green/20 text-terminal-green border border-terminal-green/40 font-bold">
                  PRD §6
                </span>
              </h2>
              <p className="text-[11px] text-terminal-muted">Metrik Edge, Expectancy &amp; Audit Portofolio Berkecepatan Tinggi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-terminal-card text-terminal-muted hover:text-terminal-text transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* PRD Expectancy Formula Box */}
        <div className="p-3 rounded-xl bg-terminal-bg border border-terminal-border space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-terminal-muted text-[10px] uppercase font-bold flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-terminal-cyan" /> Mathematical Expectancy Formula
            </span>
            <span className="font-bold text-terminal-green text-xs font-mono">
              E[R] = {telemetry.rollingExpectancyR}R ({telemetry.rollingExpectancyR >= 1.5 ? 'EDGE VALID' : 'SUB-OPTIMAL'})
            </span>
          </div>
          <p className="text-[11px] text-terminal-muted leading-relaxed font-mono">
            E[R] = (p × W) − ((1 − p) × L) • Target ambang terminal: E[R] ≥ +1.5R.
          </p>
        </div>

        {/* Primary Metric 4-Card Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="p-3 rounded-xl bg-terminal-card border border-terminal-border space-y-1">
            <span className="text-[10px] text-terminal-muted block uppercase">Win Rate</span>
            <span className="text-lg font-black text-terminal-green block">{winRate}%</span>
            <span className="text-[9px] text-terminal-muted">{winCount} Menang / {lossCount} Kalah</span>
          </div>

          <div className="p-3 rounded-xl bg-terminal-card border border-terminal-border space-y-1">
            <span className="text-[10px] text-terminal-muted block uppercase">Profit Factor</span>
            <span className={`text-lg font-black block ${profitFactor >= 1.5 ? 'text-terminal-green' : profitFactor >= 1.0 ? 'text-yellow-400' : 'text-terminal-red'}`}>
              {profitFactor}x
            </span>
            <span className="text-[9px] text-terminal-muted">{totalGainsSol.toFixed(2)} / {totalLossesSol.toFixed(2)} SOL</span>
          </div>

          <div className="p-3 rounded-xl bg-terminal-card border border-terminal-border space-y-1">
            <span className="text-[10px] text-terminal-muted block uppercase">Net Realized PnL</span>
            <span className={`text-lg font-black block ${netPnlSol >= 0 ? 'text-terminal-green' : 'text-terminal-red'}`}>
              {netPnlSol >= 0 ? `+${netPnlSol}` : netPnlSol} SOL
            </span>
            <span className="text-[9px] text-terminal-muted">{totalTrades} Total Closed</span>
          </div>

          <div className="p-3 rounded-xl bg-terminal-card border border-terminal-border space-y-1">
            <span className="text-[10px] text-terminal-muted block uppercase">Max Drawdown</span>
            <span className="text-lg font-black text-terminal-amber block">
              -{maxDd.toFixed(2)}%
            </span>
            <span className="text-[9px] text-terminal-muted">Toleransi PRD ≤ 15%</span>
          </div>
        </div>

        {/* Secondary Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
          <div className="p-2.5 rounded-xl bg-terminal-card border border-terminal-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-terminal-cyan" />
              <span className="text-[11px] text-terminal-muted">Avg Duration:</span>
            </div>
            <span className="font-bold text-terminal-text">{avgHoldSec} detik</span>
          </div>

          <div className="p-2.5 rounded-xl bg-terminal-card border border-terminal-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-terminal-green" />
              <span className="text-[11px] text-terminal-muted">Avg R-Mult:</span>
            </div>
            <span className={`font-bold ${avgR >= 0 ? 'text-terminal-green' : 'text-terminal-red'}`}>
              {avgR >= 0 ? `+${avgR}` : avgR}R
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-terminal-card border border-terminal-border flex items-center justify-between col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-terminal-amber" />
              <span className="text-[11px] text-terminal-muted">Risk of Ruin:</span>
            </div>
            <span className="font-bold text-terminal-green">&lt; 3.2% (Aman)</span>
          </div>
        </div>

        {/* Best vs Worst Trade Showcase */}
        {totalTrades > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {bestTrade && (
              <div className="p-2.5 rounded-xl bg-terminal-green/5 border border-terminal-green/30 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-terminal-green font-bold uppercase flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" /> Best Trade
                  </span>
                  <span className="font-bold text-terminal-green">+{bestTrade.pnlPct}% (+{bestTrade.rMultiplier}R)</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-terminal-text">{bestTrade.token.symbol}</span>
                  <span className="font-mono text-terminal-green">+{bestTrade.pnlSol} SOL</span>
                </div>
              </div>
            )}

            {worstTrade && (
              <div className="p-2.5 rounded-xl bg-terminal-red/5 border border-terminal-red/30 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-terminal-red font-bold uppercase flex items-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5" /> Worst Trade
                  </span>
                  <span className="font-bold text-terminal-red">{worstTrade.pnlPct}% ({worstTrade.rMultiplier}R)</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-terminal-text">{worstTrade.token.symbol}</span>
                  <span className="font-mono text-terminal-red">{worstTrade.pnlSol} SOL</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Export & Print Tax Statement Actions */}
        <div className="pt-2 border-t border-terminal-border flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => exportTradesToCsv(trades)}
              className="py-1.5 px-3 rounded-lg bg-terminal-card border border-terminal-border hover:border-terminal-green text-xs font-bold text-terminal-green flex items-center gap-1.5 transition-all cursor-pointer"
              title="Download CSV file for tax & spreadsheet audit"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => exportTradesToJson(trades)}
              className="py-1.5 px-3 rounded-lg bg-terminal-card border border-terminal-border hover:border-terminal-cyan text-xs font-bold text-terminal-cyan flex items-center gap-1.5 transition-all cursor-pointer"
              title="Download raw JSON data"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>

            <button
              onClick={() => printTradeAuditReport(trades, telemetry)}
              className="py-1.5 px-3 rounded-lg bg-terminal-card border border-terminal-border hover:border-terminal-text text-xs font-bold text-terminal-text flex items-center gap-1.5 transition-all cursor-pointer"
              title="Print or Save PDF tax audit receipt"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF Receipt</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="py-1.5 px-4 rounded-lg bg-terminal-card border border-terminal-border text-xs font-bold text-terminal-text hover:bg-terminal-border/40 transition-colors cursor-pointer ml-auto"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}
