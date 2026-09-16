/**
 * Engine Kalkulasi Estimasi Liquidation Heatmap & Cluster Pools
 * Binance Futures USDT-M
 * 
 * Model deterministik kuantitatif berbasis:
 * - Swing pivot klines (Highs/Lows)
 * - Open Interest agregat Binance
 * - Maintenance Margin Ratio (MMR) berjenjang Binance
 * - Estimasi distribusi leverage (10x, 25x, 50x, 100x)
 */

export interface LiquidationCluster {
  price: number;
  type: 'LONG_LIQ' | 'SHORT_LIQ';
  estimatedVolUsd: number;
  leverageTier: '100x' | '50x' | '25x' | '10x';
  distancePct: number; // Jarak % dari current mark price
  densityRank: number; // 0 s.d. 100 (intensitas warna heatmap)
  isSweepTarget: boolean; // Magnet target utama smart money
}

export interface LiquidationAnalysisResult {
  symbol: string;
  currentPrice: number;
  openInterestUsd: number;
  totalLongLiquidationUsd: number;
  totalShortLiquidationUsd: number;
  longShortLiqRatio: number; // >1 = lebih banyak long yang terancam terlikuidasi
  squeezeRisk: 'EXTREME_SHORT_SQUEEZE' | 'HIGH_SHORT_SQUEEZE' | 'BALANCED' | 'HIGH_LONG_CASCADE' | 'EXTREME_LONG_CASCADE';
  liquidityMagnet: {
    targetPrice: number;
    type: 'SHORT_SQUEEZE_POOL' | 'LONG_DUMP_POOL';
    estimatedVolumeUsd: number;
    distancePct: number;
    description: string;
  };
  sweepStatus: {
    isRecentSweep: boolean;
    sweepType: 'SWEPT_LONG_LIQUIDITY' | 'SWEPT_SHORT_LIQUIDITY' | 'NONE';
    sweptLevelPrice?: number;
    actionableBias: 'BULLISH_REVERSAL_CONFIRMED' | 'BEARISH_REVERSAL_CONFIRMED' | 'NEUTRAL';
    note: string;
  };
  clusters: LiquidationCluster[];
  priceBuckets: {
    minPrice: number;
    maxPrice: number;
    avgPrice: number;
    type: 'LONG_LIQ' | 'SHORT_LIQ';
    totalVolUsd: number;
    intensity: number; // 0 - 100%
    dominantLeverage: string;
  }[];
}

interface CandleInput {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Maintenance margin ratio aproksimasi Binance USDT-M per tier leverage
 */
const MMR_BY_LEVERAGE: Record<number, number> = {
  100: 0.005, // 0.5% MMR
  50: 0.010,  // 1.0% MMR
  25: 0.020,  // 2.0% MMR
  10: 0.040,  // 4.0% MMR
};

/**
 * Estimasi bobot proporsi leverage trader retail di Binance
 * 100x & 50x cenderung punya frekuensi tinggi di degen tokens, tapi volume relatif terdistribusi
 */
const LEVERAGE_WEIGHTS: Record<number, number> = {
  100: 0.15, // 15% dari total posisi
  50: 0.25,  // 25%
  25: 0.35,  // 35%
  10: 0.25,  // 25%
};

/**
 * Kalkulasi liquidation price teoritis Binance
 * Long Liq: Entry * (1 - 1/leverage + MMR)
 * Short Liq: Entry * (1 + 1/leverage - MMR)
 */
export function calcLongLiquidationPrice(entry: number, leverage: number): number {
  const mmr = MMR_BY_LEVERAGE[leverage] || 0.01;
  const factor = 1 - (1 / leverage) + mmr;
  return entry * Math.max(0.0001, factor);
}

export function calcShortLiquidationPrice(entry: number, leverage: number): number {
  const mmr = MMR_BY_LEVERAGE[leverage] || 0.01;
  const factor = 1 + (1 / leverage) - mmr;
  return entry * factor;
}

/**
 * Temukan titik-titik swing high dan swing low lokal dari candles
 */
function findPivotPoints(candles: CandleInput[], leftBars = 3, rightBars = 3) {
  const highs: { index: number; price: number; volume: number }[] = [];
  const lows: { index: number; price: number; volume: number }[] = [];

  for (let i = leftBars; i < candles.length - rightBars; i++) {
    const currentHigh = candles[i].high;
    const currentLow = candles[i].low;

    let isHigh = true;
    let isLow = true;

    for (let j = i - leftBars; j <= i + rightBars; j++) {
      if (j === i) continue;
      if (candles[j].high >= currentHigh) isHigh = false;
      if (candles[j].low <= currentLow) isLow = false;
    }

    if (isHigh) {
      highs.push({ index: i, price: currentHigh, volume: candles[i].volume });
    }
    if (isLow) {
      lows.push({ index: i, price: currentLow, volume: candles[i].volume });
    }
  }

  return { highs, lows };
}

/**
 * Format angka harga agar rapi untuk koin mahal (BTC) maupun koin meme (PEPE/SHIB)
 */
export function formatLiqPrice(price: number): string {
  if (!price || isNaN(price)) return '0.00';
  if (price >= 1000) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (price >= 1) {
    return price.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 4 });
  }
  if (price >= 0.01) {
    return price.toFixed(4);
  }
  if (price >= 0.0001) {
    return price.toFixed(6);
  }
  return price.toFixed(8);
}

