'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Zap,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Lock,
  CheckCircle2,
  DollarSign,
  KeyRound,
  Sliders,
} from 'lucide-react';
import { BinanceFuturesSignal } from '@/types/futures';
import { BINANCE_STORAGE_KEY, SavedBinanceConfig, BinanceConnectModal } from './BinanceConnectModal';
import { formatFuturesPrice, validateFuturesEntryGate } from '@/engine/futuresSignalEngine';
import { isTradFiOrEtfBlacklisted } from '@/lib/tradfiBlacklist';

interface BinanceOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  signal: BinanceFuturesSignal;
}

export const BinanceOrderModal: React.FC<BinanceOrderModalProps> = ({
  isOpen,
  onClose,
  signal,
}) => {
  const [config, setConfig] = useState<SavedBinanceConfig | null>(null);
  const [isConnectOpen, setIsConnectOpen] = useState<boolean>(false);
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [limitPrice, setLimitPrice] = useState<number>(signal.entryZone.current);
  const [leverage, setLeverage] = useState<number>(signal.leverage.safe.multiplier || 5);
  const [customRiskPct, setCustomRiskPct] = useState<number>(2.0); // SOP 2% standard
  const [walletBalance, setWalletBalance] = useState<number>(100);

  const [isHardCapActive, setIsHardCapActive] = useState<boolean>(false); // Default: OFF (opt-in sesuai permintaan)
  const [hardCapDollar, setHardCapDollar] = useState<number>(1.0); // $1.00 batas kerugian

  // Execution states
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [resultMsg, setResultMsg] = useState<{
    type: 'success' | 'error';
    text: string;
    orderId?: number;
    marginType?: string;
    stopLossOrder?: boolean;
    stopLossError?: string;
  } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(BINANCE_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setConfig(parsed);
        if (parsed.walletBalance) {
          setWalletBalance(parseFloat(parsed.walletBalance) || 100);
        }
      }
    } catch {
      setConfig(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (signal) {
      setLimitPrice(signal.entryZone.current);
      setLeverage(signal.leverage?.safe?.multiplier || 5);
    }
  }, [signal]);

  if (!isOpen) return null;

  // Position Sizing Calculations
  const isLong = signal.direction === 'LONG';
  const entry = orderType === 'LIMIT' ? limitPrice : signal.entryZone.current;
  const sl = signal.stopLoss.price;
  const slDistPct = entry > 0 ? Math.abs((entry - sl) / entry) * 100 : 2.0;

  // Evaluasi Gatekeeper Anomali Pasar & Blacklist
  const gateEvaluation = validateFuturesEntryGate(signal);
  const blacklistCheck = isTradFiOrEtfBlacklisted(signal.symbol);
  const isExecutionBlocked = gateEvaluation.isRestricted || blacklistCheck.isBlacklisted;

  // Perhitungan Risiko (Hard Cap $1 atau SOP 2%)
  const maxDollarRisk = isHardCapActive ? hardCapDollar : (walletBalance * customRiskPct) / 100;
  const notionalSizeUsd = slDistPct > 0 ? maxDollarRisk / (slDistPct / 100) : 10;
  const marginRequiredUsd = leverage > 0 ? notionalSizeUsd / leverage : 2;
  const quantityCoins = entry > 0 ? notionalSizeUsd / entry : 0;

  // Format quantity to suitable decimals
  const formattedQty = entry >= 1000
    ? quantityCoins.toFixed(3)
    : entry >= 1
    ? quantityCoins.toFixed(2)
    : quantityCoins.toFixed(0);

  const handleExecuteOrder = async () => {
    if (isExecutionBlocked) {
      setResultMsg({
        type: 'error',
        text: blacklistCheck.reason || '⛔ EKSEKUSI DIBLOKIR: Simbol terkena Veto Gatekeeper untuk melindungi modal Anda.',
      });
      return;
    }

    if (!config || !config.apiKey || !config.apiSecret) {
      setIsConnectOpen(true);
      return;
    }

    setIsExecuting(true);
    setResultMsg(null);

    try {
      // Execute Full Bracket Order: Enforce ISOLATED + Set Leverage + Entry Order + Auto-SL
      const res = await fetch('/api/futures/binance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'place_order',
          apiKey: config.apiKey,
          apiSecret: config.apiSecret,
          isTestnet: config.isTestnet,
          direction: isLong ? 'LONG' : 'SHORT',
          leverage,
          stopLossPrice: sl,
          order: {
            symbol: signal.symbol,
            side: isLong ? 'BUY' : 'SELL',
            type: orderType,
            quantity: formattedQty,
            ...(orderType === 'LIMIT' ? { price: String(limitPrice), timeInForce: 'GTC' } : {}),
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal mengeksekusi order di Binance');
      }

      const slStatus = Boolean(data.stopLossOrder);
      setResultMsg({
        type: 'success',
        text: data.message || `Order ${isLong ? 'LONG' : 'SHORT'} ${signal.symbol} berhasil dieksekusi!`,
        orderId: data.order?.orderId,
        marginType: data.marginType || 'ISOLATED',
        stopLossOrder: slStatus,
        stopLossError: data.stopLossError,
      });
    } catch (err: unknown) {
      setResultMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Terjadi kesalahan eksekusi',
      });
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md font-sans">
      <div className="bg-[#0e1118] border border-cyan-500/40 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-zinc-900 via-[#101926] to-cyan-950/40 border-b border-white/10 p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Zap className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black font-mono text-white">
                  EKSEKUSI ORDER BINANCE FUTURES
                </h3>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                  config?.isTestnet ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'
                }`}>
                  {config?.isTestnet ? 'TESTNET' : 'MAINNET LIVE'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-mono">
                Enforced: Mode Isolated &amp; Bracket Auto-SL (Mark Price)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3 font-mono text-xs overflow-y-auto">
          {/* Pair & Direction Banner */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/90 border border-white/5">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded-lg font-black text-xs ${
                isLong
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-red-500/20 text-red-300 border border-red-500/40'
              }`}>
                {isLong ? '🟢 BUY / LONG' : '🔴 SELL / SHORT'}
              </span>
              <span className="text-base font-black text-white">{signal.symbol}</span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-400">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] font-bold text-amber-400">ISOLATED (Otomatis Dikunci)</span>
            </div>
          </div>

          {/* Banner Veto Gatekeeper TradFi/ETF Blacklist */}
          {blacklistCheck.isBlacklisted && (
            <div className="p-3 rounded-xl bg-red-950/70 border border-red-500/70 text-red-200 flex items-start gap-2.5 shadow-lg">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-black text-xs text-red-300 flex items-center gap-1.5">
                  <span>⛔ GATEKEEPER VETO: Ticker TradFi / ETF Terdaftar Blacklist!</span>
                </div>
                <div className="text-[11px] text-red-200/90 leading-tight mt-1">
                  Ticker <strong>{signal.symbol}</strong> dilarang diperdagangkan karena memiliki spread lebar dan likuiditas minim yang berisiko tinggi memicu Stop Loss beruntun. Tombol eksekusi telah dikunci mati.
                </div>
              </div>
            </div>
          )}

          {/* Peringatan Gatekeeper & Anomali Pasar (Hanya Peringatan) */}
          {!blacklistCheck.isBlacklisted && gateEvaluation.warnings.length > 0 && (
            <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-[11px]">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Peringatan Radar Anomali Pasar:</span>
              </div>
              {gateEvaluation.warnings.map((w, idx) => (
                <p key={idx} className="text-[10.5px] leading-tight text-amber-200/90 pl-5">
                  • {w}
                </p>
              ))}
            </div>
          )}

          {/* Toggle Mode Anti-Emosi ($1 Hard Cap) */}
          <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-700/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className={`w-4 h-4 ${isHardCapActive ? 'text-amber-400' : 'text-zinc-500'}`} />
              <div>
                <span className="font-bold text-[11px] text-white block">
                  Mode Anti-Emosi (Kunci Rugi Maksimal $1.00 USD)
                </span>
                <span className="text-[10px] text-zinc-400">
                  {isHardCapActive
                    ? 'Aktif: Risiko kerugian jika SL terpicu dibatasi tepat $1.00'
                    : 'Nonaktif: Menggunakan kalkulasi standar 2% SOP'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsHardCapActive(!isHardCapActive)}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all border ${
                isHardCapActive
                  ? 'bg-amber-500 text-black border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white'
              }`}
            >
              {isHardCapActive ? 'AKTIF ($1.00)' : 'NONAKTIF'}
            </button>
          </div>

          {/* Execution Settings Grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Order Type */}
            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">Tipe Order:</label>
              <div className="grid grid-cols-2 gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setOrderType('MARKET')}
                  className={`py-1 rounded text-center text-[11px] font-bold transition-all ${
                    orderType === 'MARKET'
                      ? 'bg-cyan-500 text-black shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  MARKET
                </button>
                <button
                  type="button"
                  onClick={() => setOrderType('LIMIT')}
                  className={`py-1 rounded text-center text-[11px] font-bold transition-all ${
                    orderType === 'LIMIT'
                      ? 'bg-cyan-500 text-black shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  LIMIT
                </button>
              </div>
            </div>

            {/* Leverage */}
            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">Leverage Disiplin:</label>
              <select
                value={leverage}
                onChange={(e) => setLeverage(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value={3}>3x (Ultra Safe Swing)</option>
                <option value={5}>5x (SOP Standard Safe)</option>
                <option value={7}>7x (Moderate)</option>
                <option value={10}>10x (Scalp Max)</option>
              </select>
            </div>
          </div>

          {/* Limit Price Input if LIMIT selected */}
          {orderType === 'LIMIT' && (
            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">Harga Limit (Entry Zone):</label>
              <input
                type="number"
                value={limitPrice}
                onChange={(e) => setLimitPrice(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
              />
            </div>
          )}

          {/* Sizing Telemetry Matrix */}
          <div className="bg-gradient-to-br from-cyan-950/30 to-zinc-900/80 border border-cyan-500/30 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-zinc-400 border-b border-white/5 pb-1.5">
              <span>Saldo Dompet Terdeteksi:</span>
              <span className="font-bold text-white">${walletBalance.toFixed(2)} USDT</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-400 border-b border-white/5 pb-1.5">
              <span>Batas Risiko Terkunci:</span>
              <span className={`font-bold ${isHardCapActive ? 'text-amber-400 font-black' : 'text-rose-400'}`}>
                -${maxDollarRisk.toFixed(2)} USD {isHardCapActive && '(Kunci $1)'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-400 border-b border-white/5 pb-1.5">
              <span>Jarak Auto-Stop Loss:</span>
              <span className="font-bold text-zinc-300">-${slDistPct.toFixed(2)}% (${formatFuturesPrice(sl)})</span>
            </div>
            <div className="flex items-center justify-between text-xs pt-0.5">
              <span className="font-bold text-cyan-300">Margin Wajib Dipasang:</span>
              <span className="text-base font-black text-cyan-400">${marginRequiredUsd.toFixed(2)} USDT</span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-zinc-400">
              <span>Ukuran Koin (Qty):</span>
              <span className="font-bold text-zinc-200">{formattedQty} {signal.baseAsset}</span>
            </div>
          </div>

          {/* Feedback Message */}
          {resultMsg && (
            <div className={`p-3 rounded-xl border flex items-start gap-2 ${
              resultMsg.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                : 'bg-red-950/40 border-red-500/50 text-red-200'
            }`}>
              {resultMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              )}
              <div className="text-[11px] leading-relaxed">
                <span>{resultMsg.text}</span>
                {resultMsg.orderId && (
                  <span className="block mt-0.5 text-[10px] text-emerald-400 font-bold">
                    Order ID: #{resultMsg.orderId} | Margin: {resultMsg.marginType}
                  </span>
                )}
                {resultMsg.stopLossOrder && (
                  <span className="block text-[10px] text-cyan-300 font-bold">
                    🛡️ Auto Stop Loss terpasang otomatis via Mark Price.
                  </span>
                )}
                {resultMsg.stopLossError && (
                  <span className="block text-[10px] text-amber-400 font-bold">
                    ⚠️ {resultMsg.stopLossError}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Action Button */}
          <div className="pt-1 flex gap-2">
            <button
              onClick={onClose}
              disabled={isExecuting}
              className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              onClick={handleExecuteOrder}
              disabled={isExecuting || isExecutionBlocked}
              className={`flex-1 py-2.5 rounded-xl font-bold font-mono transition-all flex items-center justify-center gap-2 shadow-lg ${
                isExecutionBlocked
                  ? 'bg-red-950/40 text-red-400 border border-red-500/40 cursor-not-allowed opacity-75'
                  : isExecuting
                  ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50 cursor-wait'
                  : 'bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 hover:from-yellow-400 text-zinc-950 active:scale-98 shadow-[0_0_20px_rgba(234,179,8,0.35)] cursor-pointer'
              }`}
            >
              {isExecutionBlocked ? (
                <>
                  <Lock className="w-4 h-4 text-red-400" />
                  <span>⛔ EKSEKUSI DIBLOKIR GATEKEEPER</span>
                </>
              ) : isExecuting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>MEMPROSES BRACKET ORDER...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>KIRIM ORDER {isLong ? 'LONG' : 'SHORT'} (ISOLATED + SL)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <BinanceConnectModal
        isOpen={isConnectOpen}
        onClose={() => setIsConnectOpen(false)}
        onConnectionSuccess={() => setIsConnectOpen(false)}
      />
    </div>
  );
};
