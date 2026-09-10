/**
 * Engine Deteksi Pola Candlestick Deterministik Elit
 * Diadopsi langsung dari "The Ultimate Candlestick Patterns PDF - 50 Best Candlestick Patterns in Trading" (WR Trading).
 * 
 * Mendeteksi formasi 1-lilin, 2-lilin, 3-lilin, dan multi-lilin lengkap dengan:
 * - Anatomi matematis rasio body, wick atas, wick bawah, dan gap
 * - Penentuan bias (BULLISH / BEARISH / NEUTRAL)
 * - Tipe sinyal (REVERSAL / CONTINUATION / INDECISION)
 * - Persentase akurasi historis (Winrate % dari data riset buku)
 * - Rekomendasi Stop Loss berdasarkan struktur wick
 * - Ulasan psikologi pasar dalam Bahasa Indonesia
 */

import { CandlestickPatternResult } from '../types/futures';

export interface Candle {
  time?: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface CandleMetrics {
  body: number;           // |close - open|
  range: number;          // high - low
  upperShadow: number;    // high - max(open, close)
  lowerShadow: number;    // min(open, close) - low
  isGreen: boolean;       // close >= open
  isRed: boolean;         // close < open
  bodyPct: number;        // body / range
  upperShadowPct: number; // upperShadow / range
  lowerShadowPct: number; // lowerShadow / range
  midpoint: number;       // (open + close) / 2
}

export function getCandleMetrics(c: Candle): CandleMetrics {
  const range = Math.max(c.high - c.low, 0.00000001);
  const body = Math.abs(c.close - c.open);
  const upperShadow = c.high - Math.max(c.open, c.close);
  const lowerShadow = Math.min(c.open, c.close) - c.low;
  const isGreen = c.close >= c.open;
  const isRed = c.close < c.open;
  const bodyPct = body / range;
  const upperShadowPct = upperShadow / range;
  const lowerShadowPct = lowerShadow / range;
  const midpoint = (c.open + c.close) / 2;

  return {
    body,
    range,
    upperShadow,
    lowerShadow,
    isGreen,
    isRed,
    bodyPct,
    upperShadowPct,
    lowerShadowPct,
    midpoint,
  };
}

/**
 * Konversi raw array klines Binance [time, open, high, low, close, volume] menjadi Candle[]
 */
export function parseKlinesToCandles(rawKlines: number[][]): Candle[] {
  return rawKlines.map((k) => ({
    time: k[0],
    open: k[1],
    high: k[2],
    low: k[3],
    close: k[4],
    volume: k[5],
  }));
}

/**
 * Mendeteksi tren lokal sebelum candle target (apakah UPTREND, DOWNTREND, atau SIDEWAYS)
 */
function detectPriorTrend(candles: Candle[], targetIdx: number, lookback: number = 8): 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS' {
  if (targetIdx < 3) return 'SIDEWAYS';
  const startIdx = Math.max(0, targetIdx - lookback);
  const startClose = candles[startIdx].close;
  const endClose = candles[targetIdx - 1].close;
  const pctChange = ((endClose - startClose) / startClose) * 100;

  if (pctChange >= 1.2) return 'UPTREND';
  if (pctChange <= -1.2) return 'DOWNTREND';
  return 'SIDEWAYS';
}

/**
 * FUNGSI UTAMA: Pindai seluruh pola candlestick pada candle-candle terakhir
 * Mengembalikan pola terkuat yang paling relevan untuk konfluensi trading futures.
 */
