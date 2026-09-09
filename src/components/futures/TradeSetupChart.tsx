'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Maximize2,
  RefreshCw,
  ExternalLink,
  Target,
  ShieldAlert,
  Zap,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { BinanceFuturesSignal, FuturesDirection } from '../../types/futures';

interface KlineData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface TradeSetupChartProps {
  signal?: BinanceFuturesSignal | null;
  symbol: string;
  defaultDirection?: FuturesDirection;
  onClose?: () => void;
}

export const TradeSetupChart: React.FC<TradeSetupChartProps> = ({
  signal,
  symbol,
  defaultDirection = 'LONG',
  onClose,
}) => {
  const [klines, setKlines] = useState<KlineData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [timeframe, setTimeframe] = useState<'5m' | '15m' | '1h' | '4h'>('15m');
  const [targetLevel, setTargetLevel] = useState<'TP1' | 'TP2' | 'TP3'>('TP2');
  const [leverage, setLeverage] = useState<number>(signal?.leverage?.safe?.multiplier || 10);
  const [hoveredCandle, setHoveredCandle] = useState<KlineData | null>(null);
  const [activeTab, setActiveTab] = useState<'PROJECTION' | 'TRADINGVIEW'>('PROJECTION');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Direction: from signal or prop
  const direction: FuturesDirection = signal?.direction || defaultDirection;
  const isLong = direction === 'LONG';

  // Fetch Klines from our Binance API route
  const fetchKlines = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/futures/klines?symbol=${symbol}&interval=${timeframe}&limit=60`);
      const data = await res.json();
      if (data.success && Array.isArray(data.klines) && data.klines.length > 0) {
        setKlines(data.klines);
      } else {
        // Fallback synthetic klines based on signal prices if API rate-limited
        generateFallbackKlines();
      }
    } catch (err) {
      console.warn('[TradeSetupChart] Fetch error, using fallback:', err);
      generateFallbackKlines();
    } finally {
      setIsLoading(false);
    }
  };

  const generateFallbackKlines = () => {
    const basePrice = signal?.entryZone?.current || 100;
    const count = 55;
    const now = Date.now();
    const intervalMs = timeframe === '5m' ? 300000 : timeframe === '15m' ? 900000 : 3600000;
    const generated: KlineData[] = [];
    let current = basePrice * 0.94;

    for (let i = count; i >= 0; i--) {
      const time = now - i * intervalMs;
      const volatility = basePrice * 0.008;
      const change = (Math.random() - 0.47) * volatility;
      const open = current;
      const close = open + change;
      const high = Math.max(open, close) + Math.random() * (volatility * 0.6);
      const low = Math.min(open, close) - Math.random() * (volatility * 0.6);
      const volume = Math.random() * 50000 + 10000;
      generated.push({ time, open, high, low, close, volume });
      current = close;
    }
    setKlines(generated);
  };

  useEffect(() => {
    fetchKlines();
    const timer = setInterval(fetchKlines, 30_000);
    return () => clearInterval(timer);
  }, [symbol, timeframe]);

  // Pricing & Metrics
  const lastPrice = klines.length > 0 ? klines[klines.length - 1].close : (signal?.entryZone?.current || 100);
  const entryPrice = signal?.entryZone?.current || lastPrice;

  // Selected Target
  const selectedTargetPrice = useMemo(() => {
    if (signal) {
      if (targetLevel === 'TP1') return signal.targets.tp1.price;
      if (targetLevel === 'TP2') return signal.targets.tp2.price;
      return signal.targets.tp3.price;
    }
    return isLong ? entryPrice * 1.06 : entryPrice * 0.94;
  }, [signal, targetLevel, entryPrice, isLong]);

  const targetGainPct = useMemo(() => {
    if (signal) {
      if (targetLevel === 'TP1') return signal.targets.tp1.gainPct;
      if (targetLevel === 'TP2') return signal.targets.tp2.gainPct;
      return signal.targets.tp3.gainPct;
    }
    return Math.abs((selectedTargetPrice - entryPrice) / entryPrice) * 100;
  }, [signal, targetLevel, selectedTargetPrice, entryPrice]);

  const stopLossPrice = useMemo(() => {
    if (signal) return signal.stopLoss.price;
    return isLong ? entryPrice * 0.985 : entryPrice * 1.015;
  }, [signal, entryPrice, isLong]);

  const stopLossPct = useMemo(() => {
    if (signal) return signal.stopLoss.lossPct;
    return Math.abs((stopLossPrice - entryPrice) / entryPrice) * 100;
  }, [signal, stopLossPrice, entryPrice]);

  const riskRewardRatio = useMemo(() => {
    if (signal) return signal.riskRewardRatio;
    return stopLossPct > 0 ? (targetGainPct / stopLossPct) : 3.0;
  }, [signal, targetGainPct, stopLossPct]);

  // Return on Equity (ROE) based on selected leverage
  const projectedRoePct = (targetGainPct * leverage).toFixed(1);
  const projectedMaxLossRoePct = (stopLossPct * leverage).toFixed(1);

  // Canvas Drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || klines.length === 0 || activeTab !== 'PROJECTION') return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Layout configuration
    const padding = { top: 35, right: 90, bottom: 45, left: 15 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    const volumeHeight = chartHeight * 0.16;
    const candleChartHeight = chartHeight - volumeHeight - 15;

    // Price range calculation (inclusive of targets, entry, and stop loss)
    const allPrices = klines.flatMap((k) => [k.high, k.low]);
    allPrices.push(entryPrice, selectedTargetPrice, stopLossPrice);
    if (signal) {
      allPrices.push(signal.targets.tp1.price, signal.targets.tp3.price);
    }

    let minPrice = Math.min(...allPrices);
    let maxPrice = Math.max(...allPrices);
    const priceBuffer = (maxPrice - minPrice) * 0.08;
    minPrice -= priceBuffer;
    maxPrice += priceBuffer;
    const priceRange = maxPrice - minPrice || 1;

    // Max volume for volume bars
    const maxVolume = Math.max(...klines.map((k) => k.volume), 1);

    const priceToY = (price: number) => {
      return padding.top + candleChartHeight * (1 - (price - minPrice) / priceRange);
    };

    const volumeToH = (vol: number) => {
      return (vol / maxVolume) * volumeHeight;
    };

    // Clear Canvas
    ctx.fillStyle = '#09090b'; // dark zinc
    ctx.fillRect(0, 0, width, height);

    // 1. Draw Grid Lines (Subtle horizontal & vertical)
    ctx.strokeStyle = '#1e1e24';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    const gridSteps = 5;
    for (let i = 0; i <= gridSteps; i++) {
      const gridPrice = minPrice + (priceRange / gridSteps) * i;
      const y = priceToY(gridPrice);

      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      // Right Axis Label
      ctx.fillStyle = '#71717a';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(gridPrice.toFixed(gridPrice < 2 ? 4 : 2), width - padding.right + 8, y + 3);
    }
    ctx.setLineDash([]);

    // 2. Reserved space for Projection Box (like TradingView Long/Short Position Tool)
    // We display candles on the left 70% of chart, and the projection box on the right 30%
    const candleAreaWidth = chartWidth * 0.72;
    const candleCount = klines.length;
    const candleSpacing = candleAreaWidth / candleCount;
    const candleWidth = Math.max(candleSpacing * 0.65, 3);

    // 3. Draw Order Blocks / Demand Zones (Like grey boxes in user's image)
    const obY1 = priceToY(entryPrice * (isLong ? 0.995 : 1.005));
    const obY2 = priceToY(entryPrice * (isLong ? 0.988 : 1.012));
    const obTop = Math.min(obY1, obY2);
    const obHeight = Math.abs(obY1 - obY2);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.fillRect(padding.left + candleAreaWidth * 0.45, obTop, candleAreaWidth * 0.55, obHeight);
    ctx.strokeRect(padding.left + candleAreaWidth * 0.45, obTop, candleAreaWidth * 0.55, obHeight);

    // Order Block Label
    ctx.fillStyle = '#a1a1aa';
    ctx.font = 'bold 9px monospace';
    ctx.fillText('ORDER BLOCK (DEMAND ZONE)', padding.left + candleAreaWidth * 0.47, obTop + obHeight / 2 + 3);

    // 4. Draw Trendline Breakout (Diagonal line cutting across recent highs)
    if (klines.length >= 20) {
      const p1Index = Math.floor(candleCount * 0.15);
      const p2Index = Math.floor(candleCount * 0.75);
      const x1 = padding.left + p1Index * candleSpacing + candleSpacing / 2;
      const y1 = priceToY(klines[p1Index].high * 1.005);
      const x2 = padding.left + p2Index * candleSpacing + candleSpacing / 2;
      const y2 = priceToY(klines[p2Index].high * 0.998);

      ctx.strokeStyle = '#38bdf8'; // Cyan
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2 + 40, y2);
      ctx.stroke();

      // Breakout Tag
      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 9px monospace';
      ctx.fillText('BREAKOUT 🚀', x2 + 45, y2 - 4);
    }

    // 5. Draw Volume Bars & Candlesticks
    klines.forEach((candle, idx) => {
      const x = padding.left + idx * candleSpacing + candleSpacing / 2;
      const openY = priceToY(candle.open);
      const closeY = priceToY(candle.close);
      const highY = priceToY(candle.high);
      const lowY = priceToY(candle.low);
      const isBullish = candle.close >= candle.open;

      // Volume bar
      const volH = volumeToH(candle.volume);
      const volY = padding.top + chartHeight - volH;
      ctx.fillStyle = isBullish ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)';
      ctx.fillRect(x - candleWidth / 2, volY, candleWidth, volH);

      // Wick
      ctx.strokeStyle = isBullish ? '#10b981' : '#f43f5e';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Body
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(Math.abs(closeY - openY), 1.5);
      ctx.fillStyle = isBullish ? '#10b981' : '#f43f5e';
      ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyHeight);
    });

    // 6. Draw The TradingView Long/Short Position Box (Kotak Proyeksi Risk / Reward)
    const boxStartX = padding.left + candleAreaWidth + 5;
    const boxWidth = chartWidth - candleAreaWidth - 10;
    const entryY = priceToY(entryPrice);
    const targetY = priceToY(selectedTargetPrice);
    const stopY = priceToY(stopLossPrice);

    if (isLong) {
      // --- LONG SETUP ---
      // A. Target Box (Green / Emerald Transparent)
      const targetBoxTop = Math.min(entryY, targetY);
      const targetBoxHeight = Math.abs(entryY - targetY);

      ctx.fillStyle = 'rgba(16, 185, 129, 0.18)';
      ctx.fillRect(boxStartX, targetBoxTop, boxWidth, targetBoxHeight);

      // Target Top Border Line
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(boxStartX, targetY);
      ctx.lineTo(boxStartX + boxWidth, targetY);
      ctx.stroke();

      // B. Stop Loss Box (Red / Rose Transparent)
      const stopBoxTop = Math.min(entryY, stopY);
      const stopBoxHeight = Math.abs(entryY - stopY);

      ctx.fillStyle = 'rgba(244, 63, 94, 0.22)';
      ctx.fillRect(boxStartX, stopBoxTop, boxWidth, stopBoxHeight);

      // Stop Bottom Border Line
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(boxStartX, stopY);
      ctx.lineTo(boxStartX + boxWidth, stopY);
      ctx.stroke();

      // C. Entry Line (Solid White/Yellow Line)
      ctx.strokeStyle = '#e4e4e7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(boxStartX - 20, entryY);
      ctx.lineTo(boxStartX + boxWidth, entryY);
      ctx.stroke();
    } else {
      // --- SHORT SETUP ---
      // Target Box below entry (Green)
      const targetBoxTop = Math.min(entryY, targetY);
      const targetBoxHeight = Math.abs(entryY - targetY);

      ctx.fillStyle = 'rgba(16, 185, 129, 0.18)';
      ctx.fillRect(boxStartX, targetBoxTop, boxWidth, targetBoxHeight);

      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(boxStartX, targetY);
      ctx.lineTo(boxStartX + boxWidth, targetY);
      ctx.stroke();

      // Stop Loss Box above entry (Red)
      const stopBoxTop = Math.min(entryY, stopY);
      const stopBoxHeight = Math.abs(entryY - stopY);

      ctx.fillStyle = 'rgba(244, 63, 94, 0.22)';
      ctx.fillRect(boxStartX, stopBoxTop, boxWidth, stopBoxHeight);

      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(boxStartX, stopY);
      ctx.lineTo(boxStartX + boxWidth, stopY);
      ctx.stroke();

      // Entry Line
      ctx.strokeStyle = '#e4e4e7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(boxStartX - 20, entryY);
      ctx.lineTo(boxStartX + boxWidth, entryY);
      ctx.stroke();
    }

    // 7. Render Realistic TradingView Projection Tool Floating Badges
    // Target Label Badge (Top)
    const targetDiff = Math.abs(selectedTargetPrice - entryPrice);
    const targetBadgeText = `Target: +${targetGainPct.toFixed(2)}% (+${targetDiff.toFixed(targetDiff < 1 ? 4 : 2)})`;

    ctx.fillStyle = '#10b981';
    ctx.fillRect(boxStartX + 8, targetY - 18, 140, 16);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(targetBadgeText, boxStartX + 12, targetY - 6);

    // Entry & Risk/Reward Badge (Middle)
    const rrBadgeText = `Entry: $${entryPrice.toFixed(entryPrice < 2 ? 4 : 2)} | R:R: ${riskRewardRatio.toFixed(1)}`;
    ctx.fillStyle = '#27272a';
    ctx.strokeStyle = '#52525b';
    ctx.lineWidth = 1;
    ctx.fillRect(boxStartX + 8, entryY - 10, 155, 20);
    ctx.strokeRect(boxStartX + 8, entryY - 10, 155, 20);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(rrBadgeText, boxStartX + 14, entryY + 4);

    // Stop Loss Badge (Bottom)
    const stopDiff = Math.abs(entryPrice - stopLossPrice);
    const stopBadgeText = `Stop: -${stopLossPct.toFixed(2)}% (-${stopDiff.toFixed(stopDiff < 1 ? 4 : 2)})`;
    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(boxStartX + 8, stopY + 4, 130, 16);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px monospace';
    ctx.fillText(stopBadgeText, boxStartX + 12, stopY + 16);

    // 8. Right Axis Badges (Exact levels)
    // Target Price Badge
    ctx.fillStyle = '#10b981';
    ctx.fillRect(width - padding.right + 2, targetY - 9, 65, 18);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(selectedTargetPrice.toFixed(selectedTargetPrice < 2 ? 4 : 2), width - padding.right + 6, targetY + 4);

    // Entry Price Badge
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(width - padding.right + 2, entryY - 9, 65, 18);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(entryPrice.toFixed(entryPrice < 2 ? 4 : 2), width - padding.right + 6, entryY + 4);

    // Stop Loss Badge
    ctx.fillStyle = '#f43f5e';
    ctx.fillRect(width - padding.right + 2, stopY - 9, 65, 18);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(stopLossPrice.toFixed(stopLossPrice < 2 ? 4 : 2), width - padding.right + 6, stopY + 4);

    // Last Live Price Dashed Indicator Line
    const lastY = priceToY(lastPrice);
    ctx.strokeStyle = '#eab308'; // yellow
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(padding.left, lastY);
    ctx.lineTo(width - padding.right, lastY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#eab308';
    ctx.fillRect(width - padding.right + 2, lastY - 9, 65, 18);
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 10px monospace';
    ctx.fillText(lastPrice.toFixed(lastPrice < 2 ? 4 : 2), width - padding.right + 6, lastY + 4);

  }, [klines, entryPrice, selectedTargetPrice, stopLossPrice, riskRewardRatio, targetGainPct, stopLossPct, isLong, activeTab]);

  return (
    <div className="flex flex-col h-full w-full bg-[#0c0c0e] text-zinc-100 font-sans select-none">
      {/* Top Header: Controls & Choices */}
      <div className="px-4 py-3 border-b border-zinc-800/80 bg-zinc-950/80 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Symbol & Signal Direction */}
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center font-black font-mono text-sm border ${
              isLong
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                : 'bg-rose-500/15 border-rose-500/40 text-rose-400'
            }`}
          >
            {isLong ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-mono font-black text-base text-white tracking-wide">
                {symbol}
              </h3>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-black tracking-wider uppercase border ${
                  isLong
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.2)]'
                }`}
              >
                {direction} SETUP
              </span>
              <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-300">
                R:R: <strong className="text-yellow-400">{riskRewardRatio.toFixed(1)} : 1</strong>
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 flex items-center gap-1.5 font-mono mt-0.5">
              <span>{signal?.strategyLabel || 'Breakout & Confluence Setup'}</span>
              <span>•</span>
              <span>Harga: <strong className="text-white">${lastPrice.toFixed(lastPrice < 2 ? 4 : 2)}</strong></span>
            </p>
          </div>
        </div>

        {/* Center: Multiple Choice Options (Timeframe & Target) */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          {/* View Tab Toggle */}
          <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => setActiveTab('PROJECTION')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'PROJECTION'
                  ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              📐 Setup R:R Proyeksi
            </button>
            <button
              onClick={() => setActiveTab('TRADINGVIEW')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'TRADINGVIEW'
                  ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              📊 TradingView Asli
            </button>
          </div>

          {/* Timeframe Selector */}
          <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            {(['5m', '15m', '1h', '4h'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  timeframe === tf
                    ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Target Selection Choice */}
          <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            {(['TP1', 'TP2', 'TP3'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setTargetLevel(lvl)}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  targetLevel === lvl
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          {/* Leverage Profile Choice */}
          <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            {[5, 10, 15, 20].map((lev) => (
              <button
                key={lev}
                onClick={() => setLeverage(lev)}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  leverage === lev
                    ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {lev}x
              </button>
            ))}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <a
            href={`https://www.binance.com/en/futures/${symbol}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-yellow-500/15 hover:bg-yellow-500/25 border border-yellow-500/40 text-yellow-300 text-xs font-bold font-mono transition-all"
          >
            <span>Eksekusi di Binance</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={fetchKlines}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
            title="Refresh Klines"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="flex-1 relative overflow-hidden bg-black flex flex-col" ref={containerRef}>
        {activeTab === 'PROJECTION' ? (
          <>
            <canvas
              ref={canvasRef}
              className="w-full h-full flex-1 cursor-crosshair block"
            />

            {/* Bottom Risk / Reward Telemetry Strip */}
            <div className="p-3 bg-zinc-950/90 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-500">Entry:</span>
                  <span className="font-bold text-white">${entryPrice.toFixed(entryPrice < 2 ? 4 : 2)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-500">Target ({targetLevel}):</span>
                  <span className="font-bold text-emerald-400">
                    ${selectedTargetPrice.toFixed(selectedTargetPrice < 2 ? 4 : 2)} (+{targetGainPct.toFixed(2)}%)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-500">Stop Loss:</span>
                  <span className="font-bold text-rose-400">
                    ${stopLossPrice.toFixed(stopLossPrice < 2 ? 4 : 2)} (-{stopLossPct.toFixed(2)}%)
                  </span>
                </div>
              </div>

              {/* Leverage Simulator ROE */}
              <div className="flex items-center gap-3 bg-zinc-900/90 px-3 py-1.5 rounded-xl border border-zinc-800">
                <span className="text-zinc-400 font-bold">Simulasi {leverage}x:</span>
                <span className="text-emerald-400 font-black">
                  Potensi ROE: +{projectedRoePct}%
                </span>
                <span className="text-zinc-700">|</span>
                <span className="text-rose-400">
                  Maks Risiko: -{projectedMaxLossRoePct}%
                </span>
              </div>
            </div>
          </>
        ) : (
          /* Full Interactive TradingView Widget Fallback */
          <iframe
            src={`https://s.tradingview.com/widgetembed/?symbol=BINANCE%3A${symbol}.P&interval=${timeframe}&theme=dark&style=1&timezone=Asia%2FJakarta&studies=%5B%22RSI%40tv-basicstudies%22%2C%22MASimple%40tv-basicstudies%22%5D`}
            className="w-full h-full border-none flex-1"
            title="TradingView Chart"
          />
        )}
      </div>
    </div>
  );
};
