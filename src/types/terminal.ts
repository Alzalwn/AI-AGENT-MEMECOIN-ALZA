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
  jitoTipTier: 'ECONOMY' | 'STANDARD' | 'FAST' | 'TURBO';
  takeProfitMultiplierR: number;
  stopLossMultiplierR: number;
  maxDailyTrades: number;
  dailyTradesExecuted: number;
  lastSnipeTimestamp?: number;
}