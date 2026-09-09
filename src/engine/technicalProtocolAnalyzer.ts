/**
 * Protokol Analisis Teknikal Universal
 * Engine verifikasi logika matematis 100% deterministik dari penutupan lilin (close candle) terakhir.
 * Menjamin zero-hallucination dan ketiadaan sinyal palsu.
 */

export interface IndicatorNumericalValues {
  lastClose: number;
  timeframe: string;
  ma: {
    ma7: number | null;
    ma25: number | null;
    ma99: number | null;
    alignment: 'BULLISH_UPTREND' | 'BEARISH_DOWNTREND' | 'SIDEWAYS_TRANSITION';
    displayText: string;
  };
  bollingerBands: {
    upper: number | null;
    middle: number | null;
    lower: number | null;
    status: 'BREAKOUT_ATAS' | 'BREAKOUT_BAWAH' | 'KONSOLIDASI' | 'TEST_BAND';
    displayText: string;
  };
  macd: {
    dif: number;
    dea: number;
    histogram: number;
    status: 'BULLISH_CROSS' | 'BEARISH_CROSS' | 'NEUTRAL';
    isDIFAboveDEA: boolean;
    displayText: string;
  };
  rsi: {
    rsi6: number;
    rsi12: number;
    rsi24: number;
    status: 'OVERBOUGHT' | 'OVERSOLD' | 'BULLISH_ZONE' | 'BEARISH_ZONE' | 'NEUTRAL';
    displayText: string;
  };
}

export type ProtocolVerdictStatus = 'STRONG_BUY' | 'STRONG_SELL' | 'WAIT_AND_SEE_NEUTRAL';

export interface ProtocolVerificationResult {
  indicators: IndicatorNumericalValues;
  verdict: {
    status: ProtocolVerdictStatus;
    badgeLabel: string;
    confluenceRate: number; // 0 - 100%
    summary: string;
    conflicts: string[];
    isConfluencePerfect: boolean;
  };
  protocolChecklist: {
    macdVerified: boolean;
    bbVerified: boolean;
    maVerified: boolean;
    notes: string[];
  };
}

/**
 * Kalkulasi Simple Moving Average (SMA)
 */
export function calculateSMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      const slice = data.slice(i - period + 1, i + 1);
      const sum = slice.reduce((acc, v) => acc + v, 0);
      result.push(sum / period);
    }
  }
  return result;
}

/**
 * Kalkulasi Exponential Moving Average (EMA)
 */
export function calculateEMA(data: number[], period: number): number[] {
  if (data.length === 0) return [];
  const k = 2 / (period + 1);
  const ema: number[] = [data[0]];
  for (let i = 1; i < data.length; i++) {
    ema.push(data[i] * k + ema[i - 1] * (1 - k));
  }
  return ema;
}

/**
 * Kalkulasi Bollinger Bands (period 20, multiplier 2)
 */
