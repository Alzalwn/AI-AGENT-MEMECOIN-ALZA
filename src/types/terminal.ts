export type AgentId = 'scanner' | 'narrative' | 'risk' | 'timing' | 'exit';

export interface TokenSignal {
  id: string;
  mint: string;
  symbol: string;
  name: string;
  platform: 'Pump.fun' | 'Raydium';
  initialLpUsd: number;
  burntLiquidityPct: number;
  mintAuthorityRevoked: boolean;
  freezeAuthorityRevoked: boolean;
  top10HolderPct: number;
  volumeDelta15s: number;
  uniqueBuyersCount: number;
  narrativeCosineSim: number;
  narrativeTheme: string;
  priceSol: number;
  detectedAt: number;
  // Real on-chain metadata
  iconUrl?: string;
  dexUrl?: string;
  description?: string;
  isRealData?: boolean;
  // Bonding Curve & Security Verifier
  bondingCurveProgress?: number;
  isBondingCurveGraduated?: boolean;
  rugcheckScore?: 'GOOD' | 'WARNING' | 'DANGER';
  rugcheckNumericScore?: number;
  rugcheckRisks?: string[];
  isHoneypotDetected?: boolean;
  rugcheckReportUrl?: string;
  creatorAddress?: string;
  creatorBalancePct?: number;
  // Moonshot Predictor & Order Flow Metrics
  txVelocityPerSec?: number;
  buySellRatio?: number;
  smartMoneyCount?: number;
  smartMoneyWallets?: string[];
  moonshot?: MoonshotVerdict;
  honeypotCheck?: import('../lib/honeypot').HoneypotCheckResult;
}

export interface MoonshotPillars {
  orderFlow: {
    score: number; // max 30
    txVelocityPerSec: number;
    buySellRatio: number;
    uniqueBuyersCount: number;
    status: 'EXPLOSIVE' | 'HEALTHY' | 'WEAK';
  };
  distribution: {
    score: number; // max 25
    top10HolderPct: number;
    creatorBalancePct?: number;
    isBundlingDetected: boolean;
    status: 'ORGANIC' | 'ACCEPTABLE' | 'BUNDLED_RISK';
  };
  smartMoney: {
    score: number; // max 25
    detectedCount: number;
    walletLabels: string[];
    status: 'ALPHA_WHALE_IN' | 'INSIDER_DETECTED' | 'RETAIL_ONLY';
  };
  security: {
    score: number; // max 20
    mintRevoked: boolean;
    freezeRevoked: boolean;
    lpBurntPct: number;
    isHoneypot: boolean;
    isAbsoluteSafe: boolean;
  };
}

export interface MoonshotVerdict {
  tokenMint: string;
  symbol: string;
  moonshotScore: number; // 0 - 100%
  tier: 'SUPERNOVA' | 'HIGH_POTENTIAL' | 'MODERATE' | 'VETOED';
  isApproved: boolean;
  vetoReason?: string;
  pumpThesis: string;
  pillars: MoonshotPillars;
  timestamp: number;
}

export interface AgentVerdict {
  agentId: AgentId;
  agentName: string;
  status: 'APPROVE' | 'VETO';
  reason: string;
  metricValue: string | number;
  threshold: string | number;
  latencyMs: number;
}

export interface ConsensusResult {
  token: TokenSignal;
  verdict: 'APPROVED' | 'VETOED';
  vetoAgent?: AgentId;
  vetoReason?: string;
  verdicts: Record<AgentId, AgentVerdict>;
  consensusLatencyMs: number;
  timestamp: number;
  moonshot?: MoonshotVerdict;
  honeypotCheck?: import('../lib/honeypot').HoneypotCheckResult;
}

export interface ActivePosition {
  id: string;
  token: TokenSignal;
  entryPriceSol: number;
  currentPriceSol: number;
  solInvested: number;
  tokenAmount: number;
  pnlSol: number;
  pnlPct: number;
  rMultiplier: number;
  highestPriceSol: number;
  trailingStopPriceSol: number;
  entryTimestamp: number;
  status: 'OPEN' | 'CLOSING' | 'CLOSED';
  // Quantitative Predictive Analytics
  targetTpPct?: number; // e.g. 100 for +100%
  targetTpPriceSol?: number; // entryPriceSol * (1 + targetTpPct/100)
  stopLossPct?: number; // e.g. -25 for -25%
  stopLossPriceSol?: number; // entryPriceSol * (1 + stopLossPct/100)
  velocityPctPerSec?: number; // (% price change per second)
  etaToTpSeconds?: number | null; // projected seconds to TP (null if dropping/stagnant)
  momentumStatus?: 'ACCELERATING' | 'STEADY' | 'STAGNANT' | 'DROPPING';
  maxHoldTimeSec?: number; // TTL (default: 180s)
  holdDurationSec?: number; // hold duration in seconds
  trailingDistancePct?: number; // trailing stop distance % (default: 15%)
}

export interface TerminalTelemetry {
  engineStatus: 'LIVE' | 'PAUSED';
  dataSource: 'REAL_SOLANA' | 'SIMULATOR';
  slotLatencyMs: number;
  currentSlot: number;
  initialBalanceSol: number;
  currentBalanceSol: number;
  totalPnlSol: number;
  rollingExpectancyR: number;
  winCount: number;
  lossCount: number;
  scannedCount: number;
  vetoCount: number;
  activePositionLocked: boolean;
}

export type StrategyPresetType = 'DEGEN' | 'BALANCED' | 'CONSERVATIVE' | 'CUSTOM';

export interface AgentThresholds {
  presetName: StrategyPresetType;
  minInitialLpUsd: number;
  minBurntLiquidityPct: number;
  minCosineSimilarity: number;
  maxTop10HoldersPct: number;
  requireMintRevoked: boolean;
  requireFreezeRevoked: boolean;
  minVolumeDelta15s: number;
  minUniqueBuyers: number;
  kellyFraction: number;
  targetTakeProfitR: number;
  trailingStopLossR: number;
}

export interface ClosedTrade {
  id: string;
  token: TokenSignal;
  entryPriceSol: number;
  exitPriceSol: number;
  solInvested: number;
  pnlSol: number;
  pnlPct: number;
  rMultiplier: number;
  holdDurationSec: number;
  exitReason: string;
  entryTimestamp: number;
  exitTimestamp: number;
  jitoTipSol: number;
}

export interface WalletState {
  isConnected: boolean;
  publicKey: string | null;
  fullPublicKey?: string | null;
  balanceSol: number;
  walletName: 'Phantom' | 'Solflare' | 'Backpack' | null;
  mode: 'PAPER_TRADING' | 'LIVE_ON_CHAIN';
}

export interface AutoSnipeConfig {
  isEnabled: boolean;
  buyAmountSol: number;
  minGrokViralityScore: number;
  minLiquidityUsd: number;
  maxTop10HoldersPct: number;
  jitoTipTier: 'ECONOMY' | 'STANDARD' | 'FAST' | 'TURBO' | 'ULTRA_DEGEN';
  takeProfitMultiplierR: number;
  stopLossMultiplierR: number;
  maxDailyTrades: number;
  dailyTradesExecuted: number;
  useKellySizing?: boolean;
  lastSnipeTimestamp?: number;
  takeProfitPct?: number; // e.g. 100 (+100%)
  stopLossPct?: number; // e.g. -25 (-25%)
  trailingStopLossPct?: number; // e.g. 15 (15%)
  maxHoldTimeSec?: number; // e.g. 180 (3m)
  enableMomentumExit?: boolean;
}