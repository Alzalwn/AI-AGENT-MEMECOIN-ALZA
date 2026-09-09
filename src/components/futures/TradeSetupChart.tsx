'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  ExternalLink,
  Sliders,
  Eye,
  EyeOff,
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

// Indicator Calculation Helpers
function calculateSMA(data: number[], period: number): (number | null)[] {
  return data.map((_, idx) => {
    if (idx < period - 1) return null;
    const slice = data.slice(idx - period + 1, idx + 1);
    return slice.reduce((a, b) => a + b, 0) / period;
  });
}

function calculateEMA(data: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const emaArr: number[] = [];
  let prev = data[0] || 0;
  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      emaArr.push(prev);
    } else {
      const curr = data[i] * k + prev * (1 - k);
      emaArr.push(curr);
      prev = curr;
    }
  }
  return emaArr;
}

function calculateBollingerBands(data: number[], period = 20, multiplier = 2) {
  const sma = calculateSMA(data, period);
  return data.map((_, idx) => {
    const mb = sma[idx];
    if (mb === null || idx < period - 1) return { upper: null, middle: null, lower: null };
    const slice = data.slice(idx - period + 1, idx + 1);
    const variance = slice.reduce((acc, x) => acc + Math.pow(x - mb, 2), 0) / period;
    const stdDev = Math.sqrt(variance);
    return {
      upper: mb + multiplier * stdDev,
      middle: mb,
      lower: mb - multiplier * stdDev,
    };
  });
}

function calculateMACDSeries(data: number[]) {
  const ema12 = calculateEMA(data, 12);
  const ema26 = calculateEMA(data, 26);
  const dif = ema12.map((v, i) => v - ema26[i]);
  const dea = calculateEMA(dif, 9);
  const histogram = dif.map((d, i) => (d - dea[i]) * 2);
  return { dif, dea, histogram };
}

function calculateRSISeries(data: number[], period: number): (number | null)[] {
  const rsi: (number | null)[] = [];
  let gains = 0;
  let losses = 0;

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      rsi.push(50);
      continue;
    }
    const diff = data[i] - data[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    if (i <= period) {
      gains += gain;
      losses += loss;
      const avgG = gains / period;
      const avgL = losses / period;
      const rs = avgL === 0 ? 100 : avgG / avgL;
      rsi.push(100 - 100 / (1 + rs));
    } else {
      gains = (gains * (period - 1) + gain) / period;
      losses = (losses * (period - 1) + loss) / period;
      const rs = losses === 0 ? 100 : gains / losses;
      rsi.push(Math.min(Math.max(100 - 100 / (1 + rs), 0), 100));
    }
  }
  return rsi;
}

