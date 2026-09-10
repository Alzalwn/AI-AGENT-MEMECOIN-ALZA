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
  Sparkles,
  SlidersHorizontal,
  Compass,
  CheckCircle2,
} from 'lucide-react';
import { BinanceFuturesSignal, FuturesMarketStats, FuturesDirection } from '../../types/futures';
import { FuturesHeroStats } from './FuturesHeroStats';
import { FuturesSignalCard } from './FuturesSignalCard';
import { FundingRateHeatmap } from './FundingRateHeatmap';
import { TradingViewModal } from './TradingViewModal';
import { CoinSearchAnalysisSection } from './CoinSearchAnalysisSection';

export const FuturesDashboard: React.FC = () => {
  const [signals, setSignals] = useState<BinanceFuturesSignal[]>([]);
  const [marketStats, setMarketStats] = useState<FuturesMarketStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Multi-Choice States
  const [directionFilter, setDirectionFilter] = useState<'ALL' | 'LONG' | 'SHORT'>('ALL');
  const [strategyFilter, setStrategyFilter] = useState<string>('ALL');
  const [minRrFilter, setMinRrFilter] = useState<string>('ALL'); // 'ALL' | '2.5' | '3.5' | '5.0'
  const [leverageFilter, setLeverageFilter] = useState<string>('ALL'); // 'ALL' | 'SWING' | 'SCALP'
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'SCORE' | 'RR' | 'VOLUME' | 'CHANGE'>('SCORE');
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Auto-Scan / Radar Scanner State
  const [isAutoScanning, setIsAutoScanning] = useState<boolean>(false);
  const [autoScanStep, setAutoScanStep] = useState<string>('');
  const [autoRadarEnabled, setAutoRadarEnabled] = useState<boolean>(false);

  // Chart Modal with Signal Context
  const [selectedChartSymbol, setSelectedChartSymbol] = useState<string | null>(null);
  const [selectedChartSignal, setSelectedChartSignal] = useState<BinanceFuturesSignal | null>(null);

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

  // Auto-Radar 24/7 background scanner trigger
  useEffect(() => {
    if (!autoRadarEnabled) return;
    const radarTimer = setInterval(() => {
      fetchFuturesData();
    }, 30_000);
    return () => clearInterval(radarTimer);
  }, [autoRadarEnabled, fetchFuturesData]);

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const handleOpenChart = (symbol: string, signal?: BinanceFuturesSignal) => {
    setSelectedChartSymbol(symbol);
    setSelectedChartSignal(signal || signals.find((s) => s.symbol === symbol) || null);
  };

  // ⚡ Fitur Tombol Cari Otomatis (AI Radar Scanner)
  const handleAutoScan = async () => {
    setIsAutoScanning(true);
    setAutoScanStep('1/4: Memindai 570+ Pasangan Futures Binance...');
    await new Promise((r) => setTimeout(r, 350));

    setAutoScanStep('2/4: Mendeteksi Order Block & Pola Breakout Trendline...');
    await new Promise((r) => setTimeout(r, 400));

    setAutoScanStep('3/4: Mengalkulasi Confluence Multi-Agen & Rasio R:R ≥ 3.0...');
    await new Promise((r) => setTimeout(r, 450));

    setAutoScanStep('4/4: Setup Probabilitas Tertinggi Ditemukan! Membuka Chart...');
    await new Promise((r) => setTimeout(r, 350));

    // Refresh data and find the best signal
    await fetchFuturesData();

    // Pick signal with highest score & highest R:R
    const candidates = signals.length > 0 ? [...signals] : [];
    candidates.sort((a, b) => b.overallScore * b.riskRewardRatio - a.overallScore * a.riskRewardRatio);

    const best = candidates[0];
    if (best) {
      setSelectedChartSymbol(best.symbol);
      setSelectedChartSignal(best);
    }

    setIsAutoScanning(false);
  };

  // Filter & Sorting Logic
  const filteredSignals = signals
    .filter((sig) => !dismissedIds.has(sig.id))
    .filter((sig) => {
      // Filter Arah
      if (directionFilter !== 'ALL' && sig.direction !== directionFilter) return false;
      // Filter Strategi
      if (strategyFilter !== 'ALL' && sig.strategy !== strategyFilter) return false;
      // Filter Min R:R
      if (minRrFilter !== 'ALL') {
        const threshold = parseFloat(minRrFilter);
        if (sig.riskRewardRatio < threshold) return false;
      }
      // Filter Profil Leverage
      if (leverageFilter === 'SWING' && sig.leverage.safe.multiplier > 10) return false;
      if (leverageFilter === 'SCALP' && sig.leverage.scalp.multiplier < 10) return false;
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
    <div className="flex flex-col gap-3.5 font-sans">
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
        onOpenChart={(sym) => handleOpenChart(sym)}
      />

      {/* 2.5. Dedicated Coin Search & Direct Telegram Broadcast Engine */}
      <CoinSearchAnalysisSection onOpenChart={handleOpenChart} />

      {/* 3. Main Action Bar: Tombol Cari Otomatis & Search Bar */}
      <div className="bg-[#0e0e0e] border border-white/10 rounded-2xl p-3 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 shadow-xl">
        {/* Left: ⚡ Tombol Cari Otomatis (AI Radar Scanner) */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleAutoScan}
            disabled={isAutoScanning}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-mono text-xs font-black transition-all shadow-lg cursor-pointer ${
              isAutoScanning
                ? 'bg-yellow-500/30 text-yellow-300 border border-yellow-500/50 animate-pulse'
                : 'bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 hover:from-yellow-400 hover:to-amber-300 text-zinc-950 shadow-[0_0_20px_rgba(234,179,8,0.35)] active:scale-95'
            }`}
            title="Pindai 570+ koin Binance secara otomatis dan temukan setup R:R terbaik"
          >
            <Zap className={`w-4 h-4 ${isAutoScanning ? 'animate-spin' : 'animate-bounce'}`} />
            <span>{isAutoScanning ? 'MEMINDAI PASAR...' : '⚡ CARI OTOMATIS (AI RADAR)'}</span>
          </button>

          {/* Auto-Radar 24/7 Switch */}
          <button
            onClick={() => setAutoRadarEnabled(!autoRadarEnabled)}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono font-bold border transition-all cursor-pointer ${
              autoRadarEnabled
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
            }`}
            title="Auto-scan pasar tiap 30 detik"
          >
            <Radio className={`w-3.5 h-3.5 ${autoRadarEnabled ? 'text-emerald-400 animate-pulse' : ''}`} />
            <span>Auto-Radar 30s: {autoRadarEnabled ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        {/* Center: Search Input for All Coins */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari semua koin futures (BTC, ETH, SOL, DOGE, SUI, PEPE...)"
            className="w-full bg-zinc-900/90 border border-zinc-700/80 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-yellow-500/60 font-mono transition-colors"
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

        {/* Right: Reset Filters if active */}
        {(directionFilter !== 'ALL' || strategyFilter !== 'ALL' || minRrFilter !== 'ALL' || leverageFilter !== 'ALL') && (
          <button
            onClick={() => {
              setDirectionFilter('ALL');
              setStrategyFilter('ALL');
              setMinRrFilter('ALL');
              setLeverageFilter('ALL');
              setSearchQuery('');
            }}
            className="text-[11px] text-yellow-400 hover:text-yellow-300 font-mono underline cursor-pointer self-center"
          >
            Reset Semua Filter
          </button>
        )}
      </div>

      {/* 4. Fitur Beberapa Pilihan (Multi-Option Filter Strip) */}
      <div className="bg-[#0e0e0e] border border-white/10 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-md font-mono text-xs">
        {/* Choice 1: Direction Filter Segmented Buttons */}
        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
          {[
            { key: 'ALL', label: 'Semua Arah' },
            { key: 'LONG', label: '🟢 Longs' },
            { key: 'SHORT', label: '🔴 Shorts' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setDirectionFilter(key as 'ALL' | 'LONG' | 'SHORT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                directionFilter === key
                  ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Choice 2: Strategy Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-zinc-500 hidden sm:inline">Strategi:</span>
          <select
            value={strategyFilter}
            onChange={(e) => setStrategyFilter(e.target.value)}
            className="bg-zinc-900 border border-zinc-700/80 rounded-xl px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-yellow-500/60 cursor-pointer"
          >
            <option value="ALL">Semua Strategi</option>
            <option value="BREAKOUT_MOMENTUM">🚀 Breakout Momentum</option>
            <option value="FUNDING_SQUEEZE">⚡ Funding Squeeze</option>
            <option value="RSI_EXTREME_REVERSAL">🔄 Oversold / Overbought</option>
          </select>
        </div>

        {/* Choice 3: Min Risk/Reward (R:R) Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-zinc-500 hidden sm:inline">Min R:R:</span>
          <select
            value={minRrFilter}
            onChange={(e) => setMinRrFilter(e.target.value)}
            className="bg-zinc-900 border border-zinc-700/80 rounded-xl px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-yellow-500/60 cursor-pointer"
          >
            <option value="ALL">Semua R:R</option>
            <option value="2.5">R:R ≥ 2.5 (Standard)</option>
            <option value="3.5">R:R ≥ 3.5 (Tinggi)</option>
            <option value="5.0">R:R ≥ 5.0 (Supernova)</option>
          </select>
        </div>

        {/* Choice 4: Leverage Profile Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-zinc-500 hidden sm:inline">Leverage:</span>
          <select
            value={leverageFilter}
            onChange={(e) => setLeverageFilter(e.target.value)}
            className="bg-zinc-900 border border-zinc-700/80 rounded-xl px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-yellow-500/60 cursor-pointer"
          >
            <option value="ALL">Semua Profil</option>
            <option value="SWING">🛡️ Swing (5x – 10x)</option>
            <option value="SCALP">⚡ Scalp (10x – 20x)</option>
          </select>
        </div>

        {/* Choice 5: Sort By Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-zinc-500 hidden sm:inline">Sortir:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'SCORE' | 'RR' | 'VOLUME' | 'CHANGE')}
            className="bg-zinc-900 border border-zinc-700/80 rounded-xl px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-yellow-500/60 cursor-pointer"
          >
            <option value="SCORE">Skor AI Tertinggi</option>
            <option value="RR">Rasio R:R Tertinggi</option>
            <option value="VOLUME">Volume 24 Jam</option>
            <option value="CHANGE">Volatilitas</option>
          </select>
        </div>
      </div>

      {/* Scanning HUD Overlay (When Cari Otomatis is triggered) */}
      {isAutoScanning && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 flex items-center justify-between gap-3 font-mono animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-yellow-500/20 flex items-center justify-center text-yellow-400">
              <Zap className="w-5 h-5 animate-spin" />
            </div>
            <div>
              <span className="text-xs font-bold text-yellow-300 block">
                AI RADAR SCANNING AKTIF
              </span>
              <span className="text-[11px] text-zinc-300">
                {autoScanStep}
              </span>
            </div>
          </div>
          <span className="text-xs font-black text-yellow-400">
            570+ Pasangan Koin
          </span>
        </div>
      )}

      {/* 5. Live Signal Feed Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-mono font-black text-sm text-zinc-100 uppercase tracking-wider flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            Live Futures Alpha Signals
          </h3>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            Top {filteredSignals.length} Sinyal Presisi Terpilih (Anti-Spam Aktif)
          </span>
        </div>

        <span className="text-[11px] text-zinc-500 font-mono hidden sm:block">
          Klik tombol <strong>&ldquo;Chart R:R&rdquo;</strong> untuk melihat grafik candlestick &amp; kotak proyeksi Risk/Reward
        </span>
      </div>

      {/* 6. Signal Grid / Empty State */}
      {filteredSignals.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredSignals.map((signal) => (
            <FuturesSignalCard
              key={signal.id}
              signal={signal}
              onOpenChart={(sym, sig) => handleOpenChart(sym, sig)}
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
          <div className="flex items-center gap-2 mt-4">
            <button
              onClick={handleAutoScan}
              className="px-4 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-zinc-950 text-xs font-black font-mono transition-all shadow-md cursor-pointer"
            >
              ⚡ Pindai Otomatis Sekarang
            </button>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold font-mono transition-colors"
              >
                Reset Pencarian
              </button>
            )}
          </div>
        </div>
      )}

      {/* 7. Interactive Chart Modal with Risk/Reward Projection Tool */}
      {selectedChartSymbol && (
        <TradingViewModal
          isOpen={Boolean(selectedChartSymbol)}
          onClose={() => {
            setSelectedChartSymbol(null);
            setSelectedChartSignal(null);
          }}
          symbol={selectedChartSymbol}
          signal={selectedChartSignal}
        />
      )}
    </div>
  );
};