/**
 * Format angka USD volume (misal: $2.45M, $450K)
 */
export function formatUsdVolume(val: number): string {
  if (val >= 1_000_000_000) return `$${(val / 1_000_000_000).toFixed(2)}B`;
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(1)}K`;
  return `$${val.toFixed(0)}`;
}

/**
 * FUNGSI UTAMA: Analisis Liquidation Heatmap & Cluster Pools
 */
export function analyzeLiquidationClusters(params: {
  symbol: string;
  currentPrice: number;
  openInterestUsd: number;
  volume24hUsd: number;
  candles: CandleInput[];
}): LiquidationAnalysisResult {
  const { symbol, currentPrice, openInterestUsd, candles } = params;

  // Fallback jika candles kosong
  if (!candles || candles.length < 10) {
    return createSimulatedClusters(symbol, currentPrice, openInterestUsd);
  }

  const { highs, lows } = findPivotPoints(candles, 2, 2);

  // Jika pivot terlalu sedikit, sertakan recent candle extremes
  const recentHigh = Math.max(...candles.map((c) => c.high));
  const recentLow = Math.min(...candles.map((c) => c.low));

  const allHighs = highs.length > 0 ? highs.map((h) => h.price) : [recentHigh, currentPrice * 1.02];
  const allLows = lows.length > 0 ? lows.map((l) => l.price) : [recentLow, currentPrice * 0.98];

  // Base pool estimasi likuidasi adalah ~20-35% dari Open Interest total
  const estimatedActiveLeveragedOi = Math.max(openInterestUsd * 0.3, 1_000_000);

  const rawClusters: LiquidationCluster[] = [];

  const leverageTiers: Array<100 | 50 | 25 | 10> = [100, 50, 25, 10];

  // 1. Hitung LONG LIQUIDATION: Trader yang buka Long di sekitar Pivot High/Low saat breakout atau support
  allHighs.concat(allLows).forEach((entryPrice) => {
    leverageTiers.forEach((lev) => {
      const liqPrice = calcLongLiquidationPrice(entryPrice, lev);
      // Hanya masukkan jika likuidasi berada DI BAWAH harga saat ini
      if (liqPrice < currentPrice) {
        const distPct = ((currentPrice - liqPrice) / currentPrice) * 100;
        // Batasi rentang estimasi realistis hingga 16% di bawah harga
        if (distPct <= 16 && distPct >= 0.15) {
          const tierWeight = LEVERAGE_WEIGHTS[lev] || 0.25;
          // Vol estimasi dipengaruhi kedekatan dengan pivot
          const vol = (estimatedActiveLeveragedOi * tierWeight * 0.12) / Math.max(1, Math.sqrt(distPct));
          rawClusters.push({
            price: liqPrice,
            type: 'LONG_LIQ',
            estimatedVolUsd: vol,
            leverageTier: `${lev}x`,
            distancePct: -distPct,
            densityRank: 0,
            isSweepTarget: false,
          });
        }
      }
    });
  });

  // 2. Hitung SHORT LIQUIDATION: Trader yang buka Short di resistensi atau breakdown fakeout
  allLows.concat(allHighs).forEach((entryPrice) => {
    leverageTiers.forEach((lev) => {
      const liqPrice = calcShortLiquidationPrice(entryPrice, lev);
      // Hanya masukkan jika likuidasi berada DI ATAS harga saat ini
      if (liqPrice > currentPrice) {
        const distPct = ((liqPrice - currentPrice) / currentPrice) * 100;
        // Batasi rentang estimasi realistis hingga 16% di atas harga
        if (distPct <= 16 && distPct >= 0.15) {
          const tierWeight = LEVERAGE_WEIGHTS[lev] || 0.25;
          const vol = (estimatedActiveLeveragedOi * tierWeight * 0.12) / Math.max(1, Math.sqrt(distPct));
          rawClusters.push({
            price: liqPrice,
            type: 'SHORT_LIQ',
            estimatedVolUsd: vol,
            leverageTier: `${lev}x`,
            distancePct: distPct,
            densityRank: 0,
            isSweepTarget: false,
          });
        }
      }
    });
  });

  // Urutkan dan normalisasi densitas
  const maxVol = rawClusters.length > 0 ? Math.max(...rawClusters.map((c) => c.estimatedVolUsd)) : 1;
  rawClusters.forEach((c) => {
    c.densityRank = Math.min(100, Math.round((c.estimatedVolUsd / maxVol) * 100));
  });

  // 3. Kelompokkan ke dalam Price Buckets (Histogram Rentang Harga)
  const priceRangePct = 0.012; // Tiap bucket ~1.2% rentang harga
  const bucketsMap = new Map<string, {
    minPrice: number;
    maxPrice: number;
    sumVol: number;
    type: 'LONG_LIQ' | 'SHORT_LIQ';
    levCount: Record<string, number>;
  }>();

  rawClusters.forEach((c) => {
    // Tentukan bucket key berbasis pembulatan logis
    const bucketIndex = Math.floor(Math.log(c.price / currentPrice) / priceRangePct);
    const key = `${c.type}_${bucketIndex}`;

    const existing = bucketsMap.get(key);
    if (existing) {
      existing.minPrice = Math.min(existing.minPrice, c.price);
      existing.maxPrice = Math.max(existing.maxPrice, c.price);
      existing.sumVol += c.estimatedVolUsd;
      existing.levCount[c.leverageTier] = (existing.levCount[c.leverageTier] || 0) + 1;
    } else {
      bucketsMap.set(key, {
        minPrice: c.price,
        maxPrice: c.price,
        sumVol: c.estimatedVolUsd,
        type: c.type,
        levCount: { [c.leverageTier]: 1 },
      });
    }
  });

  const rawBuckets = Array.from(bucketsMap.values()).map((b) => {
    let dominantLev = '50x';
    let maxCount = 0;
    Object.entries(b.levCount).forEach(([lev, cnt]) => {
      if (cnt > maxCount) {
        maxCount = cnt;
        dominantLev = lev;
      }
    });

    return {
      minPrice: b.minPrice,
      maxPrice: b.maxPrice,
      avgPrice: (b.minPrice + b.maxPrice) / 2,
      type: b.type,
      totalVolUsd: b.sumVol,
      intensity: 0,
      dominantLeverage: dominantLev,
    };
  });

  // Urutkan bucket dari harga tertinggi ke terendah
  rawBuckets.sort((a, b) => b.avgPrice - a.avgPrice);

  const maxBucketVol = rawBuckets.length > 0 ? Math.max(...rawBuckets.map((b) => b.totalVolUsd)) : 1;
  rawBuckets.forEach((b) => {
    b.intensity = Math.min(100, Math.max(12, Math.round((b.totalVolUsd / maxBucketVol) * 100)));
  });

  // Hitung total pool
  const totalLongLiqUsd = rawClusters
    .filter((c) => c.type === 'LONG_LIQ')
    .reduce((acc, c) => acc + c.estimatedVolUsd, 0);

  const totalShortLiqUsd = rawClusters
    .filter((c) => c.type === 'SHORT_LIQ')
    .reduce((acc, c) => acc + c.estimatedVolUsd, 0);

  const longShortRatio = totalShortLiqUsd > 0 ? totalLongLiqUsd / totalShortLiqUsd : 1.0;

  // Tentukan Squeeze Risk
  let squeezeRisk: LiquidationAnalysisResult['squeezeRisk'] = 'BALANCED';
  if (longShortRatio >= 2.2) {
    squeezeRisk = 'EXTREME_LONG_CASCADE';
  } else if (longShortRatio >= 1.4) {
    squeezeRisk = 'HIGH_LONG_CASCADE';
  } else if (longShortRatio <= 0.45) {
    squeezeRisk = 'EXTREME_SHORT_SQUEEZE';
  } else if (longShortRatio <= 0.7) {
    squeezeRisk = 'HIGH_SHORT_SQUEEZE';
  }

  // Cari Liquidity Magnet Zone (Zona dengan densitas gravitasi tertinggi)
  const shortBuckets = rawBuckets.filter((b) => b.type === 'SHORT_LIQ');
  const longBuckets = rawBuckets.filter((b) => b.type === 'LONG_LIQ');

  const topShortMagnet = shortBuckets.reduce((best, cur) => cur.totalVolUsd > (best?.totalVolUsd || 0) ? cur : best, shortBuckets[0]);
  const topLongMagnet = longBuckets.reduce((best, cur) => cur.totalVolUsd > (best?.totalVolUsd || 0) ? cur : best, longBuckets[0]);

  let magnet: {
    targetPrice: number;
    type: 'SHORT_SQUEEZE_POOL' | 'LONG_DUMP_POOL';
    estimatedVolumeUsd: number;
    distancePct: number;
    description: string;
  } = {
    targetPrice: currentPrice * 1.03,
    type: 'SHORT_SQUEEZE_POOL',
    estimatedVolumeUsd: totalShortLiqUsd * 0.4,
    distancePct: 3.0,
    description: 'Pool likuidasi short sellers terkonsentrasi di atas resistensi terdekat.',
  };

  if (topShortMagnet && (!topLongMagnet || topShortMagnet.totalVolUsd >= topLongMagnet.totalVolUsd)) {
    const dist = ((topShortMagnet.avgPrice - currentPrice) / currentPrice) * 100;
    magnet = {
      targetPrice: topShortMagnet.avgPrice,
      type: 'SHORT_SQUEEZE_POOL',
      estimatedVolumeUsd: topShortMagnet.totalVolUsd,
      distancePct: dist,
      description: `Magnet Short Squeeze utama di $${formatLiqPrice(topShortMagnet.avgPrice)} (+${dist.toFixed(1)}%). Smart money berpotensi menyapu likuidasi ini sebelum berbalik.`,
    };
  } else if (topLongMagnet) {
    const dist = ((currentPrice - topLongMagnet.avgPrice) / currentPrice) * 100;
    magnet = {
      targetPrice: topLongMagnet.avgPrice,
      type: 'LONG_DUMP_POOL',
      estimatedVolumeUsd: topLongMagnet.totalVolUsd,
      distancePct: -dist,
      description: `Magnet Long Dump utama di $${formatLiqPrice(topLongMagnet.avgPrice)} (-${dist.toFixed(1)}%). Potensi flush out stop loss buyer di level ini sebelum bounce.`,
    };
  }

  // Tandai cluster terdekat dengan magnet
  rawClusters.forEach((c) => {
    if (Math.abs(c.price - magnet.targetPrice) / magnet.targetPrice < 0.01) {
      c.isSweepTarget = true;
    }
  });

  // Deteksi Recent Sweep
  const latestCandle = candles[candles.length - 1];
  let isRecentSweep = false;
  let sweepType: LiquidationAnalysisResult['sweepStatus']['sweepType'] = 'NONE';
  let actionableBias: LiquidationAnalysisResult['sweepStatus']['actionableBias'] = 'NEUTRAL';
  let note = 'Belum ada sapuan likuidasi signifikan pada candle terakhir.';

  // Periksa apakah wick bawah candle terakhir menembus recent low lalu close di atasnya (Bullish Liquidity Sweep)
  if (latestCandle.low < recentLow && latestCandle.close > recentLow) {
    isRecentSweep = true;
    sweepType = 'SWEPT_LONG_LIQUIDITY';
    actionableBias = 'BULLISH_REVERSAL_CONFIRMED';
    note = `⚡ Bullish Turtle Soup Sweep: Ekor lilin menyapu support $${formatLiqPrice(recentLow)} untuk memicu likuidasi Long, namun ditutup kembali di atas level kunci. Setup Reversal Long!`;
  } else if (latestCandle.high > recentHigh && latestCandle.close < recentHigh) {
    isRecentSweep = true;
    sweepType = 'SWEPT_SHORT_LIQUIDITY';
    actionableBias = 'BEARISH_REVERSAL_CONFIRMED';
    note = `⚡ Bearish Liquidity Grab: Ekor lilin menyapu resistensi $${formatLiqPrice(recentHigh)} untuk memicu likuidasi Short, lalu dibanting kembali ke bawah. Setup Reversal Short!`;
  }

  return {
    symbol,
    currentPrice,
    openInterestUsd,
    totalLongLiquidationUsd: totalLongLiqUsd,
    totalShortLiquidationUsd: totalShortLiqUsd,
    longShortLiqRatio: parseFloat(longShortRatio.toFixed(2)),
    squeezeRisk,
    liquidityMagnet: magnet,
    sweepStatus: {
      isRecentSweep,
      sweepType,
      sweptLevelPrice: sweepType === 'SWEPT_LONG_LIQUIDITY' ? recentLow : sweepType === 'SWEPT_SHORT_LIQUIDITY' ? recentHigh : undefined,
      actionableBias,
      note,
    },
    clusters: rawClusters.slice(0, 40),
    priceBuckets: rawBuckets.slice(0, 16),
  };
}

/**
 * Fallback jika data historis lilin belum dimuat
 */
function createSimulatedClusters(symbol: string, currentPrice: number, oiUsd: number): LiquidationAnalysisResult {
  const baseOi = oiUsd > 0 ? oiUsd : 50_000_000;
  const tiers: Array<100 | 50 | 25 | 10> = [100, 50, 25, 10];
  const clusters: LiquidationCluster[] = [];

  tiers.forEach((lev) => {
    // Long below
    const longPrice = calcLongLiquidationPrice(currentPrice * 1.01, lev);
    clusters.push({
      price: longPrice,
      type: 'LONG_LIQ',
      estimatedVolUsd: baseOi * 0.08,
      leverageTier: `${lev}x`,
      distancePct: ((currentPrice - longPrice) / currentPrice) * -100,
      densityRank: lev === 50 ? 95 : 70,
      isSweepTarget: lev === 50,
    });

    // Short above
    const shortPrice = calcShortLiquidationPrice(currentPrice * 0.99, lev);
    clusters.push({
      price: shortPrice,
      type: 'SHORT_LIQ',
      estimatedVolUsd: baseOi * 0.1,
      leverageTier: `${lev}x`,
      distancePct: ((shortPrice - currentPrice) / currentPrice) * 100,
      densityRank: lev === 50 ? 90 : 65,
      isSweepTarget: false,
    });
  });

  const target = currentPrice * 1.025;

  return {
    symbol,
    currentPrice,
    openInterestUsd: baseOi,
    totalLongLiquidationUsd: baseOi * 0.28,
    totalShortLiquidationUsd: baseOi * 0.35,
    longShortLiqRatio: 0.8,
    squeezeRisk: 'HIGH_SHORT_SQUEEZE',
    liquidityMagnet: {
      targetPrice: target,
      type: 'SHORT_SQUEEZE_POOL',
      estimatedVolumeUsd: baseOi * 0.15,
      distancePct: 2.5,
      description: `Pool likuidasi short sellers terkonsentrasi di $${formatLiqPrice(target)} (+2.5%).`,
    },
    sweepStatus: {
      isRecentSweep: false,
      sweepType: 'NONE',
      actionableBias: 'NEUTRAL',
      note: 'Menggunakan model cluster estimasi probabilitas.',
    },
    clusters,
    priceBuckets: [
      {
        minPrice: currentPrice * 1.02,
        maxPrice: currentPrice * 1.035,
        avgPrice: currentPrice * 1.028,
        type: 'SHORT_LIQ',
        totalVolUsd: baseOi * 0.18,
        intensity: 88,
        dominantLeverage: '50x',
      },
      {
        minPrice: currentPrice * 0.97,
        maxPrice: currentPrice * 0.985,
        avgPrice: currentPrice * 0.978,
        type: 'LONG_LIQ',
        totalVolUsd: baseOi * 0.14,
        intensity: 72,
        dominantLeverage: '50x',
      },
    ],
  };
}
