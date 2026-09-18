/**
 * Smart Money Concepts (SMC) & Institutional Price Action Engine
 * 
 * Modul deterministik mandiri untuk mendeteksi:
 * 1. Order Block (OB) Institusional berbasis Volume Price Analysis (VPA >= 1.5x MA20)
 * 2. Fair Value Gap (FVG) dengan evaluasi mitigasi berbasis sumbu (Wick Consequent Encroachment 50%)
 * 3. Liquidity Sweep (Sapuan likuiditas SSL/BSL dengan rejection wick)
 * 4. Multi-Timeframe (MTF) Fractal Confirmation (4H Setup + 15m MSS / Reversal Trigger)
 * 5. Filter Anti-Sideways berbasis ATR (Average True Range)
 */

import {
  SmcOrderBlock,
  SmcFairValueGap,
  SmcLiquiditySweep,
  SmcAnalysisResult,
} from '../types/futures';
import { Candle, getCandleMetrics } from './candlestickPatternEngine';

/**
 * 1. Menghitung Average True Range (ATR) & Persentase Volatilitas
 * Digunakan untuk mengeliminasi koin di "zona pencacah daging" (sideways choppy).
 */
export function calculateAtr(candles: Candle[], period: number = 14): {
  atr: number;
  atrVolatilityPct: number;
  isAtrHealthy: boolean;
} {
  if (!candles || candles.length < period + 1) {
    return { atr: 0, atrVolatilityPct: 0, isAtrHealthy: true };
  }

  const trueRanges: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const prev = candles[i - 1];
    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - prev.close),
      Math.abs(current.low - prev.close)
    );
    trueRanges.push(tr);
  }

  // Hitung Simple Moving Average untuk ATR awal, lalu smoothed ATR
  const recentTrs = trueRanges.slice(-period);
  const atr = recentTrs.reduce((sum, v) => sum + v, 0) / period;
  const currentPrice = candles[candles.length - 1].close || 1;
  const atrVolatilityPct = (atr / currentPrice) * 100;

  // Threshold: Koin dengan ATR < 0.40% di TF 15m/4h dianggap tidak memiliki volatilitas sehat untuk sniper
  const isAtrHealthy = atrVolatilityPct >= 0.40;

  return {
    atr,
    atrVolatilityPct: Number(atrVolatilityPct.toFixed(3)),
    isAtrHealthy,
  };
}

/**
 * 2. Deteksi Order Block (OB) Institusional dengan Verifikasi Volume (VPA)
 * Demand OB: Candle bearish terakhir sebelum impuls bullish kuat (>= 2.5%) dengan volume >= 1.5x MA20.
 */
