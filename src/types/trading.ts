import {
  TokenSignal,
  ConsensusResult,
  ActivePosition,
  TerminalTelemetry,
  ClosedTrade,
  WalletState,
  AgentThresholds,
  AutoSnipeConfig,
  TradingStyle
} from './terminal';
export type { ActivePosition, TradingStyle };
import { ExecutionConfig } from '../components/ExecutionSettingsModal';
import type { WebhookTelegramConfig, WebhookDiscordConfig } from '../context/TradingContext';
import { TradingSignal } from './signal';

export type LogLevel = 'INFO' | 'SUCCESS' | 'WARN' | 'DANGER';
export type LogCategory = 'SCAN' | 'RISK' | 'JITO' | 'EXECUTION' | 'SYSTEM' | 'TELEGRAM' | 'DECISION';

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
  useKellySizing?: boolean;
  priorityFeeMicroLamports: number;
  jitoTipTier: 'ECONOMY' | 'STANDARD' | 'FAST' | 'TURBO' | 'ULTRA_DEGEN';
  takeProfitMultiplier: number;
  trailingStopLossPct: number;
  takeProfitPct?: number; // e.g. 100 for +100%
  stopLossPct?: number; // e.g. -25 for -25%
  maxHoldTimeSec?: number; // e.g. 180s TTL
  enableMomentumExit?: boolean; // emergency exit on velocity dump / stagnancy
  tradingStyle?: TradingStyle;
  ttlUnlimited?: boolean;
  autoSellEnabled?: boolean;
  antiRugpull: {
    requireMintRevoked: boolean;
    requireFreezeRevoked: boolean;
    maxTop10HoldersPct: number;
    maxCreatorBalancePct: number;
    autoBlacklistHoneypot: boolean;
  };
}

export interface PendingSnipeConfirmation {
  token: TokenSignal;
  consensus: ConsensusResult;
  solInvest: number;
}

export interface TradingState {
  engineStatus: 'AUTONOMOUS' | 'IDLE' | 'PAUSED';
  dataSource: 'REAL_SOLANA' | 'SIMULATOR';
  visualMode: 'radar' | 'cluster' | 'kelly' | 'ledger' | 'chart' | 'grid';
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
  telegramConfig: WebhookTelegramConfig;
  discordConfig: WebhookDiscordConfig;
  isAudioMuted: boolean;
  isSearchingMint: boolean;
  sniperStatus: string | null;
  pendingSnipeConfirmation: PendingSnipeConfirmation | null;
  walletHoldings: import('../app/api/wallet/holdings/route').TokenHolding[];
  isHoldingsLoading: boolean;
  totalHoldingsValueUsd: number;
  totalHoldingsValueSol: number;
  isSimulationMode: boolean; // Dry-Run Mode: Intercepts Phantom RPC transactions with mock execution
  // ─── Signal Provider ───
  activeSignals: TradingSignal[];
  signalHistory: TradingSignal[];
  agentThresholds: AgentThresholds;
}

export interface TradingActions {
  setEngineStatus: (status: 'AUTONOMOUS' | 'IDLE' | 'PAUSED') => void;
  toggleEngine: () => void;
  emergencyKillSwitch: () => void;
  quickSellPosition: (percentage: number) => void;
  manualExitPosition: () => void;
  resetPositionMutex: () => void;
  executeSell: (pos: ActivePosition, reason: string, percentage?: number) => Promise<void>;
  snipeManualMint: (mint: string) => Promise<void>;
  confirmSnipe: () => void;
  cancelSnipe: () => void;
  selectResult: (result: ConsensusResult | null) => void;
  setVisualMode: (mode: 'radar' | 'cluster' | 'kelly' | 'ledger' | 'chart' | 'grid') => void;
  updateAgentConfig: (updates: Partial<AgentConfig>) => void;
  updateExecutionConfig: (updates: Partial<ExecutionConfig>) => void;
  updateAutoSnipeConfig: (updates: Partial<AutoSnipeConfig>) => void;
  setAgentThresholds: (thresholds: AgentThresholds) => void;
  setTradingStyle: (style: TradingStyle) => void;
  updateTelegramConfig: (updates: Partial<WebhookTelegramConfig>) => void;
  updateDiscordConfig: (updates: Partial<WebhookDiscordConfig>) => void;
  updateWalletState: (wallet: WalletState) => void;
  toggleAudio: () => void;
  openLivePosition: (result: import('../lib/jupiter').SwapExecutionResult, token?: TokenSignal | null) => Promise<void>;
  refreshWalletBalance: () => Promise<void>;
  refreshHoldings: () => Promise<void>;
  sellTokenHolding: (mint: string, percentage: number) => Promise<boolean>;
  dumpAllHoldingsToSol: () => Promise<void>;
  unwrapWsolOrCloseAccount: (mint: string, isToken2022?: boolean) => Promise<boolean>;
  emergencyStopAllTrading: () => void;
  setIsSimulationMode: (enabled: boolean) => void;
  toggleSimulationMode: () => void;
  clearLogs: () => void;
  clearTrades: () => void;
  appendLog: (category: LogCategory, level: LogLevel, message: string, data?: any) => void;
  // ─── Signal Provider Actions ───
  broadcastSignal: (signal: TradingSignal, config: WebhookTelegramConfig) => Promise<void>;
  clearSignals: () => void;
  dismissSignal: (signalId: string) => void;
  deleteSignalHistoryItem: (id: string) => void;
  clearSignalHistoryByFilter: (option: 'all' | 'older_1h' | 'older_24h' | 'older_7d' | 'older_30d' | 'last_1h' | 'last_24h' | 'last_7d' | 'last_30d' | 'sl_only') => number;
  restoreSeedSignals: () => void;
  scanSolanaLiveNow: (mode?: 'ALL' | 'SNIPER' | 'GRADUATING_PUMP' | 'BREAKOUT' | 'VOLUME_SURGE' | 'WHALE' | 'SUPERNOVA') => Promise<number>;
  promoteTokenToAlphaSignal: (token: any) => Promise<boolean>;
}

export type TradingContextType = TradingState & TradingActions;
export type { TokenHolding } from '../app/api/wallet/holdings/route';
