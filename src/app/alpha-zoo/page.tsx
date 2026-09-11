'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bot, RefreshCw, AlertTriangle, TrendingUp, TrendingDown, Target, Info } from 'lucide-react';
import { FuturesSignalCard } from '@/components/futures/FuturesSignalCard';

interface Anomaly {
  symbol: string;
  price: number;
  change24h: number;
  volatility24h: number;
  volumeUsd: number;
  anomalyType: string;
  score: number;
  action: string;
  timestamp: number;
  consensusAction?: string;
  microSignal?: any;
}

export default function AlphaZooPage() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [scannedCount, setScannedCount] = useState(0);
  const [error, setError] = useState('');
  const [selectedSignal, setSelectedSignal] = useState<any | null>(null);

  const fetchAnomalies = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/alpha-zoo');
      const json = await res.json();
      if (json.success) {
        setAnomalies(json.data);
        setScannedCount(json.totalScanned);
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
    fetchAnomalies();
    const interval = setInterval(fetchAnomalies, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans p-6 selection:bg-emerald-500/30">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/" className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-zinc-400" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <Bot className="w-6 h-6 text-emerald-400" />
                <h1 className="text-2xl font-bold">Alpha Zoo (Live Engine)</h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 uppercase">
                  Connected
                </span>
              </div>
              <p className="text-zinc-500 text-sm mt-1">
                Memindai {scannedCount > 0 ? scannedCount : 'ratusan'} pasangan Binance Futures menggunakan 462 rumus kuantitatif.
              </p>
            </div>
          </div>
          
          <button 
            onClick={fetchAnomalies}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl transition-all text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : 'text-zinc-400'}`} />
            {isLoading ? 'Memindai...' : 'Pindai Ulang'}
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 mb-6 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-400">
            <AlertTriangle className="w-5 h-5" />
            <p>{error}</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && anomalies.length === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-64 bg-zinc-900/50 border border-zinc-800/50 rounded-2xl" />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && anomalies.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center p-12 bg-zinc-900/20 border border-zinc-800/50 rounded-2xl">
            <Target className="w-12 h-12 text-zinc-600 mb-4" />
            <h3 className="text-xl font-bold mb-2">Tidak Ada Anomali Ekstrim</h3>
            <p className="text-zinc-500 text-center max-w-md">
              Kondisi pasar saat ini stabil dan tidak memenuhi kriteria anomali algoritma Alpha Zoo. Sistem akan terus memantau di background.
            </p>
          </div>
        )}

        {/* Anomalies Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {anomalies.map((item, idx) => {
            const isBullish = item.change24h > 0;
            const hasConsensus = !!item.consensusAction;
            const isConfirmed = hasConsensus && item.consensusAction?.includes('TERKONFIRMASI');
            const isWait = hasConsensus && item.consensusAction?.includes('WAIT');
            
            return (
              <div 
                key={idx} 
                onClick={() => {
                  if (item.microSignal) {
                    setSelectedSignal(item.microSignal);
                  }
                }}
                className={`relative p-5 bg-zinc-900/40 border ${item.microSignal ? 'border-emerald-500/30 hover:border-emerald-500/60 cursor-pointer' : 'border-zinc-800'} rounded-2xl hover:bg-zinc-900/80 transition-all flex flex-col justify-between`}
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-black text-white">{item.symbol}</h3>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-zinc-400 font-mono">${item.price.toLocaleString(undefined, { maximumFractionDigits: 6 })}</span>
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${isBullish ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                          {isBullish ? '+' : ''}{item.change24h.toFixed(2)}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end">
                      <span className="text-xs text-zinc-500 uppercase font-bold tracking-wider mb-1">AI Score</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xl font-black text-yellow-400">{item.score}</span>
                        <span className="text-zinc-600">/100</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 mb-5">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-zinc-500">Tipe Anomali</span>
                      <span className="font-bold text-zinc-300 text-right">{item.anomalyType.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-zinc-500">Volatilitas (24h)</span>
                      <span className="font-mono text-zinc-300">{item.volatility24h.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-zinc-500">Volume</span>
                      <span className="font-mono text-zinc-300">${(item.volumeUsd / 1000000).toFixed(1)}M</span>
                    </div>
                    
                    {/* Micro Signal Injection */}
                    {item.microSignal && (
                      <div className="pt-3 mt-3 border-t border-zinc-800/80">
                        <span className="text-xs text-zinc-500 block mb-1">🔍 Mikro Analisa (15m):</span>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-zinc-400">Tren Micro</span>
                          <span className={`font-bold ${item.microSignal.direction === 'LONG' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {item.microSignal.direction}
                          </span>
                        </div>
                        {item.microSignal.candlestickPattern && (
                          <div className="flex justify-between items-center text-xs mt-1">
                            <span className="text-zinc-400">Pola Lilin</span>
                            <span className="font-bold text-amber-300">{item.microSignal.candlestickPattern.name}</span>
                          </div>
                        )}
                        <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-emerald-400 font-bold bg-emerald-500/10 py-1.5 rounded-lg border border-emerald-500/20">
                          <Info className="w-3.5 h-3.5" />
                          KLIK UNTUK LIHAT DETAIL ANALISIS
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2 mt-auto">
                  {/* Macro Action */}
                  <div className="p-2.5 rounded-lg border flex items-center justify-between bg-zinc-950 border-zinc-800">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Arah Makro (24h)</span>
                    <div className="flex items-center gap-1.5 font-bold text-xs text-zinc-300">
                      {item.action}
                    </div>
                  </div>
                  
                  {/* Consensus Action */}
                  {hasConsensus && (
                    <div className={`p-3 rounded-xl border flex items-center justify-between ${
                      isConfirmed && item.consensusAction?.includes('BUY') ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' :
                      isConfirmed && item.consensusAction?.includes('SELL') ? 'bg-red-500/20 border-red-500/40 text-red-400' :
                      isWait ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
                      'bg-zinc-800/50 border-zinc-700 text-zinc-300'
                    }`}>
                      <span className="text-xs font-bold uppercase tracking-wider">KONSENSUS AI</span>
                      <div className="flex items-center gap-1.5 font-black text-sm">
                        {isConfirmed && item.consensusAction?.includes('BUY') && <TrendingUp className="w-4 h-4" />}
                        {isConfirmed && item.consensusAction?.includes('SELL') && <TrendingDown className="w-4 h-4" />}
                        {isWait && <AlertTriangle className="w-4 h-4" />}
                        {item.consensusAction}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Detail Signal */}
      {selectedSignal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto" onClick={() => setSelectedSignal(null)}>
          <div 
            className="relative w-full max-w-xl max-h-[95vh] overflow-y-auto rounded-2xl no-scrollbar"
            onClick={e => e.stopPropagation()}
          >
             <FuturesSignalCard 
               signal={selectedSignal} 
               onOpenChart={(symbol) => {
                 window.open(`https://www.binance.com/en/futures/${symbol}`, '_blank');
               }}
               onDismiss={() => setSelectedSignal(null)}
             />
          </div>
        </div>
      )}
    </div>
  );
}