export const TradeSetupChart: React.FC<TradeSetupChartProps> = ({
  signal,
  symbol,
  defaultDirection = 'LONG',
}) => {
  const [klines, setKlines] = useState<KlineData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [timeframe, setTimeframe] = useState<'5m' | '15m' | '1h' | '4h'>('15m');
  const [targetLevel, setTargetLevel] = useState<'TP1' | 'TP2' | 'TP3'>('TP2');
  const [leverage, setLeverage] = useState<number>(signal?.leverage?.safe?.multiplier || 10);
  const [activeTab, setActiveTab] = useState<'PROJECTION' | 'TRADINGVIEW'>('PROJECTION');

  // Indicator Visibility Toggles
  const [showMA, setShowMA] = useState<boolean>(true);
  const [showBOLL, setShowBOLL] = useState<boolean>(true);
  const [showMACD, setShowMACD] = useState<boolean>(true);
  const [showRSI, setShowRSI] = useState<boolean>(true);
  const [showRRBox, setShowRRBox] = useState<boolean>(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const direction: FuturesDirection = signal?.direction || defaultDirection;
  const isLong = direction === 'LONG';

  // Fetch Klines
  const fetchKlines = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/futures/klines?symbol=${symbol}&interval=${timeframe}&limit=70`);
      const data = await res.json();
      if (data.success && Array.isArray(data.klines) && data.klines.length > 0) {
        setKlines(data.klines);
      } else {
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
    const count = 65;
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
    return stopLossPct > 0 ? targetGainPct / stopLossPct : 3.0;
  }, [signal, targetGainPct, stopLossPct]);

  // Calculate Technical Indicator Series
  const closePrices = useMemo(() => klines.map((k) => k.close), [klines]);

  const ma7Series = useMemo(() => calculateSMA(closePrices, 7), [closePrices]);
  const ma25Series = useMemo(() => calculateSMA(closePrices, 25), [closePrices]);
  const ma99Series = useMemo(() => calculateSMA(closePrices, 99), [closePrices]);
  const bollSeries = useMemo(() => calculateBollingerBands(closePrices, 20, 2), [closePrices]);
  const macdSeries = useMemo(() => calculateMACDSeries(closePrices), [closePrices]);
  const rsi6Series = useMemo(() => calculateRSISeries(closePrices, 6), [closePrices]);
  const rsi12Series = useMemo(() => calculateRSISeries(closePrices, 12), [closePrices]);
  const rsi24Series = useMemo(() => calculateRSISeries(closePrices, 24), [closePrices]);

  // Latest Indicator Values for Legend
  const lastIdx = klines.length - 1;
  const currentMA7 = lastIdx >= 0 ? ma7Series[lastIdx] : null;
  const currentMA25 = lastIdx >= 0 ? ma25Series[lastIdx] : null;
  const currentMA99 = lastIdx >= 0 ? ma99Series[lastIdx] : null;
  const currentBoll = lastIdx >= 0 ? bollSeries[lastIdx] : null;
  const currentDIF = lastIdx >= 0 ? macdSeries.dif[lastIdx] : 0;
  const currentDEA = lastIdx >= 0 ? macdSeries.dea[lastIdx] : 0;
  const currentHist = lastIdx >= 0 ? macdSeries.histogram[lastIdx] : 0;
  const currentRSI6 = lastIdx >= 0 ? rsi6Series[lastIdx] : 50;
  const currentRSI12 = lastIdx >= 0 ? rsi12Series[lastIdx] : 50;
  const currentRSI24 = lastIdx >= 0 ? rsi24Series[lastIdx] : 50;

  // Format helper for tiny values
  const fmtP = (n: number | null) => (n === null ? '-' : n < 1 ? n.toFixed(5) : n.toFixed(2));

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

    // Dynamic Vertical Layout Allocations
    const padding = { top: 28, right: 90, bottom: 25, left: 15 };
    const chartW = width - padding.left - padding.right;
    const totalAvailH = height - padding.top - padding.bottom;

    // Allocate heights based on active sub-indicators
    let mainH = totalAvailH;
    const macdH = showMACD ? Math.min(totalAvailH * 0.16, 75) : 0;
    const rsiH = showRSI ? Math.min(totalAvailH * 0.15, 70) : 0;
    const volH = Math.min(totalAvailH * 0.12, 55);

    mainH = totalAvailH - volH - macdH - rsiH;

    const mainTop = padding.top;
    const volTop = mainTop + mainH;
    const macdTop = volTop + volH;
    const rsiTop = macdTop + macdH;

    // Price scaling inclusive of TP, Entry, SL, and BOLL bands
    const allPrices = klines.flatMap((k) => [k.high, k.low]);
    allPrices.push(entryPrice, selectedTargetPrice, stopLossPrice);
    if (showBOLL && currentBoll?.upper && currentBoll?.lower) {
      allPrices.push(currentBoll.upper, currentBoll.lower);
    }

    let minPrice = Math.min(...allPrices);
    let maxPrice = Math.max(...allPrices);
    const pBuffer = (maxPrice - minPrice) * 0.08;
    minPrice -= pBuffer;
    maxPrice += pBuffer;
    const priceRange = maxPrice - minPrice || 1;

    const priceToY = (p: number) => mainTop + mainH * (1 - (p - minPrice) / priceRange);

    // Background
    ctx.fillStyle = '#0a0a0c';
    ctx.fillRect(0, 0, width, height);

    // Grid Lines on Main Chart
    ctx.strokeStyle = '#18181b';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);

    for (let i = 0; i <= 4; i++) {
      const p = minPrice + (priceRange / 4) * i;
      const y = priceToY(p);
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();

      ctx.fillStyle = '#71717a';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(fmtP(p), width - padding.right + 8, y + 3);
    }
    ctx.setLineDash([]);

    // Candle Geometry
    const candleAreaWidth = showRRBox ? chartW * 0.72 : chartW;
    const count = klines.length;
    const candleSpacing = candleAreaWidth / count;
    const candleWidth = Math.max(candleSpacing * 0.65, 2.5);

    const getX = (idx: number) => padding.left + idx * candleSpacing + candleSpacing / 2;

    // 1. Draw Bollinger Bands BOLL(20, 2)
    if (showBOLL) {
      ctx.fillStyle = 'rgba(192, 132, 252, 0.05)';
      ctx.beginPath();
      let started = false;

      // Upper contour
      for (let i = 0; i < count; i++) {
        const b = bollSeries[i];
        if (b && b.upper !== null) {
          const x = getX(i);
          const y = priceToY(b.upper);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      }

      // Lower contour (reverse)
      for (let i = count - 1; i >= 0; i--) {
        const b = bollSeries[i];
        if (b && b.lower !== null) {
          const x = getX(i);
          const y = priceToY(b.lower);
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.fill();

      // Lines: Upper (purple), Middle (indigo), Lower (purple)
      const drawBandLine = (accessor: (b: typeof bollSeries[0]) => number | null, color: string) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        let first = true;
        for (let i = 0; i < count; i++) {
          const val = accessor(bollSeries[i]);
          if (val !== null) {
            const x = getX(i);
            const y = priceToY(val);
            if (first) {
              ctx.moveTo(x, y);
              first = false;
            } else {
              ctx.lineTo(x, y);
            }
          }
        }
        ctx.stroke();
      };

      drawBandLine((b) => b?.upper || null, 'rgba(192, 132, 252, 0.7)');
      drawBandLine((b) => b?.middle || null, 'rgba(129, 140, 248, 0.6)');
      drawBandLine((b) => b?.lower || null, 'rgba(192, 132, 252, 0.7)');
    }

    // 2. Draw Moving Averages MA(7), MA(25), MA(99)
    if (showMA) {
      const drawMALine = (series: (number | null)[], color: string) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        let first = true;
        for (let i = 0; i < count; i++) {
          const val = series[i];
          if (val !== null) {
            const x = getX(i);
            const y = priceToY(val);
            if (first) {
              ctx.moveTo(x, y);
              first = false;
            } else {
              ctx.lineTo(x, y);
            }
          }
        }
        ctx.stroke();
      };

      drawMALine(ma7Series, '#eab308'); // Yellow
      drawMALine(ma25Series, '#ec4899'); // Pink
      drawMALine(ma99Series, '#a855f7'); // Purple
    }

    // 3. Draw Candlesticks on Main Chart
    klines.forEach((k, idx) => {
      const x = getX(idx);
      const isBull = k.close >= k.open;
      const openY = priceToY(k.open);
      const closeY = priceToY(k.close);
      const highY = priceToY(k.high);
      const lowY = priceToY(k.low);

      // Wick
      ctx.strokeStyle = isBull ? '#10b981' : '#f43f5e';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Body
      const topY = Math.min(openY, closeY);
      const bodyH = Math.max(Math.abs(closeY - openY), 1.5);
      ctx.fillStyle = isBull ? '#10b981' : '#f43f5e';
      ctx.fillRect(x - candleWidth / 2, topY, candleWidth, bodyH);
    });

    // 4. Draw TradingView Long/Short Position Box (Proyeksi R:R)
    if (showRRBox) {
      const boxStartX = padding.left + candleAreaWidth + 5;
      const boxW = chartW - candleAreaWidth - 10;
      const entryY = priceToY(entryPrice);
      const targetY = priceToY(selectedTargetPrice);
      const stopY = priceToY(stopLossPrice);

      if (isLong) {
        // Target Box (Emerald)
        const tH = Math.abs(entryY - targetY);
        ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
        ctx.fillRect(boxStartX, Math.min(entryY, targetY), boxW, tH);

        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(boxStartX, targetY);
        ctx.lineTo(boxStartX + boxW, targetY);
        ctx.stroke();

        // Stop Box (Rose)
        const sH = Math.abs(entryY - stopY);
        ctx.fillStyle = 'rgba(244, 63, 94, 0.22)';
        ctx.fillRect(boxStartX, Math.min(entryY, stopY), boxW, sH);

        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(boxStartX, stopY);
        ctx.lineTo(boxStartX + boxW, stopY);
        ctx.stroke();
      } else {
        // Short Setup
        const tH = Math.abs(entryY - targetY);
        ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
        ctx.fillRect(boxStartX, Math.min(entryY, targetY), boxW, tH);

        ctx.strokeStyle = '#10b981';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(boxStartX, targetY);
        ctx.lineTo(boxStartX + boxW, targetY);
        ctx.stroke();

        const sH = Math.abs(entryY - stopY);
        ctx.fillStyle = 'rgba(244, 63, 94, 0.22)';
        ctx.fillRect(boxStartX, Math.min(entryY, stopY), boxW, sH);

        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(boxStartX, stopY);
        ctx.lineTo(boxStartX + boxW, stopY);
        ctx.stroke();
      }

      // Entry Line
      ctx.strokeStyle = '#f4f4f5';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(boxStartX - 20, entryY);
      ctx.lineTo(boxStartX + boxW, entryY);
      ctx.stroke();

      // Tool Floating Badges
      const targetDiff = Math.abs(selectedTargetPrice - entryPrice);
      ctx.fillStyle = '#10b981';
      ctx.fillRect(boxStartX + 6, targetY - 17, 135, 15);
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`Target: +${targetGainPct.toFixed(2)}% (+${fmtP(targetDiff)})`, boxStartX + 10, targetY - 6);

      ctx.fillStyle = '#27272a';
      ctx.strokeStyle = '#52525b';
      ctx.lineWidth = 1;
      ctx.fillRect(boxStartX + 6, entryY - 9, 145, 18);
      ctx.strokeRect(boxStartX + 6, entryY - 9, 145, 18);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`Entry: $${fmtP(entryPrice)} | R:R: ${riskRewardRatio.toFixed(1)}`, boxStartX + 10, entryY + 4);

      const stopDiff = Math.abs(entryPrice - stopLossPrice);
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(boxStartX + 6, stopY + 3, 125, 15);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(`Stop: -${stopLossPct.toFixed(2)}% (-${fmtP(stopDiff)})`, boxStartX + 10, stopY + 14);

      // Right Axis Badges
      ctx.fillStyle = '#10b981';
      ctx.fillRect(width - padding.right + 2, targetY - 9, 65, 18);
      ctx.fillStyle = '#000';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(fmtP(selectedTargetPrice), width - padding.right + 6, targetY + 4);

      ctx.fillStyle = '#fff';
      ctx.fillRect(width - padding.right + 2, entryY - 9, 65, 18);
      ctx.fillStyle = '#000';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(fmtP(entryPrice), width - padding.right + 6, entryY + 4);

      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(width - padding.right + 2, stopY - 9, 65, 18);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(fmtP(stopLossPrice), width - padding.right + 6, stopY + 4);
    }

    // 5. Draw Sub-Panel 1: Volume with Moving Average
    const maxV = Math.max(...klines.map((k) => k.volume), 1);
    ctx.fillStyle = '#18181b';
    ctx.fillRect(padding.left, volTop, chartW, 1);

    // Volume label
    ctx.fillStyle = '#71717a';
    ctx.font = '9px monospace';
    ctx.fillText('Vol(USDT)', padding.left, volTop + 10);

    klines.forEach((k, idx) => {
      const x = getX(idx);
      const isBull = k.close >= k.open;
      const vH = (k.volume / maxV) * (volH - 12);
      ctx.fillStyle = isBull ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)';
      ctx.fillRect(x - candleWidth / 2, volTop + volH - vH, candleWidth, vH);
    });

    // 6. Draw Sub-Panel 2: MACD(12, 26, 9)
    if (showMACD) {
      ctx.fillStyle = '#18181b';
      ctx.fillRect(padding.left, macdTop, chartW, 1);

      // MACD Header Label
      ctx.fillStyle = '#a1a1aa';
      ctx.font = '9px monospace';
      ctx.fillText(
        `MACD(12,26,9)  DIF:${currentDIF.toFixed(5)}  DEA:${currentDEA.toFixed(5)}  Hist:${currentHist.toFixed(5)}`,
        padding.left,
        macdTop + 11
      );

      const allHist = macdSeries.histogram;
      const maxH = Math.max(...allHist.map(Math.abs), 0.0001);
      const macdZeroY = macdTop + macdH / 2 + 5;

      // Draw Histogram
      allHist.forEach((h, idx) => {
        const x = getX(idx);
        const barH = (Math.abs(h) / maxH) * (macdH * 0.38);
        ctx.fillStyle = h >= 0 ? '#10b981' : '#f43f5e';
        if (h >= 0) {
          ctx.fillRect(x - candleWidth / 2, macdZeroY - barH, candleWidth, barH);
        } else {
          ctx.fillRect(x - candleWidth / 2, macdZeroY, candleWidth, barH);
        }
      });

      // Draw DIF (Cyan) & DEA (Pink) lines
      const drawMacdLine = (arr: number[], color: string) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        let first = true;
        arr.forEach((val, idx) => {
          const x = getX(idx);
          const y = macdZeroY - (val / maxH) * (macdH * 0.38);
          if (first) {
            ctx.moveTo(x, y);
            first = false;
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.stroke();
      };

      drawMacdLine(macdSeries.dif, '#38bdf8'); // Cyan
      drawMacdLine(macdSeries.dea, '#f43f5e'); // Pink
    }

    // 7. Draw Sub-Panel 3: Triple RSI(6, 12, 24)
    if (showRSI) {
      ctx.fillStyle = '#18181b';
      ctx.fillRect(padding.left, rsiTop, chartW, 1);

      ctx.fillStyle = '#a1a1aa';
      ctx.font = '9px monospace';
      ctx.fillText(
        `RSI(6):${(currentRSI6 || 50).toFixed(1)}  RSI(12):${(currentRSI12 || 50).toFixed(1)}  RSI(24):${(currentRSI24 || 50).toFixed(1)}`,
        padding.left,
        rsiTop + 11
      );

      const rsiToY = (val: number) => rsiTop + 16 + (1 - val / 100) * (rsiH - 22);

      // 70 & 30 Dotted Benchmark Lines
      ctx.strokeStyle = '#27272a';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);

      ctx.beginPath();
      ctx.moveTo(padding.left, rsiToY(70));
      ctx.lineTo(width - padding.right, rsiToY(70));
      ctx.moveTo(padding.left, rsiToY(30));
      ctx.lineTo(width - padding.right, rsiToY(30));
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#52525b';
      ctx.font = '8px monospace';
      ctx.fillText('70', width - padding.right + 6, rsiToY(70) + 3);
      ctx.fillText('30', width - padding.right + 6, rsiToY(30) + 3);

      // Draw Triple RSI Curves
      const drawRSICurve = (series: (number | null)[], color: string) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        let first = true;
        series.forEach((val, idx) => {
          if (val !== null) {
            const x = getX(idx);
            const y = rsiToY(val);
            if (first) {
              ctx.moveTo(x, y);
              first = false;
            } else {
              ctx.lineTo(x, y);
            }
          }
        });
        ctx.stroke();
      };

      drawRSICurve(rsi6Series, '#ec4899'); // RSI 6 (Pink)
      drawRSICurve(rsi12Series, '#a855f7'); // RSI 12 (Purple)
      drawRSICurve(rsi24Series, '#eab308'); // RSI 24 (Yellow)
    }
  }, [
    klines,
    entryPrice,
    selectedTargetPrice,
    stopLossPrice,
    riskRewardRatio,
    targetGainPct,
    stopLossPct,
    isLong,
    activeTab,
    showMA,
    showBOLL,
    showMACD,
    showRSI,
    showRRBox,
    ma7Series,
    ma25Series,
    ma99Series,
    bollSeries,
    macdSeries,
    rsi6Series,
    rsi12Series,
    rsi24Series,
  ]);

  return (
    <div className="flex flex-col h-full w-full bg-[#09090b] text-zinc-100 font-sans select-none">
      {/* 1. Top Header Bar: Controls & Multiple Choices */}
      <div className="px-4 py-2.5 border-b border-zinc-800/80 bg-zinc-950/90 flex flex-wrap items-center justify-between gap-3">
        {/* Left: Symbol, Direction, Confluence */}
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
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                }`}
              >
                {direction}
              </span>
              <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-300">
                R:R: <strong className="text-yellow-400">{riskRewardRatio.toFixed(1)} : 1</strong>
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
              Harga: <strong className="text-white">${fmtP(lastPrice)}</strong> • {signal?.strategyLabel || 'Indikator Binance Confluence'}
            </p>
          </div>
        </div>

        {/* Center: Multiple Choices (Timeframe, Target, Leverage) */}
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
              📐 Setup R:R & Indikator
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

          {/* Target Choice */}
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

        {/* Right: Eksekusi Binance & Refresh */}
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
            title="Refresh Data Pasar"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 2. Indicator Legend & Toggle Bar (Persis Indikator Binance) */}
      <div className="px-4 py-1.5 bg-zinc-950 border-b border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono">
        {/* Left: Binance Indicator Values */}
        <div className="flex flex-wrap items-center gap-3">
          {/* MA Values */}
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">MA:</span>
            <span className="text-yellow-400 font-bold">MA(7) {fmtP(currentMA7)}</span>
            <span className="text-pink-400 font-bold">MA(25) {fmtP(currentMA25)}</span>
            <span className="text-purple-400 font-bold">MA(99) {fmtP(currentMA99)}</span>
          </div>

          <span className="text-zinc-700">|</span>

          {/* BOLL Values */}
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">BOLL(20,2):</span>
            <span className="text-purple-300">UP {fmtP(currentBoll?.upper || null)}</span>
            <span className="text-indigo-300">MB {fmtP(currentBoll?.middle || null)}</span>
            <span className="text-purple-300">DN {fmtP(currentBoll?.lower || null)}</span>
          </div>
        </div>

        {/* Right: Indicator Checkbox Toggles */}
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-500 text-[10px]">Tampilkan:</span>
          {[
            { label: 'MA', state: showMA, setter: setShowMA },
            { label: 'BOLL', state: showBOLL, setter: setShowBOLL },
            { label: 'MACD', state: showMACD, setter: setShowMACD },
            { label: 'RSI', state: showRSI, setter: setShowRSI },
            { label: 'Proyeksi R:R', state: showRRBox, setter: setShowRRBox },
          ].map(({ label, state, setter }) => (
            <button
              key={label}
              onClick={() => setter(!state)}
              className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                state
                  ? 'bg-zinc-800 text-zinc-200 border-zinc-700'
                  : 'bg-zinc-950 text-zinc-600 border-zinc-900 hover:text-zinc-400'
              }`}
            >
              {state ? `✓ ${label}` : label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Main Chart Canvas Area */}
      <div className="flex-1 relative overflow-hidden bg-black flex flex-col" ref={containerRef}>
        {activeTab === 'PROJECTION' ? (
          <>
            <canvas ref={canvasRef} className="w-full h-full flex-1 cursor-crosshair block" />

            {/* Bottom Risk / Reward Telemetry Strip */}
            <div className="p-3 bg-zinc-950/90 border-t border-zinc-800/80 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-500">Entry:</span>
                  <span className="font-bold text-white">${fmtP(entryPrice)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-500">Target ({targetLevel}):</span>
                  <span className="font-bold text-emerald-400">
                    ${fmtP(selectedTargetPrice)} (+{targetGainPct.toFixed(2)}%)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-zinc-500">Stop Loss:</span>
                  <span className="font-bold text-rose-400">
                    ${fmtP(stopLossPrice)} (-{stopLossPct.toFixed(2)}%)
                  </span>
                </div>
              </div>

              {/* Leverage Simulator ROE */}
              <div className="flex items-center gap-3 bg-zinc-900/90 px-3 py-1.5 rounded-xl border border-zinc-800">
                <span className="text-zinc-400 font-bold">Simulasi {leverage}x:</span>
                <span className="text-emerald-400 font-black">
                  Potensi ROE: +{(targetGainPct * leverage).toFixed(1)}%
                </span>
                <span className="text-zinc-700">|</span>
                <span className="text-rose-400">
                  Maks Risiko: -{(stopLossPct * leverage).toFixed(1)}%
                </span>
              </div>
            </div>
          </>
        ) : (
          /* Full Interactive TradingView Widget Fallback */
          <iframe
            src={`https://s.tradingview.com/widgetembed/?symbol=BINANCE%3A${symbol}.P&interval=${timeframe}&theme=dark&style=1&timezone=Asia%2FJakarta&studies=%5B%22MASimple%40tv-basicstudies%22%2C%22BollingerBands%40tv-basicstudies%22%2C%22MACD%40tv-basicstudies%22%2C%22RSI%40tv-basicstudies%22%5D`}
            className="w-full h-full border-none flex-1"
            title="TradingView Chart with Binance Indicators"
          />
        )}
      </div>
    </div>
  );
};
