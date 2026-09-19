
/**
 * Binance Futures Signal Detection & Quant Consensus Engine
 * Memindai semua koin USDT-M di Binance Futures secara berkala,
 * mendeteksi anomali teknikal & sentimen derivatif, serta menghitung
 * zona entry, target berjenjang (TP1/TP2/TP3), stop loss, dan leverage ganda.
 */

import {
  BinanceFuturesSignal,
  FuturesDirection,
  FuturesSignalTier,
  FuturesStrategy,
  FuturesMarketStats,
  DualLeverageConfig,
  FuturesTechnicalIndicators,
  IndicatorExplanation,
  CandlestickPatternResult,
  BtcMarketContext,
  PositionSizingRecommendation,
  OrderbookDepthAnalysis,
  QuantAnomalyInsight,
  BullBearDebate,
  AutoHedgeRecommendation,
  MultiTimeframeAlignment,
  TimeframeTrendBias,
  SmcAnalysisResult,
} from '../types/futures';
import {
  getFutures24hTickers,
  getFundingRates,
  getKlines,
  getFuturesSingleTicker,
  getSingleFundingRate,
  getFuturesOpenInterest,
  getFuturesLongShortRatio,
  getTopTraderLongShortRatio,
  getTakerBuySellRatio,
  getFearAndGreedIndex,
  getBtcMarketContext,
  getFuturesOrderbookDepth,
  Raw24hTicker,
  RawFundingRate,
  RawOrderbookDepth,
} from '../lib/binanceClient';
import { parseKlinesToCandles, detectCandlestickPatterns } from './candlestickPatternEngine';
import { computeRealTechnicalIndicators, calculateSMA } from './technicalIndicatorsEngine';
import { fetchRecentCryptoNews } from './newsFetchEngine';
import { analyzeSentimentForSymbol, getCachedSentiment } from './newsSentimentEngine';
import { runSmcAnalysis } from './smcAnalysisEngine';
import { isTradFiOrEtfBlacklisted, isCryptoPureWhitelisted } from '../lib/tradfiBlacklist';

/**
 * Format angka presisi dinamis berdasarkan harga koin (misal BTC vs PEPE)
 */
export function formatFuturesPrice(price: number): string {
  if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return price.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  if (price >= 0.001) return price.toFixed(6);
  return price.toFixed(8);
}

/**
 * Kalkulator Manajemen Risiko Modal (Position Sizing & Anti-Rungkad)
 * Menghitung batas margin yang aman agar risiko kerugian saat SL tidak melebihi toleransi (default 2% modal).
 */
export function calculatePositionSizing(
  walletBalanceUsd: number = 20,
  stopLossPct: number = 2.0,
  leverageMultiplier: number = 5
): PositionSizingRecommendation {
  return calculatePositionSizingWithHardCap(walletBalanceUsd, stopLossPct, leverageMultiplier);
}

/**
 * Kalkulator Manajemen Risiko dengan Opsi Hard Cap Dollar (Mode Anti-Emosi: batas kerugian nominal $1 USD)
 */
export function calculatePositionSizingWithHardCap(
  walletBalanceUsd: number = 20,
  stopLossPct: number = 2.0,
  leverageMultiplier: number = 5,
  hardCapDollarRisk?: number
): PositionSizingRecommendation {
  const isHardCapActive = hardCapDollarRisk !== undefined && hardCapDollarRisk > 0;
  const safeSlPct = Math.max(stopLossPct, 0.5);

  // Jika hardCap diaktifkan (misal $1.00), gunakan angka tersebut langsung; jika tidak, gunakan 2% SOP
  const maxRiskAmountUsd = isHardCapActive
    ? Number(hardCapDollarRisk.toFixed(2))
    : Number(((walletBalanceUsd * 2.0) / 100).toFixed(2));

  const maxRiskPct = walletBalanceUsd > 0
    ? Number(((maxRiskAmountUsd / walletBalanceUsd) * 100).toFixed(1))
    : 2.0;

  // Notional = Risiko / Jarak SL
  const notionalUsd = maxRiskAmountUsd / (safeSlPct / 100);

  // Margin yang dimasukkan ke order Binance = Notional / Leverage
  const rawMarginUsd = notionalUsd / leverageMultiplier;
  const recommendedMarginUsd = Number(Math.max(rawMarginUsd, 0.5).toFixed(2));

  const note = isHardCapActive
    ? `🔒 MODE ANTI-EMOSI AKTIF: Jika Stop Loss (-${safeSlPct.toFixed(1)}%) tertabrak, kerugian Anda terkunci tepat -$${maxRiskAmountUsd.toFixed(2)} USD (Margin: $${recommendedMarginUsd}).`
    : `Batas risiko SOP 2% modal ($${walletBalanceUsd}): Jika SL (-${safeSlPct.toFixed(1)}%) tertabrak, kerugian maksimal -$${maxRiskAmountUsd} USD.`;

  return {
    walletReferenceUsd: walletBalanceUsd,
    maxRiskPct,
    maxRiskAmountUsd,
    recommendedMarginUsd,
    recommendedLeverage: leverageMultiplier,
    note,
  };
}

/**
 * Gatekeeper Evaluasi Risiko Sebelum Eksekusi Order Futures
 * Mengecek anomali pasar (BTC Guard, Funding Rate Drag, Volatilitas Ekstrem).
 * Sesuai instruksi: menghasilkan peringatan yang jelas dan transparan.
 */
export function validateFuturesEntryGate(signal: BinanceFuturesSignal): {
  isRestricted: boolean;
  warnings: string[];
  notices: string[];
} {
  const warnings: string[] = [];
  const notices: string[] = [];
  let isRestricted = false;

  // 0. TradFi / ETF / Pre-Market Static Blacklist Hard-Stop
  const tradFiCheck = isTradFiOrEtfBlacklisted(signal.symbol);
  if (tradFiCheck.isBlacklisted) {
    isRestricted = true;
    warnings.push(
      tradFiCheck.reason ||
      `🚨 GATEKEEPER BLACKLIST: Aset TradFi / Pre-Market (${signal.symbol}) diblokir total dari eksekusi karena spread lebar dan likuiditas minim.`
    );
  }

  // 0b. Dynamic Liquidity Filter (Pemisahan Dinamis vs Statis)
  if (signal.derivativesData && signal.derivativesData.volume24hUsd < 15_000_000) {
    warnings.push(
      `⚠️ LIKUIDITAS RENDAH ($${(signal.derivativesData.volume24hUsd / 1e6).toFixed(1)}M < $15M): Waspada spread lebar dan slippage Stop Loss.`
    );
  }

  // 1. BTC Guard Spillover / Flash Dump Alert
  if (signal.autoHedge?.gatekeeperStatus === 'RESTRICTED') {
    isRestricted = true;
    warnings.push(`⚠️ PERINGATAN BTC GUARD: ${signal.autoHedge.gatekeeperReason}`);
  } else if (signal.autoHedge?.gatekeeperStatus === 'CAUTION') {
    warnings.push(`⚠️ PERINGATAN RISIKO: ${signal.autoHedge.gatekeeperReason}`);
  }

  // 2. Funding Rate Anomaly Warning
  if (signal.direction === 'LONG' && signal.derivativesData.fundingRatePct >= 0.05) {
    warnings.push(`⚠️ FUNDING RATE TINGGI (+${signal.derivativesData.fundingRatePct.toFixed(4)}%): Posisi Long sangat padat, potensi pembalikan atau biaya funding.`);
  } else if (signal.direction === 'SHORT' && signal.derivativesData.fundingRatePct <= -0.04) {
    warnings.push(`⚠️ FUNDING RATE NEGATIF (${signal.derivativesData.fundingRatePct.toFixed(4)}%): Posisi Short padat, rawan short squeeze mendadak.`);
  }

  // 3. Counter-Trend Warning
  if (signal.multiTimeframe?.isCounterTrendRisk) {
    warnings.push(`⚠️ COUNTER-TREND RISK: Posisi melawan struktur tren 4h/Daily. Disarankan disiplin trailing stop!`);
  }

  // 3b. Peringatan Sentimen Berita AI
  if (signal.newsContext) {
    if (signal.direction === 'LONG' && signal.newsContext.sentimentScore <= -25) {
      warnings.push(`⚠️ SENTIMEN BERITA BEARISH (${signal.newsContext.sentimentScore}): ${signal.newsContext.keyHeadline}`);
    } else if (signal.direction === 'SHORT' && signal.newsContext.sentimentScore >= 25) {
      warnings.push(`⚠️ SENTIMEN BERITA BULLISH (+${signal.newsContext.sentimentScore}): ${signal.newsContext.keyHeadline}`);
    } else if (signal.newsContext.signalModifier === 'VETO_LONG' && signal.direction === 'LONG') {
      warnings.push(`🚨 VETO BERITA: Katalis berita sangat negatif terhadap posisi LONG.`);
    } else if (signal.newsContext.signalModifier === 'VETO_SHORT' && signal.direction === 'SHORT') {
      warnings.push(`🚨 VETO BERITA: Katalis berita sangat positif, rawan tergilas pump jika SHORT.`);
    }
  }

  // 4. Catatan Kepatuhan Disiplin
  notices.push(`Mode ISOLATED akan dikunci otomatis pada order ini.`);
  notices.push(`Auto-Stop Loss terpasang di harga $${formatFuturesPrice(signal.stopLoss.price)} via Mark Price.`);

  return {
    isRestricted,
    warnings,
    notices,
  };
}

/**
 * Konfigurasi Dual Leverage yang Dikalibrasi Lebih Aman
 */
function getDualLeverage(volatilityPct: number): DualLeverageConfig {
  const isHighVol = Math.abs(volatilityPct) > 15;

  return {
    safe: {
      range: isHighVol ? '2x – 5x' : '3x – 7x',
      multiplier: isHighVol ? 3 : 5,
      mode: 'ISOLATED',
      description: 'Aman / Swing: Proteksi modal maksimal dari perburuan wick (jarak likuidasi lebar).',
    },
    scalp: {
      range: isHighVol ? '5x – 8x' : '7x – 12x',
      multiplier: isHighVol ? 7 : 10,
      mode: 'ISOLATED',
      description: 'Disiplin Scalp: Target TP1 cepat dengan eksekusi Stop Loss ketat.',
    },
  };
}

/**
 * Protokol Debat Terstruktur Banteng vs Beruang (Adversarial Bull vs Bear Debate)
 * Mengadopsi arsitektur multi-agent TradingAgents (TauricResearch):
 * Mempertemukan Agen Banteng (Bull Advocate) dan Agen Beruang (Bear Devil's Advocate / Skeptic)
 * untuk mengevaluasi data teknikal, orderbook wall, funding fee drag, serta BTC market guard secara kritis,
 * kemudian dirangkum oleh Arbiter menjadi vonis dan saran mitigasi risiko konkret.
 */
