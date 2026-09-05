'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Activity,
  Shield,
  Zap,
  Target,
  Clock,
  Radio,
  Lock,
  Unlock,
  AlertTriangle,
  Play,
  Pause,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Award,
  Globe,
  Copy,
  Check,
  RefreshCw,
  SlidersHorizontal,
  Compass,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  Server,
  Volume2,
  VolumeX,
  Wallet,
  Sliders,
  History,
  Share2,
  Keyboard,
  Terminal as TerminalIcon,
  Send,
  Search,
  Crosshair,
  Layers,
  Bot
} from 'lucide-react';
import {
  TokenSignal,
  ConsensusResult,
  ActivePosition,
  TerminalTelemetry,
  AgentThresholds,
  ClosedTrade,
  WalletState,
  AutoSnipeConfig
} from '../types/terminal';
import { generateRandomTokenSignal } from '../engine/simulator';
import { runAgentConsensus } from '../agents/consensus';
import { evaluateExitAgent } from '../agents/exit';
import { PRD_THRESHOLDS, STRATEGY_PRESETS, JITO_TIP_TIERS } from '../config/constants';
import { soundFx } from '../engine/audioEngine';
import { TelegramConfig, sendTelegramAlphaAlert } from '../lib/telegram';
import { JitoBundleReceipt, createJitoBundleReceipt } from '../lib/jito';
import StrategyRadar from '../components/StrategyRadar';
import CumulativeCurve from '../components/CumulativeCurve';
import NarrativeCluster from '../components/NarrativeCluster';
import KellyRiskEngine from '../components/KellyRiskEngine';
import EdgeCaseSimulator from '../components/EdgeCaseSimulator';
import GeminiNarrativeModal from '../components/GeminiNarrativeModal';
import StrategyPresetModal from '../components/StrategyPresetModal';
import TradeHistoryLedger from '../components/TradeHistoryLedger';
import WalletConnectModal from '../components/WalletConnectModal';
import PnlShareModal from '../components/PnlShareModal';
import TelegramSettingsModal from '../components/TelegramSettingsModal';
import JitoBundleTrackerModal from '../components/JitoBundleTrackerModal';
import { JupiterSwapModal } from '../components/JupiterSwapModal';
import { AutoSnipeModal } from '../components/AutoSnipeModal';

