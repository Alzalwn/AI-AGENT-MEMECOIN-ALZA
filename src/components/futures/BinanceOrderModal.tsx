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
import { formatFuturesPrice } from '@/engine/futuresSignalEngine';

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

  // Execution states
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [resultMsg, setResultMsg] = useState<{ type: 'success' | 'error'; text: string; orderId?: number } | null>(null);

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
      setLeverage(signal.leverage.safe.multiplier || 5);
    }
  }, [signal]);

  if (!isOpen) return null;

  // Position Sizing Calculations (2% Rule)
  const isLong = signal.direction === 'LONG';
  const entry = orderType === 'LIMIT' ? limitPrice : signal.entryZone.current;
  const sl = signal.stopLoss.price;
  const slDistPct = entry > 0 ? Math.abs((entry - sl) / entry) * 100 : 2.0;

  const maxDollarRisk = (walletBalance * customRiskPct) / 100;
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
    if (!config || !config.apiKey || !config.apiSecret) {
      setIsConnectOpen(true);
      return;
    }

    setIsExecuting(true);
    setResultMsg(null);

    try {
      // Step 1: Execute primary entry order
      const res = await fetch('/api/futures/binance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'place_order',
          apiKey: config.apiKey,
          apiSecret: config.apiSecret,
          isTestnet: config.isTestnet,
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

      setResultMsg({
        type: 'success',
        text: `Order ${isLong ? 'LONG' : 'SHORT'} ${signal.symbol} berhasil dieksekusi! Status: ${data.order?.status || 'NEW'}`,
        orderId: data.order?.orderId,
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
      <div className="bg-[#0e1118] border border-cyan-500/40 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-zinc-900 via-[#101926] to-cyan-950/40 border-b border-white/10 p-4 flex items-center justify-between">
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
                SOP Enforced: Mode Isolated &amp; 2% Max Risk Rule
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
        <div className="p-4 space-y-3.5 font-mono text-xs">
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
              <span className="text-[11px] font-bold text-amber-400">ISOLATED (Wajib)</span>
            </div>
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

          {/* 2% Sizing Telemetry Matrix */}
          <div className="bg-gradient-to-br from-cyan-950/30 to-zinc-900/80 border border-cyan-500/30 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-zinc-400 border-b border-white/5 pb-1.5">
              <span>Saldo Dompet Terdeteksi:</span>
              <span className="font-bold text-white">${walletBalance.toFixed(2)} USDT</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-400 border-b border-white/5 pb-1.5">
              <span>Maksimal Risiko (2% Modal):</span>
              <span className="font-bold text-rose-400">-${maxDollarRisk.toFixed(2)} USD</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-400 border-b border-white/5 pb-1.5">
              <span>Jarak Stop Loss:</span>
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
                    Order ID: #{resultMsg.orderId}
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
              disabled={isExecuting}
              className={`flex-1 py-2.5 rounded-xl font-bold font-mono transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
                isExecuting
                  ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/50 cursor-wait'
                  : 'bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 hover:from-yellow-400 text-zinc-950 active:scale-98 shadow-[0_0_20px_rgba(234,179,8,0.35)]'
              }`}
            >
              {isExecuting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>MENGIRIM ORDER KE BINANCE...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>KIRIM ORDER {isLong ? 'LONG' : 'SHORT'} KE BINANCE</span>
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
