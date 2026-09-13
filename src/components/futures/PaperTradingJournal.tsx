'use client';

import React, { useState, useEffect } from 'react';
import {
  FlaskConical,
  Trophy,
  TrendingUp,
  TrendingDown,
  Plus,
  CheckCircle,
  XCircle,
  RotateCcw,
  Sparkles,
  DollarSign,
  Percent,
} from 'lucide-react';
import { PaperTradeRecord, PaperTradingSummary, BinanceFuturesSignal } from '../../types/futures';

interface PaperTradingJournalProps {
  signals?: BinanceFuturesSignal[];
  onOpenChart?: (symbol: string) => void;
}

const STORAGE_KEY = 'GROK_FUTURES_PAPER_TRADES_V1';

const INITIAL_MOCK_TRADES: PaperTradeRecord[] = [
  {
    id: 'paper-1',
    symbol: 'BTCUSDT',
    direction: 'LONG',
    entryPrice: 64200,
    currentPrice: 66500,
    stopLossPrice: 63100,
    takeProfit1Price: 65500,
    takeProfit2Price: 66800,
    takeProfit3Price: 68500,
    leverage: 5,
    marginUsd: 10,
    notionalUsd: 50,
    status: 'TP1_HIT',
    realizedPnlUsd: 1.01,
    unrealizedPnlUsd: 1.79,
    roiPct: 28.0,
    createdAt: Date.now() - 1000 * 60 * 60 * 6,
    strategyName: 'MACD Golden Momentum + Squeeze',
  },
  {
    id: 'paper-2',
    symbol: 'SOLUSDT',
    direction: 'LONG',
    entryPrice: 148.5,
    currentPrice: 154.2,
    stopLossPrice: 144.0,
    takeProfit1Price: 152.0,
    takeProfit2Price: 156.0,
    takeProfit3Price: 162.0,
    leverage: 5,
    marginUsd: 8,
    notionalUsd: 40,
    status: 'TP2_HIT',
    realizedPnlUsd: 1.54,
    unrealizedPnlUsd: 0.0,
    roiPct: 19.25,
    createdAt: Date.now() - 1000 * 60 * 60 * 18,
    strategyName: 'Bull Flag Breakout + RSI Bounce',
  },
  {
    id: 'paper-3',
    symbol: 'ETHUSDT',
    direction: 'SHORT',
    entryPrice: 3450,
    currentPrice: 3510,
    stopLossPrice: 3520,
    takeProfit1Price: 3380,
    takeProfit2Price: 3310,
    takeProfit3Price: 3200,
    leverage: 5,
    marginUsd: 10,
    notionalUsd: 50,
    status: 'SL_HIT',
    realizedPnlUsd: -1.01,
    unrealizedPnlUsd: 0.0,
    roiPct: -10.1,
    createdAt: Date.now() - 1000 * 60 * 60 * 28,
    strategyName: 'Order Block Rejection',
  },
];

