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