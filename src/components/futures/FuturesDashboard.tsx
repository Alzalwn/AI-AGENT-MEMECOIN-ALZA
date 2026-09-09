'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  Zap,
  TrendingUp,
  TrendingDown,
  Layers,
  ArrowUpDown,
  Radio,
} from 'lucide-react';
import { BinanceFuturesSignal, FuturesMarketStats, FuturesDirection } from '../../types/futures';
import { FuturesHeroStats } from './FuturesHeroStats';
import { FuturesSignalCard } from './FuturesSignalCard';
import { FundingRateHeatmap } from './FundingRateHeatmap';
import { TradingViewModal } from './TradingViewModal';

export const FuturesDashboard: React.FC = () => {
  const [signals, setSignals] = useState<BinanceFuturesSignal[]>([]);
  const [marketStats, setMarketStats] = useState<FuturesMarketStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [directionFilter, setDirectionFilter] = useState<'ALL' | 'LONG' | 'SHORT'>('ALL');
  const [strategyFilter, setStrategyFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'SCORE' | 'RR' | 'VOLUME' | 'CHANGE'>('SCORE');
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Chart Modal
  const [selectedChartSymbol, setSelectedChartSymbol] = useState<string | null>(null);

  const fetchFuturesData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [signalsRes, marketRes] = await Promise.all([
        fetch('/api/futures/signals'),
        fetch('/api/futures/market'),
      ]);

      if (!signalsRes.ok || !marketRes.ok) {
        throw new Error('Gagal memuat data dari server');
      }

      const signalsData = await signalsRes.json();
      const marketData = await marketRes.json();

      if (signalsData.success) {
        setSignals(signalsData.signals || []);
      }
      if (marketData.success) {
        setMarketStats(marketData.stats || null);
      }
    } catch (err: unknown) {
      console.error('[FuturesDashboard] Fetch error:', err);
      setError('Koneksi ke endpoint pasar Binance tertunda. Mencoba kembali...');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFuturesData();
    // Auto-refresh data tiap 25 detik
    const interval = setInterval(fetchFuturesData, 25_000);
    return () => clearInterval(interval);
  }, [fetchFuturesData]);

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  // Filter & Sorting Logic
  const filteredSignals = signals
    .filter((sig) => !dismissedIds.has(sig.id))
    .filter((sig) => {
      // Filter Arah
      if (directionFilter !== 'ALL' && sig.direction !== directionFilter) return false;
      // Filter Strategi
      if (strategyFilter !== 'ALL' && sig.strategy !== strategyFilter) return false;
      // Filter Pencarian (Semua koin)
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toUpperCase();
        if (!sig.symbol.includes(q) && !sig.baseAsset.includes(q)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'SCORE') return b.overallScore - a.overallScore;
      if (sortBy === 'RR') return b.riskRewardRatio - a.riskRewardRatio;
      if (sortBy === 'VOLUME') return b.derivativesData.volume24hUsd - a.derivativesData.volume24hUsd;
      if (sortBy === 'CHANGE') return Math.abs(b.derivativesData.priceChange24hPct) - Math.abs(a.derivativesData.priceChange24hPct);
      return 0;
    });

  return (
    <div className="flex flex-col gap-5 font-sans">
      {/* 1. Market Telemetry Hero */}
      <FuturesHeroStats
        stats={marketStats}
        isLoading={isLoading}
        onRefresh={fetchFuturesData}
        onSelectSqueezeSymbol={(sym) => {
          setSearchQuery(sym.replace('USDT', ''));
        }}
      />

      {/* 2. Funding Rate & Squeeze Matrix */}
      <FundingRateHeatmap
        stats={marketStats}
        onSelectCoin={(sym) => setSearchQuery(sym.replace('USDT', ''))}
        onOpenChart={(sym) => setSelectedChartSymbol(sym)}
      />

      {/* 3. Filter & Control Bar */}
      <div className="bg-[#0e0e0e] border border-white/10 rounded-2xl p-3.5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-lg">
        {/* Search Input for All Coins */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari semua koin futures (BTC, ETH, SOL, DOGE, SUI, PEPE...)"
            className="w-full bg-zinc-900/90 border border-zinc-700/80 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-500/60 font-mono transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Direction Filter Segmented Buttons */}
        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
          {[
            { key: 'ALL', label: 'Semua' },
            { key: 'LONG', label: '🟢 Longs' },
            { key: 'SHORT', label: '🔴 Shorts' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setDirectionFilter(key as 'ALL' | 'LONG' | 'SHORT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer font-mono ${
                directionFilter === key
                  ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Strategy Selector */}
        <div className="flex items-center gap-2">
          <select
            value={strategyFilter}
            onChange={(e) => setStrategyFilter(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-yellow-500/60 cursor-pointer"
          >
            <option value="ALL">Semua Strategi</option>
            <option value="BREAKOUT_MOMENTUM">🚀 Breakout Momentum</option>
            <option value="FUNDING_SQUEEZE">⚡ Funding Squeeze</option>
            <option value="RSI_EXTREME_REVERSAL">🔄 Oversold / Overbought</option>
          </select>

          {/* Sort By Selector */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'SCORE' | 'RR' | 'VOLUME' | 'CHANGE')}
            className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-yellow-500/60 cursor-pointer"
          >
            <option value="SCORE">Sortir: Skor AI</option>
            <option value="RR">Sortir: Rasio R:R</option>
            <option value="VOLUME">Sortir: Volume 24h</option>
            <option value="CHANGE">Sortir: Volatilitas</option>
          </select>
        </div>
      </div>

      {/* 4. Live Signal Feed Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-mono font-black text-sm text-zinc-100 uppercase tracking-wider flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            Live Futures Alpha Signals
          </h3>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
            {filteredSignals.length} Sinyal Lolos Filter
          </span>
        </div>

        <span className="text-[11px] text-zinc-500 font-mono hidden sm:block">
          Auto-Refresh Tiap 25 Detik • Non-Custodial Binance Public Ingestion
        </span>
      </div>

      {/* 5. Signal Grid / Empty State */}
      {filteredSignals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredSignals.map((signal) => (
            <FuturesSignalCard
              key={signal.id}
              signal={signal}
              onOpenChart={(sym) => setSelectedChartSymbol(sym)}
              onDismiss={handleDismiss}
            />
          ))}
        </div>
      ) : (
        /* Empty State Radar */
        <div className="bg-[#0c0c0e] border border-white/10 rounded-2xl p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center mb-4 text-yellow-400">
            <Zap className="w-8 h-8 animate-pulse" />
          </div>
          <h4 className="text-base font-bold text-zinc-100 font-mono mb-1">
            {searchQuery ? `Tidak Ada Sinyal untuk "${searchQuery}"` : 'Memindai Peluang Futures Presisi Tinggi...'}
          </h4>
          <p className="text-xs text-zinc-400 max-w-md">
            Filter kuantitatif ketat sedang menyaring ratusan pasangan koin di Binance Futures. Hanya sinyal dengan Risk/Reward $\ge 2.5$ dan konfirmasi multi-agen yang akan diterbitkan.
          </p>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="mt-4 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold font-mono transition-colors"
            >
              Reset Pencarian
            </button>
          )}
        </div>
      )}

      {/* 6. TradingView Interactive Modal */}
      {selectedChartSymbol && (
        <TradingViewModal
          isOpen={Boolean(selectedChartSymbol)}
          onClose={() => setSelectedChartSymbol(null)}
          symbol={selectedChartSymbol}
        />
      )}
    </div>
  );
};