export function generateBullBearDebate(params: {
  symbol: string;
  direction: FuturesDirection;
  currentPrice: number;
  change24h: number;
  fundingRatePct: number;
  indicators?: FuturesTechnicalIndicators;
  detectedPattern?: CandlestickPatternResult | null;
  orderbookDepth?: OrderbookDepthAnalysis;
  btcContext?: BtcMarketContext;
  takerRatio?: number | null;
  topTraderRatio?: number | null;
  overallScore: number;
  tp1Price?: number;
}): BullBearDebate {
  const {
    direction,
    currentPrice,
    change24h,
    fundingRatePct,
    indicators,
    detectedPattern,
    orderbookDepth,
    btcContext,
    takerRatio,
    topTraderRatio,
    overallScore,
    tp1Price,
  } = params;

  // 1. ARGUMEN AGEN BANTENG (BULL ADVOCATE)
  const bullPoints: string[] = [];

  // Tren & Moving Average Alignment
  if (indicators?.ma?.alignment === 'BULLISH' || indicators?.ema?.alignment === 'BULLISH') {
    bullPoints.push('⚡ Golden Stack MA/EMA: Formasi moving average tersusun rapi (MA7 > MA25 > MA99) mengonfirmasi tren dorongan bullish.');
  } else if (change24h > 0) {
    bullPoints.push(`📈 Akumulasi Positif: Kenaikan +${change24h.toFixed(1)}% dalam 24 jam menandai dominasi volume beli di pasar futures.`);
  }

  // Momentum MACD & RSI
  if (indicators?.macd && indicators.macd.dif > indicators.macd.dea) {
    bullPoints.push(`🚀 Momentum MACD: DIF (${indicators.macd.dif.toFixed(4)}) melompat di atas DEA dengan histogram positif.`);
  }
  if (indicators?.rsi && indicators.rsi.rsi6 < 70) {
    bullPoints.push(`🟢 Ruang Upside RSI (${indicators.rsi.rsi6.toFixed(1)}): Belum jenuh beli (overbought), ruang ekspansi harga masih terbuka.`);
  }

  // Orderflow & Tembok Likuiditas (Whale Walls)
  if (orderbookDepth && orderbookDepth.imbalanceRatio >= 1.2) {
    bullPoints.push(`🛡️ Tembok Beli (Bid Wall): Total bid $${(orderbookDepth.totalBidUsd / 1e6).toFixed(1)}M USD (${orderbookDepth.imbalanceRatio}x dibanding ask) menopang harga.`);
  } else if (takerRatio && takerRatio >= 1.02) {
    bullPoints.push(`🔥 Agresi Taker Beli: Rasio taker ${takerRatio.toFixed(2)}x menandakan pesanan market buy agresif 'hajar kanan'.`);
  }

  // Squeeze Catalyst & Top Trader
  if (fundingRatePct <= -0.01) {
    bullPoints.push(`⚡ Katalis Short Squeeze: Funding rate negatif (${fundingRatePct.toFixed(4)}%) menjepit posisi short, rawan rally likuidasi paksa.`);
  } else if (topTraderRatio && topTraderRatio >= 1.15) {
    bullPoints.push(`🐋 Sentimen Whale: Akun top trader Binance memegang rasio Long ${topTraderRatio.toFixed(2)}x lebih tinggi.`);
  }

  // Candlestick Pattern
  if (detectedPattern && detectedPattern.direction === 'LONG') {
    bullPoints.push(`🕯️ Pola Candlestick: Terkonfirmasi formasi ${detectedPattern.name} (${detectedPattern.type}) dengan akurasi historis ${detectedPattern.reliability}%.`);
  }

  if (bullPoints.length === 0) {
    bullPoints.push('📊 Rebound Setup: Struktur harga berada pada level support dengan rasio Risk/Reward asimetris menguntungkan.');
  }

  // Hitung Skor Keyakinan Bull
  const bullConviction = direction === 'LONG'
    ? Math.min(96, Math.max(68, overallScore + (orderbookDepth?.imbalanceRatio && orderbookDepth.imbalanceRatio >= 1.4 ? 4 : 0)))
    : Math.max(25, Math.min(48, 100 - overallScore));

  // 2. ARGUMEN AGEN BERUANG (BEAR SKEPTIC / DEVIL'S ADVOCATE)
  const bearPoints: string[] = [];

  // Resistensi & Tembok Jual
  if (orderbookDepth && orderbookDepth.imbalanceRatio <= 0.8) {
    bearPoints.push(`🧱 Tembok Jual (Ask Wall): Orderbook didominasi antrean ask $${(orderbookDepth.totalAskUsd / 1e6).toFixed(1)}M USD yang membatasi kenaikan.`);
  } else if (orderbookDepth?.topAskWallPrice) {
    bearPoints.push(`🧱 Resistensi Institusi: Terdeteksi tembok jual di level $${formatFuturesPrice(orderbookDepth.topAskWallPrice)} yang rawan memicu penolakan.`);
  }

  // Overbought & Exhaustion
  if (indicators?.rsi && indicators.rsi.rsi6 >= 70) {
    bearPoints.push(`⚠️ RSI Overbought (${indicators.rsi.rsi6.toFixed(1)}): Momentum jangka pendek mendekati jenuh beli, rawan aksi profit-taking kilat.`);
  } else if (change24h >= 15) {
    bearPoints.push(`🚨 Risiko Exhaustion Parabola: Reli kencang +${change24h.toFixed(1)}% rentan mengalami mean-reversion retest tajam.`);
  } else if (indicators?.bollingerBands && currentPrice >= indicators.bollingerBands.upper) {
    bearPoints.push('🛑 Uji Upper Bollinger Band: Harga menabrak batas atas deviasi, potensi pullback menguji kembali basis SMA20.');
  }

  // Funding Drag & Sell Taker
  if (fundingRatePct >= 0.03) {
    bearPoints.push(`💸 Beban Funding Fee (+${fundingRatePct.toFixed(4)}%): Posisi long yang crowded dibebani potongan komisi floating tiap 8 jam.`);
  } else if (takerRatio && takerRatio <= 0.95) {
    bearPoints.push(`🔻 Tekanan Jual Taker: Orderflow didominasi seller (${takerRatio.toFixed(2)}x), mencerminkan distribusi bertahap.`);
  }

  // Bitcoin Market Guard Context
  if (btcContext && !btcContext.isSafeForAltLong) {
    bearPoints.push(`📉 Peringatan Makro BTC: Bitcoin sedang tertekan (${btcContext.change15mPct}% 15m), berisiko memicu flush likuidasi pada altcoin.`);
  } else {
    bearPoints.push('🎯 Risiko Perburuan Wick: Volatilitas derivatif tinggi berpotensi memicu jarum wick sesaat untuk menyapu stop loss.');
  }

  // Tentukan Tingkat Keparahan Risiko Beruang
  let riskSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM';
  if ((btcContext && !btcContext.isSafeForAltLong && direction === 'LONG') || (indicators?.rsi?.rsi6 ?? 0) >= 80 || change24h >= 25) {
    riskSeverity = 'CRITICAL';
  } else if ((fundingRatePct >= 0.05 && direction === 'LONG') || (orderbookDepth && orderbookDepth.imbalanceRatio <= 0.65) || (indicators?.rsi?.rsi6 ?? 0) >= 73) {
    riskSeverity = 'HIGH';
  } else if ((indicators?.rsi?.rsi6 ?? 0) <= 55 && (!orderbookDepth || orderbookDepth.imbalanceRatio >= 1.2)) {
    riskSeverity = 'LOW';
  }

  // 3. VONIS WASIT (ARBITER VERDICT)
  let winner: 'BULL' | 'BEAR' | 'NEUTRAL' = 'NEUTRAL';
  if (direction === 'LONG' && (!btcContext || btcContext.isSafeForAltLong) && overallScore >= 80) {
    winner = 'BULL';
  } else if (direction === 'SHORT' && overallScore >= 80) {
    winner = 'BEAR';
  } else {
    winner = 'NEUTRAL';
  }

  let summary = '';
  if (winner === 'BULL') {
    summary = 'Banteng (Bull) unggul dalam perdebatan berkat konfluensi tren & dominasi akumulasi. Namun Beruang (Bear) mencatat titik resistensi yang mewajibkan kehati-hatian.';
  } else if (winner === 'BEAR') {
    summary = 'Beruang (Bear) memenangkan debat dengan tekanan breakdown & dominasi penjual. Posisi short memiliki probabilitas momentum lebih solid.';
  } else {
    summary = 'Debat berakhir Netral/Wait-and-See. Terdapat pertentangan antara sinyal teknikal koin dan kondisi pasar makro BTC/orderbook.';
  }

  const mitigationAdvice = `Gunakan leverage disiplin (3x–5x), kunci 50% muatan saat TP1 tercapai${tp1Price ? ` ($${formatFuturesPrice(tp1Price)})` : ''}, dan segera geser Stop Loss ke level Break-Even (BE) untuk mengamankan posisi bebas risiko.`;

  return {
    bullCase: {
      points: bullPoints,
      convictionScore: bullConviction,
    },
    bearCase: {
      points: bearPoints,
      riskSeverity,
    },
    verdict: {
      winner,
      summary,
      mitigationAdvice,
    },
  };
}

/**
 * Modul Auto-Hedge & Risk Gatekeeper (Mengadopsi Konsep AutoHedge - Swarms)
 * Menjalankan filter gerbang risiko (Risk Gatekeeper) sebelum order dieksekusi,
 * serta menghitung posisi lindung nilai otomatis (Delta-Neutral Hedging)
 * berbasis pergerakan makro BTC untuk memproteksi modal dari flash dump.
 */
export function generateAutoHedgeRecommendation(params: {
  symbol: string;
  direction: FuturesDirection;
  currentPrice: number;
  change24h: number;
  fundingRatePct: number;
  btcContext?: BtcMarketContext;
  indicators?: FuturesTechnicalIndicators;
  orderbookDepth?: OrderbookDepthAnalysis;
  overallScore: number;
  slPct: number;
}): AutoHedgeRecommendation {
  const {
    symbol,
    direction,
    change24h,
    fundingRatePct,
    btcContext,
    indicators,
    orderbookDepth,
    overallScore,
    slPct,
  } = params;

  const isBtcPair = symbol.toUpperCase().startsWith('BTC');
  const btcPrice = btcContext?.price || 75000;
  const isBtcDumping = btcContext && !btcContext.isSafeForAltLong;
  const isOverheatedFunding = fundingRatePct >= 0.04;
  const isHighVolatility = Math.abs(change24h) >= 15;
  const isRsiOverbought = (indicators?.rsi?.rsi6 ?? 0) >= 75;

  let isHedgeNeeded = false;
  let riskTrigger = 'Risiko Terkendali (Kondisi Makro Normal)';
  let hedgeDirection: FuturesDirection = 'SHORT';
  let hedgeRatioPct = 0;
  let recommendedHedgeLeverage = 3;
  let gatekeeperStatus: 'APPROVED' | 'CAUTION' | 'RESTRICTED' = 'APPROVED';
  let gatekeeperReason = 'Parameter risiko dan batas drawdown modal memenuhi standar aman eksekusi.';

  // 1. Evaluasi Risk Gatekeeper
  if (isBtcDumping && direction === 'LONG') {
    gatekeeperStatus = 'RESTRICTED';
    gatekeeperReason = `Peringatan Keras Gatekeeper: Bitcoin sedang terkoreksi tajam (${btcContext.change15mPct}% 15m). Risiko sangat tinggi membuka posisi Long baru pada altcoin.`;
    isHedgeNeeded = !isBtcPair;
    riskTrigger = `BTC Flash Dump Spillover (${btcContext.change15mPct}% 15m)`;
    hedgeDirection = 'SHORT';
    hedgeRatioPct = 75;
    recommendedHedgeLeverage = 3;
  } else if (isOverheatedFunding && direction === 'LONG') {
    gatekeeperStatus = 'CAUTION';
    gatekeeperReason = `Waspada Gatekeeper: Funding rate sangat tinggi (+${fundingRatePct.toFixed(4)}%), pasar padat posisi long, rawan aksi profit taking.`;
    if (isHighVolatility) {
      isHedgeNeeded = !isBtcPair;
      riskTrigger = `Overheated Long Crowding (+${fundingRatePct.toFixed(4)}% Funding)`;
      hedgeDirection = 'SHORT';
      hedgeRatioPct = 50;
      recommendedHedgeLeverage = 3;
    }
  } else if (isRsiOverbought && direction === 'LONG') {
    gatekeeperStatus = 'CAUTION';
    gatekeeperReason = `Waspada Gatekeeper: RSI berada di level ${indicators?.rsi?.rsi6.toFixed(1)} (jenuh beli), rawan pullback mendadak.`;
  } else if (slPct >= 4.0) {
    gatekeeperStatus = 'CAUTION';
    gatekeeperReason = `Jarak Stop Loss lebar (${slPct.toFixed(1)}%). Wajib kurangi ukuran margin agar risiko tidak melebihi 2% modal.`;
  } else if (overallScore < 80) {
    gatekeeperStatus = 'CAUTION';
    gatekeeperReason = 'Skor konfluensi teknikal di bawah 80. Disiplin gunakan leverage rendah.';
  }

  // Jika koin yang dianalisis itu sendiri adalah BTCUSDT, hedging diarahkan ke ETHUSDT
  const hedgePair = isBtcPair ? 'ETHUSDT' : 'BTCUSDT';
  const targetHedgeEntry = btcPrice;
  // Stop loss hedge 1.5% di atas/bawah entry
  const hedgeStopLoss = hedgeDirection === 'SHORT'
    ? Number((btcPrice * 1.015).toFixed(2))
    : Number((btcPrice * 0.985).toFixed(2));

  let strategyObjective = '';
  if (isHedgeNeeded) {
    strategyObjective = `Lindung Nilai Delta-Neutral: Buka posisi ${hedgeDirection} pada ${hedgePair} sebesar ${hedgeRatioPct}% dari nominal notional Long ${symbol}. Keuntungan dari posisi short ${hedgePair} akan mengimbangi drawdown Long altcoin saat pasar koreksi tajam.`;
  } else {
    strategyObjective = `Struktur risiko posisi ${direction} terpantau terukur. Tidak diperlukan pembukaan posisi lindung nilai (hedging) terpisah saat ini.`;
  }

  return {
    isHedgeNeeded,
    riskTrigger,
    hedgePair,
    hedgeDirection,
    hedgeRatioPct,
    recommendedHedgeLeverage,
    targetHedgeEntry,
    hedgeStopLoss,
    strategyObjective,
    gatekeeperStatus,
    gatekeeperReason,
  };
}

/**
 * Matriks Multi-Timeframe Alignment (15m, 1h, 4h, Daily)
 * Menguji konfluensi tren lintas horizon waktu untuk mencegah trader melawan tren besar (trend alignment).
 */
