'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Wallet, AlertTriangle, RefreshCw, Briefcase, ChevronRight, TrendingUp, TrendingDown } from 'lucide-react';

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
  activePositions: ActivePosition[];
}

export default function PortfolioPage() {
  const [data, setData] = useState<PortfolioData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPortfolio = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/portfolio');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || 'Gagal memuat data');
      }
    } catch (err: any) {
      setError(err.message || 'Koneksi terputus');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPortfolio();
    const interval = setInterval(fetchPortfolio, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans p-6 selection:bg-pink-500/30">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-zinc-400" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Wallet className="w-6 h-6 text-pink-400" />
                <h1 className="text-2xl font-bold">Local Portfolio (Binance Futures)</h1>
              </div>
              <p className="text-zinc-500 text-sm mt-1">
                Agregator saldo real-time dan manajemen risiko (Kunci API Diperlukan)
              </p>
            </div>
          </div>
          
          <button 
            onClick={fetchPortfolio}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl transition-all text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-pink-400' : 'text-zinc-400'}`} />
            {isLoading ? 'Menyinkronkan...' : 'Sinkronkan'}
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 mb-6 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400">
            <AlertTriangle className="w-6 h-6 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-red-300">Autentikasi Gagal / Konfigurasi Dibutuhkan</h3>
              <p className="mt-1 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && !data && !error && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-zinc-900/50 border border-zinc-800/50 rounded-2xl" />
            ))}
          </div>
        )}

        {/* Dashboard Content */}
        {data && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="p-5 bg-zinc-900/40 border border-zinc-800 rounded-2xl">
                <span className="text-zinc-500 text-sm font-bold uppercase tracking-wider">Total Saldo (USDT)</span>
                <div className="mt-2 text-3xl font-black">${parseFloat(data.totalWalletBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              </div>
              <div className="p-5 bg-zinc-900/40 border border-zinc-800 rounded-2xl">
                <span className="text-zinc-500 text-sm font-bold uppercase tracking-wider">Unrealized PnL</span>
                <div className={`mt-2 text-3xl font-black ${parseFloat(data.totalUnrealizedProfit) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {parseFloat(data.totalUnrealizedProfit) >= 0 ? '+' : ''}
                  ${parseFloat(data.totalUnrealizedProfit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="p-5 bg-zinc-900/40 border border-zinc-800 rounded-2xl">
                <span className="text-zinc-500 text-sm font-bold uppercase tracking-wider">Margin Balance</span>
                <div className="mt-2 text-3xl font-black">${parseFloat(data.totalMarginBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              </div>
              <div className="p-5 bg-zinc-900/40 border border-zinc-800 rounded-2xl">
                <span className="text-zinc-500 text-sm font-bold uppercase tracking-wider">Available Balance</span>
                <div className="mt-2 text-3xl font-black text-pink-400">${parseFloat(data.availableBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
              </div>
            </div>

            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-zinc-400" />
              Posisi Terbuka Aktif ({data.activePositions.length})
            </h2>

            {data.activePositions.length === 0 ? (
              <div className="p-12 bg-zinc-900/20 border border-zinc-800/50 rounded-2xl text-center">
                <p className="text-zinc-500">Tidak ada posisi terbuka saat ini.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {data.activePositions.map((pos, idx) => {
                  const isLong = pos.side === 'LONG' || pos.side === 'long' || pos.contracts > 0;
                  const pnlClass = pos.unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-red-400';
                  
                  return (
                    <div key={idx} className="p-5 bg-zinc-900/40 border border-zinc-800 rounded-2xl flex flex-col gap-4 hover:border-zinc-700 transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-xl font-black">{pos.symbol}</h3>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${isLong ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                              {pos.side} {pos.leverage}x
                            </span>
                          </div>
                          <span className="text-sm text-zinc-400">Size: {pos.contracts}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Unrealized PnL</span>
                          <div className={`text-xl font-black flex items-center justify-end gap-1 ${pnlClass}`}>
                            {pos.unrealizedPnl >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            ${pos.unrealizedPnl.toFixed(2)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm bg-zinc-950/50 p-3 rounded-xl border border-zinc-800/50">
                        <div className="flex flex-col">
                          <span className="text-zinc-500 text-xs mb-0.5">Entry Price</span>
                          <span className="font-mono">${pos.entryPrice}</span>
                        </div>
                        <div className="flex flex-col text-right">
                          <span className="text-zinc-500 text-xs mb-0.5">Mark Price</span>
                          <span className="font-mono">${pos.markPrice}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
