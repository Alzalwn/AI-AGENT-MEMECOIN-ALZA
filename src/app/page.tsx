'use client';

import React, { useState } from 'react';
import { TradingProvider, useTradingAgent } from '../context/TradingContext';
import Header from '../components/dashboard/Header';
import MiniTerminalFeed from '../components/dashboard/MiniTerminalFeed';
import TerminalLogs from '../components/dashboard/TerminalLogs';
import DeskFeed from '../components/dashboard/DeskFeed';
import ConsensusEvaluator from '../components/dashboard/ConsensusEvaluator';
import { SignalFeed } from '../components/signals/SignalFeed';
import { SignalStats } from '../components/signals/SignalStats';
import { SignalHeroStats } from '../components/signals/SignalHeroStats';
import { QuickSignalScanner } from '../components/signals/QuickSignalScanner';
import { SignalHistoryTable } from '../components/signals/SignalHistoryTable';
import { SignalStats as SignalStatsType } from '../types/signal';

// Modals
import WalletConnectModal from '../components/WalletConnectModal';
import StrategyPresetModal from '../components/StrategyPresetModal';
import TelegramSettingsModal from '../components/TelegramSettingsModal';
import { JupiterSwapModal } from '../components/JupiterSwapModal';
import { AutoSnipeModal } from '../components/AutoSnipeModal';
import { EarlyGemsModal } from '../components/EarlyGemsModal';
import ExecutionSettingsModal from '../components/ExecutionSettingsModal';
import GeminiNarrativeModal from '../components/GeminiNarrativeModal';
import PnlShareModal from '../components/PnlShareModal';
import JitoBundleTrackerModal from '../components/JitoBundleTrackerModal';
import KeyboardShortcutsModal from '../components/KeyboardShortcutsModal';
import RpcManagerModal from '../components/RpcManagerModal';
import SolConverterModal from '../components/SolConverterModal';
// ConfirmSnipeModal removed (sniping feature disabled in favor of signal terminal)
import ChangePasswordModal from '../components/ChangePasswordModal';
import SmartMoneyModal from '../components/SmartMoneyModal';
import { VpsBotModal } from '../components/VpsBotModal';
import { JitoBundleReceipt } from '../lib/jito';
import { STRATEGY_PRESETS } from '../config/constants';
import { ActivePosition, ClosedTrade } from '../types/terminal';
import { Terminal as TerminalIcon } from 'lucide-react';