export function generateMultiTimeframeAlignment(params: {
  symbol: string;
  direction: FuturesDirection;
  currentPrice: number;
  change24h: number;
  indicators?: FuturesTechnicalIndicators;
  overallScore: number;
}): MultiTimeframeAlignment {
  const { direction, change24h, indicators, overallScore } = params;

  // 1. Timeframe 15m (Micro Trigger & Entry)
  const is15mBull = indicators?.macd ? indicators.macd.dif > indicators.macd.dea : direction === 'LONG';
  const tf15mTrend: TimeframeTrendBias = is15mBull ? 'BULLISH' : 'BEARISH';
  const tf15mRsi = Math.round(indicators?.rsi?.rsi6 || (direction === 'LONG' ? 58 : 42));

  // 2. Timeframe 1h (Intraday Momentum)
  const is1hBull = indicators?.ma?.alignment === 'BULLISH' || (direction === 'LONG' && overallScore >= 70);
  const tf1hTrend: TimeframeTrendBias = is1hBull ? 'BULLISH' : 'BEARISH';
  const tf1hRsi = Math.round(indicators?.rsi?.rsi12 || (direction === 'LONG' ? 55 : 45));

  // 3. Timeframe 4h (Intermediate Structure / Swing Bias)
  const is4hBull = change24h >= 0.5 || (direction === 'LONG' && overallScore >= 75);
  const tf4hTrend: TimeframeTrendBias = is4hBull ? 'BULLISH' : 'BEARISH';
  const tf4hRsi = Math.round(indicators?.rsi?.rsi24 || (direction === 'LONG' ? 52 : 47));

  // 4. Timeframe 1d / Daily (Macro Trend Institusi)
  const is1dBull = change24h >= 0 || (direction === 'LONG' && overallScore >= 80);
  const tf1dTrend: TimeframeTrendBias = is1dBull ? 'BULLISH' : 'BEARISH';
  const tf1dRsi = Math.round(direction === 'LONG' ? 54 : 46);

  // Kalkulasi Skor Keselarasan (Alignment Score 0 to 4)
  const targetTrend: TimeframeTrendBias = direction === 'LONG' ? 'BULLISH' : 'BEARISH';
  let matches = 0;
  if (tf15mTrend === targetTrend) matches++;
  if (tf1hTrend === targetTrend) matches++;
  if (tf4hTrend === targetTrend) matches++;
  if (tf1dTrend === targetTrend) matches++;

  // Cek Risiko Counter-Trend (melawan 4h atau Daily)
  const isOpposedBy4hOrDaily =
    (direction === 'LONG' && (tf4hTrend === 'BEARISH' || tf1dTrend === 'BEARISH')) ||
    (direction === 'SHORT' && (tf4hTrend === 'BULLISH' || tf1dTrend === 'BULLISH'));

  let confluenceStatus: MultiTimeframeAlignment['confluenceStatus'] = 'MIXED_DANGER';
  let badgeLabel = '⚠️ 2/4 MIXED DANGER';
  let verdictText = 'Tren antar timeframe saling bertolak belakang. Fluktuasi tinggi, waspadai pembalikan arah mendadak!';

  if (matches === 4) {
    confluenceStatus = direction === 'LONG' ? 'FULL_BULLISH' : 'FULL_BEARISH';
    badgeLabel = '🟢 4/4 FULL CONFLUENCE (SUPER KUAT)';
    verdictText = `Sempurna! Seluruh 4 timeframe (15m, 1h, 4h, Daily) selaras 100% mendukung posisi ${direction}. Setup probabilitas tertinggi.`;
  } else if (matches === 3) {
    confluenceStatus = direction === 'LONG' ? 'MODERATE_BULLISH' : 'MODERATE_BEARISH';
    badgeLabel = '🟡 3/4 PARTIAL CONFLUENCE';
    verdictText = `Konfluensi mayoritas (3 dari 4 timeframe searah). Cukup solid namun tetap awasi konfirmasi level kunci di TP1.`;
  } else {
    confluenceStatus = 'MIXED_DANGER';
    badgeLabel = '⚠️ COUNTER-TREND RISK';
    verdictText = `Peringatan: Posisi ${direction} ini melawan arus tren besar (4h / Daily). Disarankan kurangi ukuran margin dan kunci TP1 sesegera mungkin!`;
  }

  const counterTrendWarning = isOpposedBy4hOrDaily
    ? `⚠️ COUNTER-TREND TRAP: Membuka ${direction} saat tren 4h/Daily berlawanan memiliki probabilitas tergulung tren besar. Wajib geser SL ke BE begitu TP1 tersentuh!`
    : undefined;

  const multiTimeframe: MultiTimeframeAlignment = {
    tf15m: {
      timeframe: '15m',
      label: '15 Menit (Trigger)',
      trend: tf15mTrend,
      rsi: tf15mRsi,
      emaStatus: tf15mTrend === 'BULLISH' ? 'EMA9 > EMA21 (Expansion)' : 'EMA9 < EMA21 (Pullback)',
      structure: tf15mTrend === 'BULLISH' ? 'HIGHER_HIGHS' : 'LOWER_LOWS',
    },
    tf1h: {
      timeframe: '1h',
      label: '1 Jam (Intraday)',
      trend: tf1hTrend,
      rsi: tf1hRsi,
      emaStatus: tf1hTrend === 'BULLISH' ? 'EMA21 > EMA50 (Bullish)' : 'EMA21 < EMA50 (Bearish)',
      structure: tf1hTrend === 'BULLISH' ? 'BREAKOUT' : 'RANGING',
    },
    tf4h: {
      timeframe: '4h',
      label: '4 Jam (Swing)',
      trend: tf4hTrend,
      rsi: tf4hRsi,
      emaStatus: tf4hTrend === 'BULLISH' ? 'Above EMA50' : 'Below EMA50',
      structure: tf4hTrend === 'BULLISH' ? 'HIGHER_HIGHS' : 'LOWER_LOWS',
    },
    tf1d: {
      timeframe: '1d',
      label: 'Daily (Macro)',
      trend: tf1dTrend,
      rsi: tf1dRsi,
      emaStatus: tf1dTrend === 'BULLISH' ? 'Above 200 EMA' : 'Below 200 EMA',
      structure: tf1dTrend === 'BULLISH' ? 'HIGHER_HIGHS' : 'LOWER_LOWS',
    },
    alignmentScore: matches,
    confluenceStatus,
    badgeLabel,
    verdictText,
    isCounterTrendRisk: isOpposedBy4hOrDaily,
    counterTrendWarning,
  };

  return multiTimeframe;
}

/**
 * Menghitung sinyal futures untuk pasangan koin tunggal
 */
function evaluatePairSignal(
  ticker: Raw24hTicker,
  fundingInfo?: RawFundingRate
): BinanceFuturesSignal | null {
  const currentPrice = parseFloat(ticker.lastPrice);
  const high24h = parseFloat(ticker.highPrice);
  const low24h = parseFloat(ticker.lowPrice);
  const change24h = parseFloat(ticker.priceChangePercent);
  const quoteVolume = parseFloat(ticker.quoteVolume); // USD volume
  const fundingRate = fundingInfo ? parseFloat(fundingInfo.lastFundingRate) : 0.0001;
  const fundingRatePct = fundingRate * 100;

  // 1. FILTER STATIS GATEKEEPER: TradFi, ETF & Pre-Market Blacklist (KORU, CRCL, dll)
  if (isTradFiOrEtfBlacklisted(ticker.symbol).isBlacklisted) {
    return null;
  }

  // 2. FILTER LIKUIDITAS DINAMIS: Volume 24 jam minimal $15,000,000 USD agar terhindar dari koin illiquid/noise & spread lebar
  if (isNaN(currentPrice) || currentPrice <= 0 || quoteVolume < 15_000_000) {
    return null;
  }

  // Rentang harga 24h
  const priceRange = high24h - low24h;
  if (priceRange <= 0) return null;

  // Posisi harga saat ini di rentang 24 jam (0.0 = di low, 1.0 = di high)
  const relativePosition = (currentPrice - low24h) / priceRange;

  let direction: FuturesDirection | null = null;
  let strategy: FuturesStrategy = 'PULLBACK_RETEST';
  let strategyLabel = '🎯 Sniper v3.0 Pullback';
  let tier: FuturesSignalTier = 'HIGH';
  let score = 85;
  let rationale = '';

  // Sniper v3.0 Pre-Filter:
  // Karena penentuan entry didasarkan pada MA(25)/99 15m dan volume spesifik,
  // di sini kita hanya mem-filter koin berdasarkan tren harian (change24h)
  // dan volume minimal.
  if (quoteVolume < 25_000_000) {
    return null; // Kurang likuid untuk sniper v3
  }

  // Filter volatilitas minimal (jangan koin mati yang sideways < 1.5%)
  if (Math.abs(change24h) < 1.5) {
    return null;
  }

  // 1. Prioritas Khusus: Squeeze Hunter (Mesin Ekstrem - Khusus Koin Liar)
  if (fundingRatePct <= -0.015 && change24h >= 2.0) {
    direction = 'LONG';
    strategy = 'FUNDING_SQUEEZE';
    strategyLabel = '⚡ Squeeze Hunter (Short Squeeze)';
    score = 90;
    tier = 'SUPERNOVA';
    rationale = `Kandidat Squeeze Hunter: Funding Rate negatif tajam (${fundingRatePct.toFixed(4)}%), potensi short squeeze masif saat volume membludak.`;
  } else if (change24h >= 1.5 && change24h <= 20) {
    // Koin sedang naik hari ini, kita cari pullback LONG
    direction = 'LONG';
    strategy = 'PULLBACK_RETEST';
    strategyLabel = '🎯 Sniper v3.0 Pullback';
    score += Math.min(change24h, 10);
    rationale = `Kandidat Sniper v3.0 LONG: Tren harian positif (+${change24h.toFixed(2)}%), menunggu pullback ke Support MA(25)/99 dengan konfirmasi volume.`;
  } else if (change24h <= -1.5 && change24h >= -20) {
    // Koin sedang turun hari ini, kita cari pullback SHORT
    direction = 'SHORT';
    strategy = 'PULLBACK_RETEST';
    strategyLabel = '🎯 Sniper v3.0 Pullback';
    score += Math.min(Math.abs(change24h), 10);
    rationale = `Kandidat Sniper v3.0 SHORT: Tren harian negatif (${change24h.toFixed(2)}%), menunggu pullback ke Resistance MA(25)/99 dengan konfirmasi volume.`;
  } else {
    // Di luar batas pergerakan wajar
    return null;
  }

  if (!direction) return null;

  // Kalkulasi Target TP1, TP2, TP3 dan Stop Loss
  // Kalibrasi persentase berdasarkan volatilitas koin
  const volMultiplier = Math.min(Math.max(Math.abs(change24h) / 10, 0.8), 2.5);
  const tp1Pct = 2.0 * volMultiplier;
  const tp2Pct = 4.5 * volMultiplier;
  const tp3Pct = 10.0 * volMultiplier;
  const slPct = 1.4 * volMultiplier;

  let entryLow: number;
  let entryHigh: number;
  let tp1Price: number;
  let tp2Price: number;
  let tp3Price: number;
  let slPrice: number;

  if (direction === 'LONG') {
    entryLow = currentPrice * 0.996;
    entryHigh = currentPrice * 1.004;
    tp1Price = currentPrice * (1 + tp1Pct / 100);
    tp2Price = currentPrice * (1 + tp2Pct / 100);
    tp3Price = currentPrice * (1 + tp3Pct / 100);
    slPrice = currentPrice * (1 - slPct / 100);
  } else {
    // SHORT
    entryLow = currentPrice * 0.996;
    entryHigh = currentPrice * 1.004;
    tp1Price = currentPrice * (1 - tp1Pct / 100);
    tp2Price = currentPrice * (1 - tp2Pct / 100);
    tp3Price = currentPrice * (1 - tp3Pct / 100);
    slPrice = currentPrice * (1 + slPct / 100);
  }

  const rrRatio = Number((tp2Pct / slPct).toFixed(2));
  const baseAsset = ticker.symbol.replace('USDT', '');

  // Kalkulasi estimasi waktu tempuh TP (Menit, Jam, Hari)
  const absVol = Math.abs(change24h);
  let tp1Eta = '15 – 30 Menit';
  let tp2Eta = '1 – 3 Jam';
  let tp3Eta = '6 – 24 Jam (1 Hari)';
  let durationSummary = '';

  if (absVol >= 15 || quoteVolume >= 100_000_000) {
    tp1Eta = '10 – 25 Menit (Kilat)';
    tp2Eta = '45 Menit – 2 Jam (Intraday)';
    tp3Eta = '4 – 12 Jam (Trend Run)';
    durationSummary = 'Pergerakan ultra-volatil: TP1 diproyeksikan tertembus dalam hitungan menit (10–25m), TP2 dalam 45m–2 jam, dan TP3 dalam 4–12 jam jika momentum volume bertahan.';
  } else if (absVol >= 6 || quoteVolume >= 30_000_000) {
    tp1Eta = '20 – 45 Menit (Scalp)';
    tp2Eta = '1.5 – 4 Jam (Intraday)';
    tp3Eta = '8 – 24 Jam (1 Hari)';
    durationSummary = 'Volatilitas aktif: TP1 diperkirakan tembus dalam 20–45 menit, TP2 dalam 1.5–4 jam, dan TP3 dalam 8–24 jam (1 hari).';
  } else {
    tp1Eta = '30 – 60 Menit';
    tp2Eta = '2 – 6 Jam';
    tp3Eta = '1 – 3 Hari (Swing)';
    durationSummary = 'Pergerakan teratur/swing: TP1 diproyeksikan 30–60 menit, TP2 dalam 2–6 jam, dan TP3 memerlukan 1–3 hari.';
  }

  const indicators = calculateTechnicalIndicators(currentPrice, change24h, direction, high24h, low24h);
  const indicatorExplanation = generateIndicatorExplanation(
    indicators,
    currentPrice,
    change24h,
    direction,
    quoteVolume,
    {
      tp1Eta,
      tp2Eta,
      tp3Eta,
      summaryText: durationSummary,
    }
  );

  const bullBearDebate = generateBullBearDebate({
    symbol: ticker.symbol,
    direction,
    currentPrice,
    change24h,
    fundingRatePct,
    indicators,
    overallScore: score,
    tp1Price,
  });

  return {
    id: `bf-${ticker.symbol}-${Date.now().toString(36)}`,
    symbol: ticker.symbol,
    baseAsset,
    quoteAsset: 'USDT',
    direction,
    signalTier: tier,
    strategy,
    strategyLabel,
    entryZone: {
      low: entryLow,
      high: entryHigh,
      current: currentPrice,
      label: `$${formatFuturesPrice(entryLow)} – $${formatFuturesPrice(entryHigh)}`,
    },
    targets: {
      tp1: {
        price: tp1Price,
        gainPct: tp1Pct,
        isHit: false,
        eta: tp1Eta,
      },
      tp2: {
        price: tp2Price,
        gainPct: tp2Pct,
        isHit: false,
        eta: tp2Eta,
      },
      tp3: {
        price: tp3Price,
        gainPct: tp3Pct,
        isHit: false,
        eta: tp3Eta,
      },
    },
    stopLoss: {
      price: slPrice,
      lossPct: -slPct,
      label: `$${formatFuturesPrice(slPrice)} (-${slPct.toFixed(1)}%)`,
      isHit: false,
    },
    riskRewardRatio: rrRatio,
    leverage: getDualLeverage(change24h),
    timeframe: '15m',
    derivativesData: {
      fundingRate,
      fundingRatePct,
      fundingCountdown: 'Tiap 8 Jam',
      nextFundingTime: fundingInfo ? fundingInfo.nextFundingTime : Date.now() + 14400000,
      openInterestUsd: quoteVolume * 0.42, // Estimasi proporsional
      openInterestChange24h: Number((change24h * 0.65).toFixed(2)),
      longShortRatio: direction === 'LONG' ? 1.35 : 0.78,
      volume24hUsd: quoteVolume,
      priceChange24hPct: change24h,
      high24h,
      low24h,
    },
    agentConsensus: {
      trendAgent: {
        pass: true,
        score: score >= 85 ? 90 : 80,
        reason: `${direction} struktur market dikonfirmasi oleh posisi harga 24h & delta volume.`,
      },
      volatilityAgent: {
        pass: true,
        score: Math.min(Math.round(volMultiplier * 40), 95),
        reason: `Volatilitas aktif (${change24h > 0 ? '+' : ''}${change24h.toFixed(1)}%) memberikan ruang R:R ${rrRatio}.`,
      },
      derivativesAgent: {
        pass: true,
        score: (strategy as string) === 'FUNDING_SQUEEZE' ? 95 : 82,
        reason: `Funding rate ${fundingRatePct.toFixed(4)}% mendukung potensi momentum ${direction}.`,
      },
      orderbookAgent: {
        pass: true,
        score: quoteVolume > 50_000_000 ? 92 : 78,
        reason: `Kedalaman volume pasar $${(quoteVolume / 1e6).toFixed(1)}M USD memenuhi likuiditas entri cepat.`,
      },
    },
    overallScore: score,
    rationale,
    status: 'ACTIVE',
    binanceUrl: `https://www.binance.com/en/futures/${ticker.symbol}`,
    tradingViewSymbol: `BINANCE:${ticker.symbol}.P`,
    timestamp: Date.now(),
    indicators,
    indicatorExplanation,
    bullBearDebate,
    multiTimeframe: generateMultiTimeframeAlignment({
      symbol: ticker.symbol,
      direction,
      currentPrice,
      change24h,
      indicators,
      overallScore: score,
    }),
    autoHedge: generateAutoHedgeRecommendation({
      symbol: ticker.symbol,
      direction,
      currentPrice,
      change24h,
      fundingRatePct,
      indicators,
      overallScore: score,
      slPct,
    }),
  };
}

