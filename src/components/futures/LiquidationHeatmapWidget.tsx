'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Flame,
  Zap,
  Target,
  AlertTriangle,
  RefreshCw,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Crosshair,
  Layers,
  Copy,
  Check,
  TrendingUp,
  TrendingDown,
  Info,
  ShieldAlert,
} from 'lucide-react';
import {
  LiquidationAnalysisResult,
  formatLiqPrice,
  formatUsdVolume,
} from '../../engine/liquidationEngine';

interface LiquidationHeatmapWidgetProps {
  initialSymbol?: string;
  onOpenChart?: (symbol: string) => void;
  onSelectCoin?: (symbol: string) => void;
}

const POPULAR_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'DOGEUSDT', 'PEPEUSDT', 'BNBUSDT', 'SUIUSDT', 'XRPUSDT'];

export const LiquidationHeatmapWidget: React.FC<LiquidationHeatmapWidgetProps> = ({
  initialSymbol = 'BTCUSDT',
  onOpenChart,
  onSelectCoin,
}) => {
  const [selectedSymbol, setSelectedSymbol] = useState<string>(initialSymbol);
  const [searchInput, setSearchInput] = useState<string>('');
  const [interval, setInterval] = useState<'15m' | '1h' | '4h'>('1h');
  const [leverageFilter, setLeverageFilter] = useState<'ALL' | '100x' | '50x' | '25x' | '10x'>('ALL');
  
  const [data, setData] = useState<(LiquidationAnalysisResult & {
    fundingRate: number;
    high24h: number;
    low24h: number;
    priceChangePct24h: number;
  }) | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const fetchLiquidationData = useCallback(async (sym: string, tf: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/futures/liquidation?symbol=${sym}&interval=${tf}`);
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
      } else {
        setError(json.error || 'Gagal memuat data likuidasi');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Koneksi ke server Binance terputus');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLiquidationData(selectedSymbol, interval);
  }, [selectedSymbol, interval, fetchLiquidationData]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchInput.trim()) return;
    const clean = searchInput.trim().toUpperCase();
    const full = clean.endsWith('USDT') ? clean : `${clean}USDT`;
    setSelectedSymbol(full);
    setSearchInput('');
  };

  const handleCopyMagnetPrice = (price: number) => {
    navigator.clipboard.writeText(price.toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filter clusters by leverage
  const filteredBuckets = data?.priceBuckets.filter((b) => {
    if (leverageFilter === 'ALL') return true;
    return b.dominantLeverage === leverageFilter;
  }) || [];

  return (
    <div className="bg-[#0b0e14] border border-white/10 rounded-2xl p-4 sm:p-5 shadow-2xl font-mono text-zinc-200">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-red-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.25)]">
            <Flame className="w-5 h-5 text-amber-400 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                PETA LIKUIDASI BINANCE
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded font-mono font-bold">
                  HEATMAP 25X/50X/100X
                </span>
              </h2>
            </div>
            <p className="text-xs text-zinc-400">
              Estimasi kluster likuidasi Stop-Hunt &amp; Zona Gravitasi Likuiditas Smart Money
            </p>
          </div>
        </div>

        {/* Quick Search & Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search form */}
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Cari koin (e.g. SOL, PEPE)..."
              className="w-44 sm:w-52 px-3 py-1.5 pl-8 bg-zinc-900/90 border border-zinc-700/80 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/70"
            />
            <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 pointer-events-none" />
          </form>

          {/* Timeframe selector */}
          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-xl p-0.5 text-xs">
            {(['15m', '1h', '4h'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setInterval(tf)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  interval === tf
                    ? 'bg-amber-500 text-zinc-950 shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Refresh button */}
          <button
            onClick={() => fetchLiquidationData(selectedSymbol, interval)}
            disabled={isLoading}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-amber-400 hover:border-amber-500/40 transition-colors cursor-pointer disabled:opacity-50"
            title="Muat ulang data likuidasi"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Popular Coin Tags */}
      <div className="flex items-center gap-1.5 py-3 overflow-x-auto no-scrollbar border-b border-white/5">
        <span className="text-[11px] text-zinc-500 font-bold shrink-0 mr-1">TOP PAIRS:</span>
        {POPULAR_SYMBOLS.map((sym) => (
          <button
            key={sym}
            onClick={() => {
              setSelectedSymbol(sym);
              if (onSelectCoin) onSelectCoin(sym);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedSymbol === sym
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-zinc-950 font-black shadow-md shadow-amber-500/20'
                : 'bg-zinc-900/80 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800/80'
            }`}
          >
            {sym.replace('USDT', '')}
          </button>
        ))}
      </div>

      {/* 3. Main Metrics Strip */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4">
          {/* Current Mark Price Card */}
          <div className="bg-zinc-900/60 border border-white/5 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>MARK PRICE ({data.symbol})</span>
              <span className={`font-bold flex items-center gap-0.5 ${data.priceChangePct24h >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {data.priceChangePct24h >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                {data.priceChangePct24h >= 0 ? '+' : ''}{data.priceChangePct24h.toFixed(2)}%
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-white mt-1">
              ${formatLiqPrice(data.currentPrice)}
            </div>
            <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-2">
              <span>24h L: ${formatLiqPrice(data.low24h)}</span>
              <span>24h H: ${formatLiqPrice(data.high24h)}</span>
            </div>
          </div>

          {/* Long vs Short Liquidation Pool Ratio */}
          <div className="bg-zinc-900/60 border border-white/5 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span>POOL LIKUIDASI (ESTIMASI)</span>
              <span className="text-[10px] bg-zinc-800 text-zinc-300 px-1.5 py-0.5 rounded font-bold">
                R: {data.longShortLiqRatio}:1
              </span>
            </div>
            <div className="space-y-1.5 mt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" /> Long Liq Pool (Bawah):
                </span>
                <span className="font-bold text-white">{formatUsdVolume(data.totalLongLiquidationUsd)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-red-400 font-bold flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Short Liq Pool (Atas):
                </span>
                <span className="font-bold text-white">{formatUsdVolume(data.totalShortLiquidationUsd)}</span>
              </div>
              {/* Ratio Bar */}
              <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden flex mt-2">
                <div
                  className="bg-emerald-500 h-full transition-all"
                  style={{
                    width: `${Math.min(90, Math.max(10, (data.totalLongLiquidationUsd / (data.totalLongLiquidationUsd + data.totalShortLiquidationUsd)) * 100))}%`,
                  }}
                  title="Porsi Long Pool"
                />
                <div
                  className="bg-red-500 h-full transition-all"
                  style={{
                    width: `${Math.min(90, Math.max(10, (data.totalShortLiquidationUsd / (data.totalLongLiquidationUsd + data.totalShortLiquidationUsd)) * 100))}%`,
                  }}
                  title="Porsi Short Pool"
                />
              </div>
            </div>
          </div>

          {/* Squeeze Risk Meter */}
          <div className="bg-zinc-900/60 border border-white/5 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="text-xs text-zinc-400 flex items-center justify-between">
              <span>STATUS RISIKO SQUEEZE</span>
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="mt-1">
              <span
                className={`inline-block px-2.5 py-1 rounded-lg text-xs font-black tracking-wide ${
                  data.squeezeRisk.includes('SHORT_SQUEEZE')
                    ? 'bg-red-500/20 text-red-300 border border-red-500/50'
                    : data.squeezeRisk.includes('LONG_CASCADE')
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                }`}
              >
                {data.squeezeRisk.replace(/_/g, ' ')}
              </span>
              <p className="text-[11px] text-zinc-400 mt-2 leading-relaxed">
                {data.squeezeRisk.includes('SHORT')
                  ? 'Kumpulan short sellers sangat padat. Berisiko terjadi Short Squeeze impulsif ke atas!'
                  : data.squeezeRisk.includes('LONG')
                  ? 'Banyak posisi long leverage tinggi mengendap di support. Berisiko long cascade dump!'
                  : 'Distribusi likuidasi dua arah relatif seimbang.'}
              </p>
            </div>
          </div>

          {/* Liquidity Magnet Target */}
          <div className="bg-gradient-to-br from-amber-950/20 via-zinc-900/80 to-zinc-900/60 border border-amber-500/30 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-amber-300 font-bold">
              <span className="flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-amber-400" />
                MAGNET TARGET UTAMA
              </span>
              <button
                onClick={() => handleCopyMagnetPrice(data.liquidityMagnet.targetPrice)}
                className="text-zinc-400 hover:text-white transition-colors"
                title="Salin level target harga"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-black text-amber-400">
                ${formatLiqPrice(data.liquidityMagnet.targetPrice)}
              </span>
              <span className={`text-xs font-bold ${data.liquidityMagnet.distancePct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                ({data.liquidityMagnet.distancePct >= 0 ? '+' : ''}{data.liquidityMagnet.distancePct.toFixed(1)}%)
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 mt-1 line-clamp-2">
              {data.liquidityMagnet.description}
            </p>
          </div>
        </div>
      )}

      {/* 4. Liquidity Sweep Alert Box (Turtle Soup) */}
      {data?.sweepStatus.isRecentSweep && (
        <div className="mt-4 bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-zinc-900/50 border border-cyan-500/40 rounded-xl p-3.5 flex items-start gap-3">
          <Zap className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5 animate-bounce" />
          <div className="text-xs space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-cyan-300 uppercase tracking-wider">
                ⚡ SINYAL REVERSAL KONFIRMASI: {data.sweepStatus.actionableBias.replace(/_/g, ' ')}
              </span>
              <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded font-bold border border-cyan-500/40">
                ICT TURTLE SOUP
              </span>
            </div>
            <p className="text-zinc-300 leading-relaxed">
              {data.sweepStatus.note}
            </p>
          </div>
        </div>
      )}

      {/* 5. Leverage Filter & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-5 pt-3 border-t border-white/5">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <span className="text-xs text-zinc-500 font-bold shrink-0 mr-1">FILTER TIER:</span>
          {(['ALL', '100x', '50x', '25x', '10x'] as const).map((tier) => (
            <button
              key={tier}
              onClick={() => setLeverageFilter(tier)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                leverageFilter === tier
                  ? 'bg-white text-zinc-950 font-black'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              {tier === 'ALL' ? 'Semua Leverage' : tier}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {onOpenChart && (
            <button
              onClick={() => onOpenChart(selectedSymbol)}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white hover:border-amber-500/50 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Crosshair className="w-3.5 h-3.5 text-amber-400" />
              <span>Buka Setup Chart</span>
            </button>
          )}
        </div>
      </div>

      {/* 6. Liquidation Heatmap Ladder / Depth Bars */}
      <div className="mt-4 bg-zinc-950/80 border border-white/5 rounded-xl p-3 sm:p-4 overflow-hidden">
        <div className="flex items-center justify-between text-xs text-zinc-400 pb-2 border-b border-zinc-800">
          <span className="font-bold flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-zinc-500" />
            LEVEL HARGA (PRICE LADDER)
          </span>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-500/80" /> Short Liq (Atas)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/80" /> Long Liq (Bawah)
            </span>
            <span className="text-zinc-500">DENSITAS VOLUME ESTIMASI</span>
          </div>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-zinc-500 text-xs flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
            <span>Mengalkulasi zona likuidasi dan order book {selectedSymbol}...</span>
          </div>
        ) : error ? (
          <div className="py-12 text-center text-red-400 text-xs flex flex-col items-center justify-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            <span>{error}</span>
          </div>
        ) : filteredBuckets.length === 0 ? (
          <div className="py-12 text-center text-zinc-500 text-xs">
            Tidak ada cluster likuidasi yang terdeteksi untuk tier leverage ini.
          </div>
        ) : (
          <div className="space-y-1.5 mt-3">
            {/* Tampilkan bar diurutkan dari harga tertinggi ke terendah */}
            {filteredBuckets.map((bucket, idx) => {
              const isShort = bucket.type === 'SHORT_LIQ';
              const distPct = data ? ((bucket.avgPrice - data.currentPrice) / data.currentPrice) * 100 : 0;
              const isNearCurrentPrice = Math.abs(distPct) < 0.6;
              const isMagnetTarget = data && Math.abs(bucket.avgPrice - data.liquidityMagnet.targetPrice) / data.liquidityMagnet.targetPrice < 0.01;

              return (
                <div key={idx} className="relative group">
                  {/* Current Mark Price divider line if between buckets */}
                  {isNearCurrentPrice && (
                    <div className="my-2 py-1 px-3 bg-amber-500/15 border-y border-amber-500/60 rounded flex items-center justify-between text-xs font-black text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                        CURRENT MARK PRICE: ${formatLiqPrice(data?.currentPrice || 0)}
                      </span>
                      <span className="text-[10px] bg-amber-500 text-black px-1.5 py-0.5 rounded font-mono">
                        TITIK SEKARANG
                      </span>
                    </div>
                  )}

                  <div
                    className={`flex items-center justify-between gap-3 p-2 rounded-lg text-xs font-mono transition-all ${
                      isMagnetTarget
                        ? 'bg-amber-500/10 border border-amber-500/50 shadow-md shadow-amber-500/10'
                        : 'hover:bg-zinc-900/60 border border-transparent'
                    }`}
                  >
                    {/* Left: Price & Dist */}
                    <div className="w-36 sm:w-44 flex items-center justify-between shrink-0">
                      <span className={`font-bold ${isShort ? 'text-red-300' : 'text-emerald-300'}`}>
                        ${formatLiqPrice(bucket.avgPrice)}
                      </span>
                      <span className={`text-[11px] font-mono ${distPct >= 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                        {distPct >= 0 ? '+' : ''}{distPct.toFixed(2)}%
                      </span>
                    </div>

                    {/* Middle: Heatmap Horizontal Volume Bar */}
                    <div className="flex-1 h-5 bg-zinc-900 rounded-md overflow-hidden relative flex items-center">
                      <div
                        className={`h-full transition-all rounded-md ${
                          isShort
                            ? bucket.intensity > 75
                              ? 'bg-gradient-to-r from-red-600 via-rose-500 to-amber-400 shadow-[0_0_10px_rgba(239,68,68,0.5)]'
                              : 'bg-gradient-to-r from-red-950 via-red-700 to-red-500'
                            : bucket.intensity > 75
                            ? 'bg-gradient-to-r from-emerald-600 via-teal-400 to-cyan-300 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                            : 'bg-gradient-to-r from-emerald-950 via-emerald-700 to-emerald-500'
                        }`}
                        style={{ width: `${bucket.intensity}%` }}
                      />

                      {/* Overlay Info inside the bar */}
                      <div className="absolute inset-0 flex items-center justify-between px-2.5 pointer-events-none">
                        <span className="text-[10px] text-white/90 font-bold drop-shadow">
                          {bucket.dominantLeverage}
                        </span>
                        <span className="text-[10px] text-white/90 font-bold drop-shadow">
                          {formatUsdVolume(bucket.totalVolUsd)}
                        </span>
                      </div>
                    </div>

                    {/* Right: Badge Magnet or Type */}
                    <div className="w-24 shrink-0 text-right">
                      {isMagnetTarget ? (
                        <span className="text-[10px] bg-amber-500 text-black px-2 py-0.5 rounded font-black tracking-wider animate-pulse">
                          🎯 MAGNET
                        </span>
                      ) : (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                            isShort
                              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {isShort ? 'SHORT POOL' : 'LONG POOL'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 7. Footer Institutional SOP Note */}
      <div className="mt-4 p-3 rounded-xl bg-zinc-900/40 border border-white/5 flex items-start gap-2.5 text-xs text-zinc-400">
        <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold text-zinc-200">SOP Likuidasi Institusional:</span> Smart money &amp; market maker selalu menggerakkan harga menuju zona likuidasi terbesar (Pool Magnet) untuk menyerap likuiditas retail sebelum melakukan pembalikan tren (reversal). Jangan pasang Stop Loss Anda persis di dalam cluster padat; tempatkan SL di luar batas ekstrim cluster untuk menghindari Stop Hunt.
        </div>
      </div>
    </div>
  );
};
