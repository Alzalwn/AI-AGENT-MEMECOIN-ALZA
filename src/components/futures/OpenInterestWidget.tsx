'use client';

import React, { useState } from 'react';
import {
  Layers,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Flame,
  Activity,
  ShieldAlert,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { FuturesMarketStats, OIRegimeType, OpenInterestRegime } from '../../types/futures';

interface OpenInterestWidgetProps {
  stats: FuturesMarketStats | null;
  onSelectCoin?: (symbol: string) => void;
}

export const OpenInterestWidget: React.FC<OpenInterestWidgetProps> = ({
  stats,
  onSelectCoin,
}) => {
  const [selectedCoin, setSelectedCoin] = useState<string>('BTCUSDT');

  // Interpret OI vs Price regime helper
  const interpretRegime = (priceChangePct: number, oiChangePct: number): OpenInterestRegime => {
    if (priceChangePct > 0 && oiChangePct > 0) {
      return {
        regime: 'AGGRESSIVE_LONG_ACCUMULATION',
        title: 'Akumulasi Long Agresif (Institutional Long)',
        color: 'emerald',
        sentiment: 'BULLISH',
        description:
          'Harga naik seiring dengan bertambahnya modal baru ke dalam kontrak derivatif. Ini adalah tanda tren Bullish paling sehat dan organik.',
        institutionalAction: 'Smart money sedang membangun posisi beli berskala besar.',
        recommendedPlay: 'Cari pullback ke support/orderblock untuk membuka posisi LONG searah tren.',
      };
    } else if (priceChangePct > 0 && oiChangePct <= 0) {
      return {
        regime: 'SHORT_SQUEEZE_FRAGILE',
        title: 'Short Squeeze Rapuh (Likuidasi Beruang)',
        color: 'yellow',
        sentiment: 'REVERSAL_RISK',
        description:
          'Harga melonjak namun Open Interest menurun! Kenaikan ini terjadi murni karena trader Short terpaksa cut loss atau terlikuidasi, BUKAN karena pembeli baru.',
        institutionalAction: 'Pembersihan likuiditas sisi atas (Buy-side Liquidity Pool).',
        recommendedPlay: 'Dilarang FOMO Long di pucuk! Tunggu tanda RSI Bearish Divergence untuk potensi Short.',
      };
    } else if (priceChangePct < 0 && oiChangePct > 0) {
      return {
        regime: 'AGGRESSIVE_SHORT_DISTRIBUTION',
        title: 'Distribusi Short Agresif (Institutional Short)',
        color: 'rose',
        sentiment: 'BEARISH',
        description:
          'Harga tertekan jatuh dan kontrak baru terus terbuka bertambah banyak. Seller institusi sedang mendominasi pasar secara aktif.',
        institutionalAction: 'Smart money terus menambah kontrak Short dan menekan harga.',
        recommendedPlay: 'Fokus pada peluang SHORT saat harga retest ke resistance/supply zone terdekat.',
      };
    } else {
      return {
        regime: 'LONG_LIQUIDATION_CAPITULATION',
        title: 'Kapitulasi Long Liquidation (Pembersihan Pasar)',
        color: 'cyan',
        sentiment: 'BOTTOM_FISHING',
        description:
          'Harga jatuh dan Open Interest ikut ambruk drastis. Pasar sedang membilas posisi long dengan leverage tinggi (flush out).',
        institutionalAction: 'Penyerapan likuiditas jual paksa (*absorption*) oleh market maker di dasar.',
        recommendedPlay: 'Waspadai potensi pantulan mendadak (V-shape recovery) begitu volume dump mereda.',
      };
    }
  };

  // Sample or live candidates derived from market stats
  const topCoins = stats?.topSqueezeCoins?.slice(0, 6) || [
    { symbol: 'BTCUSDT', fundingRatePct: 0.01, oiChange24h: 3.4, potentialType: 'SHORT_SQUEEZE_LONG' as const },
    { symbol: 'ETHUSDT', fundingRatePct: 0.008, oiChange24h: 2.1, potentialType: 'SHORT_SQUEEZE_LONG' as const },
    { symbol: 'SOLUSDT', fundingRatePct: -0.015, oiChange24h: 5.8, potentialType: 'SHORT_SQUEEZE_LONG' as const },
    { symbol: 'DOGEUSDT', fundingRatePct: 0.025, oiChange24h: -1.8, potentialType: 'LONG_SQUEEZE_SHORT' as const },
    { symbol: 'PEPEUSDT', fundingRatePct: -0.03, oiChange24h: -4.2, potentialType: 'SHORT_SQUEEZE_LONG' as const },
    { symbol: 'SUIUSDT', fundingRatePct: 0.018, oiChange24h: 8.9, potentialType: 'SHORT_SQUEEZE_LONG' as const },
  ];

  const currentCoinData = topCoins.find((c) => c.symbol === selectedCoin) || topCoins[0];
  const activePriceChange = currentCoinData.potentialType === 'SHORT_SQUEEZE_LONG' ? 4.2 : -3.5;
  const currentRegime = interpretRegime(activePriceChange, currentCoinData.oiChange24h);

  return (
    <div className="bg-[#0b0e14] border border-emerald-500/30 rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden font-sans">
      {/* Glow */}
      <div className="absolute top-0 right-1/4 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-white tracking-wide font-mono">
                MATRIKS OPEN INTEREST (OI) & FLOW INSTITUSI
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                4 Market Regimes
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Mendeteksi apakah dorongan harga didukung modal baru atau hanya likuidasi sesaat
            </p>
          </div>
        </div>

        {/* Coin Selector Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {topCoins.map((coin) => (
            <button
              key={coin.symbol}
              onClick={() => {
                setSelectedCoin(coin.symbol);
                if (onSelectCoin) onSelectCoin(coin.symbol);
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
                selectedCoin === coin.symbol
                  ? 'bg-emerald-500 text-black shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                  : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
              }`}
            >
              {coin.symbol.replace('USDT', '')}
            </button>
          ))}
        </div>
      </div>

      {/* Main Analysis Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Active Coin Regime Card (7 Cols) */}
        <div className="lg:col-span-7 bg-black/40 border border-white/10 p-4 rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-white font-mono">{selectedCoin}</span>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                    currentRegime.sentiment === 'BULLISH'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      : currentRegime.sentiment === 'BEARISH'
                      ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                      : currentRegime.sentiment === 'REVERSAL_RISK'
                      ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                      : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
                  }`}
                >
                  {currentRegime.title}
                </span>
              </div>
              <div className="text-right font-mono text-xs">
                <span className="text-zinc-400 text-[10px] block">Perubahan OI 24h:</span>
                <span
                  className={`font-bold ${
                    currentCoinData.oiChange24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {currentCoinData.oiChange24h >= 0 ? '+' : ''}
                  {currentCoinData.oiChange24h}%
                </span>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed mb-3">
              {currentRegime.description}
            </p>

            <div className="space-y-2 bg-zinc-900/70 p-3 rounded-lg border border-white/5 text-xs font-mono">
              <div className="flex items-start gap-2">
                <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-zinc-400">Aksi Institusi: </span>
                  <span className="text-zinc-200">{currentRegime.institutionalAction}</span>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-zinc-400">Rekomendasi AI: </span>
                  <span className="text-emerald-300 font-bold">{currentRegime.recommendedPlay}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px] font-mono text-zinc-400">
            <span>Funding Rate: {(currentCoinData.fundingRatePct * 100).toFixed(4)}%</span>
            <span>Bias Pasar: {stats?.marketBias || 'BULLISH'}</span>
          </div>
        </div>

        {/* Right: The 4 Regimes Cheat Matrix (5 Cols) */}
        <div className="lg:col-span-5 bg-black/40 border border-white/10 p-3.5 rounded-xl space-y-2 text-xs font-mono">
          <div className="text-[11px] font-bold text-zinc-400 flex items-center gap-1.5 mb-1">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>TABEL REFERENSI REZIM PASAR FUTURES</span>
          </div>

          <div className="space-y-1.5">
            <div className="p-2 rounded-lg bg-emerald-950/20 border border-emerald-500/20 flex items-center justify-between">
              <div>
                <div className="text-emerald-400 font-bold text-[11px]">Harga ↗ & OI ↗</div>
                <div className="text-[10px] text-zinc-400">Akumulasi Long Asli (Uang Masuk)</div>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                STRONG BULL
              </span>
            </div>

            <div className="p-2 rounded-lg bg-yellow-950/20 border border-yellow-500/20 flex items-center justify-between">
              <div>
                <div className="text-yellow-400 font-bold text-[11px]">Harga ↗ & OI ↘</div>
                <div className="text-[10px] text-zinc-400">Short Squeeze Rapuh (Bukan Beli Asli)</div>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 font-bold">
                WASPADA REVERSAL
              </span>
            </div>

            <div className="p-2 rounded-lg bg-rose-950/20 border border-rose-500/20 flex items-center justify-between">
              <div>
                <div className="text-rose-400 font-bold text-[11px]">Harga ↘ & OI ↗</div>
                <div className="text-[10px] text-zinc-400">Shorting Baru Agresif (Tekanan Besar)</div>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">
                STRONG BEAR
              </span>
            </div>

            <div className="p-2 rounded-lg bg-cyan-950/20 border border-cyan-500/20 flex items-center justify-between">
              <div>
                <div className="text-cyan-400 font-bold text-[11px]">Harga ↘ & OI ↘</div>
                <div className="text-[10px] text-zinc-400">Long Kapitulasi / Cuci Gudang</div>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">
                POTENSI BOUNCE
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
