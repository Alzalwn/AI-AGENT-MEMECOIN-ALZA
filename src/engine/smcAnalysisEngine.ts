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
  SmcInversionFvg,
  SmcCisd,
  IctLiquidityRange,
  SmtDivergenceResult,
  IctKeyLevelZone,
  IctPoiType,
  SmcInducement,
  SmcSnrFlip,
  SmcTrendlineBreak,
  SmcVolumeExhaustion,
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
 * 6. Deteksi Inversion Fair Value Gap (IFVG) - Trigger Agresif 1
 * Gap yang tertembus dan berbalik fungsi (Support menjadi Resistance atau sebaliknya).
 */
export function detectInversionFvg(candles: Candle[]): SmcInversionFvg | undefined {
  if (!candles || candles.length < 6) return undefined;
  const len = candles.length;
  const currentPrice = candles[len - 1].close;

  // Cari dari candle ke (len - 12) sampai (len - 3)
  for (let i = Math.max(2, len - 12); i < len - 2; i++) {
    const prev = candles[i - 1];
    const current = candles[i];
    const next = candles[i + 1];

    // Bullish FVG awal: next.low > prev.high
    if (next.low > prev.high) {
      const gapLow = prev.high;
      const gapHigh = next.low;
      const gapSize = gapHigh - gapLow;
      if (gapSize / gapLow < 0.002) continue;

      // Cek apakah ada candle setelahnya yang close di bawah gapLow (Inversion ke Bearish IFVG)
      for (let j = i + 2; j < len; j++) {
        if (candles[j].close < gapLow) {
          return {
            type: 'BEARISH_IFVG',
            originalGapLow: gapLow,
            originalGapHigh: gapHigh,
            inversionPrice: gapLow,
            brokenTime: candles[j].time || 0,
            status: currentPrice <= gapHigh ? 'ACTIVE' : 'MITIGATED',
          };
        }
      }
    }

    // Bearish FVG awal: next.high < prev.low
    if (next.high < prev.low) {
      const gapHigh = prev.low;
      const gapLow = next.high;
      const gapSize = gapHigh - gapLow;
      if (gapSize / gapLow < 0.002) continue;

      // Cek apakah ada candle setelahnya yang close di atas gapHigh (Inversion ke Bullish IFVG)
      for (let j = i + 2; j < len; j++) {
        if (candles[j].close > gapHigh) {
          return {
            type: 'BULLISH_IFVG',
            originalGapLow: gapLow,
            originalGapHigh: gapHigh,
            inversionPrice: gapHigh,
            brokenTime: candles[j].time || 0,
            status: currentPrice >= gapLow ? 'ACTIVE' : 'MITIGATED',
          };
        }
      }
    }
  }

  return undefined;
}

/**
 * 7. Deteksi Change in State of Delivery (CISD) - Trigger Agresif 2
 * Perubahan sifat pengiriman harga saat candle berbalik menembus body candle pembuka pergerakan sebelumnya.
 */
export function detectCisd(candles15m: Candle[]): SmcCisd | undefined {
  if (!candles15m || candles15m.length < 8) return undefined;
  const len = candles15m.length;
  const lastCandle = candles15m[len - 1];

  const recentSlice = candles15m.slice(Math.max(0, len - 6), len - 1);
  const minLow = Math.min(...recentSlice.map((c) => c.low));
  const maxHigh = Math.max(...recentSlice.map((c) => c.high));

  // Bullish CISD: Candle hijau terakhir menembus dan close di atas open candle merah yang memulai dump terakhir
  for (let i = len - 5; i < len - 1; i++) {
    const c = candles15m[i];
    if (c.close < c.open && c.low <= minLow * 1.002) {
      if (lastCandle.close > c.open && lastCandle.close > lastCandle.open) {
        return {
          type: 'BULLISH_CISD',
          breakoutPrice: c.open,
          baseCandleTime: c.time || 0,
          confirmed: true,
        };
      }
    }
  }

  // Bearish CISD: Candle merah terakhir menembus dan close di bawah open candle hijau yang memulai rally terakhir
  for (let i = len - 5; i < len - 1; i++) {
    const c = candles15m[i];
    if (c.close > c.open && c.high >= maxHigh * 0.998) {
      if (lastCandle.close < c.open && lastCandle.close < lastCandle.open) {
        return {
          type: 'BEARISH_CISD',
          breakoutPrice: c.open,
          baseCandleTime: c.time || 0,
          confirmed: true,
        };
      }
    }
  }

  return undefined;
}

/**
 * 8. Pemetaan Liquidity Trading Range (PDH, PDL, Asian High/Low, Premium/Discount)
 */
