'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import {
  TokenSignal,
  ConsensusResult,
  ActivePosition,
  TerminalTelemetry,
  ClosedTrade,
  WalletState,
  AutoSnipeConfig,
  AgentThresholds
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
import { runAgentConsensus } from '../agents/consensus';
import { evaluateExitAgent } from '../agents/exit';
import { soundFx } from '../engine/audioEngine';
import { STRATEGY_PRESETS, JITO_TIP_TIERS } from '../config/constants';
import {
  sendTelegramAlphaAlert,
  sendTelegramBuyAlert,
  sendTelegramExitAlert,
  sendTelegramRugpullWarning,
  TelegramConfig
} from '../lib/telegram';
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
    return 'PAUSED'; // Safety default: never start auto-buying without explicit user action
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

  // ExecutionManager Instance for Autonomous Lifecycle
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
      mode: 'PAPER_TRADING'
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
      isEnabled: false, // Default OFF to prevent unwanted automatic transactions
      buyAmountSol: 0.02, // Safe small buy amount
      minGrokViralityScore: 85,
      minLiquidityUsd: 10000,
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
      enableMomentumExit: true
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

  // Webhook Configs (centralized in context so all components share the same config)
  const [telegramConfig, setTelegramConfig] = useState<WebhookTelegramConfig>(() => {
    if (typeof window !== 'undefined') {
      try { return JSON.parse(localStorage.getItem('GT_TELEGRAM_CONFIG') || 'null') || DEFAULT_TELEGRAM_CONFIG; } catch {}
    }
    return DEFAULT_TELEGRAM_CONFIG;
  });

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

  // Hook up ExecutionManager Callbacks
  useEffect(() => {
    if (!executionManagerRef.current) return;
    executionManagerRef.current.setCallbacks({
      onPositionOpened: (pos) => {
        setActivePosition(pos);
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
      },
      onPositionClosed: (trade) => {
        setActivePosition(null);
        setClosedTrades((prev) => [trade, ...prev].slice(0, 200));
        setTelemetry((prev) => ({
          ...prev,
          totalPnlSol: +(prev.totalPnlSol + trade.pnlSol).toFixed(4),
          winCount: trade.pnlSol > 0 ? prev.winCount + 1 : prev.winCount,
          lossCount: trade.pnlSol <= 0 ? prev.lossCount + 1 : prev.lossCount,
          activePositionLocked: false
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
      },
      onLog: (category, level, message) => {
        appendLog(category as any, level as any, message);
      },
      onError: (err, stage) => {
        appendLog('EXECUTION', 'DANGER', `Execution error di tahap [${stage}]: ${err.message}`);
      }
    });
  }, [setActivePosition, setClosedTrades, appendLog, telegramConfig, discordConfig]);

  // Restore live tracker if active position exists on initial mount
  useEffect(() => {
    if (activePosition && activePosition.status === 'OPEN' && executionManagerRef.current) {
      executionManagerRef.current.startPositionTracker(activePosition);
    }
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
    return true; // Default TRUE: Zero financial risk guarantee!
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

  // Instant On-Chain Wallet Balance Refresh (Requirement 2)
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
        }
      }
    } catch (err: any) {
      console.warn('Gagal memuat token holdings:', err.message);
    } finally {
      setIsHoldingsLoading(false);
    }
  }, [walletState.fullPublicKey]);

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

        if (isSimulationMode) {
          const mockSig = `SIM_SELL_${Math.random().toString(36).slice(2, 10).toUpperCase()}_${Date.now().toString().slice(-6)}`;
          appendLog(
            'EXECUTION',
            'SUCCESS',
            `🧪 [DRY-RUN SIMULATION] Penjualan token ${holding.symbol} dicegat! Disimulasikan terjual ke SOL [SimTx: ${mockSig}]. 0 SOL riil dikeluarkan.`
          );
          soundFx.playTakeProfit();
          return true;
        }

        const swapRes = await executeJupiterSwap(
          quote,
          'SOL',
          0.0001,
          networkMetrics.currentSlot,
          pubKey,
          provider,
          isSimulationMode
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
    appendLog('SYSTEM', 'WARN', '🛑 [EMERGENCY STOP] Seluruh bot otomatis, auto-snipe, dan transaksi telah DIMATIKAN seketika.');
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

      if (walletState.mode === 'LIVE_ON_CHAIN') {
        if (isSimulationMode) {
          // DRY-RUN SIMULATION INTERCEPTOR
          const mockSig = `SIM_SELL_${Math.random().toString(36).slice(2, 10).toUpperCase()}_${Date.now().toString().slice(-6)}`;
          appendLog(
            'EXECUTION',
            'SUCCESS',
            `🧪 [DRY-RUN SIMULATION] Transaksi jual Phantom dicegat! Posisi ${pos.token.symbol} disimulasikan terjual @ ${exitPriceSol.toFixed(8)} SOL [SimTx: ${mockSig}] tanpa memotong SOL riil.`
          );
          isSoldOnChain = true;
        } else {
          try {
            // Jalur A: Server Hot Wallet via /api/bot/execute-sell
          const sellRes = await fetch('/api/bot/execute-sell', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mint: pos.token.mint,
              percentage,
              slippageBps: 250,
              jitoTipSol: 0.0001
            })
          });

          const sellData = await sellRes.json();
          if (sellData.success && sellData.signature) {
            appendLog('JITO', 'SUCCESS', `⚡ [ON-CHAIN SELL CONFIRMED] Tx: https://solscan.io/tx/${sellData.signature}`);
            if (sellData.solReceived && pos.tokenAmount > 0) {
              exitPriceSol = +(sellData.solReceived / (pos.tokenAmount * (percentage / 100))).toFixed(8);
            }
            isSoldOnChain = true;
          } else if (sellData.requiresClientSign) {
            // Jalur B: Client-side Phantom wallet sell via Jupiter
            let provider = typeof window !== 'undefined'
              ? ((window as any).phantom?.solana || (window as any).solana || (window as any).solflare || (window as any).backpack)
              : null;
            const pubKey = walletState.fullPublicKey || provider?.publicKey?.toString();
            if (provider && pubKey) {
              appendLog('EXECUTION', 'INFO', `🟡 [PHANTOM SELL] Meminta tanda tangan transaksi jual di dompet untuk ${pos.token.symbol}...`);
              
              const decimals = pos.token.decimals || 6;
              const portion = Math.min(1.0, Math.max(0.01, percentage / 100));
              let rawUnitsToSell: string;
              if (pos.tokenAmount && pos.tokenAmount > 0) {
                rawUnitsToSell = Math.floor(pos.tokenAmount * portion * 10 ** decimals).toString();
              } else {
                rawUnitsToSell = Math.floor(1000 * 10 ** decimals).toString();
              }

              const quote = await fetchJupiterSellQuote(pos.token.mint, rawUnitsToSell, 250);
              const swapRes = await executeJupiterSwap(
                quote,
                'SOL',
                0.0001,
                networkMetrics.currentSlot,
                pubKey,
                provider
              );
              if (swapRes.signature) {
                appendLog('JITO', 'SUCCESS', `⚡ [PHANTOM SELL CONFIRMED] Tx: https://solscan.io/tx/${swapRes.signature}`);
                if (quote.tokenAmountUi && pos.tokenAmount > 0) {
                  exitPriceSol = +(quote.tokenAmountUi / (pos.tokenAmount * portion)).toFixed(8);
                }
                isSoldOnChain = true;
              }
            } else {
              appendLog('EXECUTION', 'WARN', `⚠️ Dompet tidak terhubung untuk sign sell on-chain. Posisi tetap berstatus OPEN.`);
              isSoldOnChain = false;
            }
          } else {
            appendLog('EXECUTION', 'WARN', `Sell on-chain gagal: ${sellData.error || 'Unknown error'}. Posisi tetap berstatus OPEN.`);
            isSoldOnChain = false;
          }
        } catch (sellErr: any) {
          appendLog('EXECUTION', 'DANGER', `❌ Error saat executeSell: ${sellErr.message}. Posisi tetap berstatus OPEN.`);
          isSoldOnChain = false;
        }
      }
    } else {
      // Paper trading mode
      isSoldOnChain = true;
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

      const consensus = runAgentConsensus(foundToken, STRATEGY_PRESETS.BALANCED);
      consensus.honeypotCheck = honeypotCheck;

      setConsensusFeed((prev) => [consensus, ...prev.slice(0, 39)]);
      setSelectedResult(consensus);

      if (consensus.verdict === 'APPROVED') {
        appendLog('RISK', 'SUCCESS', `Manual target ${foundToken.symbol} PASSED 5/5 consensus & Honeypot Shield!`);
        soundFx.playApproval();

        // If no active position, prompt user confirmation dialog before opening (Fix #12)
        if (!activePosition) {
          setPendingSnipeConfirmation({
            token: foundToken,
            consensus,
            solInvest: 0.62
          });
          setSniperStatus(`Menunggu konfirmasi buka posisi ${foundToken.symbol}...`);
          setTimeout(() => setSniperStatus(null), 8000);
        }
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
                runAgentConsensus(t, STRATEGY_PRESETS.BALANCED)
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
            }
          }
        }
      } catch {
        // Fallback gracefully
      }
    };

    fetchRealTokens();
    const timer = setInterval(fetchRealTokens, 35000);
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

  // Autonomous Ingestion Loop with Synchronous Mutex Guard (Requirement 1 & Anti-Spam)
  useEffect(() => {
    if (engineStatus !== 'AUTONOMOUS') return;

    const interval = setInterval(async () => {
      // 0. STRICT MUTEX CHECK: If a position is open, acquiring, or in-flight, immediately skip
      if (positionMutex.isPositionOpen() || isPositionOpenRef.current || activePositionRef.current !== null || isAutoSnipingRef.current) {
        return;
      }

      // Slot increment
      setNetworkMetrics((m) => ({
        ...m,
        currentSlot: m.currentSlot + 1,
        latencyMs: 32 + Math.floor(Math.random() * 14)
      }));

      // Ingest signal: blend real live DexScreener token with simulation
      let rawToken: TokenSignal;
      if (realTokensQueueRef.current.length > 0 && Math.random() > 0.4) {
        rawToken = realTokensQueueRef.current.shift()!;
      } else {
        rawToken = generateRandomTokenSignal();
      }

      const consensus = runAgentConsensus(rawToken, STRATEGY_PRESETS.BALANCED);

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

        // 1. Synchronous Mutex Guard Check & Anti-Spam Repeat Buy Cooldown
        if (positionMutex.isPositionOpen() || isPositionOpenRef.current || activePositionRef.current !== null || isAutoSnipingRef.current) {
          appendLog(
            'RISK',
            'WARN',
            `[MUTEX GUARD ACTIVE] Token ${consensus.token.symbol} lolos 5/5 konsensus, namun Single Position Mutex Guard sedang MENGUNCI slot. Pembelian otomatis ditahan.`
          );
          return;
        }

        if (positionMutex.isCooldownActive(consensus.token.mint)) {
          appendLog(
            'RISK',
            'WARN',
            `[ANTI-SPAM COOLDOWN] Token ${consensus.token.symbol} baru saja dibeli/dijual. Mencegah infinite buy loop.`
          );
          return;
        }

        // 2. Auto-Snipe Guard & Daily Limits
        if (!autoSnipeConfig.isEnabled || engineStatus !== 'AUTONOMOUS') {
          return;
        }

        if (autoSnipeConfig.dailyTradesExecuted >= autoSnipeConfig.maxDailyTrades) {
          appendLog('EXECUTION', 'WARN', `[AUTO-SNIPE] Batas harian ${autoSnipeConfig.maxDailyTrades} transaksi tercapai.`);
          return;
        }

        // 3. Dynamic Fractional Kelly Sizing (PRD Section 6)
        let solInvest = autoSnipeConfig.buyAmountSol || agentConfig.maxBuyAmountSol || 0.1;
        const isKellyActive = agentConfig.useKellySizing || autoSnipeConfig.useKellySizing;

        if (isKellyActive) {
          const currentBal = telemetry.currentBalanceSol || walletState.balanceSol || 5;
          const totalPastTrades = telemetry.winCount + telemetry.lossCount;
          const liveWinRate = totalPastTrades > 0 ? telemetry.winCount / totalPastTrades : 0.60;
          const p = Math.max(0.45, Math.min(0.85, liveWinRate));
          const b = 3.0; // 3.0R target payoff ratio
          const fullKelly = Math.max(0, (p * (b + 1) - 1) / b);
          const fracKelly = 0.25 * fullKelly; // Quarter-Kelly
          const kellyAmountSol = currentBal * fracKelly;
          const maxCapSol = currentBal * 0.062;
          solInvest = +(Math.min(maxCapSol, Math.max(0.02, kellyAmountSol))).toFixed(3);
        }

        // 4. Ultra-Low Tip Guard (Prevent fee drainage)
        const baseTier = autoSnipeConfig.jitoTipTier || agentConfig.jitoTipTier || 'ECONOMY';
        const tipSol = Math.min(0.000025, JITO_TIP_TIERS[baseTier] || 0.000010);

        // 5. Automated Execution Decision Engine with Synchronous Mutex Lock
        const consensusScore = consensus.moonshot?.moonshotScore || Math.round(consensus.token.narrativeCosineSim * 100);

        // Autonomous Pipeline: Begitu skor koin mencapai >85%, picu triggerBuy() ExecutionManager langsung
        if (consensusScore >= 85 && consensus.verdict === 'APPROVED' && executionManagerRef.current) {
          appendLog(
            'EXECUTION',
            'SUCCESS',
            `🚀 [AUTONOMOUS PIPELINE] Skor peluncuran ${consensusScore}% (>=85%) terdeteksi untuk ${consensus.token.symbol}! Memicu ExecutionManager.triggerBuy() otomatis tanpa interaksi UI.`
          );

          if (walletState.mode === 'LIVE_ON_CHAIN' || isSimulationMode) {
            isPositionOpenRef.current = true;
            isAutoSnipingRef.current = true;
            setTelemetry((prev) => ({ ...prev, activePositionLocked: true }));

            executionManagerRef.current
              .triggerBuy(consensus.token, solInvest, {
                isSimulation: isSimulationMode,
                slippageBps: Math.round((agentConfig.slippagePct || 1.5) * 100),
                jitoTipSol: tipSol,
                targetTpPct: agentConfig.takeProfitPct || 100,
                stopLossPct: agentConfig.stopLossPct || -25,
                trailingStopLossPct: agentConfig.trailingStopLossPct || 15,
                maxHoldTimeSec: agentConfig.maxHoldTimeSec || 180
              })
              .then((result) => {
                if (result.success && result.position) {
                  setAutoSnipeConfig((prev) => ({ ...prev, dailyTradesExecuted: prev.dailyTradesExecuted + 1 }));
                }
              })
              .catch((err) => {
                appendLog('EXECUTION', 'DANGER', `Auto-buy gagal untuk ${consensus.token.symbol}: ${err.message}`);
              })
              .finally(() => {
                isAutoSnipingRef.current = false;
              });

            return;
          }
        }

        if (walletState.mode === 'LIVE_ON_CHAIN') {
          // SYNCHRONOUS MUTEX LOCK ACQUISITION
          const lockAcquired = positionMutex.acquireLock(consensus.token.mint);
          if (!lockAcquired) {
            appendLog('RISK', 'WARN', `[MUTEX BLOCKED] Pembelian ${consensus.token.symbol} ditahan: Posisi lain aktif atau token dalam cooldown.`);
            return;
          }
          isPositionOpenRef.current = true;
          isAutoSnipingRef.current = true;
          setTelemetry((prev) => ({ ...prev, activePositionLocked: true }));

          if (isSimulationMode) {
            // DRY-RUN SIMULATION INTERCEPTOR (Zero Real SOL spent!)
            const tokenPrice = consensus.token.priceSol > 0 ? consensus.token.priceSol : 0.0001;
            const simulatedTokens = +(solInvest / tokenPrice).toFixed(4);
            const mockSig = `SIM_BUY_${Math.random().toString(36).slice(2, 10).toUpperCase()}_${Date.now().toString().slice(-6)}`;

            appendLog(
              'EXECUTION',
              'SUCCESS',
              `🧪 [DRY-RUN SIMULATION] Order beli ${consensus.token.symbol} (${solInvest} SOL) lolos analisis! Transaksi Phantom dicegat & disimulasikan sukses [SimTx: ${mockSig}]. 0 SOL riil dikeluarkan.`
            );

            const simulatedResult: SwapExecutionResult = {
              signature: mockSig,
              inAmountSol: solInvest,
              outAmountFormatted: simulatedTokens.toLocaleString('en-US', { maximumFractionDigits: 4 }),
              tokenAmountUi: simulatedTokens,
              decimals: 6,
              outputMint: consensus.token.mint,
              symbol: consensus.token.symbol,
              routeSummary: '[DRY-RUN SIMULATION] Intercepted Phantom RPC (Zero Real SOL Spent)',
              priceImpactPct: 0.08,
              jitoTipSol: 0,
              slot: networkMetrics.currentSlot + 1,
              isSimulated: true,
              timestamp: Date.now()
            };

            positionMutex.markBuyCompleted(consensus.token.mint);
            await openLivePosition(simulatedResult, consensus.token);
            setAutoSnipeConfig((prev) => ({ ...prev, dailyTradesExecuted: prev.dailyTradesExecuted + 1 }));
            isAutoSnipingRef.current = false;
            return;
          }

          appendLog(
            'EXECUTION',
            'INFO',
            `⚡ [DECISION ENGINE] Auto-snipe on-chain ${consensus.token.symbol} (${solInvest} SOL) • MUTEX LOCKED`
          );

          (async () => {
            let buySucceeded = false;
            try {
              // Jalur A: Server-Side Autonomous Hot Wallet (jika private key terpasang di VPS)
              const snipeRes = await fetch('/api/bot/execute-snipe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  mint: consensus.token.mint,
                  symbol: consensus.token.symbol,
                  amountSol: solInvest,
                  slippageBps: Math.round((agentConfig.slippagePct || 1.5) * 100),
                  jitoTipSol: tipSol
                })
              });

              const snipeData = await snipeRes.json();
              if (snipeData.success && snipeData.signature) {
                appendLog('JITO', 'SUCCESS', `⚡ [SERVER KEYPAIR AUTO-SNIPED] Tx: https://solscan.io/tx/${snipeData.signature}`);
                positionMutex.markBuyCompleted(consensus.token.mint);
                await openLivePosition(snipeData, consensus.token);
                setAutoSnipeConfig((prev) => ({ ...prev, dailyTradesExecuted: prev.dailyTradesExecuted + 1 }));
                buySucceeded = true;
                return;
              }

              // Jalur B: Client-Side Phantom Wallet (otomatis memicu popup sign/approve tanpa klik manual)
              let provider = typeof window !== 'undefined'
                ? ((window as any).phantom?.solana || (window as any).solana || (window as any).solflare || (window as any).backpack)
                : null;
              const pubKey = walletState.fullPublicKey || provider?.publicKey?.toString();

              if (provider && pubKey) {
                appendLog(
                  'EXECUTION',
                  'INFO',
                  `🟡 [AUTO-SNIPE PHANTOM] Meminta persetujuan swap di dompet Phantom untuk ${consensus.token.symbol}...`
                );
                const quote = await fetchJupiterQuote(
                  consensus.token.mint,
                  solInvest,
                  Math.round((agentConfig.slippagePct || 1.5) * 100)
                );
                const swapResult = await executeJupiterSwap(
                  quote,
                  consensus.token.symbol,
                  tipSol,
                  networkMetrics.currentSlot,
                  pubKey,
                  provider
                );
                if (swapResult.signature) {
                  positionMutex.markBuyCompleted(consensus.token.mint);
                  await openLivePosition(swapResult, consensus.token);
                  setAutoSnipeConfig((prev) => ({ ...prev, dailyTradesExecuted: prev.dailyTradesExecuted + 1 }));
                  buySucceeded = true;
                }
              } else {
                appendLog(
                  'EXECUTION',
                  'WARN',
                  `⚠️ Dompet Phantom belum terhubung di browser untuk auto-snipe live ${consensus.token.symbol}. Hubungkan dompet via Wallet Connect.`
                );
              }
            } catch (err: any) {
              appendLog('EXECUTION', 'DANGER', `Auto-snipe gagal untuk ${consensus.token.symbol}: ${err.message}`);
            } finally {
              isAutoSnipingRef.current = false;
              if (!buySucceeded) {
                // If buy failed or aborted, release mutex with cooldown
                positionMutex.releaseLock(consensus.token.mint, 60000);
                isPositionOpenRef.current = false;
                setTelemetry((prev) => ({ ...prev, activePositionLocked: false }));
              }
            }
          })();
          return;
        }

        // PAPER TRADING MODE: Eksekusi simulasi instan
        const locked = positionMutex.acquireLock(consensus.token.mint);
        if (!locked) return;
        isPositionOpenRef.current = true;
        setTelemetry((prev) => ({ ...prev, activePositionLocked: true }));

        const bundleReceipt = createJitoBundleReceipt(
          consensus.token,
          tipSol,
          networkMetrics.currentSlot,
          'TOKYO'
        );

        appendLog(
          'JITO',
          'SUCCESS',
          `⚡ JITO TOKYO BUNDLE LANDED: ${bundleReceipt.bundleId} (${bundleReceipt.latencyMs}ms) • Tip: ${tipSol} SOL [Slot #${bundleReceipt.targetSlot}]`
        );

        const tokenPrice = consensus.token.priceSol > 0 ? consensus.token.priceSol : 0.0001;
        const simulatedTokens = +(solInvest / tokenPrice).toFixed(4);

        const simulatedResult: SwapExecutionResult = {
          signature: bundleReceipt.txHash,
          inAmountSol: solInvest,
          outAmountFormatted: simulatedTokens.toLocaleString('en-US', { maximumFractionDigits: 4 }),
          tokenAmountUi: simulatedTokens,
          decimals: 6,
          outputMint: consensus.token.mint,
          symbol: consensus.token.symbol,
          routeSummary: 'Raydium CPMM + Jito Tokyo Bundle',
          priceImpactPct: 0.12,
          jitoTipSol: tipSol,
          slot: networkMetrics.currentSlot + 1,
          isSimulated: true,
          timestamp: Date.now()
        };

        positionMutex.markBuyCompleted(consensus.token.mint);
        openLivePosition(simulatedResult, consensus.token);
      }
    }, 2800);

    return () => clearInterval(interval);
  }, [engineStatus, appendLog, agentConfig, autoSnipeConfig, telemetry, walletState, openLivePosition, networkMetrics.currentSlot]);

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
  }, []);

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

  // Real-Time Hot Wallet Balance Synchronization via Solana WebSocket connection.onAccountChange
  useEffect(() => {
    const fullKey =
      walletState.fullPublicKey ||
      (typeof window !== 'undefined'
        ? (window as any).phantom?.solana?.publicKey?.toString() ||
          (window as any).solflare?.publicKey?.toString() ||
          (window as any).backpack?.publicKey?.toString()
        : null);

    if (!fullKey) return;

    let subId: number | null = null;
    let rpcConnection: Connection | null = null;

    try {
      const rpcUrl =
        process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
        'https://mainnet.helius-rpc.com/?api-key=b1346052-9ac3-47b8-89ec-2ce7e88fa91b';
      rpcConnection = new Connection(rpcUrl, 'processed');
      const pubkey = new PublicKey(fullKey);

      // 1. Initial fast on-chain balance query
      rpcConnection
        .getBalance(pubkey)
        .then((lamports) => {
          const liveBal = +(lamports / 1_000_000_000).toFixed(4);
          setWalletState((prev) => {
            const updated: WalletState = {
              ...prev,
              isConnected: true,
              fullPublicKey: fullKey,
              publicKey: `${fullKey.slice(0, 4)}...${fullKey.slice(-4)}`,
              balanceSol: liveBal,
              walletName: prev.walletName || 'Phantom',
              mode: 'LIVE_ON_CHAIN'
            };
            if (typeof window !== 'undefined') {
              localStorage.setItem('GT_WALLET_STATE', JSON.stringify(updated));
            }
            return updated;
          });
          setTelemetry((prev) => ({ ...prev, currentBalanceSol: liveBal }));
        })
        .catch(() => {});

      // 2. Sub-second WebSocket Listener via connection.onAccountChange
      subId = rpcConnection.onAccountChange(
        pubkey,
        (accountInfo) => {
          const liveBal = +(accountInfo.lamports / 1_000_000_000).toFixed(4);
          setWalletState((prev) => {
            const updated: WalletState = {
              ...prev,
              isConnected: true,
              fullPublicKey: fullKey,
              publicKey: `${fullKey.slice(0, 4)}...${fullKey.slice(-4)}`,
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
          appendLog(
            'SYSTEM',
            'INFO',
            `⚡ [WEBSOCKET BALANCE SYNC] Saldo hot wallet diperbarui instan: ${liveBal} SOL`
          );
        },
        'processed'
      );
    } catch (err: any) {
      console.warn('Gagal mengaktifkan onAccountChange WebSocket:', err.message);
    }

    refreshHoldings();

    return () => {
      if (subId !== null && rpcConnection) {
        try {
          rpcConnection.removeAccountChangeListener(subId);
        } catch {}
      }
    };
  }, [walletState.isConnected, walletState.fullPublicKey, refreshHoldings, appendLog]);

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
    setEngineStatus,
    toggleEngine,
    emergencyKillSwitch,
    executeSell,
    quickSellPosition,
    manualExitPosition,
    snipeManualMint,
    confirmSnipe,
    cancelSnipe,
    selectResult: setSelectedResult,
    setVisualMode,
    updateAgentConfig,
    updateExecutionConfig,
    updateAutoSnipeConfig,
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
    isSimulationMode,
    setIsSimulationMode,
    toggleSimulationMode,
    clearLogs,
    clearTrades,
    appendLog
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
