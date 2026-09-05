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
import { TelegramConfig } from '../lib/telegram';
import { DiscordConfig } from '../lib/discord';
import { JitoBundleReceipt } from '../lib/jito';
import { STRATEGY_PRESETS } from '../config/constants';
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
    executionConfig,
    updateExecutionConfig,
    autoSnipeConfig,
    updateAutoSnipeConfig,
    engineStatus,
    toggleEngine,
    setVisualMode,
    toggleAudio,
    isAudioMuted
  } = useTradingAgent();

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
  const [isJitoTrackerOpen, setIsJitoTrackerOpen] = useState<boolean>(false);

  // Webhook Alert Configs
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('GT_TELEGRAM_CONFIG');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return { isEnabled: false, botToken: '', chatId: '', minGrokScore: 80 };
  });

  const [discordConfig, setDiscordConfig] = useState<DiscordConfig>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('GT_DISCORD_CONFIG');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {}
      }
    }
    return { isEnabled: false, webhookUrl: '', minGrokScore: 80 };
  });

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
            />
          </div>

          {/* Right Column: Positions, Logs, and Configuration Controls */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <PositionsTable onSharePnl={() => setIsShareModalOpen(true)} />
            <TerminalLogs />
            <ConfigPanel />
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
                1 - 5
              </kbd>
              <span>Switch Visualizer</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-zinc-800 border border-zinc-700 rounded text-zinc-200 font-bold">
                M
              </kbd>
              <span>{isAudioMuted ? 'Unmute' : 'Mute'}</span>
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
        selectedTipTier="STANDARD"
        onSelectTipTier={() => {}}
      />

      <StrategyPresetModal
        isOpen={isStrategyModalOpen}
        onClose={() => setIsStrategyModalOpen(false)}
        currentThresholds={STRATEGY_PRESETS.BALANCED}
        onSaveThresholds={() => {}}
      />

      <TelegramSettingsModal
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
        config={telegramConfig}
        onSaveConfig={(cfg) => {
          setTelegramConfig(cfg);
          if (typeof window !== 'undefined') {
            localStorage.setItem('GT_TELEGRAM_CONFIG', JSON.stringify(cfg));
          }
        }}
        discordConfig={discordConfig}
        onSaveDiscordConfig={(cfg) => {
          setDiscordConfig(cfg);
          if (typeof window !== 'undefined') {
            localStorage.setItem('GT_DISCORD_CONFIG', JSON.stringify(cfg));
          }
        }}
      />

      <JupiterSwapModal
        isOpen={isJupiterModalOpen}
        onClose={() => setIsJupiterModalOpen(false)}
        token={targetToken}
        currentBalanceSol={telemetry.currentBalanceSol}
        currentSlot={telemetry.currentSlot}
        defaultSlippageBps={Math.round(executionConfig.slippagePct * 100)}
        onSwapSuccess={() => {}}
      />

      <AutoSnipeModal
        isOpen={isAutoSnipeModalOpen}
        onClose={() => setIsAutoSnipeModalOpen(false)}
        config={autoSnipeConfig}
        onSaveConfig={updateAutoSnipeConfig}
        currentBalanceSol={telemetry.currentBalanceSol}
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
        trade={activePosition}
      />

      <JitoBundleTrackerModal
        isOpen={isJitoTrackerOpen}
        onClose={() => setIsJitoTrackerOpen(false)}
        receipt={latestJitoReceipt}
      />
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