export function detectCandlestickPatterns(candles: Candle[]): CandlestickPatternResult | null {
  if (!candles || candles.length < 5) return null;

  const n = candles.length;
  const c0 = candles[n - 1]; // Candle terkini / baru close
  const c1 = candles[n - 2]; // Candle 1 bar lalu
  const c2 = candles[n - 3]; // Candle 2 bar lalu
  const c3 = candles[n - 4]; // Candle 3 bar lalu
  const c4 = candles[n - 5]; // Candle 4 bar lalu

  const m0 = getCandleMetrics(c0);
  const m1 = getCandleMetrics(c1);
  const m2 = getCandleMetrics(c2);
  const m3 = getCandleMetrics(c3);
  const m4 = getCandleMetrics(c4);

  const priorTrend = detectPriorTrend(candles, n - 1);

  // =========================================================================
  // 1. MULTI-CANDLE PATTERNS (4 - 5 CANDLES) - TIER ELIT
  // =========================================================================

  // [1.1] Bullish Mat Hold (Pola No. 10 - Winrate 67-78%)
  // C4: Green panjang, C3-C1: 3 red kecil konsolidasi di rentang C4, C0: Green breakout
  if (
    m4.isGreen && m4.bodyPct >= 0.55 &&
    m3.isRed && m2.isRed &&
    c3.low >= c4.low && c2.low >= c4.low && c1.low >= c4.low &&
    m0.isGreen && c0.close > c4.high
  ) {
    return {
      id: 'bullish_mat_hold',
      name: 'Bullish Mat Hold',
      direction: 'LONG',
      bias: 'BULLISH',
      type: 'CONTINUATION',
      reliability: 75,
      strength: 'ULTRA',
      description: 'Pola kelanjutan tren naik super kuat. 3 candle koreksi kecil tertahan di dalam tubuh candle bullish awal, disusul breakout penembusan resistance baru.',
      confirmationRule: 'Candle ke-5 ditutup di atas rekor high candle pertama dengan lonjakan volume.',
      stopLossPrice: Math.min(c3.low, c2.low, c1.low) * 0.998,
      candlesInvolved: 5,
    };
  }

  // [1.2] Rising Three Methods (Pola No. 22 - Winrate 74%)
  if (
    m4.isGreen && m4.bodyPct >= 0.50 &&
    m3.isRed && m2.isRed && m1.isRed &&
    c3.low >= c4.low && c1.low >= c4.low &&
    m0.isGreen && c0.close > c4.high
  ) {
    return {
      id: 'rising_three_methods',
      name: 'Rising Three Methods',
      direction: 'LONG',
      bias: 'BULLISH',
      type: 'CONTINUATION',
      reliability: 74,
      strength: 'ULTRA',
      description: 'Konsolidasi sejenak sebelum uptrend dominan berlanjut. Koreksi 3 candle gagal menembus batas bawah candle bull pertama.',
      confirmationRule: 'Candle breakout hijau ditutup melampaui level tertinggi candle pertama.',
      stopLossPrice: c4.low * 0.997,
      candlesInvolved: 5,
    };
  }

  // [1.3] Falling Three Methods (Pola No. 23 - Winrate 72%)
  if (
    m4.isRed && m4.bodyPct >= 0.50 &&
    m3.isGreen && m2.isGreen && m1.isGreen &&
    c3.high <= c4.high && c1.high <= c4.high &&
    m0.isRed && c0.close < c4.low
  ) {
    return {
      id: 'falling_three_methods',
      name: 'Falling Three Methods',
      direction: 'SHORT',
      bias: 'BEARISH',
      type: 'CONTINUATION',
      reliability: 72,
      strength: 'ULTRA',
      description: 'Pola kelanjutan downtrend. Rebound 3 candle hijau kecil merupakan koreksi semu yang segera dihancurkan oleh candle breakdown merah.',
      confirmationRule: 'Candle penutup merah menembus batas terendah candle merah pertama.',
      stopLossPrice: c4.high * 1.003,
      candlesInvolved: 5,
    };
  }

  // [1.4] Ladder Bottom (Pola No. 38 - Winrate 56-72%)
  // C4, C3, C2: Merah berturut-turut lower lows, C1: Doji/spinning indecision, C0: Green kuat breakout > C1 high
  if (
    m4.isRed && m3.isRed && m2.isRed &&
    c3.low < c4.low && c2.low < c3.low &&
    m1.bodyPct <= 0.35 &&
    m0.isGreen && c0.close > c1.high
  ) {
    return {
      id: 'ladder_bottom',
      name: 'Ladder Bottom',
      direction: 'LONG',
      bias: 'BULLISH',
      type: 'REVERSAL',
      reliability: 68,
      strength: 'HIGH',
      description: 'Pelemahan tekanan jual secara bertahap setelah 3 red candle berturut-turut, diakhiri lilin keraguan dan pembalikan hijau agresif.',
      confirmationRule: 'Candle ke-5 ditutup di atas titik tertinggi candle ke-4.',
      stopLossPrice: c1.low * 0.997,
      candlesInvolved: 5,
    };
  }

  // [1.5] Ladder Top (Pola No. 39 - Winrate 55-70%)
  // C4, C3, C2: Hijau berturut-turut higher highs, C1: Indecision, C0: Red kuat breakdown < C1 low
  if (
    m4.isGreen && m3.isGreen && m2.isGreen &&
    c3.high > c4.high && c2.high > c3.high &&
    m1.bodyPct <= 0.35 &&
    m0.isRed && c0.close < c1.low
  ) {
    return {
      id: 'ladder_top',
      name: 'Ladder Top',
      direction: 'SHORT',
      bias: 'BEARISH',
      type: 'REVERSAL',
      reliability: 65,
      strength: 'HIGH',
      description: 'Pembeli kehabisan amunisi di puncak tren naik. Terjadi lilin keraguan sebelum aksi jual masif memicu pembalikan arah.',
      confirmationRule: 'Candle ke-5 ditutup di bawah titik terendah candle ke-4.',
      stopLossPrice: c1.high * 1.003,
      candlesInvolved: 5,
    };
  }

  // [1.6] Three Line Strike - Bullish (Pola No. 45 - Winrate 70-80%)
  // C3, C2, C1: 3 green candle naik, C0: Red raksasa menelan ketiganya, namun momentum tren utama tetap naik jika candle berikutnya rebound
  if (
    m3.isGreen && m2.isGreen && m1.isGreen &&
    c2.close > c3.close && c1.close > c2.close &&
    m0.isRed && c0.open >= c1.close && c0.close <= c3.open
  ) {
    return {
      id: 'three_line_strike_bull',
      name: 'Three Line Strike (Bullish)',
      direction: 'LONG',
      bias: 'BULLISH',
      type: 'CONTINUATION',
      reliability: 72,
      strength: 'HIGH',
      description: 'Pola flush likuiditas kilat. Satu candle merah menelan 3 candle hijau sebelumnya untuk menjemput order likuiditas sebelum tren naik utama melesat.',
      confirmationRule: 'Tunggu candle berikutnya kembali ditutup hijau mengonfirmasi kelanjutan reli.',
      stopLossPrice: c0.low * 0.996,
      candlesInvolved: 4,
    };
  }

  // [1.7] Three Line Strike - Bearish (Pola No. 45 - Winrate 68-78%)
  if (
    m3.isRed && m2.isRed && m1.isRed &&
    c2.close < c3.close && c1.close < c2.close &&
    m0.isGreen && c0.open <= c1.close && c0.close >= c3.open
  ) {
    return {
      id: 'three_line_strike_bear',
      name: 'Three Line Strike (Bearish)',
      direction: 'SHORT',
      bias: 'BEARISH',
      type: 'CONTINUATION',
      reliability: 70,
      strength: 'HIGH',
      description: 'Pola squeeze short seller sementara sebelum tren turun besar berlanjut menekan harga.',
      confirmationRule: 'Tunggu candle berikutnya kembali ditutup merah mengonfirmasi kelanjutan penurunan.',
      stopLossPrice: c0.high * 1.004,
      candlesInvolved: 4,
    };
  }

  // =========================================================================
  // 2. THREE-CANDLE PATTERNS (3 CANDLES) - TIER AKURASI TINGGI
  // =========================================================================

  // [2.1] Identical Three Crows (Pola No. 50 - Winrate Up to 79%)
  if (
    m2.isRed && m1.isRed && m0.isRed &&
    m2.bodyPct >= 0.55 && m1.bodyPct >= 0.55 && m0.bodyPct >= 0.55 &&
    Math.abs(c1.open - c2.close) / c2.close < 0.002 &&
    Math.abs(c0.open - c1.close) / c1.close < 0.002 &&
    c1.close < c2.close && c0.close < c1.close
  ) {
    return {
      id: 'identical_three_crows',
      name: 'Identical Three Crows',
      direction: 'SHORT',
      bias: 'BEARISH',
      type: 'REVERSAL',
      reliability: 79,
      strength: 'ULTRA',
      description: 'Tiga candle merah pejal berturut-turut yang masing-masing dibuka persis di level close sebelumnya. Tekanan jual institusional tanpa jeda pantulan.',
      confirmationRule: 'Volume penjualan meningkat di setiap candle tanpa wick bawah yang signifikan.',
      stopLossPrice: c2.high * 1.004,
      candlesInvolved: 3,
    };
  }

  // [2.2] Three Black Crows (Pola No. 21 - Winrate 78%)
  if (
    m2.isRed && m1.isRed && m0.isRed &&
    m2.bodyPct >= 0.50 && m1.bodyPct >= 0.50 && m0.bodyPct >= 0.50 &&
    c1.close < c2.close && c0.close < c1.close &&
    c1.open <= c2.open && c1.open >= c2.close &&
    c0.open <= c1.open && c0.open >= c1.close
  ) {
    return {
      id: 'three_black_crows',
      name: 'Three Black Crows',
      direction: 'SHORT',
      bias: 'BEARISH',
      type: 'REVERSAL',
      reliability: 78,
      strength: 'ULTRA',
      description: 'Pembalikan arah bearish dominan. Tiga lilin merah solid berturut-turut menandai pergantian kontrol penuh dari pembeli ke penjual.',
      confirmationRule: 'Ketiga candle memiliki shadow bawah yang sangat minim menandakan penutupan di harga terendah.',
      stopLossPrice: c2.high * 1.004,
      candlesInvolved: 3,
    };
  }

  // [2.3] Three White Soldiers (Pola kebalikan Three Black Crows - Winrate ~78%)
  if (
    m2.isGreen && m1.isGreen && m0.isGreen &&
    m2.bodyPct >= 0.50 && m1.bodyPct >= 0.50 && m0.bodyPct >= 0.50 &&
    c1.close > c2.close && c0.close > c1.close &&
    c1.open >= c2.open && c1.open <= c2.close &&
    c0.open >= c1.open && c0.open <= c1.close
  ) {
    return {
      id: 'three_white_soldiers',
      name: 'Three White Soldiers',
      direction: 'LONG',
      bias: 'BULLISH',
      type: 'REVERSAL',
      reliability: 78,
      strength: 'ULTRA',
      description: 'Tiga prajurit putih perkasa. Tiga lilin hijau solid berturut-turut menembus resistance dengan dominasi mutlak buyer.',
      confirmationRule: 'Setiap candle dibuka di dalam body candle sebelumnya dan ditutup di dekat harga tertinggi.',
      stopLossPrice: c2.low * 0.996,
      candlesInvolved: 3,
    };
  }

  // [2.4] Morning Star (Pola No. 4 - Winrate 52-75%)
  // C2: Red panjang, C1: Small body (bisa doji/star), C0: Green kuat ditutup di atas 50% body C2
  if (
    m2.isRed && m2.bodyPct >= 0.45 &&
    m1.bodyPct <= 0.35 &&
    m0.isGreen && c0.close >= m2.midpoint
  ) {
    const isAbandonedBaby = Math.max(c1.high, c1.close) < Math.min(c2.low, c0.low);
    return {
      id: isAbandonedBaby ? 'abandoned_baby_bullish' : 'morning_star',
      name: isAbandonedBaby ? 'Bullish Abandoned Baby' : 'Morning Star',
      direction: 'LONG',
      bias: 'BULLISH',
      type: 'REVERSAL',
      reliability: isAbandonedBaby ? 77 : 75,
      strength: 'ULTRA',
      description: isAbandonedBaby
        ? 'Pola pembalikan ultra langka! Lilin doji terisolasi sempurna oleh gap harga di kedua sisi, menandakan penolakan dasar mutlak.'
        : 'Formasi bintang pagi legendaris. Tekanan jual terhenti di candle kedua, lalu dibalas dorongan beli agresif melampaui 50% candle pertama.',
      confirmationRule: 'Candle ke-3 ditutup kuat di atas garis tengah (50%) candle merah pertama.',
      stopLossPrice: Math.min(c2.low, c1.low, c0.low) * 0.997,
      candlesInvolved: 3,
    };
  }

  // [2.5] Evening Star (Pola No. 5 - Winrate 55-68%)
  // C2: Green panjang, C1: Small body (bisa doji/star) di puncak, C0: Red kuat ditutup di bawah 50% body C2
  if (
    m2.isGreen && m2.bodyPct >= 0.45 &&
    m1.bodyPct <= 0.35 &&
    m0.isRed && c0.close <= m2.midpoint
  ) {
    const isAbandonedBaby = Math.min(c1.low, c1.close) > Math.max(c2.high, c0.high);
    return {
      id: isAbandonedBaby ? 'abandoned_baby_bearish' : 'evening_star',
      name: isAbandonedBaby ? 'Bearish Abandoned Baby' : 'Evening Star',
      direction: 'SHORT',
      bias: 'BEARISH',
      type: 'REVERSAL',
      reliability: isAbandonedBaby ? 77 : 68,
      strength: 'ULTRA',
      description: isAbandonedBaby
        ? 'Pola pembalikan puncak langka! Lilin doji menggantung dengan gap terpisah, sinyal aksi distribusi puncak selesai.'
        : 'Formasi bintang senja. Momentum bullish terhenti di puncak, disusul kejatuhan candle merah menembus ke bawah 50% candle hijau pertama.',
      confirmationRule: 'Candle ke-3 ditutup di bawah garis tengah (50%) candle hijau pertama.',
      stopLossPrice: Math.max(c2.high, c1.high, c0.high) * 1.003,
      candlesInvolved: 3,
    };
  }

  // [2.6] Three Outside Up (Pola No. 17 - Winrate ~70%)
  // C2: Red, C1: Bullish Engulfing C2, C0: Green confirms close > C1 high
  if (
    m2.isRed && m1.isGreen &&
    c1.open <= c2.close && c1.close >= c2.open &&
    m0.isGreen && c0.close > c1.high
  ) {
    return {
      id: 'three_outside_up',
      name: 'Three Outside Up',
      direction: 'LONG',
      bias: 'BULLISH',
      type: 'REVERSAL',
      reliability: 70,
      strength: 'HIGH',
      description: 'Pola Bullish Engulfing yang disempurnakan dengan candle konfirmasi ke-3 yang ditutup menembus rekor harga lilin engulfing.',
      confirmationRule: 'Candle ke-3 ditutup lebih tinggi dari candle engulfing ke-2.',
      stopLossPrice: c1.low * 0.997,
      candlesInvolved: 3,
    };
  }

  // [2.7] Three Outside Down (Pola No. 17 - Winrate ~70%)
  // C2: Green, C1: Bearish Engulfing C2, C0: Red confirms close < C1 low
  if (
    m2.isGreen && m1.isRed &&
    c1.open >= c2.close && c1.close <= c2.open &&
    m0.isRed && c0.close < c1.low
  ) {
    return {
      id: 'three_outside_down',
      name: 'Three Outside Down',
      direction: 'SHORT',
      bias: 'BEARISH',
      type: 'REVERSAL',
      reliability: 70,
      strength: 'HIGH',
      description: 'Pola Bearish Engulfing yang diperkuat candle merah ke-3 yang menembus ke bawah support candle engulfing.',
      confirmationRule: 'Candle ke-3 ditutup lebih rendah dari candle engulfing ke-2.',
      stopLossPrice: c1.high * 1.003,
      candlesInvolved: 3,
    };
  }

  // [2.8] Three Inside Up (Pola No. 18 - Winrate 64-70%)
  // C2: Red besar, C1: Green Harami di dalam C2, C0: Green ditutup di atas C2 high
  if (
    m2.isRed && m2.bodyPct >= 0.45 &&
    m1.isGreen && c1.open >= c2.close && c1.close <= c2.open &&
    m0.isGreen && c0.close > c2.high
  ) {
    return {
      id: 'three_inside_up',
      name: 'Three Inside Up',
      direction: 'LONG',
      bias: 'BULLISH',
      type: 'REVERSAL',
      reliability: 70,
      strength: 'HIGH',
      description: 'Pola Bullish Harami yang disahkan oleh candle ke-3 yang mampu menembus breakout batas tertinggi candle pertama.',
      confirmationRule: 'Candle ke-3 ditutup di atas batas high candle pertama.',
      stopLossPrice: c1.low * 0.997,
      candlesInvolved: 3,
    };
  }

  // [2.9] Three Inside Down (Pola No. 18 - Winrate ~60%)
  // C2: Green besar, C1: Red Harami di dalam C2, C0: Red ditutup di bawah C2 low
  if (
    m2.isGreen && m2.bodyPct >= 0.45 &&
    m1.isRed && c1.open <= c2.close && c1.close >= c2.open &&
    m0.isRed && c0.close < c2.low
  ) {
    return {
      id: 'three_inside_down',
      name: 'Three Inside Down',
      direction: 'SHORT',
      bias: 'BEARISH',
      type: 'REVERSAL',
      reliability: 60,
      strength: 'HIGH',
      description: 'Pola Bearish Harami terkonfirmasi breakdown. Penjual menembus batas support candle hijau utama.',
      confirmationRule: 'Candle ke-3 ditutup di bawah batas low candle pertama.',
      stopLossPrice: c1.high * 1.003,
      candlesInvolved: 3,
    };
  }

  // [2.10] Bullish Stick Sandwich (Pola No. 44 - Winrate 62-67%)
  // C2: Red, C1: Green, C0: Red yang ditutup persis di harga penutupan C2 (support ganda)
  if (
    m2.isRed && m1.isGreen && m0.isRed &&
    Math.abs(c0.close - c2.close) / c2.close < 0.0015
  ) {
    return {
      id: 'stick_sandwich',
      name: 'Bullish Stick Sandwich',
      direction: 'LONG',
      bias: 'BULLISH',
      type: 'REVERSAL',
      reliability: 67,
      strength: 'HIGH',
      description: 'Dua lilin merah mengapit lilin hijau dengan harga close identik. Kegagalan menembus harga lebih rendah membuktikan lantai support kokoh.',
      confirmationRule: 'Level penutupan kedua candle merah sama persis, siap untuk pantulan teknikal.',
      stopLossPrice: Math.min(c2.low, c0.low) * 0.997,
      candlesInvolved: 3,
    };
  }

  // [2.11] Tri Star Bullish / Bearish (Pola No. 12 - Winrate 50-60%)
  // Tiga doji berurutan
  if (m2.bodyPct <= 0.10 && m1.bodyPct <= 0.10 && m0.bodyPct <= 0.10) {
    const isBull = priorTrend === 'DOWNTREND';
    return {
      id: isBull ? 'tri_star_bullish' : 'tri_star_bearish',
      name: isBull ? 'Bullish Tri Star' : 'Bearish Tri Star',
      direction: isBull ? 'LONG' : 'SHORT',
      bias: isBull ? 'BULLISH' : 'BEARISH',
      type: 'REVERSAL',
      reliability: 60,
      strength: 'MODERATE',
      description: 'Pola langka berupa 3 lilin doji berturut-turut yang mencerminkan kebuntuan ekstrem antara buyer dan seller, siap meledak ke arah pembalikan.',
      confirmationRule: 'Tunggu satu candle ber-body besar yang melesat ke arah yang dituju.',
      stopLossPrice: isBull ? Math.min(c2.low, c1.low, c0.low) * 0.997 : Math.max(c2.high, c1.high, c0.high) * 1.003,
      candlesInvolved: 3,
    };
  }

  // [2.12] Advanced Block / Deliberation (Pola No. 48 & 49 - Winrate 36-55%)
  // 3 green candle naik, tapi body C0 mengecil drastis dengan upper wick panjang
  if (
    m2.isGreen && m1.isGreen && m0.isGreen &&
    c1.close > c2.close && c0.close > c1.close &&
    m0.body < m1.body * 0.6 &&
    m0.upperShadowPct >= 0.35
  ) {
    return {
      id: 'advanced_block',
      name: 'Advanced Block / Deliberation',
      direction: 'SHORT',
      bias: 'BEARISH',
      type: 'REVERSAL',
      reliability: 55,
      strength: 'MODERATE',
      description: 'Pelemahan momentum pembeli di pucuk. Walaupun membuat higher high, candle ke-3 mengecil dengan wick atas panjang (exhaustion).',
      confirmationRule: 'Waspada rejection, konfirmasi dengan candle merah berikutnya.',
      stopLossPrice: c0.high * 1.003,
      candlesInvolved: 3,
    };
  }

  // =========================================================================
  // 3. TWO-CANDLE PATTERNS (2 CANDLES)
  // =========================================================================

  // [3.1] Bullish Kicker (Pola No. 16 - Winrate 60-70%)
  // C1: Red, C0: Green yang open gapping di atas C1 open
  if (m1.isRed && m0.isGreen && c0.open >= c1.open) {
    return {
      id: 'bullish_kicker',
      name: 'Bullish Kicker',
      direction: 'LONG',
      bias: 'BULLISH',
      type: 'REVERSAL',
      reliability: 70,
      strength: 'ULTRA',
      description: 'Sentimen pasar berubah 180 derajat seketika! Candle hijau dibuka dengan gap melompati pembukaan candle merah sebelumnya.',
      confirmationRule: 'Gap harga tetap terbuka tanpa terisi kembali.',
      stopLossPrice: c0.low * 0.996,
      candlesInvolved: 2,
    };
  }

  // [3.2] Bearish Kicker (Pola No. 16 - Winrate 54-60%)
  if (m1.isGreen && m0.isRed && c0.open <= c1.open) {
    return {
      id: 'bearish_kicker',
      name: 'Bearish Kicker',
      direction: 'SHORT',
      bias: 'BEARISH',
      type: 'REVERSAL',
      reliability: 60,
      strength: 'ULTRA',
      description: 'Penurunan mendadak akibat sentimen negatif ekstrem. Candle merah dibuka anjlok di bawah pembukaan candle hijau sebelumnya.',
      confirmationRule: 'Gap penurunan dipertahankan tanpa pullback.',
      stopLossPrice: c0.high * 1.004,
      candlesInvolved: 2,
    };
  }

  // [3.3] Bullish Engulfing (Pola No. 3 - Winrate 63-67%)
  if (m1.isRed && m0.isGreen && c0.open <= c1.close && c0.close >= c1.open && m0.body > m1.body) {
    return {
      id: 'bullish_engulfing',
      name: 'Bullish Engulfing',
      direction: 'LONG',
      bias: 'BULLISH',
      type: 'REVERSAL',
      reliability: 67,
      strength: 'HIGH',
      description: 'Tubuh candle hijau membungkus seluruh tubuh candle merah sebelumnya. Menunjukkan peralihan dominasi agresif dari seller ke buyer.',
      confirmationRule: 'Volume pada candle engulfing hijau lebih tinggi dari candle merah sebelumnya.',
      stopLossPrice: Math.min(c1.low, c0.low) * 0.997,
      candlesInvolved: 2,
    };
  }

  // [3.4] Bearish Engulfing (Pola No. 3 kebalikan - Winrate 63-67%)
  if (m1.isGreen && m0.isRed && c0.open >= c1.close && c0.close <= c1.open && m0.body > m1.body) {
    return {
      id: 'bearish_engulfing',
      name: 'Bearish Engulfing',
      direction: 'SHORT',
      bias: 'BEARISH',
      type: 'REVERSAL',
      reliability: 67,
      strength: 'HIGH',
      description: 'Tubuh candle merah menelan habis tubuh candle hijau sebelumnya di pucuk tren, sinyal likuidasi buyer oleh tekanan jual mendadak.',
      confirmationRule: 'Candle merah ditutup di dekat low dengan volume jual tinggi.',
      stopLossPrice: Math.max(c1.high, c0.high) * 1.003,
      candlesInvolved: 2,
    };
  }

  // [3.5] Piercing Line (Pola No. 19 - Winrate 64%)
  // C1: Red, C0: Green opens below C1 low/close and closes above 50% of C1 body (tetapi < C1 open)
  if (
    m1.isRed && m1.bodyPct >= 0.45 &&
    m0.isGreen && c0.open <= c1.close &&
    c0.close > m1.midpoint && c0.close < c1.open
  ) {
    return {
      id: 'piercing_line',
      name: 'Piercing Line',
      direction: 'LONG',
      bias: 'BULLISH',
      type: 'REVERSAL',
      reliability: 64,
      strength: 'HIGH',
      description: 'Pembalikan bullish tajam. Setelah dibuka di bawah level terendah sebelumnya, buyer menyerbu masuk dan menutup harga di atas 50% tubuh candle merah.',
      confirmationRule: 'Candle hijau menusuk lebih dari setengah badan candle merah sebelumnya.',
      stopLossPrice: c0.low * 0.997,
      candlesInvolved: 2,
    };
  }

  // [3.6] Dark Cloud Cover (Pola No. 20 - Winrate ~60%)
  // C1: Green, C0: Red opens above C1 high/close and closes below 50% of C1 body
  if (
    m1.isGreen && m1.bodyPct >= 0.45 &&
    m0.isRed && c0.open >= c1.close &&
    c0.close < m1.midpoint && c0.close > c1.open
  ) {
    return {
      id: 'dark_cloud_cover',
      name: 'Dark Cloud Cover',
      direction: 'SHORT',
      bias: 'BEARISH',
      type: 'REVERSAL',
      reliability: 60,
      strength: 'HIGH',
      description: 'Awan gelap menyelimuti tren naik. Harga sempat dibuka lebih tinggi namun ditarik jatuh hingga menutup di bawah 50% badan lilin hijau.',
      confirmationRule: 'Penutupan menembus ke bawah garis tengah candle hijau.',
      stopLossPrice: c0.high * 1.003,
      candlesInvolved: 2,
    };
  }

  // [3.7] Separating Lines - Bullish (Pola No. 32 - Winrate 78.1%)
  // C1: Red, C0: Green yang open persis di level open C1 dan melaju naik
  if (
    m1.isRed && m0.isGreen &&
    Math.abs(c0.open - c1.open) / c1.open < 0.0015 &&
    m0.bodyPct >= 0.50
  ) {
    return {
      id: 'separating_lines_bullish',
      name: 'Separating Lines (Bullish)',
      direction: 'LONG',
      bias: 'BULLISH',
      type: 'CONTINUATION',
      reliability: 78,
      strength: 'ULTRA',
      description: 'Pola kelanjutan reli super akurat. Upaya penurunan ditolak seketika pada pembukaan sesi dan langsung dipompa naik kembali.',
      confirmationRule: 'Candle hijau kedua dibuka persis di level open candle merah dan ditutup naik mantap.',
      stopLossPrice: c0.low * 0.997,
      candlesInvolved: 2,
    };
  }

  // [3.8] Separating Lines - Bearish (Pola No. 32 - Winrate 78.1%)
  if (
    m1.isGreen && m0.isRed &&
    Math.abs(c0.open - c1.open) / c1.open < 0.0015 &&
    m0.bodyPct >= 0.50
  ) {
    return {
      id: 'separating_lines_bearish',
      name: 'Separating Lines (Bearish)',
      direction: 'SHORT',
      bias: 'BEARISH',
      type: 'CONTINUATION',
      reliability: 78,
      strength: 'ULTRA',
      description: 'Pola kelanjutan tren turun. Upaya kenaikan sementara langsung dibatalkan sejak open candle berikutnya.',
      confirmationRule: 'Candle merah dibuka persis di open candle hijau dan tertekan jatuh.',
      stopLossPrice: c0.high * 1.003,
      candlesInvolved: 2,
    };
  }

  // [3.9] Tweezer Bottom (Pola No. 13 - Winrate 53-65%)
  if (
    Math.abs(c0.low - c1.low) / c1.low < 0.0008 &&
    m0.lowerShadowPct >= 0.35 && m1.lowerShadowPct >= 0.35 &&
    (m1.isRed || m0.isGreen)
  ) {
    return {
      id: 'tweezer_bottom',
      name: 'Tweezer Bottom',
      direction: 'LONG',
      bias: 'BULLISH',
      type: 'REVERSAL',
      reliability: 65,
      strength: 'HIGH',
      description: 'Dua wick bawah kembar menolak level support yang sama persis. Menandakan pembeli mematok batas bawah harga dan menolak harga lebih murah.',
      confirmationRule: 'Low kedua lilin identik dengan ekor bawah panjang.',
      stopLossPrice: Math.min(c0.low, c1.low) * 0.997,
      candlesInvolved: 2,
    };
  }

  // [3.10] Tweezer Top (Pola No. 13 - Winrate 53-65%)
  if (
    Math.abs(c0.high - c1.high) / c1.high < 0.0008 &&
    m0.upperShadowPct >= 0.35 && m1.upperShadowPct >= 0.35 &&
    (m1.isGreen || m0.isRed)
  ) {
    return {
      id: 'tweezer_top',
      name: 'Tweezer Top',
      direction: 'SHORT',
      bias: 'BEARISH',
      type: 'REVERSAL',
      reliability: 65,
      strength: 'HIGH',
      description: 'Dua wick atas kembar menolak batas resistance yang sama persis. Menandakan aksi pasang order jual besar di titik plafon harga.',
      confirmationRule: 'High kedua lilin identik dengan ekor atas panjang.',
      stopLossPrice: Math.max(c0.high, c1.high) * 1.003,
      candlesInvolved: 2,
    };
  }

  // [3.11] Matching Low (Pola No. 41 - Winrate 68-82%)
  // Dua candle merah dengan close identik di dasar tren turun
  if (
    m1.isRed && m0.isRed &&
    Math.abs(c0.close - c1.close) / c1.close < 0.0008 &&
    priorTrend === 'DOWNTREND'
  ) {
    return {
      id: 'matching_low',
      name: 'Matching Low',
      direction: 'LONG',
      bias: 'BULLISH',
      type: 'REVERSAL',
      reliability: 82,
      strength: 'ULTRA',
      description: 'Dua lilin merah berturut-turut gagal ditutup lebih rendah dari candle sebelumnya. Kelelahan penjual dan penyerapan likuiditas di dasar harga.',
      confirmationRule: 'Close kedua candle merah sejajar presisi di level support.',
      stopLossPrice: Math.min(c1.low, c0.low) * 0.997,
      candlesInvolved: 2,
    };
  }

  // [3.12] Matching High (Pola No. 40 - Winrate 61%)
  // Dua candle hijau dengan close identik di puncak
  if (
    m1.isGreen && m0.isGreen &&
    Math.abs(c0.close - c1.close) / c1.close < 0.0008 &&
    priorTrend === 'UPTREND'
  ) {
    return {
      id: 'matching_high',
      name: 'Matching High',
      direction: 'SHORT',
      bias: 'BEARISH',
      type: 'REVERSAL',
      reliability: 61,
      strength: 'HIGH',
      description: 'Dua lilin hijau gagal mencetak penutupan lebih tinggi di resistensi. Pembeli mulai kehilangan tenaga dorong.',
      confirmationRule: 'Close kedua lilin hijau sejajar di batas resistensi.',
      stopLossPrice: Math.max(c1.high, c0.high) * 1.003,
      candlesInvolved: 2,
    };
  }

  // [3.13] Popgun Breakout (Pola No. 28 - Winrate 53-63%)
  // C2: Standar, C1: Inside Bar dari C2, C0: Outside Bar menembus C1 & C2
  if (
    c1.high <= c2.high && c1.low >= c2.low &&
    c0.high > c1.high && c0.low < c1.low
  ) {
    const isBull = c0.close >= c0.open;
    return {
      id: 'popgun',
      name: `Popgun Breakout (${isBull ? 'Bullish' : 'Bearish'})`,
      direction: isBull ? 'LONG' : 'SHORT',
      bias: isBull ? 'BULLISH' : 'BEARISH',
      type: 'CONTINUATION',
      reliability: 63,
      strength: 'HIGH',
      description: 'Kombinasi kompresi (Inside Bar) yang disusul ledakan ekspansi volatilitas (Outside Bar). Sinyal pergerakan momentum eksplosif.',
      confirmationRule: 'Breakout arah ditentukan oleh warna candle ekspansi ke-3.',
      stopLossPrice: isBull ? c0.low * 0.997 : c0.high * 1.003,
      candlesInvolved: 3,
    };
  }

  // [3.14] Bullish Harami (Pola No. 6 - Winrate 54-76%)
  // Lilin kecil di dalam badan lilin merah besar sebelumnya (tanpa wick yang tembus jauh ke luar)
  if (
    m1.isRed && m1.bodyPct >= 0.45 &&
    m0.isGreen && m0.lowerShadowPct < 0.40 &&
    c0.open >= c1.close && c0.close <= c1.open &&
    c0.low >= c1.low * 0.998
  ) {
    return {
      id: 'bullish_harami',
      name: 'Bullish Harami',
      direction: 'LONG',
      bias: 'BULLISH',
      type: 'REVERSAL',
      reliability: 76,
      strength: 'HIGH',
      description: 'Lilin hijau kecil bersarang di dalam tubuh lilin merah besar sebelumnya ("hamil"). Menandakan hilangnya momentum jual secara drastis.',
      confirmationRule: 'Candle kedua sepenuhnya berada dalam rentang badan candle pertama.',
      stopLossPrice: c1.low * 0.997,
      candlesInvolved: 2,
    };
  }

  // [3.15] Bearish Harami (Pola No. 6 - Winrate 53-63%)
  if (
    m1.isGreen && m1.bodyPct >= 0.45 &&
    m0.isRed && m0.upperShadowPct < 0.40 &&
    c0.open <= c1.close && c0.close >= c1.open &&
    c0.high <= c1.high * 1.002
  ) {
    return {
      id: 'bearish_harami',
      name: 'Bearish Harami',
      direction: 'SHORT',
      bias: 'BEARISH',
      type: 'REVERSAL',
      reliability: 63,
      strength: 'HIGH',
      description: 'Lilin merah kecil berada di dalam tubuh lilin hijau besar. Tanda peringatan bahwa pembeli mulai ragu di area harga tinggi.',
      confirmationRule: 'Candle kedua sepenuhnya berada dalam rentang badan candle pertama.',
      stopLossPrice: c1.high * 1.003,
      candlesInvolved: 2,
    };
  }

  // [3.16] Inside Bar (Pola No. 25 - Winrate 50-65%)
  if (c0.high <= c1.high && c0.low >= c1.low) {
    const isBull = c0.close >= c0.open;
    return {
      id: 'inside_bar',
      name: `Inside Bar (${isBull ? 'Bullish Consolidation' : 'Bearish Consolidation'})`,
      direction: isBull ? 'LONG' : 'SHORT',
      bias: isBull ? 'BULLISH' : 'BEARISH',
      type: 'CONTINUATION',
      reliability: 65,
      strength: 'MODERATE',
      description: 'Konsolidasi ketat di mana rentang candle saat ini sepenuhnya berada di dalam rentang candle induk sebelumnya. Bersiap breakout.',
      confirmationRule: 'Entry valid saat harga menembus high/low mother bar.',
      stopLossPrice: isBull ? c0.low * 0.998 : c0.high * 1.002,
      candlesInvolved: 2,
    };
  }

  // [3.17] Outside Bar (Pola No. 26 - Winrate 50-65%)
  if (c0.high > c1.high && c0.low < c1.low) {
    const isBull = c0.close >= c0.open;
    return {
      id: 'outside_bar',
      name: `Outside Bar (${isBull ? 'Bullish Volatility' : 'Bearish Volatility'})`,
      direction: isBull ? 'LONG' : 'SHORT',
      bias: isBull ? 'BULLISH' : 'BEARISH',
      type: 'CONTINUATION',
      reliability: 65,
      strength: 'MODERATE',
      description: 'Lonjakan volatilitas di mana candle saat ini menelan total titik tertinggi dan terendah candle sebelumnya.',
      confirmationRule: 'Arah penutupan candle mengonfirmasi pihak yang memenangkan pertempuran likuiditas.',
      stopLossPrice: isBull ? c0.low * 0.997 : c0.high * 1.003,
      candlesInvolved: 2,
    };
  }

  // =========================================================================
  // 4. SINGLE-CANDLE PATTERNS (1 CANDLE)
  // =========================================================================

  // [4.1] Bullish Belt Hold (Pola No. 14 - Winrate ~71%)
  // Long green candle, no/tiny lower shadow (< 3% range), opens at absolute low
  if (m0.isGreen && m0.bodyPct >= 0.70 && m0.lowerShadowPct <= 0.04) {
    return {
      id: 'bullish_belt_hold',
      name: 'Bullish Belt Hold (Yorikiri)',
      japaneseName: 'Yorikiri',
      direction: 'LONG',
      bias: 'BULLISH',
      type: 'REVERSAL',
      reliability: 71,
      strength: 'ULTRA',
      description: 'Lilin hijau panjang dibuka langsung di harga terendahnya tanpa ekor bawah. Menunjukkan kekuatan dorongan beli agresif sejak detik pertama pembukaan candle.',
      confirmationRule: 'Ketiadaan shadow bawah membuktikan seller sama sekali tidak diberi kesempatan menekan harga.',
      stopLossPrice: c0.low * 0.997,
      candlesInvolved: 1,
    };
  }

  // [4.2] Bearish Belt Hold (Pola No. 14 - Winrate ~68%)
  // Long red candle, no/tiny upper shadow (< 3% range), opens at absolute high
  if (m0.isRed && m0.bodyPct >= 0.70 && m0.upperShadowPct <= 0.04) {
    return {
      id: 'bearish_belt_hold',
      name: 'Bearish Belt Hold',
      direction: 'SHORT',
      bias: 'BEARISH',
      type: 'REVERSAL',
      reliability: 68,
      strength: 'HIGH',
      description: 'Lilin merah panjang dibuka langsung di harga tertingginya tanpa ekor atas. Tekanan jual tanpa ampun mendominasi seluruh sesi.',
      confirmationRule: 'Ketiadaan shadow atas membuktikan buyer langsung kalah telak sejak open.',
      stopLossPrice: c0.high * 1.003,
      candlesInvolved: 1,
    };
  }

  // [4.3] High Wave Candlestick (Pola No. 31 - Winrate 73-84%)
  // Small body <= 25%, long upper >= 35%, long lower >= 35%
  if (m0.bodyPct <= 0.25 && m0.upperShadowPct >= 0.35 && m0.lowerShadowPct >= 0.35) {
    const isBull = priorTrend === 'DOWNTREND';
    return {
      id: 'high_wave',
      name: 'High Wave Candlestick',
      direction: isBull ? 'LONG' : 'SHORT',
      bias: isBull ? 'BULLISH' : 'BEARISH',
      type: 'REVERSAL',
      reliability: 84,
      strength: 'ULTRA',
      description: 'Pertarungan ekstrem antara buyer dan seller dengan ekor atas dan bawah yang sama-sama sangat panjang. Sinyal kelelahan tren utama dan titik balik penting.',
      confirmationRule: 'Tunggu konfirmasi candle berikutnya yang ditutup melampaui tubuh lilin High Wave.',
      stopLossPrice: isBull ? c0.low * 0.996 : c0.high * 1.004,
      candlesInvolved: 1,
    };
  }

  // [4.4] Hammer (Pola No. 1 - Winrate 55-72%)
  // Lower shadow >= 2x body, upper shadow tiny <= 10%, at bottom of downtrend
  if (m0.lowerShadow >= 2 * m0.body && m0.upperShadowPct <= 0.10 && m0.bodyPct >= 0.15) {
    if (priorTrend === 'DOWNTREND' || c0.close <= c1.low * 1.01) {
      return {
        id: 'hammer',
        name: 'Hammer (Palu Reversal)',
        direction: 'LONG',
        bias: 'BULLISH',
        type: 'REVERSAL',
        reliability: 72,
        strength: 'HIGH',
        description: 'Penolakan harga rendah yang sangat kuat. Penjual sempat menekan harga dalam namun pembeli membalas kuat dan menutup harga dekat pucuk.',
        confirmationRule: 'Ekor bawah minimal dua kali panjang tubuh lilin, dengan ekor atas yang nyaris tidak ada.',
        stopLossPrice: c0.low * 0.997,
        candlesInvolved: 1,
      };
    }
  }

  // [4.5] Shooting Star (Pola No. 2 - Winrate 54-71%)
  // Upper shadow >= 2x body, lower shadow tiny <= 10%, at top of uptrend
  if (m0.upperShadow >= 2 * m0.body && m0.lowerShadowPct <= 0.10 && m0.bodyPct >= 0.15) {
    if (priorTrend === 'UPTREND' || c0.close >= c1.high * 0.99) {
      return {
        id: 'shooting_star',
        name: 'Shooting Star (Bintang Jatuh)',
        direction: 'SHORT',
        bias: 'BEARISH',
        type: 'REVERSAL',
        reliability: 71,
        strength: 'HIGH',
        description: 'Penolakan harga puncak. Pembeli mencoba mendorong harga ke rekor baru namun dihantam aksi jual besar sehingga harga terpuruk mendekati open.',
        confirmationRule: 'Ekor atas panjang minimal dua kali lipat tubuh candle, menandakan kegagalan breakout ke atas.',
        stopLossPrice: c0.high * 1.003,
        candlesInvolved: 1,
      };
    }
  }

  // [4.6] Hanging Man (Pola No. 7 - Winrate 37-86%)
  // Struktur mirip Hammer tapi terbentuk di puncak uptrend
  if (m0.lowerShadow >= 2 * m0.body && m0.upperShadowPct <= 0.10 && priorTrend === 'UPTREND') {
    return {
      id: 'hanging_man',
      name: 'Hanging Man',
      direction: 'SHORT',
      bias: 'BEARISH',
      type: 'REVERSAL',
      reliability: 68,
      strength: 'HIGH',
      description: 'Lilin peringatan bahaya di puncak kenaikan. Munculnya aksi jual dalam menandakan pertahanan buyer mulai rapuh.',
      confirmationRule: 'Wajib konfirmasi dengan candle berikutnya yang ditutup di bawah low Hanging Man.',
      stopLossPrice: c0.high * 1.003,
      candlesInvolved: 1,
    };
  }

  // [4.7] Bullish Pin Bar (Pola No. 9 - Winrate 53-65%)
  if (m0.lowerShadowPct >= 0.60 && m0.upperShadowPct <= 0.20) {
    return {
      id: 'bullish_pin_bar',
      name: 'Bullish Pin Bar (Price Rejection)',
      direction: 'LONG',
      bias: 'BULLISH',
      type: 'REVERSAL',
      reliability: 65,
      strength: 'HIGH',
      description: 'Ekor jarum panjang di bawah menandai penolakan harga diskon secara masif oleh institusi.',
      confirmationRule: 'Ekor bawah mendominasi lebih dari 60% total rentang candle.',
      stopLossPrice: c0.low * 0.997,
      candlesInvolved: 1,
    };
  }

  // [4.8] Bearish Pin Bar (Pola No. 9 - Winrate 53-65%)
  if (m0.upperShadowPct >= 0.60 && m0.lowerShadowPct <= 0.20) {
    return {
      id: 'bearish_pin_bar',
      name: 'Bearish Pin Bar (Price Rejection)',
      direction: 'SHORT',
      bias: 'BEARISH',
      type: 'REVERSAL',
      reliability: 65,
      strength: 'HIGH',
      description: 'Ekor jarum panjang di atas menandai penolakan harga mahal dan dinding order jual tebal.',
      confirmationRule: 'Ekor atas mendominasi lebih dari 60% total rentang candle.',
      stopLossPrice: c0.high * 1.003,
      candlesInvolved: 1,
    };
  }

  // [4.9] Dragonfly Doji (Bullish) & Gravestone Doji (Bearish) (Pola No. 8)
  if (m0.bodyPct <= 0.08) {
    if (m0.lowerShadowPct >= 0.70 && m0.upperShadowPct <= 0.15) {
      return {
        id: 'dragonfly_doji',
        name: 'Dragonfly Doji',
        direction: 'LONG',
        bias: 'BULLISH',
        type: 'REVERSAL',
        reliability: 62,
        strength: 'HIGH',
        description: 'Lilin capung bullish. Harga buka dan tutup sama di puncak candle setelah penolakan dramatis terhadap aksi jual.',
        confirmationRule: 'Hampir tanpa tubuh dan tanpa ekor atas, murni didorong ekor bawah panjang.',
        stopLossPrice: c0.low * 0.997,
        candlesInvolved: 1,
      };
    }
    if (m0.upperShadowPct >= 0.70 && m0.lowerShadowPct <= 0.15) {
      return {
        id: 'gravestone_doji',
        name: 'Gravestone Doji',
        direction: 'SHORT',
        bias: 'BEARISH',
        type: 'REVERSAL',
        reliability: 62,
        strength: 'HIGH',
        description: 'Lilin batu nisan bearish. Upaya buyer dihabisi total hingga harga kembali ditutup di level pembukaan terbawah.',
        confirmationRule: 'Ekor atas sangat panjang tanpa ekor bawah, sinyal kuat pembalikan ke bawah.',
        stopLossPrice: c0.high * 1.003,
        candlesInvolved: 1,
      };
    }
  }

  // [4.10] Shaven Head / Shaven Bottom (Pola No. 29 & 30)
  if (m0.bodyPct >= 0.60) {
    if (m0.isGreen && m0.upperShadowPct <= 0.02) {
      return {
        id: 'shaven_head',
        name: 'Shaven Head (Marubozu Dominance)',
        direction: 'LONG',
        bias: 'BULLISH',
        type: 'CONTINUATION',
        reliability: 62,
        strength: 'HIGH',
        description: 'Candle hijau perkasa ditutup persis di harga tertingginya tanpa wick atas. Pembeli memegang kendali mutlak hingga akhir sesi.',
        confirmationRule: 'Ketiadaan wick atas menandakan urgensi beli masih sangat tinggi.',
        stopLossPrice: c0.low * 0.998,
        candlesInvolved: 1,
      };
    }
    if (m0.isRed && m0.lowerShadowPct <= 0.02) {
      return {
        id: 'shaven_bottom',
        name: 'Shaven Bottom (Selling Drive)',
        direction: 'SHORT',
        bias: 'BEARISH',
        type: 'CONTINUATION',
        reliability: 62,
        strength: 'HIGH',
        description: 'Candle merah ditutup persis di harga terendahnya tanpa wick bawah. Penjual terus menekan harga hingga detik terakhir.',
        confirmationRule: 'Ketiadaan wick bawah menandakan dorongan jual masih berlanjut kuat.',
        stopLossPrice: c0.high * 1.002,
        candlesInvolved: 1,
      };
    }
  }

  // [4.11] Spinning Top (Pola No. 27 - Winrate 53-55%)
  if (m0.bodyPct >= 0.10 && m0.bodyPct <= 0.30 && m0.upperShadowPct >= 0.25 && m0.lowerShadowPct >= 0.25) {
    return {
      id: 'spinning_top',
      name: 'Spinning Top (Gasing Keraguan)',
      direction: 'NEUTRAL',
      bias: 'NEUTRAL',
      type: 'INDECISION',
      reliability: 55,
      strength: 'MODERATE',
      description: 'Lilin gasing menunjukkan pasar sedang ragu-ragu dan menimbang arah selanjutnya setelah pergerakan kencang.',
      confirmationRule: 'Tunggu lilin berikutnya untuk konfirmasi penembusan arah.',
      candlesInvolved: 1,
    };
  }

  return null;
}
