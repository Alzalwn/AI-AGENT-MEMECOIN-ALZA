/**
 * Real Technical Indicators Engine
 * Menghitung indikator teknikal murni dari deret harga penutupan (Close) klines historis:
 * - MA(7), MA(25), MA(99)
 * - Bollinger Bands (20, 2)
 * - MACD (12, 26, 9)
 * - Triple RSI (6, 12, 24)
 */

import { FuturesTechnicalIndicators } from '../types/futures';

/**
 * Menghitung Simple Moving Average (SMA)
 */
export function calculateSMA(values: number[], period: number): number {
  if (values.length === 0) return 0;
  const slice = values.slice(-period);
  const sum = slice.reduce((acc, v) => acc + v, 0);
  return sum / slice.length;
}

/**
 * Menghitung deret Exponential Moving Average (EMA)
 */
export function calculateEMASeries(values: number[], period: number): number[] {
  if (values.length === 0) return [];
  if (values.length < period) {
    return [calculateSMA(values, values.length)];
  }

  const k = 2 / (period + 1);
  const emaSeries: number[] = [];

  // Nilai awal adalah SMA periode pertama
  let initialSma = 0;
  for (let i = 0; i < period; i++) {
    initialSma += values[i];
  }
  initialSma /= period;
  emaSeries.push(initialSma);

  for (let i = period; i < values.length; i++) {
    const currentEma = values[i] * k + emaSeries[emaSeries.length - 1] * (1 - k);
    emaSeries.push(currentEma);
  }

  return emaSeries;
}

/**
 * Menghitung Bollinger Bands (20, 2) dari deret close
 */
export function calculateBollingerBands(
  closePrices: number[],
  period: number = 20,
  stdDevMultiplier: number = 2
): { upper: number; middle: number; lower: number; status: 'UPPER_BREAKOUT' | 'LOWER_BOUNCE' | 'SQUEEZE' | 'NORMAL' } {
  if (closePrices.length < 5) {
    const lastPrice = closePrices[closePrices.length - 1] || 1;
    return {
      upper: lastPrice * 1.03,
      middle: lastPrice,
      lower: lastPrice * 0.97,
      status: 'NORMAL',
    };
  }

  const effectivePeriod = Math.min(period, closePrices.length);
  const slice = closePrices.slice(-effectivePeriod);
  const middle = slice.reduce((a, b) => a + b, 0) / slice.length;

  const variance =
    slice.reduce((acc, val) => acc + Math.pow(val - middle, 2), 0) / slice.length;
  const stdDev = Math.sqrt(variance);

  const upper = middle + stdDevMultiplier * stdDev;
  const lower = Math.max(middle - stdDevMultiplier * stdDev, 0.00000001);
  const currentPrice = closePrices[closePrices.length - 1];

  let status: 'UPPER_BREAKOUT' | 'LOWER_BOUNCE' | 'SQUEEZE' | 'NORMAL' = 'NORMAL';
  const bandwidth = (upper - lower) / middle;

  if (currentPrice >= upper) {
    status = 'UPPER_BREAKOUT';
  } else if (currentPrice <= lower) {
    status = 'LOWER_BOUNCE';
  } else if (bandwidth < 0.02) {
    status = 'SQUEEZE';
  }

  return { upper, middle, lower, status };
}

/**
 * Menghitung MACD(12, 26, 9)
 */