export const PaperTradingJournal: React.FC<PaperTradingJournalProps> = ({
  signals = [],
  onOpenChart,
}) => {
  const [trades, setTrades] = useState<PaperTradeRecord[]>([]);
  const [selectedSignalId, setSelectedSignalId] = useState<string>('');

  // Load trades from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setTrades(JSON.parse(saved));
      } else {
        setTrades(INITIAL_MOCK_TRADES);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_MOCK_TRADES));
      }
    } catch {
      setTrades(INITIAL_MOCK_TRADES);
    }
  }, []);

  const saveTrades = (newTrades: PaperTradeRecord[]) => {
    setTrades(newTrades);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newTrades));
    } catch (err) {
      console.error('Failed to save paper trades:', err);
    }
  };

  // Add a new simulated trade from active signals
  const handleAddTradeFromSignal = () => {
    const sig = signals.find((s) => s.id === selectedSignalId) || signals[0];
    if (!sig) return;

    const marginUsd = 10;
    const lev = sig.leverage?.safe?.multiplier || 5;
    const notionalUsd = marginUsd * lev;

    const newRecord: PaperTradeRecord = {
      id: `paper-${Date.now()}`,
      symbol: sig.symbol,
      direction: sig.direction,
      entryPrice: sig.entryZone.current || (sig.entryZone.low + sig.entryZone.high) / 2,
      currentPrice: sig.entryZone.current || (sig.entryZone.low + sig.entryZone.high) / 2,
      stopLossPrice: sig.stopLoss.price,
      takeProfit1Price: sig.targets.tp1.price,
      takeProfit2Price: sig.targets.tp2.price,
      takeProfit3Price: sig.targets.tp3.price,
      leverage: lev,
      marginUsd,
      notionalUsd,
      status: 'OPEN',
      realizedPnlUsd: 0,
      unrealizedPnlUsd: 0,
      roiPct: 0,
      createdAt: Date.now(),
      strategyName: sig.strategy,
    };

    saveTrades([newRecord, ...trades]);
    setSelectedSignalId('');
  };

  // Status transitions
  const handleUpdateStatus = (
    id: string,
    newStatus: 'TP1_HIT' | 'TP2_HIT' | 'TP3_HIT' | 'SL_HIT' | 'CLOSED_MANUAL'
  ) => {
    const updated = trades.map((t) => {
      if (t.id !== id) return t;

      let pnl = 0;
      let roi = 0;
      if (newStatus === 'TP1_HIT') {
        pnl = t.notionalUsd * 0.5 * 0.02; // +2% profit on 50%
        roi = (pnl / t.marginUsd) * 100;
      } else if (newStatus === 'TP2_HIT') {
        pnl = t.notionalUsd * 0.8 * 0.04;
        roi = (pnl / t.marginUsd) * 100;
      } else if (newStatus === 'TP3_HIT') {
        pnl = t.notionalUsd * 1.0 * 0.07;
        roi = (pnl / t.marginUsd) * 100;
      } else if (newStatus === 'SL_HIT') {
        pnl = -t.notionalUsd * 0.02; // -2% max risk
        roi = (pnl / t.marginUsd) * 100;
      }

      return {
        ...t,
        status: newStatus,
        realizedPnlUsd: pnl,
        roiPct: roi,
        closedAt: Date.now(),
      };
    });

    saveTrades(updated);
  };

  const handleResetJournal = () => {
    if (window.confirm('Reset semua riwayat paper trading ke awal?')) {
      saveTrades(INITIAL_MOCK_TRADES);
    }
  };

  // Calculate Summary
  const closedTrades = trades.filter((t) => t.status !== 'OPEN');
  const wins = closedTrades.filter((t) => t.realizedPnlUsd > 0).length;
  const losses = closedTrades.filter((t) => t.realizedPnlUsd < 0).length;
  const winRate = closedTrades.length > 0 ? (wins / closedTrades.length) * 100 : 0;
  const totalPnl = trades.reduce((acc, t) => acc + t.realizedPnlUsd, 0);

  const grossWins = closedTrades
    .filter((t) => t.realizedPnlUsd > 0)
    .reduce((acc, t) => acc + t.realizedPnlUsd, 0);
  const grossLosses = Math.abs(
    closedTrades
      .filter((t) => t.realizedPnlUsd < 0)
      .reduce((acc, t) => acc + t.realizedPnlUsd, 0)
  );
  const profitFactor = grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? 9.99 : 0;

  return (
    <div className="bg-[#0b0e14] border border-purple-500/30 rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden font-sans">
      {/* Glow */}
      <div className="absolute top-0 right-1/4 w-56 h-56 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-white tracking-wide font-mono">
                JURNAL PAPER TRADING & PERFORMANCE TRACKER
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                Virtual Execution
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Uji ketangguhan sinyal AI tanpa risiko modal riil dengan data statistik transparan
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {signals.length > 0 && (
            <div className="flex items-center gap-1.5">
              <select
                value={selectedSignalId}
                onChange={(e) => setSelectedSignalId(e.target.value)}
                className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white font-mono"
              >
                <option value="">Pilih Sinyal AI Aktif...</option>
                {signals.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.symbol} ({s.direction}) - {s.strategy}
                  </option>
                ))}
              </select>
              <button
                onClick={handleAddTradeFromSignal}
                disabled={!selectedSignalId && signals.length === 0}
                className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-mono font-bold flex items-center gap-1 cursor-pointer transition-all shadow-md active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Simulasi</span>
              </button>
            </div>
          )}
          <button
            onClick={handleResetJournal}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white text-xs font-mono"
            title="Reset Jurnal"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
        <div className="bg-black/40 border border-white/10 p-2.5 rounded-xl">
          <div className="text-[10px] text-zinc-400 font-mono">Win Rate Sinyal:</div>
          <div className="text-lg sm:text-xl font-mono font-black text-emerald-400">
            {winRate.toFixed(1)}%
          </div>
          <div className="text-[9px] text-zinc-500 font-mono">
            {wins} Menang / {losses} Kalah
          </div>
        </div>

        <div className="bg-black/40 border border-white/10 p-2.5 rounded-xl">
          <div className="text-[10px] text-zinc-400 font-mono">Total PnL Simulasi:</div>
          <div
            className={`text-lg sm:text-xl font-mono font-black ${
              totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
          </div>
          <div className="text-[9px] text-zinc-500 font-mono">Saldo Awal: $100.00</div>
        </div>

        <div className="bg-black/40 border border-white/10 p-2.5 rounded-xl">
          <div className="text-[10px] text-zinc-400 font-mono">Profit Factor:</div>
          <div className="text-lg sm:text-xl font-mono font-black text-cyan-400">
            {profitFactor.toFixed(2)}
          </div>
          <div className="text-[9px] text-zinc-500 font-mono">Gross Gain / Loss</div>
        </div>

        <div className="bg-black/40 border border-white/10 p-2.5 rounded-xl">
          <div className="text-[10px] text-zinc-400 font-mono">Posisi Aktif (Open):</div>
          <div className="text-lg sm:text-xl font-mono font-black text-purple-400">
            {trades.filter((t) => t.status === 'OPEN').length}
          </div>
          <div className="text-[9px] text-zinc-500 font-mono">Dari {trades.length} Total Trade</div>
        </div>
      </div>

      {/* Trades Table */}
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/40">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="border-b border-white/10 bg-zinc-900/60 text-zinc-400 text-[10px]">
              <th className="p-2.5">PAIR & ARAH</th>
              <th className="p-2.5">STRATEGI</th>
              <th className="p-2.5">ENTRY / SL</th>
              <th className="p-2.5">MARGIN (LEV)</th>
              <th className="p-2.5">PNL (ROI)</th>
              <th className="p-2.5">STATUS</th>
              <th className="p-2.5 text-right">AKSI CEPAT</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {trades.map((t) => (
              <tr key={t.id} className="hover:bg-white/5 transition-colors">
                <td className="p-2.5">
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="text-white">{t.symbol}</span>
                    <span
                      className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                        t.direction === 'LONG'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {t.direction}
                    </span>
                  </div>
                </td>
                <td className="p-2.5 text-zinc-400 text-[11px] max-w-[150px] truncate">
                  {t.strategyName}
                </td>
                <td className="p-2.5 text-zinc-300">
                  <div>${t.entryPrice.toLocaleString()}</div>
                  <div className="text-[10px] text-rose-400">SL: ${t.stopLossPrice.toLocaleString()}</div>
                </td>
                <td className="p-2.5 text-zinc-400">
                  ${t.marginUsd} ({t.leverage}x)
                </td>
                <td className="p-2.5">
                  <div
                    className={`font-bold ${
                      t.realizedPnlUsd > 0
                        ? 'text-emerald-400'
                        : t.realizedPnlUsd < 0
                        ? 'text-rose-400'
                        : 'text-zinc-400'
                    }`}
                  >
                    {t.realizedPnlUsd > 0 ? '+' : ''}${t.realizedPnlUsd.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-zinc-500">
                    {t.roiPct > 0 ? '+' : ''}
                    {t.roiPct.toFixed(1)}%
                  </div>
                </td>
                <td className="p-2.5">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      t.status === 'OPEN'
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 animate-pulse'
                        : t.status.includes('TP')
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {t.status}
                  </span>
                </td>
                <td className="p-2.5 text-right">
                  {t.status === 'OPEN' ? (
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleUpdateStatus(t.id, 'TP1_HIT')}
                        className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500 hover:text-black text-[10px] cursor-pointer"
                        title="Simulasikan TP1 tercapai"
                      >
                        TP1
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(t.id, 'TP2_HIT')}
                        className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500 hover:text-black text-[10px] cursor-pointer"
                        title="Simulasikan TP2 tercapai"
                      >
                        TP2
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(t.id, 'SL_HIT')}
                        className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500 hover:text-white text-[10px] cursor-pointer"
                        title="Simulasikan SL tertabrak"
                      >
                        SL
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] text-zinc-500">Selesai</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