export function calculateLiquidityRange(candles: Candle[]): IctLiquidityRange {
  if (!candles || candles.length < 10) return {};
  const len = candles.length;
  const currentPrice = candles[len - 1].close;

  const dailySlice = candles.slice(Math.max(0, len - 24));
  const pdh = Math.max(...dailySlice.map((c) => c.high));
  const pdl = Math.min(...dailySlice.map((c) => c.low));
  const midpoint = (pdh + pdl) / 2;

  let pricePosition: 'PREMIUM' | 'DISCOUNT' | 'EQUILIBRIUM' = 'EQUILIBRIUM';
  const margin = (pdh - pdl) * 0.05;
  if (currentPrice > midpoint + margin) {
    pricePosition = 'PREMIUM';
  } else if (currentPrice < midpoint - margin) {
    pricePosition = 'DISCOUNT';
  }

  // Asian session: 07:00 - 14:00 WIB (00:00 - 07:00 UTC)
  let asianHigh: number | undefined;
  let asianLow: number | undefined;

  const asianCandles = candles.filter((c) => {
    if (!c.time) return false;
    const date = new Date(c.time);
    const utcHours = date.getUTCHours();
    const wibHours = (utcHours + 7) % 24;
    return wibHours >= 7 && wibHours < 14;
  });

  if (asianCandles.length > 0) {
    const recentAsian = asianCandles.slice(-16);
    asianHigh = Math.max(...recentAsian.map((c) => c.high));
    asianLow = Math.min(...recentAsian.map((c) => c.low));
  }

  return {
    pdh,
    pdl,
    midpoint,
    asianHigh,
    asianLow,
    pricePosition,
  };
}

/**
 * 9. Pengecekan Kill Zone Waktu Indonesia Barat (WIB)
 */
export function checkWibKillZone(timestampMs?: number): {
  inKillZone: boolean;
  killZoneName?: string;
  sessionName: 'ASIAN' | 'LONDON' | 'NEW_YORK' | 'OFF_HOURS';
} {
  const time = timestampMs || Date.now();
  const date = new Date(time);
  const utcMillis = time + date.getTimezoneOffset() * 60000;
  const wibTime = new Date(utcMillis + 3600000 * 7);
  const hours = wibTime.getHours();
  const minutes = wibTime.getMinutes();
  const timeDecimal = hours + minutes / 60;

  // Kill Zone Long: London Open 14:00 - 15:30 WIB
  const isLondonKillZone = timeDecimal >= 14.0 && timeDecimal <= 15.5;
  // Kill Zone Short: NY Open 20:30 - 22:00 WIB
  const isNyKillZone = timeDecimal >= 20.5 && timeDecimal <= 22.0;

  let sessionName: 'ASIAN' | 'LONDON' | 'NEW_YORK' | 'OFF_HOURS' = 'OFF_HOURS';
  if (timeDecimal >= 7.0 && timeDecimal < 14.0) {
    sessionName = 'ASIAN';
  } else if (timeDecimal >= 14.0 && timeDecimal < 20.5) {
    sessionName = 'LONDON';
  } else if (timeDecimal >= 20.5 || timeDecimal < 3.0) {
    sessionName = 'NEW_YORK';
  }

  if (isLondonKillZone) {
    return { inKillZone: true, killZoneName: 'London Kill Zone (14:00-15:30 WIB)', sessionName };
  }
  if (isNyKillZone) {
    return { inKillZone: true, killZoneName: 'New York Kill Zone (20:30-22:00 WIB)', sessionName };
  }

  return { inKillZone: false, sessionName };
}

/**
 * 10. Deteksi Smart Money Technique (SMT) Divergence Lintas Aset
 */
export function detectSmtDivergence(
  primaryCandles: Candle[],
  correlatedCandles: Candle[],
  primarySymbol: string = 'PRIMARY',
  correlatedSymbol: string = 'CORRELATED'
): SmtDivergenceResult | undefined {
  if (!primaryCandles || !correlatedCandles || primaryCandles.length < 10 || correlatedCandles.length < 10) {
    return undefined;
  }

  const pLen = primaryCandles.length;
  const cLen = correlatedCandles.length;

  const pCurr = primaryCandles[pLen - 1];
  const pPrevSlice = primaryCandles.slice(Math.max(0, pLen - 8), pLen - 2);
  const pMinLow = Math.min(...pPrevSlice.map((c) => c.low));
  const pMaxHigh = Math.max(...pPrevSlice.map((c) => c.high));

  const cCurr = correlatedCandles[cLen - 1];
  const cPrevSlice = correlatedCandles.slice(Math.max(0, cLen - 8), cLen - 2);
  const cMinLow = Math.min(...cPrevSlice.map((c) => c.low));
  const cMaxHigh = Math.max(...cPrevSlice.map((c) => c.high));

  // Bullish SMT: Primary menyapu low (Lower Low), Correlated menahan low (Higher Low)
  if (pCurr.low < pMinLow && cCurr.low >= cMinLow) {
    return {
      detected: true,
      type: 'BULLISH_SMT',
      primarySymbol,
      correlatedSymbol,
      rationale: `Bullish SMT Divergence: ${primarySymbol} membuat Lower Low (SSL Swept), namun ${correlatedSymbol} menolak turun (Higher Low). Konfirmasi akumulasi Smart Money.`,
    };
  }

  // Bearish SMT: Primary menyapu high (Higher High), Correlated menolak naik (Lower High)
  if (pCurr.high > pMaxHigh && cCurr.high <= cMaxHigh) {
    return {
      detected: true,
      type: 'BEARISH_SMT',
      primarySymbol,
      correlatedSymbol,
      rationale: `Bearish SMT Divergence: ${primarySymbol} membuat Higher High (BSL Swept), namun ${correlatedSymbol} gagal breakout (Lower High). Konfirmasi distribusi Smart Money.`,
    };
  }

  return undefined;
}

