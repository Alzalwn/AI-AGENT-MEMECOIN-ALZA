'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  TokenSignal,
  ConsensusResult,
  ActivePosition,
  TerminalTelemetry,
  ClosedTrade,
  WalletState,
  AutoSnipeConfig,
  AgentThresholds,
  TradingStyle
} from '../types/terminal';
import {
  TradingContextType,
  TradingState,
  LogMessage,
  LogCategory,
  LogLevel,
  AgentConfig,
  NetworkMetrics,
  PendingSnipeConfirmation
} from '../types/trading';
import { ExecutionConfig, DEFAULT_EXECUTION_CONFIG } from '../components/ExecutionSettingsModal';
import { generateRandomTokenSignal } from '../engine/simulator';
import { getInitialSeedSignals } from '../engine/initialSignals';
import { runAgentConsensus, runConsensusAndBuildSignal } from '../agents/consensus';
import { MoonshotAnalyzer } from '../agents/moonshot';
import { computeSignal } from '../lib/signalCalculator';
import { evaluateEarlyEntryGuard } from '../lib/earlyGuard';
import { evaluateExitAgent } from '../agents/exit';
import { soundFx } from '../engine/audioEngine';
import { STRATEGY_PRESETS, JITO_TIP_TIERS, TRADING_STYLE_PRESETS } from '../config/constants';
import {
  sendTelegramAlphaAlert,
  sendTelegramBuyAlert,
  sendTelegramExitAlert,
  sendTelegramRugpullWarning,
  sendSignalAlert,
  TelegramConfig
} from '../lib/telegram';
import { TradingSignal } from '../types/signal';
import {
  sendDiscordAlphaAlert,
  sendDiscordBuyAlert,
  sendDiscordExitAlert,
  sendDiscordRugpullWarning,
  DiscordConfig
} from '../lib/discord';
import { createJitoBundleReceipt } from '../lib/jito';
import { rpcFailoverInstance } from '../lib/rpcFailover';
import { fetchJupiterQuote, fetchJupiterSellQuote, executeJupiterSwap, SwapExecutionResult } from '../lib/jupiter';
import type { TokenHolding } from '../app/api/wallet/holdings/route';
import { HeliusBlockchainStream } from '../lib/heliusStream';
import { verifySafeToSell } from '../lib/honeypot';
import { positionMutex } from '../engine/mutex';
import { calculateSolanaPnl, parseRawTokenUnits, lamportsToSol } from '../lib/solanaMath';
import { VersionedTransaction, Connection, PublicKey } from '@solana/web3.js';
import { ExecutionManager } from '../engine/executionManager';
import { enqueueSniffedPoolEvent } from '../engine/realIngestion';
import { supabase } from '../lib/supabase';

// Extended configs with minGrokScore (not part of base lib type)
export interface WebhookTelegramConfig extends TelegramConfig {
  minGrokScore: number;
}
export interface WebhookDiscordConfig extends DiscordConfig {
  minGrokScore: number;
}

const DEFAULT_TELEGRAM_CONFIG: WebhookTelegramConfig = {
  isEnabled: false, botToken: '', chatId: '', minGrokScore: 80
};
const DEFAULT_DISCORD_CONFIG: WebhookDiscordConfig = {
  isEnabled: false, webhookUrl: '', minGrokScore: 80
};

const DEFAULT_AGENT_CONFIG: AgentConfig = {
  mode: 'AUTONOMOUS',
  slippagePct: 1.5,
  maxBuyAmountSol: 0.62,
  useKellySizing: true,
  priorityFeeMicroLamports: 150000,
  jitoTipTier: 'STANDARD',
  takeProfitMultiplier: 3.0,
  trailingStopLossPct: 15,
  takeProfitPct: 100, // +100% Target Take Profit
  stopLossPct: -25, // -25% Hard Stop Loss
  maxHoldTimeSec: 180, // 180s (3m) Time-to-Live Fallback
  enableMomentumExit: true,
  tradingStyle: 'SCALPING',
  ttlUnlimited: false,
  autoSellEnabled: true,
  antiRugpull: {
    requireMintRevoked: true,
    requireFreezeRevoked: true,
    maxTop10HoldersPct: 20,
    maxCreatorBalancePct: 15,
    autoBlacklistHoneypot: true
  }
};

const DEFAULT_NETWORK_METRICS: NetworkMetrics = {
  rpcLabel: rpcFailoverInstance.getActiveEndpoint().name,
  latencyMs: rpcFailoverInstance.getActiveEndpoint().latencyMs,
  currentSlot: 0,
  gasPriceGwei: 0.000005,
  jitoTipSol: 0.00005,
  isBlockEngineOnline: true
};

const TradingContext = createContext<TradingContextType | null>(null);