export function findOrderBlocks(candles4h: Candle[]): {
  demandZone?: SmcOrderBlock;
  supplyZone?: SmcOrderBlock;
} {
  if (!candles4h || candles4h.length < 25) {
    return {};
  }

  const currentPrice = candles4h[candles4h.length - 1].close;

  // Hitung MA20 Volume
  const volumes = candles4h.map((c) => c.volume || 0);
  const calculateMaVolume = (idx: number, lookback: number = 20): number => {
    const start = Math.max(0, idx - lookback);
    const slice = volumes.slice(start, idx);
    if (slice.length === 0) return 1;
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  };

  let bestDemand: SmcOrderBlock | undefined;
  let bestSupply: SmcOrderBlock | undefined;

  // Pindai dari candle ke-20 sampai candle ke-2 terakhir
  for (let i = 20; i < candles4h.length - 1; i++) {
    const current = candles4h[i];
    const next1 = candles4h[i + 1];
    const next2 = i + 2 < candles4h.length ? candles4h[i + 2] : next1;
    const ma20Vol = calculateMaVolume(i);

    // --- DEMAND ORDER BLOCK ---
    // Syarat: Candle saat ini merah (bearish), diikuti ledakan bullish berikutnya
    const isBearishBase = current.close < current.open;
    const impulseHigh = Math.max(next1.high, next2.high);
    const impulseClose = Math.max(next1.close, next2.close);
    const impulsePct = ((impulseHigh - current.low) / current.low) * 100;
    const impulseVol = Math.max(next1.volume || 0, next2.volume || 0);
    const volRatio = ma20Vol > 0 ? impulseVol / ma20Vol : 1;

    if (isBearishBase && impulsePct >= 2.5 && impulseClose > current.high) {
      const zoneLow = current.low;
      const zoneHigh = Math.max(current.open, current.close); // Body atas candle dasar
      const isVolumeValidated = volRatio >= 1.4; // Toleransi institusi VPA >= 1.4x - 2.0x

      // Cek apakah zona ini sudah dimitigasi/ditembus ke bawah setelah terbentuk
      let isMitigated = false;
      for (let j = i + 2; j < candles4h.length; j++) {
        if (candles4h[j].low < zoneLow) {
          isMitigated = true; // Tertembus ke bawah (invalidation)
          break;
        }
      }

      // Jika belum invalid, dan harga saat ini berada di atas atau sedang menguji zona demand
      if (!isMitigated && currentPrice >= zoneLow * 0.985) {
        bestDemand = {
          type: 'DEMAND',
          zoneLow,
          zoneHigh,
          strength: isMitigated ? 'MITIGATED' : 'FRESH',
          originCandleTime: current.time || 0,
          impulseMovePct: Number(impulsePct.toFixed(2)),
          volumeMultiplier: Number(volRatio.toFixed(2)),
          isVolumeValidated,
          isFvgPresent: false, // Diperbarui di langkah FVG
        };
      }
    }

    // --- SUPPLY ORDER BLOCK ---
    // Syarat: Candle saat ini hijau (bullish), diikuti dump tajam ke bawah
    const isBullishBase = current.close > current.open;
    const dumpLow = Math.min(next1.low, next2.low);
    const dumpClose = Math.min(next1.close, next2.close);
    const dumpPct = ((current.high - dumpLow) / current.high) * 100;
    const dumpVol = Math.max(next1.volume || 0, next2.volume || 0);
    const dumpVolRatio = ma20Vol > 0 ? dumpVol / ma20Vol : 1;

    if (isBullishBase && dumpPct >= 2.5 && dumpClose < current.low) {
      const zoneHigh = current.high;
      const zoneLow = Math.min(current.open, current.close);
      const isVolumeValidated = dumpVolRatio >= 1.4;

      let isMitigated = false;
      for (let j = i + 2; j < candles4h.length; j++) {
        if (candles4h[j].high > zoneHigh) {
          isMitigated = true;
          break;
        }
      }

      if (!isMitigated && currentPrice <= zoneHigh * 1.015) {
        bestSupply = {
          type: 'SUPPLY',
          zoneLow,
          zoneHigh,
          strength: isMitigated ? 'MITIGATED' : 'FRESH',
          originCandleTime: current.time || 0,
          impulseMovePct: Number(dumpPct.toFixed(2)),
          volumeMultiplier: Number(dumpVolRatio.toFixed(2)),
          isVolumeValidated,
          isFvgPresent: false,
        };
      }
    }
  }

  return { demandZone: bestDemand, supplyZone: bestSupply };
}

/**
 * 3. Deteksi Fair Value Gap (FVG) dengan Evaluasi Wick Consequent Encroachment (50%)
 */