/**
 * 11. Deteksi Key Level Zone / Point of Interest (POI) — Filter Lokasi HTF (v2.1)
 *
 * Alur: Harga hanya dianggap "layak" untuk di-hunting jika berada di dalam atau
 * menyentuh satu dari zona-zona ini. Jika tidak, semua sinyal diabaikan (gate tertutup).
 *
 * Zona yang diidentifikasi (dari prioritas tertinggi ke terendah):
 * 1. HTF Demand / Supply Order Block (4H)
 * 2. HTF Bullish / Bearish Fair Value Gap (4H)
 * 3. Key Support / Resistance historis (swing low/high signifikan 4H)
 * 4. CRT Boundary — batas rendah/tinggi candle terbesar dalam 12 candle terakhir
 */
export function detectKeyLevelZone(
  candles4h: Candle[],
  currentPrice: number
): { zone: IctKeyLevelZone | undefined; isAtKeyLevel: boolean; gateOpen: boolean } {
  if (!candles4h || candles4h.length < 20) {
    return { zone: undefined, isAtKeyLevel: false, gateOpen: false };
  }

  const PROXIMITY_RADIUS = 0.008; // 0.8% toleransi "menyentuh" zona

  const candidates: IctKeyLevelZone[] = [];

  // ─── 1. HTF Demand / Supply Order Block ───────────────────────────────────
  const { demandZone, supplyZone } = findOrderBlocks(candles4h);

  if (demandZone) {
    const dist = Math.min(
      Math.abs(currentPrice - demandZone.zoneLow) / currentPrice,
      Math.abs(currentPrice - demandZone.zoneHigh) / currentPrice
    );
    const isInside = currentPrice >= demandZone.zoneLow && currentPrice <= demandZone.zoneHigh * 1.01;
    const isTouching = !isInside && dist <= PROXIMITY_RADIUS;
    candidates.push({
      type: 'HTF_DEMAND_OB' as IctPoiType,
      zoneLow: demandZone.zoneLow,
      zoneHigh: demandZone.zoneHigh,
      strength: demandZone.isVolumeValidated ? 'MAJOR' : 'MINOR',
      description: `HTF Demand OB 4H ($${demandZone.zoneLow.toFixed(4)} – $${demandZone.zoneHigh.toFixed(4)}) | VPA ${demandZone.volumeMultiplier}x`,
      distancePct: Number((dist * 100).toFixed(2)),
      isInsideZone: isInside,
      isTouching,
    });
  }

  if (supplyZone) {
    const dist = Math.min(
      Math.abs(currentPrice - supplyZone.zoneLow) / currentPrice,
      Math.abs(currentPrice - supplyZone.zoneHigh) / currentPrice
    );
    const isInside = currentPrice >= supplyZone.zoneLow * 0.99 && currentPrice <= supplyZone.zoneHigh;
    const isTouching = !isInside && dist <= PROXIMITY_RADIUS;
    candidates.push({
      type: 'HTF_SUPPLY_OB' as IctPoiType,
      zoneLow: supplyZone.zoneLow,
      zoneHigh: supplyZone.zoneHigh,
      strength: supplyZone.isVolumeValidated ? 'MAJOR' : 'MINOR',
      description: `HTF Supply OB 4H ($${supplyZone.zoneLow.toFixed(4)} – $${supplyZone.zoneHigh.toFixed(4)}) | VPA ${supplyZone.volumeMultiplier}x`,
      distancePct: Number((dist * 100).toFixed(2)),
      isInsideZone: isInside,
      isTouching,
    });
  }

  // ─── 2. HTF Fair Value Gap (Bullish / Bearish) ────────────────────────────
  const htfFvg = findFairValueGaps(candles4h);
  if (htfFvg && !htfFvg.isFilled) {
    const dist = Math.min(
      Math.abs(currentPrice - htfFvg.gapLow) / currentPrice,
      Math.abs(currentPrice - htfFvg.gapHigh) / currentPrice
    );
    const isInside = currentPrice >= htfFvg.gapLow && currentPrice <= htfFvg.gapHigh;
    const isTouching = !isInside && dist <= PROXIMITY_RADIUS;
    const poiType: IctPoiType = htfFvg.type === 'BULLISH_FVG' ? 'HTF_BULLISH_FVG' : 'HTF_BEARISH_FVG';
    candidates.push({
      type: poiType,
      zoneLow: htfFvg.gapLow,
      zoneHigh: htfFvg.gapHigh,
      strength: htfFvg.fillRatioPct < 20 ? 'MAJOR' : 'MINOR',
      description: `HTF ${htfFvg.type === 'BULLISH_FVG' ? 'Bullish' : 'Bearish'} FVG 4H ($${htfFvg.gapLow.toFixed(4)} – $${htfFvg.gapHigh.toFixed(4)}) | Terisi ${htfFvg.fillRatioPct}%`,
      distancePct: Number((dist * 100).toFixed(2)),
      isInsideZone: isInside,
      isTouching,
    });
  }

  // ─── 3. Key Support / Resistance Historis ─────────────────────────────────
  // Cari swing high/low dari 30–60 candle historis (hindari 5 candle terakhir)
  const lookback = candles4h.slice(Math.max(0, candles4h.length - 60), candles4h.length - 5);
  if (lookback.length >= 10) {
    const hisHigh = Math.max(...lookback.map((c) => c.high));
    const hisLow = Math.min(...lookback.map((c) => c.low));
    const ZONE_BUFFER = currentPrice * 0.003; // ±0.3% membentuk zona

    // Key Resistance
    if (Math.abs(currentPrice - hisHigh) / currentPrice <= PROXIMITY_RADIUS * 2) {
      const dist = Math.abs(currentPrice - hisHigh) / currentPrice;
      candidates.push({
        type: 'KEY_RESISTANCE' as IctPoiType,
        zoneLow: hisHigh - ZONE_BUFFER,
        zoneHigh: hisHigh + ZONE_BUFFER,
        strength: 'MINOR',
        description: `Key Resistance Historis 4H di $${hisHigh.toFixed(4)} (Swing High ${lookback.length} candle)`,
        distancePct: Number((dist * 100).toFixed(2)),
        isInsideZone: Math.abs(currentPrice - hisHigh) <= ZONE_BUFFER,
        isTouching: dist <= PROXIMITY_RADIUS,
      });
    }

    // Key Support
    if (Math.abs(currentPrice - hisLow) / currentPrice <= PROXIMITY_RADIUS * 2) {
      const dist = Math.abs(currentPrice - hisLow) / currentPrice;
      candidates.push({
        type: 'KEY_SUPPORT' as IctPoiType,
        zoneLow: hisLow - ZONE_BUFFER,
        zoneHigh: hisLow + ZONE_BUFFER,
        strength: 'MINOR',
        description: `Key Support Historis 4H di $${hisLow.toFixed(4)} (Swing Low ${lookback.length} candle)`,
        distancePct: Number((dist * 100).toFixed(2)),
        isInsideZone: Math.abs(currentPrice - hisLow) <= ZONE_BUFFER,
        isTouching: dist <= PROXIMITY_RADIUS,
      });
    }
  }

  // ─── 4. CRT Boundary ──────────────────────────────────────────────────────
  // Candle Range Theory: Batas tertinggi/terendah candle makro terbesar 12 candle terakhir
  const crtSlice = candles4h.slice(Math.max(0, candles4h.length - 12));
  if (crtSlice.length >= 6) {
    const crtHigh = Math.max(...crtSlice.map((c) => c.high));
    const crtLow = Math.min(...crtSlice.map((c) => c.low));
    const CRT_BUFFER = currentPrice * 0.002;

    if (Math.abs(currentPrice - crtHigh) / currentPrice <= PROXIMITY_RADIUS * 1.5) {
      const dist = Math.abs(currentPrice - crtHigh) / currentPrice;
      candidates.push({
        type: 'CRT_BOUNDARY_HIGH' as IctPoiType,
        zoneLow: crtHigh - CRT_BUFFER,
        zoneHigh: crtHigh + CRT_BUFFER,
        strength: 'MINOR',
        description: `CRT Boundary High ($${crtHigh.toFixed(4)}) — batas atas 12 candle makro`,
        distancePct: Number((dist * 100).toFixed(2)),
        isInsideZone: Math.abs(currentPrice - crtHigh) <= CRT_BUFFER,
        isTouching: dist <= PROXIMITY_RADIUS,
      });
    }

    if (Math.abs(currentPrice - crtLow) / currentPrice <= PROXIMITY_RADIUS * 1.5) {
      const dist = Math.abs(currentPrice - crtLow) / currentPrice;
      candidates.push({
        type: 'CRT_BOUNDARY_LOW' as IctPoiType,
        zoneLow: crtLow - CRT_BUFFER,
        zoneHigh: crtLow + CRT_BUFFER,
        strength: 'MINOR',
        description: `CRT Boundary Low ($${crtLow.toFixed(4)}) — batas bawah 12 candle makro`,
        distancePct: Number((dist * 100).toFixed(2)),
        isInsideZone: Math.abs(currentPrice - crtLow) <= CRT_BUFFER,
        isTouching: dist <= PROXIMITY_RADIUS,
      });
    }
  }

  // ─── Pilih Kandidat Terbaik ────────────────────────────────────────────────
  // Prioritas: isInsideZone > isTouching, kemudian MAJOR > MINOR, lalu distancePct terkecil
  const activeZones = candidates.filter((z) => z.isInsideZone || z.isTouching);
  if (activeZones.length === 0) {
    return { zone: undefined, isAtKeyLevel: false, gateOpen: false };
  }

  activeZones.sort((a, b) => {
    if (a.isInsideZone && !b.isInsideZone) return -1;
    if (!a.isInsideZone && b.isInsideZone) return 1;
    if (a.strength === 'MAJOR' && b.strength !== 'MAJOR') return -1;
    if (a.strength !== 'MAJOR' && b.strength === 'MAJOR') return 1;
    return a.distancePct - b.distancePct;
  });

  const best = activeZones[0];
  return {
    zone: best,
    isAtKeyLevel: true,
    gateOpen: best.isInsideZone || best.isTouching,
  };
}

