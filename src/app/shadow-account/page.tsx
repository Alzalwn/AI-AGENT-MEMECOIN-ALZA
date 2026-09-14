'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  History,
  Brain,
  Activity,
  AlertTriangle,
  KeyRound,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import { FuturesEcosystemNav } from '@/components/futures/FuturesEcosystemNav';
import {
  BinanceConnectModal,
  BINANCE_STORAGE_KEY,
  SavedBinanceConfig,
} from '@/components/futures/BinanceConnectModal';

interface TradeActivity {
  id: string;
  symbol: string;
  side: string;
  price: number;
  amount: number;
  realizedPnl?: number;
  timestamp: number;
}

interface ShadowAccountData {
  psychologyState: string;
  warning: string | null;
  winRate: string;
  totalTrades: number;
  avgTradesPerDay: string;
  totalProfitUsd?: string;
  totalLossUsd?: string;
  recentActivity: TradeActivity[];
}

export default function ShadowAccountPage() {
  const [data, setData] = useState<{
    data: ShadowAccountData;
    isDummy: boolean;
    isTestnet?: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const saved = loadSavedConfig();
    const headers: Record<string, string> = {};

    if (saved?.apiKey && saved?.apiSecret) {
      headers['x-binance-api-key'] = saved.apiKey;
      headers['x-binance-secret'] = saved.apiSecret;
      headers['x-binance-testnet'] = saved.isTestnet ? 'true' : 'false';
    }

    try {
      const res = await fetch('/api/shadow-account', {
        headers,
        cache: 'no-store',
      });
      const json = await res.json();

      if (json.success && json.data) {
        setData(json);
      } else {
        setError(json.error || 'Gagal mengambil data shadow account');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan jaringan.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-8 font-mono">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-purple-500/20 pb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <History className="w-8 h-8 text-purple-400" />
              <span className="bg-gradient-to-r from-purple-400 to-pink-500 text-transparent bg-clip-text">
                Shadow Account
              </span>
            </h1>
            <p className="text-zinc-400 mt-2 text-sm">
              Pemantauan Psikologi Trading & Analisis Riwayat Transaksi (Institusional Engine)
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 text-amber-300 flex items-center gap-2 transition-all cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              <span>{binanceConfig?.apiKey ? 'Kelola Kunci' : 'Hubungkan Binance'}</span>
            </button>

            <button
              onClick={fetchData}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-purple-400' : ''}`} />
              <span>{loading ? 'Menganalisis...' : 'Refresh'}</span>
            </button>
          </div>
        </header>

        <FuturesEcosystemNav />

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-900/20 border border-red-500/50 rounded-xl text-red-400">
            Error: {error}
          </div>
        ) : data && data.data ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {data.isDummy ? (
              <div className="p-4 bg-yellow-900/20 border border-yellow-500/50 rounded-xl text-yellow-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <p className="font-bold">Mode Simulasi (Benchmark Demo)</p>
                    <p className="mt-0.5 text-zinc-300">
                      Menampilkan sampel psikologi trading simulasi. Hubungkan akun Binance Anda
                      langsung di website untuk menganalisis perilaku & riwayat riil.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-3.5 py-1.5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xs rounded-lg flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Hubungkan Akun Riil</span>
                </button>
              </div>
            ) : (
              <div className="p-3.5 bg-emerald-900/20 border border-emerald-500/40 rounded-xl text-emerald-300 flex items-center gap-2.5 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>Akun Binance Terhubung:</strong> Menganalisis {data.data.totalTrades} riwayat
                  transaksi nyata dari akun Binance ({data.isTestnet ? 'Testnet' : 'Live'}).
                </span>
              </div>
            )}

            {/* Warning Banner based on Psychology State */}
            {data.data.warning && (
              <div
                className={`p-5 rounded-xl border flex items-center gap-4 ${
                  data.data.psychologyState.includes('Disiplin') ||
                  data.data.psychologyState.includes('Disciplined')
                    ? 'bg-emerald-900/20 border-emerald-500/50 text-emerald-400'
                    : 'bg-red-900/20 border-red-500/50 text-red-400'
                }`}
              >
                <Activity
                  className={`w-8 h-8 shrink-0 ${
                    data.data.psychologyState.includes('Disiplin') ? '' : 'animate-bounce'
                  }`}
                />
                <div>
                  <h3 className="text-lg font-bold uppercase tracking-wider">
                    Status Psikologi: {data.data.psychologyState}
                  </h3>
                  <p className="text-xs sm:text-sm mt-1 opacity-90 leading-relaxed">
                    {data.data.warning}
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#111] border border-white/10 rounded-xl p-5">
                <div className="text-zinc-500 text-xs font-semibold uppercase mb-1">
                  Win Rate Historis
                </div>
                <div className="text-3xl sm:text-4xl font-bold text-white">
                  {data.data.winRate}%
                </div>
                <div className="mt-2 text-xs text-zinc-400">
                  Dari total transaksi yang tersinkronisasi
                </div>
              </div>

              <div className="bg-[#111] border border-white/10 rounded-xl p-5">
                <div className="text-zinc-500 text-xs font-semibold uppercase mb-1">
                  Total Transaksi
                </div>
                <div className="text-3xl sm:text-4xl font-bold text-white">
                  {data.data.totalTrades}
                </div>
                <div className="mt-2 text-xs text-zinc-400">Sampel eksekusi terakhir</div>
              </div>

              <div className="bg-[#111] border border-white/10 rounded-xl p-5">
                <div className="text-zinc-500 text-xs font-semibold uppercase mb-1">
                  Rata-rata Transaksi / Hari
                </div>
                <div className="text-3xl sm:text-4xl font-bold text-white">
                  {data.data.avgTradesPerDay}
                </div>
                <div className="mt-2 text-xs text-zinc-400">Indikator deteksi Overtrading</div>
              </div>
            </div>

            <div className="bg-[#111] border border-white/10 rounded-xl p-6">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-purple-300">
                <Activity className="w-5 h-5 text-purple-400" />
                Riwayat Aktivitas Terakhir
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="text-[11px] text-zinc-500 uppercase bg-black/40 border-b border-white/10">
                    <tr>
                      <th className="px-4 py-3">Waktu</th>
                      <th className="px-4 py-3">Pair</th>
                      <th className="px-4 py-3">Side</th>
                      <th className="px-4 py-3 text-right">Price</th>
                      <th className="px-4 py-3 text-right">Qty</th>
                      <th className="px-4 py-3 text-right">Realized PnL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.data.recentActivity.map((trade) => {
                      const pnl = trade.realizedPnl ?? 0;
                      return (
                        <tr key={trade.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3 text-zinc-400">
                            {new Date(trade.timestamp).toLocaleString('id-ID')}
                          </td>
                          <td className="px-4 py-3 font-semibold text-white">{trade.symbol}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                trade.side === 'buy'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : 'bg-rose-500/20 text-rose-400'
                              }`}
                            >
                              {trade.side.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-zinc-200">
                            ${trade.price.toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-right text-zinc-400">{trade.amount}</td>
                          <td className="px-4 py-3 text-right font-mono font-bold">
                            <span
                              className={
                                pnl > 0
                                  ? 'text-emerald-400'
                                  : pnl < 0
                                  ? 'text-rose-400'
                                  : 'text-zinc-500'
                              }
                            >
                              {pnl > 0 ? '+' : ''}
                              {pnl !== 0 ? `$${pnl.toFixed(2)}` : '-'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                    {data.data.recentActivity.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-zinc-500">
                          Tidak ada data aktivitas transaksi
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <BinanceConnectModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          loadSavedConfig();
        }}
        onConnectionSuccess={() => {
          loadSavedConfig();
          fetchData();
        }}
      />
    </div>
  );
}