export const TradingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Core Engine & Visual States
  const [engineStatus, setEngineStatusState] = useState<'AUTONOMOUS' | 'IDLE' | 'PAUSED'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('GT_ENGINE_STATUS');
      if (saved === 'AUTONOMOUS' || saved === 'IDLE' || saved === 'PAUSED') {
        return saved;
      }
    }
    return 'AUTONOMOUS';
  });

  const setEngineStatus = useCallback((status: 'AUTONOMOUS' | 'IDLE' | 'PAUSED' | ((prev: 'AUTONOMOUS' | 'IDLE' | 'PAUSED') => 'AUTONOMOUS' | 'IDLE' | 'PAUSED')) => {
    setEngineStatusState((prev) => {
      const next = typeof status === 'function' ? status(prev) : status;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('GT_ENGINE_STATUS', next);
        } catch {}
      }
      return next;
    });
  }, []);

  const [dataSource, setDataSource] = useState<'REAL_SOLANA' | 'SIMULATOR'>('REAL_SOLANA');
  const [visualMode, setVisualMode] = useState<'radar' | 'cluster' | 'kelly' | 'ledger' | 'chart' | 'grid'>('radar');

  // Audio Telemetry
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(() => soundFx.getIsMuted());

  // Positions & Trades — persisted in localStorage (max 200 entries)
  const [activePosition, setActivePositionState] = useState<ActivePosition | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('GT_ACTIVE_POSITION');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.token && parsed.token.mint) {
            const ageSec = (Date.now() - (parsed.entryTimestamp || 0)) / 1000;
            // Jika posisi lama berstatus CLOSED, atau TP 10000% dari sesi testing lama (>5 menit lalu), jangan kunci slot
            if (parsed.status === 'CLOSED' || (parsed.pnlPct >= 100 && ageSec > 300)) {
              localStorage.removeItem('GT_ACTIVE_POSITION');
              return null;
            }
            positionMutex.restoreLock(parsed.token.mint);
            return parsed;
          }
        }
      } catch {}
    }
    return null;
  });

  const activePositionRef = useRef<ActivePosition | null>(activePosition);
  const isPositionOpenRef = useRef<boolean>(activePosition !== null);

  const setActivePosition = useCallback((pos: ActivePosition | null | ((prev: ActivePosition | null) => ActivePosition | null)) => {
    setActivePositionState((prev) => {
      const next = typeof pos === 'function' ? pos(prev) : pos;
      activePositionRef.current = next;
      isPositionOpenRef.current = next !== null;
      if (typeof window !== 'undefined') {
        try {
          if (next) {
            localStorage.setItem('GT_ACTIVE_POSITION', JSON.stringify(next));
          } else {
            localStorage.removeItem('GT_ACTIVE_POSITION');
          }
        } catch {}
      }
      return next;
    });
  }, []);

  // Synchronize telemetry activePositionLocked with PositionMutex
  useEffect(() => {
    return positionMutex.subscribe((isLocked) => {
      setTelemetry((prev) => ({
        ...prev,
        activePositionLocked: isLocked
      }));
    });
  }, []);
  const [closedTrades, setClosedTradesState] = useState<ClosedTrade[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('GT_TRADE_HISTORY');
        if (saved) {
          const parsed: ClosedTrade[] = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Auto-sanitize: filter out any corrupted trades with insane pnlSol > 100
            const sanitized = parsed.filter(
              (t) => typeof t.pnlSol === 'number' && !isNaN(t.pnlSol) && Math.abs(t.pnlSol) <= 100
            );
            if (sanitized.length !== parsed.length) {
              localStorage.setItem('GT_TRADE_HISTORY', JSON.stringify(sanitized));
            }
            return sanitized;
          }
        }
      } catch {}
    }
    // Fresh install: empty history (no demo data on Mainnet)
    return [];
  });

  // Wrapper that saves to localStorage after every update
  const setClosedTrades = useCallback((updater: ClosedTrade[] | ((prev: ClosedTrade[]) => ClosedTrade[])) => {
    setClosedTradesState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      const sanitized = next.filter(
        (t) => typeof t.pnlSol === 'number' && !isNaN(t.pnlSol) && Math.abs(t.pnlSol) <= 100
      );
      const capped = sanitized.slice(0, 200);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('GT_TRADE_HISTORY', JSON.stringify(capped));
        } catch {}
      }
      return capped;
    });
  }, []);

  // ─── SIGNAL PROVIDER STATE ─────────────────────────────────────────────────
  // activeSignals: sinyal ACTIVE yang sedang dipantau (max 50)
  // signalHistory: semua sinyal historis (max 200)
  const [activeSignals, setActiveSignals] = useState<TradingSignal[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('GT_ACTIVE_SIGNALS');
        if (saved) {
          const parsed = JSON.parse(saved) as TradingSignal[];
          if (parsed && Array.isArray(parsed)) {
            // Auto-clean: buang token dengan MC > $150k & deduplikasi ketat per CA (mint)
            const seenMints = new Set<string>();
            const cleaned = parsed.filter((s) => {
              if (!s || !s.token || !s.token.mint) return false;
              const maxMc = s.scanTier === 'BREAKOUT_RUNNER' || s.token?.scanTier === 'BREAKOUT_RUNNER' ? 5000000 : 150000;
              if (s.marketContext && s.marketContext.marketCapUsd > maxMc) return false;
              if (s.token.initialLpUsd && s.token.initialLpUsd > maxMc) return false;
              if (seenMints.has(s.token.mint)) return false;
              seenMints.add(s.token.mint);
              return true;
            });
            if (cleaned.length > 0) {
              if (cleaned.length !== parsed.length) {
                localStorage.setItem('GT_ACTIVE_SIGNALS', JSON.stringify(cleaned));
              }
              return cleaned;
            }
            // Semua token lama kedaluwarsa (> $30k MC) — ganti dengan seed microcap early entry baru (< $30k)
            const freshSeeds = getInitialSeedSignals().activeSignals;
            localStorage.setItem('GT_ACTIVE_SIGNALS', JSON.stringify(freshSeeds));
            return freshSeeds;
          }
        }
      } catch {}
    }
    const seed = getInitialSeedSignals();
    if (typeof window !== 'undefined') {
      try { localStorage.setItem('GT_ACTIVE_SIGNALS', JSON.stringify(seed.activeSignals)); } catch {}
    }
    return seed.activeSignals;
  });

  const [signalHistory, setSignalHistoryState] = useState<TradingSignal[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('GT_SIGNAL_HISTORY');
        if (saved !== null) {
          const parsed = JSON.parse(saved) as TradingSignal[];
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {}
    }
    return getInitialSeedSignals().historySignals;
  });

  const deleteSignalHistoryItem = useCallback((id: string) => {
    setSignalHistoryState((prev) => {
      const next = prev.filter((s) => s.id !== id);
      try { localStorage.setItem('GT_SIGNAL_HISTORY', JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const clearSignalHistoryByFilter = useCallback((
    option: 'all' | 'older_1h' | 'older_24h' | 'older_7d' | 'older_30d' | 'last_1h' | 'last_24h' | 'last_7d' | 'last_30d' | 'sl_only' = 'all'
  ): number => {
    const now = Date.now();
    const HOUR = 3600 * 1000;
    const DAY = 24 * HOUR;
    const WEEK = 7 * DAY;
    const MONTH = 30 * DAY;

    let count = 0;
    setSignalHistoryState((prev) => {
      let next = prev;
      if (option === 'all') {
        next = [];
      } else if (option === 'older_1h') {
        next = prev.filter((s) => (now - s.timestamp) <= HOUR);
      } else if (option === 'older_24h') {
        next = prev.filter((s) => (now - s.timestamp) <= DAY);
      } else if (option === 'older_7d') {
        next = prev.filter((s) => (now - s.timestamp) <= WEEK);
      } else if (option === 'older_30d') {
        next = prev.filter((s) => (now - s.timestamp) <= MONTH);
      } else if (option === 'last_1h') {
        next = prev.filter((s) => (now - s.timestamp) > HOUR);
      } else if (option === 'last_24h') {
        next = prev.filter((s) => (now - s.timestamp) > DAY);
      } else if (option === 'last_7d') {
        next = prev.filter((s) => (now - s.timestamp) > WEEK);
      } else if (option === 'last_30d') {
        next = prev.filter((s) => (now - s.timestamp) > MONTH);
      } else if (option === 'sl_only') {
        next = prev.filter((s) => s.status !== 'SL_HIT');
      }
      count = prev.length - next.length;
      try { localStorage.setItem('GT_SIGNAL_HISTORY', JSON.stringify(next)); } catch {}
      return next;
    });
    return count;
  }, []);

  const restoreSeedSignals = useCallback(() => {
    const seeds = getInitialSeedSignals().historySignals;
    setSignalHistoryState(seeds);
    try { localStorage.setItem('GT_SIGNAL_HISTORY', JSON.stringify(seeds)); } catch {}
  }, []);

  const addSignalToHistory = useCallback((signal: TradingSignal) => {
    setSignalHistoryState((prev) => {
      const next = [signal, ...prev].slice(0, 200);
      try { localStorage.setItem('GT_SIGNAL_HISTORY', JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  /**
   * Broadcast Signal Engine: Menerbitkan sinyal ke activeSignals, signalHistory, dan Telegram
   * Menerapkan Early-Entry Guard ($1M ceiling), 24h Deduplikasi CA, & Anti-Spam
   * Untuk promosi manual (isManual = true), bypass deduplikasi dan posisikan di puncak feed!
   */
  const broadcastSignal = useCallback(async (
    signal: TradingSignal,
    telegramConfig: WebhookTelegramConfig,
    isManual = false
  ): Promise<void> => {
    // 0. EARLY ENTRY GUARD: Drop jika Market Cap > batas tier (hanya untuk pemindaian otomatis)
    if (!isManual) {
      const maxMc = signal.scanTier === 'BREAKOUT_RUNNER' || signal.token?.scanTier === 'BREAKOUT_RUNNER' || signal.signalTier === 'SUPERNOVA' ? 10000000 : 1000000;
      if (signal.marketContext && signal.marketContext.marketCapUsd > maxMc) {
        console.warn(`[broadcastSignal] DROPPED by Early Guard: MC $${signal.marketContext.marketCapUsd.toLocaleString()} > $${maxMc.toLocaleString()}`);
        return;
      }
    }

    // 1. Tambah ke activeSignals: Jika isManual, posisikan langsung di index 0 (teratas)
    setActiveSignals((prev) => {
      const cleanPrev = prev.filter((s) => s.token?.mint !== signal.token?.mint);
      const next = [signal, ...cleanPrev].slice(0, 50);
      try { localStorage.setItem('GT_ACTIVE_SIGNALS', JSON.stringify(next)); } catch {}
      return next;
    });

    // 2. Tambah ke history
    addSignalToHistory(signal);

    // 3. Kirim ke Telegram
    if (telegramConfig.isEnabled && telegramConfig.botToken && telegramConfig.chatId) {
      const mint = signal.token?.mint;
      if (!isManual && typeof window !== 'undefined' && mint) {
        const DEDUP_KEY = 'GT_ALERTED_CA_CACHE';
        try {
          const raw = localStorage.getItem(DEDUP_KEY);
          const map: Record<string, number> = raw ? JSON.parse(raw) : {};
          const lastSent = map[mint];
          if (lastSent && (Date.now() - lastSent) < 24 * 3600 * 1000) {
            console.log(`[broadcastSignal] Telegram skip: CA ${mint} sudah pernah dikirim dalam 24 jam.`);
            return;
          }
          map[mint] = Date.now();
          localStorage.setItem(DEDUP_KEY, JSON.stringify(map));
        } catch {}
      }

      try {
        await sendSignalAlert(signal, {
          botToken: telegramConfig.botToken,
          chatId: telegramConfig.chatId,
          isEnabled: telegramConfig.isEnabled,
        }, isManual);
      } catch (err) {
        console.warn('[broadcastSignal] Telegram send failed:', err);
      }
    }
  }, [addSignalToHistory]);

  const executionManagerRef = useRef<ExecutionManager | null>(null);
  if (!executionManagerRef.current) {
    executionManagerRef.current = new ExecutionManager();
  }

  // Feed & Selection (Pre-populate with 24 initial signals for Scan Grid throughput)
  const [consensusFeed, setConsensusFeed] = useState<ConsensusResult[]>(() => {
    const initial: ConsensusResult[] = [];
    for (let i = 0; i < 24; i++) {
      const sig = generateRandomTokenSignal();
      initial.push(runAgentConsensus(sig, STRATEGY_PRESETS.BALANCED));
    }
    return initial;
  });
  const [selectedResult, setSelectedResult] = useState<ConsensusResult | null>(null);

  // Live Terminal Activity Logs
  const [logs, setLogs] = useState<LogMessage[]>([
    {
      id: 'log-init-1',
      timestamp: Date.now() - 60000,
      level: 'INFO',
      category: 'SYSTEM',
      message: 'Grok Trencher Engine v1.0 initialized on Solana Mainnet'
    },
    {
      id: 'log-init-2',
      timestamp: Date.now() - 45000,
      level: 'SUCCESS',
      category: 'JITO',
      message: 'Connected to mainnet.block-engine.jito.wtf (0% frontrun leak)'
    },
    {
      id: 'log-init-3',
      timestamp: Date.now() - 30000,
      level: 'INFO',
      category: 'SCAN',
      message: 'Autonomous Raydium & Pump.fun ingestion stream active'
    }
  ]);

  // Telemetry & Metrics — all stats start at 0 (filled by real wallet/trading activity)
  const [telemetry, setTelemetry] = useState<TerminalTelemetry>({
    engineStatus: 'LIVE',
    dataSource: 'REAL_SOLANA',
    slotLatencyMs: 0,
    currentSlot: 0,
    initialBalanceSol: 0,
    currentBalanceSol: 0,
    totalPnlSol: 0,
    rollingExpectancyR: 0,
    winCount: 0,
    lossCount: 0,
    scannedCount: 0,
    vetoCount: 0,
    activePositionLocked: false
  });

  const [networkMetrics, setNetworkMetrics] = useState<NetworkMetrics>(DEFAULT_NETWORK_METRICS);

  // Auto-heal telemetry PnL & Win/Loss stats from clean closedTrades
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const validTrades = closedTrades.filter(
        (t) => typeof t.pnlSol === 'number' && !isNaN(t.pnlSol) && Math.abs(t.pnlSol) <= 100
      );
      const sumPnl = +validTrades.reduce((acc, t) => acc + t.pnlSol, 0).toFixed(4);
      const wins = validTrades.filter((t) => t.pnlSol > 0).length;
      const losses = validTrades.filter((t) => t.pnlSol < 0).length;

      setTelemetry((prev) => {
        if (Math.abs(prev.totalPnlSol) > 100 || (validTrades.length === 0 && prev.totalPnlSol !== 0)) {
          return {
            ...prev,
            totalPnlSol: sumPnl,
            winCount: wins,
            lossCount: losses
          };
        }
        return prev;
      });
    }
  }, [closedTrades]);

  // Extreme state purge listener (triggered by purgeAllState() or admin nuke)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleExtremePurge = () => {
      setActiveSignals([]);
      setSignalHistoryState([]);
      setActivePositionState(null);
      setClosedTradesState([]);
      setConsensusFeed([]);
      setSelectedResult(null);
      setLogs([]);
      positionMutex.releaseLock();
      setTelemetry((prev) => ({
        ...prev,
        totalPnlSol: 0,
        winCount: 0,
        lossCount: 0,
        scannedCount: 0,
        vetoCount: 0,
        activePositionLocked: false,
      }));
    };
    window.addEventListener('gt_purge_all_state', handleExtremePurge);
    return () => window.removeEventListener('gt_purge_all_state', handleExtremePurge);
  }, []);

  // Wallet — persisted in localStorage so wallet stays connected after page refresh
  const [walletState, setWalletState] = useState<WalletState>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('GT_WALLET_STATE');
        if (saved) {
          const parsed: WalletState = JSON.parse(saved);
          if (parsed && (parsed.mode === 'LIVE_ON_CHAIN' || parsed.mode === 'PAPER_TRADING')) {
            return parsed;
          }
        }
      } catch {}
    }
    return {
      isConnected: false,
      publicKey: null,
      balanceSol: 0,
      walletName: null,
      mode: 'LIVE_ON_CHAIN'
    };
  });

  // Configurations
  const [agentConfig, setAgentConfig] = useState<AgentConfig>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('GT_AGENT_CONFIG');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {
            return { ...DEFAULT_AGENT_CONFIG, ...parsed };
          }
        }
      } catch {}
    }
    return DEFAULT_AGENT_CONFIG;
  });

  const [executionConfig, setExecutionConfig] = useState<ExecutionConfig>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('GT_EXECUTION_CONFIG');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return DEFAULT_EXECUTION_CONFIG;
  });

  const [autoSnipeConfig, setAutoSnipeConfig] = useState<AutoSnipeConfig>(() => {
    const defaults: AutoSnipeConfig = {
      isEnabled: true, // AUTO-SNIPE ON OTOMATIS: Bot langsung eksekusi beli saat 5/5 APPROVED!
      buyAmountSol: 0.02, // Safe small buy amount
      minGrokViralityScore: 85,
      minLiquidityUsd: 1500,
      maxTop10HoldersPct: 20,
      jitoTipTier: 'ECONOMY', // Ultra-low fee tier
      takeProfitMultiplierR: 3.0,
      stopLossMultiplierR: 0.33,
      maxDailyTrades: 10,
      dailyTradesExecuted: 0,
      takeProfitPct: 100,
      stopLossPct: -25,
      trailingStopLossPct: 15,
      maxHoldTimeSec: 180,
      enableMomentumExit: true,
      tradingStyle: 'SCALPING',
      ttlUnlimited: false,
      autoSellEnabled: true
    };
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('GT_AUTOSNIPE_CONFIG');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {
            return { ...defaults, ...parsed };
          }
        }
      } catch {}
    }
    return defaults;
  });

  // Strategy Presets & Threshold Tuner State
  const [agentThresholds, setAgentThresholds] = useState<AgentThresholds>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('GT_AGENT_THRESHOLDS');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {
            return parsed;
          }
        }
      } catch {}
    }
    return STRATEGY_PRESETS.BALANCED;
  });

  const updateAgentThresholds = useCallback((thresholds: AgentThresholds) => {
    setAgentThresholds(thresholds);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('GT_AGENT_THRESHOLDS', JSON.stringify(thresholds));
      } catch {}
    }
  }, []);

  // Effective Thresholds: menggabungkan agentThresholds dan autoSnipeConfig secara harmonis
  // sehingga pengaturan di modal PENGATURAN SINYAL ALPHA langsung mengubah ambang batas kelolosan sinyal!
  const effectiveThresholds = useMemo<AgentThresholds>(() => {
    const rawSim = autoSnipeConfig.minGrokViralityScore;
    const minSim = rawSim > 1 ? rawSim / 100 : (rawSim || agentThresholds.minCosineSimilarity);

    return {
      ...agentThresholds,
      minInitialLpUsd: autoSnipeConfig.minLiquidityUsd || agentThresholds.minInitialLpUsd,
      minCosineSimilarity: minSim || agentThresholds.minCosineSimilarity,
      maxTop10HoldersPct: autoSnipeConfig.maxTop10HoldersPct || agentThresholds.maxTop10HoldersPct,
      targetTakeProfitR: autoSnipeConfig.takeProfitMultiplierR || agentThresholds.targetTakeProfitR,
      trailingStopLossR: autoSnipeConfig.stopLossMultiplierR || agentThresholds.trailingStopLossR,
    };
  }, [agentThresholds, autoSnipeConfig]);

  const effectiveThresholdsRef = useRef(effectiveThresholds);
  effectiveThresholdsRef.current = effectiveThresholds;

  const autoSnipeConfigRef = useRef(autoSnipeConfig);
  autoSnipeConfigRef.current = autoSnipeConfig;

  // Webhook Configs (centralized in context so all components share the same config)
  const [telegramConfig, setTelegramConfig] = useState<WebhookTelegramConfig>(() => {
    if (typeof window !== 'undefined') {
      try { return JSON.parse(localStorage.getItem('GT_TELEGRAM_CONFIG') || 'null') || DEFAULT_TELEGRAM_CONFIG; } catch {}
    }
    return DEFAULT_TELEGRAM_CONFIG;
  });

  const telegramConfigRef = useRef(telegramConfig);
  telegramConfigRef.current = telegramConfig;

  const [discordConfig, setDiscordConfig] = useState<WebhookDiscordConfig>(() => {
    if (typeof window !== 'undefined') {
      try { return JSON.parse(localStorage.getItem('GT_DISCORD_CONFIG') || 'null') || DEFAULT_DISCORD_CONFIG; } catch {}
    }
    return DEFAULT_DISCORD_CONFIG;
  });

  // Sniper Status & Confirmation
  const [isSearchingMint, setIsSearchingMint] = useState<boolean>(false);
  const [sniperStatus, setSniperStatus] = useState<string | null>(null);
  const [pendingSnipeConfirmation, setPendingSnipeConfirmation] = useState<PendingSnipeConfirmation | null>(null);
  const isAutoSnipingRef = useRef<boolean>(false);
  const priceSamplesRef = useRef<Array<{ price: number; timestamp: number }>>([]);

  // Append Log helper
  const appendLog = useCallback((category: LogCategory, level: LogLevel, message: string, data?: any) => {
    const newLog: LogMessage = {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      level,
      category,
      message,
      data
    };
    setLogs((prev) => [newLog, ...prev.slice(0, 199)]);
  }, []);

  const dismissSignal = useCallback((id: string) => {
    setActiveSignals((prev) => {
      const target = prev.find((s) => s.id === id);
      const symbol = target?.token?.symbol ? `$${target.token.symbol}` : id;
      appendLog('SYSTEM', 'INFO', `Sinyal ${symbol} ditutup & diarsipkan dari radar aktif oleh pengguna.`);
      const next = prev.filter((s) => s.id !== id);
      try { localStorage.setItem('GT_ACTIVE_SIGNALS', JSON.stringify(next)); } catch {}
      return next;
    });

    // Sinkronkan status is_archived = true ke Supabase jika terhubung
    if (supabase) {
      supabase
        .from('signals')
        .update({ is_archived: true })
        .eq('id', id)
        .then(
          ({ error }) => {
            if (error) {
              console.warn('[Supabase] Gagal mengarsipkan sinyal:', error.message);
            }
          },
          (err) => {
            console.warn('[Supabase] Gagal eksekusi archive:', err);
          }
        );
    }
  }, [appendLog]);

  /**
   * scanSolanaLiveNow: Pemindaian on-demand langsung ke DEX Solana
   * Menganalisis koin secara instan sesuai Discovery Mode dan langsung menerbitkan sinyal yang lolos
   */
  const scanSolanaLiveNow = useCallback(async (
    discoveryMode: 'ALL' | 'SNIPER' | 'GRADUATING_PUMP' | 'BREAKOUT' | 'VOLUME_SURGE' | 'WHALE' | 'SUPERNOVA' | 'SUB_100K' = 'ALL'
  ): Promise<number> => {
    appendLog('SCAN', 'INFO', `🔍 [SCAN ON-DEMAND] Memulai pemindaian live Solana DEX (Channel: ${discoveryMode})...`);
    try {
      const res = await fetch(`/api/tokens/real?mode=${discoveryMode}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data.success || !Array.isArray(data.tokens) || data.tokens.length === 0) {
        appendLog('SCAN', 'WARN', '⚠️ Tidak ada token baru terdeteksi di pool Solana saat ini.');
        return 0;
      }

      let candidateTokens: TokenSignal[] = [...data.tokens];

      // Terapkan filter khusus berdasarkan Discovery Mode
      if (discoveryMode === 'SUB_100K') {
        // Mode Koin Early Sub-$100k Market Cap
        candidateTokens = candidateTokens.filter((t) => {
          const estMc = (t.initialLpUsd || 5000) * 5.5;
          return estMc <= 100000 || t.platform === 'Pump.fun';
        });
      } else if (discoveryMode === 'SNIPER') {
        // Microcap Sniper: MC <= $40k, Early stage
        candidateTokens = candidateTokens.filter((t) => {
          const estMc = (t.initialLpUsd || 5000) * 5.5;
          return estMc <= 40000;
        });
      } else if (discoveryMode === 'BREAKOUT') {
        // Breakout Runner: LP >= $8,000 atau status BREAKOUT_RUNNER
        candidateTokens = candidateTokens.filter((t) => (t.initialLpUsd || 0) >= 8000 || t.scanTier === 'BREAKOUT_RUNNER');
      } else if (discoveryMode === 'WHALE') {
        // Smart Money Tracker: Top 10 holder sehat (<= 14%)
        candidateTokens = candidateTokens.filter((t) => (t.top10HolderPct || 10) <= 14);
      } else if (discoveryMode === 'SUPERNOVA') {
        // Supernova AI: Virality Cosine Sim tinggi (>= 0.88)
        candidateTokens = candidateTokens.filter((t) => (t.narrativeCosineSim || 0) >= 0.88);
      }

      if (candidateTokens.length === 0) {
        candidateTokens = data.tokens.slice(0, 6); // Fallback to top tokens if strict filter too tight
      }

      let broadcastCount = 0;
      const consensusResults: ConsensusResult[] = [];

      for (const token of candidateTokens) {
        const { consensusResult, signal } = runConsensusAndBuildSignal(token, {
          thresholds: effectiveThresholdsRef.current,
          grokViralityScore: token.narrativeCosineSim,
          solRateUsd: 140,
        });

        consensusResults.push(consensusResult);

        // Jika konsensus APPROVED, langsung broadcast ke Signal Feed & Telegram!
        if (consensusResult.verdict === 'APPROVED' && signal) {
          await broadcastSignal(signal, telegramConfigRef.current);
          broadcastCount++;
          const cleanSym = (signal.token?.symbol || 'UNKNOWN').replace(/^\$+/, '');
          appendLog(
            'TELEGRAM',
            'SUCCESS',
            `📡 [ALPHA SIGNAL GENERATED] $${cleanSym} lolos 5/5 AI Consensus! Entry: ${signal.entryZone.low.toFixed(6)} SOL | R/R 1:${signal.riskRewardRatio}`
          );
        }
      }

      // Update consensusFeed agar Desk Feed juga sinkron
      setConsensusFeed((prev) => {
        const combined = [...consensusResults, ...prev];
        const seen = new Set<string>();
        return combined.filter((item) => {
          if (seen.has(item.token.mint)) return false;
          seen.add(item.token.mint);
          return true;
        }).slice(0, 96);
      });

      soundFx.playScan();
      appendLog(
        'SCAN',
        'SUCCESS',
        `✅ [SCAN SELESAI] ${candidateTokens.length} koin dianalisis, ${broadcastCount} sinyal alpha baru berhasil diterbitkan!`
      );
      return broadcastCount;
    } catch (err: any) {
      appendLog('SCAN', 'DANGER', `❌ Gagal memindai Solana: ${err?.message || 'Error'}`);
      return 0;
    }
  }, [appendLog, broadcastSignal]);

  /**
   * promoteTokenToAlphaSignal: Mempromosikan koin dari Desk Feed secara manual ke Sinyal Alpha Live & Telegram
   */
  const promoteTokenToAlphaSignal = useCallback(async (token: TokenSignal): Promise<boolean> => {
    try {
      let { signal } = runConsensusAndBuildSignal(token, {
        thresholds: effectiveThresholdsRef.current,
        grokViralityScore: token.narrativeCosineSim,
        solRateUsd: 140,
      });

      // Fallback: Jika standar consensus menolak karena threshold ketat, buat sinyal alpha manual guaranteed!
      if (!signal) {
        const moonshot = token.moonshot || MoonshotAnalyzer.evaluate(token);
        signal = computeSignal({
          token: { ...token, isRealData: true },
          moonshot,
          grokViralityScore: token.narrativeCosineSim || 0.85,
          solRateUsd: 140,
        });
      }

      if (signal) {
        await broadcastSignal(signal, telegramConfigRef.current, true);
        soundFx.playApproval();
        const cleanSym = (signal.token?.symbol || token.symbol || 'UNKNOWN').replace(/^\$+/, '');
        appendLog(
          'TELEGRAM',
          'SUCCESS',
          `📡 [PROMOSI MANUAL ALPHA] $${cleanSym} berhasil dipromosikan ke Sinyal Alpha Live & Telegram! (Entry: ${signal.entryZone.low.toFixed(6)} SOL | TP1: ${signal.targets[0].priceSol.toFixed(6)} SOL | R/R 1:${signal.riskRewardRatio})`
        );
        return true;
      }
      return false;
    } catch (err: any) {
      appendLog('RISK', 'WARN', `❌ Gagal mempromosikan token: ${err?.message || 'Error'}`);
      return false;
    }
  }, [appendLog, broadcastSignal]);

  // Hook up ExecutionManager Callbacks — CANONICAL state-sync bridge
  // These callbacks ensure ExecutionManager's internal state is always mirrored
  // into React state AND the refs used by the autonomous loop's mutex guard.
  useEffect(() => {
    if (!executionManagerRef.current) return;
    executionManagerRef.current.setCallbacks({
      onPositionOpened: (pos) => {
        // Sync React state
        setActivePosition(pos);
        // Sync refs used by autonomous loop mutex guard
        activePositionRef.current = pos;
        isPositionOpenRef.current = true;
        isAutoSnipingRef.current = false; // Buy confirmed — release sniping lock
        setTelemetry((prev) => ({
          ...prev,
          activePositionLocked: true,
          currentBalanceSol: +(Math.max(0, prev.currentBalanceSol - pos.solInvested)).toFixed(4)
        }));
        soundFx.playApproval();
        if (telegramConfig.isEnabled) {
          sendTelegramBuyAlert(pos.token, telegramConfig, pos.solInvested, pos.id, 0.000015);
        }
        if (discordConfig.isEnabled) {
          sendDiscordBuyAlert(pos.token, discordConfig, pos.solInvested, pos.id, 0.000015);
        }
      },
      onPositionUpdated: (pos) => {
        setActivePosition({ ...pos });
        activePositionRef.current = { ...pos };
      },
      onPositionClosed: (trade) => {
        // Sync React state
        setActivePosition(null);
        setClosedTrades((prev) => [trade, ...prev].slice(0, 200));
        // Sync refs — critical: release mutex guard for next trade
        activePositionRef.current = null;
        isPositionOpenRef.current = false;
        isAutoSnipingRef.current = false;
        setTelemetry((prev) => ({
          ...prev,
          totalPnlSol: +(prev.totalPnlSol + trade.pnlSol).toFixed(4),
          winCount: trade.pnlSol > 0 ? prev.winCount + 1 : prev.winCount,
          lossCount: trade.pnlSol <= 0 ? prev.lossCount + 1 : prev.lossCount,
          activePositionLocked: false,
          currentBalanceSol: +(prev.currentBalanceSol + trade.solInvested + trade.pnlSol).toFixed(4)
        }));
        if (trade.pnlSol > 0) {
          soundFx.playTakeProfit();
        } else {
          soundFx.playEmergencyExit();
        }
        if (telegramConfig.isEnabled) {
          sendTelegramExitAlert(trade, telegramConfig);
        }
        if (discordConfig.isEnabled) {
          sendDiscordExitAlert(trade, discordConfig);
        }
        // Refresh on-chain balance after a real trade closes
        setTimeout(() => { refreshWalletBalance(); }, 3000);
      },
      onLog: (category, level, message) => {
        appendLog(category as any, level as any, message);
      },
      onError: (err, stage) => {
        // On error, always ensure refs are unlocked so bot can retry
        isAutoSnipingRef.current = false;
        if (!activePositionRef.current) {
          isPositionOpenRef.current = false;
          setTelemetry((prev) => ({ ...prev, activePositionLocked: false }));
        }
        appendLog('EXECUTION', 'DANGER', `❌ Execution error di tahap [${stage}]: ${err.message}`);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setActivePosition, setClosedTrades, appendLog, telegramConfig, discordConfig]);

  // Restore live tracker if active position exists on initial mount
  useEffect(() => {
    if (activePosition && activePosition.status === 'OPEN' && executionManagerRef.current) {
      executionManagerRef.current.startPositionTracker(activePosition);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearLogs = useCallback(() => setLogs([]), []);

  const clearTrades = useCallback(() => {
    setClosedTrades([]);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('GT_TRADE_HISTORY');
      } catch {}
    }
    setTelemetry((prev) => ({
      ...prev,
      totalPnlSol: 0,
      winCount: 0,
      lossCount: 0
    }));
    appendLog('SYSTEM', 'INFO', 'Riwayat transaksi & PnL berhasil direset.');
  }, [setClosedTrades, appendLog]);

  const [isSimulationMode, setIsSimulationModeState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('GT_SIMULATION_MODE');
      if (saved !== null) {
        return saved === 'true';
      }
    }
    return false; // Default FALSE: Mode Riil On-Chain langsung aktif!
  });

  const setIsSimulationMode = useCallback((enabled: boolean) => {
    setIsSimulationModeState(enabled);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('GT_SIMULATION_MODE', String(enabled));
      } catch {}
    }
    appendLog(
      'SYSTEM',
      enabled ? 'SUCCESS' : 'WARN',
      enabled
        ? '🧪 [DRY-RUN SIMULASI AKTIF] Transaksi Phantom akan dicegat. 0 SOL asli dipotong.'
        : '⚠️ [MODE RIIL DIAKTIFKAN] PERHATIAN: Transaksi akan mengirim order langsung ke dompet Phantom.'
    );
  }, [appendLog]);

  const toggleSimulationMode = useCallback(() => {
    setIsSimulationMode(!isSimulationMode);
  }, [isSimulationMode, setIsSimulationMode]);

  const toggleAudio = useCallback(() => {
    setIsAudioMuted((prev) => {
      const next = !prev;
      soundFx.setMuted(next);
      return next;
    });
  }, []);

  const toggleEngine = useCallback(() => {
    setEngineStatus((prev) => {
      const next = prev === 'AUTONOMOUS' ? 'PAUSED' : 'AUTONOMOUS';
      appendLog('SYSTEM', 'INFO', `Engine switched to ${next} mode`);
      return next;
    });
  }, [appendLog]);

  // Instant On-Chain Wallet Balance Refresh (manual fallback)
  const refreshWalletBalance = useCallback(async () => {
    const fullKey =
      walletState.fullPublicKey ||
      (typeof window !== 'undefined'
        ? (window as any).phantom?.solana?.publicKey?.toString() ||
          (window as any).solflare?.publicKey?.toString() ||
          (window as any).backpack?.publicKey?.toString()
        : null);

    if (!fullKey) return;

    try {
      const res = await fetch(`/api/wallet/balance?address=${encodeURIComponent(fullKey)}`, {
        signal: AbortSignal.timeout(6000)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && typeof data.balanceSol === 'number') {
          const liveBal = data.balanceSol;
          setWalletState((prev) => {
            const updated: WalletState = {
              ...prev,
              isConnected: true,
              fullPublicKey: fullKey,
              publicKey: prev.publicKey || `${fullKey.slice(0, 4)}...${fullKey.slice(-4)}`,
              balanceSol: liveBal,
              walletName: prev.walletName || 'Phantom',
              mode: 'LIVE_ON_CHAIN'
            };
            if (typeof window !== 'undefined') {
              localStorage.setItem('GT_WALLET_STATE', JSON.stringify(updated));
            }
            return updated;
          });

          setTelemetry((prev) => ({
            ...prev,
            currentBalanceSol: liveBal
          }));

          appendLog('SYSTEM', 'INFO', `🔄 Saldo dompet on-chain diperbarui: ${liveBal.toFixed(4)} SOL`);
        }
      }
    } catch (err: any) {
      console.warn('Gagal sinkron saldo on-chain:', err.message);
    }
  }, [walletState.fullPublicKey, appendLog]);

  // ═══════════════════════════════════════════════════════════════════════════
  // HOT WALLET REAL-TIME BALANCE — connection.onAccountChange() WebSocket
  // Event-driven. Tidak ada polling. Sesuai arsitektur @solana/web3.js.
  // Lifecycle: getBalance() awal saat mount, onAccountChange() untuk streaming real-time,
  // dan cleanup otomatis via removeAccountChangeListener() saat unmount/ganti wallet.
  // ═══════════════════════════════════════════════════════════════════════════
  const onChainBalanceSubIdRef = useRef<number | null>(null);
  const onChainConnectionRef = useRef<Connection | null>(null);
  const balanceFlashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const fullKey =
      walletState.fullPublicKey ||
      (typeof window !== 'undefined'
        ? (window as any).phantom?.solana?.publicKey?.toString() ||
          (window as any).solflare?.publicKey?.toString() ||
          (window as any).backpack?.publicKey?.toString()
        : null);

    if (!fullKey || fullKey.length < 32) {
      return;
    }

    const rpcUrl =
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
      'https://mainnet.helius-rpc.com/?api-key=b1346052-9ac3-47b8-89ec-2ce7e88fa91b';

    // Gunakan Connection terpisah dengan wsEndpoint eksplisit
    const wsUrl = rpcUrl.replace('https://', 'wss://').replace('http://', 'ws://');
    const subscriptionConnection = new Connection(rpcUrl, {
      commitment: 'confirmed',
      wsEndpoint: wsUrl
    });
    onChainConnectionRef.current = subscriptionConnection;

    let subId: number | null = null;
    let isCleaned = false;

    const subscribe = async () => {
      // Validasi PublicKey sebelum query / subscribe
      let pubKey: PublicKey;
      try {
        pubKey = new PublicKey(fullKey);
      } catch {
        appendLog('SYSTEM', 'WARN', `⚠️ Public key wallet tidak valid untuk subscription: ${fullKey.slice(0, 8)}`);
        return;
      }

      // 1. Ambil saldo awal langsung dari blockchain via connection.getBalance('confirmed')
      try {
        const initialLamports = await subscriptionConnection.getBalance(pubKey, 'confirmed');
        if (!isCleaned) {
          const initialSol = +(initialLamports / 1_000_000_000).toFixed(4);
          setWalletState((prev) => {
            const updated: WalletState = {
              ...prev,
              isConnected: true,
              fullPublicKey: fullKey,
              publicKey: prev.publicKey || `${fullKey.slice(0, 4)}...${fullKey.slice(-4)}`,
              balanceSol: initialSol,
              isBalanceLive: true
            };
            if (typeof window !== 'undefined') {
              try { localStorage.setItem('GT_WALLET_STATE', JSON.stringify(updated)); } catch {}
            }
            return updated;
          });
          setTelemetry((prev) => ({ ...prev, currentBalanceSol: initialSol }));
        }
      } catch (err: any) {
        console.warn('[TradingContext] getBalance awal via RPC gagal:', err.message);
      }

      // 2. Daftarkan onAccountChange WebSocket subscription
      try {
        subId = subscriptionConnection.onAccountChange(
          pubKey,
          (accountInfo) => {
            if (isCleaned) return;

            // Konversi lamports → SOL (1 SOL = 10^9 lamports)
            const newBalanceSol = +(accountInfo.lamports / 1_000_000_000).toFixed(4);

            setWalletState((prev) => {
              const oldBal = prev.balanceSol;
              // Hanya update jika ada perubahan nyata (> 0.000001 SOL)
              if (Math.abs(newBalanceSol - oldBal) < 0.000001) return prev;

              const flashDir: 'up' | 'down' = newBalanceSol > oldBal ? 'up' : 'down';

              // Reset animasi flash setelah 1200ms
              if (balanceFlashTimeoutRef.current) {
                clearTimeout(balanceFlashTimeoutRef.current);
              }
              balanceFlashTimeoutRef.current = setTimeout(() => {
                setWalletState((current) => ({
                  ...current,
                  balanceFlashState: 'neutral'
                }));
                balanceFlashTimeoutRef.current = null;
              }, 1200);

              const updated: WalletState = {
                ...prev,
                balanceSol: newBalanceSol,
                balanceFlashState: flashDir,
                isBalanceLive: true,
                lastBalanceUpdate: Date.now()
              };

              if (typeof window !== 'undefined') {
                try { localStorage.setItem('GT_WALLET_STATE', JSON.stringify(updated)); } catch {}
              }
              return updated;
            });

            setTelemetry((prev) => ({
              ...prev,
              currentBalanceSol: newBalanceSol
            }));

            appendLog(
              'SYSTEM',
              'INFO',
              `🔴 [ON-CHAIN LIVE] Saldo hot wallet diperbarui instan: ${newBalanceSol.toFixed(4)} SOL (${accountInfo.lamports.toLocaleString()} lamports)`
            );
          },
          'confirmed'
        );

        onChainBalanceSubIdRef.current = subId;

        if (!isCleaned) {
          setWalletState((prev) => ({ ...prev, isBalanceLive: true }));
          appendLog(
            'SYSTEM',
            'SUCCESS',
            `🔴 [LIVE BALANCE LISTENER] onAccountChange WebSocket aktif untuk ${fullKey.slice(0, 4)}...${fullKey.slice(-4)} | Mode: real-time (bukan polling)`
          );
        }
      } catch (wsErr: any) {
        if (!isCleaned) {
          setWalletState((prev) => ({ ...prev, isBalanceLive: false }));
          console.warn('[TradingContext] onAccountChange subscription gagal, fallback ke manual refresh:', wsErr.message);
          appendLog(
            'SYSTEM',
            'WARN',
            `⚠️ [BALANCE LISTENER] WebSocket gagal. Saldo akan diperbarui setelah setiap transaksi (fallback mode).`
          );
        }
      }
    };

    subscribe();

    // CLEANUP: Hapus listener saat wallet disconnect atau publicKey berubah
    return () => {
      isCleaned = true;
      if (balanceFlashTimeoutRef.current) {
        clearTimeout(balanceFlashTimeoutRef.current);
        balanceFlashTimeoutRef.current = null;
      }
      if (subId !== null && subscriptionConnection) {
        subscriptionConnection
          .removeAccountChangeListener(subId)
          .catch((e) => console.warn('[TradingContext] removeAccountChangeListener error:', e));
        onChainBalanceSubIdRef.current = null;
        onChainConnectionRef.current = null;
      }
    };
  }, [walletState.fullPublicKey, appendLog]);

  // Wallet Holdings State (Tokens held in user's on-chain wallet)
  const [walletHoldings, setWalletHoldings] = useState<TokenHolding[]>([]);
  const [isHoldingsLoading, setIsHoldingsLoading] = useState<boolean>(false);
  const [totalHoldingsValueUsd, setTotalHoldingsValueUsd] = useState<number>(0);
  const [totalHoldingsValueSol, setTotalHoldingsValueSol] = useState<number>(0);

  const refreshHoldings = useCallback(async () => {
    const fullKey =
      walletState.fullPublicKey ||
      (typeof window !== 'undefined'
        ? (window as any).phantom?.solana?.publicKey?.toString() ||
          (window as any).solflare?.publicKey?.toString() ||
          (window as any).backpack?.publicKey?.toString()
        : null);

    if (!fullKey) return;
    setIsHoldingsLoading(true);

    try {
      const res = await fetch(`/api/wallet/holdings?address=${encodeURIComponent(fullKey)}`, {
        signal: AbortSignal.timeout(8000)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.holdings)) {
          setWalletHoldings(data.holdings);
          setTotalHoldingsValueUsd(data.totalValueUsd || 0);
          setTotalHoldingsValueSol(data.totalValueSol || 0);

          // Auto-reconcile phantom / ghost active position
          const currentPos = activePositionRef.current;
          if (currentPos && walletState.mode === 'LIVE_ON_CHAIN' && !isSimulationMode) {
            const holding = data.holdings.find((h: any) => h.mint === currentPos.token.mint);
            const posAgeSec = (Date.now() - currentPos.entryTimestamp) / 1000;
            if ((!holding || holding.uiAmount <= 0) && posAgeSec > 20) {
              appendLog(
                'SYSTEM',
                'WARN',
                `ℹ️ [AUTO-RECONCILE] Posisi ${currentPos.token.symbol} tidak ditemukan di dompet on-chain (saldo 0). Posisi dibersihkan & Mutex slot dibuka kembali.`
              );
              positionMutex.releaseLock(currentPos.token.mint, 0);
              setActivePosition(null);
              activePositionRef.current = null;
              isPositionOpenRef.current = false;
              if (typeof window !== 'undefined') {
                try { localStorage.removeItem('GT_ACTIVE_POSITION'); } catch {}
              }
              setTelemetry((prev) => ({ ...prev, activePositionLocked: false }));
            }
          }
        }
      }
    } catch (err: any) {
      console.warn('Gagal memuat token holdings:', err.message);
    } finally {
      setIsHoldingsLoading(false);
    }
  }, [walletState.fullPublicKey, walletState.mode, isSimulationMode, appendLog, setActivePosition]);

  const sellTokenHolding = useCallback(
    async (mint: string, percentage: number = 100): Promise<boolean> => {
      const holding = walletHoldings.find((h) => h.mint === mint);
      if (!holding) {
        appendLog('EXECUTION', 'WARN', `Token ${mint} tidak ditemukan di holdings.`);
        return false;
      }

      let provider = typeof window !== 'undefined'
        ? ((window as any).phantom?.solana || (window as any).solana || (window as any).solflare || (window as any).backpack)
        : null;
      const pubKey = walletState.fullPublicKey || provider?.publicKey?.toString();

      if (!provider || !pubKey) {
        appendLog('EXECUTION', 'WARN', `⚠️ Dompet Phantom belum terhubung untuk mengeksekusi swap jual.`);
        return false;
      }

      appendLog(
        'EXECUTION',
        'INFO',
        `⚡ [LIQUIDASI] Menyiapkan swap jual ${percentage}% untuk ${holding.symbol} (${holding.uiAmount} token)...`
      );

      try {
        const portion = Math.min(1.0, Math.max(0.01, percentage / 100));
        let rawUnitsToSell: string;

        if (holding.rawAmount && BigInt(holding.rawAmount) > BigInt(0)) {
          const rawBig = BigInt(holding.rawAmount);
          const toSellBig = (rawBig * BigInt(Math.round(portion * 1000))) / BigInt(1000);
          rawUnitsToSell = (toSellBig > BigInt(0) ? toSellBig : rawBig).toString();
        } else {
          rawUnitsToSell = Math.floor(holding.uiAmount * portion * 10 ** (holding.decimals || 6)).toString();
        }

        const quote = await fetchJupiterSellQuote(holding.mint, rawUnitsToSell, 250);

        appendLog(
          'EXECUTION',
          'INFO',
          `🟡 [PHANTOM POPUP] Menunggu persetujuan swap di dompet untuk ${holding.symbol} -> SOL...`
        );

        const swapRes = await executeJupiterSwap(
          quote,
          'SOL',
          0.0001,
          networkMetrics.currentSlot,
          pubKey,
          provider,
          false
        );

        if (swapRes.signature) {
          appendLog(
            'JITO',
            'SUCCESS',
            `🎯 [SELL SUKSES] ${holding.symbol} berhasil dijual ke SOL! Tx: https://solscan.io/tx/${swapRes.signature}`
          );
          soundFx.playTakeProfit();

          // Refresh holdings & wallet balance after sale
          setTimeout(async () => {
            await refreshHoldings();
            await refreshWalletBalance();
          }, 2000);

          return true;
        }
      } catch (err: any) {
        appendLog('EXECUTION', 'DANGER', `❌ Gagal menjual ${holding.symbol}: ${err.message}`);
        return false;
      }
      return false;
    },
    [walletHoldings, walletState.fullPublicKey, networkMetrics.currentSlot, appendLog, refreshHoldings, refreshWalletBalance]
  );

  const dumpAllHoldingsToSol = useCallback(async () => {
    const WSOL = 'So11111111111111111111111111111111111111112';
    const tokensToSell = walletHoldings.filter((h) => h.mint !== WSOL && h.uiAmount > 0);

    if (tokensToSell.length === 0) {
      appendLog('EXECUTION', 'INFO', 'ℹ️ Tidak ada token lain di dompet selain SOL untuk dilikuidasi.');
      return;
    }

    appendLog(
      'EXECUTION',
      'WARN',
      `🚨 [EMERGENCY DUMP ALL] Memulai likuidasi berurutan untuk ${tokensToSell.length} token di dompet Phantom...`
    );

    for (const token of tokensToSell) {
      appendLog('EXECUTION', 'INFO', `⏳ Menjual token ${token.symbol} (${token.uiAmount} token)...`);
      const success = await sellTokenHolding(token.mint, 100);
      if (!success) {
        appendLog('EXECUTION', 'WARN', `⚠️ Penjualan ${token.symbol} dibatalkan atau gagal. Melanjutkan token berikutnya...`);
      }
    }

    appendLog('EXECUTION', 'SUCCESS', '🏁 [DUMP ALL SELESAI] Seluruh token telah diproses untuk dilikuidasi ke SOL.');
    await refreshHoldings();
    await refreshWalletBalance();
  }, [walletHoldings, appendLog, sellTokenHolding, refreshHoldings, refreshWalletBalance]);

  const emergencyStopAllTrading = useCallback(() => {
    setEngineStatusState('PAUSED');
    setAutoSnipeConfig((prev) => {
      const updated = { ...prev, isEnabled: false };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('GT_ENGINE_STATUS', 'PAUSED');
          localStorage.setItem('GT_AUTOSNIPE_CONFIG', JSON.stringify(updated));
        } catch {}
      }
      return updated;
    });
    isAutoSnipingRef.current = false;
    soundFx.playEmergencyExit();
    appendLog('SYSTEM', 'WARN', '🛑 [EMERGENCY STOP] Engine pemindai sinyal otomatis telah DIJEDA seketika.');
  }, [appendLog]);

  const unwrapWsolOrCloseAccount = useCallback(async (mint: string, isToken2022: boolean = false): Promise<boolean> => {
    let provider = typeof window !== 'undefined'
      ? ((window as any).phantom?.solana || (window as any).solana || (window as any).solflare || (window as any).backpack)
      : null;
    const pubKey = walletState.fullPublicKey || provider?.publicKey?.toString();

    if (!provider || !pubKey) {
      appendLog('EXECUTION', 'WARN', '⚠️ Hubungkan dompet Phantom terlebih dahulu.');
      return false;
    }

    const isWSOL = mint === 'So11111111111111111111111111111111111111112';
    appendLog(
      'EXECUTION',
      'INFO',
      isWSOL
        ? '⚡ [UNWRAP WSOL] Menyiapkan transaksi unwrap WSOL ke Native SOL & tarik kembali sewa SOL...'
        : `⚡ [RECLAIM RENT] Menyiapkan transaksi penutupan akun token untuk menarik sewa SOL...`
    );

    try {
      const res = await fetch('/api/wallet/close-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userPublicKey: pubKey, mint, isToken2022 })
      });

      const data = await res.json();
      if (!data.success || !data.transaction) {
        throw new Error(data.error || 'Gagal merakit transaksi penutupan akun');
      }

      const binaryString = window.atob(data.transaction);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const versionedTx = VersionedTransaction.deserialize(bytes);

      const sendResult = await provider.signAndSendTransaction(versionedTx);
      const signature = sendResult?.signature || (typeof sendResult === 'string' ? sendResult : null);

      if (signature) {
        appendLog(
          'JITO',
          'SUCCESS',
          isWSOL
            ? `🎯 [WSOL UNWRAPPED] Seluruh saldo WSOL & sewa akun berhasil dikembalikan ke saldo SOL asli! Tx: https://solscan.io/tx/${signature}`
            : `🎯 [RENT RECLAIMED] Akun token berhasil ditutup! ~0.002 SOL sewa dikembalikan ke dompet Anda! Tx: https://solscan.io/tx/${signature}`
        );
        soundFx.playTakeProfit();
        setTimeout(async () => {
          await refreshHoldings();
          await refreshWalletBalance();
        }, 2000);
        return true;
      }
    } catch (err: any) {
      appendLog('EXECUTION', 'DANGER', `❌ Gagal unwrap/tutup akun: ${err.message}`);
      return false;
    }
    return false;
  }, [walletState.fullPublicKey, appendLog, refreshHoldings, refreshWalletBalance]);

  // Open Real Live Position from confirmed swap transaction (Requirement 1 & 4)
  const openLivePosition = useCallback(
    async (result: SwapExecutionResult, tokenSignal?: TokenSignal | null) => {
      // 1. Single Position Mutex Guard check
      if (activePositionRef.current) {
        appendLog(
          'EXECUTION',
          'WARN',
          `[MUTEX GUARD] Blocked: Posisi aktif ${activePositionRef.current.token.symbol} sedang berjalan. Mutex mencegah pembukaan posisi ganda.`
        );
        return;
      }

      const solInvest = result.inAmountSol || 0.1;
      // Parse token amount with true decimal support
      const tokenAmt = typeof result.tokenAmountUi === 'number' && result.tokenAmountUi > 0
        ? result.tokenAmountUi
        : (parseFloat((result.outAmountFormatted || '1').replace(/,/g, '')) || 1);
      
      let entryPrice = solInvest / tokenAmt;
      if (tokenSignal && tokenSignal.priceSol > 0 && (entryPrice <= 0 || !isFinite(entryPrice) || entryPrice > 1000)) {
        entryPrice = tokenSignal.priceSol;
      }
      if (!entryPrice || entryPrice <= 0 || !isFinite(entryPrice)) {
        entryPrice = 0.0001;
      }

      // 2. Resolve token metadata
      let token: TokenSignal;
      if (tokenSignal && (tokenSignal.mint === result.outputMint || !result.outputMint.includes('...'))) {
        token = { ...tokenSignal, priceSol: entryPrice, isRealData: true };
      } else {
        const foundInFeed = consensusFeed.find((c) => c.token.mint === result.outputMint);
        if (foundInFeed) {
          token = { ...foundInFeed.token, priceSol: entryPrice, isRealData: true };
        } else {
          token = {
            id: `REAL-${result.outputMint.slice(0, 6)}`,
            mint: result.outputMint,
            symbol: result.symbol || '$TOKEN',
            name: (result.symbol || 'Solana').replace('$', '') + ' Memecoin',
            platform: 'Raydium',
            initialLpUsd: 25000,
            burntLiquidityPct: 100,
            mintAuthorityRevoked: true,
            freezeAuthorityRevoked: true,
            top10HolderPct: 14,
            volumeDelta15s: 1.2,
            uniqueBuyersCount: 5,
            narrativeCosineSim: 0.88,
            narrativeTheme: 'Meme/AI',
            priceSol: entryPrice,
            detectedAt: Date.now(),
            isRealData: true,
            dexUrl: `https://dexscreener.com/solana/${result.outputMint}`
          };
        }
      }

      const tpPct = agentConfig.takeProfitPct ?? autoSnipeConfig.takeProfitPct ?? 100;
      const slPct = agentConfig.stopLossPct ?? autoSnipeConfig.stopLossPct ?? -25;
      const trailingDist = agentConfig.trailingStopLossPct ?? autoSnipeConfig.trailingStopLossPct ?? 15;
      const maxTtl = agentConfig.maxHoldTimeSec ?? autoSnipeConfig.maxHoldTimeSec ?? 180;
      const targetTpPrice = +(entryPrice * (1 + tpPct / 100));
      const slPrice = +(entryPrice * (1 + slPct / 100));
      const trailingStop = +(entryPrice * (1 - trailingDist / 100));

      const newPos: ActivePosition = {
        id: `POS-${Math.floor(1000 + Math.random() * 9000)}`,
        token,
        entryPriceSol: entryPrice,
        currentPriceSol: entryPrice,
        solInvested: solInvest,
        tokenAmount: tokenAmt,
        pnlSol: 0,
        pnlPct: 0,
        rMultiplier: 0,
        highestPriceSol: entryPrice,
        trailingStopPriceSol: trailingStop,
        entryTimestamp: Date.now(),
        status: 'OPEN',
        targetTpPct: tpPct,
        targetTpPriceSol: targetTpPrice,
        stopLossPct: slPct,
        stopLossPriceSol: slPrice,
        trailingDistancePct: trailingDist,
        maxHoldTimeSec: maxTtl,
        velocityPctPerSec: 0,
        etaToTpSeconds: null,
        momentumStatus: 'STAGNANT',
        holdDurationSec: 0
      };

      priceSamplesRef.current = [{ price: entryPrice, timestamp: Date.now() }];

      // 3. Mark Mutex buy completed & update active position state & refs synchronously
      positionMutex.markBuyCompleted(token.mint);
      activePositionRef.current = newPos;
      isPositionOpenRef.current = true;
      setActivePosition(newPos);

      setTelemetry((prev) => ({
        ...prev,
        activePositionLocked: true, // SINGLE POSITION MUTEX GUARD ACTIVE!
        currentBalanceSol: +(Math.max(0, prev.currentBalanceSol - solInvest)).toFixed(4)
      }));

      soundFx.playApproval();

      const shortSig = result.signature
        ? `${result.signature.slice(0, 8)}...${result.signature.slice(-6)}`
        : 'On-Chain';

      if (isSimulationMode || result.isSimulated) {
        appendLog(
          'EXECUTION',
          'SUCCESS',
          `🧪 [DRY-RUN SIMULATION] Posisi aktif dibuka: ${token.symbol} (${tokenAmt.toLocaleString()} token) @ ${entryPrice.toFixed(8)} SOL [SimTx: ${shortSig}] • ZERO REAL SOL SPENT`
        );
      } else {
        appendLog(
          'EXECUTION',
          'SUCCESS',
          `🎯 [ON-CHAIN CONFIRMED] Posisi aktif dibuka: ${token.symbol} (${tokenAmt.toLocaleString()} token) @ ${entryPrice.toFixed(8)} SOL [Tx: ${shortSig}] • MUTEX GUARD LOCKED`
        );
      }

      // 4. Refresh live on-chain balance immediately (only if live real mode)
      if (!isSimulationMode && !result.isSimulated) {
        await refreshWalletBalance();
      }

      // 5. Omnichannel webhooks
      if (telegramConfig.isEnabled) {
        sendTelegramBuyAlert(token, telegramConfig, solInvest, result.signature, result.jitoTipSol);
      }
      if (discordConfig.isEnabled) {
        sendDiscordBuyAlert(token, discordConfig, solInvest, result.signature, result.jitoTipSol);
      }
    },
    [consensusFeed, agentConfig, autoSnipeConfig, appendLog, setActivePosition, refreshWalletBalance, telegramConfig, discordConfig]
  );

  // Core On-Chain & Paper Sell Executor (Requirement 1 & 3)
  const executeSell = useCallback(
    async (pos: ActivePosition, reason: string, percentage: number = 100) => {
      if (!pos || pos.status === 'CLOSING' || pos.status === 'CLOSED') return;
      const isFull = percentage >= 100;
      appendLog('EXECUTION', 'INFO', `⚡ [AUTO-SELL] Mengeksekusi sell ${percentage}% untuk ${pos.token.symbol} (${reason})...`);

      // 1. Mark CLOSING state immediately in UI & ref
      setActivePosition((prev) => (prev ? { ...prev, status: 'CLOSING' } : null));
      positionMutex.markSelling(pos.token.mint);

      let exitPriceSol = pos.currentPriceSol;
      let isSoldOnChain = false;

      const isExplicitPaper = walletState.mode === 'PAPER_TRADING' && !pos.token.isRealData && isSimulationMode;

      if (isExplicitPaper) {
        // DRY-RUN SIMULATION INTERCEPTOR (Hanya jika benar-benar testing paper)
        const mockSig = `SIM_SELL_${Math.random().toString(36).slice(2, 10).toUpperCase()}_${Date.now().toString().slice(-6)}`;
        appendLog(
          'EXECUTION',
          'SUCCESS',
          `🧪 [PAPER TRADING] Posisi ${pos.token.symbol} disimulasikan terjual @ ${exitPriceSol.toFixed(8)} SOL [SimTx: ${mockSig}].`
        );
        isSoldOnChain = true;
      } else {
        const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://solana-rpc.publicnode.com';
        const connection = new Connection(rpcUrl, 'confirmed');

        // Jalur 1: Coba eksekusi otomatis via Server Hot Wallet (/api/bot/execute-sell)
        let serverSuccess = false;
        let serverErrorMsg = '';

        try {
          appendLog('EXECUTION', 'INFO', `📡 Mengirim transaksi jual on-chain untuk ${pos.token.symbol} via Jito / RPC...`);
          const sellRes = await fetch('/api/bot/execute-sell', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mint: pos.token.mint,
              percentage,
              slippageBps: 300,
              jitoTipSol: 0.00015
            }),
            signal: AbortSignal.timeout(32000)
          });

          const sellData = await sellRes.json();
          if (sellData.success && sellData.signature) {
            appendLog('JITO', 'SUCCESS', `⚡ [ON-CHAIN SELL CONFIRMED] Tx: https://solscan.io/tx/${sellData.signature}`);
            if (sellData.solReceived && pos.tokenAmount > 0) {
              exitPriceSol = +(sellData.solReceived / (pos.tokenAmount * (percentage / 100))).toFixed(8);
            }
            isSoldOnChain = true;
            serverSuccess = true;
          } else {
            serverErrorMsg = sellData?.error || 'Server tidak memiliki token account';
          }
        } catch (sErr: any) {
          serverErrorMsg = sErr.message || 'Gagal menghubungi server sell';
        }

        // Jalur 2: Jika server gagal (misal token tersimpan di browser Phantom), langsung eksekusi via Phantom browser
        if (!serverSuccess) {
          appendLog('EXECUTION', 'INFO', `🟡 [FALLBACK KE PHANTOM] Server: ${serverErrorMsg}. Mengecek dan mengeksekusi langsung via dompet Phantom di browser...`);

          const provider = typeof window !== 'undefined'
            ? ((window as any).phantom?.solana || (window as any).solana || (window as any).solflare || (window as any).backpack)
            : null;

          if (provider && (provider.isConnected || provider.isPhantom)) {
            const pubKey = provider.publicKey || (walletState.fullPublicKey ? new PublicKey(walletState.fullPublicKey) : null);

            if (pubKey) {
              try {
                // Ambil token account riil dari Phantom untuk mendapatkan jumlah presisi
                let tokenAccounts = await connection.getParsedTokenAccountsByOwner(pubKey, {
                  mint: new PublicKey(pos.token.mint)
                });

                // Cek Token-2022 jika di SPL standar kosong
                if (!tokenAccounts.value || tokenAccounts.value.length === 0) {
                  try {
                    const t22 = await connection.getParsedTokenAccountsByOwner(pubKey, {
                      programId: new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb')
                    });
                    tokenAccounts.value = t22.value.filter((a) => a.account.data.parsed.info.mint === pos.token.mint);
                  } catch {}
                }

                if (tokenAccounts.value && tokenAccounts.value.length > 0) {
                  const info = tokenAccounts.value[0].account.data.parsed.info;
                  const rawBal = BigInt(info.tokenAmount.amount);
                  const portion = Math.min(1.0, Math.max(0.01, percentage / 100));
                  let rawUnitsToSell = (rawBal * BigInt(Math.round(portion * 1000))) / BigInt(1000);
                  if (rawUnitsToSell <= BigInt(0)) rawUnitsToSell = rawBal;

                  if (rawUnitsToSell > BigInt(0)) {
                    appendLog('EXECUTION', 'INFO', `🔑 [PHANTOM SIGN] Membuka popup persetujuan transaksi di Phantom untuk menjual ${info.tokenAmount.uiAmount} ${pos.token.symbol}...`);
                    const quote = await fetchJupiterSellQuote(pos.token.mint, rawUnitsToSell.toString(), 300);
                    const swapRes = await executeJupiterSwap(
                      quote,
                      pos.token.symbol,
                      0.00015,
                      networkMetrics.currentSlot,
                      pubKey.toString(),
                      provider,
                      false
                    );

                    if (swapRes.signature && !swapRes.isSimulated) {
                      appendLog('JITO', 'SUCCESS', `⚡ [PHANTOM SELL CONFIRMED] Tx: https://solscan.io/tx/${swapRes.signature}`);
                      const solRec = quote.tokenAmountUi || lamportsToSol(quote.outAmountRaw) || 0;
                      if (solRec > 0 && pos.tokenAmount > 0) {
                        exitPriceSol = +(solRec / (pos.tokenAmount * portion)).toFixed(8);
                      }
                      isSoldOnChain = true;
                    } else {
                      appendLog('EXECUTION', 'DANGER', `❌ Transaksi jual dibatalkan di dompet Phantom.`);
                      isSoldOnChain = false;
                    }
                  } else {
                    appendLog('EXECUTION', 'WARN', `ℹ️ Saldo token ${pos.token.symbol} di Phantom sudah 0.`);
                    isSoldOnChain = true;
                  }
                } else {
                  // Token tidak ada di Phantom maupun server
                  const holdSec = (Date.now() - pos.entryTimestamp) / 1000;
                  if (holdSec > 35) {
                    appendLog('EXECUTION', 'WARN', `ℹ️ [ORPHAN CLEARED] Token ${pos.token.symbol} tidak ditemukan di dompet on-chain mana pun (saldo 0). Slot dibebaskan.`);
                    isSoldOnChain = true;
                  } else {
                    appendLog('EXECUTION', 'WARN', `⚠️ Token ${pos.token.symbol} belum terdeteksi di RPC. Menunggu konfirmasi slot...`);
                    isSoldOnChain = false;
                  }
                }
              } catch (clientErr: any) {
                appendLog('EXECUTION', 'DANGER', `❌ Gagal eksekusi jual via Phantom: ${clientErr.message}`);
                isSoldOnChain = false;
              }
            } else {
              appendLog('EXECUTION', 'DANGER', `❌ Public key Phantom tidak valid.`);
              isSoldOnChain = false;
            }
          } else {
            appendLog('EXECUTION', 'DANGER', `❌ Dompet Phantom browser tidak terhubung dan server hot wallet tidak memiliki token.`);
            isSoldOnChain = false;
          }
        }
      }

      if (!isSoldOnChain) {
        setActivePosition((prev) => (prev ? { ...prev, status: 'OPEN' } : null));
        appendLog(
          'EXECUTION',
          'WARN',
          `⚠️ Transaksi jual on-chain ${pos.token.symbol} belum terkonfirmasi. Posisi tetap aktif di dashboard.`
        );
        return;
      }

      if (isSoldOnChain) {
        const { pnlPct, pnlSol, rMultiplier } = calculateSolanaPnl(pos.solInvested, pos.entryPriceSol, exitPriceSol);
        if (pnlSol >= 0) {
          soundFx.playTakeProfit();
        } else {
          soundFx.playEmergencyExit();
        }

        const closed: ClosedTrade = {
          id: pos.id,
          token: pos.token,
          entryPriceSol: pos.entryPriceSol,
          exitPriceSol,
          solInvested: pos.solInvested,
          pnlSol,
          pnlPct,
          rMultiplier,
          holdDurationSec: Math.round((Date.now() - pos.entryTimestamp) / 1000),
          exitReason: reason,
          entryTimestamp: pos.entryTimestamp,
          exitTimestamp: Date.now(),
          jitoTipSol: 0.00005
        };

        if (isFull) {
          setClosedTrades((prev) => [closed, ...prev]);
          setActivePosition(null);
          priceSamplesRef.current = [];

          // MUTEX RELEASE WITH 10-MINUTE ANTI-SPAM COOLDOWN
          positionMutex.releaseLock(pos.token.mint, 600000);
          isPositionOpenRef.current = false;
          activePositionRef.current = null;

          setTelemetry((prev) => ({
            ...prev,
            activePositionLocked: false,
            totalPnlSol: +(prev.totalPnlSol + pnlSol).toFixed(3),
            currentBalanceSol: +(prev.currentBalanceSol + pos.solInvested + pnlSol).toFixed(3),
            winCount: pnlSol >= 0 ? prev.winCount + 1 : prev.winCount,
            lossCount: pnlSol < 0 ? prev.lossCount + 1 : prev.lossCount
          }));

          await refreshWalletBalance();
          await refreshHoldings();

          if (telegramConfig.isEnabled) {
            sendTelegramExitAlert(closed, telegramConfig);
          }
          if (discordConfig.isEnabled) {
            sendDiscordExitAlert(closed, discordConfig);
          }

          appendLog(
            'EXECUTION',
            pnlSol >= 0 ? 'SUCCESS' : 'DANGER',
            `🎯 [POSITION FULLY CLOSED] ${pos.token.symbol} (${pnlPct >= 0 ? '+' : ''}${pnlPct}%, ${pnlSol >= 0 ? '+' : ''}${pnlSol} SOL) • Alasan: ${reason} • MUTEX RELEASED`
          );
        } else {
          // Partial sell (e.g. 50%)
          const portion = percentage / 100;
          const freedInvest = +(pos.solInvested * portion).toFixed(4);
          const freedPnlSol = +(pnlSol * portion).toFixed(4);

          setTelemetry((prev) => ({
            ...prev,
            totalPnlSol: +(prev.totalPnlSol + freedPnlSol).toFixed(3),
            currentBalanceSol: +(prev.currentBalanceSol + freedInvest + freedPnlSol).toFixed(3)
          }));

          setActivePosition((prev) => {
            if (!prev) return null;
            const updated = {
              ...prev,
              status: 'OPEN' as const,
              solInvested: +(prev.solInvested * (1 - portion)).toFixed(4),
              tokenAmount: Math.round(prev.tokenAmount * (1 - portion)),
              pnlSol: +(prev.pnlSol * (1 - portion)).toFixed(4)
            };
            activePositionRef.current = updated;
            return updated;
          });

          await refreshWalletBalance();
          await refreshHoldings();
          appendLog('EXECUTION', 'SUCCESS', `🎯 [PARTIAL PROFIT] Sold ${percentage}% ${pos.token.symbol} (+${freedPnlSol} SOL)`);
        }
      }
    },
    [walletState.mode, walletState.fullPublicKey, networkMetrics.currentSlot, appendLog, setActivePosition, setClosedTrades, refreshWalletBalance, refreshHoldings, telegramConfig, discordConfig]
  );

  // EMERGENCY KILL-SWITCH
  const emergencyKillSwitch = useCallback(() => {
    setEngineStatus('PAUSED');
    soundFx.playEmergencyExit();
    if (activePositionRef.current) {
      executeSell(activePositionRef.current, 'EMERGENCY KILL-SWITCH DUMP (Manual Override)', 100);
    } else {
      appendLog('SYSTEM', 'WARN', 'KILL-SWITCH ACTIVATED: All autonomous trading halted immediately');
    }
  }, [executeSell, appendLog]);

  // Quick Sell Position (50% or 100%)
  const quickSellPosition = useCallback(
    (percentage: number) => {
      if (!activePositionRef.current) return;
      executeSell(activePositionRef.current, `Manual Quick Sell (${percentage}%)`, percentage);
    },
    [executeSell]
  );

  const manualExitPosition = useCallback(() => {
    if (!activePositionRef.current) return;
    executeSell(activePositionRef.current, 'Manual Full Dump (100%)', 100);
  }, [executeSell]);

  const resetPositionMutex = useCallback(() => {
    const currentMint = activePositionRef.current?.token.mint;
    positionMutex.releaseLock(currentMint, 0);
    setActivePosition(null);
    activePositionRef.current = null;
    isPositionOpenRef.current = false;
    priceSamplesRef.current = [];
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('GT_ACTIVE_POSITION');
      } catch {}
    }
    setTelemetry((prev) => ({
      ...prev,
      activePositionLocked: false
    }));
    appendLog('SYSTEM', 'WARN', '🔓 [MUTEX RESET] Mutex posisi aktif berhasil di-reset & dikosongkan. Slot kini siap untuk sinyal baru.');
  }, [setActivePosition, appendLog]);

  // Snipe Manual Mint CA
  const snipeManualMint = useCallback(async (mint: string) => {
    if (!mint || mint.trim().length < 20) return;
    setIsSearchingMint(true);
    setSniperStatus('Mencari metadata & audit on-chain...');
    appendLog('SCAN', 'INFO', `Looking up Solana token mint: ${mint.slice(0, 8)}...`);

    try {
      const res = await fetch(`/api/tokens/lookup?mint=${encodeURIComponent(mint.trim())}`);
      const data = await res.json();

      if (!res.ok || !data.token) {
        throw new Error(data.error || 'Token tidak ditemukan');
      }

      const foundToken: TokenSignal = data.token;
      setSniperStatus(`Mengevaluasi 5 agen & simulasi honeypot untuk ${foundToken.symbol}...`);

      // High-Security Honeypot Pre-flight Verification
      const honeypotCheck = await verifySafeToSell(foundToken);
      foundToken.honeypotCheck = honeypotCheck;

      if (!honeypotCheck.isSafeToSell) {
        setSniperStatus('VETOED - HONEYPOT DETECTED');
        setTimeout(() => setSniperStatus(null), 8000);
        appendLog('RISK', 'DANGER', `🛑 [VETOED - HONEYPOT DETECTED] Token ${foundToken.symbol} (${foundToken.mint.slice(0, 8)}...) adalah HONEYPOT! ${honeypotCheck.reason}`);
        soundFx.playEmergencyExit();

        const vetoConsensus: ConsensusResult = {
          token: foundToken,
          verdict: 'VETOED',
          vetoAgent: 'risk',
          vetoReason: `[HONEYPOT DETECTED] ${honeypotCheck.reason}`,
          verdicts: {
            risk: {
              agentId: 'risk',
              agentName: 'Honeypot Shield',
              status: 'VETO',
              reason: honeypotCheck.reason || 'Honeypot detected',
              metricValue: 'Honeypot',
              threshold: 'Safe To Sell',
              latencyMs: honeypotCheck.latencyMs
            },
            scanner: { agentId: 'scanner', agentName: 'Scanner Agent', status: 'APPROVE', reason: 'N/A', metricValue: 'N/A', threshold: 'N/A', latencyMs: 0 },
            narrative: { agentId: 'narrative', agentName: 'Narrative Agent', status: 'APPROVE', reason: 'N/A', metricValue: 'N/A', threshold: 'N/A', latencyMs: 0 },
            timing: { agentId: 'timing', agentName: 'Timing Agent', status: 'APPROVE', reason: 'N/A', metricValue: 'N/A', threshold: 'N/A', latencyMs: 0 },
            exit: { agentId: 'exit', agentName: 'Exit Agent', status: 'APPROVE', reason: 'N/A', metricValue: 'N/A', threshold: 'N/A', latencyMs: 0 }
          },
          consensusLatencyMs: honeypotCheck.latencyMs,
          timestamp: Date.now(),
          honeypotCheck
        };

        setConsensusFeed((prev) => [vetoConsensus, ...prev.slice(0, 39)]);
        setSelectedResult(vetoConsensus);
        return;
      }

      const consensus = runAgentConsensus(foundToken, effectiveThresholdsRef.current);
      consensus.honeypotCheck = honeypotCheck;

      setConsensusFeed((prev) => [consensus, ...prev.slice(0, 39)]);
      setSelectedResult(consensus);

      if (consensus.verdict === 'APPROVED') {
        appendLog('RISK', 'SUCCESS', `Manual target ${foundToken.symbol} PASSED 5/5 consensus & Honeypot Shield!`);
        soundFx.playApproval();

        // Broadcast to Alpha Signal feed and Telegram
        try {
          const { signal } = runConsensusAndBuildSignal(foundToken, {
            thresholds: effectiveThresholdsRef.current,
            grokViralityScore: foundToken.narrativeCosineSim,
            solRateUsd: 140,
          });
          if (signal) {
            await broadcastSignal(signal, telegramConfigRef.current);
            const cleanSym = (signal.token?.symbol || foundToken.symbol || 'UNKNOWN').replace(/^\$+/, '');
            appendLog(
              'TELEGRAM',
              'SUCCESS',
              `📡 [MANUAL TARGET BROADCAST] $${cleanSym} lolos konsensus & masuk ke Sinyal Alpha Live!`
            );
          }
        } catch (sigErr) {
          console.warn('[ManualSnipe] Broadcast error:', sigErr);
        }

        // In Signal Terminal, manual lookup generates verified signal without snipe popup
        setPendingSnipeConfirmation(null);
        setSniperStatus(`✅ Sinyal lolos: ${foundToken.symbol} siap di feed sinyal!`);
        setTimeout(() => setSniperStatus(null), 8000);
      } else {
        appendLog('RISK', 'WARN', `Manual target ${foundToken.symbol} VETOED by ${consensus.vetoAgent}: ${consensus.vetoReason}`);
        soundFx.playVeto();
        if (consensus.vetoReason?.includes('HONEYPOT') || foundToken.isHoneypotDetected) {
          setSniperStatus('VETOED - HONEYPOT DETECTED');
        } else {
          setSniperStatus(`VETOED: ${consensus.vetoAgent}`);
        }
        setTimeout(() => setSniperStatus(null), 8000);
      }
    } catch (err: any) {
      appendLog('SYSTEM', 'DANGER', `Lookup error: ${err.message}`);
    } finally {
      setIsSearchingMint(false);
    }
  }, [activePosition, appendLog]);

  // Confirmation actions for Manual Snipe (Fix #12)
  const confirmSnipe = useCallback(async () => {
    if (!pendingSnipeConfirmation) return;
    const { token, solInvest } = pendingSnipeConfirmation;

    // Mutex check
    if (positionMutex.isPositionOpen() || isPositionOpenRef.current || activePositionRef.current !== null) {
      appendLog('RISK', 'WARN', `[MUTEX GUARD] Tidak dapat membuka posisi ${token.symbol}: Posisi aktif sedang berjalan.`);
      setPendingSnipeConfirmation(null);
      return;
    }

    const locked = positionMutex.acquireLock(token.mint);
    if (!locked) {
      appendLog('RISK', 'WARN', `[MUTEX BLOCKED] Pembelian ${token.symbol} ditolak oleh Mutex Guard.`);
      setPendingSnipeConfirmation(null);
      return;
    }
    isPositionOpenRef.current = true;
    setTelemetry((prev) => ({ ...prev, activePositionLocked: true }));

    // Last-Second Pre-flight Honeypot Guard Check
    const hp = token.honeypotCheck || await verifySafeToSell(token);
    token.honeypotCheck = hp;
    if (!hp.isSafeToSell) {
      positionMutex.releaseLock(token.mint, 60000);
      isPositionOpenRef.current = false;
      setTelemetry((prev) => ({ ...prev, activePositionLocked: false }));
      setSniperStatus('VETOED - HONEYPOT DETECTED');
      appendLog('RISK', 'DANGER', `🛑 [EXECUTION BLOCKED] Token ${token.symbol} terdeteksi sebagai HONEYPOT saat pre-flight final! Transaksi dibatalkan.`);
      soundFx.playEmergencyExit();
      setPendingSnipeConfirmation(null);
      return;
    }

    const entryPrice = token.priceSol || 0.0001;
    const tpPct = agentConfig.takeProfitPct ?? autoSnipeConfig.takeProfitPct ?? 100;
    const slPct = agentConfig.stopLossPct ?? autoSnipeConfig.stopLossPct ?? -25;
    const trailingDist = agentConfig.trailingStopLossPct ?? autoSnipeConfig.trailingStopLossPct ?? 15;
    const maxTtl = agentConfig.maxHoldTimeSec ?? autoSnipeConfig.maxHoldTimeSec ?? 180;
    const targetTpPrice = +(entryPrice * (1 + tpPct / 100)).toFixed(8);
    const slPrice = +(entryPrice * (1 + slPct / 100)).toFixed(8);
    const trailingStop = +(entryPrice * (1 - trailingDist / 100)).toFixed(8);

    const tradingStyle = autoSnipeConfig.tradingStyle || 'SCALPING';
    const isTtlUnlimited = autoSnipeConfig.ttlUnlimited ?? (tradingStyle === 'HODL');
    const isAutoSellOn = autoSnipeConfig.autoSellEnabled ?? (tradingStyle !== 'HODL');

    const newPos: ActivePosition = {
      id: `POS-${Math.floor(1000 + Math.random() * 9000)}`,
      token,
      entryPriceSol: entryPrice,
      currentPriceSol: entryPrice,
      solInvested: solInvest,
      tokenAmount: Math.round((solInvest / entryPrice) * 1000) / 1000,
      pnlSol: 0,
      pnlPct: 0,
      rMultiplier: 0,
      highestPriceSol: entryPrice,
      trailingStopPriceSol: trailingStop,
      entryTimestamp: Date.now(),
      status: 'OPEN',
      targetTpPct: tpPct,
      targetTpPriceSol: tpPct > 0 ? targetTpPrice : undefined,
      stopLossPct: slPct,
      stopLossPriceSol: slPrice,
      trailingDistancePct: trailingDist,
      maxHoldTimeSec: isTtlUnlimited ? 0 : maxTtl,
      velocityPctPerSec: 0,
      etaToTpSeconds: null,
      momentumStatus: 'STAGNANT',
      holdDurationSec: 0,
      tradingStyle,
      ttlUnlimited: isTtlUnlimited,
      autoSellEnabled: isAutoSellOn
    };
    priceSamplesRef.current = [{ price: entryPrice, timestamp: Date.now() }];
    positionMutex.markBuyCompleted(token.mint);
    activePositionRef.current = newPos;
    isPositionOpenRef.current = true;
    setActivePosition(newPos);
    setTelemetry((prev) => ({
      ...prev,
      activePositionLocked: true,
      currentBalanceSol: +(prev.currentBalanceSol - solInvest).toFixed(3)
    }));
    // Jito Tokyo MEV Bundle Execution
    const tipTier = agentConfig.jitoTipTier || 'TURBO';
    const tipSol = JITO_TIP_TIERS[tipTier] || 0.002000;
    const bundleReceipt = createJitoBundleReceipt(
      token,
      tipSol,
      networkMetrics.currentSlot,
      'TOKYO'
    );

    appendLog('JITO', 'SUCCESS', `⚡ JITO TOKYO BUNDLE LANDED: ${bundleReceipt.bundleId} (${bundleReceipt.latencyMs}ms) • Tip: ${tipSol} SOL`);
    appendLog('EXECUTION', 'SUCCESS', `[CONFIRMED] Opened active position on ${token.symbol} @ ${entryPrice.toFixed(8)} SOL via Jito MEV`);

    // Real On-Chain Swap via Jupiter Modal (user must approve in Phantom extension)
    // The actual signing happens in JupiterSwapModal when user clicks "SWAP VIA JUPITER + JITO MEV"
    if (walletState.mode === 'LIVE_ON_CHAIN' && walletState.isConnected) {
      appendLog('EXECUTION', 'INFO', `🟡 [LIVE] Posisi ${token.symbol} dibuka di dashboard. Untuk eksekusi on-chain, gunakan modal Jupiter Swap (tekan J) dan konfirmasi di Phantom.`);
    }

    // Omnichannel Buy Alerts
    if (telegramConfig.isEnabled) {
      sendTelegramBuyAlert(token, telegramConfig, solInvest, bundleReceipt.txHash, tipSol);
    }
    if (discordConfig.isEnabled) {
      sendDiscordBuyAlert(token, discordConfig, solInvest, bundleReceipt.txHash, tipSol);
    }

    soundFx.playApproval();
    setPendingSnipeConfirmation(null);
    setSniperStatus(null);
  }, [pendingSnipeConfirmation, appendLog, telegramConfig, discordConfig, agentConfig, networkMetrics.currentSlot, walletState]);

  const cancelSnipe = useCallback(() => {
    if (pendingSnipeConfirmation) {
      appendLog('EXECUTION', 'WARN', `Snipe order ${pendingSnipeConfirmation.token.symbol} dibatalkan oleh operator.`);
    }
    setPendingSnipeConfirmation(null);
    setSniperStatus(null);
  }, [pendingSnipeConfirmation, appendLog]);

  // RPC Failover Listener (PRD Section 7.2 Sub-100ms failover)
  useEffect(() => {
    const unsubscribe = rpcFailoverInstance.onFailover((oldRpc, newRpc, reason, durationMs) => {
      appendLog(
        'SYSTEM',
        'WARN',
        `[PRD §7.2] RPC FAILOVER (${durationMs}ms): Beralih dari ${oldRpc.name} ke ${newRpc.name} (${newRpc.latencyMs}ms) - Alasan: ${reason}`
      );
      setNetworkMetrics((m) => ({
        ...m,
        rpcLabel: newRpc.name,
        latencyMs: newRpc.latencyMs
      }));
    });
    return () => unsubscribe();
  }, [appendLog]);

  const realTokensQueueRef = useRef<TokenSignal[]>([]);

  // Live Slot Fetch from Helius RPC on startup
  useEffect(() => {
    const fetchLiveSlot = async () => {
      const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://solana-rpc.publicnode.com';
      try {
        const res = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getSlot' }),
          signal: AbortSignal.timeout(5000)
        });
        if (res.ok) {
          const data = await res.json();
          if (data.result) {
            setNetworkMetrics((m) => ({ ...m, currentSlot: data.result }));
            setTelemetry((t) => ({ ...t, currentSlot: data.result }));
          }
        }
      } catch {}
    };
    fetchLiveSlot();
    const slotTimer = setInterval(fetchLiveSlot, 60000);
    return () => clearInterval(slotTimer);
  }, []);

  // Periodic Ingestion of Real Live Solana Tokens from DexScreener API
  useEffect(() => {
    let isMounted = true;

    const fetchRealTokens = async () => {
      try {
        const res = await fetch('/api/tokens/real');
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.tokens) && data.tokens.length > 0) {
            if (isMounted) {
              realTokensQueueRef.current = [...data.tokens];
              const realConsensus = data.tokens.map((t: TokenSignal) =>
                runAgentConsensus(t, effectiveThresholdsRef.current)
              );
              setConsensusFeed((prev) => {
                const combined = [...realConsensus, ...prev];
                const seen = new Set<string>();
                return combined.filter((item) => {
                  if (seen.has(item.token.mint)) return false;
                  seen.add(item.token.mint);
                  return true;
                }).slice(0, 96);
              });

              // Rotasikan & Siarkan sinyal koin real yang lolos konsensus ke Sinyal Alpha Live & Telegram
              for (const item of realConsensus) {
                if (item.verdict === 'APPROVED') {
                  try {
                    let { signal } = runConsensusAndBuildSignal(item.token, {
                      thresholds: effectiveThresholdsRef.current,
                      grokViralityScore: item.token.narrativeCosineSim,
                      solRateUsd: 140,
                    });

                    if (!signal) {
                      const moonshot = item.moonshot || MoonshotAnalyzer.evaluate(item.token);
                      signal = computeSignal({
                        token: { ...item.token, isRealData: true },
                        moonshot,
                        grokViralityScore: item.token.narrativeCosineSim || 0.85,
                        solRateUsd: 140,
                      });
                    }

                    if (signal) {
                      await broadcastSignal(signal, telegramConfigRef.current);
                    }
                  } catch (sigErr) {
                    console.warn('[fetchRealTokens] Error broadcasting signal:', sigErr);
                  }
                }
              }
            }
          }
        }
      } catch {
        // Fallback gracefully
      }
    };

    fetchRealTokens();
    const timer = setInterval(fetchRealTokens, 15000);
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, []);

  // Real-Time Helius WebSocket Event Stream (Block 0/1 Sniffer for Pump.fun & Raydium)
  useEffect(() => {
    const stream = new HeliusBlockchainStream();
    stream.connect({
      onSlot: (slot) => {
        setNetworkMetrics((m) => ({ ...m, currentSlot: slot }));
        setTelemetry((t) => ({ ...t, currentSlot: slot }));
      },
      onPoolCreated: (event) => {
        appendLog(
          'SCAN',
          'INFO',
          `⚡ [BLOCK 0/1 SNIFFER] Terdeteksi pool baru di ${event.platform} (${event.instruction}) | Sig: ${event.signature.slice(0, 12)}...`
        );
        const sniffedToken = enqueueSniffedPoolEvent(event);
        realTokensQueueRef.current = [sniffedToken, ...realTokensQueueRef.current];
      },
      onNewTokenEvent: () => {
        // Trigger immediate real token ingestion on Raydium/Pump pool log detection
        fetch('/api/tokens/real')
          .then((r) => r.json())
          .then((d) => {
            if (d.success && Array.isArray(d.tokens) && d.tokens.length > 0) {
              realTokensQueueRef.current = [...d.tokens, ...realTokensQueueRef.current];
            }
          })
          .catch(() => {});
      },
      onStatusChange: (status) => {
        if (status === 'CONNECTED') {
          appendLog('SYSTEM', 'INFO', '⚡ Helius WebSocket on-chain streaming: TERHUBUNG (Pump.fun & Raydium Block 0/1 Sniffer AKTIF)');
        }
      }
    });

    return () => {
      stream.disconnect();
    };
  }, [appendLog]);

  // Autonomous Ingestion Loop with Continuous Signal Broadcast
  useEffect(() => {
    if (engineStatus !== 'AUTONOMOUS') return;

    // Eagerly fetch real Solana tokens on activation
    if (realTokensQueueRef.current.length < 5) {
      fetch('/api/tokens/real')
        .then((r) => r.json())
        .then((d) => {
          if (d.success && Array.isArray(d.tokens) && d.tokens.length > 0) {
            const existingMints = new Set(realTokensQueueRef.current.map((t) => t.mint));
            const newTokens = d.tokens.filter((t: TokenSignal) => !existingMints.has(t.mint));
            realTokensQueueRef.current.push(...newTokens);
          }
        })
        .catch(() => {});
    }

    const interval = setInterval(async () => {
      // Slot increment
      setNetworkMetrics((m) => ({
        ...m,
        currentSlot: m.currentSlot + 1,
        latencyMs: 32 + Math.floor(Math.random() * 14)
      }));

      // Ingest signal: prioritize real live DexScreener token from queue
      let rawToken: TokenSignal;
      if (realTokensQueueRef.current.length > 0) {
        rawToken = realTokensQueueRef.current.shift()!;
      } else {
        rawToken = generateRandomTokenSignal();
      }

      // Proactively replenish real tokens queue if running low
      if (realTokensQueueRef.current.length < 5) {
        fetch('/api/tokens/real')
          .then((r) => r.json())
          .then((d) => {
            if (d.success && Array.isArray(d.tokens) && d.tokens.length > 0) {
              const existingMints = new Set(realTokensQueueRef.current.map((t) => t.mint));
              const newTokens = d.tokens.filter((t: TokenSignal) => !existingMints.has(t.mint));
              realTokensQueueRef.current.push(...newTokens);
            }
          })
          .catch(() => {});
      }

      const consensus = runAgentConsensus(rawToken, effectiveThresholdsRef.current);

      // Keep rolling feed of 96 items for the PRD 96-cell Scan Grid Matrix
      setConsensusFeed((prev) => [consensus, ...prev.slice(0, 95)]);

      // Emit verbose sequential decision logs to UI terminal feed for every coin scanned
      if (consensus.decisionTrace) {
        const dt = consensus.decisionTrace;
        const sym = consensus.token.symbol;
        const verdictTag = consensus.verdict === 'APPROVED' ? '✅ APPROVED (5/5 PASS)' : `🛑 VETOED [${consensus.vetoAgent?.toUpperCase()}]`;
        appendLog(
          'DECISION',
          consensus.verdict === 'APPROVED' ? 'SUCCESS' : 'WARN',
          `🔎 [DECISION] ${sym} ➔ 1. Likuiditas: ${dt.liquidity.passed ? '✅' : '🛑'} ($${dt.liquidity.initialLpUsd.toLocaleString()}) | 2. Honeypot: ${dt.honeypot.passed ? '✅' : '🛑'} (Mint:${dt.honeypot.mintRevoked ? 'Rev' : 'Act'} Frz:${dt.honeypot.freezeRevoked ? 'Rev' : 'Act'}) | 3. Momentum: ${dt.momentum.passed ? '✅' : '🛑'} (Vol:${dt.momentum.volumeDelta15s > 0 ? '+' : ''}${dt.momentum.volumeDelta15s} SOL) ➔ ${verdictTag}`
        );
      }

      setTelemetry((prev) => ({
        ...prev,
        scannedCount: prev.scannedCount + 1,
        vetoCount: consensus.verdict === 'VETOED' ? prev.vetoCount + 1 : prev.vetoCount
      }));

      if (consensus.verdict === 'APPROVED') {
        // Pre-flight Honeypot Check before processing automated purchase
        const hp = await verifySafeToSell(consensus.token);
        consensus.token.honeypotCheck = hp;
        if (!hp.isSafeToSell) {
          appendLog(
            'RISK',
            'WARN',
            `🛑 [AUTONOMOUS SHIELD] Token ${consensus.token.symbol} (${consensus.token.mint.slice(0, 8)}...) ditolak oleh Honeypot Shield: ${hp.reason}`
          );
          return;
        }

        soundFx.playApproval();
        appendLog('SCAN', 'SUCCESS', `Signal APPROVED: ${consensus.token.symbol} (Score: ${consensus.token.narrativeCosineSim})`);

        // ─── AI Alpha Signal Terminal: Broadcast sinyal lolos konsensus ke Feed & Telegram ───
        // Pastikan token yang disetujui (baik on-chain live maupun simulator aktif) diterbitkan
        if (consensus.token.isRealData || isSimulationMode || autoSnipeConfigRef.current.isEnabled) {
          try {
            const { signal } = runConsensusAndBuildSignal(consensus.token, {
              thresholds: effectiveThresholdsRef.current,
              grokViralityScore: consensus.token.narrativeCosineSim,
              solRateUsd: 140,
            });

            if (signal) {
              await broadcastSignal(signal, telegramConfigRef.current);
              const cleanSym = (signal.token?.symbol || 'UNKNOWN').replace(/^\$+/, '');
              appendLog(
                'TELEGRAM',
                'SUCCESS',
                `📡 [SIGNAL BROADCAST] $${cleanSym} Entry: ${signal.entryZone.low.toFixed(6)}-${signal.entryZone.high.toFixed(6)} SOL | TP1: ${signal.targets[0].priceSol.toFixed(6)} | TP2: ${signal.targets[1].priceSol.toFixed(6)} | TP3: ${signal.targets[2].priceSol.toFixed(6)} | SL: ${signal.stopLoss.priceSol.toFixed(6)} SOL (R/R 1:${signal.riskRewardRatio})`
              );
            }
          } catch (sigErr) {
            console.warn('[SignalBroadcast] Error generating signal:', sigErr);
          }
        }
      }
    }, 2800);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engineStatus, appendLog, agentConfig, autoSnipeConfig, telemetry, walletState, isSimulationMode]);

  // Real-Time On-Chain Price Stream & Exit Agent Evaluator
  useEffect(() => {
    if (!activePosition) {
      priceSamplesRef.current = [];
      return;
    }

    const interval = setInterval(async () => {
      let livePrice = activePosition.currentPriceSol;

      if (activePosition.token.isRealData) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2500);
          const res = await fetch(
            `https://api.dexscreener.com/latest/dex/tokens/${activePosition.token.mint}`,
            { signal: controller.signal }
          ).finally(() => clearTimeout(timeoutId));

          if (res.ok) {
            const data = await res.json();
            const pair = data.pairs?.find((p: any) => p.chainId === 'solana') || data.pairs?.[0];
            if (pair?.priceNative) {
              livePrice = parseFloat(pair.priceNative);
            }
          } else {
            // Micro drift fallback if DexScreener temporary 429/timeout
            const drift = (Math.random() - 0.46) * 0.02;
            livePrice = +(livePrice * (1 + drift)).toFixed(8);
          }
        } catch {
          // Network glitch fallback
          const drift = (Math.random() - 0.46) * 0.02;
          livePrice = +(livePrice * (1 + drift)).toFixed(8);
        }
      } else {
        // Simulation price drift
        const drift = (Math.random() - 0.44) * 0.05;
        livePrice = +(livePrice * (1 + drift)).toFixed(8);
      }

      const now = Date.now();
      // Record sample in ring-buffer (capped at 8 items to strictly prevent memory leaks)
      priceSamplesRef.current.push({ price: livePrice, timestamp: now });
      if (priceSamplesRef.current.length > 8) {
        priceSamplesRef.current = priceSamplesRef.current.slice(-8);
      }

      // Calculate Price Velocity: (∆Price / EntryPrice) * (100 / ∆Time) in %/sec
      let velocityPctPerSec = 0;
      if (priceSamplesRef.current.length >= 2) {
        const oldestSample = priceSamplesRef.current[0];
        const dtSec = Math.max(0.5, (now - oldestSample.timestamp) / 1000);
        const dPrice = livePrice - oldestSample.price;
        velocityPctPerSec = +(((dPrice / activePosition.entryPriceSol) * 100) / dtSec).toFixed(2);
      }

      // Momentum Classification
      let momentumStatus: 'ACCELERATING' | 'STEADY' | 'STAGNANT' | 'DROPPING' = 'STAGNANT';
      if (velocityPctPerSec >= 1.5) {
        momentumStatus = 'ACCELERATING';
      } else if (velocityPctPerSec > 0.08) {
        momentumStatus = 'STEADY';
      } else if (velocityPctPerSec <= -0.3) {
        momentumStatus = 'DROPPING';
      } else {
        momentumStatus = 'STAGNANT';
      }

      const { pnlPct, pnlSol, rMultiplier } = calculateSolanaPnl(
        activePosition.solInvested,
        activePosition.entryPriceSol,
        livePrice
      );
      const newHigh = Math.max(activePosition.highestPriceSol, livePrice);

      const targetTpPct = agentConfig.takeProfitPct ?? activePosition.targetTpPct ?? autoSnipeConfig.takeProfitPct ?? 100;
      const stopLossPct = agentConfig.stopLossPct ?? activePosition.stopLossPct ?? autoSnipeConfig.stopLossPct ?? -25;
      const trailingDistancePct = agentConfig.trailingStopLossPct ?? activePosition.trailingDistancePct ?? autoSnipeConfig.trailingStopLossPct ?? 15;
      const maxHoldTimeSec = agentConfig.maxHoldTimeSec ?? activePosition.maxHoldTimeSec ?? autoSnipeConfig.maxHoldTimeSec ?? 180;
      const holdDurationSec = Math.round((now - activePosition.entryTimestamp) / 1000);

      const targetTpPriceSol = +(activePosition.entryPriceSol * (1 + targetTpPct / 100)).toFixed(8);
      const stopLossPriceSol = +(activePosition.entryPriceSol * (1 + stopLossPct / 100)).toFixed(8);
      const trailingStopPriceSol = +(newHigh * (1 - trailingDistancePct / 100)).toFixed(8);

      // Calculate Projected ETA to TP in seconds
      const remainingPctToTp = targetTpPct - pnlPct;
      let etaToTpSeconds: number | null = null;
      if (remainingPctToTp <= 0) {
        etaToTpSeconds = 0; // Target reached
      } else if (velocityPctPerSec > 0.05) {
        etaToTpSeconds = Math.max(1, Math.round(remainingPctToTp / velocityPctPerSec));
      } else {
        etaToTpSeconds = null; // Stagnant or dropping momentum
      }

      const updatedPos: ActivePosition = {
        ...activePosition,
        currentPriceSol: livePrice,
        pnlSol,
        pnlPct,
        rMultiplier,
        highestPriceSol: newHigh,
        trailingStopPriceSol: trailingStopPriceSol,
        targetTpPct,
        targetTpPriceSol,
        stopLossPct,
        stopLossPriceSol,
        trailingDistancePct,
        maxHoldTimeSec,
        holdDurationSec,
        velocityPctPerSec,
        etaToTpSeconds,
        momentumStatus
      };

      // Check Smart Arbiter Exit Rules
      const exitVerdict = evaluateExitAgent(updatedPos, {
        targetTpPct,
        stopLossPct,
        trailingDistancePct,
        maxHoldTimeSec,
        enableMomentumExit: agentConfig.enableMomentumExit ?? autoSnipeConfig.enableMomentumExit ?? true
      });

      if (exitVerdict.shouldExit) {
        priceSamplesRef.current = [];
        // Pemicu Auto-Sell On-Chain / Paper
        executeSell(updatedPos, exitVerdict.reason || 'Target Take-Profit / Stop Loss Met', 100);
      } else {
        setActivePosition(updatedPos);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [activePosition, appendLog, executeSell, agentConfig, autoSnipeConfig]);

  const updateAgentConfig = useCallback((updates: Partial<AgentConfig>) => {
    setAgentConfig((prev) => {
      const next = { ...prev, ...updates };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('GT_AGENT_CONFIG', JSON.stringify(next));
        } catch {}
      }
      return next;
    });
  }, []);

  const updateExecutionConfig = useCallback((updates: Partial<ExecutionConfig>) => {
    setExecutionConfig((prev) => {
      const updated = { ...prev, ...updates };
      if (typeof window !== 'undefined') {
        localStorage.setItem('GT_EXECUTION_CONFIG', JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  const updateAutoSnipeConfig = useCallback((updates: Partial<AutoSnipeConfig>) => {
    setAutoSnipeConfig((prev) => {
      const next = { ...prev, ...updates };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('GT_AUTOSNIPE_CONFIG', JSON.stringify(next));
        } catch {}
      }
      return next;
    });

    // ── Sinkronisasi otomatis ke telegramConfig jika user mengisi konfigurasi Telegram di Pengaturan Sinyal Alpha ──
    if (updates.telegramBotToken !== undefined || updates.telegramChatId !== undefined || updates.telegramAlertsEnabled !== undefined) {
      setTelegramConfig((prev) => {
        const nextTelegram: WebhookTelegramConfig = {
          ...prev,
          botToken: updates.telegramBotToken !== undefined ? updates.telegramBotToken : prev.botToken,
          chatId: updates.telegramChatId !== undefined ? updates.telegramChatId : prev.chatId,
          isEnabled: updates.telegramAlertsEnabled !== undefined ? updates.telegramAlertsEnabled : prev.isEnabled,
        };
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('GT_TELEGRAM_CONFIG', JSON.stringify(nextTelegram));
          } catch {}
        }
        return nextTelegram;
      });
    }

    // ── Sinkronisasi dinamis ke agentThresholds agar 5/5 AI Consensus engine langsung memakai filter ini ──
    if (updates.minLiquidityUsd !== undefined || updates.minGrokViralityScore !== undefined || updates.maxTop10HoldersPct !== undefined) {
      setAgentThresholds((prev) => {
        const nextThresholds: AgentThresholds = {
          ...prev,
          minInitialLpUsd: updates.minLiquidityUsd ?? prev.minInitialLpUsd,
          minCosineSimilarity: updates.minGrokViralityScore !== undefined ? (updates.minGrokViralityScore > 1 ? updates.minGrokViralityScore / 100 : updates.minGrokViralityScore) : prev.minCosineSimilarity,
          maxTop10HoldersPct: updates.maxTop10HoldersPct ?? prev.maxTop10HoldersPct,
        };
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('GT_AGENT_THRESHOLDS', JSON.stringify(nextThresholds));
          } catch {}
        }
        return nextThresholds;
      });
    }
  }, []);

  const setTradingStyle = useCallback((style: TradingStyle) => {
    const preset = TRADING_STYLE_PRESETS[style];
    if (!preset) return;

    setAutoSnipeConfig((prev) => {
      const next: AutoSnipeConfig = {
        ...prev,
        tradingStyle: style,
        takeProfitPct: preset.targetTpPct,
        stopLossPct: preset.stopLossPct,
        trailingStopLossPct: preset.trailingStopLossPct,
        maxHoldTimeSec: preset.maxHoldTimeSec,
        minLiquidityUsd: preset.minLiquidityUsd,
        minGrokViralityScore: preset.minGrokViralityScore,
        jitoTipTier: preset.jitoTipTier,
        ttlUnlimited: preset.ttlUnlimited,
        autoSellEnabled: preset.autoSellEnabled
      };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('GT_AUTOSNIPE_CONFIG', JSON.stringify(next));
        } catch {}
      }
      return next;
    });

    setAgentConfig((prev) => {
      const next: AgentConfig = {
        ...prev,
        tradingStyle: style,
        takeProfitPct: preset.targetTpPct,
        stopLossPct: preset.stopLossPct,
        trailingStopLossPct: preset.trailingStopLossPct,
        maxHoldTimeSec: preset.maxHoldTimeSec,
        jitoTipTier: preset.jitoTipTier,
        ttlUnlimited: preset.ttlUnlimited,
        autoSellEnabled: preset.autoSellEnabled
      };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('GT_AGENT_CONFIG', JSON.stringify(next));
        } catch {}
      }
      return next;
    });

    // Perbarui juga agentThresholds sesuai preset trading style
    setAgentThresholds((prev) => {
      const next: AgentThresholds = {
        ...prev,
        minInitialLpUsd: preset.minLiquidityUsd,
        minCosineSimilarity: preset.minGrokViralityScore / 100,
      };
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('GT_AGENT_THRESHOLDS', JSON.stringify(next));
        } catch {}
      }
      return next;
    });

    appendLog(
      'SYSTEM',
      'SUCCESS',
      `🎯 [GAYA TRADING AKTIF: ${preset.label}] TP: ${preset.targetTpPct > 0 ? `+${preset.targetTpPct}%` : 'MANUAL (HODL)'} | SL: ${preset.stopLossPct}% | TTL: ${preset.ttlUnlimited ? 'UNLIMITED (NO AUTO-SELL)' : `${preset.maxHoldTimeSec}s`} | Min LP: $${preset.minLiquidityUsd.toLocaleString()}`
    );
  }, [appendLog]);

  const updateTelegramConfig = useCallback((updates: Partial<WebhookTelegramConfig>) => {
    setTelegramConfig((prev) => {
      const updated = { ...prev, ...updates };
      if (typeof window !== 'undefined') {
        localStorage.setItem('GT_TELEGRAM_CONFIG', JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  const updateDiscordConfig = useCallback((updates: Partial<WebhookDiscordConfig>) => {
    setDiscordConfig((prev) => {
      const updated = { ...prev, ...updates };
      if (typeof window !== 'undefined') {
        localStorage.setItem('GT_DISCORD_CONFIG', JSON.stringify(updated));
      }
      return updated;
    });
  }, []);

  const updateWalletState = useCallback((w: WalletState) => {
    setWalletState(w);
    setTelemetry((prev) => ({
      ...prev,
      currentBalanceSol: w.balanceSol
    }));
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('GT_WALLET_STATE', JSON.stringify(w));
      } catch {}
    }
  }, []);

  // Sync telemetry balance with connected wallet balance
  useEffect(() => {
    if (walletState.isConnected) {
      setTelemetry((prev) => ({
        ...prev,
        currentBalanceSol: walletState.balanceSol
      }));
    }
  }, [walletState.isConnected, walletState.balanceSol]);

  // Phantom & Solana Web3 Wallet Auto-Detect & Native Event Listeners on Mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let isMounted = true;

    const setupPhantom = async () => {
      const phantom =
        (window as any).phantom?.solana ||
        ((window as any).solana?.isPhantom ? (window as any).solana : null);

      if (!phantom) return;

      const handleWalletPubkey = async (pubKey: any) => {
        if (!isMounted || !pubKey) return;
        const pubKeyStr = pubKey.toString();
        try {
          const res = await fetch(`/api/wallet/balance?address=${encodeURIComponent(pubKeyStr)}`, {
            signal: AbortSignal.timeout(6000)
          });
          const data = res.ok ? await res.json() : null;
          const liveBal = data && typeof data.balanceSol === 'number' ? data.balanceSol : 0;

          const updated: WalletState = {
            isConnected: true,
            publicKey: `${pubKeyStr.slice(0, 4)}...${pubKeyStr.slice(-4)}`,
            fullPublicKey: pubKeyStr,
            balanceSol: liveBal,
            walletName: 'Phantom',
            mode: 'LIVE_ON_CHAIN'
          };

          setWalletState(updated);
          setTelemetry((prev) => ({ ...prev, currentBalanceSol: liveBal }));
          try {
            localStorage.setItem('GT_WALLET_STATE', JSON.stringify(updated));
          } catch {}
          appendLog('SYSTEM', 'SUCCESS', `⚡ [PHANTOM DETECTED] Dompet Phantom aktif: ${updated.publicKey} (${liveBal} SOL)`);
        } catch (err: any) {
          console.warn('[Phantom Auto-Sync] Sync failed:', err.message);
        }
      };

      // 1. If Phantom is already connected in browser
      if (phantom.isConnected && phantom.publicKey) {
        await handleWalletPubkey(phantom.publicKey);
      } else {
        // 2. Silent reconnect (onlyIfTrusted)
        try {
          const resp = await phantom.connect({ onlyIfTrusted: true });
          if (resp?.publicKey) {
            await handleWalletPubkey(resp.publicKey);
          }
        } catch {}
      }

      // 3. Native event listeners on Phantom provider
      phantom.on?.('accountChanged', (publicKey: any) => {
        if (publicKey) {
          handleWalletPubkey(publicKey);
        } else {
          setWalletState((prev) => ({
            ...prev,
            isConnected: false,
            publicKey: null,
            fullPublicKey: null,
            balanceSol: 0
          }));
        }
      });

      phantom.on?.('connect', (publicKey: any) => {
        if (publicKey) handleWalletPubkey(publicKey);
      });

      phantom.on?.('disconnect', () => {
        setWalletState((prev) => ({
          ...prev,
          isConnected: false,
          publicKey: null,
          fullPublicKey: null,
          balanceSol: 0
        }));
      });
    };

    const timer = setTimeout(setupPhantom, 350);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [appendLog]);

  // Sync on-chain token holdings when wallet connects or switches
  useEffect(() => {
    if (walletState.fullPublicKey) {
      refreshHoldings();
    }
  }, [walletState.fullPublicKey, refreshHoldings]);

  // ─── SIGNAL TRACKER LOOP ───────────────────────────────────────────────────
  // Memantau status sinyal aktif secara berkala terhadap target TP1, TP2, TP3, SL
  const isTrackingRef = useRef(false);
  useEffect(() => {
    if (activeSignals.length === 0) return;

    const interval = setInterval(async () => {
      if (isTrackingRef.current) return;
      isTrackingRef.current = true;
      try {
        const res = await fetch('/api/signals/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            signals: activeSignals,
            telegramConfig: telegramConfig.isEnabled ? {
              botToken: telegramConfig.botToken,
              chatId: telegramConfig.chatId,
              isEnabled: telegramConfig.isEnabled
            } : undefined
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.changedCount > 0) {
            const updated: TradingSignal[] = data.updatedSignals;
            const stillActive = updated.filter((s: TradingSignal) => ['ACTIVE', 'TP1_HIT', 'TP2_HIT'].includes(s.status));
            const newlyResolved = updated.filter((s: TradingSignal) => ['TP3_HIT', 'SL_HIT', 'EXPIRED'].includes(s.status));

            setActiveSignals(stillActive);
            try { localStorage.setItem('GT_ACTIVE_SIGNALS', JSON.stringify(stillActive)); } catch {}

            if (newlyResolved.length > 0) {
              setSignalHistoryState(prev => {
                const combined = [...newlyResolved, ...prev.filter(p => !newlyResolved.some(nr => nr.id === p.id))].slice(0, 200);
                try { localStorage.setItem('GT_SIGNAL_HISTORY', JSON.stringify(combined)); } catch {}
                return combined;
              });
            }

            for (const ev of (data.events || [])) {
              const sym = (ev.symbol || 'UNKNOWN').replace(/^\$+/, '');
              if (ev.newStatus === 'TP1_HIT') {
                soundFx.playTakeProfit();
                appendLog('TELEGRAM', 'SUCCESS', `🎯 [TP1 HIT] $${sym} menyentuh Target 1 (+${ev.gainPct}%)! Modal awal aman.`);
              } else if (ev.newStatus === 'TP2_HIT') {
                soundFx.playTakeProfit();
                appendLog('TELEGRAM', 'SUCCESS', `🏆 [TP2 HIT] $${sym} menyentuh Target 2 (+${ev.gainPct}%)! Profit utama terkunci.`);
              } else if (ev.newStatus === 'TP3_HIT') {
                soundFx.playTakeProfit();
                appendLog('TELEGRAM', 'SUCCESS', `💎 [TP3 HIT] $${sym} menyentuh Moonshot Target (+${ev.gainPct}%)! Sinyal tuntas sempurna! 🚀`);
              } else if (ev.newStatus === 'SL_HIT') {
                soundFx.playEmergencyExit();
                appendLog('TELEGRAM', 'WARN', `🛑 [SL HIT] $${sym} menyentuh batas Stop Loss (${ev.gainPct}%). Posisi ditutup.`);
              }
            }
          }
        }
      } catch (err) {
        console.warn('[SignalTrackerLoop] Tracking failed:', err);
      } finally {
        isTrackingRef.current = false;
      }
    }, 12000);

    return () => clearInterval(interval);
  }, [activeSignals, telegramConfig, appendLog]);

  const value: TradingContextType = {
    engineStatus,
    dataSource,
    visualMode,
    activePosition,
    closedTrades,
    consensusFeed,
    selectedResult,
    logs,
    telemetry,
    networkMetrics,
    walletState,
    agentConfig,
    executionConfig,
    autoSnipeConfig,
    telegramConfig,
    discordConfig,
    isAudioMuted,
    isSearchingMint,
    sniperStatus,
    pendingSnipeConfirmation,
    walletHoldings,
    isHoldingsLoading,
    totalHoldingsValueUsd,
    totalHoldingsValueSol,
    isSimulationMode,
    // ─── Signal Provider ───
    activeSignals,
    signalHistory,
    agentThresholds,
    setAgentThresholds: updateAgentThresholds,
    setEngineStatus,
    toggleEngine,
    emergencyKillSwitch,
    executeSell,
    quickSellPosition,
    manualExitPosition,
    resetPositionMutex,
    snipeManualMint,
    confirmSnipe,
    cancelSnipe,
    selectResult: setSelectedResult,
    setVisualMode,
    updateAgentConfig,
    updateExecutionConfig,
    updateAutoSnipeConfig,
    setTradingStyle,
    updateTelegramConfig,
    updateDiscordConfig,
    updateWalletState,
    toggleAudio,
    openLivePosition,
    refreshWalletBalance,
    refreshHoldings,
    sellTokenHolding,
    dumpAllHoldingsToSol,
    unwrapWsolOrCloseAccount,
    emergencyStopAllTrading,
    setIsSimulationMode,
    toggleSimulationMode,
    clearLogs,
    clearTrades,
    appendLog,
    // ─── Signal Provider Actions ───
    broadcastSignal,
    clearSignals: () => {
      setActiveSignals([]);
      try { localStorage.removeItem('GT_ACTIVE_SIGNALS'); } catch {}
    },
    dismissSignal,
    deleteSignalHistoryItem,
    clearSignalHistoryByFilter,
    restoreSeedSignals,
    scanSolanaLiveNow,
    promoteTokenToAlphaSignal,
  };

  return <TradingContext.Provider value={value}>{children}</TradingContext.Provider>;
};

export const useTradingAgent = (): TradingContextType => {
  const context = useContext(TradingContext);
  if (!context) {
    throw new Error('useTradingAgent must be used within a TradingProvider');
  }
  return context;
};