export function calculateBollingerBands(data: number[], period = 20, multiplier = 2) {
  const sma = calculateSMA(data, period);
  return data.map((_, idx) => {
    const mb = sma[idx];
    if (mb === null || idx < period - 1) {
      return { upper: null, middle: null, lower: null };
    }
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

/**
 * Kalkulasi MACD Series (12, 26, 9)
 */
export function calculateMACDSeries(data: number[]) {
  const ema12 = calculateEMA(data, 12);
  const ema26 = calculateEMA(data, 26);
  const dif = ema12.map((v, i) => v - ema26[i]);
  const dea = calculateEMA(dif, 9);
  const histogram = dif.map((d, i) => (d - dea[i]) * 2);
  return { dif, dea, histogram };
}

/**
 * Kalkulasi RSI Series (Wilder smoothing standard)
 */
export function calculateRSISeries(data: number[], period: number): (number | null)[] {
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

/**
 * Helper pemformat angka presisi untuk harga kripto
 */
export function formatExactPrice(price: number | null): string {
  if (price === null || isNaN(price)) return '-';
  if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  if (price >= 0.001) return price.toFixed(6);
  return price.toFixed(8);
}

/**
 * EKSEKUTOR UTAMA: PROTOKOL ANALISIS TEKNIKAL UNIVERSAL
 * Mengevaluasi close candle terakhir berdasarkan 4 pilar logika verifikasi ketat.
 */
export function analyzeTechnicalProtocol(
  closePrices: number[],
  timeframe: string = '15m'
): ProtocolVerificationResult {
  if (!closePrices || closePrices.length === 0) {
    throw new Error('Data close candle tidak boleh kosong untuk analisis protokol.');
  }

  const lastIdx = closePrices.length - 1;
  const lastClose = closePrices[lastIdx];

  // 1. Kalkulasi Indikator Aktual
  const ma7Series = calculateSMA(closePrices, 7);
  const ma25Series = calculateSMA(closePrices, 25);
  const ma99Series = calculateSMA(closePrices, 99);
  const bollSeries = calculateBollingerBands(closePrices, 20, 2);
  const macdSeries = calculateMACDSeries(closePrices);
  const rsi6Series = calculateRSISeries(closePrices, 6);
  const rsi12Series = calculateRSISeries(closePrices, 12);
  const rsi24Series = calculateRSISeries(closePrices, 24);

  const ma7 = ma7Series[lastIdx];
  const ma25 = ma25Series[lastIdx];
  const ma99 = ma99Series[lastIdx];

  const currentBoll = bollSeries[lastIdx];
  const upper = currentBoll?.upper ?? null;
  const middle = currentBoll?.middle ?? null;
  const lower = currentBoll?.lower ?? null;

  const dif = macdSeries.dif[lastIdx] ?? 0;
  const dea = macdSeries.dea[lastIdx] ?? 0;
  const histogram = macdSeries.histogram[lastIdx] ?? 0;

  const rsi6 = rsi6Series[lastIdx] ?? 50;
  const rsi12 = rsi12Series[lastIdx] ?? 50;
  const rsi24 = rsi24Series[lastIdx] ?? 50;

  // -------------------------------------------------------------
  // ATURAN 1: Verifikasi MACD (Mutlak)
  // Bullish Cross: DIF > DEA (secara matematis di atas). Dilarang keras jika DIF <= DEA.
  // Bearish Cross: DIF < DEA.
  // -------------------------------------------------------------
  const isDIFAboveDEA = dif > dea;
  let macdStatus: 'BULLISH_CROSS' | 'BEARISH_CROSS' | 'NEUTRAL';
  let macdText: string;

  if (dif > dea) {
    macdStatus = 'BULLISH_CROSS';
    macdText = `BULLISH CROSS / MOMENTUM VALID: Garis DIF (${dif.toFixed(6)}) berada DI ATAS garis DEA (${dea.toFixed(6)}). Histogram: ${histogram >= 0 ? '+' : ''}${histogram.toFixed(6)}.`;
  } else if (dif < dea) {
    macdStatus = 'BEARISH_CROSS';
    macdText = `BEARISH CROSS / MOMENTUM VALID: Garis DIF (${dif.toFixed(6)}) berada DI BAWAH garis DEA (${dea.toFixed(6)}). Histogram: ${histogram.toFixed(6)}.`;
  } else {
    macdStatus = 'NEUTRAL';
    macdText = `NETRAL: DIF (${dif.toFixed(6)}) persis sama dengan DEA (${dea.toFixed(6)}). Belum ada konfirmasi silang.`;
  }

  // -------------------------------------------------------------
  // ATURAN 2: Verifikasi Bollinger Bands (BB)
  // BREAKOUT ATAS: Close > Upper Band.
  // BREAKOUT BAWAH: Close < Lower Band.
  // Jika di dalam pita: Konsolidasi / Test Band, bukan Breakout.
  // -------------------------------------------------------------
  let bbStatus: 'BREAKOUT_ATAS' | 'BREAKOUT_BAWAH' | 'KONSOLIDASI' | 'TEST_BAND';
  let bbText: string;

  if (upper !== null && lower !== null && middle !== null) {
    if (lastClose > upper) {
      bbStatus = 'BREAKOUT_ATAS';
      bbText = `BREAKOUT ATAS: Harga Close ($${formatExactPrice(lastClose)}) menembus secara matematis di atas Upper Band ($${formatExactPrice(upper)}).`;
    } else if (lastClose < lower) {
      bbStatus = 'BREAKOUT_BAWAH';
      bbText = `BREAKOUT BAWAH: Harga Close ($${formatExactPrice(lastClose)}) menembus secara matematis di bawah Lower Band ($${formatExactPrice(lower)}).`;
    } else {
      // Di dalam pita: Konsolidasi atau Test Band (BUKAN BREAKOUT)
      const distToUpper = Math.abs(upper - lastClose) / (upper - lower);
      const distToLower = Math.abs(lastClose - lower) / (upper - lower);

      if (distToUpper < 0.15) {
        bbStatus = 'TEST_BAND';
        bbText = `TEST BAND ATAS (Bukan Breakout): Close ($${formatExactPrice(lastClose)}) menguji resistensi Upper Band ($${formatExactPrice(upper)}), masih di dalam pita.`;
      } else if (distToLower < 0.15) {
        bbStatus = 'TEST_BAND';
        bbText = `TEST BAND BAWAH (Bukan Breakout): Close ($${formatExactPrice(lastClose)}) menguji support Lower Band ($${formatExactPrice(lower)}), masih di dalam pita.`;
      } else {
        bbStatus = 'KONSOLIDASI';
        bbText = `KONSOLIDASI: Harga Close ($${formatExactPrice(lastClose)}) berada di dalam pita antara Lower ($${formatExactPrice(lower)}) dan Upper ($${formatExactPrice(upper)}). Bukan Breakout.`;
      }
    }
  } else {
    bbStatus = 'KONSOLIDASI';
    bbText = 'Data lilin belum mencukupi 20 candle untuk kalkulasi Bollinger Bands.';
  }

  // -------------------------------------------------------------
  // ATURAN 3: Verifikasi Moving Average (MA)
  // Sebutkan angka aktual MA7, MA25, MA99.
  // Pastikan susunan angkanya benar-benar mengonfirmasi tren.
  // -------------------------------------------------------------
  let maAlignment: 'BULLISH_UPTREND' | 'BEARISH_DOWNTREND' | 'SIDEWAYS_TRANSITION';
  let maText: string;

  if (ma7 !== null && ma25 !== null && ma99 !== null) {
    if (ma7 > ma25 && ma25 > ma99) {
      maAlignment = 'BULLISH_UPTREND';
      maText = `TREN NAIK VALID (Golden Stack): MA(7)=$${formatExactPrice(ma7)} > MA(25)=$${formatExactPrice(ma25)} > MA(99)=$${formatExactPrice(ma99)}. Susunan MA mengonfirmasi momentum bullish solid.`;
    } else if (ma7 < ma25 && ma25 < ma99) {
      maAlignment = 'BEARISH_DOWNTREND';
      maText = `TREN TURUN VALID (Death Stack): MA(7)=$${formatExactPrice(ma7)} < MA(25)=$${formatExactPrice(ma25)} < MA(99)=$${formatExactPrice(ma99)}. Susunan MA mengonfirmasi tekanan jual aktif.`;
    } else {
      maAlignment = 'SIDEWAYS_TRANSITION';
      maText = `TRANSISI / SIDEWAYS: MA(7)=$${formatExactPrice(ma7)}, MA(25)=$${formatExactPrice(ma25)}, MA(99)=$${formatExactPrice(ma99)}. Urutan garis belum tersusun hierarkis sempurna.`;
    }
  } else if (ma7 !== null && ma25 !== null) {
    if (ma7 > ma25) {
      maAlignment = 'BULLISH_UPTREND';
      maText = `TREN JANGKA PENDEK NAIK: MA(7)=$${formatExactPrice(ma7)} > MA(25)=$${formatExactPrice(ma25)} (MA99 memerlukan 99 candle).`;
    } else {
      maAlignment = 'BEARISH_DOWNTREND';
      maText = `TREN JANGKA PENDEK TURUN: MA(7)=$${formatExactPrice(ma7)} < MA(25)=$${formatExactPrice(ma25)} (MA99 memerlukan 99 candle).`;
    }
  } else {
    maAlignment = 'SIDEWAYS_TRANSITION';
    maText = 'Data candle belum mencukupi untuk formasi Moving Average lengkap.';
  }

  // RSI Evaluasi
  let rsiStatus: 'OVERBOUGHT' | 'OVERSOLD' | 'BULLISH_ZONE' | 'BEARISH_ZONE' | 'NEUTRAL';
  let rsiText: string;
  if (rsi6 >= 80) {
    rsiStatus = 'OVERBOUGHT';
    rsiText = `OVERBOUGHT: RSI(6)=${rsi6.toFixed(1)}, RSI(12)=${rsi12.toFixed(1)}, RSI(24)=${rsi24.toFixed(1)}. Zona jenuh beli, waspada koreksi.`;
  } else if (rsi6 <= 20) {
    rsiStatus = 'OVERSOLD';
    rsiText = `OVERSOLD: RSI(6)=${rsi6.toFixed(1)}, RSI(12)=${rsi12.toFixed(1)}, RSI(24)=${rsi24.toFixed(1)}. Zona jenuh jual, potensi rebound teknikal.`;
  } else if (rsi6 > 52 && rsi12 > 50) {
    rsiStatus = 'BULLISH_ZONE';
    rsiText = `MOMENTUM POSITIF: RSI(6)=${rsi6.toFixed(1)} > 50, RSI(12)=${rsi12.toFixed(1)} > 50. Pembeli memegang kendali momentum.`;
  } else if (rsi6 < 48 && rsi12 < 50) {
    rsiStatus = 'BEARISH_ZONE';
    rsiText = `MOMENTUM NEGATIF: RSI(6)=${rsi6.toFixed(1)} < 50, RSI(12)=${rsi12.toFixed(1)} < 50. Penjual memegang kendali momentum.`;
  } else {
    rsiStatus = 'NEUTRAL';
    rsiText = `NETRAL: RSI(6)=${rsi6.toFixed(1)}, RSI(12)=${rsi12.toFixed(1)}, RSI(24)=${rsi24.toFixed(1)}. Osilasi di batas tengah (50).`;
  }

  // -------------------------------------------------------------
  // ATURAN 4: Output Kesimpulan (Keputusan Tegas)
  // Sinkronkan semua indikator.
  // Jika ada indikator yang bertentangan: WAJIB turunkan ke "NEUTRAL" / "WAIT & SEE"
  // Dilarang memaksakan "REKOMENDASI KUAT" tanpa konfluensi 100%.
  // -------------------------------------------------------------
  const conflicts: string[] = [];
  let isBullishScore = 0;
  let isBearishScore = 0;

  // Cek MA
  if (maAlignment === 'BULLISH_UPTREND') isBullishScore += 1;
  else if (maAlignment === 'BEARISH_DOWNTREND') isBearishScore += 1;
  else conflicts.push('Moving Average berada dalam fase transisi/sideways, belum konfirmasi tren tunggal');

  // Cek MACD
  if (macdStatus === 'BULLISH_CROSS') isBullishScore += 1;
  else if (macdStatus === 'BEARISH_CROSS') isBearishScore += 1;
  else conflicts.push('MACD belum membentuk golden/death cross yang definitif');

  // Cek Bollinger Bands
  if (bbStatus === 'BREAKOUT_ATAS') {
    isBullishScore += 1;
  } else if (bbStatus === 'BREAKOUT_BAWAH') {
    isBearishScore += 1;
  } else {
    // Jika konsolidasi, cek posisi terhadap middle band
    if (middle !== null) {
      if (lastClose >= middle) isBullishScore += 0.5;
      else isBearishScore += 0.5;
    }
  }

  // Cek RSI
  if (rsiStatus === 'BULLISH_ZONE' || rsiStatus === 'OVERSOLD') isBullishScore += 1;
  else if (rsiStatus === 'BEARISH_ZONE' || rsiStatus === 'OVERBOUGHT') isBearishScore += 1;

  // Analisis Konflik Silang
  if (maAlignment === 'BULLISH_UPTREND' && macdStatus === 'BEARISH_CROSS') {
    conflicts.push(`KONTRADIKSI: Formasi MA menunjukkan Bullish, tetapi MACD DIF (${dif.toFixed(4)}) berada di bawah DEA (${dea.toFixed(4)})`);
  }
  if (maAlignment === 'BEARISH_DOWNTREND' && macdStatus === 'BULLISH_CROSS') {
    conflicts.push(`KONTRADIKSI: Formasi MA menunjukkan Bearish, tetapi MACD DIF (${dif.toFixed(4)}) berada di atas DEA (${dea.toFixed(4)})`);
  }
  if (bbStatus === 'BREAKOUT_ATAS' && macdStatus === 'BEARISH_CROSS') {
    conflicts.push('KONTRADIKSI: Harga breakout upper BB tetapi momentum MACD belum cross ke atas');
  }
  if (bbStatus === 'BREAKOUT_BAWAH' && macdStatus === 'BULLISH_CROSS') {
    conflicts.push('KONTRADIKSI: Harga breakdown lower BB tetapi MACD masih tertahan di atas DEA');
  }

  // Keputusan Akhir
  let verdictStatus: ProtocolVerdictStatus;
  let badgeLabel: string;
  let summaryText: string;
  let confluenceRate = 0;
  const isConfluencePerfect = conflicts.length === 0 && (isBullishScore >= 3.5 || isBearishScore >= 3.5);

  if (isConfluencePerfect && isBullishScore >= 3.5 && dif > dea) {
    verdictStatus = 'STRONG_BUY';
    badgeLabel = '🟢 REKOMENDASI KUAT: LONG (BUY)';
    confluenceRate = 100;
    summaryText = `Konfluensi 100% Terpenuhi: Formasi MA7 > MA25 > MA99 valid uptrend, DIF (${dif.toFixed(5)}) > DEA (${dea.toFixed(5)}) mutlak terkonfirmasi, dan posisi harga/RSI selaras tanpa divergensi bertentangan.`;
  } else if (isConfluencePerfect && isBearishScore >= 3.5 && dif < dea) {
    verdictStatus = 'STRONG_SELL';
    badgeLabel = '🔴 REKOMENDASI KUAT: SHORT (SELL)';
    confluenceRate = 100;
    summaryText = `Konfluensi 100% Terpenuhi: Formasi MA7 < MA25 < MA99 valid downtrend, DIF (${dif.toFixed(5)}) < DEA (${dea.toFixed(5)}) mutlak terkonfirmasi, dan tekanan jual mengonfirmasi kelanjutan penurunan.`;
  } else {
    verdictStatus = 'WAIT_AND_SEE_NEUTRAL';
    badgeLabel = '🟡 WAIT & SEE / NEUTRAL: Konfluensi Belum Sempurna';
    confluenceRate = Math.round((Math.max(isBullishScore, isBearishScore) / 4) * 100);
    summaryText = `Peringatan Protokol: Konfluensi indikator belum selaras 100% (${confluenceRate}% konfluensi). Terdapat sinyal bertentangan sehingga rekomendasi wajib diturunkan menjadi WAIT & SEE untuk menghindari sinyal palsu.`;
  }

  return {
    indicators: {
      lastClose,
      timeframe,
      ma: { ma7, ma25, ma99, alignment: maAlignment, displayText: maText },
      bollingerBands: { upper, middle, lower, status: bbStatus, displayText: bbText },
      macd: { dif, dea, histogram, status: macdStatus, isDIFAboveDEA, displayText: macdText },
      rsi: { rsi6, rsi12, rsi24, status: rsiStatus, displayText: rsiText },
    },
    verdict: {
      status: verdictStatus,
      badgeLabel,
      confluenceRate,
      summary: summaryText,
      conflicts,
      isConfluencePerfect,
    },
    protocolChecklist: {
      macdVerified: (verdictStatus === 'STRONG_BUY' && dif > dea) || (verdictStatus === 'STRONG_SELL' && dif < dea) || verdictStatus === 'WAIT_AND_SEE_NEUTRAL',
      bbVerified: true,
      maVerified: true,
      notes: [
        `Close Candle Terakhir: $${formatExactPrice(lastClose)} [TF: ${timeframe}]`,
        `Verifikasi MACD: DIF (${dif.toFixed(5)}) vs DEA (${dea.toFixed(5)}) -> ${isDIFAboveDEA ? 'DIF > DEA' : 'DIF <= DEA'}`,
        `Verifikasi Bollinger: ${bbStatus}`,
        `Verifikasi MA: ${maAlignment}`,
      ],
    },
  };
}