/**
 * 12. Deteksi Break Inducement (IDM) — Jebakan Likuiditas Ritel (v2.2)
 * Inducement adalah swing point minor pertama yang sengaja dibentuk oleh Smart Money
 * untuk memancing stop loss ritel sebelum harga berbalik di Order Block (OB) yang sebenarnya.
 */
export function detectInducement(
  candles: Candle[],
  currentPrice: number,
  demandZone?: SmcOrderBlock,
  supplyZone?: SmcOrderBlock
): SmcInducement | undefined {
  if (!candles || candles.length < 15) return undefined;
  const len = candles.length;

  // 1. Bullish IDM: Swing low internal minor yang terbentuk sebelum harga masuk ke Bullish OB
  if (demandZone) {
    for (let i = len - 4; i >= Math.max(2, len - 16); i--) {
      const cur = candles[i];
      const prev = candles[i - 1];
      const next = candles[i + 1];
      const isInternalLow = cur.low <= prev.low && cur.low <= next.low;

      if (isInternalLow && cur.low > demandZone.zoneLow) {
        const idmLevel = cur.low;
        let isSwept = false;
        let sweepTime = cur.time || 0;
        for (let j = i + 1; j < len; j++) {
          if (candles[j].low < idmLevel) {
            isSwept = true;
            sweepTime = candles[j].time || 0;
            break;
          }
        }

        if (isSwept) {
          return {
            level: idmLevel,
            status: 'SWEPT',
            type: 'BULLISH_IDM',
            sweepCandleTime: sweepTime,
            description: `Break Inducement (IDM Swept di $${idmLevel.toFixed(4)}): Stop loss ritel tersapu, harga bersiap memantul di Bullish OB`,
          };
        } else {
          return {
            level: idmLevel,
            status: 'UNSWEPT',
            type: 'BULLISH_IDM',
            description: `Inducement Terbentuk di $${idmLevel.toFixed(4)}: Tunggu IDM disapu sebelum ambil Bullish OB`,
          };
        }
      }
    }
  }

  // 2. Bearish IDM: Swing high internal minor yang terbentuk sebelum harga masuk ke Supply OB
  if (supplyZone) {
    for (let i = len - 4; i >= Math.max(2, len - 16); i--) {
      const cur = candles[i];
      const prev = candles[i - 1];
      const next = candles[i + 1];
      const isInternalHigh = cur.high >= prev.high && cur.high >= next.high;

      if (isInternalHigh && cur.high < supplyZone.zoneHigh) {
        const idmLevel = cur.high;
        let isSwept = false;
        let sweepTime = cur.time || 0;
        for (let j = i + 1; j < len; j++) {
          if (candles[j].high > idmLevel) {
            isSwept = true;
            sweepTime = candles[j].time || 0;
            break;
          }
        }

        if (isSwept) {
          return {
            level: idmLevel,
            status: 'SWEPT',
            type: 'BEARISH_IDM',
            sweepCandleTime: sweepTime,
            description: `Break Inducement (IDM Swept di $${idmLevel.toFixed(4)}): Likuiditas buyer ritel tersapu, siap drop dari Supply OB`,
          };
        } else {
          return {
            level: idmLevel,
            status: 'UNSWEPT',
            type: 'BEARISH_IDM',
            description: `Inducement Terbentuk di $${idmLevel.toFixed(4)}: Tunggu IDM disapu sebelum short di Supply OB`,
          };
        }
      }
    }
  }

  return undefined;
}

