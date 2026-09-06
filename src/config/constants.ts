/**
 * Grok Trencher - Solana Multi-Agent Trading System Configuration
 * Parameters grounded strictly in PRD Section 4 & 6.
 */

export const PRD_THRESHOLDS = {
  // Scanner Agent
  MIN_INITIAL_LP_USD: 5000,
  MIN_BURNT_LIQUIDITY_PCT: 100,

  // Narrative Agent
  MIN_COSINE_SIMILARITY: 0.85,

  // Risk Agent
  MAX_TOP10_HOLDERS_PCT: 15,
  REQUIRE_MINT_REVOKED: true,
  REQUIRE_FREEZE_REVOKED: true,

  // Timing Agent
  MIN_15S_VOLUME_DELTA: 0,
  MIN_UNIQUE_BUYERS: 3,

  // Risk Sizing (Fractional Kelly)
  MAX_PORTFOLIO_ALLOCATION_PCT: 6.2, // ~6.2% cap for <= 15% Risk of Ruin
  KELLY_MULTIPLIER: 0.25, // Fractional Kelly 0.25x

  // Exit Agent
  TRAILING_STOP_LOSS_R: 0.33, // Veto if loss > 0.33R
  TARGET_TAKE_PROFIT_R: 3.0,  // Rolling expectancy target E[R] >= +3.0R
  EMERGENCY_DRAIN_PCT_DROP: 25, // Instant exit if LP drops > 25%

  // Jito MEV
  JITO_BASE_TIP_LAMPORTS: 50000, // 0.00005 SOL base
  TARGET_LATENCY_MAX_MS: 350,   // Sub-350ms end-to-end target
} as const;

export const NARRATIVE_KEYWORDS = [
  'ai agent', 'grok', 'trencher', 'autonomous', 'swarm',
  'solana mev', 'terminal', 'neural', 'quantum', 'singularity',
  'cyber', 'agentic', 'pump'
];

export const JITO_TIP_ACCOUNTS = [
  '96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5',
  'HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe',
  'Cw8CFyM9FkoMi7K7Crf6HNQqf4uEMzpKw6QNghXLvLkY',
  'ADaUMid9yfUytqMBgopwjb2DTLSokTSzL1zt6iGPaS49',
  'DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh',
  'ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt',
  'DttWaMuVvTiduZRnguLF7jNxTgiMBZ1hyAumKUiL2KRL',
  '3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT'
] as const;

export const JITO_TIP_TIERS = {
  ECONOMY: 0.000050,
  STANDARD: 0.000100,
  FAST: 0.000500,
  TURBO: 0.002000,
  ULTRA_DEGEN: 0.005000,
} as const;

export const STRATEGY_PRESETS = {
  BALANCED: {
    presetName: 'BALANCED' as const,
    minInitialLpUsd: 5000,
    minBurntLiquidityPct: 100,
    minCosineSimilarity: 0.85,
    maxTop10HoldersPct: 15,
    requireMintRevoked: true,
    requireFreezeRevoked: true,
    minVolumeDelta15s: 0,
    minUniqueBuyers: 3,
    kellyFraction: 0.25,
    targetTakeProfitR: 3.0,
    trailingStopLossR: 0.33,
  },
  DEGEN: {
    presetName: 'DEGEN' as const,
    minInitialLpUsd: 2500,
    minBurntLiquidityPct: 90,
    minCosineSimilarity: 0.80,
    maxTop10HoldersPct: 25,
    requireMintRevoked: true,
    requireFreezeRevoked: false,
    minVolumeDelta15s: -5,
    minUniqueBuyers: 2,
    kellyFraction: 0.40,
    targetTakeProfitR: 4.5,
    trailingStopLossR: 0.45,
  },
  CONSERVATIVE: {
    presetName: 'CONSERVATIVE' as const,
    minInitialLpUsd: 12000,
    minBurntLiquidityPct: 100,
    minCosineSimilarity: 0.90,
    maxTop10HoldersPct: 10,
    requireMintRevoked: true,
    requireFreezeRevoked: true,
    minVolumeDelta15s: 5,
    minUniqueBuyers: 6,
    kellyFraction: 0.15,
    targetTakeProfitR: 2.5,
    trailingStopLossR: 0.25,
  },
  CUSTOM: {
    presetName: 'CUSTOM' as const,
    minInitialLpUsd: 5000,
    minBurntLiquidityPct: 100,
    minCosineSimilarity: 0.85,
    maxTop10HoldersPct: 15,
    requireMintRevoked: true,
    requireFreezeRevoked: true,
    minVolumeDelta15s: 0,
    minUniqueBuyers: 3,
    kellyFraction: 0.25,
    targetTakeProfitR: 3.0,
    trailingStopLossR: 0.33,
  }
};