export function findFairValueGaps(candles4h: Candle[]): SmcFairValueGap | undefined {
  if (!candles4h || candles4h.length < 5) return undefined;

  // Cari dari candle terbaru ke belakang (lookback 15 candle 4H)
  const len = candles4h.length;
  for (let i = len - 2; i >= Math.max(2, len - 15); i--) {
    const prev = candles4h[i - 1];
    const current = candles4h[i];
    const next = candles4h[i + 1];

    // Bullish FVG: Low candle depan (i+1) lebih tinggi dari High candle belakang (i-1)
    if (next.low > prev.high) {
      const gapLow = prev.high;
      const gapHigh = next.low;
      const gapSize = gapHigh - gapLow;
      if (gapSize / gapLow < 0.003) continue; // Abaikan gap mikro (<0.3%)

      const midpoint = (gapLow + gapHigh) / 2; // Consequent Encroachment 50%

      // Cek apakah wick candle sesudahnya telah menyentuh atau menutup FVG
      let isFilled = false;
      let minWickAfter = gapHigh;

      for (let j = i + 2; j < len; j++) {
        if (candles4h[j].low < minWickAfter) {
          minWickAfter = candles4h[j].low;
        }
        // FVG dianggap terisi jika wick menembus midpoint 50% atau menyentuh gapLow
        if (candles4h[j].low <= midpoint) {
          isFilled = true;
          break;
        }
      }

      const filledAmount = Math.max(0, gapHigh - minWickAfter);
      const fillRatioPct = Math.min(100, (filledAmount / gapSize) * 100);

      return {
        type: 'BULLISH_FVG',
        gapHigh,
        gapLow,
        midpoint,
        isFilled,
        fillRatioPct: Number(fillRatioPct.toFixed(1)),
      };
    }

    // Bearish FVG: High candle depan (i+1) lebih rendah dari Low candle belakang (i-1)
    if (next.high < prev.low) {
      const gapHigh = prev.low;
      const gapLow = next.high;
      const gapSize = gapHigh - gapLow;
      if (gapSize / gapLow < 0.003) continue;

      const midpoint = (gapLow + gapHigh) / 2;
      let isFilled = false;
      let maxWickAfter = gapLow;

      for (let j = i + 2; j < len; j++) {
        if (candles4h[j].high > maxWickAfter) {
          maxWickAfter = candles4h[j].high;
        }
        if (candles4h[j].high >= midpoint) {
          isFilled = true;
          break;
        }
      }

      const filledAmount = Math.max(0, maxWickAfter - gapLow);
      const fillRatioPct = Math.min(100, (filledAmount / gapSize) * 100);

      return {
        type: 'BEARISH_FVG',
        gapHigh,
        gapLow,
        midpoint,
        isFilled,
        fillRatioPct: Number(fillRatioPct.toFixed(1)),
      };
    }
  }

  return undefined;
}

/**
 * 4. Deteksi Liquidity Sweep (Sapuan Likuiditas SSL / BSL)
 * Mendeteksi candle 4H terbaru yang menyapu swing low/high lama lalu ditarik kembali (rejection wick).
 */
export function detectLiquiditySweep(candles4h: Candle[]): SmcLiquiditySweep | undefined {
  if (!candles4h || candles4h.length < 15) return undefined;

  const len = candles4h.length;
  // Cari swing low dari 15 candle sebelumnya (tidak termasuk 3 candle terakhir)
  const priorCandles = candles4h.slice(Math.max(0, len - 20), len - 3);
  if (priorCandles.length < 5) return undefined;

  let swingLow = Infinity;
  let swingHigh = -Infinity;
  for (const c of priorCandles) {
    if (c.low < swingLow) swingLow = c.low;
    if (c.high > swingHigh) swingHigh = c.high;
  }

  // Cek 3 candle 4H terakhir untuk mendeteksi SSL Sweep (Bawah) atau BSL Sweep (Atas)
  for (let i = len - 3; i < len; i++) {
    const c = candles4h[i];
    const metrics = getCandleMetrics(c);

    // SSL Sweep: Sumbu bawah menembus swingLow, tetapi close ditarik kembali di atas swingLow
    if (c.low < swingLow && c.close >= swingLow && metrics.lowerShadowPct >= 0.35) {
      return {
        type: 'SSL_SWEPT',
        sweptLevel: swingLow,
        sweepCandleTime: c.time || 0,
        rejectionWickPct: Number((metrics.lowerShadowPct * 100).toFixed(1)),
      };
    }

    // BSL Sweep: Sumbu atas menembus swingHigh, tetapi close kembali di bawah swingHigh
    if (c.high > swingHigh && c.close <= swingHigh && metrics.upperShadowPct >= 0.35) {
      return {
        type: 'BSL_SWEPT',
        sweptLevel: swingHigh,
        sweepCandleTime: c.time || 0,
        rejectionWickPct: Number((metrics.upperShadowPct * 100).toFixed(1)),
      };
    }
  }

  return undefined;
}

