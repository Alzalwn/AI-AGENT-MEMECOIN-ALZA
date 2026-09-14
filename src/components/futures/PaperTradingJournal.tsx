'use client';

import React, { useState, useEffect } from 'react';
import {
  FlaskConical,
  Plus,
  RotateCcw,
  KeyRound,
  RefreshCw,
  Wallet,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { PaperTradeRecord, BinanceFuturesSignal } from '../../types/futures';
import {
  BinanceConnectModal,
  BINANCE_STORAGE_KEY,
  SavedBinanceConfig,
} from './BinanceConnectModal';
import { BinanceUserTrade } from '../../lib/binanceAuthClient';

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

  // Binance Connection State
  const [isBinanceModalOpen, setIsBinanceModalOpen] = useState(false);
  const [binanceConfig, setBinanceConfig] = useState<SavedBinanceConfig | null>(null);
  const [isSyncingBinance, setIsSyncingBinance] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

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

  // Load Binance Config
  const refreshBinanceConfig = () => {
    try {
      const saved = localStorage.getItem(BINANCE_STORAGE_KEY);
      if (saved) {
        setBinanceConfig(JSON.parse(saved));
      } else {
        setBinanceConfig(null);
      }
    } catch {
      setBinanceConfig(null);
    }
  };

  useEffect(() => {
    refreshBinanceConfig();
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

  // Sync recent trades from Binance Account
  const handleSyncBinanceTrades = async () => {
    if (!binanceConfig?.apiKey || !binanceConfig?.apiSecret) {
      setIsBinanceModalOpen(true);
      return;
    }

    setIsSyncingBinance(true);
    setSyncFeedback(null);

    try {
      const res = await fetch('/api/futures/binance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sync_trades',
          apiKey: binanceConfig.apiKey,
          apiSecret: binanceConfig.apiSecret,
          isTestnet: binanceConfig.isTestnet,
          limit: 30,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mengambil riwayat transaksi dari Binance');
      }

      const fetchedTrades: BinanceUserTrade[] = data.trades || [];
      if (fetchedTrades.length === 0) {
        setSyncFeedback({
          type: 'success',
          message: 'Koneksi Binance aktif, namun belum ada riwayat transaksi.',
        });
        return;
      }

      // Convert Binance User Trade to PaperTradeRecord format
      const converted: PaperTradeRecord[] = fetchedTrades.map((bt) => {
        const price = parseFloat(bt.price) || 0;
        const qty = parseFloat(bt.qty) || 0;
        const realizedPnl = parseFloat(bt.realizedPnl) || 0;
        const notional = price * qty;
        const margin = notional / 5; // Estimasi default leverage 5x
        const roi = margin > 0 ? (realizedPnl / margin) * 100 : 0;

        let status: PaperTradeRecord['status'] = 'CLOSED_MANUAL';
        if (realizedPnl > 0) status = 'TP1_HIT';
        else if (realizedPnl < 0) status = 'SL_HIT';

        return {
          id: `binance-${bt.id}`,
          symbol: bt.symbol,
          direction: bt.side === 'BUY' ? 'LONG' : 'SHORT',
          entryPrice: price,
          currentPrice: price,
          stopLossPrice: price * 0.98,
          takeProfit1Price: price * 1.02,
          takeProfit2Price: price * 1.04,
          takeProfit3Price: price * 1.06,
          leverage: 5,
          marginUsd: Number(margin.toFixed(2)),
          notionalUsd: Number(notional.toFixed(2)),
          status,
          realizedPnlUsd: Number(realizedPnl.toFixed(2)),
          unrealizedPnlUsd: 0,
          roiPct: Number(roi.toFixed(2)),
          createdAt: bt.time,
          closedAt: bt.time,
          strategyName: `Binance ${binanceConfig.isTestnet ? 'Testnet' : 'Live'} Execution`,
        };
      });

      // Avoid duplicates based on ID
      const existingIds = new Set(trades.map((t) => t.id));
      const newItems = converted.filter((item) => !existingIds.has(item.id));

      if (newItems.length > 0) {
        const merged = [...newItems, ...trades];
        saveTrades(merged);
        setSyncFeedback({
          type: 'success',
          message: `Berhasil mengimpor ${newItems.length} riwayat trade dari akun Binance!`,
        });
      } else {
        setSyncFeedback({
          type: 'success',
          message: 'Semua transaksi Binance sudah tersinkronisasi ke jurnal.',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal sinkronisasi';
      setSyncFeedback({
        type: 'error',
        message: msg,
      });
    } finally {
      setIsSyncingBinance(false);
      setTimeout(() => setSyncFeedback(null), 6000);
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
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm sm:text-base font-black text-white tracking-wide font-mono">
                JURNAL PAPER TRADING & PERFORMANCE TRACKER
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                Virtual Execution
              </span>
              {binanceConfig?.apiKey ? (
                <button
                  onClick={() => setIsBinanceModalOpen(true)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                    binanceConfig.isTestnet
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25'
                      : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25'
                  }`}
                  title="Klik untuk mengelola kredensial Binance"
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      binanceConfig.isTestnet ? 'bg-amber-400' : 'bg-emerald-400'
                    }`}
                  ></span>
                  <span>Binance {binanceConfig.isTestnet ? 'Testnet' : 'Live'}</span>
                  {binanceConfig.walletBalance && (
                    <span className="text-white">(${binanceConfig.walletBalance})</span>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => setIsBinanceModalOpen(true)}
                  className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-amber-500/50 hover:text-amber-300 flex items-center gap-1 transition-all cursor-pointer"
                >
                  <KeyRound className="w-3 h-3 text-amber-400" />
                  <span>Hubungkan Binance</span>
                </button>
              )}
            </div>
            <p className="text-xs text-zinc-400">
              Uji ketangguhan sinyal AI tanpa risiko modal riil atau sinkronkan riwayat transaksi langsung dari Binance
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sync Binance Button */}
          <button
            onClick={handleSyncBinanceTrades}
            disabled={isSyncingBinance}
            className="px-3 py-1 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
            title={
              binanceConfig?.apiKey
                ? 'Ambil riwayat transaksi terbaru dari akun Binance'
                : 'Hubungkan API Key Binance terlebih dahulu'
            }
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncingBinance ? 'animate-spin' : ''}`} />
            <span>{isSyncingBinance ? 'Syncing...' : 'Sync Binance'}</span>
          </button>

          {/* Quick Signal Sim */}
          {signals.length > 0 && (
            <div className="flex items-center gap-1.5">
              <select
                value={selectedSignalId}
                onChange={(e) => setSelectedSignalId(e.target.value)}
                className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 py-1 text-xs text-white font-mono max-w-[170px] truncate"
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

      {/* Sync Feedback Toast Banner */}
      {syncFeedback && (
        <div
          className={`mb-4 p-2.5 rounded-xl border text-xs font-mono flex items-center justify-between transition-all ${
            syncFeedback.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-500/15 border-rose-500/40 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{syncFeedback.message}</span>
          </div>
          <button
            onClick={() => setSyncFeedback(null)}
            className="text-zinc-400 hover:text-white text-[11px]"
          >
            ✕
          </button>
        </div>
      )}

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
          <div className="text-[10px] text-zinc-400 font-mono">Total PnL Tercatat:</div>
          <div
            className={`text-lg sm:text-xl font-mono font-black ${
              totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
          </div>
          <div className="text-[9px] text-zinc-500 font-mono">
            {binanceConfig?.walletBalance
              ? `Saldo Binance: $${binanceConfig.walletBalance}`
              : 'Saldo Awal Simulasi: $100.00'}
          </div>
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
              <th className="p-2.5">STRATEGI / SUMBER</th>
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
                    <button
                      onClick={() => onOpenChart?.(t.symbol)}
                      className="text-white hover:text-cyan-400 hover:underline flex items-center gap-1"
                    >
                      {t.symbol}
                      <ExternalLink className="w-3 h-3 text-zinc-500" />
                    </button>
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
                <td className="p-2.5 text-zinc-400 text-[11px] max-w-[160px] truncate">
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

      {/* Binance Connect Modal */}
      <BinanceConnectModal
        isOpen={isBinanceModalOpen}
        onClose={() => {
          setIsBinanceModalOpen(false);
          refreshBinanceConfig();
        }}
        onConnectionSuccess={() => {
          refreshBinanceConfig();
        }}
      />
    </div>
  );
};