function TerminalAppInner() {
  const {
    telemetry,
    activePosition,
    closedTrades,
    selectedResult,
    consensusFeed,
    walletState,
    updateWalletState,
    agentConfig,
    updateAgentConfig,
    executionConfig,
    updateExecutionConfig,
    autoSnipeConfig,
    updateAutoSnipeConfig,
    telegramConfig,
    updateTelegramConfig,
    discordConfig,
    updateDiscordConfig,
    engineStatus,
    toggleEngine,
    emergencyKillSwitch,
    setVisualMode,
    toggleAudio,
    isAudioMuted,
    openLivePosition,
    refreshWalletBalance,
    appendLog,
    activeSignals,
    signalHistory,
    agentThresholds,
    setAgentThresholds,
  } = useTradingAgent();

  // Jito Tip Tier selection (matches WalletConnectModal's ECONOMY | STANDARD | FAST | TURBO)
  const [selectedTipTier, setSelectedTipTier] = React.useState<'ECONOMY' | 'STANDARD' | 'FAST' | 'TURBO'>('STANDARD');

  // Modal Visibility States
  const [isWalletModalOpen, setIsWalletModalOpen] = useState<boolean>(false);
  const [isStrategyModalOpen, setIsStrategyModalOpen] = useState<boolean>(false);
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState<boolean>(false);
  const [isEarlyGemsOpen, setIsEarlyGemsOpen] = useState<boolean>(false);
  const [isExecutionModalOpen, setIsExecutionModalOpen] = useState<boolean>(false);
  const [isJupiterModalOpen, setIsJupiterModalOpen] = useState<boolean>(false);
  const [customSwapMint, setCustomSwapMint] = useState<string | undefined>(undefined);
  const [isAutoSnipeModalOpen, setIsAutoSnipeModalOpen] = useState<boolean>(false);
  const [isGeminiModalOpen, setIsGeminiModalOpen] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [shareTrade, setShareTrade] = useState<ActivePosition | ClosedTrade | null>(null);
  const [isJitoTrackerOpen, setIsJitoTrackerOpen] = useState<boolean>(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState<boolean>(false);
  const [isRpcModalOpen, setIsRpcModalOpen] = useState<boolean>(false);
  const [isConverterOpen, setIsConverterOpen] = useState<boolean>(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState<boolean>(false);
  const [isSmartMoneyOpen, setIsSmartMoneyOpen] = useState<boolean>(false);
  const [isVpsBotOpen, setIsVpsBotOpen] = useState<boolean>(false);

  // Signal Terminal tab: 'signals' (default) | 'history' | 'trading'
  const [dashTab, setDashTab] = useState<'signals' | 'history' | 'trading'>('signals');

  // Compute signal stats from signalHistory
  const signalStats: SignalStatsType = React.useMemo(() => {
    const wins = signalHistory.filter((s) => ['TP1_HIT', 'TP2_HIT', 'TP3_HIT'].includes(s.status));
    const losses = signalHistory.filter((s) => s.status === 'SL_HIT');
    const resolved = [...wins, ...losses];
    const today = Date.now() - 86400000;
    const todaySignals = signalHistory.filter((s) => s.timestamp > today);
    return {
      totalSignals: signalHistory.length,
      totalToday: todaySignals.length,
      winCount: wins.length,
      lossCount: losses.length,
      winRate: resolved.length > 0 ? (wins.length / resolved.length) * 100 : 0,
      tp2Rate: resolved.length > 0 ? (signalHistory.filter((s) => ['TP2_HIT', 'TP3_HIT'].includes(s.status)).length / resolved.length) * 100 : 0,
      tp3Rate: resolved.length > 0 ? (signalHistory.filter((s) => s.status === 'TP3_HIT').length / resolved.length) * 100 : 0,
      avgRR: wins.length > 0 ? wins.reduce((a, s) => a + s.riskRewardRatio, 0) / wins.length : 0,
      avgDurationMin: 0,
      supernovaCount: signalHistory.filter((s) => s.signalTier === 'SUPERNOVA').length,
      highCount: signalHistory.filter((s) => s.signalTier === 'HIGH').length,
      moderateCount: signalHistory.filter((s) => s.signalTier === 'MODERATE').length,
      lastUpdated: Date.now(),
    };
  }, [signalHistory]);

  // Global Pro Trader Keyboard Shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        toggleEngine();
      } else if (e.key.toLowerCase() === 'k') {
        emergencyKillSwitch();
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
      } else if (e.key === '6') {
        setVisualMode('grid');
      } else if (e.key.toLowerCase() === 'm') {
        toggleAudio();
      } else if (e.key.toLowerCase() === 's') {
        setIsStrategyModalOpen((prev) => !prev);
      } else if (e.key.toLowerCase() === 'a') {
        setIsTelegramModalOpen((prev) => !prev);
      } else if (e.key.toLowerCase() === 'p') {
        setIsEarlyGemsOpen((prev) => !prev);
      } else if (e.key.toLowerCase() === 'e') {
        setIsExecutionModalOpen((prev) => !prev);
      } else if (e.key.toLowerCase() === 'w') {
        setIsWalletModalOpen((prev) => !prev);
      } else if (e.key.toLowerCase() === 'j') {
        setIsJupiterModalOpen((prev) => !prev);
      } else if (e.key.toLowerCase() === 'n') {
        setIsAutoSnipeModalOpen((prev) => !prev);
      } else if (e.key.toLowerCase() === 'r') {
        setIsRpcModalOpen((prev) => !prev);
      } else if (e.key.toLowerCase() === 'c') {
        setIsConverterOpen((prev) => !prev);
      } else if (e.key.toLowerCase() === 't') {
        setIsSmartMoneyOpen((prev) => !prev);
      } else if (e.key === '?') {
        setIsShortcutsModalOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleEngine, emergencyKillSwitch, setVisualMode, toggleAudio]);

  const [latestJitoReceipt, setLatestJitoReceipt] = useState<JitoBundleReceipt | null>(null);

  // Target token for Jupiter swap
  const targetToken =
    selectedResult?.token || (consensusFeed[0] ? consensusFeed[0].token : null);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* 1. Global Navigation Header */}
      <Header
        onOpenWallet={() => setIsWalletModalOpen(true)}
        onOpenStrategy={() => setIsStrategyModalOpen(true)}
        onOpenAlerts={() => setIsTelegramModalOpen(true)}
        onOpenAnalytics={() => setIsEarlyGemsOpen(true)}
        onOpenExecution={() => setIsExecutionModalOpen(true)}
        onOpenJupiter={() => setIsJupiterModalOpen(true)}
        onOpenRpc={() => setIsRpcModalOpen(true)}
        onOpenShortcuts={() => setIsShortcutsModalOpen(true)}
        onOpenConverter={() => setIsConverterOpen(true)}
        onOpenPassword={() => setIsPasswordModalOpen(true)}
        onOpenSmartMoney={() => setIsSmartMoneyOpen(true)}
        onOpenVpsBot={() => setIsVpsBotOpen(true)}
        onOpenAutoSnipe={() => setIsAutoSnipeModalOpen(true)}
      />

      {/* Main Workspace Body */}
      <main className="p-3.5 sm:p-5 flex-1 flex flex-col gap-4 max-w-[1920px] mx-auto w-full">
        {/* Top KPI Section: Live Signal Stats, Win-Rate & Telegram Webhook Telemetry */}
        <SignalHeroStats
          stats={signalStats}
          onOpenTelegramModal={() => setIsTelegramModalOpen(true)}
          onOpenVpsBot={() => setIsVpsBotOpen(true)}
          isTelegramConnected={telegramConfig?.isEnabled && Boolean(telegramConfig?.botToken && telegramConfig?.chatId)}
        />

        {/* Quick Instant Signal Generator & CA Scanner */}
        <QuickSignalScanner
          onOpenJupiterSwap={(ca) => {
            setCustomSwapMint(ca);
            setIsJupiterModalOpen(true);
          }}
        />

        {/* Dashboard Tab Switcher */}
        <div className="flex items-center gap-1 border border-white/10 bg-[#0e0e0e] rounded-2xl p-1.5 shadow-lg">
          {[
            {
              key: 'signals' as const,
              label: '🚀 Sinyal Alpha Live',
              sub: `${activeSignals.length} Sinyal Aktif Dipantau`,
              highlight: true
            },
            {
              key: 'history' as const,
              label: '📚 Riwayat & Win-Rate',
              sub: `${signalHistory.length} Total Sinyal Historis`
            },
            {
              key: 'trading' as const,
              label: '🧠 AI Consensus Scanner',
              sub: '5-Agent Matrix & Logs'
            },
          ].map(({ key, label, sub, highlight }) => (
            <button
              key={key}
              onClick={() => setDashTab(key)}
              className={`flex-1 flex flex-col items-center py-2.5 px-4 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer ${
                dashTab === key
                  ? 'bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-white border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)]'
                  : 'text-white/40 hover:text-white/80 hover:bg-white/[0.04]'
              }`}
            >
              <span className="flex items-center gap-2">
                {label}
                {highlight && activeSignals.length > 0 && (
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </span>
              <span className="text-[11px] text-white/40 font-mono mt-0.5">{sub}</span>
            </button>
          ))}
        </div>

        {/* Signal Terminal Tab (DEFAULT) */}
        {dashTab === 'signals' && (
          <div className="space-y-4">
            <SignalFeed signals={activeSignals} isScanning={engineStatus === 'AUTONOMOUS'} />
          </div>
        )}

        {/* Signal History Tab */}
        {dashTab === 'history' && (
          <div className="space-y-4">
            <SignalHistoryTable signals={signalHistory} />
          </div>
        )}

        {/* AI Consensus Scanner Tab (5-Agent Matrix & Live Decision Logs) */}
        {dashTab === 'trading' && (<>

        {/* Core 3-Column AI Consensus Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
          {/* Left Column: Desk Feed (Real-Time Ingestion Stream) */}
          <div className="lg:col-span-4">
            <DeskFeed />
          </div>

          {/* Middle Column: 4D Strategy Radar & 5-Agent Evaluator */}
          <div className="lg:col-span-5">
            <ConsensusEvaluator
              onOpenGemini={() => setIsGeminiModalOpen(true)}
              onShareTrade={(trade) => {
                setShareTrade(trade);
                setIsShareModalOpen(true);
              }}
              onOpenAnalytics={() => setIsEarlyGemsOpen(true)}
            />
          </div>

          {/* Right Column: AI Decision Stream & Real-Time Engine Logs */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <MiniTerminalFeed />
            <TerminalLogs />
          </div>
        </div>

        {/* 6. Cyberpunk Hotkeys Footer */}
        <footer className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/60 backdrop-blur-md border border-zinc-800/80 rounded-2xl text-[10px] text-zinc-400 flex-wrap gap-2 font-mono">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-emerald-400 font-bold flex items-center gap-1.5 uppercase tracking-wider">
              <TerminalIcon className="w-3.5 h-3.5" /> Quick Hotkeys:
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-200 font-bold">
                Space
              </kbd>
              <span>{engineStatus === 'AUTONOMOUS' ? 'Pause' : 'Resume'}</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-200 font-bold">
                1 - 4
              </kbd>
              <span>Switch Visualizer</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-200 font-bold">
                M
              </kbd>
              <span>{isAudioMuted ? 'Unmute' : 'Mute'}</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-purple-500/20 border border-purple-500/40 rounded text-purple-300 font-bold">
                C
              </kbd>
              <span className="text-purple-300 font-medium">SOL Kurs (IDR/USD)</span>
            </span>
          </div>

          <span className="text-zinc-600 hidden sm:inline">
            Solana AI Alpha Signal Terminal • Powered by Multi-Agent AI Consensus
          </span>
        </footer>
        </>)}
      </main>

      {/* 7. Modal Dialogs */}
      <WalletConnectModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        walletState={walletState}
        onUpdateWallet={updateWalletState}
        selectedTipTier={selectedTipTier}
        onSelectTipTier={(tier) => {
          setSelectedTipTier(tier);
          updateAgentConfig({ jitoTipTier: tier });
        }}
      />

      <StrategyPresetModal
        isOpen={isStrategyModalOpen}
        onClose={() => setIsStrategyModalOpen(false)}
        currentThresholds={agentThresholds}
        onSaveThresholds={(thresholds) => {
          setAgentThresholds(thresholds);
          // Sync key strategy params into agentConfig
          updateAgentConfig({
            takeProfitMultiplier: thresholds.targetTakeProfitR,
            trailingStopLossPct: thresholds.trailingStopLossR,
            antiRugpull: {
              ...agentConfig.antiRugpull,
              requireMintRevoked: thresholds.requireMintRevoked,
              requireFreezeRevoked: thresholds.requireFreezeRevoked,
              maxTop10HoldersPct: thresholds.maxTop10HoldersPct
            }
          });
          appendLog('SYSTEM', 'SUCCESS', `Strategy preset changed to ${thresholds.presetName}`);
        }}
      />

      <TelegramSettingsModal
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
        config={telegramConfig}
        onSaveConfig={(cfg) => updateTelegramConfig(cfg)}
        discordConfig={discordConfig}
        onSaveDiscordConfig={(cfg) => updateDiscordConfig(cfg)}
      />

      <JupiterSwapModal
        isOpen={isJupiterModalOpen}
        onClose={() => {
          setIsJupiterModalOpen(false);
          setCustomSwapMint(undefined);
        }}
        token={targetToken}
        initialMint={customSwapMint}
        currentBalanceSol={walletState.isConnected ? walletState.balanceSol : telemetry.currentBalanceSol}
        currentSlot={telemetry.currentSlot}
        defaultSlippageBps={Math.round(executionConfig.slippagePct * 100)}
        walletState={walletState}
        onSwapSuccess={async (result, tokenInfo) => {
          await openLivePosition(result, tokenInfo || targetToken);
          setIsJupiterModalOpen(false);
          setCustomSwapMint(undefined);
        }}
      />

      <AutoSnipeModal
        isOpen={isAutoSnipeModalOpen}
        onClose={() => setIsAutoSnipeModalOpen(false)}
        config={autoSnipeConfig}
        onSaveConfig={updateAutoSnipeConfig}
        currentBalanceSol={walletState.isConnected ? walletState.balanceSol : telemetry.currentBalanceSol}
      />

      <EarlyGemsModal
        isOpen={isEarlyGemsOpen}
        onClose={() => setIsEarlyGemsOpen(false)}
      />

      <ExecutionSettingsModal
        isOpen={isExecutionModalOpen}
        onClose={() => setIsExecutionModalOpen(false)}
        config={executionConfig}
        onSaveConfig={updateExecutionConfig}
      />

      <GeminiNarrativeModal
        isOpen={isGeminiModalOpen}
        onClose={() => setIsGeminiModalOpen(false)}
        token={targetToken}
      />

      <PnlShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        trade={shareTrade || activePosition}
      />

      <JitoBundleTrackerModal
        isOpen={isJitoTrackerOpen}
        onClose={() => setIsJitoTrackerOpen(false)}
        receipt={latestJitoReceipt}
      />

      <KeyboardShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />

      <RpcManagerModal
        isOpen={isRpcModalOpen}
        onClose={() => setIsRpcModalOpen(false)}
      />

      <SolConverterModal
        isOpen={isConverterOpen}
        onClose={() => setIsConverterOpen(false)}
      />

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSuccess={() => {
          appendLog('SYSTEM', 'SUCCESS', 'Master Admin Passcode berhasil diubah via web terminal.');
        }}
      />

      <SmartMoneyModal
        isOpen={isSmartMoneyOpen}
        onClose={() => setIsSmartMoneyOpen(false)}
        onLogMessage={appendLog}
      />

      <VpsBotModal
        isOpen={isVpsBotOpen}
        onClose={() => setIsVpsBotOpen(false)}
      />

      {/* Floating Pro Trader Hotkeys Trigger Button */}
      <button
        onClick={() => setIsShortcutsModalOpen(true)}
        aria-label="Buka Pro Trader Keyboard Shortcuts"
        className="fixed bottom-4 right-4 z-30 p-2.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700/80 text-zinc-400 hover:text-zinc-100 shadow-[0_0_20px_rgba(0,0,0,0.6)] flex items-center gap-2 text-xs font-mono backdrop-blur-md transition-all cursor-pointer group"
        title="Buka Pro Trader Keyboard Shortcuts (?)"
      >
        <span className="w-5 h-5 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/40 flex items-center justify-center font-black text-[10px] group-hover:scale-110 transition-transform">
          ?
        </span>
        <span className="hidden sm:inline font-bold">Hotkeys</span>
      </button>
    </div>
  );
}

export default function TerminalDashboard() {
  return (
    <TradingProvider>
      <TerminalAppInner />
    </TradingProvider>
  );
}
