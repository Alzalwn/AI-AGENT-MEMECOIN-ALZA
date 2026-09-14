'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Wallet,
  AlertTriangle,
  RefreshCw,
  Briefcase,
  TrendingUp,
  TrendingDown,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { FuturesEcosystemNav } from '@/components/futures/FuturesEcosystemNav';
import {
  BinanceConnectModal,
  BINANCE_STORAGE_KEY,
  SavedBinanceConfig,
} from '@/components/futures/BinanceConnectModal';

interface ActivePosition {
  symbol: string;
  side: string;
  contracts: number;
  entryPrice: number;
  markPrice: number;
  unrealizedPnl: number;
  percentage: number;
  leverage: number;
  initialMargin: number;
}

interface PortfolioData {
  totalWalletBalance: string;
  totalUnrealizedProfit: string;
  totalMarginBalance: string;
  availableBalance: string;
  isTestnet?: boolean;
  canTrade?: boolean;
  activePositions: ActivePosition[];
}

export default function PortfolioPage() {
  const [data, setData] = useState<PortfolioData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [binanceConfig, setBinanceConfig] = useState<SavedBinanceConfig | null>(null);

  const loadSavedConfig = () => {
    try {
      const saved = localStorage.getItem(BINANCE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setBinanceConfig(parsed);
        return parsed;
      }
    } catch {
      // ignore
    }
    setBinanceConfig(null);
    return null;
  };

  const fetchPortfolio = useCallback(async () => {
    setIsLoading(true);
    setError('');

    const saved = loadSavedConfig();
    const headers: Record<string, string> = {};

    if (saved?.apiKey && saved?.apiSecret) {
      headers['x-binance-api-key'] = saved.apiKey;
      headers['x-binance-secret'] = saved.apiSecret;
      headers['x-binance-testnet'] = saved.isTestnet ? 'true' : 'false';
    }

    try {
      const res = await fetch('/api/portfolio', {
        headers,
        cache: 'no-store',
      });
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else {
        setError(json.error || 'Gagal memuat data portfolio.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Koneksi terputus';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPortfolio();
    const interval = setInterval(fetchPortfolio, 12000); // refresh every 12s
    return () => clearInterval(interval);
  }, [fetchPortfolio]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans p-4 sm:p-6 selection:bg-pink-500/30">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Navigation Bar */}
        <FuturesEcosystemNav />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 hover:bg-zinc-800 rounded-xl transition-colors">
              <ArrowLeft className="w-5 h-5 text-zinc-400" />
            </Link>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <Wallet className="w-6 h-6 text-pink-400" />
                <h1 className="text-xl sm:text-2xl font-bold font-mono">
                  Local Portfolio (Binance Futures)
                </h1>
                {data?.isTestnet !== undefined && (
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      data.isTestnet
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {data.isTestnet ? 'Testnet Virtual' : 'Live Real Account'}
                  </span>
                )}
              </div>
              <p className="text-zinc-500 text-xs sm:text-sm mt-0.5">
                Monitoring saldo riil, margin bebas, dan posisi terbuka langsung dari akun Binance
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-300 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              <span>{binanceConfig?.apiKey ? 'Kelola Kunci' : 'Hubungkan Binance'}</span>
            </button>

            <button
              onClick={fetchPortfolio}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl transition-all text-xs font-mono font-medium disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-pink-400' : 'text-zinc-400'}`}
              />
              <span>{isLoading ? 'Sinkronisasi...' : 'Sinkronkan'}</span>
            </button>
          </div>
        </div>

        {/* Error / Missing API Key State */}
        {error && (
          <div className="p-4 sm:p-5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row items-start justify-between gap-4 text-amber-300">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
              <div>
                <h3 className="font-bold text-amber-200 text-sm">
                  Koneksi Akun Binance Diperlukan
                </h3>
                <p className="mt-1 text-xs text-zinc-300 leading-relaxed max-w-xl">{error}</p>
              </div>
            </div>

            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold font-mono text-xs rounded-xl flex items-center gap-1.5 shrink-0 shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Hubungkan Sekarang (1-Klik)</span>
            </button>
          </div>
        )}

        {/* Loading Skeleton */}
        {isLoading && !data && !error && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-zinc-900/50 border border-zinc-800/50 rounded-2xl" />
            ))}
          </div>
        )}

        {/* Dashboard Content */}
        {data && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <div className="p-4 sm:p-5 bg-zinc-900/50 border border-zinc-800/80 rounded-2xl">
                <span className="text-zinc-500 text-[11px] font-mono font-bold uppercase tracking-wider">
                  Total Saldo Dompet
                </span>
                <div className="mt-1 text-xl sm:text-2xl font-mono font-black text-white">
                  ${parseFloat(data.totalWalletBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-zinc-500 mt-1 font-mono">USDT Wallet Balance</div>
              </div>

              <div className="p-4 sm:p-5 bg-zinc-900/50 border border-zinc-800/80 rounded-2xl">
                <span className="text-zinc-500 text-[11px] font-mono font-bold uppercase tracking-wider">
                  Floating Unrealized PnL
                </span>
                <div
                  className={`mt-1 text-xl sm:text-2xl font-mono font-black ${
                    parseFloat(data.totalUnrealizedProfit) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {parseFloat(data.totalUnrealizedProfit) >= 0 ? '+' : ''}$
                  {parseFloat(data.totalUnrealizedProfit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-zinc-500 mt-1 font-mono">Profit/Rugi Berjalan</div>
              </div>

              <div className="p-4 sm:p-5 bg-zinc-900/50 border border-zinc-800/80 rounded-2xl">
                <span className="text-zinc-500 text-[11px] font-mono font-bold uppercase tracking-wider">
                  Margin Balance
                </span>
                <div className="mt-1 text-xl sm:text-2xl font-mono font-black text-white">
                  ${parseFloat(data.totalMarginBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-zinc-500 mt-1 font-mono">Total Ekuitas Margin</div>
              </div>

              <div className="p-4 sm:p-5 bg-zinc-900/50 border border-zinc-800/80 rounded-2xl">
                <span className="text-zinc-500 text-[11px] font-mono font-bold uppercase tracking-wider">
                  Margin Tersedia (Free)
                </span>
                <div className="mt-1 text-xl sm:text-2xl font-mono font-black text-pink-400">
                  ${parseFloat(data.availableBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-zinc-500 mt-1 font-mono">Siap Digunakan</div>
              </div>
            </div>

            <div className="pt-2">
              <h2 className="text-lg font-bold font-mono mb-3 flex items-center gap-2 text-zinc-200">
                <Briefcase className="w-5 h-5 text-pink-400" />
                Posisi Terbuka Aktif ({data.activePositions.length})
              </h2>

              {data.activePositions.length === 0 ? (
                <div className="p-8 sm:p-12 bg-zinc-900/30 border border-zinc-800/50 rounded-2xl text-center font-mono">
                  <ShieldCheck className="w-8 h-8 text-emerald-400/60 mx-auto mb-2" />
                  <p className="text-zinc-300 font-bold text-sm">Tidak ada posisi terbuka di akun Binance Anda.</p>
                  <p className="text-zinc-500 text-xs mt-1">
                    Semua margin dalam kondisi aman dan siap untuk setup sinyal berikutnya.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {data.activePositions.map((pos, idx) => {
                    const isLong = pos.side === 'LONG';
                    const pnlClass = pos.unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400';

                    return (
                      <div
                        key={idx}
                        className="p-5 bg-zinc-900/50 border border-zinc-800 rounded-2xl flex flex-col gap-3 font-mono hover:border-zinc-700 transition-colors"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-lg font-black text-white">{pos.symbol}</h3>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  isLong
                                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                }`}
                              >
                                {pos.side} {pos.leverage}x
                              </span>
                            </div>
                            <span className="text-xs text-zinc-400">
                              Ukuran Kontrak: {pos.contracts}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
                              Unrealized PnL
                            </span>
                            <div
                              className={`text-lg font-black flex items-center justify-end gap-1 ${pnlClass}`}
                            >
                              {pos.unrealizedPnl >= 0 ? (
                                <TrendingUp className="w-4 h-4" />
                              ) : (
                                <TrendingDown className="w-4 h-4" />
                              )}
                              ${pos.unrealizedPnl.toFixed(2)} ({pos.percentage >= 0 ? '+' : ''}
                              {pos.percentage.toFixed(1)}%)
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-xs bg-black/40 p-3 rounded-xl border border-white/5">
                          <div>
                            <span className="text-zinc-500 text-[10px] block">Entry Price</span>
                            <span className="text-zinc-200 font-bold">${pos.entryPrice}</span>
                          </div>
                          <div>
                            <span className="text-zinc-500 text-[10px] block">Mark Price</span>
                            <span className="text-zinc-200 font-bold">${pos.markPrice}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-zinc-500 text-[10px] block">Initial Margin</span>
                            <span className="text-zinc-200 font-bold">${pos.initialMargin}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Binance Connect Modal */}
      <BinanceConnectModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          loadSavedConfig();
        }}
        onConnectionSuccess={() => {
          loadSavedConfig();
          fetchPortfolio();
        }}
      />
    </div>
  );
}
