/**
 * Binance Futures Signal Terminal — Type Definitions
 * Mendefinisikan struktur data untuk sinyal derivatif, orderbook, funding rate,
 * open interest, dan dual-dashboard state.
 */

export type FuturesDirection = 'LONG' | 'SHORT';

export type FuturesSignalTier = 'SUPERNOVA' | 'HIGH' | 'MODERATE';

export type FuturesStrategy =
  | 'BREAKOUT_MOMENTUM'
  | 'RSI_EXTREME_REVERSAL'
  | 'FUNDING_SQUEEZE'
  | 'EMA_TREND_RIDER'
  | 'VOLATILITY_EXPANSION';

export type FuturesSignalStatus =
  | 'ACTIVE'
  | 'TP1_HIT'
  | 'TP2_HIT'
  | 'TP3_HIT'
  | 'SL_HIT'
  | 'EXPIRED'
  | 'CANCELLED';

export interface FuturesTarget {
  price: number;
  gainPct: number;
  isHit: boolean;
  hitAt?: number;
  eta: string;
}

export interface FuturesStopLoss {
  price: number;
  lossPct: number;
  label: string;
  isHit: boolean;
  hitAt?: number;
}

export interface FuturesEntryZone {
  low: number;
  high: number;
  current: number;
  label: string;
}

export interface LeverageOption {
  range: string;        // e.g. "5x – 10x"
  multiplier: number;   // nominal reference, e.g. 7
  mode: 'ISOLATED' | 'CROSS';
  description: string;  // e.g. "Aman / Swing Trade: Resiko likuidasi rendah"
}

export interface DualLeverageConfig {
  safe: LeverageOption;
  scalp: LeverageOption;
}

export interface DerivativesTelemetry {
  fundingRate: number;          // e.g. 0.0001
  fundingRatePct: number;       // e.g. 0.01 (%)
  fundingCountdown?: string;    // e.g. "Tiap 8 Jam"
  nextFundingTime: number;      // ms timestamp
  openInterestUsd: number;      // Open interest dalam USD
  openInterestChange24h: number;// % perubahan OI 24 jam
  longShortRatio: number;       // e.g. 1.25 (55.5% Long vs 44.5% Short)
  volume24hUsd: number;         // Total volume 24 jam dalam USD
  priceChange24hPct: number;    // % perubahan harga 24 jam
  high24h: number;
  low24h: number;
}

export interface FuturesAgentVerdict {
  pass: boolean;
  score: number; // 0 - 100
  reason: string;
}

export interface FuturesAgentConsensus {
  trendAgent: FuturesAgentVerdict;
  volatilityAgent: FuturesAgentVerdict;
  derivativesAgent: FuturesAgentVerdict;
  orderbookAgent: FuturesAgentVerdict;
}

export interface BinanceFuturesSignal {
  id: string;
  symbol: string;             // e.g. "BTCUSDT", "SOLUSDT"
  baseAsset: string;          // e.g. "BTC"
  quoteAsset: string;         // e.g. "USDT"
  direction: FuturesDirection;// 'LONG' | 'SHORT'
  signalTier: FuturesSignalTier;
  strategy: FuturesStrategy;
  strategyLabel: string;      // e.g. "⚡ Funding Squeeze Reversal"
  
  entryZone: FuturesEntryZone;
  targets: {
    tp1: FuturesTarget;
    tp2: FuturesTarget;
    tp3: FuturesTarget;
  };
  stopLoss: FuturesStopLoss;
  
  riskRewardRatio: number;     // e.g. 3.4
  leverage: DualLeverageConfig;// Menampilkan profil SAFE (5x-10x) dan SCALP (10x-20x)
  timeframe: '15m' | '1h' | '4h';
  
  derivativesData: DerivativesTelemetry;
  agentConsensus: FuturesAgentConsensus;
  overallScore: number;        // 0 - 100
  rationale: string;           // Ringkasan analisa teknikal & sentimen
  
  status: FuturesSignalStatus;
  binanceUrl: string;          // https://www.binance.com/en/futures/{SYMBOL}
  tradingViewSymbol: string;   // BINANCE:{SYMBOL}.P
  timestamp: number;
  isArchived?: boolean;
}

export interface FuturesMarketStats {
  totalPairs: number;
  activeSignalsCount: number;
  total24hVolumeUsd: number;
  marketBias: 'STRONG_BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'STRONG_BEARISH';
  longAccountPct: number;
  shortAccountPct: number;
  avgFundingRate: number;
  topSqueezeCoins: Array<{
    symbol: string;
    fundingRatePct: number;
    oiChange24h: number;
    potentialType: 'SHORT_SQUEEZE_LONG' | 'LONG_SQUEEZE_SHORT';
  }>;
  topGainers: Array<{
    symbol: string;
    priceChangePct: number;
    price: number;
    volumeUsd: number;
  }>;
  topLosers: Array<{
    symbol: string;
    priceChangePct: number;
    price: number;
    volumeUsd: number;
  }>;
  lastUpdated: number;
}
