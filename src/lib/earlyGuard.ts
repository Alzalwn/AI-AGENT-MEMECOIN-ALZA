/**
 * Early-Entry Guard — Solana Memecoin Early Stage Quality & Timing Gate
 * ====================================================================
 * Mencegat token yang harganya sudah terbang tinggi (already pumped),
 * membatasi kapitalisasi pasar di bawah $30k, membatasi usia token (< 5-10 menit),
 * mendeteksi lonjakan harga berlebihan (>300%), dan memastikan likuiditas awal cukup.
 *
 * Sesuai Standar: Senior Web3 Data Engineer & Solana Analyst
 */

export interface EarlyEntryGuardConfig {
  maxMarketCapUsd: number;      // Batas atas MC (default: $30,000 USD)
  minLiquidityUsd: number;      // Batas bawah likuiditas (default: $1,500 USD / ~10 SOL)
  maxTokenAgeMinutes: number;   // Usia maksimal sejak mint (default: 10 menit, ideal < 3-5m)
  idealTokenAgeMinutes: number; // Usia ideal target awal (default: 3-5 menit)
  maxPricePumpPct: number;      // Kenaikan maksimal dari harga buka (default: 300% - 500%)
}

export const DEFAULT_EARLY_GUARD_CONFIG: EarlyEntryGuardConfig = {
  maxMarketCapUsd: 150000,     // Hard ceiling: Drop > $150,000 USD (Early Microcap Breakout Zone)
  minLiquidityUsd: 2500,       // Minimum liquidity floor ($2,500)
  maxTokenAgeMinutes: 720,     // Hard cutoff: 12 jam (Intra-day alpha window)
  idealTokenAgeMinutes: 15,    // Sweet spot: 5 - 30 menit
  maxPricePumpPct: 500,        // Max pump dari initial price: +500%
};

export interface TokenCandleMetadata {
  mint: string;
  symbol: string;
  currentMarketCapUsd: number;
  currentLiquidityUsd: number;
  currentPriceSol: number;
  initialPriceSol?: number;     // Harga saat pembukaan likuiditas pertama kali
  pairCreatedAtTimestampMs?: number; // Waktu pembuatan bonding curve / pool
  detectedAtTimestampMs?: number;
  scanTier?: 'EARLY_GEM' | 'BREAKOUT_RUNNER';
}

export type EarlyGuardVerdict =
  | 'APPROVED_EARLY'
  | 'DROP_OVERCAP'
  | 'DROP_TOO_OLD'
  | 'DROP_MISSED_ENTRY'
  | 'DROP_LOW_LIQUIDITY';

export interface EarlyGuardResult {
  isPassed: boolean;
  verdict: EarlyGuardVerdict;
  reason: string;
  tokenAgeMinutes: number;
  pricePumpPct: number;
  marketCapUsd: number;
  liquidityUsd: number;
}

/**
 * Mengevaluasi token terhadap 4 aturan filter ketat Early-Entry Guard
 */
export function evaluateEarlyEntryGuard(
  token: TokenCandleMetadata,
  config: EarlyEntryGuardConfig = DEFAULT_EARLY_GUARD_CONFIG
): EarlyGuardResult {
  const now = Date.now();
  const createdAt = token.pairCreatedAtTimestampMs || (token.detectedAtTimestampMs || now);
  const ageMinutes = Math.max(0, (now - createdAt) / (1000 * 60));

  const isRunner = token.scanTier === 'BREAKOUT_RUNNER';
  const effectiveMaxMc = isRunner ? 5000000 : config.maxMarketCapUsd;
  const effectiveMaxAgeMin = isRunner ? 10080 : config.maxTokenAgeMinutes;
  const effectiveMinLp = isRunner ? 15000 : config.minLiquidityUsd;

  // Hitung persentase kenaikan harga dari harga awal (initial price)
  const initialPrice = token.initialPriceSol || token.currentPriceSol;
  const pricePumpPct = initialPrice > 0
    ? ((token.currentPriceSol - initialPrice) / initialPrice) * 100
    : 0;

  // 1. Filter Syarat Minimal Likuiditas Awal (Liquidity Floor)
  if (token.currentLiquidityUsd < effectiveMinLp) {
    return {
      isPassed: false,
      verdict: 'DROP_LOW_LIQUIDITY',
      reason: `Likuiditas terlalu rendah ($${Math.round(token.currentLiquidityUsd).toLocaleString()} < Min $${effectiveMinLp.toLocaleString()}). Berisiko pool jebakan.`,
      tokenAgeMinutes: +ageMinutes.toFixed(1),
      pricePumpPct: +pricePumpPct.toFixed(1),
      marketCapUsd: token.currentMarketCapUsd,
      liquidityUsd: token.currentLiquidityUsd
    };
  }

  // 2. Filter Batas Atas Kapitalisasi Pasar (Market Cap Ceiling)
  if (token.currentMarketCapUsd > effectiveMaxMc) {
    return {
      isPassed: false,
      verdict: 'DROP_OVERCAP',
      reason: `Market Cap sudah menyentuh $${Math.round(token.currentMarketCapUsd).toLocaleString()} (> Maks $${effectiveMaxMc.toLocaleString()}).`,
      tokenAgeMinutes: +ageMinutes.toFixed(1),
      pricePumpPct: +pricePumpPct.toFixed(1),
      marketCapUsd: token.currentMarketCapUsd,
      liquidityUsd: token.currentLiquidityUsd
    };
  }

  // 3. Filter Usia Koin Maksimal
  if (ageMinutes > effectiveMaxAgeMin) {
    return {
      isPassed: false,
      verdict: 'DROP_TOO_OLD',
      reason: `Usia token sudah ${ageMinutes.toFixed(1)} menit (> Cutoff ${effectiveMaxAgeMin} menit).`,
      tokenAgeMinutes: +ageMinutes.toFixed(1),
      pricePumpPct: +pricePumpPct.toFixed(1),
      marketCapUsd: token.currentMarketCapUsd,
      liquidityUsd: token.currentLiquidityUsd
    };
  }

  // 4. Deteksi Spike Berlebihan (Price-Pump Cutoff > 300%)
  if (pricePumpPct > config.maxPricePumpPct) {
    return {
      isPassed: false,
      verdict: 'DROP_MISSED_ENTRY',
      reason: `Harga saat ini sudah melambung +${pricePumpPct.toFixed(0)}% dari initial price (> Maks +${config.maxPricePumpPct}%). Status: MISSED_ENTRY (peringatan dibatalkan).`,
      tokenAgeMinutes: +ageMinutes.toFixed(1),
      pricePumpPct: +pricePumpPct.toFixed(1),
      marketCapUsd: token.currentMarketCapUsd,
      liquidityUsd: token.currentLiquidityUsd
    };
  }

  // Lolos semua kriteria Early-Entry
  return {
    isPassed: true,
    verdict: 'APPROVED_EARLY',
    reason: `Lolos Early-Entry Guard: MC $${Math.round(token.currentMarketCapUsd).toLocaleString()} (<= $${config.maxMarketCapUsd.toLocaleString()}), Usia ${ageMinutes.toFixed(1)}m, Kenaikan +${pricePumpPct.toFixed(0)}% (<= +${config.maxPricePumpPct}%).`,
    tokenAgeMinutes: +ageMinutes.toFixed(1),
    pricePumpPct: +pricePumpPct.toFixed(1),
    marketCapUsd: token.currentMarketCapUsd,
    liquidityUsd: token.currentLiquidityUsd
  };
}