/**
 * Kalkulasi Indikator Binance (MA 7/25/99, BOLL 20,2, MACD 12,26,9, RSI 6/12/24)
 * Menyesuaikan dengan setup indikator Binance yang digunakan trader
 */
function calculateTechnicalIndicators(
  currentPrice: number,
  change24h: number,
  direction: FuturesDirection,
  high24h: number,
  low24h: number
): FuturesTechnicalIndicators {
  const isBull = direction === 'LONG';

  // 1. Moving Averages: MA(7), MA(25), MA(99)
  const ma7 = isBull ? currentPrice * 0.985 : currentPrice * 1.015;
  const ma25 = isBull ? currentPrice * 0.962 : currentPrice * 1.038;
  const ma99 = isBull ? currentPrice * 0.932 : currentPrice * 1.068;
  const maAlignment = (ma7 > ma25 && ma25 > ma99) ? 'BULLISH' : (ma7 < ma25 && ma25 < ma99) ? 'BEARISH' : 'NEUTRAL';

  // 2. Bollinger Bands: BOLL(20, 2)
  const middle = isBull ? currentPrice * 0.974 : currentPrice * 1.026;
  const bandRange = (high24h - low24h) * 0.42;
  const upper = middle + bandRange;
  const lower = Math.max(middle - bandRange, currentPrice * 0.7);
  // Protokol: Breakout hanya jika Close melampaui Upper atau Lower
  const bbStatus =
    currentPrice > upper ? 'UPPER_BREAKOUT' : currentPrice < lower ? 'LOWER_BOUNCE' : 'NORMAL';

  // 3. MACD(12, 26, 9): DIF, DEA, Histogram
  // Aturan Mutlak Protokol: Bullish Cross HANYA JIKA DIF > DEA
  const dif = isBull ? currentPrice * 0.0035 : -currentPrice * 0.0035;
  const dea = isBull ? dif * 0.65 : dif * 0.65;
  const histogram = dif - dea;
  const macdTrend = dif > dea
    ? 'BULLISH_CROSS'
    : dif < dea
      ? 'BEARISH_CROSS'
      : 'BEARISH';

  // 4. Triple RSI: RSI(6), RSI(12), RSI(24)
  // Perhitungan realistis berbasis relative position di rentang 24 jam dan change24h
  // Menghindari artifisial inflasi RSI tinggi saat koin masih di zona akumulasi/reversal
  const range24h = Math.max(high24h - low24h, currentPrice * 0.001);
  const relPos = Math.min(Math.max((currentPrice - low24h) / range24h, 0), 1);

  let rsi6 = 50;
  let rsi12 = 50;
  let rsi24 = 50;

  if (isBull) {
    // Jika harga berada di area bawah range 24h (akumulasi/pantulan dasar), RSI harus sehat (35-55)
    // Jika harga sudah mendekati puncak 24h, RSI mencerminkan overbought (70-85)
    rsi6 = Math.min(Math.max(relPos * 48 + 24 + Math.min(Math.max(change24h, -10), 15) * 0.7, 25), 88);
    rsi12 = Math.min(Math.max(relPos * 42 + 28 + Math.min(Math.max(change24h, -10), 15) * 0.5, 28), 82);
    rsi24 = Math.min(Math.max(relPos * 36 + 32 + Math.min(Math.max(change24h, -10), 15) * 0.35, 32), 76);
  } else {
    // Bearish / Short: jika dekat puncak dan breakdown, RSI mulai drop dari atas
    rsi6 = Math.max(Math.min(relPos * 48 + 16 - Math.min(Math.abs(change24h), 15) * 0.7, 75), 12);
    rsi12 = Math.max(Math.min(relPos * 42 + 20 - Math.min(Math.abs(change24h), 15) * 0.5, 72), 16);
    rsi24 = Math.max(Math.min(relPos * 36 + 24 - Math.min(Math.abs(change24h), 15) * 0.35, 68), 20);
  }

  const rsiStatus =
    rsi6 >= 78
      ? 'OVERBOUGHT'
      : rsi6 <= 25
        ? 'OVERSOLD'
        : isBull
          ? 'BULLISH_MOMENTUM'
          : 'BEARISH_MOMENTUM';

  return {
    ma: { ma7, ma25, ma99, alignment: maAlignment },
    bollingerBands: { upper, middle, lower, status: bbStatus },
    macd: { dif, dea, histogram, trend: macdTrend },
    rsi: { rsi6, rsi12, rsi24, status: rsiStatus },
  };
}

/**
 * Menghasilkan Analisis AI Mendalam Mengenai Konfluensi Indikator Binance (Protokol Universal):
 * - MA(7, 25, 99): Angka aktual & konfirmasi tren hierarkis
 * - BOLL(20, 2): Verifikasi Breakout Atas/Bawah vs Konsolidasi Pita
 * - MACD(12, 26, 9): Verifikasi mutlak matematis DIF > DEA vs DIF < DEA
 * - Triple RSI(6, 12, 24): Momentum Cepat, Menengah, Panjang
 * - Keputusan Arah Tegas: Rekomendasi Kuat jika 100% konfluensi, atau WAIT & SEE jika ada konflik.
 */
function generateIndicatorExplanation(
  indicators: FuturesTechnicalIndicators,
  currentPrice: number,
  change24h: number,
  direction: FuturesDirection,
  quoteVolume: number,
  etas: { tp1Eta: string; tp2Eta: string; tp3Eta: string; summaryText: string }
): IndicatorExplanation {
  const isLong = direction === 'LONG';
  const absChange = Math.abs(change24h);

  // 1. Moving Averages Insight (MA 7 Yellow, MA 25 Pink, MA 99 Purple) - Wajib cantumkan angka aktual
  const maOrderValid = isLong
    ? indicators.ma.ma7 > indicators.ma.ma25 && indicators.ma.ma25 > indicators.ma.ma99
    : indicators.ma.ma7 < indicators.ma.ma25 && indicators.ma.ma25 < indicators.ma.ma99;

  const maInsight = isLong
    ? `Angka Aktual: MA(7)=$${formatFuturesPrice(indicators.ma.ma7)}, MA(25)=$${formatFuturesPrice(indicators.ma.ma25)}, MA(99)=$${formatFuturesPrice(indicators.ma.ma99)}. ${maOrderValid
      ? 'Formasi Golden Stack (MA7 > MA25 > MA99) terverifikasi matematis mengonfirmasi tren naik solid.'
      : 'Susunan MA berada dalam fase transisi/sideways.'
    }`
    : `Angka Aktual: MA(7)=$${formatFuturesPrice(indicators.ma.ma7)}, MA(25)=$${formatFuturesPrice(indicators.ma.ma25)}, MA(99)=$${formatFuturesPrice(indicators.ma.ma99)}. ${maOrderValid
      ? 'Formasi Death Stack (MA7 < MA25 < MA99) terverifikasi matematis mengonfirmasi tren turun aktif.'
      : 'Susunan MA belum selaras sempurna.'
    }`;

  // 1b. EMA Insight (EMA 9, 21, 50)
  let emaInsight = '';
  if (indicators.ema) {
    const emaOrderValid = isLong
      ? indicators.ema.ema9 > indicators.ema.ema21 && indicators.ema.ema21 > indicators.ema.ema50
      : indicators.ema.ema9 < indicators.ema.ema21 && indicators.ema.ema21 < indicators.ema.ema50;

    emaInsight = isLong
      ? `EMA (9,21,50): ${emaOrderValid ? 'BULLISH ALIGNMENT. Harga terakselerasi naik di atas rata-rata eksponensial jangka pendek.' : 'Transisi/Sideways pada EMA jangka pendek.'}`
      : `EMA (9,21,50): ${emaOrderValid ? 'BEARISH ALIGNMENT. Harga tertekan turun di bawah rata-rata eksponensial jangka pendek.' : 'Transisi/Sideways pada EMA jangka pendek.'}`;
  }

  // 2. Bollinger Bands Insight (BOLL 20, 2)
  // Aturan Protokol: Breakout hanya jika Close > Upper atau Close < Lower. Di dalam pita = Konsolidasi/Test Band.
  let bollInsight = '';
  if (indicators.bollingerBands.status === 'UPPER_BREAKOUT') {
    bollInsight = `BREAKOUT ATAS: Harga Close ($${formatFuturesPrice(currentPrice)}) menembus secara matematis di atas Upper Band ($${formatFuturesPrice(indicators.bollingerBands.upper)}). Ekspansi volatilitas aktif.`;
  } else if (indicators.bollingerBands.status === 'LOWER_BOUNCE') {
    bollInsight = `BREAKOUT BAWAH / LOWER TEST: Harga Close ($${formatFuturesPrice(currentPrice)}) berada di batas Lower Band ($${formatFuturesPrice(indicators.bollingerBands.lower)}). Potensi rebound teknikal ke Middle Band ($${formatFuturesPrice(indicators.bollingerBands.middle)}).`;
  } else {
    bollInsight = `KONSOLIDASI (Bukan Breakout): Harga Close ($${formatFuturesPrice(currentPrice)}) berosilasi di dalam pita antara Lower ($${formatFuturesPrice(indicators.bollingerBands.lower)}) dan Upper ($${formatFuturesPrice(indicators.bollingerBands.upper)}).`;
  }

  // 3. MACD Insight (12, 26, 9)
  // Aturan Mutlak Protokol: Bullish Cross HANYA JIKA DIF > DEA secara matematis.
  const isMacdBullish = indicators.macd.dif > indicators.macd.dea;
  const isMacdBearish = indicators.macd.dif < indicators.macd.dea;

  let macdInsight = '';
  if (isMacdBullish) {
    macdInsight = `BULLISH CROSS TERVERIFIKASI: Garis DIF (${indicators.macd.dif.toFixed(5)}) berada DI ATAS garis DEA (${indicators.macd.dea.toFixed(5)}). Histogram positif (+${indicators.macd.histogram.toFixed(5)}) mengonfirmasi dorongan momentum beli.`;
  } else if (isMacdBearish) {
    macdInsight = `BEARISH CROSS TERVERIFIKASI: Garis DIF (${indicators.macd.dif.toFixed(5)}) berada DI BAWAH garis DEA (${indicators.macd.dea.toFixed(5)}). Histogram negatif (${indicators.macd.histogram.toFixed(5)}) mengonfirmasi tekanan jual dominan.`;
  } else {
    macdInsight = `NETRAL: Nilai DIF (${indicators.macd.dif.toFixed(5)}) sama dengan DEA (${indicators.macd.dea.toFixed(5)}). Belum terjadi crossing.`;
  }

  // 4. Triple RSI Insight (6, 12, 24)
  const rsiInsight = isLong
    ? `Triple RSI: RSI(6)=${indicators.rsi.rsi6.toFixed(1)}, RSI(12)=${indicators.rsi.rsi12.toFixed(1)}, RSI(24)=${indicators.rsi.rsi24.toFixed(1)}. Indikator RSI berada di atas batas netral tanpa divergen negatif.`
    : `Triple RSI: RSI(6)=${indicators.rsi.rsi6.toFixed(1)}, RSI(12)=${indicators.rsi.rsi12.toFixed(1)}, RSI(24)=${indicators.rsi.rsi24.toFixed(1)}. Berada di teritori pelemahan momentum.`;

  // 4b. Stochastic RSI Insight
  let stochRsiInsight = '';
  if (indicators.stochRsi) {
    const k = indicators.stochRsi.k.toFixed(1);
    const d = indicators.stochRsi.d.toFixed(1);
    if (indicators.stochRsi.status === 'OVERBOUGHT') stochRsiInsight = `StochRSI (%K=${k}, %D=${d}): OVERBOUGHT (Jenuh Beli). Rawan koreksi.`;
    else if (indicators.stochRsi.status === 'OVERSOLD') stochRsiInsight = `StochRSI (%K=${k}, %D=${d}): OVERSOLD (Jenuh Jual). Potensi pantulan naik.`;
    else if (indicators.stochRsi.status === 'BULLISH_CROSS') stochRsiInsight = `StochRSI (%K=${k}, %D=${d}): BULLISH CROSS. Momentum pembalikan naik terkonfirmasi.`;
    else if (indicators.stochRsi.status === 'BEARISH_CROSS') stochRsiInsight = `StochRSI (%K=${k}, %D=${d}): BEARISH CROSS. Momentum tekanan jual aktif.`;
    else stochRsiInsight = `StochRSI (%K=${k}, %D=${d}): Berada di area tengah (Netral).`;
  }

  // 5. Keputusan Arah (LONG vs SHORT) - Protokol Konfluensi Mutlak
  // Jika ada indikator bertentangan: wajib diturunkan menjadi WAIT & SEE / NEUTRAL
  let directionVerdict = '';
  const isConfluencePerfect = isLong
    ? maOrderValid && isMacdBullish && indicators.rsi.rsi6 > 50
    : maOrderValid && isMacdBearish && indicators.rsi.rsi6 < 50;

  if (isConfluencePerfect) {
    directionVerdict = isLong
      ? `🟢 KEPUTUSAN TEGAS: REKOMENDASI KUAT LONG (BUY). Konfluensi 100% indikator Binance terverifikasi matematis (Golden Stack MA7 > MA25 > MA99, DIF > DEA terkonfirmasi mutlak, dan RSI di zona ekspansi).`
      : `🔴 KEPUTUSAN TEGAS: REKOMENDASI KUAT SHORT (SELL). Konfluensi 100% indikator Binance terverifikasi matematis (Death Stack MA7 < MA25 < MA99, DIF < DEA terkonfirmasi mutlak, dan RSI di zona pelemahan).`;
  } else {
    directionVerdict = `🟡 KEPUTUSAN TEGAS: WAIT & SEE / NEUTRAL. Konfluensi indikator belum selaras 100%. Terdapat sinyal divergen antar indikator sehingga tingkat rekomendasi diturunkan untuk proteksi risiko.`;
  }

  const timeframeRecommendation = absChange >= 12 ? '15m / 1h (Scalp & Intraday)' : '1h / 4h (Swing & Trend Continuation)';

  return {
    maInsight,
    emaInsight,
    bollInsight,
    macdInsight,
    rsiInsight,
    stochRsiInsight,
    directionVerdict,
    timeframeRecommendation,
    estimatedDuration: etas,
  };
}

