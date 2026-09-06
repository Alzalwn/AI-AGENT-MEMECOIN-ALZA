'use client';

import React, { useState } from 'react';
import { TradingProvider, useTradingAgent } from '../context/TradingContext';
import Header from '../components/dashboard/Header';
import MetricCards from '../components/dashboard/MetricCards';
import PositionsTable from '../components/dashboard/PositionsTable';
import TerminalLogs from '../components/dashboard/TerminalLogs';
import ConfigPanel from '../components/dashboard/ConfigPanel';
import DeskFeed from '../components/dashboard/DeskFeed';
import ConsensusEvaluator from '../components/dashboard/ConsensusEvaluator';
import ManualMintSniper from '../components/dashboard/ManualMintSniper';
import CumulativeCurve from '../components/CumulativeCurve';

// Modals
import WalletConnectModal from '../components/WalletConnectModal';
import StrategyPresetModal from '../components/StrategyPresetModal';
import TelegramSettingsModal from '../components/TelegramSettingsModal';
import { JupiterSwapModal } from '../components/JupiterSwapModal';
import { AutoSnipeModal } from '../components/AutoSnipeModal';
import PerformanceStatsModal from '../components/PerformanceStatsModal';
import ExecutionSettingsModal from '../components/ExecutionSettingsModal';
import GeminiNarrativeModal from '../components/GeminiNarrativeModal';
import PnlShareModal from '../components/PnlShareModal';
import JitoBundleTrackerModal from '../components/JitoBundleTrackerModal';
import KeyboardShortcutsModal from '../components/KeyboardShortcutsModal';
import RpcManagerModal from '../components/RpcManagerModal';
import SolConverterModal from '../components/SolConverterModal';
import ConfirmSnipeModal from '../components/ConfirmSnipeModal';
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
    appendLog
  } = useTradingAgent();

  // Strategy thresholds — mirrors agentConfig; initialized from BALANCED preset
  const [agentThresholds, setAgentThresholds] = React.useState<import('../types/terminal').AgentThresholds>(() => STRATEGY_PRESETS.BALANCED);

  // Jito Tip Tier selection (matches WalletConnectModal's ECONOMY | STANDARD | FAST | TURBO)
  const [selectedTipTier, setSelectedTipTier] = React.useState<'ECONOMY' | 'STANDARD' | 'FAST' | 'TURBO'>('STANDARD');

  // Modal Visibility States
  const [isWalletModalOpen, setIsWalletModalOpen] = useState<boolean>(false);
  const [isStrategyModalOpen, setIsStrategyModalOpen] = useState<boolean>(false);
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState<boolean>(false);
  const [isStatsModalOpen, setIsStatsModalOpen] = useState<boolean>(false);
  const [isExecutionModalOpen, setIsExecutionModalOpen] = useState<boolean>(false);
  const [isJupiterModalOpen, setIsJupiterModalOpen] = useState<boolean>(false);
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
        setIsStatsModalOpen((prev) => !prev);
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
        onOpenAnalytics={() => setIsStatsModalOpen(true)}
        onOpenExecution={() => setIsExecutionModalOpen(true)}
        onOpenJupiter={() => setIsJupiterModalOpen(true)}
        onOpenRpc={() => setIsRpcModalOpen(true)}
        onOpenShortcuts={() => setIsShortcutsModalOpen(true)}
        onOpenConverter={() => setIsConverterOpen(true)}
        onOpenPassword={() => setIsPasswordModalOpen(true)}
        onOpenSmartMoney={() => setIsSmartMoneyOpen(true)}
        onOpenVpsBot={() => setIsVpsBotOpen(true)}
      />

      {/* Main Workspace Body */}
      <main className="p-3.5 sm:p-5 flex-1 flex flex-col gap-4 max-w-[1920px] mx-auto w-full">
        {/* 2. KPI Metric Cards */}
        <MetricCards />

        {/* 3. Manual Mint Address Sniper & On-Chain Lookup */}
        <ManualMintSniper onOpenJitoTracker={() => setIsJitoTrackerOpen(true)} />

        {/* 4. Cumulative PnL Curve & Equity Chart */}
        <CumulativeCurve
          currentBalanceSol={telemetry.currentBalanceSol}
          initialBalanceSol={telemetry.initialBalanceSol}
          totalPnlSol={telemetry.totalPnlSol}
        />

        {/* 5. Core 3-Column Trading Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
          {/* Left Column: Desk Feed (Real-Time Ingestion Stream) */}
          <div className="lg:col-span-4">
            <DeskFeed />
          </div>

          {/* Middle Column: 4D Strategy Radar & 5-Agent Evaluator */}
          <div className="lg:col-span-5">
            <ConsensusEvaluator
              onOpenGemini={() => setIsGeminiModalOpen(true)}
              onOpenJupiterSwap={() => setIsJupiterModalOpen(true)}
              onShareTrade={(trade) => {
                setShareTrade(trade);
                setIsShareModalOpen(true);
              }}
              onOpenAnalytics={() => setIsStatsModalOpen(true)}
            />
          </div>

          {/* Right Column: Positions, Logs, and Configuration Controls */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <PositionsTable
              onSharePnl={() => {
                setShareTrade(activePosition);
                setIsShareModalOpen(true);
              }}
            />
            <TerminalLogs />
            <ConfigPanel onOpenPasswordModal={() => setIsPasswordModalOpen(true)} />
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
                1 - 6
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
            Grok Trencher Solana Autonomous Engine • Zero-Leak MEV Security
          </span>
        </footer>
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
        onClose={() => setIsJupiterModalOpen(false)}
        token={targetToken}
        currentBalanceSol={walletState.isConnected ? walletState.balanceSol : telemetry.currentBalanceSol}
        currentSlot={telemetry.currentSlot}
        defaultSlippageBps={Math.round(executionConfig.slippagePct * 100)}
        walletState={walletState}
        onSwapSuccess={(result) => {
          const spent = result.inAmountSol || 0.1;
          if (walletState.isConnected) {
            updateWalletState({
              ...walletState,
              balanceSol: Math.max(0, +(walletState.balanceSol - spent).toFixed(4))
            });
          }
          appendLog('EXECUTION', 'SUCCESS', `Jupiter Swap Berhasil: Beli ${result.outAmountFormatted} ${result.symbol} seharga ${spent} SOL (-${spent} SOL)`);
          setIsJupiterModalOpen(false);
        }}
      />

      <AutoSnipeModal
        isOpen={isAutoSnipeModalOpen}
        onClose={() => setIsAutoSnipeModalOpen(false)}
        config={autoSnipeConfig}
        onSaveConfig={updateAutoSnipeConfig}
        currentBalanceSol={walletState.isConnected ? walletState.balanceSol : telemetry.currentBalanceSol}
      />

      <PerformanceStatsModal
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
        trades={closedTrades}
        telemetry={telemetry}
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

      <ConfirmSnipeModal />

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
