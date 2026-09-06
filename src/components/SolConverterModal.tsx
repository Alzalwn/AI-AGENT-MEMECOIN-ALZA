'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  DollarSign,
  Coins,
  Wallet,
  Sparkles,
  Calculator
} from 'lucide-react';
import { useSolRate } from '../hooks/useSolRate';
import { useTradingAgent } from '../hooks/useTradingAgent';
import Badge from './ui/Badge';

interface SolConverterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SolConverterModal: React.FC<SolConverterModalProps> = ({ isOpen, onClose }) => {
  const { rate, isLoading, refetch } = useSolRate();
  const { walletState } = useTradingAgent();

  const [activeTab, setActiveTab] = useState<'SOL' | 'IDR' | 'USD'>('SOL');
  const [solInput, setSolInput] = useState<string>('1');
  const [idrInput, setIdrInput] = useState<string>('1000000');
  const [usdInput, setUsdInput] = useState<string>('100');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Close on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  // Calculations for SOL input
  const numSol = parseFloat(solInput) || 0;
  const calculatedUsdFromSol = numSol * rate.solUsd;
  const calculatedIdrFromSol = Math.round(numSol * rate.solIdr);

  // Calculations for IDR input
  const numIdr = parseFloat(idrInput.replace(/\D/g, '')) || 0;
  const calculatedSolFromIdr = rate.solIdr > 0 ? numIdr / rate.solIdr : 0;
  const calculatedUsdFromIdr = rate.usdIdr > 0 ? numIdr / rate.usdIdr : 0;

  // Calculations for USD input
  const numUsd = parseFloat(usdInput) || 0;
  const calculatedSolFromUsd = rate.solUsd > 0 ? numUsd / rate.solUsd : 0;
  const calculatedIdrFromUsd = Math.round(numUsd * rate.usdIdr);