/**
 * 13. Deteksi SnR Flip (Resistance Becomes Support / Support Becomes Resistance) — v2.2
 * Mendeteksi level batas swing historis yang telah di-breakout dan kini diuji ulang,
 * terutama jika beririsan/konfluens dengan Order Block.
 */
export function detectSnrFlip(
  candles: Candle[],
  demandZone?: SmcOrderBlock,
  supplyZone?: SmcOrderBlock
): SmcSnrFlip | undefined {
  if (!candles || candles.length < 20) return undefined;
  const len = candles.length;
  const currentPrice = candles[len - 1].close;

  // 1. RBS (Resistance Becomes Support - Bullish)
  const priorSlice = candles.slice(Math.max(0, len - 40), len - 6);
  if (priorSlice.length >= 8) {
    const swingHigh = Math.max(...priorSlice.map((c) => c.high));
    const subsequentSlice = candles.slice(len - 6, len);
    const hasBrokenAbove = Math.max(...subsequentSlice.map((c) => c.high)) > swingHigh * 1.008;

    if (hasBrokenAbove) {
      const distPct = Math.abs(currentPrice - swingHigh) / currentPrice;
      if (distPct <= 0.02) {
        const isConfluent = demandZone
          ? swingHigh >= demandZone.zoneLow * 0.985 && swingHigh <= demandZone.zoneHigh * 1.015
          : false;

        return {
          level: swingHigh,
          type: 'RBS',
          isConfluentWithOb: isConfluent,
          confluencePrice: isConfluent && demandZone ? (demandZone.zoneHigh + demandZone.zoneLow) / 2 : swingHigh,
          description: `SnR Flip (RBS) di $${swingHigh.toFixed(4)}: Resistensi lama menjadi Support baru${isConfluent ? ' (Konfluens Kuat dengan Bullish OB!)' : ''}`,
        };
      }
    }
  }

  // 2. SBR (Support Becomes Resistance - Bearish)
  if (priorSlice.length >= 8) {
    const swingLow = Math.min(...priorSlice.map((c) => c.low));
    const subsequentSlice = candles.slice(len - 6, len);
    const hasBrokenBelow = Math.min(...subsequentSlice.map((c) => c.low)) < swingLow * 0.992;

    if (hasBrokenBelow) {
      const distPct = Math.abs(currentPrice - swingLow) / currentPrice;
      if (distPct <= 0.02) {
        const isConfluent = supplyZone
          ? swingLow >= supplyZone.zoneLow * 0.985 && swingLow <= supplyZone.zoneHigh * 1.015
          : false;

        return {
          level: swingLow,
          type: 'SBR',
          isConfluentWithOb: isConfluent,
          confluencePrice: isConfluent && supplyZone ? (supplyZone.zoneHigh + supplyZone.zoneLow) / 2 : swingLow,
          description: `SnR Flip (SBR) di $${swingLow.toFixed(4)}: Support lama menjadi Resistensi baru${isConfluent ? ' (Konfluens Kuat dengan Supply OB!)' : ''}`,
        };
      }
    }
  }

  return undefined;
}