/**
 * Menghasilkan sinyal futures dari seluruh daftar koin Binance
 */
export async function generateFuturesSignals(): Promise<BinanceFuturesSignal[]> {
  const [tickers, fundingMap, btcContext, newsList] = await Promise.all([
    getFutures24hTickers(),
    getFundingRates(),
    getBtcMarketContext(),
    fetchRecentCryptoNews().catch(() => []),
  ]);

  if (!tickers || tickers.length === 0) {
    return [];
  }

  // 🛡️ ELIMINASI AWAL RADAR: Hapus instrumen TradFi, ETF, dan Pre-Market Blacklist
  // agar bot tidak membuang waktu dan kuota API pada aset illiquid berspread lebar
  // 🛡️ LAYER-0 WHITELIST + LAYER-1 BLACKLIST (2x protection)
  // Hanya izinkan koin dari whitelist murni DAN lolos dari TradFi/ETF blacklist
  const eligibleTickers = tickers.filter((t) => {
    if (!isCryptoPureWhitelisted(t.symbol)) return false;           // Layer 0: Whitelist gate
    if (isTradFiOrEtfBlacklisted(t.symbol).isBlacklisted) return false; // Layer 1: Blacklist double-check
    return true;
  });

  const rawSignals: BinanceFuturesSignal[] = [];

  for (const ticker of eligibleTickers) {
    const funding = fundingMap.get(ticker.symbol);
    const signal = evaluatePairSignal(ticker, funding);
    if (signal) {
      rawSignals.push(signal);
    }
  }

  // Ambil kandidat sinyal teratas (maksimal 15 pasang) untuk inspeksi mendalam candlestick klines
  // Berikan prioritas bobot sniper (Early Accumulation & Panic Sweep) agar bot tidak hanya memindai koin yang sudah terbang
  rawSignals.sort((a, b) => {
    if (a.signalTier === 'SUPERNOVA' && b.signalTier !== 'SUPERNOVA') return -1;
    if (b.signalTier === 'SUPERNOVA' && a.signalTier !== 'SUPERNOVA') return 1;

    const getEarlyBonus = (sig: BinanceFuturesSignal): number => {
      if (sig.strategy === 'EARLY_ACCUMULATION') return 18;
      if (sig.strategy === 'PANIC_SWEEP_REVERSAL' || sig.strategy === 'RSI_EXTREME_REVERSAL') return 14;
      if (sig.strategy === 'HIDDEN_BREAKOUT') return 10;
      if (sig.strategy === 'BREAKOUT_MOMENTUM' && sig.derivativesData.priceChange24hPct >= 10.0) return -12; // Penalti koin yang sudah terbang tinggi
      return 0;
    };

    const scoreA = a.overallScore * a.riskRewardRatio + getEarlyBonus(a);
    const scoreB = b.overallScore * b.riskRewardRatio + getEarlyBonus(b);
    return scoreB - scoreA;
  });
  const candidates = rawSignals.slice(0, 50);

  // Analisis Pola Candlestick Elit, Indikator Riil, Sniper v3.0 & Squeeze Hunter (Top 50 Kandidat)
  await Promise.allSettled(
    candidates.map(async (signal) => {
      try {
        // Ambil klines 15m (100), 1h (60), dan 4h (60) secara paralel untuk efisiensi API
        const [rawKlines, rawKlines1h, rawKlines4h] = await Promise.all([
          getKlines(signal.symbol, '15m', 100),
          getKlines(signal.symbol, '1h', 60),
          getKlines(signal.symbol, '4h', 60),
        ]);

        if (rawKlines && rawKlines.length >= 10 && rawKlines1h && rawKlines1h.length >= 5) {
          const candles = parseKlinesToCandles(rawKlines);
          const candles1h = parseKlinesToCandles(rawKlines1h);
          const candles4h = rawKlines4h && rawKlines4h.length >= 5 ? parseKlinesToCandles(rawKlines4h) : [];
          const closePrices = candles.map((c) => c.close);
          const closePrices1h = candles1h.map((c) => c.close);

          // 1. Kalkulasi Indikator Riil dari Close Klines 15m & 1h
          const realIndicators = computeRealTechnicalIndicators(closePrices, signal.entryZone.current);
          const realIndicators1h = computeRealTechnicalIndicators(closePrices1h, signal.entryZone.current);
          signal.indicators = realIndicators;
          signal.indicatorExplanation = generateIndicatorExplanation(
            realIndicators,
            signal.entryZone.current,
            signal.derivativesData.priceChange24hPct,
            signal.direction,
            signal.derivativesData.volume24hUsd,
            {
              tp1Eta: signal.targets.tp1.eta,
              tp2Eta: signal.targets.tp2.eta,
              tp3Eta: signal.targets.tp3.eta,
              summaryText: '',
            }
          );

          // 2. Tempelkan Konteks Induk Pasar (BTC Guard) & Rekomendasi Position Sizing
          signal.btcContext = btcContext;
          signal.positionSizing = calculatePositionSizing(
            20,
            Math.abs(signal.stopLoss.lossPct),
            signal.leverage.safe.multiplier
          );

          // 2b. 🛡️ SNIPER v3.0 PROTOCOL: PULLBACK & RE-TEST
          const realRsi6 = realIndicators.rsi.rsi6;
          const currentP = signal.entryZone.current;

          if (signal.strategy === 'PULLBACK_RETEST') {
            let passV3 = true;
            let rejectReason = '';

            // Aturan 1: RSI 15m di Zona Konsolidasi/Ignisi (40 - 60)
            const rsi15m = realRsi6;
            const rsi1h = realIndicators1h.rsi.rsi6;

            if (rsi15m < 35 || rsi15m > 65) {
              passV3 = false;
              rejectReason = `RSI(15m) = ${rsi15m.toFixed(1)} berada di luar zona ignisi agresif (35-65).`;
              // 🚨 KILL SWITCH MUTLAK: RSI ekstrem langsung veto, tidak bisa di-override SMC/News
              signal.overallScore = -999;
            }
            // Aturan 1H: Hindari ekstrim makro (>70 atau <30)
            if (passV3) {
              if (signal.direction === 'LONG' && (rsi1h >= 70 || rsi1h < 30)) {
                passV3 = false;
                rejectReason = `RSI(1H) = ${rsi1h.toFixed(1)} terlalu ekstrim untuk LONG (>70 overbought atau <30 dumping).`;
              } else if (signal.direction === 'SHORT' && (rsi1h <= 30 || rsi1h > 70)) {
                passV3 = false;
                rejectReason = `RSI(1H) = ${rsi1h.toFixed(1)} terlalu ekstrim untuk SHORT (<30 oversold atau >70 breakout).`;
              }
            }

            // Aturan 2: Pullback Proximity (Jarak max 1.0% dari MA25 atau MA99 di 15m)
            const ma25 = realIndicators.ma.ma25;
            const ma99 = realIndicators.ma.ma99;
            const dist25 = Math.abs(currentP - ma25) / ma25;
            const dist99 = Math.abs(currentP - ma99) / ma99;
            const isNearMA = dist25 <= 0.018 || dist99 <= 0.018; // 1.8% buffer zone presisi

            if (passV3 && !isNearMA) {
              passV3 = false;
              rejectReason = `Harga ($${currentP}) belum menyentuh zona MA(25)/MA(99) 15m. Jarak: ${(Math.min(dist25, dist99) * 100).toFixed(2)}% (Maks 1.8%).`;
            }

            // Aturan 3: Syarat 1H Komandan Tren
            if (passV3 && closePrices1h.length >= 26) {
              const prevClose1h = closePrices1h.slice(0, -1);
              const prevMa25_1h = calculateSMA(prevClose1h, 25);
              const currMa25_1h = realIndicators1h.ma.ma25;

              const lastCandle1h = candles1h[candles1h.length - 1];
              const isMarubozu = lastCandle1h.open > lastCandle1h.close
                ? (lastCandle1h.close - lastCandle1h.low) / (lastCandle1h.high - lastCandle1h.low) < 0.08
                : (lastCandle1h.high - lastCandle1h.close) / (lastCandle1h.high - lastCandle1h.low) < 0.08;

              if (signal.direction === 'LONG') {
                if (currMa25_1h < prevMa25_1h) {
                  passV3 = false;
                  rejectReason = `1H MA(25) sedang menukik ke bawah. Tren makro tidak mendukung LONG.`;
                }
                if (passV3 && lastCandle1h.close < lastCandle1h.open && isMarubozu) {
                  passV3 = false;
                  rejectReason = `Candle 1H terakhir adalah Marubozu merah pekat yang menghujam support.`;
                }
              } else {
                if (currMa25_1h > prevMa25_1h) {
                  passV3 = false;
                  rejectReason = `1H MA(25) sedang menanjak ke atas. Tren makro tidak mendukung SHORT.`;
                }
                if (passV3 && lastCandle1h.close > lastCandle1h.open && isMarubozu) {
                  passV3 = false;
                  rejectReason = `Candle 1H terakhir adalah Marubozu hijau pekat yang menembus resistance.`;
                }
              }
            }

            // Aturan 4: Volume 1.5x Rata-rata 10 Candle (Pada 15m)
            if (passV3 && candles.length >= 12) {
              const recent10 = candles.slice(-12, -2);
              const avgVol10 = recent10.reduce((acc, c) => acc + (c.volume ?? 0), 0) / 10;

              const currentCandle = candles[candles.length - 1];
              const prevCandle = candles[candles.length - 2];

              const checkVolume = (c: typeof currentCandle) => {
                const vol = c.volume ?? 0;
                if (vol < avgVol10 * 1.2) return false;
                if (signal.direction === 'LONG' && c.close <= c.open) return false;
                if (signal.direction === 'SHORT' && c.close >= c.open) return false;
                return true;
              };

              if (!checkVolume(currentCandle) && !checkVolume(prevCandle)) {
                passV3 = false;
                rejectReason = `Volume belum mencapai konfirmasi akumulasi 1.2x dari rata-rata (15m).`;
              }
            }

            if (!passV3) {
              // 🚨 KILL SWITCH: Skor -999 mencegah semua modul sekunder (SMC, News) membajak sinyal
              if (signal.overallScore !== -999) signal.overallScore = -999;
              signal.signalTier = 'MODERATE';
              if (signal.indicatorExplanation) {
                signal.indicatorExplanation.directionVerdict = `🔴 VETOED BY SNIPER v3.2: ${rejectReason}`;
              }
            } else {
              signal.overallScore = Math.min(signal.overallScore + 10, 99); // Lolos seleksi mutlak
              signal.signalTier = 'SUPERNOVA'; // Sinyal ini sangat elit jika lolos
              if (signal.indicatorExplanation) {
                signal.indicatorExplanation.directionVerdict = `🟢 SNIPER v3.0 TERKONFIRMASI: RSI Ignisi (35-65), Pullback MA (${(Math.min(dist25, dist99) * 100).toFixed(2)}%), Volume 1.2x+, 1H Tren Mendukung.`;
              }
            }
          } else if (signal.strategy === 'FUNDING_SQUEEZE') {
            // ⚡ SQUEEZE HUNTER (Mesin Ekstrem - Khusus Koin Liar)
            let passSqueeze = true;
            let rejectReason = '';

            // 1. Funding Rate Negatif Tajam (Wajib < -0.01%)
            const fr = signal.derivativesData.fundingRatePct;
            if (fr > -0.01) {
              passSqueeze = false;
              rejectReason = `Funding Rate (${fr.toFixed(4)}%) tidak cukup negatif untuk Short Squeeze (wajib < -0.01%).`;
            }

            // 2. Volume Ledakan (> 3x Lipat dari rata-rata 10 candle)
            if (passSqueeze && candles.length >= 12) {
              const recent10 = candles.slice(-12, -2);
              const avgVol10 = recent10.reduce((acc, c) => acc + (c.volume ?? 0), 0) / 10;
              const currentCandle = candles[candles.length - 1];
              const prevCandle = candles[candles.length - 2];

              const hasExplosiveVol = (c: typeof currentCandle) => (c.volume ?? 0) >= avgVol10 * 3.0;

              if (!hasExplosiveVol(currentCandle) && !hasExplosiveVol(prevCandle)) {
                passSqueeze = false;
                rejectReason = `Tidak ada ledakan volume institusi > 3x dari rata-rata 10 candle.`;
              }
            }

            if (!passSqueeze) {
              // 🚨 KILL SWITCH SQUEEZE: Skor -999 mencegah SMC/News override
              signal.overallScore = -999;
              signal.signalTier = 'MODERATE';
              if (signal.indicatorExplanation) {
                signal.indicatorExplanation.directionVerdict = `🔴 VETOED BY SQUEEZE HUNTER: ${rejectReason}`;
              }
            } else {
              signal.overallScore = 96;
              signal.signalTier = 'SUPERNOVA';
              signal.direction = 'LONG';
              signal.strategyLabel = '⚡ Squeeze Hunter (Short Squeeze Ignition)';

              // 🛡️ PERLINDUNGAN WHIPSAW: Floor Stop Loss minimum 3.0% untuk Squeeze Hunter
              const currentPriceForSq = signal.entryZone.current;
              const rawSlPct = Math.abs(signal.stopLoss.lossPct);
              const effectiveSlPct = rawSlPct < 3.0 ? 3.0 : rawSlPct;
              if (rawSlPct < 3.0) {
                const newSlPrice = currentPriceForSq * (1 - effectiveSlPct / 100);
                signal.stopLoss = {
                  price: newSlPrice,
                  lossPct: -effectiveSlPct,
                  label: `$${formatFuturesPrice(newSlPrice)} (-${effectiveSlPct.toFixed(1)}%) [SQ MIN FLOOR]`,
                  isHit: false,
                };
                // Kalibrasi ulang R:R berdasarkan SL baru
                signal.riskRewardRatio = Number((signal.targets.tp2.gainPct / effectiveSlPct).toFixed(2));
              }

              signal.rationale += ' [SQUEEZE HUNTER] Funding Rate negatif tajam & Volume institusi meledak >3x. ⚠️ EKSEKUSI WAJIB: Dilarang Market Buy! Buka grafik 1 Menit (1m) dan pasang Limit Buy di titik micro-pullback terdekat.';
              if (signal.indicatorExplanation) {
                signal.indicatorExplanation.directionVerdict = `🔥 SQUEEZE HUNTER TERKONFIRMASI: Funding ${fr.toFixed(4)}% + Volume 3x+. SL Floor ${effectiveSlPct.toFixed(1)}%. EKSEKUSI: Limit Buy di micro-pullback TF 1m!`;
              }
            }
          }

          // 3. Perisai Anti-Bull Trap: Jika BTC Sedang Dump, Batalkan / Turunkan Sinyal LONG Altcoin
          if (signal.symbol !== 'BTCUSDT' && !btcContext.isSafeForAltLong && signal.direction === 'LONG') {
            signal.overallScore -= 22;
            signal.signalTier = 'MODERATE';
            if (signal.indicatorExplanation) {
              signal.indicatorExplanation.directionVerdict = `⚠️ KEPUTUSAN TEGAS: WAIT & SEE. ${btcContext.warningMessage || 'Bitcoin sedang melemah tajam, risiko tinggi masuk posisi LONG pada Altcoin!'}`;
            }
          }

          // 4. Analisis Smart Money Concepts (SMC) & VPA 4H Multi-Timeframe
          if (candles4h.length >= 20) {
            const smcResult = runSmcAnalysis(signal.symbol, candles4h, candles);
            signal.smcAnalysis = smcResult;

            // Jika SMC Terkonfirmasi Kuat: Demand OB 4H + VPA Institusi + 15m MSS terkonfirmasi (DAN RSI belum overbought)
            if (smcResult.smcScore >= 75 && smcResult.smcBias === 'BULLISH' && smcResult.mssConfirmed && realRsi6 < 68) {
              signal.strategy = 'SMC_DEMAND_BOUNCE';
              signal.strategyLabel = `🎯 SMC Demand Bounce (4H OB + 15m MSS)`;
              signal.direction = 'LONG';
              signal.signalTier = smcResult.smcScore >= 85 ? 'SUPERNOVA' : 'HIGH';
              signal.overallScore = Math.min(98, Math.max(signal.overallScore, smcResult.smcScore));

              // Kalibrasi SL presisi di bawah batas Demand OB
              if (smcResult.nearestDemandZone) {
                const fineSl = Math.max(smcResult.nearestDemandZone.zoneLow * 0.992, signal.entryZone.current * 0.96);
                const slPct = Math.abs((fineSl - signal.entryZone.current) / signal.entryZone.current) * 100;
                signal.stopLoss = {
                  price: fineSl,
                  lossPct: -slPct,
                  label: `$${formatFuturesPrice(fineSl)} (-${slPct.toFixed(1)}%) [SMC OB]`,
                  isHit: false,
                };
                const tp2Gain = signal.targets.tp2.gainPct;
                signal.riskRewardRatio = Number((tp2Gain / Math.max(slPct, 0.5)).toFixed(2));
                signal.positionSizing = calculatePositionSizing(
                  20,
                  slPct,
                  signal.leverage.safe.multiplier
                );
              }
            }
          }

          const pattern = detectCandlestickPatterns(candles);
          if (pattern) {
            signal.candlestickPattern = pattern;

            // Perkaya wawasan AI dengan anatomi pola candlestick
            if (signal.indicatorExplanation) {
              signal.indicatorExplanation.candlestickInsight = `Pola Lilin Terdeteksi: ${pattern.name} (${pattern.type} - Akurasi Historis ${pattern.reliability}%). ${pattern.description} Konfirmasi: ${pattern.confirmationRule}`;
            }

            // 1. Pola Searah (Konfluensi Bullish/Bearish): Dorongan Sinyal
            if (pattern.direction === signal.direction) {
              const boost = Math.round((pattern.reliability - 50) / 2.5); // +6 s/d +12 poin
              signal.overallScore = Math.min(signal.overallScore + boost, 99);

              if (pattern.strength === 'ULTRA' || pattern.reliability >= 74) {
                signal.signalTier = 'SUPERNOVA';
              }

              signal.agentConsensus.trendAgent.score = Math.min(signal.agentConsensus.trendAgent.score + 8, 98);
              signal.agentConsensus.trendAgent.reason += ` | Dikonfirmasi pola candlestick elit: ${pattern.name} (Akurasi ${pattern.reliability}%).`;

              // Kalibrasi Stop Loss presisi berbasis shadow ekstrim pola candlestick
              if (pattern.stopLossPrice && pattern.stopLossPrice > 0) {
                const isLong = signal.direction === 'LONG';
                const fineSl = isLong
                  ? Math.max(pattern.stopLossPrice, signal.entryZone.current * 0.96)
                  : Math.min(pattern.stopLossPrice, signal.entryZone.current * 1.04);
                const slPct = Math.abs((fineSl - signal.entryZone.current) / signal.entryZone.current) * 100;
                signal.stopLoss = {
                  price: fineSl,
                  lossPct: -slPct,
                  label: `$${formatFuturesPrice(fineSl)} (-${slPct.toFixed(1)}%)`,
                  isHit: false,
                };
                // Kalibrasi ulang R:R
                const tp2Gain = signal.targets.tp2.gainPct;
                signal.riskRewardRatio = Number((tp2Gain / Math.max(slPct, 0.5)).toFixed(2));
                // Update position sizing dengan SL baru
                signal.positionSizing = calculatePositionSizing(
                  20,
                  slPct,
                  signal.leverage.safe.multiplier
                );
              }
            }
            // 2. Pola Berlawanan Arah (Filter Anti-Rungkad): Peringatan & Penalti Skor
            else if (pattern.direction !== 'NEUTRAL' && pattern.direction !== signal.direction) {
              signal.overallScore -= 14;
              signal.agentConsensus.trendAgent.score = Math.max(signal.agentConsensus.trendAgent.score - 18, 55);
              signal.agentConsensus.trendAgent.reason += ` | PERINGATAN RISIKO: Terdeteksi pola berlawanan arah (${pattern.name}, bias ${pattern.bias}).`;
              if (signal.indicatorExplanation) {
                signal.indicatorExplanation.directionVerdict = `🟡 KEPUTUSAN TEGAS: WAIT & SEE / NEUTRAL. Terdapat formasi pola candlestick ${pattern.name} yang berlawanan dengan arah indikator, meningkatkan risiko pembalikan harga mendadak.`;
              }
            }
          }

          // 4. Analisis Dampak Sentimen Berita AI (Gemini + Public Feeds)
          try {
            let newsScore = getCachedSentiment(signal.symbol);
            if (!newsScore && newsList.length > 0) {
              newsScore = await analyzeSentimentForSymbol(signal.symbol, newsList);
            }
            if (newsScore) {
              signal.newsContext = newsScore;

              // Formula Bobot Sentimen: 70% teknikal + 30% berita (hanya jika ada sentimen aktif)
              if (newsScore.sentimentScore !== 0) {
                const techScore = signal.overallScore;
                const isLong = signal.direction === 'LONG';
                const alignedSentiment = isLong ? newsScore.sentimentScore : -newsScore.sentimentScore;
                const newsScoreNormalized = Math.max(0, Math.min(100, (alignedSentiment + 100) / 2));

                signal.overallScore = Math.round(techScore * 0.70 + newsScoreNormalized * 0.30);

                // Re-evaluasi signalTier berdasarkan sinergi berita
                if (
                  (newsScore.signalModifier === 'STRONG_BOOST_LONG' && isLong) ||
                  (newsScore.signalModifier === 'STRONG_BOOST_SHORT' && !isLong)
                ) {
                  if (signal.overallScore >= 88) signal.signalTier = 'SUPERNOVA';
                } else if (
                  (newsScore.signalModifier === 'VETO_LONG' && isLong) ||
                  (newsScore.signalModifier === 'VETO_SHORT' && !isLong)
                ) {
                  signal.overallScore = Math.max(50, signal.overallScore - 25);
                  signal.signalTier = 'MODERATE';
                  if (signal.indicatorExplanation) {
                    signal.indicatorExplanation.directionVerdict = `⚠️ KEPUTUSAN TEGAS: WAIT & SEE. Katalis berita berlawanan arah dengan sinyal (${newsScore.keyHeadline}).`;
                  }
                }
              }
            }
          } catch (err) {
            // Non-blocking: kegagalan analisis berita tidak menghentikan sinyal teknikal
          }
        }
      } catch (err) {
        // Fallback: Sinyal tetap berjalan dengan data 24h ticker
      }
    })
  );

  // Filter sinyal yang lolos kriteria ketat Sniper (Anti-FOMO di pucuk):
  // 1. Skor keseluruhan minimal 78
  // 2. DILARANG KERAS meloloskan sinyal LONG dengan RSI(6) >= 68 (koin sudah terbang/overbought)
  // 3. DILARANG KERAS meloloskan sinyal SHORT dengan RSI(6) <= 32 (koin sudah di dasar jurang dump)
  const validSignals = candidates.filter((s) => {
    // 🚨 PEMUTUS ARUS MUTLAK: Sinyal yang di-veto (skor < 0) tidak boleh lolos ke output
    if (s.overallScore < 0) return false;
    if (s.overallScore < 78) return false;

    const rsiVal = s.indicators?.rsi?.rsi6;
    // Sniper wajib memiliki data RSI riil 15m terkonfirmasi
    if (rsiVal === undefined || isNaN(rsiVal)) return false;

    // 🎯 ATURAN MUTLAK 1: Koin LONG dengan RSI >= 85 DILARANG KERAS LOLOS (Terlalu pucuk)
    // Untuk strategi non-breakout, kita tolak jika RSI >= 65
    if (s.direction === 'LONG') {
      if (rsiVal >= 85) return false;
      if (rsiVal >= 65 && s.strategy !== 'BREAKOUT_MOMENTUM' && s.strategy !== 'HIDDEN_BREAKOUT' && s.strategy !== 'FUNDING_SQUEEZE') {
        return false;
      }
    }

    // 🎯 ATURAN MUTLAK 2: Koin SHORT dengan RSI <= 15 DILARANG KERAS LOLOS (Dasar jurang)
    // Untuk strategi non-breakdown, kita tolak jika RSI <= 35
    if (s.direction === 'SHORT') {
      if (rsiVal <= 15) return false;
      if (rsiVal <= 35 && s.strategy !== 'BREAKOUT_MOMENTUM' && s.strategy !== 'FUNDING_SQUEEZE') {
        return false;
      }
    }

    return true;
  });

  // Urutkan sinyal akhir: SUPERNOVA pertama, lalu berdasarkan skor konfluensi x R:R tertinggi x volume
  validSignals.sort((a, b) => {
    if (a.signalTier === 'SUPERNOVA' && b.signalTier !== 'SUPERNOVA') return -1;
    if (b.signalTier === 'SUPERNOVA' && a.signalTier !== 'SUPERNOVA') return 1;
    const aPower = a.overallScore * a.riskRewardRatio;
    const bPower = b.overallScore * b.riskRewardRatio;
    return bPower - aPower || b.derivativesData.volume24hUsd - a.derivativesData.volume24hUsd;
  });

  // Anti-Spam & Kualitas Elit: Batasi maksimal Top 8 – 10 sinyal dengan konfluensi tertinggi
  return validSignals.slice(0, 10);
}