export function calculateMACD(
  closePrices: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): {
  dif: number;
  dea: number;
  histogram: number;
  trend: 'BULLISH_CROSS' | 'BEARISH_CROSS' | 'BULLISH' | 'BEARISH';
} {
  if (closePrices.length < slowPeriod) {
    const lastPrice = closePrices[closePrices.length - 1] || 1;
    return {
      dif: 0.0001,
      dea: 0.0001,
      histogram: 0,
      trend: 'BULLISH',
    };
  }

  const fastEmaSeries = calculateEMASeries(closePrices, fastPeriod);
  const slowEmaSeries = calculateEMASeries(closePrices, slowPeriod);

  // Buat deret DIF (MACD Line)
  // slowEmaSeries dimulai pada index slowPeriod - 1
  const difSeries: number[] = [];
  const offset = slowPeriod - fastPeriod;

  for (let i = 0; i < slowEmaSeries.length; i++) {
    const fastIdx = i + offset;
    if (fastIdx < fastEmaSeries.length) {
      difSeries.push(fastEmaSeries[fastIdx] - slowEmaSeries[i]);
    }
  }

  if (difSeries.length === 0) {
    return { dif: 0, dea: 0, histogram: 0, trend: 'BULLISH' };
  }

  // DEA (Signal Line) adalah EMA 9 dari DIF series
  const deaSeries = calculateEMASeries(difSeries, signalPeriod);

  const dif = difSeries[difSeries.length - 1];
  const dea = deaSeries[deaSeries.length - 1] ?? dif;
  const histogram = dif - dea;

  // Cek apakah baru saja terjadi cross pada bar sebelumnya
  let prevDif = dif;
  let prevDea = dea;
  if (difSeries.length >= 2 && deaSeries.length >= 2) {
    prevDif = difSeries[difSeries.length - 2];
    prevDea = deaSeries[deaSeries.length - 2];
  }

  let trend: 'BULLISH_CROSS' | 'BEARISH_CROSS' | 'BULLISH' | 'BEARISH' =
    dif >= dea ? 'BULLISH' : 'BEARISH';

  if (dif > dea && prevDif <= prevDea) {
    trend = 'BULLISH_CROSS';
  } else if (dif < dea && prevDif >= prevDea) {
    trend = 'BEARISH_CROSS';
  }

  return { dif, dea, histogram, trend };
}

/**
 * Menghitung Relative Strength Index (RSI) dengan metode Wilder
 */