/**
 * 14. Deteksi Trendline Breakout / Breakdown & Retest Zone (v2.2)
 * Meniru analisis DASH: mendeteksi garis tren naik/turun yang tertembus
 * dan menghitung harga retest yang ideal untuk entry sniper.
 */
export function detectTrendlineBreak(
  candles: Candle[],
  currentPrice: number
): SmcTrendlineBreak | undefined {
  if (!candles || candles.length < 18) return undefined;
  const count = candles.length;

  const swingLows: Array<{ idx: number; price: number }> = [];
  const swingHighs: Array<{ idx: number; price: number }> = [];

  for (let i = 2; i < count - 2; i++) {
    const cur = candles[i];
    if (cur.low <= candles[i - 1].low && cur.low <= candles[i + 1].low) {
      swingLows.push({ idx: i, price: cur.low });
    }
    if (cur.high >= candles[i - 1].high && cur.high >= candles[i + 1].high) {
      swingHighs.push({ idx: i, price: cur.high });
    }
  }

  // 1. Cek Uptrend Line Breakdown (Kasus Short DASH)
  if (swingLows.length >= 2) {
    const p1 = swingLows[0];
    const p2 = swingLows[swingLows.length - 1];
    if (p2.idx > p1.idx && p2.price > p1.price) {
      const slope = (p2.price - p1.price) / (p2.idx - p1.idx);
      const projectedPrice = p1.price + slope * (count - 1 - p1.idx);

      if (currentPrice < projectedPrice * 0.996) {
        const retestTarget = projectedPrice * 0.998;
        const isRetesting = Math.abs(currentPrice - retestTarget) / currentPrice <= 0.008;

        return {
          detected: true,
          trendType: 'UPTREND',
          breakDirection: 'BREAKDOWN',
          startPrice: p1.price,
          breakPrice: projectedPrice,
          retestTargetPrice: retestTarget,
          status: isRetesting ? 'RETESTING' : 'PENDING_RETEST',
          description: `Trendline Breakdown: Garis tren naik tertembus ke bawah. Retest target di $${retestTarget.toFixed(4)} (${isRetesting ? 'Sedang Re-test' : 'Menunggu Re-test'})`,
        };
      }
    }
  }

  // 2. Cek Downtrend Line Breakout (Kasus Long)
  if (swingHighs.length >= 2) {
    const p1 = swingHighs[0];
    const p2 = swingHighs[swingHighs.length - 1];
    if (p2.idx > p1.idx && p2.price < p1.price) {
      const slope = (p2.price - p1.price) / (p2.idx - p1.idx);
      const projectedPrice = p1.price + slope * (count - 1 - p1.idx);

      if (currentPrice > projectedPrice * 1.004) {
        const retestTarget = projectedPrice * 1.002;
        const isRetesting = Math.abs(currentPrice - retestTarget) / currentPrice <= 0.008;

        return {
          detected: true,
          trendType: 'DOWNTREND',
          breakDirection: 'BREAKOUT',
          startPrice: p1.price,
          breakPrice: projectedPrice,
          retestTargetPrice: retestTarget,
          status: isRetesting ? 'RETESTING' : 'PENDING_RETEST',
          description: `Trendline Breakout: Garis tren turun tertembus ke atas. Retest target di $${retestTarget.toFixed(4)} (${isRetesting ? 'Sedang Re-test' : 'Menunggu Re-test'})`,
        };
      }
    }
  }

  return undefined;
}

/**
 * 15. Deteksi Volume Exhaustion (Pelemahan Volume saat Mendekati Level Kritis) — v2.2
 * Meniru catatan trader: "bullish volumenya makin lama makin rendah, resis ga bisa ditembus".
 */
