'use client';

import React, { useEffect, useState } from 'react';
import { History, Brain, Activity, TrendingDown, TrendingUp, AlertTriangle } from 'lucide-react';
import { FuturesEcosystemNav } from '@/components/futures/FuturesEcosystemNav';

export default function ShadowAccountPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/shadow-account');
        const json = await res.json();
        
        if (json.success) {
          setData(json);
        } else {
          setError(json.error || 'Gagal mengambil data shadow account');
        }
      } catch (err) {
        setError('Terjadi kesalahan jaringan.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-8 font-mono">
      <div className="max-w-7xl mx-auto space-y-6">
        
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-purple-500/20 pb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <History className="w-8 h-8 text-purple-400" />
              <span className="bg-gradient-to-r from-purple-400 to-pink-500 text-transparent bg-clip-text">Shadow Account</span>
            </h1>
            <p className="text-zinc-400 mt-2 text-sm">Pemantauan Psikologi Trading & Analisis Riwayat (Institusional)</p>
          </div>
          <div className="bg-purple-900/20 border border-purple-500/30 px-4 py-2 rounded-lg flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-400 animate-pulse" />
            <span className="text-sm font-semibold text-purple-300">Psychology Engine Active</span>
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
            
            {data.isDummy && (
              <div className="p-4 bg-yellow-900/20 border border-yellow-500/50 rounded-xl text-yellow-400 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-bold">Mode Simulasi (Dummy Data)</p>
                  <p className="mt-1">Sistem gagal mengambil riwayat trading asli Anda (API Key tidak disetel atau riwayat kosong). Menampilkan profil psikologi simulasi.</p>
                </div>
              </div>
            )}

            {/* Warning Banner based on Psychology State */}
            {data.data.warning && (
              <div className={`p-5 rounded-xl border flex items-center gap-4 ${
                data.data.psychologyState.includes('Disciplined') 
                  ? 'bg-emerald-900/20 border-emerald-500/50 text-emerald-400'
                  : 'bg-red-900/20 border-red-500/50 text-red-400'
              }`}>
                <Activity className={`w-8 h-8 shrink-0 ${data.data.psychologyState.includes('Disciplined') ? '' : 'animate-bounce'}`} />
                <div>
                  <h3 className="text-lg font-bold uppercase tracking-wider">Status Psikologi: {data.data.psychologyState}</h3>
                  <p className="text-sm mt-1 opacity-90">{data.data.warning}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#111] border border-white/10 rounded-xl p-5">
                <div className="text-zinc-500 text-sm font-semibold uppercase mb-2">Win Rate</div>
                <div className="text-4xl font-bold text-white">{data.data.winRate}%</div>
                <div className="mt-2 text-xs text-zinc-400">Dari total trades yang dianalisis</div>
              </div>

              <div className="bg-[#111] border border-white/10 rounded-xl p-5">
                <div className="text-zinc-500 text-sm font-semibold uppercase mb-2">Total Trades</div>
                <div className="text-4xl font-bold text-white">{data.data.totalTrades}</div>
                <div className="mt-2 text-xs text-zinc-400">Aktivitas historis</div>
              </div>

              <div className="bg-[#111] border border-white/10 rounded-xl p-5">
                <div className="text-zinc-500 text-sm font-semibold uppercase mb-2">Avg Trades / Day</div>
                <div className="text-4xl font-bold text-white">{data.data.avgTradesPerDay}</div>
                <div className="mt-2 text-xs text-zinc-400">Indikator overtrading</div>
              </div>
            </div>

            <div className="bg-[#111] border border-white/10 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-purple-400" />
                Aktivitas Terakhir
              </h2>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-zinc-500 uppercase bg-black/40 border-b border-white/10">
                    <tr>
                      <th className="px-4 py-3">Waktu</th>
                      <th className="px-4 py-3">Pair</th>
                      <th className="px-4 py-3">Side</th>
                      <th className="px-4 py-3 text-right">Price</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.data.recentActivity.map((trade: any) => (
                      <tr key={trade.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 text-zinc-400">
                          {new Date(trade.timestamp).toLocaleString('id-ID')}
                        </td>
                        <td className="px-4 py-3 font-semibold">{trade.symbol}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            trade.side === 'buy' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {trade.side.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-mono">${trade.price.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right">{trade.amount}</td>
                      </tr>
                    ))}
                    {data.data.recentActivity.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-zinc-500">Tidak ada data aktivitas historis</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        ) : null}

      </div>
    </div>
  );
}
