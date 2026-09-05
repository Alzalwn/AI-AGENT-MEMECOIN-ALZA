import {
  TokenSignal,
  ConsensusResult,
  ActivePosition,
  TerminalTelemetry,
  ClosedTrade,
  WalletState,
  AgentThresholds,
  AutoSnipeConfig
} from './terminal';
import { ExecutionConfig } from '../components/ExecutionSettingsModal';

export type LogLevel = 'INFO' | 'SUCCESS' | 'WARN' | 'DANGER';
export type LogCategory = 'SCAN' | 'RISK' | 'JITO' | 'EXECUTION' | 'SYSTEM' | 'TELEGRAM';

export interface LogMessage {
  id: string;
  timestamp: number;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: any;
}

export interface NetworkMetrics {
  rpcLabel: string;
  latencyMs: number;
  currentSlot: number;
  gasPriceGwei: number;
  jitoTipSol: number;
  isBlockEngineOnline: boolean;
}

export interface AgentConfig {
  mode: 'AUTONOMOUS' | 'SEMI_AUTONOMOUS' | 'MANUAL';
  slippagePct: number;
  maxBuyAmountSol: number;
  priorityFeeMicroLamports: number;
  jitoTipTier: 'ECONOMY' | 'STANDARD' | 'FAST' | 'TURBO';
  takeProfitMultiplier: number;
  trailingStopLossPct: number;
  antiRugpull: {
    requireMintRevoked: boolean;
    requireFreezeRevoked: boolean;
    maxTop10HoldersPct: number;
    maxCreatorBalancePct: number;
    autoBlacklistHoneypot: boolean;
  };
}

export interface TradingState {
  engineStatus: 'AUTONOMOUS' | 'IDLE' | 'PAUSED';
  dataSource: 'REAL_SOLANA' | 'SIMULATOR';
  visualMode: 'radar' | 'cluster' | 'kelly' | 'ledger' | 'chart';
  activePosition: ActivePosition | null;
  closedTrades: ClosedTrade[];
  consensusFeed: ConsensusResult[];
  selectedResult: ConsensusResult | null;
  logs: LogMessage[];
  telemetry: TerminalTelemetry;
  networkMetrics: NetworkMetrics;
  walletState: WalletState;
  agentConfig: AgentConfig;
  executionConfig: ExecutionConfig;
  autoSnipeConfig: AutoSnipeConfig;
  isAudioMuted: boolean;
  isSearchingMint: boolean;
  sniperStatus: string | null;
}

export interface TradingActions {
  setEngineStatus: (status: 'AUTONOMOUS' | 'IDLE' | 'PAUSED') => void;
  toggleEngine: () => void;
  emergencyKillSwitch: () => void;
  quickSellPosition: (percentage: number) => void;
  manualExitPosition: () => void;
  snipeManualMint: (mint: string) => Promise<void>;
  selectResult: (result: ConsensusResult | null) => void;
  setVisualMode: (mode: 'radar' | 'cluster' | 'kelly' | 'ledger' | 'chart') => void;
  updateAgentConfig: (updates: Partial<AgentConfig>) => void;
  updateExecutionConfig: (updates: Partial<ExecutionConfig>) => void;
  updateAutoSnipeConfig: (updates: Partial<AutoSnipeConfig>) => void;
  updateWalletState: (wallet: WalletState) => void;
  toggleAudio: () => void;
  clearLogs: () => void;
  appendLog: (category: LogCategory, level: LogLevel, message: string, data?: any) => void;
}

export type TradingContextType = TradingState & TradingActions;