export function detectVolumeExhaustion(candles: Candle[]): SmcVolumeExhaustion | undefined {
  if (!candles || candles.length < 12) return undefined;
  const recent = candles.slice(-12);
  const mid = 6;
  const firstHalf = recent.slice(0, mid);
  const secondHalf = recent.slice(mid);

  const avgVolFirst = firstHalf.reduce((sum, c) => sum + (c.volume || 0), 0) / mid;
  const avgVolSecond = secondHalf.reduce((sum, c) => sum + (c.volume || 0), 0) / mid;

  if (avgVolFirst <= 0 || avgVolSecond <= 0) return undefined;

  const decayPct = ((avgVolFirst - avgVolSecond) / avgVolFirst) * 100;

  const priceStart = firstHalf[0].close;
  const priceEnd = secondHalf[secondHalf.length - 1].close;
  const priceChangePct = ((priceEnd - priceStart) / priceStart) * 100;

  // Bullish Volume Exhaustion: Harga naik tetapi volume menurun drastis >= 25%
  if (priceChangePct > 0.8 && decayPct >= 25) {
    return {
      detected: true,
      type: 'BULLISH_EXHAUSTION',
      volumeDecayPct: Number(decayPct.toFixed(1)),
      description: `Bullish Volume Exhaustion (-${decayPct.toFixed(1)}%): Buyer kehilangan daya dorong saat mendekati resistensi. Waspada reversal/short!`,
    };
  }

  // Bearish Volume Exhaustion: Harga turun tetapi volume jual mengering >= 25%
  if (priceChangePct < -0.8 && decayPct >= 25) {
    return {
      detected: true,
      type: 'BEARISH_EXHAUSTION',
      volumeDecayPct: Number(decayPct.toFixed(1)),
      description: `Bearish Volume Exhaustion (-${decayPct.toFixed(1)}%): Tekanan jual mengering saat mendekati demand. Waspada pantulan bullish!`,
    };
  }

  return undefined;
}

/**
 * 16. FUNGSI UTAMA: Run SMC & ICT Analysis Multi-Timeframe (v2.2 — Sniper & Chart R:R Adaptation)
 * Menggabungkan ATR Filter, POI Gate, Sweep, IFVG, CISD, SMT, Inducement, SnR Flip, Trendline Breakdown, Volume Exhaustion.
 */
