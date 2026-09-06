'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TokenSignal } from '../../types/terminal';
import {
  TrendingUp,
  TrendingDown,
  BarChart2,
  ExternalLink,
  RefreshCw,
  Maximize2,
  Minimize2,
  AlertCircle,
  Eye,
  Sliders,
  Layers,
  Sparkles
} from 'lucide-react';
import { useSolRate } from '../../hooks/useSolRate';

interface TerminalCandlestickChartProps {
  token: TokenSignal;
}

interface Candle {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isUp: boolean;
}

export const TerminalCandlestickChart: React.FC<TerminalCandlestickChartProps> = ({ token }) => {
  const { rate } = useSolRate();
  const solUsdRate = rate?.solUsd || 140;

  // Chart view mode: 'native' or 'dexscreener'
  const isRealWithDexUrl = Boolean(token.isRealData && token.dexUrl);
  const [chartMode, setChartMode] = useState<'native' | 'dexscreener'>(() =>
    isRealWithDexUrl ? 'dexscreener' : 'native'
  );
  const [timeframe, setTimeframe] = useState<'5s' | '15s' | '1m' | '5m'>('15s');
  const [showEma9, setShowEma9] = useState(true);
  const [showEma21, setShowEma21] = useState(true);
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);
  const [iframeError, setIframeError] = useState(false);

  // Sync mode if token changes
  useEffect(() => {
    setIframeError(false);
    if (token.isRealData && token.dexUrl) {
      setChartMode('dexscreener');
    } else {
      setChartMode('native');
    }
  }, [token.mint, token.dexUrl, token.isRealData]);

  // Generate historical candles based on token parameters
  const [candles, setCandles] = useState<Candle[]>([]);

  useEffect(() => {
    const count = 36;
    const basePrice = token.priceSol || 0.000045;
    const initialCandles: Candle[] = [];
    let current = basePrice * 0.82;

    const now = Date.now();
    const intervalMs = timeframe === '5s' ? 5000 : timeframe === '15s' ? 15000 : timeframe === '1m' ? 60000 : 300000;

    for (let i = count - 1; i >= 0; i--) {
      const timeStr = new Date(now - i * intervalMs).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: timeframe === '5s' || timeframe === '15s' ? '2-digit' : undefined
      });

      // Random-walk with positive drift if high narrative
      const drift = (Math.random() - 0.46) * (basePrice * 0.06);
      const open = current;
      let close = open + drift;
      if (close <= 0) close = open * 0.95;

      const wickPadding = Math.random() * (basePrice * 0.03);
      const high = Math.max(open, close) + wickPadding;
      const low = Math.max(close * 0.8, Math.min(open, close) - wickPadding);
      const volume = Math.max(0.1, +(Math.random() * 8 + 1).toFixed(2));

      initialCandles.push({
        time: timeStr,
        open,
        high,
        low,
        close,
        volume,
        isUp: close >= open
      });

      current = close;
    }

    // Set last close to current token priceSol
    if (initialCandles.length > 0) {
      const last = initialCandles[initialCandles.length - 1];
      last.close = basePrice;
      last.high = Math.max(last.high, basePrice);
      last.low = Math.min(last.low, basePrice);
      last.isUp = last.close >= last.open;
    }

    setCandles(initialCandles);
  }, [token.mint, token.priceSol, timeframe]);

  // Live active candle tick
  useEffect(() => {
    if (chartMode !== 'native') return;

    const tickInterval = setInterval(() => {
      setCandles((prev) => {
        if (prev.length === 0) return prev;
        const lastIdx = prev.length - 1;
        const last = { ...prev[lastIdx] };

        const delta = (Math.random() - 0.48) * (last.close * 0.015);
        const newClose = Math.max(last.low * 0.95, last.close + delta);
        last.close = newClose;
        last.high = Math.max(last.high, newClose);
        last.low = Math.min(last.low, newClose);
        last.isUp = last.close >= last.open;
        last.volume = +(last.volume + Math.random() * 0.3).toFixed(2);

        const next = [...prev];
        next[lastIdx] = last;
        return next;
      });
    }, 1500);

    return () => clearInterval(tickInterval);
  }, [chartMode]);

  // Compute boundaries for SVG chart
  const { minPrice, maxPrice, maxVol, ema9Points, ema21Points } = useMemo(() => {
    if (candles.length === 0) {
      return { minPrice: 0, maxPrice: 1, maxVol: 1, ema9Points: '', ema21Points: '' };
    }

    let min = Infinity;
    let max = -Infinity;
    let maxV = 0;

    candles.forEach((c) => {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
      if (c.volume > maxV) maxV = c.volume;
    });

    const padding = (max - min) * 0.08 || min * 0.05 || 0.000001;
    const adjustedMin = Math.max(0, min - padding);
    const adjustedMax = max + padding;

    // Calculate EMA values
    const calcEma = (period: number) => {
      const k = 2 / (period + 1);
      let ema = candles[0].close;
      return candles.map((c, i) => {
        ema = c.close * k + ema * (1 - k);
        const x = (i / (candles.length - 1)) * 100;
        const y = 80 - ((ema - adjustedMin) / (adjustedMax - adjustedMin)) * 70;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' ');
    };

    return {
      minPrice: adjustedMin,
      maxPrice: adjustedMax,
      maxVol: maxV || 10,
      ema9Points: calcEma(9),
      ema21Points: calcEma(21)
    };
  }, [candles]);

  const activeCandle = hoveredCandle || (candles.length > 0 ? candles[candles.length - 1] : null);
  const currentPriceSol = activeCandle ? activeCandle.close : token.priceSol;
  const currentPriceUsd = currentPriceSol * solUsdRate;

  // Safe external URLs
  const dexscreenerSearchUrl = token.dexUrl || (
    token.mint.includes('...')
      ? `https://dexscreener.com/search?q=${encodeURIComponent(token.symbol.replace('$', ''))}`
      : `https://dexscreener.com/search?q=${encodeURIComponent(token.mint)}`
  );

  const dexscreenerEmbedUrl = token.dexUrl
    ? (token.dexUrl.includes('?') ? `${token.dexUrl}&embed=1&theme=dark&trades=0&info=0` : `${token.dexUrl}?embed=1&theme=dark&trades=0&info=0`)
    : null;

  return (
    <div className="bg-zinc-950/80 backdrop-blur-md border border-zinc-800/90 rounded-2xl p-4 shadow-2xl space-y-3 relative overflow-hidden">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <BarChart2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-sm text-zinc-100 uppercase tracking-wider">
                {token.symbol} / SOL
              </span>
              <span className="text-[11px] font-mono text-zinc-500">
                ({token.name})
              </span>
              {token.isRealData ? (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  REAL ON-CHAIN
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-purple-500/15 border border-purple-500/40 text-purple-400 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  AI SIMULATION
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs font-mono mt-0.5">
              <span className="text-emerald-400 font-bold">
                {currentPriceSol.toFixed(7)} SOL
              </span>
              <span className="text-zinc-400">
                ${currentPriceUsd < 0.0001 ? currentPriceUsd.toFixed(8) : currentPriceUsd.toFixed(4)} USD
              </span>
            </div>
          </div>
        </div>

        {/* View Mode & Timeframe Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Chart Engine Switcher */}
          <div className="flex items-center bg-zinc-900/90 border border-zinc-800 rounded-xl p-1 text-[11px] font-bold">
            <button
              onClick={() => { setChartMode('native'); setIframeError(false); }}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                chartMode === 'native'
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              ⚡ Native Terminal
            </button>
            <button
              onClick={() => { setChartMode('dexscreener'); setIframeError(false); }}
              className={`px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                chartMode === 'dexscreener'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span>📊 DexScreener</span>
              {!isRealWithDexUrl && (
                <span className="text-[9px] text-amber-400 font-mono" title="No live pair yet">!</span>
              )}
            </button>
          </div>

          {/* Timeframe (for native) */}
          {chartMode === 'native' && (
            <div className="flex items-center bg-zinc-900/80 border border-zinc-800 rounded-xl p-0.5 text-[10px] font-mono">
              {(['5s', '15s', '1m', '5m'] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-2 py-1 rounded-lg transition-all ${
                    timeframe === tf
                      ? 'bg-zinc-800 text-zinc-100 font-bold'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          )}

          {/* External DexScreener Link */}
          <a
            href={dexscreenerSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-emerald-400 transition-all text-xs font-mono flex items-center gap-1"
            title="Open in DexScreener search / pair"
          >
            <span>DEX</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Main Chart Canvas Area */}
      <div className="w-full h-[400px] rounded-xl overflow-hidden border border-zinc-800/90 relative bg-zinc-950 flex flex-col justify-between">
        {chartMode === 'dexscreener' ? (
          // DexScreener Mode
          isRealWithDexUrl && !iframeError ? (
            <div className="w-full h-full relative">
              <iframe
                src={dexscreenerEmbedUrl!}
                className="w-full h-full border-0"
                title={`DexScreener Chart ${token.symbol}`}
                onError={() => setIframeError(true)}
              />
              <div className="absolute top-2 right-2 z-10">
                <button
                  onClick={() => setChartMode('native')}
                  className="px-2 py-1 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700 text-[10px] text-zinc-300 hover:text-cyan-400 font-mono transition-all backdrop-blur-sm"
                >
                  Switch to Native Chart
                </button>
              </div>
            </div>
          ) : (
            // Notice card when DexScreener doesn't have an indexed pair
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center space-y-4 bg-zinc-950/90">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="max-w-md space-y-1.5">
                <h4 className="font-bold text-sm text-zinc-200">
                  {iframeError ? 'DexScreener Frame Blocked / Unavailable' : 'Pair DexScreener Belum Terindeks'}
                </h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {token.isRealData
                    ? `Token ${token.symbol} baru diluncurkan atau pair belum terdaftar resmi di DexScreener API.`
                    : `Token ${token.symbol} adalah data simulasi AI Agent. DexScreener tidak memiliki riwayat pair untuk target simulasi.`}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setChartMode('native')}
                  className="px-4 py-2 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-400 font-bold text-xs flex items-center gap-2 transition-all shadow-lg"
                >
                  <BarChart2 className="w-3.5 h-3.5" />
                  <span>Buka Native Terminal Chart</span>
                </button>

                <a
                  href={dexscreenerSearchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-emerald-400 font-bold text-xs flex items-center gap-1.5 transition-all"
                >
                  <span>Cari di DexScreener Web</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )
        ) : (
          // Native Terminal Candlestick Chart
          <div className="w-full h-full flex flex-col justify-between p-3 relative select-none">
            {/* Real-time OHLC Metric Bar */}
            <div className="flex flex-wrap items-center justify-between text-[11px] font-mono border-b border-zinc-800/60 pb-2 z-10">
              <div className="flex items-center gap-3 text-zinc-400">
                {activeCandle && (
                  <>
                    <span>T: <strong className="text-zinc-200">{activeCandle.time}</strong></span>
                    <span>O: <strong className="text-zinc-200">{activeCandle.open.toFixed(7)}</strong></span>
                    <span>H: <strong className="text-emerald-400">{activeCandle.high.toFixed(7)}</strong></span>
                    <span>L: <strong className="text-rose-400">{activeCandle.low.toFixed(7)}</strong></span>
                    <span>C: <strong className={activeCandle.isUp ? 'text-emerald-400' : 'text-rose-400'}>{activeCandle.close.toFixed(7)}</strong></span>
                    <span className="hidden sm:inline">Vol: <strong className="text-cyan-400">{activeCandle.volume.toFixed(1)} SOL</strong></span>
                  </>
                )}
              </div>

              {/* Indicator Controls */}
              <div className="flex items-center gap-3 text-[10px]">
                <label className="flex items-center gap-1 text-cyan-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showEma9}
                    onChange={(e) => setShowEma9(e.target.checked)}
                    className="accent-cyan-500 w-3 h-3 rounded"
                  />
                  <span>EMA 9</span>
                </label>
                <label className="flex items-center gap-1 text-purple-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showEma21}
                    onChange={(e) => setShowEma21(e.target.checked)}
                    className="accent-purple-500 w-3 h-3 rounded"
                  />
                  <span>EMA 21</span>
                </label>
              </div>
            </div>

            {/* SVG Candlestick & Volume Canvas */}
            <div className="w-full h-[300px] relative mt-2">
              {/* Background Price Grid Lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                <div className="border-b border-zinc-700 w-full" />
                <div className="border-b border-zinc-700 w-full" />
                <div className="border-b border-zinc-700 w-full" />
                <div className="border-b border-zinc-700 w-full" />
              </div>

              {/* Price scale labels right side */}
              <div className="absolute right-1 top-0 bottom-0 flex flex-col justify-between text-[9px] font-mono text-zinc-600 pointer-events-none z-0">
                <span>{maxPrice.toFixed(7)}</span>
                <span>{((maxPrice + minPrice) / 2).toFixed(7)}</span>
                <span>{minPrice.toFixed(7)}</span>
              </div>

              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                className="w-full h-full overflow-visible"
              >
                {/* Volume Bars at Bottom (height 0-25) */}
                {candles.map((c, i) => {
                  const width = 100 / candles.length;
                  const x = i * width + width * 0.15;
                  const barW = width * 0.7;
                  const volHeight = (c.volume / maxVol) * 20;
                  const y = 98 - volHeight;

                  return (
                    <rect
                      key={`vol-${i}`}
                      x={x}
                      y={y}
                      width={barW}
                      height={volHeight}
                      fill={c.isUp ? '#10b981' : '#f43f5e'}
                      opacity={hoveredCandle === c ? 0.6 : 0.25}
                    />
                  );
                })}

                {/* Candlestick Wicks & Bodies (height 0-75) */}
                {candles.map((c, i) => {
                  const width = 100 / candles.length;
                  const xCenter = i * width + width / 2;
                  const barW = width * 0.65;
                  const xLeft = i * width + width * 0.175;

                  // Price mapping to SVG coordinates (0 is top, 75 is bottom)
                  const priceToY = (price: number) => {
                    const pct = (price - minPrice) / (maxPrice - minPrice || 1);
                    return 75 - pct * 65;
                  };

                  const yHigh = priceToY(c.high);
                  const yLow = priceToY(c.low);
                  const yOpen = priceToY(c.open);
                  const yClose = priceToY(c.close);

                  const bodyY = Math.min(yOpen, yClose);
                  const bodyHeight = Math.max(0.8, Math.abs(yClose - yOpen));
                  const isHovered = hoveredCandle === c;

                  return (
                    <g
                      key={`candle-${i}`}
                      onMouseEnter={() => setHoveredCandle(c)}
                      onMouseLeave={() => setHoveredCandle(null)}
                      className="cursor-crosshair transition-opacity"
                    >
                      {/* Wick */}
                      <line
                        x1={xCenter}
                        y1={yHigh}
                        x2={xCenter}
                        y2={yLow}
                        stroke={c.isUp ? '#10b981' : '#f43f5e'}
                        strokeWidth="0.5"
                        opacity={isHovered ? 1 : 0.8}
                      />
                      {/* Body */}
                      <rect
                        x={xLeft}
                        y={bodyY}
                        width={barW}
                        height={bodyHeight}
                        fill={c.isUp ? '#10b981' : '#f43f5e'}
                        stroke={c.isUp ? '#059669' : '#e11d48'}
                        strokeWidth="0.2"
                        rx="0.2"
                        opacity={isHovered ? 1 : 0.85}
                      />
                    </g>
                  );
                })}

                {/* EMA 9 Line */}
                {showEma9 && ema9Points && (
                  <polyline
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth="0.8"
                    points={ema9Points}
                    opacity="0.85"
                  />
                )}

                {/* EMA 21 Line */}
                {showEma21 && ema21Points && (
                  <polyline
                    fill="none"
                    stroke="#a855f7"
                    strokeWidth="0.8"
                    points={ema21Points}
                    opacity="0.8"
                  />
                )}
              </svg>
            </div>

            {/* Bottom Status Footer */}
            <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono border-t border-zinc-900 pt-2">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>Engine: Grok Trencher High-Frequency Tick (1.5s)</span>
              </div>
              <div className="flex items-center gap-3">
                <span>Total Candles: {candles.length}</span>
                <span>Vol (24h): ~${token.initialLpUsd.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