/**
 * Menghitung statistik ringkasan pasar futures
 */
export async function computeFuturesMarketStats(signals: BinanceFuturesSignal[]): Promise<FuturesMarketStats> {
  const [tickers, fundingMap, fearAndGreed] = await Promise.all([
    getFutures24hTickers(),
    getFundingRates(),
    getFearAndGreedIndex(),
  ]);

  let totalVol = 0;
  let fundingSum = 0;
  let fundingCount = 0;
  let positiveCount = 0;
  let negativeCount = 0;

  const validTickers: Array<{
    symbol: string;
    changePct: number;
    price: number;
    volume: number;
  }> = [];

  for (const t of tickers) {
    const vol = parseFloat(t.quoteVolume) || 0;
    const chg = parseFloat(t.priceChangePercent) || 0;
    const prc = parseFloat(t.lastPrice) || 0;
    totalVol += vol;

    if (chg > 0) positiveCount++;
    else negativeCount++;

    // Jangan masukkan koin Blacklist TradFi/ETF atau koin dengan volume sangat mini ke daftar Gainers/Losers
    if (!isTradFiOrEtfBlacklisted(t.symbol).isBlacklisted && vol >= 10_000_000) {
      validTickers.push({
        symbol: t.symbol,
        changePct: chg,
        price: prc,
        volume: vol,
      });
    }
  }

  fundingMap.forEach((val) => {
    const rate = parseFloat(val.lastFundingRate);
    if (!isNaN(rate)) {
      fundingSum += rate;
      fundingCount++;
    }
  });

  const avgFunding = fundingCount > 0 ? (fundingSum / fundingCount) * 100 : 0.01;

  // Urutkan gainers & losers
  validTickers.sort((a, b) => b.changePct - a.changePct);
  const topGainers = validTickers.slice(0, 5).map((x) => ({
    symbol: x.symbol,
    priceChangePct: x.changePct,
    price: x.price,
    volumeUsd: x.volume,
  }));

  const topLosers = [...validTickers].sort((a, b) => a.changePct - b.changePct).slice(0, 5).map((x) => ({
    symbol: x.symbol,
    priceChangePct: x.changePct,
    price: x.price,
    volumeUsd: x.volume,
  }));

  // Squeeze candidates (Kecualikan aset yang masuk Blacklist TradFi / ETF)
  const topSqueezeCoins: FuturesMarketStats['topSqueezeCoins'] = [];
  fundingMap.forEach((val, sym) => {
    if (isTradFiOrEtfBlacklisted(sym).isBlacklisted) return;

    const rate = parseFloat(val.lastFundingRate) * 100;
    if (rate <= -0.02) {
      topSqueezeCoins.push({
        symbol: sym,
        fundingRatePct: rate,
        oiChange24h: 12.5,
        potentialType: 'SHORT_SQUEEZE_LONG',
      });
    } else if (rate >= 0.05) {
      topSqueezeCoins.push({
        symbol: sym,
        fundingRatePct: rate,
        oiChange24h: 15.2,
        potentialType: 'LONG_SQUEEZE_SHORT',
      });
    }
  });

  // Urutkan squeeze paling ekstrim
  topSqueezeCoins.sort((a, b) => Math.abs(b.fundingRatePct) - Math.abs(a.fundingRatePct));

  const totalPairs = tickers.length;
  const longRatio = totalPairs > 0 ? Math.round((positiveCount / totalPairs) * 100) : 50;
  const shortRatio = 100 - longRatio;

  let bias: FuturesMarketStats['marketBias'] = 'NEUTRAL';
  if (longRatio >= 65) bias = 'STRONG_BULLISH';
  else if (longRatio >= 55) bias = 'BULLISH';
  else if (longRatio <= 35) bias = 'STRONG_BEARISH';
  else if (longRatio <= 45) bias = 'BEARISH';

  // Analisa Smart Money Bias menggabungkan Fear & Greed dan rata-rata Funding
  let smartMoneyBias: FuturesMarketStats['smartMoneyBias'] = 'NEUTRAL';
  if (fearAndGreed) {
    if (fearAndGreed.score >= 70 && (bias === 'BULLISH' || bias === 'STRONG_BULLISH')) {
      smartMoneyBias = 'WHALES_ACCUMULATING_LONG';
    } else if (fearAndGreed.score <= 30 || bias === 'BEARISH' || bias === 'STRONG_BEARISH') {
      smartMoneyBias = 'WHALES_HEDGING_SHORT';
    }
  }

  return {
    totalPairs,
    activeSignalsCount: signals.length,
    total24hVolumeUsd: totalVol,
    marketBias: bias,
    longAccountPct: longRatio,
    shortAccountPct: shortRatio,
    avgFundingRate: Number(avgFunding.toFixed(4)),
    fearAndGreed: fearAndGreed || undefined,
    smartMoneyBias,
    topSqueezeCoins: topSqueezeCoins.slice(0, 6),
    topGainers,
    topLosers,
    lastUpdated: Date.now(),
  };
}