export function runSmcAnalysis(
  symbol: string,
  candles4h: Candle[],
  candles15m: Candle[],
  correlatedCandles15m?: Candle[],
  correlatedSymbol?: string
): SmcAnalysisResult {
  const currentPrice =
    candles15m && candles15m.length > 0
      ? candles15m[candles15m.length - 1].close
      : candles4h[candles4h.length - 1]?.close || 1;

  // Step 0: POI / Key Level Gate — Filter Lokasi HTF (v2.1)
  const poiResult = detectKeyLevelZone(candles4h, currentPrice);
  const isAtKeyLevel = poiResult.isAtKeyLevel;
  const keyLevelGateOpen = poiResult.gateOpen;

  // Step 1: ATR Filter (Anti-Sideways)
  const atrResult = calculateAtr(candles15m, 14);

  // Step 2: Deteksi Order Block 4H
  const { demandZone, supplyZone } = findOrderBlocks(candles4h);

  // Step 3: Deteksi FVG & Inversion FVG
  const recentFvg = findFairValueGaps(candles4h);
  if (demandZone && recentFvg && recentFvg.type === 'BULLISH_FVG') {
    demandZone.isFvgPresent = true;
  }
  const ifvg = detectInversionFvg(candles15m);

  // Step 4: Deteksi Liquidity Sweep & Range
  const recentSweep = detectLiquiditySweep(candles4h);
  const liquidityRange = calculateLiquidityRange(candles4h.length >= 15 ? candles4h : candles15m);

  // Step 5: Deteksi Konfirmasi MTF 15m (MSS, CISD, dan Candlestick Trigger)
  const mtfTrigger = detectMtfMssAndTrigger(candles15m, demandZone);
  const cisd = detectCisd(candles15m);

  // Step 6: Evaluasi Kill Zone Sesi WIB
  const killZoneInfo = checkWibKillZone();

  // Step 7: Evaluasi SMT Divergence
  const smtDivergence =
    correlatedCandles15m && correlatedSymbol
      ? detectSmtDivergence(candles15m, correlatedCandles15m, symbol, correlatedSymbol)
      : undefined;

  // Step 8: Deteksi Adaptasi Sniper (IDM, SnR Flip, Trendline Breakdown, Volume Exhaustion) — v2.2
  const inducement = detectInducement(candles4h.length >= 15 ? candles4h : candles15m, currentPrice, demandZone, supplyZone);
  const snrFlip = detectSnrFlip(candles4h.length >= 20 ? candles4h : candles15m, demandZone, supplyZone);
  const trendlineBreak = detectTrendlineBreak(candles4h.length >= 18 ? candles4h : candles15m, currentPrice);
  const volumeExhaustion = detectVolumeExhaustion(candles4h.length >= 12 ? candles4h : candles15m);

  // Step 9: Tentukan Entry Model Trigger Utama
  let entryModelTrigger: 'IFVG' | 'CISD' | 'MSS' | undefined;
  if (mtfTrigger.mssConfirmed) {
    entryModelTrigger = 'MSS';
  } else if (cisd?.confirmed) {
    entryModelTrigger = 'CISD';
  } else if (ifvg && ifvg.status === 'ACTIVE') {
    entryModelTrigger = 'IFVG';
  }

  // Step 10: Kalkulasi Skor & Bias SMC Berjenjang
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

  // --- BONUS TAMBAHAN ICT & SMC v2.0 ---
  if (killZoneInfo.inKillZone) {
    smcScore += 5;
    rationaleParts.push(`🎯 Aktif di ${killZoneInfo.killZoneName}`);
  }

  if (ifvg && ifvg.status === 'ACTIVE') {
    smcScore += 10;
    rationaleParts.push(`Inversion FVG (${ifvg.type === 'BULLISH_IFVG' ? 'Bullish' : 'Bearish'} IFVG di $${ifvg.inversionPrice.toFixed(4)})`);
  }

  if (cisd?.confirmed) {
    smcScore += 15;
    rationaleParts.push(`CISD Terkonfirmasi (${cisd.type === 'BULLISH_CISD' ? 'Bullish' : 'Bearish'} Breakout)`);
  }

  if (smtDivergence?.detected) {
    smcScore += 15;
    rationaleParts.push(`⚡ SMT Divergence vs ${smtDivergence.correlatedSymbol} (${smtDivergence.type})`);
  }

  if (liquidityRange.pricePosition === 'DISCOUNT' && smcBias === 'BULLISH') {
    smcScore += 5;
    rationaleParts.push(`Zona Diskon (Di bawah Midpoint Range)`);
  } else if (liquidityRange.pricePosition === 'PREMIUM' && smcBias === 'BEARISH') {
    smcScore += 5;
    rationaleParts.push(`Zona Premium (Di atas Midpoint Range)`);
  }

  // --- BONUS ADAPTASI SNIPER v2.2 (IDM, SnR Flip, Trendline Breakdown, Volume Exhaustion) ---
  if (inducement) {
    if (inducement.status === 'SWEPT') {
      smcScore += 15;
      rationaleParts.push(`🎯 ${inducement.description}`);
    } else {
      rationaleParts.push(`⏳ ${inducement.description}`);
    }
  }

  if (snrFlip) {
    smcScore += snrFlip.isConfluentWithOb ? 20 : 10;
    rationaleParts.push(`🔄 ${snrFlip.description}`);
  }

  if (trendlineBreak && trendlineBreak.detected) {
    smcScore += 15;
    if (trendlineBreak.breakDirection === 'BREAKDOWN') {
      if (smcBias === 'NEUTRAL') smcBias = 'BEARISH';
    } else if (trendlineBreak.breakDirection === 'BREAKOUT') {
      if (smcBias === 'NEUTRAL') smcBias = 'BULLISH';
    }
    rationaleParts.push(`📐 ${trendlineBreak.description}`);
  }

  if (volumeExhaustion && volumeExhaustion.detected) {
    smcScore += 10;
    if (volumeExhaustion.type === 'BULLISH_EXHAUSTION' && smcBias !== 'BULLISH') {
      smcBias = 'BEARISH';
    } else if (volumeExhaustion.type === 'BEARISH_EXHAUSTION' && smcBias !== 'BEARISH') {
      smcBias = 'BULLISH';
    }
    rationaleParts.push(`📉 ${volumeExhaustion.description}`);
  }

  // Evaluasi Smart Pending Limit Setup (Kondisi seperti CRV & DASH di mana harga masih di tengah)
  let isPendingLimitSetup = false;
  let pendingLimitPrice: number | undefined;
  let pendingLimitAdvice: string | undefined;

  if (demandZone && currentPrice > demandZone.zoneHigh * 1.003) {
    isPendingLimitSetup = true;
    pendingLimitPrice = demandZone.zoneHigh;
    const distPct = ((currentPrice - pendingLimitPrice) / currentPrice) * 100;
    pendingLimitAdvice = `Harga masih mengambang di atas ($${currentPrice.toFixed(4)}). Pasang Buy Limit di Area Demand / Bullish OB ($${pendingLimitPrice.toFixed(4)}, jarak -${distPct.toFixed(1)}%). Tunggu jemputan, jangan FOMO!`;
  } else if (supplyZone && currentPrice < supplyZone.zoneLow * 0.997) {
    isPendingLimitSetup = true;
    pendingLimitPrice = supplyZone.zoneLow;
    const distPct = ((pendingLimitPrice - currentPrice) / currentPrice) * 100;
    pendingLimitAdvice = `Harga masih mengambang di bawah ($${currentPrice.toFixed(4)}). Pasang Sell Limit di Area Supply / Bearish OB ($${pendingLimitPrice.toFixed(4)}, jarak +${distPct.toFixed(1)}%). Tunggu retest!`;
  } else if (trendlineBreak && trendlineBreak.breakDirection === 'BREAKDOWN' && trendlineBreak.status === 'PENDING_RETEST') {
    isPendingLimitSetup = true;
    pendingLimitPrice = trendlineBreak.retestTargetPrice;
    const distPct = ((pendingLimitPrice - currentPrice) / currentPrice) * 100;
    pendingLimitAdvice = `Trendline breakdown! Harga masih di tengah. Pasang Sell Limit di area Retest Trendline ($${pendingLimitPrice.toFixed(4)}, jarak +${distPct.toFixed(1)}%).`;
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
    // Ekstensi ICT v2.0
    ifvg,
    cisd,
    liquidityRange,
    smtDivergence,
    entryModelTrigger,
    killZoneActive: killZoneInfo.inKillZone,
    killZoneName: killZoneInfo.killZoneName,
    // Ekstensi ICT v2.1 — POI Gate
    keyLevelZone: poiResult.zone,
    isAtKeyLevel,
    keyLevelGateOpen,
    // Sniper Adaptations v2.2
    inducement,
    snrFlip,
    trendlineBreak,
    volumeExhaustion,
    isPendingLimitSetup,
    pendingLimitPrice,
    pendingLimitAdvice,
  };
}

