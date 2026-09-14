'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  XCircle,
  KeyRound,
  ExternalLink,
  Flame,
  CheckCircle2,
  Clock,
  Zap,
} from 'lucide-react';
import { BinancePositionRisk } from '@/lib/binanceAuthClient';
import { BINANCE_STORAGE_KEY, SavedBinanceConfig, BinanceConnectModal } from './BinanceConnectModal';
import { formatFuturesPrice } from '@/engine/futuresSignalEngine';

interface LivePositionTrackerProps {
  onOpenChart?: (symbol: string) => void;
}

export const LivePositionTracker: React.FC<LivePositionTrackerProps> = ({ onOpenChart }) => {
  const [positions, setPositions] = useState<BinancePositionRisk[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState<boolean>(false);
  const [config, setConfig] = useState<SavedBinanceConfig | null>(null);

  // Close Position Modal State
  const [closingSymbol, setClosingSymbol] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState<boolean>(false);
  const [closeSuccessMsg, setCloseSuccessMsg] = useState<string | null>(null);

  // Load config
  const loadConfig = useCallback(() => {
    try {
      const raw = localStorage.getItem(BINANCE_STORAGE_KEY);
      if (raw) {
        setConfig(JSON.parse(raw));
      } else {
        setConfig(null);
      }
    } catch {
      setConfig(null);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const fetchPositions = useCallback(async () => {
    if (!config || !config.apiKey || !config.apiSecret) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/futures/binance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_positions',
          apiKey: config.apiKey,
          apiSecret: config.apiSecret,
          isTestnet: config.isTestnet,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mengambil data posisi Binance');
      }

      setPositions(data.positions || []);
      setLastSyncTime(new Date());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Koneksi error');
    } finally {
      setIsLoading(false);
    }
  }, [config]);

  // Polling interval 5s
  useEffect(() => {
    if (!config) return;
    fetchPositions();

    if (!autoRefresh) return;
    const timer = setInterval(() => {
      fetchPositions();
    }, 5000);

    return () => clearInterval(timer);
  }, [config, autoRefresh, fetchPositions]);

  // Handle Market Close Position
  const handleExecuteClose = async (symbol: string) => {
    if (!config) return;
    setIsClosing(true);
    setError(null);
    setCloseSuccessMsg(null);

    try {
      const res = await fetch('/api/futures/binance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'close_position',
          symbol,
          apiKey: config.apiKey,
          apiSecret: config.apiSecret,
          isTestnet: config.isTestnet,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `Gagal menutup posisi ${symbol}`);
      }

      setCloseSuccessMsg(`Posisi ${symbol} berhasil ditutup pada harga pasar.`);
      setClosingSymbol(null);
      // Refresh positions
      await fetchPositions();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menutup posisi');
    } finally {
      setIsClosing(false);
    }
  };

  // Aggregated Stats
  const totalUnrealizedPnl = positions.reduce((sum, p) => sum + parseFloat(p.unRealizedProfit || '0'), 0);
  const totalMarginUsed = positions.reduce((sum, p) => sum + parseFloat(p.isolatedMargin || '0'), 0);
  const isOverallProfit = totalUnrealizedPnl >= 0;

  if (!config) {
    return (
      <div className="bg-[#0b0e14]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-6 text-center font-sans shadow-2xl">
        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mx-auto mb-3 text-cyan-400">
          <KeyRound className="w-6 h-6 animate-pulse" />
        </div>
        <h4 className="text-sm font-black font-mono text-zinc-100 uppercase tracking-wider mb-1">
          Koneksikan API Binance Futures Anda
        </h4>
        <p className="text-xs text-zinc-400 max-w-md mx-auto mb-4">
          Untuk memantau posisi aktif (Live P&L), margin health, dan melikuidasi posisi instan langsung dari terminal ini, hubungkan API Key Anda (Read + Trade).
        </p>
        <button
          onClick={() => setIsConnectModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-mono font-bold text-xs shadow-lg cursor-pointer transition-all active:scale-95"
        >
          Hubungkan API Binance Sekarang
        </button>

        <BinanceConnectModal
          isOpen={isConnectModalOpen}
          onClose={() => setIsConnectModalOpen(false)}
          onConnectionSuccess={() => {
            loadConfig();
            setIsConnectModalOpen(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="bg-[#0b0e14]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 sm:p-5 shadow-2xl font-sans">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black font-mono text-zinc-100 uppercase tracking-wider">
                Live Positions &amp; P&amp;L Radar
              </h3>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                config.isTestnet
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}>
                {config.isTestnet ? 'TESTNET' : 'MAINNET LIVE'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
              <Clock className="w-3 h-3 text-zinc-500" />
              Sinkronisasi tiap 5s · Terakhir: {lastSyncTime ? lastSyncTime.toLocaleTimeString('id-ID') : 'Memuat...'}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
              autoRefresh
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800'
            }`}
          >
            Auto 5s: {autoRefresh ? 'ON' : 'OFF'}
          </button>
          <button
            onClick={fetchPositions}
            disabled={isLoading}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-700/80 hover:bg-zinc-800 text-zinc-200 transition-colors cursor-pointer"
            title="Refresh Manual"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
          <button
            onClick={() => setIsConnectModalOpen(true)}
            className="px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700/80 text-xs font-mono text-zinc-300 hover:text-white cursor-pointer"
          >
            Kunci API
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-4">
        {/* Total Floating PnL */}
        <div className={`p-3.5 rounded-xl border ${
          isOverallProfit
            ? 'bg-emerald-950/20 border-emerald-500/30'
            : 'bg-red-950/20 border-red-500/30'
        }`}>
          <span className="text-[11px] font-mono text-zinc-400 block mb-1">
            Total Floating UnPnL
          </span>
          <div className="flex items-baseline gap-2">
            <span className={`text-xl font-mono font-black ${
              isOverallProfit ? 'text-emerald-400' : 'text-red-400'
            }`}>
              {totalUnrealizedPnl >= 0 ? '+' : ''}${totalUnrealizedPnl.toFixed(2)} USD
            </span>
            {isOverallProfit ? (
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-400" />
            )}
          </div>
        </div>

        {/* Total Active Positions */}
        <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/5">
          <span className="text-[11px] font-mono text-zinc-400 block mb-1">
            Posisi Terbuka Aktif
          </span>
          <span className="text-xl font-mono font-black text-cyan-400">
            {positions.length} Pasangan
          </span>
        </div>

        {/* Total Margin Used */}
        <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-white/5">
          <span className="text-[11px] font-mono text-zinc-400 block mb-1">
            Margin Terpakai (Notional)
          </span>
          <span className="text-xl font-mono font-black text-zinc-200">
            ${totalMarginUsed.toFixed(2)} USD
          </span>
        </div>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="mb-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-mono flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {closeSuccessMsg && (
        <div className="mb-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{closeSuccessMsg}</span>
        </div>
      )}

      {/* Positions Table / Cards */}
      {positions.length === 0 ? (
        <div className="py-10 text-center border border-dashed border-white/10 rounded-xl">
          <ShieldCheck className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
          <p className="text-xs font-mono text-zinc-400">
            Tidak ada posisi terbuka di akun Binance Futures Anda saat ini.
          </p>
          <span className="text-[11px] text-zinc-600 block mt-1">
            Modal Anda aman dan tidak ada risiko margin berjalan.
          </span>
        </div>
      ) : (
        <div className="space-y-3">
          {positions.map((pos) => {
            const amt = parseFloat(pos.positionAmt);
            const isLong = amt > 0;
            const entryPrice = parseFloat(pos.entryPrice);
            const markPrice = parseFloat(pos.markPrice);
            const liqPrice = parseFloat(pos.liquidationPrice);
            const unPnl = parseFloat(pos.unRealizedProfit);
            const leverage = pos.leverage;
            const isProfit = unPnl >= 0;

            // Distance to Liq
            const distToLiqPct = liqPrice > 0 && markPrice > 0
              ? Math.abs(((markPrice - liqPrice) / markPrice) * 100)
              : 999;
            const isLiqCritical = distToLiqPct < 15;

            // SOP Rule #1 Compliance Check (ISOLATED vs CROSSED)
            const isIsolated = pos.marginType.toLowerCase() === 'isolated';

            return (
              <div
                key={pos.symbol}
                className="bg-zinc-900/80 border border-white/10 hover:border-white/20 rounded-xl p-4 transition-all"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  {/* Symbol & Direction Badge */}
                  <div className="flex items-center gap-3">
                    <div className={`px-2.5 py-1 rounded-lg font-mono font-black text-xs ${
                      isLong
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-red-500/20 text-red-300 border border-red-500/40'
                    }`}>
                      {isLong ? '🟢 LONG' : '🔴 SHORT'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sm text-white">
                          {pos.symbol}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
                          {leverage}x
                        </span>
                        {!isIsolated && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-red-500/20 text-red-300 border border-red-500/40 flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3" />
                            CROSS (Langgar SOP!)
                          </span>
                        )}
                        {isIsolated && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            ISOLATED
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-zinc-400 font-mono">
                        Ukuran: {Math.abs(amt)} (Notional: ${Math.abs(parseFloat(pos.notional)).toFixed(2)})
                      </span>
                    </div>
                  </div>

                  {/* Price Matrix */}
                  <div className="grid grid-cols-3 gap-3 text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-zinc-500 block">ENTRY PRICE</span>
                      <span className="text-zinc-200 font-bold">${formatFuturesPrice(entryPrice)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block">MARK PRICE</span>
                      <span className="text-cyan-300 font-bold">${formatFuturesPrice(markPrice)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-zinc-500 block">LIQ PRICE</span>
                      <span className={`font-bold ${isLiqCritical ? 'text-red-400 animate-pulse' : 'text-zinc-400'}`}>
                        {liqPrice > 0 ? `$${formatFuturesPrice(liqPrice)}` : 'N/A'}
                      </span>
                    </div>
                  </div>

                  {/* PnL & Distance to Liq */}
                  <div className="flex items-center justify-between lg:justify-end gap-4">
                    <div className="text-right font-mono">
                      <span className="text-[10px] text-zinc-500 block">FLOATING PnL</span>
                      <div className="flex items-center justify-end gap-1.5">
                        <span className={`text-base font-black ${isProfit ? 'text-emerald-400' : 'text-red-400'}`}>
                          {unPnl >= 0 ? '+' : ''}${unPnl.toFixed(2)} USD
                        </span>
                      </div>
                      {distToLiqPct < 999 && (
                        <span className={`text-[10px] ${isLiqCritical ? 'text-red-400 font-bold' : 'text-zinc-400'}`}>
                          Jarak ke Liq: {distToLiqPct.toFixed(1)}%
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {onOpenChart && (
                        <button
                          onClick={() => onOpenChart(pos.symbol)}
                          className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                          title="Buka Chart TradingView"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setClosingSymbol(pos.symbol)}
                        className="px-3 py-1.5 rounded-xl bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white border border-red-500/40 text-xs font-mono font-bold transition-all cursor-pointer shadow-md active:scale-95"
                      >
                        Tutup Posisi
                      </button>
                    </div>
                  </div>
                </div>

                {/* Critical Liquidation Warning Banner if close */}
                {isLiqCritical && (
                  <div className="mt-3 p-2 rounded-lg bg-red-500/20 border border-red-500/50 flex items-center gap-2 text-red-300 text-[11px] font-mono">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 animate-bounce" />
                    <span>
                      <strong>BAHAYA LIKUIDASI DEKAT:</strong> Jarak harga pasar ke harga likuidasi tinggal {distToLiqPct.toFixed(1)}%! Pertimbangkan menutup posisi atau menambah margin.
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal for Closing Position */}
      {closingSymbol && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#11141c] border border-red-500/40 rounded-2xl p-6 max-w-sm w-full font-mono shadow-2xl">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 mx-auto mb-3">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <h4 className="text-sm font-bold text-center text-white mb-2">
              Konfirmasi Tutup Posisi {closingSymbol}?
            </h4>
            <p className="text-xs text-zinc-400 text-center mb-5">
              Order pasar (Market Order) akan segera dikirimkan ke Binance Futures untuk menutup 100% posisi pada simbol <strong>{closingSymbol}</strong>.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setClosingSymbol(null)}
                disabled={isClosing}
                className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => handleExecuteClose(closingSymbol)}
                disabled={isClosing}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1 shadow-lg"
              >
                {isClosing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Ya, Tutup Sekarang'}
              </button>
            </div>
          </div>
        </div>
      )}

      <BinanceConnectModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        onConnectionSuccess={() => {
          loadConfig();
          setIsConnectModalOpen(false);
          fetchPositions();
        }}
      />
    </div>
  );
};