/**
 * 5. Konfirmasi Fraktal Multi-Timeframe (15m MSS / Reversal Trigger di dalam Zona 4H)
 * Saat harga berada di dekat/dalam Demand OB 4H, periksa apakah 15m membentuk Higher High (MSS) atau Bullish Engulfing.
 */
export function detectMtfMssAndTrigger(
  candles15m: Candle[],
  demandZone?: SmcOrderBlock
): {
  mssConfirmed: boolean;
  candlestickTrigger15m?: string;
} {
  if (!candles15m || candles15m.length < 10) {
    return { mssConfirmed: false };
  }

  const len = candles15m.length;
  const current15m = candles15m[len - 1];
  const prev15m = candles15m[len - 2];

  // 1. Cek Pola Bullish Engulfing di 15m
  const isEngulfing =
    prev15m.close < prev15m.open &&
    current15m.close > current15m.open &&
    current15m.close > prev15m.open &&
    current15m.open <= prev15m.close;

  // 2. Cek Pola Hammer / Strong Rejection di 15m
  const metrics15m = getCandleMetrics(current15m);
  const isHammer = metrics15m.lowerShadowPct >= 0.55 && metrics15m.bodyPct <= 0.35;

  // 3. Cek Market Structure Shift (MSS):
  // Apakah candle 15m terakhir berhasil menembus swing high lokal (dari 4-8 candle 15m sebelumnya)?
  const localLookback = candles15m.slice(Math.max(0, len - 9), len - 1);
  const localSwingHigh = Math.max(...localLookback.map((c) => c.high));
  const hasBrokenSwingHigh = current15m.close > localSwingHigh;

  let candlestickTrigger15m: string | undefined;
  if (isEngulfing) {
    candlestickTrigger15m = 'Bullish Engulfing 15m di Zona Demand';
  } else if (isHammer) {
    candlestickTrigger15m = 'Hammer Rejection Wick 15m';
  } else if (hasBrokenSwingHigh) {
    candlestickTrigger15m = 'Higher High Breakout 15m';
  }

  const mssConfirmed = hasBrokenSwingHigh || (isEngulfing && metrics15m.isGreen);

  return {
    mssConfirmed,
    candlestickTrigger15m,
  };
}

/**
 * 6. FUNGSI UTAMA: Run SMC Analysis Multi-Timeframe
 * Menggabungkan seluruh logika SMC, VPA, ATR, FVG, dan MTF 15m Confirmation.
 */