  const formatCurrencyIdr = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val);
  };

  const formatCurrencyUsd = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val);
  };

  const isPositiveChange = rate.change24h >= 0;

  // Preset quick cards
  const presets = [0.1, 0.5, 1, 2, 5, 10];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 font-mono">
      <div
        className="relative w-full max-w-xl bg-zinc-950 border border-zinc-800/90 rounded-3xl p-5 sm:p-7 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col gap-5 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500/20 to-emerald-500/20 border border-purple-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.3)]">
              <Calculator className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-wider text-zinc-100 uppercase">
                  Kalkulator Kurs Solana
                </h2>
                <Badge variant="purple" size="xs">
                  REAL-TIME
                </Badge>
              </div>
              <p className="text-xs text-zinc-400">
                Konversi Nilai SOL ⇄ Rupiah (IDR) & Dolar (USD)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              title="Refresh Kurs Terkini"
              className={`p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all ${
                isRefreshing ? 'animate-spin text-emerald-400' : ''
              }`}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Rates Highlight Ticker */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 relative z-10">
          <div className="bg-zinc-900/80 border border-zinc-800/90 rounded-2xl p-4 flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="font-bold flex items-center gap-1.5 text-purple-400">
                <Coins className="w-4 h-4" /> 1 SOL (Solana)
              </span>
              <div
                className={`flex items-center gap-1 text-[11px] font-bold ${
                  isPositiveChange ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {isPositiveChange ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5" />
                )}
                <span>
                  {isPositiveChange ? '+' : ''}
                  {rate.change24h.toFixed(2)}%
                </span>
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-black text-zinc-100">
              {formatCurrencyIdr(rate.solIdr)}
            </div>
            <div className="text-xs text-emerald-400 font-bold">
              ≈ {formatCurrencyUsd(rate.solUsd)} USD
            </div>
          </div>

          <div className="bg-zinc-900/80 border border-zinc-800/90 rounded-2xl p-4 flex flex-col justify-between gap-2">
            <div>
              <div className="text-xs text-zinc-400 font-bold flex items-center gap-1.5 text-cyan-400">
                <DollarSign className="w-4 h-4" /> Kurs Acuan USD / IDR
              </div>
              <div className="text-lg font-black text-zinc-200 mt-1">
                $1 USD = {formatCurrencyIdr(rate.usdIdr)}
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1 border-t border-zinc-800/60">
              <span>Sumber: DexScreener & Forex API</span>
              <span>30s Auto-Sync</span>
            </div>
          </div>
        </div>

        {/* Mode Tabs */}
        <div className="flex rounded-xl bg-zinc-900 p-1 border border-zinc-800/90 relative z-10">
          <button
            onClick={() => setActiveTab('SOL')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'SOL'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>SOL ➔ Rupiah / USD</span>
          </button>
          <button
            onClick={() => setActiveTab('IDR')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'IDR'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Rupiah ➔ SOL</span>
          </button>
          <button
            onClick={() => setActiveTab('USD')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'USD'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>USD ➔ SOL</span>
          </button>
        </div>

        {/* Tab 1: SOL -> IDR/USD */}
        {activeTab === 'SOL' && (
          <div className="space-y-4 relative z-10">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <label className="font-bold flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-purple-400" />
                  <span>Jumlah Solana (SOL)</span>
                </label>
                {walletState.isConnected && (
                  <button
                    type="button"
                    onClick={() => setSolInput(walletState.balanceSol.toString())}
                    className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Wallet className="w-3 h-3" />
                    <span>Saldo Dompet: {walletState.balanceSol.toFixed(2)} SOL</span>
                  </button>
                )}
              </div>

              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={solInput}
                  onChange={(e) => setSolInput(e.target.value)}
                  placeholder="Contoh: 1.5"
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-purple-500 text-zinc-100 text-lg font-bold px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 pr-16"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-purple-400 bg-purple-500/10 px-2 py-1 rounded-md border border-purple-500/30">
                  SOL
                </span>
              </div>
            </div>

            {/* Quick Preset Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-zinc-500 font-bold">Preset:</span>
              {presets.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setSolInput(amt.toString())}
                  className="px-2.5 py-1 text-xs bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 rounded-lg transition-all cursor-pointer active:scale-95"
                >
                  {amt} SOL
                </button>
              ))}
            </div>

            {/* Result Display Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800/90 space-y-3">
              <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                Hasil Konversi Real-Time
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-zinc-850">
                <div>
                  <div className="text-xs text-zinc-400">Nilai dalam Rupiah (IDR):</div>
                  <div className="text-2xl font-black text-emerald-400 tracking-tight">
                    {formatCurrencyIdr(calculatedIdrFromSol)}
                  </div>
                </div>
                <div className="sm:text-right">
                  <div className="text-xs text-zinc-400">Nilai dalam Dolar (USD):</div>
                  <div className="text-xl font-black text-cyan-400">
                    {formatCurrencyUsd(calculatedUsdFromSol)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: IDR -> SOL/USD */}
        {activeTab === 'IDR' && (
          <div className="space-y-4 relative z-10">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400 flex items-center gap-1.5">
                <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-400" />
                <span>Nominal Rupiah (IDR)</span>
              </label>

              <div className="relative">
                <input
                  type="text"
                  value={idrInput}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setIdrInput(raw ? parseInt(raw, 10).toLocaleString('id-ID') : '');
                  }}
                  placeholder="Contoh: 1.000.000"
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-emerald-500 text-zinc-100 text-lg font-bold px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 pr-16"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/30">
                  IDR (Rp)
                </span>
              </div>
            </div>

            {/* Quick IDR Presets */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-zinc-500 font-bold">Preset:</span>
              {[250_000, 500_000, 1_000_000, 2_500_000, 5_000_000, 10_000_000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setIdrInput(val.toLocaleString('id-ID'))}
                  className="px-2.5 py-1 text-xs bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 rounded-lg transition-all cursor-pointer active:scale-95"
                >
                  {val >= 1_000_000 ? `${val / 1_000_000} Jt` : `${val / 1_000} Rb`}
                </button>
              ))}
            </div>

            {/* Result Display Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800/90 space-y-3">
              <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                Anda Mendapatkan Estimasi
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-zinc-850">
                <div>
                  <div className="text-xs text-zinc-400">Total Koin Solana:</div>
                  <div className="text-2xl font-black text-purple-400 tracking-tight flex items-center gap-1.5">
                    <span>{calculatedSolFromIdr.toFixed(4)}</span>
                    <span className="text-sm text-purple-300">SOL</span>
                  </div>
                </div>
                <div className="sm:text-right">
                  <div className="text-xs text-zinc-400">Setara Dolar (USD):</div>
                  <div className="text-xl font-black text-cyan-400">
                    {formatCurrencyUsd(calculatedUsdFromIdr)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: USD -> SOL/IDR */}
        {activeTab === 'USD' && (
          <div className="space-y-4 relative z-10">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-400 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-cyan-400" />
                <span>Nominal Dolar (USD)</span>
              </label>

              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={usdInput}
                  onChange={(e) => setUsdInput(e.target.value)}
                  placeholder="Contoh: 100"
                  className="w-full bg-zinc-900 border border-zinc-800 focus:border-cyan-500 text-zinc-100 text-lg font-bold px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/20 pr-16"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded-md border border-cyan-500/30">
                  USD ($)
                </span>
              </div>
            </div>

            {/* Quick USD Presets */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-zinc-500 font-bold">Preset:</span>
              {[25, 50, 100, 250, 500, 1000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setUsdInput(val.toString())}
                  className="px-2.5 py-1 text-xs bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 rounded-lg transition-all cursor-pointer active:scale-95"
                >
                  ${val}
                </button>
              ))}
            </div>

            {/* Result Display Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800/90 space-y-3">
              <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                Hasil Konversi
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-zinc-850">
                <div>
                  <div className="text-xs text-zinc-400">Total Koin Solana:</div>
                  <div className="text-2xl font-black text-purple-400 tracking-tight flex items-center gap-1.5">
                    <span>{calculatedSolFromUsd.toFixed(4)}</span>
                    <span className="text-sm text-purple-300">SOL</span>
                  </div>
                </div>
                <div className="sm:text-right">
                  <div className="text-xs text-zinc-400">Nilai dalam Rupiah:</div>
                  <div className="text-xl font-black text-emerald-400">
                    {formatCurrencyIdr(calculatedIdrFromUsd)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Reference Table Footer */}
        <div className="border-t border-zinc-850 pt-3 text-[11px] text-zinc-500 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Update otomatis setiap 30 detik dari pool Raydium & Forex</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold text-zinc-400 hover:text-zinc-200"
          >
            Tutup [ESC]
          </button>
        </div>
      </div>
    </div>
  );
};

export default SolConverterModal;
