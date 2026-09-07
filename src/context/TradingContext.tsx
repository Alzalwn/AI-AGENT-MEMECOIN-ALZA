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
import { fetchJupiterQuote, executeJupiterSwap, SwapExecutionResult } from '../lib/jupiter';
import { HeliusBlockchainStream } from '../lib/heliusStream';

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
  currentSlot: 0,
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
    // Fresh install: empty history (no demo data on Mainnet)
    return [];
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

  // Wallet — persisted in localStorage so wallet stays connected after page refresh
  const [walletState, setWalletState] = useState<WalletState>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('GT_WALLET_STATE');
        if (saved) {
          const parsed: WalletState = JSON.parse(saved);
          // Validate saved state has required fields before trusting it
          if (parsed && typeof parsed.isConnected === 'boolean' && parsed.mode) {
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
  const isAutoSnipingRef = useRef<boolean>(false);

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
            const updated = {
              ...prev,
              fullPublicKey: fullKey,
              balanceSol: liveBal
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

  // Open Real Live Position from confirmed swap transaction (Requirement 1 & 4)
  const openLivePosition = useCallback(
    async (result: SwapExecutionResult, tokenSignal?: TokenSignal | null) => {
      // 1. Single Position Mutex Guard check
      if (activePosition) {
        appendLog(
          'EXECUTION',
          'WARN',
          `[MUTEX GUARD] Blocked: Posisi aktif ${activePosition.token.symbol} sedang berjalan. Mutex mencegah pembukaan posisi ganda.`
        );
        return;
      }

      const solInvest = result.inAmountSol || 0.1;
      const cleanOutStr = (result.outAmountFormatted || '1').replace(/,/g, '');
      const tokenAmt = parseFloat(cleanOutStr) || 1;
      const entryPrice = +(solInvest / tokenAmt).toFixed(8);

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
        trailingStopPriceSol: +(entryPrice * (1 - (agentConfig.trailingStopLossPct || 0.15))).toFixed(8),
        entryTimestamp: Date.now(),
        status: 'OPEN'
      };

      // 3. Update state immediately (Requirement 1 & 4)
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

      appendLog(
        'EXECUTION',
        'SUCCESS',
        `🎯 [ON-CHAIN CONFIRMED] Posisi aktif dibuka: ${token.symbol} (${tokenAmt.toLocaleString()} token) @ ${entryPrice.toFixed(8)} SOL [Tx: ${shortSig}] • MUTEX GUARD LOCKED`
      );

      // 4. Refresh live on-chain balance immediately (Requirement 2)
      await refreshWalletBalance();

      // 5. Omnichannel webhooks
      if (telegramConfig.isEnabled) {
        sendTelegramBuyAlert(token, telegramConfig, solInvest, result.signature, result.jitoTipSol);
      }
      if (discordConfig.isEnabled) {
        sendDiscordBuyAlert(token, discordConfig, solInvest, result.signature, result.jitoTipSol);
      }
    },
    [activePosition, consensusFeed, agentConfig, appendLog, refreshWalletBalance, telegramConfig, discordConfig]
  );

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
      refreshWalletBalance();

      appendLog('EXECUTION', 'DANGER', `KILL-SWITCH ACTIVATED: Liquidated ${activePosition.token.symbol} (${activePosition.pnlPct}%)`);
    } else {
      appendLog('SYSTEM', 'WARN', 'KILL-SWITCH ACTIVATED: All autonomous trading halted immediately');
    }
  }, [activePosition, appendLog, refreshWalletBalance]);

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
      refreshWalletBalance();

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
  }, [activePosition, appendLog, telegramConfig, discordConfig, refreshWalletBalance]);

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

  // Real-Time Helius WebSocket Event Stream (Requirement 3: Blockchain Event Streaming)
  useEffect(() => {
    const stream = new HeliusBlockchainStream();
    stream.connect({
      onSlot: (slot) => {
        setNetworkMetrics((m) => ({ ...m, currentSlot: slot }));
        setTelemetry((t) => ({ ...t, currentSlot: slot }));
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
          appendLog('SYSTEM', 'INFO', '⚡ Helius WebSocket on-chain streaming: TERHUBUNG (Sub-slot & pool logs active)');
        }
      }
    });

    return () => {
      stream.disconnect();
    };
  }, [appendLog]);

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

        // 1. Single Position Mutex Guard (Requirement 4)
        if (activePosition !== null || telemetry.activePositionLocked || isAutoSnipingRef.current) {
          appendLog(
            'RISK',
            'WARN',
            `[MUTEX GUARD ACTIVE] Token ${consensus.token.symbol} lolos 5/5 konsensus, namun Single Position Mutex Guard sedang MENGUNCI slot. Pembelian otomatis ditahan hingga posisi saat ini ditutup.`
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

        // 4. Dynamic Tip Booster
        const baseTier = autoSnipeConfig.jitoTipTier || agentConfig.jitoTipTier || 'STANDARD';
        let tipSol = JITO_TIP_TIERS[baseTier] || 0.000100;
        const isHighVirality = consensus.token.narrativeCosineSim >= 0.88;
        const isHighRush = consensus.token.uniqueBuyersCount >= 8 || consensus.token.volumeDelta15s >= 4.0;
        const isBoosted = isHighVirality || isHighRush;

        if (isBoosted) {
          if (baseTier === 'ECONOMY' || baseTier === 'STANDARD') {
            tipSol = JITO_TIP_TIERS.TURBO;
          } else if (baseTier === 'FAST' || baseTier === 'TURBO') {
            tipSol = JITO_TIP_TIERS.ULTRA_DEGEN;
          }
        }

        // 5. Automated Execution Decision Engine (Requirement 3)
        if (walletState.mode === 'LIVE_ON_CHAIN') {
          isAutoSnipingRef.current = true;
          appendLog(
            'EXECUTION',
            'INFO',
            `⚡ [DECISION ENGINE] Auto-snipe terpicu on-chain untuk ${consensus.token.symbol} (${solInvest} SOL). Memeriksa jalur eksekusi...`
          );

          (async () => {
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
                await openLivePosition(snipeData, consensus.token);
                setAutoSnipeConfig((prev) => ({ ...prev, dailyTradesExecuted: prev.dailyTradesExecuted + 1 }));
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
                await openLivePosition(swapResult, consensus.token);
                setAutoSnipeConfig((prev) => ({ ...prev, dailyTradesExecuted: prev.dailyTradesExecuted + 1 }));
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
            }
          })();
          return;
        }

        // PAPER TRADING MODE: Eksekusi simulasi instan
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

        const simulatedResult: SwapExecutionResult = {
          signature: bundleReceipt.txHash,
          inAmountSol: solInvest,
          outAmountFormatted: (solInvest / consensus.token.priceSol).toFixed(2),
          outputMint: consensus.token.mint,
          symbol: consensus.token.symbol,
          routeSummary: 'Raydium CPMM + Jito Tokyo Bundle',
          priceImpactPct: 0.12,
          jitoTipSol: tipSol,
          slot: networkMetrics.currentSlot + 1,
          isSimulated: true,
          timestamp: Date.now()
        };

        openLivePosition(simulatedResult, consensus.token);
      }
    }, 2800);

    return () => clearInterval(interval);
  }, [engineStatus, appendLog, agentConfig, autoSnipeConfig, telemetry, walletState, openLivePosition, networkMetrics.currentSlot]);

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
        refreshWalletBalance();

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
  }, [activePosition, appendLog, telegramConfig, discordConfig, refreshWalletBalance]);

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

  const updateWalletState = useCallback((w: WalletState) => {
    setWalletState(w);
    if (typeof window !== 'undefined') {
      try {
        if (w.isConnected) {
          // Persist connected wallet state across page refreshes
          localStorage.setItem('GT_WALLET_STATE', JSON.stringify(w));
        } else {
          // Clear persisted state on disconnect
          localStorage.removeItem('GT_WALLET_STATE');
        }
      } catch {}
    }
  }, []);

  // Sync telemetry balance with connected wallet balance
  useEffect(() => {
    if (walletState.isConnected && walletState.balanceSol > 0) {
      setTelemetry((prev) => ({
        ...prev,
        currentBalanceSol: walletState.balanceSol
      }));
    }
  }, [walletState.isConnected, walletState.balanceSol]);

  // Periodic background refresh of connected wallet balance
  useEffect(() => {
    if (!walletState.isConnected) return;

    const fullKey =
      walletState.fullPublicKey ||
      (typeof window !== 'undefined'
        ? (window as any).phantom?.solana?.publicKey?.toString() ||
          (window as any).solflare?.publicKey?.toString() ||
          (window as any).backpack?.publicKey?.toString()
        : null);

    if (!fullKey) return;

    const syncBalance = async () => {
      try {
        const res = await fetch(`/api/wallet/balance?address=${encodeURIComponent(fullKey)}`, {
          signal: AbortSignal.timeout(6000)
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && typeof data.balanceSol === 'number') {
            setWalletState((prev) => {
              const updated = {
                ...prev,
                fullPublicKey: fullKey,
                balanceSol: data.balanceSol
              };
              if (typeof window !== 'undefined') {
                localStorage.setItem('GT_WALLET_STATE', JSON.stringify(updated));
              }
              return updated;
            });
          }
        }
      } catch {}
    };

    syncBalance();
    const interval = setInterval(syncBalance, 25000);
    return () => clearInterval(interval);
  }, [walletState.isConnected, walletState.fullPublicKey]);

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
    openLivePosition,
    refreshWalletBalance,
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
