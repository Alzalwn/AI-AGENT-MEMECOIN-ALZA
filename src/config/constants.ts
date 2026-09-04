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
