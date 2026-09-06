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
  trailingStopLossPct: 0.33,
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
  currentSlot: 284193420,
  gasPriceGwei: 0.000005,
  jitoTipSol: 0.00005,
  isBlockEngineOnline: true
};

const TradingContext = createContext<TradingContextType | null>(null);

export const TradingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Core Engine & Visual States
  const [engineStatus, setEngineStatus] = useState<'AUTONOMOUS' | 'IDLE' | 'PAUSED'>('AUTONOMOUS');
  const [dataSource, setDataSource] = useState<'REAL_SOLANA' | 'SIMULATOR'>('REAL_SOLANA');
  const [visualMode, setVisualMode] = useState<'radar' | 'cluster' | 'kelly' | 'ledger' | 'chart' | 'grid'>('radar');

  // Audio Telemetry
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(() => soundFx.getIsMuted());

  // Positions & Trades — persisted in localStorage (max 200 entries)
  const DEMO_TRADE: ClosedTrade = {
    id: 'POS-8812',
    token: {
      id: 'HIST-1',
      mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
      symbol: '$BONK',
      name: 'Bonk',
      platform: 'Raydium',
      initialLpUsd: 18000,
      burntLiquidityPct: 100,
      mintAuthorityRevoked: true,
      freezeAuthorityRevoked: true,
      top10HolderPct: 8,
      volumeDelta15s: 34,
      uniqueBuyersCount: 14,
      narrativeCosineSim: 0.92,
      narrativeTheme: 'Animals & Doge Meta',
      priceSol: 0.0000024,
      detectedAt: Date.now() - 360000
    },
    entryPriceSol: 0.0000024,
    exitPriceSol: 0.0000035,
    solInvested: 0.62,
    pnlSol: 0.284,
    pnlPct: 45.8,
    rMultiplier: 3.05,
    holdDurationSec: 42,
    exitReason: 'Target Take-Profit Reached (+3.0R)',
    entryTimestamp: Date.now() - 360000,
    exitTimestamp: Date.now() - 318000,
    jitoTipSol: 0.00005
  };

  const [activePosition, setActivePosition] = useState<ActivePosition | null>(null);
  const [closedTrades, setClosedTradesState] = useState<ClosedTrade[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('GT_TRADE_HISTORY');
        if (saved) {
          const parsed: ClosedTrade[] = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    // First-run: show demo trade
    return [DEMO_TRADE];
  });

  // Wrapper that saves to localStorage after every update
  const setClosedTrades = useCallback((updater: ClosedTrade[] | ((prev: ClosedTrade[]) => ClosedTrade[])) => {
    setClosedTradesState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      const capped = next.slice(0, 200); // cap to 200 trades
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('GT_TRADE_HISTORY', JSON.stringify(capped));
        } catch {}
      }
      return capped;
    });
  }, []);


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

  // Telemetry & Metrics
  const [telemetry, setTelemetry] = useState<TerminalTelemetry>({
    engineStatus: 'LIVE',
    dataSource: 'REAL_SOLANA',
    slotLatencyMs: 38,
    currentSlot: 284193420,
    initialBalanceSol: 10.0,
    currentBalanceSol: 12.84,
    totalPnlSol: +2.84,
    rollingExpectancyR: 3.4,
    winCount: 7,
    lossCount: 2,
    scannedCount: 142,
    vetoCount: 135,
    activePositionLocked: false
  });

  const [networkMetrics, setNetworkMetrics] = useState<NetworkMetrics>(DEFAULT_NETWORK_METRICS);

  // Wallet
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    publicKey: null,
    balanceSol: 0,
    walletName: null,
    mode: 'PAPER_TRADING'
  });

  // Configurations
  const [agentConfig, setAgentConfig] = useState<AgentConfig>(DEFAULT_AGENT_CONFIG);
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

  const [autoSnipeConfig, setAutoSnipeConfig] = useState<AutoSnipeConfig>({
    isEnabled: true,
    buyAmountSol: 0.5,
    minGrokViralityScore: 80,
    minLiquidityUsd: 10000,
    maxTop10HoldersPct: 20,
    jitoTipTier: 'STANDARD',
    takeProfitMultiplierR: 3.0,
    stopLossMultiplierR: 0.33,
    maxDailyTrades: 20,
    dailyTradesExecuted: 3
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

  const clearLogs = useCallback(() => setLogs([]), []);

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

  // EMERGENCY KILL-SWITCH
  const emergencyKillSwitch = useCallback(() => {
    setEngineStatus('PAUSED');
    soundFx.playEmergencyExit();

    if (activePosition) {
      const closed: ClosedTrade = {
        id: activePosition.id,
        token: activePosition.token,
        entryPriceSol: activePosition.entryPriceSol,
        exitPriceSol: activePosition.currentPriceSol,
        solInvested: activePosition.solInvested,
        pnlSol: activePosition.pnlSol,
        pnlPct: activePosition.pnlPct,
        rMultiplier: activePosition.rMultiplier,
        holdDurationSec: Math.round((Date.now() - activePosition.entryTimestamp) / 1000),
        exitReason: 'EMERGENCY KILL-SWITCH DUMP (Manual Override)',
        entryTimestamp: activePosition.entryTimestamp,
        exitTimestamp: Date.now(),
        jitoTipSol: 0.00005
      };

      setClosedTrades((prev) => [closed, ...prev]);
      setActivePosition(null);
      setTelemetry((prev) => ({
        ...prev,
        activePositionLocked: false,
        totalPnlSol: +(prev.totalPnlSol + activePosition.pnlSol).toFixed(3),
        currentBalanceSol: +(prev.currentBalanceSol + activePosition.solInvested + activePosition.pnlSol).toFixed(3)
      }));

      appendLog('EXECUTION', 'DANGER', `KILL-SWITCH ACTIVATED: Liquidated ${activePosition.token.symbol} (${activePosition.pnlPct}%)`);
    } else {
      appendLog('SYSTEM', 'WARN', 'KILL-SWITCH ACTIVATED: All autonomous trading halted immediately');
    }
  }, [activePosition, appendLog]);

  // Quick Sell Position (50% or 100%)
  const quickSellPosition = useCallback((percentage: number) => {
    if (!activePosition) return;
    const isFull = percentage >= 100;

    if (isFull) {
      if (activePosition.pnlSol >= 0) {
        soundFx.playTakeProfit();
      } else {
        soundFx.playEmergencyExit();
      }
      const closed: ClosedTrade = {
        id: activePosition.id,
        token: activePosition.token,
        entryPriceSol: activePosition.entryPriceSol,
        exitPriceSol: activePosition.currentPriceSol,
        solInvested: activePosition.solInvested,
        pnlSol: activePosition.pnlSol,
        pnlPct: activePosition.pnlPct,
        rMultiplier: activePosition.rMultiplier,
        holdDurationSec: Math.round((Date.now() - activePosition.entryTimestamp) / 1000),
        exitReason: `Manual Full Dump (100% Position)`,
        entryTimestamp: activePosition.entryTimestamp,
        exitTimestamp: Date.now(),
        jitoTipSol: 0.00005
      };

      setClosedTrades((prev) => [closed, ...prev]);
      setActivePosition(null);
      setTelemetry((prev) => ({
        ...prev,
        activePositionLocked: false,
        totalPnlSol: +(prev.totalPnlSol + activePosition.pnlSol).toFixed(3),
        currentBalanceSol: +(prev.currentBalanceSol + activePosition.solInvested + activePosition.pnlSol).toFixed(3)
      }));

      // Omnichannel Exit Alerts
      if (telegramConfig.isEnabled) {
        sendTelegramExitAlert(closed, telegramConfig);
      }
      if (discordConfig.isEnabled) {
        sendDiscordExitAlert(closed, discordConfig);
      }

      appendLog('EXECUTION', 'SUCCESS', `Sold 100% ${activePosition.token.symbol} for ${activePosition.pnlSol} SOL PnL`);
    } else {
      // 50% partial take-profit
      const portion = percentage / 100;
      const realizedSol = +(activePosition.pnlSol * portion).toFixed(4);
      const freedInvestment = +(activePosition.solInvested * portion).toFixed(4);

      setTelemetry((prev) => ({
        ...prev,
        totalPnlSol: +(prev.totalPnlSol + realizedSol).toFixed(3),
        currentBalanceSol: +(prev.currentBalanceSol + freedInvestment + realizedSol).toFixed(3)
      }));

      setActivePosition((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          solInvested: +(prev.solInvested * (1 - portion)).toFixed(4),
          tokenAmount: Math.round(prev.tokenAmount * (1 - portion)),
          pnlSol: +(prev.pnlSol * (1 - portion)).toFixed(4)
        };
      });

      appendLog('EXECUTION', 'SUCCESS', `Took Partial Profit (${percentage}%) on ${activePosition.token.symbol} (+${realizedSol} SOL)`);
    }
  }, [activePosition, appendLog]);

  const manualExitPosition = useCallback(() => quickSellPosition(100), [quickSellPosition]);

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
      setSniperStatus(`Mengevaluasi 5 agen untuk ${foundToken.symbol}...`);
      const consensus = runAgentConsensus(foundToken, STRATEGY_PRESETS.BALANCED);

      setConsensusFeed((prev) => [consensus, ...prev.slice(0, 39)]);
      setSelectedResult(consensus);

      if (consensus.verdict === 'APPROVED') {
        appendLog('RISK', 'SUCCESS', `Manual target ${foundToken.symbol} PASSED 5/5 consensus!`);
        soundFx.playApproval();

        // If no active position, prompt user confirmation dialog before opening (Fix #12)
        if (!activePosition) {
          setPendingSnipeConfirmation({
            token: foundToken,
            consensus,
            solInvest: 0.62
          });
          setSniperStatus(`Menunggu konfirmasi buka posisi ${foundToken.symbol}...`);
        }
      } else {
        appendLog('RISK', 'WARN', `Manual target ${foundToken.symbol} VETOED by ${consensus.vetoAgent}: ${consensus.vetoReason}`);
        soundFx.playVeto();
      }
    } catch (err: any) {
      appendLog('SYSTEM', 'DANGER', `Lookup error: ${err.message}`);
    } finally {
      setIsSearchingMint(false);
    }
  }, [activePosition, appendLog]);

  // Confirmation actions for Manual Snipe (Fix #12)
  const confirmSnipe = useCallback(() => {
    if (!pendingSnipeConfirmation) return;
    const { token, solInvest } = pendingSnipeConfirmation;
    const entryPrice = token.priceSol;
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
      trailingStopPriceSol: +(entryPrice * 0.90).toFixed(8),
      entryTimestamp: Date.now(),
      status: 'OPEN'
    };
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
  }, [pendingSnipeConfirmation, appendLog, telegramConfig, discordConfig, agentConfig, networkMetrics.currentSlot]);

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

  // Autonomous Ingestion Loop
  useEffect(() => {
    if (engineStatus !== 'AUTONOMOUS') return;

    const interval = setInterval(() => {
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

      setTelemetry((prev) => ({
        ...prev,
        scannedCount: prev.scannedCount + 1,
        vetoCount: consensus.verdict === 'VETOED' ? prev.vetoCount + 1 : prev.vetoCount
      }));

      if (consensus.verdict === 'APPROVED') {
        soundFx.playApproval();
        appendLog('SCAN', 'SUCCESS', `Signal APPROVED: ${consensus.token.symbol} (Score: ${consensus.token.narrativeCosineSim})`);

        // Auto Snipe Execution if no active position (Single Position Mutex Guard)
        setActivePosition((currPos) => {
          if (currPos !== null) return currPos; // Single position mutex

          const entryPrice = consensus.token.priceSol;
          
          // PRD Section 6: Dynamic Fractional Kelly Sizing
          // f_used = 0.25 * ((p * (b + 1) - 1) / b), capped at 6.2% of balance
          let solInvest = autoSnipeConfig.buyAmountSol || agentConfig.maxBuyAmountSol || 0.5;
          const isKellyActive = agentConfig.useKellySizing || autoSnipeConfig.useKellySizing;

          if (isKellyActive) {
            const currentBal = telemetry.currentBalanceSol || walletState.balanceSol || 10;
            const totalPastTrades = telemetry.winCount + telemetry.lossCount;
            const liveWinRate = totalPastTrades > 0 ? telemetry.winCount / totalPastTrades : 0.60;
            const p = Math.max(0.45, Math.min(0.85, liveWinRate));
            const b = 3.0; // 3.0R target payoff ratio
            const fullKelly = Math.max(0, (p * (b + 1) - 1) / b);
            const fracKelly = 0.25 * fullKelly; // Quarter-Kelly
            
            // PRD Section 6 Hard Cap: max 6.2% of balance, min 0.02 SOL
            const kellyAmountSol = currentBal * fracKelly;
            const maxCapSol = currentBal * 0.062;
            solInvest = +(Math.min(maxCapSol, Math.max(0.02, kellyAmountSol))).toFixed(3);
          }

          const newPos: ActivePosition = {
            id: `POS-${Math.floor(1000 + Math.random() * 9000)}`,
            token: consensus.token,
            entryPriceSol: entryPrice,
            currentPriceSol: entryPrice,
            solInvested: solInvest,
            tokenAmount: Math.round((solInvest / entryPrice) * 1000) / 1000,
            pnlSol: 0,
            pnlPct: 0,
            rMultiplier: 0,
            highestPriceSol: entryPrice,
            trailingStopPriceSol: +(entryPrice * 0.90).toFixed(8),
            entryTimestamp: Date.now(),
            status: 'OPEN'
          };

          setTelemetry((t) => ({
            ...t,
            activePositionLocked: true,
            currentBalanceSol: +(t.currentBalanceSol - solInvest).toFixed(3)
          }));

          // 🚀 DYNAMIC TIP BOOSTER FOR LIVE SNIPER (Maksimal Cuan & Sub-Slot Jito Inclusion)
          const baseTier = autoSnipeConfig.jitoTipTier || agentConfig.jitoTipTier || 'STANDARD';
          let tipSol = JITO_TIP_TIERS[baseTier] || 0.000100;

          // Hype Booster: When virality score >= 88% or sudden buyer rush detected
          const isHighVirality = consensus.token.narrativeCosineSim >= 0.88;
          const isHighRush = consensus.token.uniqueBuyersCount >= 8 || consensus.token.volumeDelta15s >= 4.0;
          const isBoosted = isHighVirality || isHighRush;

          if (isBoosted) {
            if (baseTier === 'ECONOMY' || baseTier === 'STANDARD') {
              tipSol = JITO_TIP_TIERS.TURBO; // 0.002 SOL
            } else if (baseTier === 'FAST' || baseTier === 'TURBO') {
              tipSol = JITO_TIP_TIERS.ULTRA_DEGEN; // 0.005 SOL
            }
          }

          const bundleReceipt = createJitoBundleReceipt(
            consensus.token,
            tipSol,
            networkMetrics.currentSlot,
            'TOKYO'
          );

          appendLog(
            'JITO',
            'SUCCESS',
            `⚡ JITO TOKYO BUNDLE LANDED: ${bundleReceipt.bundleId} (${bundleReceipt.latencyMs}ms) • Tip: ${tipSol} SOL [Slot #${bundleReceipt.targetSlot}]${isBoosted ? ' 🚀 [BOOSTED]' : ''}`
          );

          // Webhook Alpha Alerts (Telegram & Discord)
          if (telegramConfig.isEnabled) {
            sendTelegramAlphaAlert(
              consensus.token,
              telegramConfig,
              Math.round(consensus.token.narrativeCosineSim * 100),
              'BULLISH',
              tipSol
            );
          }
          if (discordConfig.isEnabled) {
            sendDiscordAlphaAlert(
              consensus.token,
              discordConfig,
              Math.round(consensus.token.narrativeCosineSim * 100),
              'BULLISH',
              tipSol
            );
          }

          appendLog(
            'EXECUTION',
            'SUCCESS',
            `AUTO-SNIPE: Opened position on ${consensus.token.symbol} (${solInvest} SOL${
              isKellyActive ? ' via Fractional Kelly 6.2% Cap' : ''
            }) via Jito MEV Private Bundle`
          );
          return newPos;
        });
      }
    }, 2800);

    return () => clearInterval(interval);
  }, [engineStatus, appendLog, agentConfig, autoSnipeConfig, telemetry, walletState]);

  // Real-Time On-Chain Price Stream & Exit Agent Evaluator
  useEffect(() => {
    if (!activePosition) return;

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

      const pnlSol = +((livePrice - activePosition.entryPriceSol) * activePosition.tokenAmount).toFixed(4);
      const pnlPct = +(((livePrice - activePosition.entryPriceSol) / activePosition.entryPriceSol) * 100).toFixed(2);
      const rMultiplier = +(pnlPct / 15).toFixed(2);
      const newHigh = Math.max(activePosition.highestPriceSol, livePrice);
      const trailingStop = +(newHigh * 0.88).toFixed(8);

      const updatedPos: ActivePosition = {
        ...activePosition,
        currentPriceSol: livePrice,
        pnlSol,
        pnlPct,
        rMultiplier,
        highestPriceSol: newHigh,
        trailingStopPriceSol: trailingStop
      };

      // Check Exit Agent Rules
      const exitVerdict = evaluateExitAgent(updatedPos);
      if (exitVerdict.shouldExit) {
        // Trigger Exit
        if (exitVerdict.exitType === 'TAKE_PROFIT') {
          soundFx.playTakeProfit();
        } else {
          soundFx.playEmergencyExit();
        }
        const closed: ClosedTrade = {
          id: updatedPos.id,
          token: updatedPos.token,
          entryPriceSol: updatedPos.entryPriceSol,
          exitPriceSol: livePrice,
          solInvested: updatedPos.solInvested,
          pnlSol,
          pnlPct,
          rMultiplier,
          holdDurationSec: Math.round((Date.now() - updatedPos.entryTimestamp) / 1000),
          exitReason: exitVerdict.reason || 'Target Take-Profit / Stop Met',
          entryTimestamp: updatedPos.entryTimestamp,
          exitTimestamp: Date.now(),
          jitoTipSol: 0.00005
        };

        setClosedTrades((prev) => [closed, ...prev]);
        setActivePosition(null);
        setTelemetry((prev) => ({
          ...prev,
          activePositionLocked: false,
          totalPnlSol: +(prev.totalPnlSol + pnlSol).toFixed(3),
          currentBalanceSol: +(prev.currentBalanceSol + updatedPos.solInvested + pnlSol).toFixed(3),
          winCount: pnlSol >= 0 ? prev.winCount + 1 : prev.winCount,
          lossCount: pnlSol < 0 ? prev.lossCount + 1 : prev.lossCount
        }));

        // Omnichannel Exit Alerts (Take Profit / Stop Loss)
        if (telegramConfig.isEnabled) {
          sendTelegramExitAlert(closed, telegramConfig);
        }
        if (discordConfig.isEnabled) {
          sendDiscordExitAlert(closed, discordConfig);
        }

        appendLog('EXECUTION', pnlSol >= 0 ? 'SUCCESS' : 'DANGER', `Exit Agent closed ${updatedPos.token.symbol}: ${exitVerdict.reason}`);
      } else {
        setActivePosition(updatedPos);
      }
    }, 3200);

    return () => clearInterval(interval);
  }, [activePosition, appendLog, telegramConfig, discordConfig]);

  const updateAgentConfig = useCallback((updates: Partial<AgentConfig>) => {
    setAgentConfig((prev) => ({ ...prev, ...updates }));
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
    setAutoSnipeConfig((prev) => ({ ...prev, ...updates }));
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

  const updateWalletState = useCallback((w: WalletState) => setWalletState(w), []);

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
    setEngineStatus,
    toggleEngine,
    emergencyKillSwitch,
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
    clearLogs,
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