export function calculateRSI(closePrices: number[], period: number): number {
  if (closePrices.length <= period) {
    return 50;
  }

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = closePrices[i] - closePrices[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < closePrices.length; i++) {
    const diff = closePrices[i] - closePrices[i - 1];
    if (diff >= 0) {
      avgGain = (avgGain * (period - 1) + diff) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      const loss = Math.abs(diff);
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Number((100 - 100 / (1 + rs)).toFixed(2));
}

/**
 * Menghitung deret RSI untuk keperluan turunan (seperti StochRSI)
 */
export function calculateRSISeries(closePrices: number[], period: number): number[] {
  if (closePrices.length <= period) {
    return Array(closePrices.length).fill(50);
  }

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = closePrices[i] - closePrices[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  const rsiSeries: number[] = Array(period).fill(50);
  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  rsiSeries.push(100 - 100 / (1 + rs));

  for (let i = period + 1; i < closePrices.length; i++) {
    const diff = closePrices[i] - closePrices[i - 1];
    if (diff >= 0) {
      avgGain = (avgGain * (period - 1) + diff) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      const loss = Math.abs(diff);
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
    }
    
    if (avgLoss === 0) {
      rsiSeries.push(100);
    } else {
      rs = avgGain / avgLoss;
      rsiSeries.push(100 - 100 / (1 + rs));
    }
  }

  return rsiSeries;
}

/**
 * Menghitung Stochastic RSI (%K dan %D)
 */
export function calculateStochRSI(
  closePrices: number[],
  rsiPeriod = 14,
  stochPeriod = 14,
  kPeriod = 3,
  dPeriod = 3
): { k: number; d: number; status: 'OVERBOUGHT' | 'OVERSOLD' | 'BULLISH_CROSS' | 'BEARISH_CROSS' | 'NEUTRAL' } {
  const rsiSeries = calculateRSISeries(closePrices, rsiPeriod);
  if (rsiSeries.length < stochPeriod + kPeriod + dPeriod) {
    return { k: 50, d: 50, status: 'NEUTRAL' };
  }

  const stochRsiSeries: number[] = [];
  for (let i = stochPeriod - 1; i < rsiSeries.length; i++) {
    const window = rsiSeries.slice(i - stochPeriod + 1, i + 1);
    const minRsi = Math.min(...window);
    const maxRsi = Math.max(...window);
    let stochRsi = 0;
    if (maxRsi !== minRsi) {
      stochRsi = ((rsiSeries[i] - minRsi) / (maxRsi - minRsi)) * 100;
    }
    stochRsiSeries.push(stochRsi);
  }

  const kSeries: number[] = [];
  for (let i = kPeriod - 1; i < stochRsiSeries.length; i++) {
    const window = stochRsiSeries.slice(i - kPeriod + 1, i + 1);
    const k = window.reduce((a, b) => a + b, 0) / kPeriod;
    kSeries.push(k);
  }

  const dSeries: number[] = [];
  for (let i = dPeriod - 1; i < kSeries.length; i++) {
    const window = kSeries.slice(i - dPeriod + 1, i + 1);
    const d = window.reduce((a, b) => a + b, 0) / dPeriod;
    dSeries.push(d);
  }

  const currentK = kSeries[kSeries.length - 1];
  const currentD = dSeries[dSeries.length - 1];
  const prevK = kSeries[kSeries.length - 2] || currentK;
  const prevD = dSeries[dSeries.length - 2] || currentD;

  let status: 'OVERBOUGHT' | 'OVERSOLD' | 'BULLISH_CROSS' | 'BEARISH_CROSS' | 'NEUTRAL' = 'NEUTRAL';
  if (currentK >= 80 && currentD >= 80) status = 'OVERBOUGHT';
  else if (currentK <= 20 && currentD <= 20) status = 'OVERSOLD';
  else if (currentK > currentD && prevK <= prevD && currentK < 50) status = 'BULLISH_CROSS';
  else if (currentK < currentD && prevK >= prevD && currentK > 50) status = 'BEARISH_CROSS';

  return { k: currentK, d: currentD, status };
}

/**
 * Fungsi Utama: Menghitung seluruh Indikator Teknikal Riil dari Array Harga Penutupan Klines
 */
export function computeRealTechnicalIndicators(
  closePrices: number[],
  currentPrice: number
): FuturesTechnicalIndicators {
  const prices = closePrices.length > 0 ? [...closePrices] : [currentPrice];
  if (prices[prices.length - 1] !== currentPrice) {
    prices.push(currentPrice);
  }

  // 1. Moving Averages Riil (MA7, MA25, MA99)
  const ma7 = calculateSMA(prices, 7);
  const ma25 = calculateSMA(prices, Math.min(25, prices.length));
  const ma99 = calculateSMA(prices, Math.min(99, prices.length));

  let maAlignment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  if (ma7 > ma25 && ma25 > ma99) maAlignment = 'BULLISH';
  else if (ma7 < ma25 && ma25 < ma99) maAlignment = 'BEARISH';

  // 1b. Exponential Moving Averages (EMA9, EMA21, EMA50)
  const ema9Series = calculateEMASeries(prices, 9);
  const ema21Series = calculateEMASeries(prices, 21);
  const ema50Series = calculateEMASeries(prices, 50);
  
  const ema9 = ema9Series[ema9Series.length - 1] || currentPrice;
  const ema21 = ema21Series[ema21Series.length - 1] || currentPrice;
  const ema50 = ema50Series[ema50Series.length - 1] || currentPrice;

  let emaAlignment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  if (ema9 > ema21 && ema21 > ema50) emaAlignment = 'BULLISH';
  else if (ema9 < ema21 && ema21 < ema50) emaAlignment = 'BEARISH';

  // 2. Bollinger Bands Riil
  const bollingerBands = calculateBollingerBands(prices, 20, 2);

  // 3. MACD Riil (12, 26, 9)
  const macd = calculateMACD(prices, 12, 26, 9);

  // 4. Triple RSI Riil (6, 12, 24)
  const rsi6 = calculateRSI(prices, 6);
  const rsi12 = calculateRSI(prices, 12);
  const rsi24 = calculateRSI(prices, 24);

  let rsiStatus: 'OVERBOUGHT' | 'OVERSOLD' | 'BULLISH_MOMENTUM' | 'BEARISH_MOMENTUM' | 'NEUTRAL' = 'NEUTRAL';
  if (rsi6 >= 75) rsiStatus = 'OVERBOUGHT';
  else if (rsi6 <= 25) rsiStatus = 'OVERSOLD';
  else if (rsi6 >= 55) rsiStatus = 'BULLISH_MOMENTUM';
  else if (rsi6 <= 45) rsiStatus = 'BEARISH_MOMENTUM';

  // 5. Stochastic RSI Riil
  const stochRsi = calculateStochRSI(prices, 14, 14, 3, 3);

  return {
    ma: { ma7, ma25, ma99, alignment: maAlignment },
    ema: { ema9, ema21, ema50, alignment: emaAlignment },
    bollingerBands,
    macd,
    rsi: { rsi6, rsi12, rsi24, status: rsiStatus },
    stochRsi,
  };
}