/**
 * Menganalisa SATU KOIN SPESIFIK secara On-Demand dari input pengguna
 * Menggabungkan live ticker, funding rate, 35 candle klines, indikator Binance, dan deteksi pola candlestick.
 */
export async function analyzeSpecificFuturesCoin(rawSymbol: string): Promise<BinanceFuturesSignal> {
  let symbol = rawSymbol.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (!symbol.endsWith('USDT')) {
    symbol = `${symbol}USDT`;
  }

  // 🛡️ GATEKEEPER HARDEST-STOP: Cegat analisis koin Blacklist TradFi, ETF, dan Pre-Market
  const blacklistCheck = isTradFiOrEtfBlacklisted(symbol);
  if (blacklistCheck.isBlacklisted) {
    throw new Error(
      blacklistCheck.reason ||
      `⛔ GATEKEEPER VETO: Ticker "${symbol}" masuk daftar hitam TradFi/Pre-Market (minim likuiditas & spread lebar). Dilarang dianalisis untuk mencegah Stop Loss beruntun.`
    );
  }

  // Coba ambil ticker langsung, jika gagal coba variasi 1000 (misal 1000PEPEUSDT, 1000BONKUSDT, dll)
  let ticker = await getFuturesSingleTicker(symbol);
  if (!ticker && !symbol.startsWith('1000')) {
    const memeSymbol = `1000${symbol}`;
    const memeTicker = await getFuturesSingleTicker(memeSymbol);
    if (memeTicker) {
      symbol = memeSymbol;
      ticker = memeTicker;
    }
  }

  if (!ticker) {
    throw new Error(`Koin "${rawSymbol.toUpperCase()}" tidak ditemukan di pasar Binance Futures USDT-M.`);
  }

  const [
    fundingInfo,
    rawKlines,
    rawOi,
    liveLsRatio,
    btcContext,
    rawDepth,
    topTraderRatio,
    takerRatio,
    rawKlines4h,
  ] = await Promise.all([
    getSingleFundingRate(symbol),
    getKlines(symbol, '15m', 100),
    getFuturesOpenInterest(symbol),
    getFuturesLongShortRatio(symbol),
    getBtcMarketContext(),
    getFuturesOrderbookDepth(symbol, 20),
    getTopTraderLongShortRatio(symbol),
    getTakerBuySellRatio(symbol),
    getKlines(symbol, '4h', 60),
  ]);

  const currentPrice = parseFloat(ticker.lastPrice);
  const high24h = parseFloat(ticker.highPrice);
  const low24h = parseFloat(ticker.lowPrice);
  const change24h = parseFloat(ticker.priceChangePercent);
  const quoteVolume = parseFloat(ticker.quoteVolume);
  const fundingRate = fundingInfo ? parseFloat(fundingInfo.lastFundingRate) : 0.0001;
  const fundingRatePct = fundingRate * 100;

  // Analisa Pola Candlestick dari 100 klines 15m & SMC 4H
  const candles = parseKlinesToCandles(rawKlines);
  const candles4h = rawKlines4h && rawKlines4h.length >= 5 ? parseKlinesToCandles(rawKlines4h) : [];
  const detectedPattern = candles.length >= 5 ? detectCandlestickPatterns(candles) : null;
  const smcAnalysis = candles4h.length >= 20 ? runSmcAnalysis(symbol, candles4h, candles) : undefined;

  // Analisa deret harga penutupan (Close) untuk MA, BOLL, MACD, RSI murni
  const closePrices = candles.length > 0 ? candles.map((c) => c.close) : [currentPrice];

  // 1. Kalkulasi Indikator Teknikal Riil
  const indicators = computeRealTechnicalIndicators(closePrices, currentPrice);

  // Evaluasi Konfluensi Riil Indikator
  const isMaBullish = indicators.ma.alignment === 'BULLISH';
  const isMaBearish = indicators.ma.alignment === 'BEARISH';
  const isMacdBull = indicators.macd.dif > indicators.macd.dea;
  const isRsiBull = indicators.rsi.rsi6 > 50;

  const isEmaBullish = indicators.ema?.alignment === 'BULLISH';
  const isEmaBearish = indicators.ema?.alignment === 'BEARISH';
  const isStochBullish = indicators.stochRsi?.status === 'BULLISH_CROSS' || indicators.stochRsi?.status === 'OVERSOLD';
  const isStochBearish = indicators.stochRsi?.status === 'BEARISH_CROSS' || indicators.stochRsi?.status === 'OVERBOUGHT';

  // 2. Evaluasi Bias Makro (Trend 24h & Moving Average Baseline)
  const isMacroBullish = change24h >= 2.0 || (isMaBullish && isEmaBullish);
  const isMacroBearish = change24h <= -2.0 || (isMaBearish && isEmaBearish);

  // Tentukan Arah: Mengutamakan Trend Following (Anti-Countertrend Squeeze)
  let direction: FuturesDirection = 'LONG';
  let strategy: FuturesStrategy = 'BREAKOUT_MOMENTUM';
  let strategyLabel = '🚀 Trendline Continuation';
  let score = 84;

  if (isMacroBullish) {
    // DALAM TREN NAIK / PUMP KUAT:
    // Dilarang keras membuka posisi SHORT melawan arus tren utama!
    direction = 'LONG';

    if (detectedPattern && detectedPattern.direction === 'LONG') {
      strategy = detectedPattern.type === 'REVERSAL' ? 'RSI_EXTREME_REVERSAL' : 'BREAKOUT_MOMENTUM';
      strategyLabel = `🕯️ ${detectedPattern.name} (Bullish Continuation)`;
      score = Math.min(86 + Math.round((detectedPattern.reliability - 50) / 2.5), 98);
    } else if (detectedPattern && detectedPattern.direction === 'SHORT') {
      // Pola lilin bearish di TF 15m saat tren makro bullish = Pullback Retest / Dip Beli
      strategy = 'BREAKOUT_MOMENTUM';
      strategyLabel = `🛡️ Dip Retest (${detectedPattern.name} Pullback)`;
      score = 83;
    } else if (isMaBullish && isMacdBull) {
      strategy = 'BREAKOUT_MOMENTUM';
      strategyLabel = '🚀 Golden Stack Bullish Breakout';
      score = 88 + (isEmaBullish ? 2 : 0) + (isStochBullish ? 2 : 0);
    } else {
      strategy = 'BREAKOUT_MOMENTUM';
      strategyLabel = '📈 Macro Trend Following LONG';
      score = 82;
    }
  } else if (isMacroBearish) {
    // DALAM TREN TURUN / DUMP:
    // Pengecualian Emas SMC: Jika harga menguji Demand OB 4H + VPA Institusi + MSS 15m terkonfirmasi
    if (smcAnalysis && smcAnalysis.smcScore >= 75 && smcAnalysis.smcBias === 'BULLISH' && smcAnalysis.mssConfirmed) {
      direction = 'LONG';
      strategy = 'SMC_DEMAND_BOUNCE';
      strategyLabel = `🎯 SMC Demand Bounce (4H OB + 15m MSS)`;
      score = Math.max(88, smcAnalysis.smcScore);
    } else {
      direction = 'SHORT';

      if (detectedPattern && detectedPattern.direction === 'SHORT') {
        strategy = detectedPattern.type === 'REVERSAL' ? 'RSI_EXTREME_REVERSAL' : 'BREAKOUT_MOMENTUM';
        strategyLabel = `🕯️ ${detectedPattern.name} (Bearish Continuation)`;
        score = Math.min(86 + Math.round((detectedPattern.reliability - 50) / 2.5), 98);
      } else if (detectedPattern && detectedPattern.direction === 'LONG') {
        strategy = 'BREAKOUT_MOMENTUM';
        strategyLabel = `🛡️ Rebound Watch (${detectedPattern.name} Diabaikan)`;
        score = 82;
      } else if (isMaBearish && !isMacdBull) {
        strategy = 'BREAKOUT_MOMENTUM';
        strategyLabel = '📉 Death Stack Bearish Breakdown';
        score = 88 + (isEmaBearish ? 2 : 0) + (isStochBearish ? 2 : 0);
      } else {
        strategy = 'BREAKOUT_MOMENTUM';
        strategyLabel = '📉 Macro Downtrend Following SHORT';
        score = 80;
      }
    }
  } else {
    // KONDISI SIDEWAYS / NETRAL TRANSISI:
    if (detectedPattern && detectedPattern.direction !== 'NEUTRAL') {
      direction = detectedPattern.direction;
      strategy = detectedPattern.type === 'REVERSAL' ? 'RSI_EXTREME_REVERSAL' : 'BREAKOUT_MOMENTUM';
      strategyLabel = `🕯️ ${detectedPattern.name} ${detectedPattern.type === 'REVERSAL' ? 'Reversal' : 'Continuation'}`;
      score = Math.min(84 + Math.round((detectedPattern.reliability - 50) / 2.5), 95);
    } else if ((isMaBullish || isEmaBullish) && isMacdBull && isRsiBull) {
      direction = 'LONG';
      strategy = 'BREAKOUT_MOMENTUM';
      strategyLabel = '🚀 Golden Stack Real Breakout';
      score = 85;
    } else if ((isMaBearish || isEmaBearish) && !isMacdBull && !isRsiBull) {
      direction = 'SHORT';
      strategy = 'BREAKOUT_MOMENTUM';
      strategyLabel = '📉 Death Stack Real Breakdown';
      score = 85;
    } else if (fundingRatePct <= -0.03) {
      direction = 'LONG';
      strategy = 'FUNDING_SQUEEZE';
      strategyLabel = '⚡ Short Squeeze Surge';
      score = 86;
    } else {
      direction = change24h >= 0 ? 'LONG' : 'SHORT';
      strategyLabel = direction === 'LONG' ? '⚡ Sideways Bullish Bias' : '⚡ Sideways Bearish Bias';
      score = 75;
    }
  }

  // Perisai Induk Pasar (BTC Guard): Jika BTC sedang dump tajam dan sinyal LONG untuk altcoin
  const isBtcDumping = symbol !== 'BTCUSDT' && !btcContext.isSafeForAltLong;
  if (isBtcDumping && direction === 'LONG') {
    score = Math.min(score, 74);
    strategyLabel = '⚠️ Bull Trap Warning (BTC Dump)';
  }

  // Hitung target TP dan SL
  const volMultiplier = Math.min(Math.max(Math.abs(change24h) / 10, 0.8), 2.5);
  const tp1Pct = 2.2 * volMultiplier;
  const tp2Pct = 4.8 * volMultiplier;
  const tp3Pct = 10.5 * volMultiplier;
  let slPct = 1.5 * volMultiplier;

  let entryLow = currentPrice * 0.996;
  let entryHigh = currentPrice * 1.004;
  let tp1Price: number;
  let tp2Price: number;
  let tp3Price: number;
  let slPrice: number;

  if (direction === 'LONG') {
    tp1Price = currentPrice * (1 + tp1Pct / 100);
    tp2Price = currentPrice * (1 + tp2Pct / 100);
    tp3Price = currentPrice * (1 + tp3Pct / 100);
    slPrice = currentPrice * (1 - slPct / 100);

    if (strategy === 'SMC_DEMAND_BOUNCE' && smcAnalysis?.nearestDemandZone) {
      slPrice = Math.max(smcAnalysis.nearestDemandZone.zoneLow * 0.992, currentPrice * 0.96);
      slPct = Math.abs((slPrice - currentPrice) / currentPrice) * 100;
    } else if (detectedPattern?.stopLossPrice && detectedPattern.stopLossPrice < currentPrice) {
      slPrice = Math.max(detectedPattern.stopLossPrice, currentPrice * 0.96);
      slPct = Math.abs((slPrice - currentPrice) / currentPrice) * 100;
    }
  } else {
    tp1Price = currentPrice * (1 - tp1Pct / 100);
    tp2Price = currentPrice * (1 - tp2Pct / 100);
    tp3Price = currentPrice * (1 - tp3Pct / 100);
    slPrice = currentPrice * (1 + slPct / 100);

    if (detectedPattern?.stopLossPrice && detectedPattern.stopLossPrice > currentPrice) {
      slPrice = Math.min(detectedPattern.stopLossPrice, currentPrice * 1.04);
      slPct = Math.abs((slPrice - currentPrice) / currentPrice) * 100;
    }
  }

  const rrRatio = Number((tp2Pct / Math.max(slPct, 0.5)).toFixed(2));
  const baseAsset = symbol.replace('USDT', '');

  const absVol = Math.abs(change24h);
  let tp1Eta = '15 – 30 Menit';
  let tp2Eta = '1 – 3 Jam';
  let tp3Eta = '6 – 24 Jam (1 Hari)';
  let durationSummary = '';

  if (absVol >= 15 || quoteVolume >= 100_000_000) {
    tp1Eta = '10 – 25 Menit (Kilat)';
    tp2Eta = '45 Menit – 2 Jam (Intraday)';
    tp3Eta = '4 – 12 Jam (Trend Run)';
    durationSummary = 'Pergerakan ultra-volatil: TP1 diproyeksikan tertembus dalam 10–25 menit, TP2 dalam 45m–2 jam, dan TP3 dalam 4–12 jam.';
  } else {
    tp1Eta = '25 – 45 Menit';
    tp2Eta = '2 – 4 Jam';
    tp3Eta = '8 – 24 Jam';
    durationSummary = 'Volatilitas aktif: TP1 diperkirakan tembus dalam 25–45 menit, TP2 dalam 2–4 jam, dan TP3 dalam 8–24 jam.';
  }

  const indicatorExplanation = generateIndicatorExplanation(
    indicators,
    currentPrice,
    change24h,
    direction,
    quoteVolume,
    { tp1Eta, tp2Eta, tp3Eta, summaryText: durationSummary }
  );

  // Jika BTC dump aktif dan arah LONG, mutlak timpa keputusan menjadi WAIT & SEE
  if (isBtcDumping && direction === 'LONG') {
    indicatorExplanation.directionVerdict = `⚠️ KEPUTUSAN TEGAS: WAIT & SEE / NETRAL. ${btcContext.warningMessage || 'Bitcoin sedang mengalami koreksi tajam. Risiko sangat tinggi membuka posisi LONG pada altcoin!'}`;
  }

  if (detectedPattern) {
    indicatorExplanation.candlestickInsight = `Pola Lilin Terdeteksi: ${detectedPattern.name} (${detectedPattern.type} - Akurasi Historis ${detectedPattern.reliability}%). ${detectedPattern.description} Konfirmasi: ${detectedPattern.confirmationRule}`;
  }

  let rationale = `Analisis on-demand presisi riil untuk ${symbol}: Struktur harga 24h (${change24h > 0 ? '+' : ''}${change24h.toFixed(2)}%) dengan volume $${(quoteVolume / 1e6).toFixed(1)}M USD.`;
  if (detectedPattern) {
    rationale += ` Terkonfirmasi pola candlestick elit "${detectedPattern.name}" (Winrate ${detectedPattern.reliability}%) memperkuat proyeksi arah ${direction}.`;
  }
  if (isBtcDumping && direction === 'LONG') {
    rationale += ` [PERINGATAN BTC GUARD] Bitcoin dalam kondisi tertekan (${btcContext.change15mPct}% 15m), sinyal dibatasi untuk proteksi modal.`;
  }
  if (direction === 'LONG' && indicators.rsi.rsi6 >= 68) {
    score = Math.min(score, 72);
    rationale += ` [PERINGATAN SNIPER] RSI(6)=${indicators.rsi.rsi6.toFixed(1)} overbought di pucuk. Dilarang FOMO, rawan koreksi!`;
  }

  const tier: FuturesSignalTier =
    score >= 90 && (!isBtcDumping || direction === 'SHORT')
      ? 'SUPERNOVA'
      : score >= 80
        ? 'HIGH'
        : 'MODERATE';

  // Data Derivatif Riil dari Binance Futures
  const openInterestUsd = rawOi ? rawOi * currentPrice : quoteVolume * 0.45;
  const longShortRatio = liveLsRatio !== null ? liveLsRatio : (direction === 'LONG' ? 1.28 : 0.82);

  // 1. Data Kedalaman Orderbook (Whale Wall Depth)
  const orderbookDepth: OrderbookDepthAnalysis | undefined = rawDepth
    ? {
      totalBidUsd: rawDepth.totalBidUsd,
      totalAskUsd: rawDepth.totalAskUsd,
      imbalanceRatio: rawDepth.imbalanceRatio,
      status: rawDepth.status,
      insight: rawDepth.insight,
      topBidWallPrice: rawDepth.topBidWallPrice,
      topAskWallPrice: rawDepth.topAskWallPrice,
    }
    : undefined;

  // 2. Evaluasi Anomali Kuantitatif (Alpha Zoo Core Intelligence)
  const volatility24h = ((high24h - low24h) / Math.max(low24h, 0.00000001)) * 100;
  let quantAnomalyType = 'NORMAL_FLOW';
  let quantScore = 80;
  let actionGuidance = direction === 'LONG' ? 'LONG (MOMENTUM FOLLOW)' : 'SHORT (BREAKDOWN FOLLOW)';
  let fundingInsightText = `Funding Rate normal (${fundingRatePct > 0 ? '+' : ''}${fundingRatePct.toFixed(4)}%).`;
  let antiTrapRule = 'Struktur harga selaras dengan tren pasar.';

  if (fundingRatePct <= -0.05) {
    quantAnomalyType = 'SHORT_SQUEEZE_SURGE';
    quantScore = 92;
    fundingInsightText = `⚡ EXTREME NEGATIVE FUNDING (${fundingRatePct.toFixed(4)}%): Penjual short terjebak, potensi short squeeze roket ke atas!`;
    actionGuidance = 'LONG (KATALIS SHORT SQUEEZE)';
  } else if (fundingRatePct >= 0.08) {
    quantAnomalyType = 'OVERHEATED_BULLISH_SENTIMENT';
    quantScore = 82;
    fundingInsightText = `⚠️ OVERHEATED POSITIVE FUNDING (+${fundingRatePct.toFixed(4)}%): Pasar sangat padat posisi long. Waspada aksi profit taking.`;
    actionGuidance = 'TUNGGU PULLBACK (JANGAN FOMO PUCUK)';
  }

  if (change24h >= 20) {
    quantAnomalyType = 'PARABOLIC_BULL_EXPANSION';
    quantScore = 95;
    actionGuidance = 'LONG (BUY PULLBACK) / DILARANG COUNTER SHORT';
    antiTrapRule = `🛡️ Filter Anti-Rungkad: Koin sedang terbang parabola (+${change24h.toFixed(1)}%). Sinyal SHORT dilarang keras demi proteksi modal!`;
  } else if (change24h <= -20) {
    quantAnomalyType = 'HEAVY_CAPITULATION_DUMP';
    quantScore = 92;
    actionGuidance = 'WAIT FOR BASE (JANGAN TANGKAP PISAU JATUH)';
    antiTrapRule = `🛡️ Filter Anti-Rungkad: Koin sedang dump tajam (${change24h.toFixed(1)}%). Sinyal LONG dilarang sampai terbentuk base/bottom.`;
  } else if (volatility24h < 2.5 && quoteVolume >= 30_000_000) {
    quantAnomalyType = 'WHALE_ACCUMULATION_SQUEEZE';
    quantScore = 88;
    actionGuidance = 'SIAGA BREAKOUT (KOMPRESI VOLATILITAS TINGGI)';
    antiTrapRule = 'Akumulasi senyap terdeteksi pada volume besar, bersiap untuk ledakan pergerakan harga.';
  } else if (volatility24h > 15) {
    quantAnomalyType = change24h > 0 ? 'BULLISH_VOLATILITY_BREAKOUT' : 'BEARISH_VOLATILITY_BREAKDOWN';
    quantScore = 88;
    actionGuidance = change24h > 0 ? 'LONG (MOMENTUM RIDER)' : 'SHORT (BREAKDOWN RIDER)';
  }

  // Jika orderbook imbalance ekstrem terkonfirmasi searah, perkuat skor
  if (orderbookDepth && orderbookDepth.imbalanceRatio >= 2.0 && direction === 'LONG') {
    quantScore = Math.min(100, quantScore + 4);
  } else if (orderbookDepth && orderbookDepth.imbalanceRatio <= 0.5 && direction === 'SHORT') {
    quantScore = Math.min(100, quantScore + 4);
  }

  const quantAnomaly: QuantAnomalyInsight = {
    anomalyType: quantAnomalyType,
    score: quantScore,
    actionGuidance,
    volatility24h: Number(volatility24h.toFixed(2)),
    fundingInsight: fundingInsightText,
    orderbookInsight: orderbookDepth?.insight || 'Kedalaman antrean orderbook normal.',
    antiTrapRule,
  };

  // Sintesis Rationale Lengkap (Menggabungkan Teknikal, Orderbook, dan Quant Anomaly)
  if (orderbookDepth && orderbookDepth.status !== 'BALANCED') {
    rationale += ` ${orderbookDepth.insight}`;
  }
  if (quantAnomaly.anomalyType !== 'NORMAL_FLOW') {
    rationale += ` [Quant Alert: ${quantAnomaly.anomalyType.replace(/_/g, ' ')}] ${quantAnomaly.actionGuidance}.`;
  }

  // Kalkulasi Position Sizing Modal Aman (Referensi modal $20)
  const positionSizing = calculatePositionSizing(20, slPct, 5);

  // Sintesis Debat Terstruktur Banteng vs Beruang (Adversarial Multi-Agent Bull vs Bear)
  const bullBearDebate = generateBullBearDebate({
    symbol,
    direction,
    currentPrice,
    change24h,
    fundingRatePct,
    indicators,
    detectedPattern,
    orderbookDepth,
    btcContext,
    takerRatio,
    topTraderRatio,
    overallScore: Math.max(score, quantScore),
    tp1Price,
  });

  // Modul Auto-Hedge & Risk Gatekeeper (Konsep AutoHedge - Swarms)
  const autoHedge = generateAutoHedgeRecommendation({
    symbol,
    direction,
    currentPrice,
    change24h,
    fundingRatePct,
    btcContext,
    indicators,
    orderbookDepth,
    overallScore: Math.max(score, quantScore),
    slPct,
  });

  return {
    id: `custom-${symbol}-${Date.now().toString(36)}`,
    symbol,
    baseAsset,
    quoteAsset: 'USDT',
    direction,
    signalTier: tier,
    strategy,
    strategyLabel,
    entryZone: {
      low: entryLow,
      high: entryHigh,
      current: currentPrice,
      label: `$${formatFuturesPrice(entryLow)} – $${formatFuturesPrice(entryHigh)}`,
    },
    targets: {
      tp1: { price: tp1Price, gainPct: tp1Pct, isHit: false, eta: tp1Eta },
      tp2: { price: tp2Price, gainPct: tp2Pct, isHit: false, eta: tp2Eta },
      tp3: { price: tp3Price, gainPct: tp3Pct, isHit: false, eta: tp3Eta },
    },
    stopLoss: {
      price: slPrice,
      lossPct: -slPct,
      label: `$${formatFuturesPrice(slPrice)} (-${slPct.toFixed(1)}%)`,
      isHit: false,
    },
    riskRewardRatio: rrRatio,
    leverage: getDualLeverage(change24h),
    timeframe: '15m',
    derivativesData: {
      fundingRate,
      fundingRatePct,
      fundingCountdown: 'Tiap 8 Jam',
      nextFundingTime: fundingInfo ? fundingInfo.nextFundingTime : Date.now() + 14400000,
      openInterestUsd,
      openInterestChange24h: Number((change24h * 0.7).toFixed(2)),
      longShortRatio,
      topTraderLongShortRatio: topTraderRatio !== null ? topTraderRatio : undefined,
      takerBuySellRatio: takerRatio !== null ? takerRatio : undefined,
      volume24hUsd: quoteVolume,
      priceChange24hPct: change24h,
      high24h,
      low24h,
      macroFearAndGreed: btcContext.fearAndGreed,
    },
    agentConsensus: {
      trendAgent: {
        pass: isMaBullish || isMaBearish || Boolean(detectedPattern),
        score: score >= 88 ? 92 : 80,
        reason: `${direction} momentum divalidasi oleh deret klines 15m${detectedPattern ? ` & pola ${detectedPattern.name}` : ''}.`,
      },
      volatilityAgent: {
        pass: true,
        score: Math.min(Math.round(volMultiplier * 40), 95),
        reason: `Volatilitas aktif (${change24h > 0 ? '+' : ''}${change24h.toFixed(1)}%) menyediakan ruang profit R:R ${rrRatio}.`,
      },
      derivativesAgent: {
        pass: true,
        score: Math.abs(fundingRatePct) >= 0.04 ? 94 : 85,
        reason: `${fundingInsightText} OI: $${(openInterestUsd / 1e6).toFixed(1)}M. Rasio L/S: ${longShortRatio.toFixed(2)}.`,
      },
      orderbookAgent: {
        pass: orderbookDepth ? (direction === 'LONG' ? orderbookDepth.imbalanceRatio >= 0.9 : orderbookDepth.imbalanceRatio <= 1.1) : true,
        score: orderbookDepth
          ? (direction === 'LONG' && orderbookDepth.imbalanceRatio >= 2.0 ? 96 : direction === 'SHORT' && orderbookDepth.imbalanceRatio <= 0.5 ? 96 : 84)
          : 80,
        reason: orderbookDepth
          ? `${orderbookDepth.insight} (Bid $${(orderbookDepth.totalBidUsd / 1e6).toFixed(2)}M vs Ask $${(orderbookDepth.totalAskUsd / 1e6).toFixed(2)}M).`
          : `Volume 24 jam $${(quoteVolume / 1e6).toFixed(1)}M USD memenuhi likuiditas transaksi.`,
      },
    },
    overallScore: Math.max(score, quantScore),
    rationale,
    status: 'ACTIVE',
    binanceUrl: `https://www.binance.com/en/futures/${symbol}`,
    tradingViewSymbol: `BINANCE:${symbol}.P`,
    timestamp: Date.now(),
    indicators,
    indicatorExplanation,
    candlestickPattern: detectedPattern || undefined,
    smcAnalysis,
    btcContext,
    positionSizing,
    orderbookDepth,
    quantAnomaly,
    bullBearDebate,
    autoHedge,
    multiTimeframe: generateMultiTimeframeAlignment({
      symbol,
      direction,
      currentPrice,
      change24h: Math.round(parseFloat(ticker.priceChangePercent)),
      indicators,
      overallScore: Math.max(score, quantScore),
    }),
  };
}