export function runSmcAnalysis(
  symbol: string,
  candles4h: Candle[],
  candles15m: Candle[]
): SmcAnalysisResult {
  const currentPrice =
    candles15m && candles15m.length > 0
      ? candles15m[candles15m.length - 1].close
      : candles4h[candles4h.length - 1]?.close || 1;

  // Step 1: ATR Filter (Anti-Sideways)
  const atrResult = calculateAtr(candles15m, 14);

  // Step 2: Deteksi Order Block 4H
  const { demandZone, supplyZone } = findOrderBlocks(candles4h);

  // Step 3: Deteksi FVG
  const recentFvg = findFairValueGaps(candles4h);
  if (demandZone && recentFvg && recentFvg.type === 'BULLISH_FVG') {
    demandZone.isFvgPresent = true;
  }

  // Step 4: Deteksi Liquidity Sweep
  const recentSweep = detectLiquiditySweep(candles4h);

  // Step 5: Deteksi Konfirmasi MTF 15m (MSS & Candlestick Trigger)
  const mtfTrigger = detectMtfMssAndTrigger(candles15m, demandZone);

  // Step 6: Kalkulasi Skor & Bias SMC
  let smcScore = 50;
  let smcBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  const rationaleParts: string[] = [];

  // Pengecekan Kondisi Bullish Demand Reversal
  const isInDemandZone =
    demandZone &&
    currentPrice >= demandZone.zoneLow * 0.995 &&
    currentPrice <= demandZone.zoneHigh * 1.025;

  if (isInDemandZone && demandZone) {
    smcBias = 'BULLISH';
    smcScore += 25;
    rationaleParts.push(
      `Harga menguji Demand OB 4H ($${demandZone.zoneLow.toFixed(4)} - $${demandZone.zoneHigh.toFixed(4)})`
    );

    if (demandZone.isVolumeValidated) {
      smcScore += 15;
      rationaleParts.push(`VPA Institusi valid (${demandZone.volumeMultiplier}x MA20 Vol)`);
    }

    if (recentSweep && recentSweep.type === 'SSL_SWEPT') {
      smcScore += 15;
      rationaleParts.push(`SSL disapu (Rejection Wick ${recentSweep.rejectionWickPct}%)`);
    }

    if (mtfTrigger.mssConfirmed) {
      smcScore += 20;
      rationaleParts.push(`MSS 15m terkonfirmasi (${mtfTrigger.candlestickTrigger15m || 'Higher High'})`);
    } else if (mtfTrigger.candlestickTrigger15m) {
      smcScore += 10;
      rationaleParts.push(`Trigger 15m: ${mtfTrigger.candlestickTrigger15m}`);
    }

    if (recentFvg && recentFvg.type === 'BULLISH_FVG' && !recentFvg.isFilled) {
      smcScore += 10;
      rationaleParts.push(`Target magnet FVG 4H di $${recentFvg.gapHigh.toFixed(4)}`);
    }
  } else if (supplyZone && currentPrice >= supplyZone.zoneLow * 0.985 && currentPrice <= supplyZone.zoneHigh * 1.015) {
    // Kondisi Bearish Supply Rejection
    smcBias = 'BEARISH';
    smcScore += 25;
    rationaleParts.push(
      `Harga menyentuh Supply OB 4H ($${supplyZone.zoneLow.toFixed(4)} - $${supplyZone.zoneHigh.toFixed(4)})`
    );

    if (supplyZone.isVolumeValidated) {
      smcScore += 15;
      rationaleParts.push(`VPA Dump Institusi valid (${supplyZone.volumeMultiplier}x MA20)`);
    }

    if (recentSweep && recentSweep.type === 'BSL_SWEPT') {
      smcScore += 15;
      rationaleParts.push(`BSL disapu (Rejection Wick ${recentSweep.rejectionWickPct}%)`);
    }
  }

  // Penalti ATR (Pasar Choppy / Sideways Mati)
  if (!atrResult.isAtrHealthy) {
    smcScore = Math.max(35, smcScore - 30);
    rationaleParts.push(`⚠️ ATR Rendah (${atrResult.atrVolatilityPct}%): Pasar sideways choppy`);
  }

  const finalScore = Math.min(99, Math.max(30, smcScore));
  const smcRationale =
    rationaleParts.length > 0
      ? rationaleParts.join(' • ')
      : `Struktur 4H normal tanpa anomali SMC agresif (ATR ${atrResult.atrVolatilityPct}%).`;

  return {
    timeframe: '4h',
    nearestDemandZone: demandZone,
    nearestSupplyZone: supplyZone,
    recentFvg,
    recentSweep,
    mssConfirmed: mtfTrigger.mssConfirmed,
    candlestickTrigger15m: mtfTrigger.candlestickTrigger15m,
    atrVolatilityPct: atrResult.atrVolatilityPct,
    isAtrHealthy: atrResult.isAtrHealthy,
    smcBias,
    smcScore: finalScore,
    smcRationale,
  };
}