export default function TerminalDashboard() {
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [dataSource, setDataSource] = useState<'REAL_SOLANA' | 'SIMULATOR'>('REAL_SOLANA');
  const [visualMode, setVisualMode] = useState<'radar' | 'cluster' | 'kelly' | 'ledger' | 'chart'>('radar');
  const [copiedMint, setCopiedMint] = useState<string | null>(null);

  // Audio Telemetry (Web Audio API Synthesizer)
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(() => soundFx.getIsMuted());

  // Dynamic Strategy Presets & Agent Thresholds
  const [thresholds, setThresholds] = useState<AgentThresholds>(STRATEGY_PRESETS.BALANCED);
  const [isStrategyModalOpen, setIsStrategyModalOpen] = useState<boolean>(false);

  // Web3 Solana Wallet & Jito MEV Execution
  const [isWalletModalOpen, setIsWalletModalOpen] = useState<boolean>(false);
  const [selectedTipTier, setSelectedTipTier] = useState<'ECONOMY' | 'STANDARD' | 'FAST' | 'TURBO'>('STANDARD');
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    publicKey: null,
    balanceSol: 0,
    walletName: null,
    mode: 'PAPER_TRADING',
  });

  // Historical Closed Trade Ledger
  const [closedTrades, setClosedTrades] = useState<ClosedTrade[]>([
    {
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
        detectedAt: Date.now() - 360000,
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
      jitoTipSol: 0.00005,
    },
    {
      id: 'POS-8804',
      token: {
        id: 'HIST-2',
        mint: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
        symbol: '$WIF',
        name: 'dogwifhat',
        platform: 'Raydium',
        initialLpUsd: 25000,
        burntLiquidityPct: 100,
        mintAuthorityRevoked: true,
        freezeAuthorityRevoked: true,
        top10HolderPct: 7,
        volumeDelta15s: 18,
        uniqueBuyersCount: 22,
        narrativeCosineSim: 0.89,
        narrativeTheme: 'Animals & Doge Meta',
        priceSol: 0.000045,
        detectedAt: Date.now() - 720000,
      },
      entryPriceSol: 0.000045,
      exitPriceSol: 0.000042,
      solInvested: 0.62,
      pnlSol: -0.041,
      pnlPct: -6.67,
      rMultiplier: -0.44,
      holdDurationSec: 28,
      exitReason: 'Trailing Stop-Loss Protection (Loss > 0.33R)',
      entryTimestamp: Date.now() - 720000,
      exitTimestamp: Date.now() - 692000,
      jitoTipSol: 0.00005,
    }
  ]);

  // Modals & Edge Case Simulator State (PRD 7.2)
  const [isEdgeModalOpen, setIsEdgeModalOpen] = useState<boolean>(false);
  const [isGeminiModalOpen, setIsGeminiModalOpen] = useState<boolean>(false);
  const [lastSimulatedEvent, setLastSimulatedEvent] = useState<string | null>(null);
  const [activeRpcLabel, setActiveRpcLabel] = useState<string>('Geyser gRPC (Primary)');

  const [telemetry, setTelemetry] = useState<TerminalTelemetry>({
    engineStatus: 'LIVE',
    dataSource: 'REAL_SOLANA',
    slotLatencyMs: 42,
    currentSlot: 284192040,
    initialBalanceSol: 10.0,
    currentBalanceSol: 12.84,
    totalPnlSol: +2.84,
    rollingExpectancyR: 3.4,
    winCount: 7,
    lossCount: 2,
    scannedCount: 142,
    vetoCount: 135,
    activePositionLocked: false,
  });

  const [consensusFeed, setConsensusFeed] = useState<ConsensusResult[]>([]);
  const [activePosition, setActivePosition] = useState<ActivePosition | null>(null);
  const [selectedResult, setSelectedResult] = useState<ConsensusResult | null>(null);
  const [scanGridCells, setScanGridCells] = useState<('APPROVED' | 'VETOED')[]>(() =>
    Array(96).fill('VETOED').map(() => (Math.random() > 0.9 ? 'APPROVED' : 'VETOED'))
  );

  // PnL Share Flex Receipt Modal
  const [shareTrade, setShareTrade] = useState<ClosedTrade | ActivePosition | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);

  // Manual Mint Sniper Bar State
  const [manualMintInput, setManualMintInput] = useState<string>('');
  const [isSearchingMint, setIsSearchingMint] = useState<boolean>(false);
  const [sniperStatus, setSniperStatus] = useState<string | null>(null);

  // Telegram Alpha Webhook Configuration State
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState<boolean>(false);
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('GT_TELEGRAM_CONFIG');
        if (saved) return JSON.parse(saved);
      } catch (e) {}
    }
    return { botToken: '', chatId: '', isEnabled: false };
  });

  // Jito MEV Live Bundle Receipt Tracker State
  const [latestJitoReceipt, setLatestJitoReceipt] = useState<JitoBundleReceipt | null>(null);
  const [isJitoTrackerOpen, setIsJitoTrackerOpen] = useState<boolean>(false);

  // Jupiter DEX Aggregator Swap Modal State
  const [isJupiterModalOpen, setIsJupiterModalOpen] = useState<boolean>(false);
  const [jupiterTargetToken, setJupiterTargetToken] = useState<TokenSignal | null>(null);

  const handleOpenJupiterSwap = (token: TokenSignal) => {
    setJupiterTargetToken(token);
    setIsJupiterModalOpen(true);
  };

  // Autonomous AI Sniper Bot State
  const [isAutoSnipeModalOpen, setIsAutoSnipeModalOpen] = useState<boolean>(false);
  const [autoSnipeNotification, setAutoSnipeNotification] = useState<string | null>(null);
  const [autoSnipeConfig, setAutoSnipeConfig] = useState<AutoSnipeConfig>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('GT_AUTOSNIPE_CONFIG');
        if (saved) return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      isEnabled: false,
      buyAmountSol: 0.1,
      minGrokViralityScore: 85,
      minLiquidityUsd: 5000,
      maxTop10HoldersPct: 15,
      jitoTipTier: 'STANDARD',
      takeProfitMultiplierR: 3.0,
      stopLossMultiplierR: 0.33,
      maxDailyTrades: 15,
      dailyTradesExecuted: 0
    };
  });

  // Manual Mint Sniper Action
  const handleSnipeManualMint = async () => {
    const clean = manualMintInput.trim();
    if (!clean) return;
    try {
      setIsSearchingMint(true);
      setSniperStatus('Scanning on-chain pool...');
      const res = await fetch(`/api/tokens/lookup?mint=${encodeURIComponent(clean)}`);
      if (!res.ok) {
        setSniperStatus('Token mint tidak ditemukan di Solana DEX');
        setTimeout(() => setSniperStatus(null), 3500);
        return;
      }
      const data = await res.json();
      if (data.token) {
        const result = runAgentConsensus(data.token, thresholds);
        setSelectedResult(result);
        setConsensusFeed((prev) => [result, ...prev.slice(0, 49)]);
        setSniperStatus(`Sniper complete: ${result.token.symbol} [${result.verdict}]`);
        setTimeout(() => setSniperStatus(null), 4000);

        if (result.verdict === 'APPROVED') {
          soundFx.playApproval();
          // Send Telegram Alpha alert if configured
          if (telegramConfig.isEnabled) {
            sendTelegramAlphaAlert(data.token, telegramConfig, 92, 'BULLISH', JITO_TIP_TIERS[selectedTipTier]);
          }
        } else {
          soundFx.playVeto();
        }
      }
    } catch (e: any) {
      setSniperStatus(`Error sniper: ${e.message}`);
      setTimeout(() => setSniperStatus(null), 3500);
    } finally {
      setIsSearchingMint(false);
    }
  };

  // Global Hacker Keyboard Hotkeys (Space: Pause, 1-4: Views, M: Mute, Esc: Close)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when user is typing in form inputs
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsRunning((prev) => !prev);
      } else if (e.key === '1') {
        setVisualMode('radar');
      } else if (e.key === '2') {
        setVisualMode('cluster');
      } else if (e.key === '3') {
        setVisualMode('kelly');
      } else if (e.key === '4') {
        setVisualMode('ledger');
      } else if (e.key === '5') {
        setVisualMode('chart');
      } else if (e.key.toLowerCase() === 'm') {
        const next = !soundFx.getIsMuted();
        soundFx.setMuted(next);
        setIsAudioMuted(next);
      } else if (e.key === 'Escape') {
        setIsGeminiModalOpen(false);
        setIsStrategyModalOpen(false);
        setIsWalletModalOpen(false);
        setIsEdgeModalOpen(false);
        setIsShareModalOpen(false);
        setIsTelegramModalOpen(false);
        setIsJitoTrackerOpen(false);
        setIsJupiterModalOpen(false);
        setIsAutoSnipeModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // PRD 7.2 Edge-Case Handlers
  const handleTriggerFailoverRpc = () => {
    setActiveRpcLabel('RPC-2 Private Secondary (Failover)');
    setTelemetry((t) => ({
      ...t,
      slotLatencyMs: 48,
    }));
    setLastSimulatedEvent('[FAILOVER SUCCESS] Terputus dari Primary RPC. Berpindah ke Secondary Private RPC dalam 48ms (< 100ms threshold).');
  };

  const handleTriggerBundleDrop = () => {
    setLastSimulatedEvent(`[JITO BUNDLE CANCEL] Bundle ID #jito-bundle dropped pada slot #${telemetry.currentSlot} & #${telemetry.currentSlot + 1}. Transaksi dibatalkan seketika untuk mencegah deviasi slippage.`);
  };

  const handleTriggerFlashRug = () => {
    if (!activePosition) return;
    const lossSol = +(activePosition.solInvested * -0.85).toFixed(4);
    setLastSimulatedEvent(`[FLASH RUG DEFENSE] Likuiditas kolam ${activePosition.token.symbol} anjlok mendadak! Exit Agent mengirim emergency sell dengan priority tip 0.00025 SOL via Jito. Posisi ditutup.`);
    setTelemetry((t) => ({
      ...t,
      activePositionLocked: false,
      currentBalanceSol: +(t.currentBalanceSol + lossSol).toFixed(3),
      totalPnlSol: +(t.totalPnlSol + lossSol).toFixed(3),
      lossCount: t.lossCount + 1,
    }));
    setActivePosition(null);
  };

  const handleReplayBatchTest = () => {
    let approved = 0;
    let vetoed = 0;
    const batchResults: ConsensusResult[] = [];
    for (let i = 0; i < 100; i++) {
      const sig = generateRandomTokenSignal();
      const res = runAgentConsensus(sig);
      if (res.verdict === 'APPROVED') approved++;
      else vetoed++;
      if (i < 25) batchResults.push(res);
    }
    setConsensusFeed((prev) => [...batchResults, ...prev.slice(0, 25)]);
    setTelemetry((t) => ({
      ...t,
      scannedCount: t.scannedCount + 100,
      vetoCount: t.vetoCount + vetoed,
    }));
    setLastSimulatedEvent(`[REPLAY 100 TOKENS] 100 pool dianalisis secara deterministik. Disetujui: ${approved}, Vetoed: ${vetoed}. Konsensus single-veto 0% false positives.`);
  };

  const realTokenQueueRef = useRef<TokenSignal[]>([]);
  const isFetchingRealRef = useRef<boolean>(false);

  // Fetch real Solana tokens from internal API
  const fetchRealTokens = useCallback(async () => {
    if (isFetchingRealRef.current) return;
    try {
      isFetchingRealRef.current = true;
      const res = await fetch('/api/tokens/real');
      if (res.ok) {
        const data = await res.json();
        if (data.tokens && Array.isArray(data.tokens) && data.tokens.length > 0) {
          realTokenQueueRef.current = [...realTokenQueueRef.current, ...data.tokens];
        }
      }
    } catch (e) {
      console.error('Failed to fetch real tokens:', e);
    } finally {
      isFetchingRealRef.current = false;
    }
  }, []);

  // Initial fetch for real tokens
  useEffect(() => {
    fetchRealTokens();
    const pollInterval = setInterval(fetchRealTokens, 15000);
    return () => clearInterval(pollInterval);
  }, [fetchRealTokens]);

  const handleCopyMint = (mint: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(mint);
      setCopiedMint(mint);
      setTimeout(() => setCopiedMint(null), 2000);
    }
  };

  // Main Terminal Engine Loop
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      let token: TokenSignal;

      if (dataSource === 'REAL_SOLANA' && realTokenQueueRef.current.length > 0) {
        token = realTokenQueueRef.current.shift()!;
      } else {
        token = generateRandomTokenSignal();
      }

      // 1. Evaluate 5-Agent Consensus with Dynamic Thresholds
      const result = runAgentConsensus(token, thresholds);
      if (result.verdict === 'APPROVED') {
        soundFx.playApproval();
      } else {
        soundFx.playVeto();
      }

      // 2. Update Scan Grid & Consensus Feed
      setScanGridCells((prev) => [...prev.slice(1), result.verdict]);
      setConsensusFeed((prev) => [result, ...prev.slice(0, 49)]);
      if (!selectedResult) setSelectedResult(result);

      // 3. Update Telemetry
      setTelemetry((prev) => {
        const newVetoCount = result.verdict === 'VETOED' ? prev.vetoCount + 1 : prev.vetoCount;
        return {
          ...prev,
          currentSlot: prev.currentSlot + 1,
          slotLatencyMs: token.isRealData ? Math.floor(Math.random() * 30) + 45 : Math.floor(Math.random() * 20) + 25,
          scannedCount: prev.scannedCount + 1,
          vetoCount: newVetoCount,
        };
      });

      // 4. Execution Logic with Single Position Mutex Lock
      setActivePosition((currentPos) => {
        if (!currentPos && result.verdict === 'APPROVED') {
          // Check Autonomous AI Sniper Bot Eligibility
          const isAutoBotActive = autoSnipeConfig.isEnabled;
          const meetsGrok = (token.narrativeCosineSim * 100) >= autoSnipeConfig.minGrokViralityScore;
          const meetsLp = token.initialLpUsd >= autoSnipeConfig.minLiquidityUsd;
          const meetsHolders = token.top10HolderPct <= autoSnipeConfig.maxTop10HoldersPct;
          const meetsDailyLimit = autoSnipeConfig.dailyTradesExecuted < autoSnipeConfig.maxDailyTrades;

          // If auto-sniper is active, only execute if all user safety filters pass
          if (isAutoBotActive && (!meetsGrok || !meetsLp || !meetsHolders || !meetsDailyLimit)) {
            return null;
          }

          // Capital Sizing: Auto-Snipe configured buyAmountSol or Fractional Kelly
          const solInvested = isAutoBotActive
            ? autoSnipeConfig.buyAmountSol
            : +(0.62 * (thresholds.kellyFraction / 0.25)).toFixed(3);

          const entryPrice = token.priceSol;
          const tokenAmount = solInvested / entryPrice;

          // Jito MEV Bundle generation
          const tipTier = isAutoBotActive ? autoSnipeConfig.jitoTipTier : selectedTipTier;
          const tipSol = JITO_TIP_TIERS[tipTier] || 0.000050;
          const bundleReceipt = createJitoBundleReceipt(token, tipSol, telemetry.currentSlot);
          setLatestJitoReceipt(bundleReceipt);

          // Telegram Alpha notification
          if (telegramConfig.isEnabled) {
            sendTelegramAlphaAlert(
              token, 
              telegramConfig, 
              Math.round(token.narrativeCosineSim * 100), 
              isAutoBotActive ? 'AUTONOMOUS AUTO-SNIPE' : 'BULLISH', 
              tipSol
            );
          }

          if (isAutoBotActive) {
            setAutoSnipeNotification(`🤖 AUTO-SNIPER FIRED: ${token.symbol} (${solInvested} SOL) | Jito Slot #${telemetry.currentSlot}`);
            setTimeout(() => setAutoSnipeNotification(null), 5000);
            setAutoSnipeConfig(prev => ({
              ...prev,
              dailyTradesExecuted: prev.dailyTradesExecuted + 1,
              lastSnipeTimestamp: Date.now()
            }));
          }

          soundFx.playPositionOpen();
          setTelemetry((t) => ({ ...t, activePositionLocked: true }));

          const slMult = isAutoBotActive ? autoSnipeConfig.stopLossMultiplierR : thresholds.trailingStopLossR;

          return {
            id: `POS-${Date.now().toString().slice(-4)}`,
            token,
            entryPriceSol: entryPrice,
            currentPriceSol: entryPrice,
            solInvested,
            tokenAmount,
            pnlSol: 0,
            pnlPct: 0,
            rMultiplier: 0,
            highestPriceSol: entryPrice,
            trailingStopPriceSol: entryPrice * (1 - slMult),
            entryTimestamp: Date.now(),
            status: 'OPEN',
          };
        }

        // If position is active, update price & evaluate Exit Agent
        if (currentPos && currentPos.status === 'OPEN') {
          const priceChangeDelta = (Math.random() - 0.44) * 0.12;
          const newPrice = +(currentPos.currentPriceSol * (1 + priceChangeDelta)).toFixed(8);
          const highestPrice = Math.max(currentPos.highestPriceSol, newPrice);
          const pnlPct = +(((newPrice - currentPos.entryPriceSol) / currentPos.entryPriceSol) * 100).toFixed(2);
          const pnlSol = +((currentPos.solInvested * pnlPct) / 100).toFixed(4);
          const rMultiplier = +(pnlPct / 15).toFixed(2);

          const updatedPos: ActivePosition = {
            ...currentPos,
            currentPriceSol: newPrice,
            highestPriceSol: highestPrice,
            pnlPct,
            pnlSol,
            rMultiplier,
          };

          const exitDecision = evaluateExitAgent(updatedPos);
          if (exitDecision.shouldExit) {
            if (rMultiplier >= thresholds.targetTakeProfitR) {
              soundFx.playTakeProfit();
            } else {
              soundFx.playEmergencyExit();
            }

            // Record into closed trades ledger
            const closedItem: ClosedTrade = {
              id: currentPos.id,
              token: currentPos.token,
              entryPriceSol: currentPos.entryPriceSol,
              exitPriceSol: newPrice,
              solInvested: currentPos.solInvested,
              pnlSol,
              pnlPct,
              rMultiplier,
              holdDurationSec: Math.max(1, Math.round((Date.now() - currentPos.entryTimestamp) / 1000)),
              exitReason: exitDecision.reason || (pnlPct > 0 ? `Target TP (+${rMultiplier}R)` : 'Trailing Stop Hit'),
              entryTimestamp: currentPos.entryTimestamp,
              exitTimestamp: Date.now(),
              jitoTipSol: 0.00005,
            };
            setClosedTrades((prev) => [closedItem, ...prev.slice(0, 99)]);

            setTelemetry((t) => {
              const won = pnlPct > 0;
              return {
                ...t,
                activePositionLocked: false,
                currentBalanceSol: +(t.currentBalanceSol + pnlSol).toFixed(3),
                totalPnlSol: +(t.totalPnlSol + pnlSol).toFixed(3),
                winCount: won ? t.winCount + 1 : t.winCount,
                lossCount: !won ? t.lossCount + 1 : t.lossCount,
              };
            });
            return null;
          }

          return updatedPos;
        }

        return currentPos;
      });
    }, dataSource === 'REAL_SOLANA' ? 1800 : 1100);

    return () => clearInterval(interval);
  }, [isRunning, dataSource, selectedResult, thresholds]);

  const handleManualExit = () => {
    if (!activePosition) return;
    soundFx.playEmergencyExit();

    const closedItem: ClosedTrade = {
      id: activePosition.id,
      token: activePosition.token,
      entryPriceSol: activePosition.entryPriceSol,
      exitPriceSol: activePosition.currentPriceSol,
      solInvested: activePosition.solInvested,
      pnlSol: activePosition.pnlSol,
      pnlPct: activePosition.pnlPct,
      rMultiplier: activePosition.rMultiplier,
      holdDurationSec: Math.max(1, Math.round((Date.now() - activePosition.entryTimestamp) / 1000)),
      exitReason: 'Manual Emergency Exit (Jito MEV)',
      entryTimestamp: activePosition.entryTimestamp,
      exitTimestamp: Date.now(),
      jitoTipSol: 0.00005,
    };
    setClosedTrades((prev) => [closedItem, ...prev.slice(0, 99)]);

    setTelemetry((t) => ({
      ...t,
      activePositionLocked: false,
      currentBalanceSol: +(t.currentBalanceSol + activePosition.pnlSol).toFixed(3),
      totalPnlSol: +(t.totalPnlSol + activePosition.pnlSol).toFixed(3),
    }));
    setActivePosition(null);
  };

  return (
    <main className="min-h-screen p-3 md:p-5 flex flex-col gap-4 max-w-[1720px] mx-auto text-xs font-mono select-none">
      
      {/* 1. TOP BAR TELEMETRY (PRD Section 5) */}
      <header className="bg-terminal-panel border border-terminal-border rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-terminal-card border border-terminal-border rounded-lg text-terminal-green">
              <Zap className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm tracking-wider text-terminal-green glow-green">
                  GROK TRENCHER
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-terminal-card border border-terminal-border text-terminal-muted">
                  v1.0-LIVE
                </span>
              </div>
              <p className="text-[10px] text-terminal-muted">SOLANA MULTI-AGENT SNIPER TERMINAL</p>
            </div>
          </div>

          <div className="h-7 w-[1px] bg-terminal-border hidden sm:block" />

          {/* Engine Status Toggle */}
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
              isRunning
                ? 'bg-terminal-green/10 border-terminal-green text-terminal-green glow-green'
                : 'bg-terminal-red/10 border-terminal-red text-terminal-red'
            }`}
          >
            {isRunning ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
            <span>{isRunning ? 'ENGINE LIVE' : 'ENGINE PAUSED'}</span>
          </button>

          {/* Data Source Mode Switcher */}
          <div className="flex items-center bg-terminal-card border border-terminal-border rounded-lg p-0.5">
            <button
              onClick={() => setDataSource('REAL_SOLANA')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                dataSource === 'REAL_SOLANA'
                  ? 'bg-terminal-green text-terminal-bg font-black'
                  : 'text-terminal-muted hover:text-terminal-text'
              }`}
            >
              <Globe className="w-3 h-3" /> REAL SOLANA LIVE
            </button>
            <button
              onClick={() => setDataSource('SIMULATOR')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                dataSource === 'SIMULATOR'
                  ? 'bg-terminal-cyan text-terminal-bg font-black'
                  : 'text-terminal-muted hover:text-terminal-text'
              }`}
            >
              <SlidersHorizontal className="w-3 h-3" /> SIMULATOR
            </button>
          </div>

          {/* Audio Telemetry Toggle */}
          <button
            onClick={() => {
              const next = !isAudioMuted;
              setIsAudioMuted(next);
              soundFx.setMuted(next);
            }}
            className={`p-2 rounded-lg border transition-all cursor-pointer ${
              isAudioMuted
                ? 'bg-terminal-card border-terminal-border text-terminal-muted hover:text-terminal-text'
                : 'bg-terminal-cyan/15 border-terminal-cyan/50 text-terminal-cyan shadow-[0_0_8px_rgba(0,240,255,0.25)]'
            }`}
            title={isAudioMuted ? 'Unmute Cyber SFX' : 'Mute Cyber SFX'}
          >
            {isAudioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          {/* Strategy Preset Tuner Trigger */}
          <button
            onClick={() => setIsStrategyModalOpen(true)}
            className="px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 border text-[11px] bg-terminal-card hover:bg-terminal-card/80 border-terminal-border text-terminal-text transition-all cursor-pointer font-bold"
            title="Atur Preset Strategi & Threshold Konsensus Agen"
          >
            <Sliders className="w-3.5 h-3.5 text-terminal-green" />
            <span>PRESET: {thresholds.presetName}</span>
          </button>

          {/* Web3 Solana Wallet Connect Trigger */}
          <button
            onClick={() => setIsWalletModalOpen(true)}
            className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 border text-[11px] font-bold transition-all cursor-pointer ${
              walletState.isConnected
                ? 'bg-terminal-green/15 border-terminal-green/50 text-terminal-green'
                : 'bg-terminal-card border-terminal-border text-terminal-text hover:border-terminal-cyan'
            }`}
            title="Koneksi Dompet Solana & Konfigurasi Jito MEV"
          >
            <Wallet className="w-3.5 h-3.5 text-terminal-cyan" />
            <span>{walletState.isConnected ? `${walletState.publicKey} (${walletState.balanceSol} SOL)` : 'CONNECT WALLET'}</span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-terminal-bg text-terminal-muted border border-terminal-border">
              {walletState.mode === 'PAPER_TRADING' ? 'PAPER' : 'LIVE'}
            </span>
          </button>

          {/* Mutex Single Position Lock Status */}
          <div className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 border text-[11px] ${
            telemetry.activePositionLocked
              ? 'bg-terminal-amber/10 border-terminal-amber text-terminal-amber'
              : 'bg-terminal-card border-terminal-border text-terminal-green'
          }`}>
            {telemetry.activePositionLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            <span className="font-bold">
              {telemetry.activePositionLocked ? 'MUTEX: 1 POS LOCKED' : 'MUTEX: UNLOCKED'}
            </span>
          </div>

          {/* Telegram Alpha Bot Alert Trigger */}
          <button
            onClick={() => setIsTelegramModalOpen(true)}
            className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 border text-[11px] font-bold transition-all cursor-pointer ${
              telegramConfig.isEnabled
                ? 'bg-terminal-cyan/10 border-terminal-cyan text-terminal-cyan hover:bg-terminal-cyan/20'
                : 'bg-terminal-card border-terminal-border text-terminal-muted hover:text-terminal-text hover:border-terminal-border-active'
            }`}
            title="Konfigurasi Telegram Alpha Bot Alert"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{telegramConfig.isEnabled ? 'TG BOT: ACTIVE' : 'TG BOT: OFF'}</span>
          </button>

          {/* Jito MEV Bundle Tracker Trigger */}
          <button
            onClick={() => setIsJitoTrackerOpen(true)}
            className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 border text-[11px] font-bold transition-all cursor-pointer ${
              latestJitoReceipt
                ? 'bg-terminal-green/10 border-terminal-green text-terminal-green hover:bg-terminal-green/20'
                : 'bg-terminal-card border-terminal-border text-terminal-muted hover:text-terminal-text hover:border-terminal-border-active'
            }`}
            title="Lihat Jito MEV Live Bundle Explorer Tracker"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{latestJitoReceipt ? 'JITO: BUNDLED' : 'JITO TRACKER'}</span>
          </button>

          {/* Jupiter DEX Aggregator Quick Swap Trigger */}
          <button
            onClick={() => {
              if (selectedResult?.token) {
                handleOpenJupiterSwap(selectedResult.token);
              } else if (consensusFeed.length > 0) {
                handleOpenJupiterSwap(consensusFeed[0].token);
              } else {
                setIsJupiterModalOpen(true);
              }
            }}
            className="px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 border text-[11px] font-bold transition-all cursor-pointer bg-terminal-cyan/10 border-terminal-cyan/50 hover:border-terminal-cyan text-terminal-cyan hover:bg-terminal-cyan/20 glow-cyan"
            title="Buka Jupiter DEX Aggregator Swap Terminal"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>JUPITER SWAP</span>
          </button>

          {/* Autonomous AI Sniper Bot Trigger */}
          <button
            onClick={() => setIsAutoSnipeModalOpen(true)}
            className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 border text-[11px] font-bold transition-all cursor-pointer ${
              autoSnipeConfig.isEnabled
                ? 'bg-terminal-green/15 border-terminal-green text-terminal-green hover:bg-terminal-green/25 glow-green'
                : 'bg-terminal-card border-terminal-border text-terminal-muted hover:text-terminal-text hover:border-terminal-border-active'
            }`}
            title="Konfigurasi Autonomous AI Sniper Bot"
          >
            <Bot className={`w-3.5 h-3.5 ${autoSnipeConfig.isEnabled ? 'text-terminal-green animate-bounce' : ''}`} />
            <span>{autoSnipeConfig.isEnabled ? `AUTO-BOT: ${autoSnipeConfig.buyAmountSol} SOL` : 'AUTO-BOT: OFF'}</span>
          </button>

          {/* PRD 7.2 Edge-Case Stress Test Trigger */}
          <button
            onClick={() => setIsEdgeModalOpen(true)}
            className="px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 border text-[11px] bg-terminal-red/10 border-terminal-red/40 hover:border-terminal-red text-terminal-red hover:bg-terminal-red/20 transition-all cursor-pointer font-bold"
            title="Buka Konsol Simulasi Fallback & Edge-Case (PRD Bagian 7.2)"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>PRD 7.2 EDGE-CASE SIMULATOR</span>
          </button>
        </div>

        {/* Telemetry Metrics */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="text-right">
            <span className="text-[10px] text-terminal-muted block">{activeRpcLabel.toUpperCase()}</span>
            <span className="font-bold text-terminal-green flex items-center gap-1 justify-end">
              <Radio className="w-3 h-3 text-terminal-green animate-ping" />
              {telemetry.slotLatencyMs} ms (Sub-350ms)
            </span>
          </div>

          <div className="h-6 w-[1px] bg-terminal-border" />

          <div className="text-right">
            <span className="text-[10px] text-terminal-muted block">BALANCE / PNL</span>
            <span className="font-bold text-terminal-text">
              {telemetry.currentBalanceSol.toFixed(2)} SOL{' '}
              <span className={telemetry.totalPnlSol >= 0 ? 'text-terminal-green' : 'text-terminal-red'}>
                ({telemetry.totalPnlSol >= 0 ? '+' : ''}{telemetry.totalPnlSol.toFixed(2)} SOL)
              </span>
            </span>
          </div>

          <div className="h-6 w-[1px] bg-terminal-border" />

          <div className="text-right">
            <span className="text-[10px] text-terminal-muted block">WINRATE / EXPECTANCY</span>
            <span className="font-bold text-terminal-cyan flex items-center gap-1 justify-end">
              <Award className="w-3.5 h-3.5" />
              {((telemetry.winCount / (telemetry.winCount + telemetry.lossCount || 1)) * 100).toFixed(0)}% (E[R]: +{telemetry.rollingExpectancyR}R)
            </span>
          </div>

          <div className="h-6 w-[1px] bg-terminal-border" />

          <div className="text-right">
            <span className="text-[10px] text-terminal-muted block">SCANNED / VETOED</span>
            <span className="font-bold text-terminal-text">
              {telemetry.scannedCount} / <span className="text-terminal-red">{telemetry.vetoCount} VETO</span>
            </span>
          </div>
        </div>
      </header>

      {/* MANUAL MINT SNIPER & ON-CHAIN LOOKUP BAR */}
      <div className="bg-terminal-panel/90 backdrop-blur border border-terminal-border rounded-xl p-2.5 px-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2 w-full md:w-auto flex-1">
          <div className="p-1.5 rounded-lg bg-terminal-green/10 border border-terminal-green/30 text-terminal-green">
            <Crosshair className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-bold tracking-wider text-terminal-muted uppercase whitespace-nowrap hidden sm:inline">
            SNIPE MINT CA:
          </span>
          <div className="relative flex-1">
            <input
              type="text"
              value={manualMintInput}
              onChange={(e) => setManualMintInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSnipeManualMint()}
              placeholder="Paste Solana CA mint (e.g. Pump.fun, Raydium, DEX pair address)..."
              className="w-full bg-terminal-card border border-terminal-border focus:border-terminal-green text-terminal-text px-3 py-1.5 rounded-lg text-xs font-mono placeholder:text-terminal-muted/60 focus:outline-none focus:ring-1 focus:ring-terminal-green/40 transition-all pr-8"
              disabled={isSearchingMint}
            />
            {manualMintInput && (
              <button
                onClick={() => setManualMintInput('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-terminal-muted hover:text-terminal-text text-xs"
              >
                ✕
              </button>
            )}
          </div>
          <button
            onClick={handleSnipeManualMint}
            disabled={isSearchingMint || !manualMintInput.trim()}
            className="px-4 py-1.5 rounded-lg bg-terminal-green text-terminal-bg hover:bg-terminal-hover font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer whitespace-nowrap"
          >
            {isSearchingMint ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Search className="w-3.5 h-3.5" />
            )}
            <span>{isSearchingMint ? 'SNIPING...' : 'SNIPE & AUDIT'}</span>
          </button>
        </div>

        {/* Status indicator / quick info */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end text-[11px] font-mono">
          {sniperStatus && (
            <span className="text-terminal-amber animate-pulse font-semibold px-2 py-0.5 rounded bg-terminal-amber/10 border border-terminal-amber/30">
              {sniperStatus}
            </span>
          )}
          {latestJitoReceipt && (
            <button
              onClick={() => setIsJitoTrackerOpen(true)}
              className="text-[10px] text-terminal-cyan hover:underline flex items-center gap-1 px-2 py-0.5 rounded bg-terminal-cyan/10 border border-terminal-cyan/30 cursor-pointer"
            >
              <Zap className="w-3 h-3" />
              <span>Bundle #{latestJitoReceipt.bundleId.slice(0, 10)}...</span>
            </button>
          )}
        </div>
      </div>

      {/* Floating Auto-Snipe Notification Toast Banner */}
      {autoSnipeNotification && (
        <div className="bg-terminal-green/15 border border-terminal-green/60 rounded-xl p-3 px-4 flex items-center justify-between text-terminal-green animate-in slide-in-from-top duration-300 shadow-[0_0_20px_rgba(13,242,137,0.25)]">
          <div className="flex items-center gap-2.5 font-bold">
            <Bot className="w-5 h-5 animate-pulse" />
            <span className="text-xs">{autoSnipeNotification}</span>
          </div>
          <button
            onClick={() => setAutoSnipeNotification(null)}
            className="text-terminal-green/70 hover:text-terminal-green text-xs cursor-pointer font-mono"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. CUMULATIVE PNL CURVE & MEV VOLUME MODULE (PRD Section 5) */}
      <CumulativeCurve
        currentBalanceSol={telemetry.currentBalanceSol}
        initialBalanceSol={telemetry.initialBalanceSol}
        totalPnlSol={telemetry.totalPnlSol}
      />

      {/* 3. MAIN WORKSPACE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
        
        {/* LEFT COLUMN: DESK FEED (Real-time stream of incoming signals) */}
        <section className="lg:col-span-4 bg-terminal-panel border border-terminal-border rounded-xl p-3.5 flex flex-col gap-3 shadow-xl">
          <div className="flex items-center justify-between border-b border-terminal-border pb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-terminal-green" />
              <span className="font-bold tracking-wider text-terminal-text uppercase">
                Desk Feed ({dataSource === 'REAL_SOLANA' ? 'Live Pump.fun & Raydium' : 'Simulator'})
              </span>
            </div>
            <span className="text-[10px] text-terminal-muted">SLOT: #{telemetry.currentSlot}</span>
          </div>

          {/* Feed List */}
          <div className="flex-1 overflow-y-auto space-y-2 max-h-[720px] pr-1 scrollbar-thin">
            {consensusFeed.map((item) => {
              const isSelected = selectedResult?.token.id === item.token.id;
              const isApproved = item.verdict === 'APPROVED';

              return (
                <div
                  key={item.token.id}
                  onClick={() => setSelectedResult(item)}
                  className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-terminal-card border-terminal-green/70 border-glow-green'
                      : 'bg-terminal-card/50 border-terminal-border hover:border-terminal-border-active'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      {item.token.iconUrl ? (
                        <img src={item.token.iconUrl} alt={item.token.symbol} className="w-5 h-5 rounded-full object-cover border border-terminal-border" />
                      ) : (
                        <span className="w-5 h-5 rounded-full bg-terminal-border flex items-center justify-center text-[9px] font-bold text-terminal-text">
                          {item.token.symbol.slice(1, 3)}
                        </span>
                      )}
                      <span className="font-black text-sm text-terminal-text">{item.token.symbol}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-terminal-bg text-terminal-muted border border-terminal-border">
                        {item.token.platform}
                      </span>
                      {item.token.isRealData && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-terminal-green/20 text-terminal-green font-bold">
                          ON-CHAIN
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-terminal-muted">{item.consensusLatencyMs}ms</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-black tracking-wider ${
                        isApproved
                          ? 'bg-terminal-green/20 text-terminal-green border border-terminal-green/50'
                          : 'bg-terminal-red/20 text-terminal-red border border-terminal-red/50'
                      }`}>
                        {item.verdict}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-terminal-muted">
                    <span className="truncate max-w-[150px]">{item.token.name}</span>
                    <span>LP: ${item.token.initialLpUsd.toLocaleString()}</span>
                    <span>Cos-Sim: {item.token.narrativeCosineSim}</span>
                  </div>

                  {/* Bonding Curve or Security Pill */}
                  <div className="mt-1.5 flex items-center justify-between text-[9px] bg-terminal-panel/80 px-2 py-1 rounded border border-terminal-border/80">
                    <div className="flex items-center gap-1.5">
                      {item.token.platform === 'Pump.fun' && item.token.bondingCurveProgress !== undefined ? (
                        <>
                          <span className="text-terminal-muted">Curve:</span>
                          <span className="text-terminal-cyan font-bold font-mono">{item.token.bondingCurveProgress}%</span>
                          <div className="w-14 bg-terminal-bg h-1 rounded-full overflow-hidden border border-terminal-border">
                            <div
                              className="h-full bg-terminal-cyan"
                              style={{ width: `${item.token.bondingCurveProgress}%` }}
                            />
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-1 text-[9px] text-terminal-muted">
                          <span>Top10:</span>
                          <span className="text-terminal-text font-bold font-mono">{item.token.top10HolderPct}%</span>
                        </div>
                      )}
                    </div>
                    <span className={`px-1.5 py-0.2 rounded font-bold text-[8px] ${
                      item.token.rugcheckScore === 'GOOD'
                        ? 'bg-terminal-green/20 text-terminal-green'
                        : item.token.rugcheckScore === 'WARNING'
                        ? 'bg-yellow-400/20 text-yellow-400'
                        : 'bg-terminal-red/20 text-terminal-red'
                    }`}>
                      RUGCHECK: {item.token.rugcheckScore || 'GOOD'}
                      {item.token.rugcheckNumericScore !== undefined ? ` (${item.token.rugcheckNumericScore})` : ''}
                    </span>
                  </div>

                  {!isApproved && item.vetoReason && (
                    <div className="mt-1.5 text-[10px] text-terminal-red/90 bg-terminal-red/10 px-2 py-1 rounded border border-terminal-red/20 flex items-start gap-1">
                      <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5 text-terminal-red" />
                      <span className="truncate">[{item.vetoAgent?.toUpperCase()}] {item.vetoReason}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* MIDDLE COLUMN: 4D STRATEGY RADAR MANIFOLD & 5-AGENT BREAKDOWN */}
        <section className="lg:col-span-5 flex flex-col gap-4">
          
          {/* 4D Strategy Manifold Radar Visual (PRD Section 5) */}
          {/* Visual Mode Tab Switcher (PRD Section 5 & 6) */}
          <div className="flex items-center gap-1.5 bg-terminal-panel p-1 rounded-xl border border-terminal-border">
            <button
              onClick={() => setVisualMode('radar')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 ${
                visualMode === 'radar'
                  ? 'bg-terminal-green/20 text-terminal-green border border-terminal-green/50 shadow-[0_0_8px_rgba(13,242,137,0.2)]'
                  : 'text-terminal-muted hover:text-terminal-text hover:bg-terminal-card border border-transparent'
              }`}
            >
              <Activity className="w-3.5 h-3.5" /> 4D Manifold
            </button>
            <button
              onClick={() => setVisualMode('cluster')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 ${
                visualMode === 'cluster'
                  ? 'bg-terminal-cyan/20 text-terminal-cyan border border-terminal-cyan/50 shadow-[0_0_8px_rgba(0,240,255,0.2)]'
                  : 'text-terminal-muted hover:text-terminal-text hover:bg-terminal-card border border-transparent'
              }`}
            >
              <Compass className="w-3.5 h-3.5" /> Narrative Cluster 2D
            </button>
            <button
              onClick={() => setVisualMode('kelly')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 ${
                visualMode === 'kelly'
                  ? 'bg-terminal-amber/20 text-terminal-amber border border-terminal-amber/50 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                  : 'text-terminal-muted hover:text-terminal-text hover:bg-terminal-card border border-transparent'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" /> Kelly Risk (PRD 6)
            </button>
            <button
              onClick={() => setVisualMode('ledger')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 ${
                visualMode === 'ledger'
                  ? 'bg-terminal-green/20 text-terminal-green border border-terminal-green/50 shadow-[0_0_8px_rgba(13,242,137,0.2)]'
                  : 'text-terminal-muted hover:text-terminal-text hover:bg-terminal-card border border-transparent'
              }`}
            >
              <History className="w-3.5 h-3.5" /> Ledger ({closedTrades.length})
            </button>
            <button
              onClick={() => setVisualMode('chart')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all flex items-center justify-center gap-1.5 ${
                visualMode === 'chart'
                  ? 'bg-terminal-cyan/20 text-terminal-cyan border border-terminal-cyan/50 shadow-[0_0_8px_rgba(0,240,255,0.2)]'
                  : 'text-terminal-muted hover:text-terminal-text hover:bg-terminal-card border border-transparent'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" /> DEX Chart
            </button>
          </div>

          {/* Active Visual Component Render */}
          {visualMode === 'radar' && <StrategyRadar selectedResult={selectedResult} />}
          {visualMode === 'cluster' && (
            <NarrativeCluster
              consensusFeed={consensusFeed}
              selectedResult={selectedResult}
              onSelectToken={setSelectedResult}
              onInspectGemini={(token) => {
                const found = consensusFeed.find((f) => f.token.id === token.id);
                if (found) setSelectedResult(found);
                setIsGeminiModalOpen(true);
              }}
            />
          )}
          {visualMode === 'kelly' && (
            <KellyRiskEngine
              telemetry={telemetry}
              selectedResult={selectedResult}
            />
          )}
          {visualMode === 'ledger' && (
            <TradeHistoryLedger
              trades={closedTrades}
              onClearTrades={() => setClosedTrades([])}
              onSelectTradeForShare={(trade) => {
                setShareTrade(trade);
                setIsShareModalOpen(true);
              }}
            />
          )}
          {visualMode === 'chart' && (
            <div className="bg-terminal-panel border border-terminal-border rounded-xl p-3 flex flex-col gap-2 shadow-xl min-h-[380px]">
              <div className="flex items-center justify-between border-b border-terminal-border pb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-terminal-cyan" />
                  <span className="font-bold text-xs text-terminal-text uppercase tracking-wider">
                    {selectedResult?.token?.symbol ? `${selectedResult.token.symbol} Interactive DEX Candlesticks` : 'Live DEX Candlestick Chart'}
                  </span>
                </div>
                {selectedResult?.token?.mint && (
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-terminal-cyan truncate max-w-[140px]" title={selectedResult.token.mint}>
                      {selectedResult.token.mint}
                    </span>
                    {selectedResult.token.dexUrl && (
                      <a
                        href={selectedResult.token.dexUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-terminal-green hover:underline flex items-center gap-0.5"
                      >
                        DexScreener <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                )}
              </div>
              {selectedResult?.token?.mint ? (
                <div className="w-full h-[360px] rounded-lg overflow-hidden border border-terminal-border/80 bg-terminal-bg relative">
                  <iframe
                    src={`https://dexscreener.com/solana/${selectedResult.token.mint}?embed=1&theme=dark&trades=0&info=0`}
                    className="w-full h-full border-0"
                    title="DexScreener Live Chart"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[320px] text-terminal-muted text-xs gap-2">
                  <TrendingUp className="w-8 h-8 text-terminal-muted/40 animate-pulse" />
                  <span>Pilih token di feed atau jalankan Manual Sniper untuk memuat live candlestick chart.</span>
                </div>
              )}
            </div>
          )}

          {/* Active Evaluated Token Card & Agent Matrix */}
          <div className="bg-terminal-panel border border-terminal-border rounded-xl p-3.5 space-y-3 shadow-xl flex-1">
            <div className="flex items-center justify-between border-b border-terminal-border pb-2">
              <span className="font-bold text-terminal-text flex items-center gap-1.5 uppercase">
                <Shield className="w-4 h-4 text-terminal-green" /> 5-Agent Consensus Evaluator
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                selectedResult?.verdict === 'APPROVED'
                  ? 'bg-terminal-green/20 text-terminal-green border border-terminal-green'
                  : 'bg-terminal-red/20 text-terminal-red border border-terminal-red'
              }`}>
                {selectedResult ? selectedResult.verdict : 'NO TOKEN SELECTED'}
              </span>
            </div>

            {selectedResult ? (
              <div className="space-y-3">
                <div className="bg-terminal-card p-3 rounded-lg border border-terminal-border flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    {selectedResult.token.iconUrl && (
                      <img src={selectedResult.token.iconUrl} alt={selectedResult.token.symbol} className="w-8 h-8 rounded-lg object-cover border border-terminal-border mt-0.5" />
                    )}
                    <div>
                      <h3 className="font-black text-base text-terminal-text flex items-center gap-1.5">
                        {selectedResult.token.symbol}
                        {selectedResult.token.isRealData && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-terminal-green/20 text-terminal-green font-bold">
                            REAL LIVE
                          </span>
                        )}
                      </h3>
                      <p className="text-[11px] text-terminal-muted">{selectedResult.token.name}</p>
                      
                      {/* Mint with Copy & Links */}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-terminal-cyan font-mono truncate max-w-[160px]" title={selectedResult.token.mint}>
                          {selectedResult.token.mint}
                        </span>
                        <button
                          onClick={() => handleCopyMint(selectedResult.token.mint)}
                          className="text-terminal-muted hover:text-terminal-text cursor-pointer"
                          title="Copy Token Mint Address"
                        >
                          {copiedMint === selectedResult.token.mint ? <Check className="w-3 h-3 text-terminal-green" /> : <Copy className="w-3 h-3" />}
                        </button>
                        {selectedResult.token.dexUrl && (
                          <a
                            href={selectedResult.token.dexUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-terminal-green hover:underline flex items-center gap-0.5"
                          >
                            DexScreener <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-terminal-muted block">INITIAL LP</span>
                    <span className="text-sm font-bold text-terminal-green">${selectedResult.token.initialLpUsd.toLocaleString()}</span>
                    <button
                      onClick={() => handleOpenJupiterSwap(selectedResult.token)}
                      className="mt-1 px-2.5 py-1 rounded bg-terminal-cyan/15 hover:bg-terminal-cyan/25 border border-terminal-cyan/40 text-terminal-cyan text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ml-auto"
                      title="Swap token via Jupiter v6 Aggregator"
                    >
                      <Layers className="w-3 h-3" />
                      <span>SWAP (JUP)</span>
                    </button>
                  </div>
                </div>

                {/* Dedicated Rugcheck Security Audit Card */}
                <div className="bg-terminal-panel/90 p-3 rounded-lg border border-terminal-border/80 flex flex-col gap-2 shadow-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-terminal-cyan" />
                      <span className="text-xs font-bold text-terminal-text tracking-wider uppercase">
                        Rugcheck.xyz Security Audit
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {selectedResult.token.rugcheckScore ? (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${
                          selectedResult.token.rugcheckScore === 'GOOD'
                            ? 'bg-terminal-green/20 text-terminal-green border-terminal-green/40 shadow-[0_0_8px_rgba(13,242,137,0.2)]'
                            : selectedResult.token.rugcheckScore === 'WARNING'
                            ? 'bg-yellow-400/20 text-yellow-400 border-yellow-400/40 shadow-[0_0_8px_rgba(250,204,21,0.2)]'
                            : 'bg-terminal-red/20 text-terminal-red border-terminal-red/40 shadow-[0_0_8px_rgba(255,59,48,0.2)]'
                        }`}>
                          {selectedResult.token.rugcheckScore}
                          {selectedResult.token.rugcheckNumericScore !== undefined && ` (${selectedResult.token.rugcheckNumericScore})`}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-terminal-card text-terminal-muted border border-terminal-border">
                          PENDING AUDIT
                        </span>
                      )}
                      {selectedResult.token.rugcheckReportUrl && (
                        <a
                          href={selectedResult.token.rugcheckReportUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-terminal-cyan hover:underline flex items-center gap-0.5 bg-terminal-cyan/10 px-1.5 py-0.5 rounded border border-terminal-cyan/30"
                          title="Open full report on Rugcheck.xyz"
                        >
                          Report <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Key Security Flags Grid */}
                  <div className="grid grid-cols-4 gap-1.5 text-[10px]">
                    <div className={`p-1.5 rounded border flex flex-col items-center justify-center text-center ${
                      selectedResult.token.mintAuthorityRevoked
                        ? 'bg-terminal-green/10 border-terminal-green/30 text-terminal-green'
                        : 'bg-terminal-red/10 border-terminal-red/30 text-terminal-red'
                    }`}>
                      <span className="text-[9px] text-terminal-muted">Mint Auth</span>
                      <span className="font-bold flex items-center gap-0.5">
                        {selectedResult.token.mintAuthorityRevoked ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
                        {selectedResult.token.mintAuthorityRevoked ? 'REVOKED' : 'ACTIVE'}
                      </span>
                    </div>

                    <div className={`p-1.5 rounded border flex flex-col items-center justify-center text-center ${
                      selectedResult.token.freezeAuthorityRevoked
                        ? 'bg-terminal-green/10 border-terminal-green/30 text-terminal-green'
                        : 'bg-terminal-red/10 border-terminal-red/30 text-terminal-red'
                    }`}>
                      <span className="text-[9px] text-terminal-muted">Freeze Auth</span>
                      <span className="font-bold flex items-center gap-0.5">
                        {selectedResult.token.freezeAuthorityRevoked ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
                        {selectedResult.token.freezeAuthorityRevoked ? 'REVOKED' : 'ACTIVE'}
                      </span>
                    </div>

                    <div className={`p-1.5 rounded border flex flex-col items-center justify-center text-center ${
                      selectedResult.token.burntLiquidityPct >= 90
                        ? 'bg-terminal-green/10 border-terminal-green/30 text-terminal-green'
                        : 'bg-yellow-400/10 border-yellow-400/30 text-yellow-400'
                    }`}>
                      <span className="text-[9px] text-terminal-muted">LP Burn/Lock</span>
                      <span className="font-bold flex items-center gap-0.5">
                        {selectedResult.token.burntLiquidityPct >= 90 ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
                        {selectedResult.token.burntLiquidityPct >= 90 ? `${selectedResult.token.burntLiquidityPct}% BURNED` : `${selectedResult.token.burntLiquidityPct}% LP`}
                      </span>
                    </div>

                    <div className={`p-1.5 rounded border flex flex-col items-center justify-center text-center ${
                      selectedResult.token.top10HolderPct <= 20
                        ? 'bg-terminal-green/10 border-terminal-green/30 text-terminal-green'
                        : selectedResult.token.top10HolderPct <= 35
                        ? 'bg-yellow-400/10 border-yellow-400/30 text-yellow-400'
                        : 'bg-terminal-red/10 border-terminal-red/30 text-terminal-red'
                    }`}>
                      <span className="text-[9px] text-terminal-muted">Top 10 Holders</span>
                      <span className="font-bold">
                        {selectedResult.token.top10HolderPct}%
                      </span>
                    </div>
                  </div>

                  {/* Honeypot Alert if detected */}
                  {selectedResult.token.isHoneypotDetected && (
                    <div className="bg-terminal-red/20 border border-terminal-red/50 text-terminal-red px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1.5 animate-pulse">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>CRITICAL: Honeypot Pattern Terdeteksi! Token tidak dapat dijual kembali.</span>
                    </div>
                  )}

                  {/* Rugcheck Detected Risks Chips (if any) */}
                  {selectedResult.token.rugcheckRisks && selectedResult.token.rugcheckRisks.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1 border-t border-terminal-border/40">
                      <span className="text-[9px] text-terminal-muted font-bold self-center mr-1">Risks:</span>
                      {selectedResult.token.rugcheckRisks.slice(0, 4).map((risk, idx) => {
                        const isRiskDanger = risk.toLowerCase().includes('danger') || risk.toLowerCase().includes('honeypot') || risk.toLowerCase().includes('freeze');
                        const isRiskWarn = risk.toLowerCase().includes('warn') || risk.toLowerCase().includes('top') || risk.toLowerCase().includes('holder');
                        return (
                          <span
                            key={idx}
                            title={risk}
                            className={`text-[9px] px-1.5 py-0.5 rounded font-mono truncate max-w-[140px] ${
                              isRiskDanger
                                ? 'bg-terminal-red/20 text-terminal-red border border-terminal-red/30'
                                : isRiskWarn
                                ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/30'
                                : 'bg-terminal-card text-terminal-muted border border-terminal-border'
                            }`}
                          >
                            {risk}
                          </span>
                        );
                      })}
                      {selectedResult.token.rugcheckRisks.length > 4 && (
                        <span className="text-[9px] text-terminal-muted self-center font-mono">
                          +{selectedResult.token.rugcheckRisks.length - 4} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* 5-Agent Status Breakdown */}
                <div className="space-y-2">
                  {(['scanner', 'narrative', 'risk', 'timing', 'exit'] as const).map((agentKey) => {
                    const verdict = selectedResult.verdicts[agentKey];
                    const isPass = verdict.status === 'APPROVE';

                    return (
                      <div
                        key={agentKey}
                        className={`p-2.5 rounded-lg border text-xs flex flex-col gap-1 transition-all ${
                          isPass
                            ? 'bg-terminal-card/80 border-terminal-border'
                            : 'bg-terminal-red/10 border-terminal-red/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-terminal-text uppercase text-[11px] flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${isPass ? 'bg-terminal-green' : 'bg-terminal-red'}`} />
                            {verdict.agentName}
                          </span>
                          <span className={`text-[10px] px-2 py-0.2 rounded font-black ${
                            isPass ? 'bg-terminal-green/20 text-terminal-green' : 'bg-terminal-red/20 text-terminal-red'
                          }`}>
                            {verdict.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-terminal-muted leading-relaxed">
                          {verdict.reason}
                        </p>
                        <div className="flex items-center justify-between text-[9px] text-terminal-muted pt-1 border-t border-terminal-border/50">
                          <span>Value: <strong className="text-terminal-text">{verdict.metricValue}</strong></span>
                          <span>Target: <strong className="text-terminal-text">{verdict.threshold}</strong></span>
                          <span>Latency: {verdict.latencyMs}ms</span>
                        </div>
                        {agentKey === 'narrative' && (
                          <div className="pt-1.5 flex justify-end">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsGeminiModalOpen(true);
                              }}
                              className="px-2 py-0.5 rounded bg-terminal-cyan/15 hover:bg-terminal-cyan/25 border border-terminal-cyan/40 text-terminal-cyan text-[10px] flex items-center gap-1 font-bold transition-all cursor-pointer shadow-[0_0_8px_rgba(0,240,255,0.15)]"
                            >
                              <Sparkles className="w-3 h-3" />
                              Deep Dive Gemini AI (Flash)
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-terminal-muted">Menunggu sinyal pool baru...</div>
            )}
          </div>
        </section>

        {/* RIGHT COLUMN: ACTIVE POSITION, SCAN GRID & JITO MEV EXECUTION */}
        <section className="lg:col-span-3 flex flex-col gap-4">
          
          {/* Active Position Card (Mutex Guarded) */}
          <div className="bg-terminal-panel border border-terminal-border rounded-xl p-3.5 flex flex-col gap-3 shadow-xl">
            <div className="flex items-center justify-between border-b border-terminal-border pb-2">
              <span className="font-bold text-terminal-text flex items-center gap-1.5 uppercase">
                <Target className="w-4 h-4 text-terminal-green" /> Single Active Position
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-black ${
                activePosition ? 'bg-terminal-green text-terminal-bg' : 'bg-terminal-card text-terminal-muted border border-terminal-border'
              }`}>
                {activePosition ? 'STATUS: OPEN' : 'STANDBY'}
              </span>
            </div>

            {activePosition ? (
              <div className="space-y-3 bg-terminal-card p-3 rounded-lg border border-terminal-green/50 border-glow-green">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {activePosition.token.iconUrl && (
                      <img src={activePosition.token.iconUrl} alt={activePosition.token.symbol} className="w-7 h-7 rounded-lg object-cover" />
                    )}
                    <div>
                      <h4 className="font-black text-base text-terminal-text">{activePosition.token.symbol}</h4>
                      <span className="text-[10px] text-terminal-muted">{activePosition.id}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-base font-black ${activePosition.pnlPct >= 0 ? 'text-terminal-green glow-green' : 'text-terminal-red glow-red'}`}>
                      {activePosition.pnlPct >= 0 ? '+' : ''}{activePosition.pnlPct}%
                    </span>
                    <span className="text-[10px] text-terminal-muted block">
                      ({activePosition.pnlSol >= 0 ? '+' : ''}{activePosition.pnlSol} SOL)
                    </span>
                  </div>
                </div>

                {/* Progress metrics */}
                <div className="space-y-1 text-[11px] pt-2 border-t border-terminal-border">
                  <div className="flex justify-between">
                    <span className="text-terminal-muted">Investasi (Kelly Sizing):</span>
                    <span className="font-bold text-terminal-text">{activePosition.solInvested} SOL</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-terminal-muted">Entry Price:</span>
                    <span className="font-mono text-terminal-text">{activePosition.entryPriceSol} SOL</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-terminal-muted">Current Price:</span>
                    <span className="font-mono text-terminal-green">{activePosition.currentPriceSol} SOL</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-terminal-muted">R-Expectancy:</span>
                    <span className="font-bold text-terminal-cyan">+{activePosition.rMultiplier}R / 3.0R</span>
                  </div>
                </div>

                {/* Trailing stop status */}
                <div className="p-2 bg-terminal-bg rounded border border-terminal-border text-[10px] space-y-1">
                  <div className="flex justify-between text-terminal-muted">
                    <span>Trailing Stop Trigger:</span>
                    <span className="text-terminal-amber font-mono">
                      &lt; {activePosition.trailingStopPriceSol.toFixed(7)} SOL
                    </span>
                  </div>
                  <div className="w-full bg-terminal-card h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-terminal-green h-full transition-all"
                      style={{ width: `${Math.min(Math.max((activePosition.rMultiplier / 3.0) * 100, 5), 100)}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setShareTrade(activePosition);
                      setIsShareModalOpen(true);
                    }}
                    className="py-2 bg-terminal-card hover:bg-terminal-card/80 text-terminal-green font-bold rounded-lg border border-terminal-green/40 transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs"
                    title="Buat Kartu Share PnL Flex untuk Twitter / Telegram"
                  >
                    <Share2 className="w-3.5 h-3.5" /> Share PnL
                  </button>

                  <button
                    onClick={handleManualExit}
                    className="py-2 bg-terminal-red/20 hover:bg-terminal-red/30 text-terminal-red font-bold rounded-lg border border-terminal-red/60 transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" /> Emergency Exit
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-terminal-card/50 p-6 rounded-lg border border-terminal-border text-center space-y-2">
                <Clock className="w-6 h-6 mx-auto text-terminal-muted" />
                <p className="font-bold text-terminal-text text-xs">Tidak Ada Posisi Terbuka</p>
                <p className="text-[10px] text-terminal-muted leading-relaxed">
                  Single Position Mutex Guard siap mengeksekusi order pertama yang disetujui 5/5 konsensus agen.
                </p>
              </div>
            )}
          </div>

          {/* 96-CELL SCAN GRID (PRD Section 5) */}
          <div className="bg-terminal-panel border border-terminal-border rounded-xl p-3.5 space-y-2 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="font-bold text-terminal-text text-[11px] uppercase">
                Scan Grid (96 Slots Matrix)
              </span>
              <span className="text-[10px] text-terminal-muted">Ratio: 1 Approved : 15 Veto</span>
            </div>
            
            <div className="grid grid-cols-12 gap-1 bg-terminal-bg p-2 rounded-lg border border-terminal-border">
              {scanGridCells.map((verdict, idx) => (
                <div
                  key={idx}
                  className={`h-3 rounded-xs transition-all ${
                    verdict === 'APPROVED'
                      ? 'bg-terminal-green glow-green'
                      : 'bg-terminal-card border border-terminal-border hover:bg-terminal-red/40'
                  }`}
                  title={`Slot #${idx + 1}: ${verdict}`}
                />
              ))}
            </div>
          </div>

          {/* Jito MEV Private Bundle Telemetry */}
          <div className="bg-terminal-panel border border-terminal-border rounded-xl p-3.5 space-y-2.5 shadow-xl">
            <div className="flex items-center justify-between border-b border-terminal-border pb-2">
              <span className="font-bold text-terminal-text text-[11px] uppercase flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-terminal-cyan" /> Jito MEV Private Bundler
              </span>
              <span className="text-[9px] text-terminal-green font-mono">0% Sandwich Leak</span>
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-terminal-muted">Block Engine Relayer:</span>
                <span className="text-terminal-text font-mono">mainnet.block-engine.jito.wtf</span>
              </div>
              <div className="flex justify-between">
                <span className="text-terminal-muted">Dynamic Validator Tip:</span>
                <span className="text-terminal-cyan font-mono">0.000050 SOL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-terminal-muted">Bundle Ingestion Speed:</span>
                <span className="text-terminal-green font-bold font-mono">22ms</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Cyberpunk Hacker Keyboard Hotkeys Quick Bar */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-terminal-panel border border-terminal-border rounded-xl text-[10px] text-terminal-muted flex-wrap gap-2 shadow-lg">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-terminal-green font-bold flex items-center gap-1.5 uppercase tracking-wider">
            <TerminalIcon className="w-3.5 h-3.5" /> Hotkeys:
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-terminal-card border border-terminal-border rounded text-terminal-text font-mono font-bold">Space</kbd>
            <span>{isRunning ? 'Pause Ingestion' : 'Resume Ingestion'}</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-terminal-card border border-terminal-border rounded text-terminal-text font-mono font-bold">1 - 4</kbd>
            <span>Switch Visualizer</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-terminal-card border border-terminal-border rounded text-terminal-text font-mono font-bold">M</kbd>
            <span>{isAudioMuted ? 'Unmute Audio' : 'Mute Audio'}</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-terminal-card border border-terminal-border rounded text-terminal-text font-mono font-bold">Esc</kbd>
            <span>Close Modal</span>
          </span>
        </div>

        <div className="flex items-center gap-2 text-[9px] font-mono">
          <span className="text-terminal-green font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-terminal-green animate-pulse" />
            SUB-350MS LATENCY
          </span>
          <span>|</span>
          <span className="text-terminal-cyan">xAI Grok &amp; Gemini Dual-Engine</span>
        </div>
      </div>

      {/* PRD 7.2 Edge-Case Fallback Simulator Modal */}
      <EdgeCaseSimulator
        isOpen={isEdgeModalOpen}
        onClose={() => setIsEdgeModalOpen(false)}
        activePosition={activePosition}
        onTriggerFailoverRpc={handleTriggerFailoverRpc}
        onTriggerBundleDrop={handleTriggerBundleDrop}
        onTriggerFlashRug={handleTriggerFlashRug}
        onReplayBatchTest={handleReplayBatchTest}
        lastSimulatedEvent={lastSimulatedEvent}
      />

      {/* Gemini & xAI Grok Dual AI Narrative Semantic Inspector Modal */}
      <GeminiNarrativeModal
        isOpen={isGeminiModalOpen}
        onClose={() => setIsGeminiModalOpen(false)}
        token={selectedResult?.token || null}
      />

      {/* Strategy Preset & Thresholds Tuner Modal */}
      <StrategyPresetModal
        isOpen={isStrategyModalOpen}
        onClose={() => setIsStrategyModalOpen(false)}
        currentThresholds={thresholds}
        onSaveThresholds={(newThresh) => setThresholds(newThresh)}
      />

      {/* Web3 Solana Wallet & Jito MEV Settings Modal */}
      <WalletConnectModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        walletState={walletState}
        onUpdateWallet={(newState) => setWalletState(newState)}
        selectedTipTier={selectedTipTier}
        onSelectTipTier={(newTier) => setSelectedTipTier(newTier)}
      />

      {/* PnL Receipt / Flex Share Modal */}
      <PnlShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        trade={shareTrade}
      />

      {/* Telegram Alpha Bot Alert Configuration Modal */}
      <TelegramSettingsModal
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
        config={telegramConfig}
        onSaveConfig={(newCfg) => setTelegramConfig(newCfg)}
      />

      {/* Jito MEV Live Bundle Explorer Tracker Modal */}
      <JitoBundleTrackerModal
        isOpen={isJitoTrackerOpen}
        onClose={() => setIsJitoTrackerOpen(false)}
        receipt={latestJitoReceipt}
      />

      {/* Jupiter DEX Aggregator Swap Execution Modal */}
      <JupiterSwapModal
        isOpen={isJupiterModalOpen}
        onClose={() => setIsJupiterModalOpen(false)}
        token={jupiterTargetToken || selectedResult?.token || (consensusFeed[0] ? consensusFeed[0].token : null)}
        currentBalanceSol={telemetry.currentBalanceSol}
        currentSlot={telemetry.currentSlot}
        onSwapSuccess={(swapResult) => {
          soundFx.playPositionOpen();
          // Deduct invested SOL from balance
          setTelemetry((t) => ({
            ...t,
            currentBalanceSol: Math.max(0.1, +(t.currentBalanceSol - swapResult.inAmountSol - swapResult.jitoTipSol).toFixed(4))
          }));
        }}
      />

      {/* Autonomous AI Sniper Bot Modal */}
      <AutoSnipeModal
        isOpen={isAutoSnipeModalOpen}
        onClose={() => setIsAutoSnipeModalOpen(false)}
        config={autoSnipeConfig}
        onSaveConfig={(newCfg) => setAutoSnipeConfig(newCfg)}
        currentBalanceSol={telemetry.currentBalanceSol}
      />

    </main>
  );
}
