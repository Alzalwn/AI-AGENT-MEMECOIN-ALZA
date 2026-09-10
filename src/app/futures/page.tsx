'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TradingProvider, useTradingAgent } from '@/context/TradingContext';
import Header from '@/components/dashboard/Header';
import { FuturesDashboard } from '@/components/futures/FuturesDashboard';
import WalletConnectModal from '@/components/WalletConnectModal';
import StrategyPresetModal from '@/components/StrategyPresetModal';
import TelegramSettingsModal from '@/components/TelegramSettingsModal';
import { EarlyGemsModal } from '@/components/EarlyGemsModal';
import ExecutionSettingsModal from '@/components/ExecutionSettingsModal';
import ChangePasswordModal from '@/components/ChangePasswordModal';
import SmartMoneyModal from '@/components/SmartMoneyModal';
import { VpsBotModal } from '@/components/VpsBotModal';
import { AutoSnipeModal } from '@/components/AutoSnipeModal';
import { FuturesAIChat } from '@/components/chat/FuturesAIChat';

function FuturesPageInner() {
  const router = useRouter();
  const {
    telemetry,
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
    agentThresholds,
    setAgentThresholds,
    appendLog,
  } = useTradingAgent();

  const [selectedTipTier, setSelectedTipTier] = useState<'ECONOMY' | 'STANDARD' | 'FAST' | 'TURBO'>('STANDARD');

  // Modals state for Header actions
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isStrategyModalOpen, setIsStrategyModalOpen] = useState(false);
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
  const [isEarlyGemsOpen, setIsEarlyGemsOpen] = useState(false);
  const [isExecutionModalOpen, setIsExecutionModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isSmartMoneyOpen, setIsSmartMoneyOpen] = useState(false);
  const [isVpsBotOpen, setIsVpsBotOpen] = useState(false);
  const [isAutoSnipeModalOpen, setIsAutoSnipeModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-yellow-500/30 selection:text-yellow-300">
      {/* Global Navigation Header with Dual-Dashboard Switcher */}
      <Header
        activeDashboard="binance-futures"
        onSwitchDashboard={(dash) => {
          if (dash === 'memecoin') {
            router.push('/');
          }
        }}
        onOpenWallet={() => setIsWalletModalOpen(true)}
        onOpenStrategy={() => setIsStrategyModalOpen(true)}
        onOpenAlerts={() => setIsTelegramModalOpen(true)}
        onOpenAnalytics={() => setIsEarlyGemsOpen(true)}
        onOpenExecution={() => setIsExecutionModalOpen(true)}
        onOpenPassword={() => setIsPasswordModalOpen(true)}
        onOpenSmartMoney={() => setIsSmartMoneyOpen(true)}
        onOpenVpsBot={() => setIsVpsBotOpen(true)}
        onOpenAutoSnipe={() => setIsAutoSnipeModalOpen(true)}
      />

      {/* Main Workspace Body: Binance Futures Terminal */}
      <main className="p-3.5 sm:p-5 flex-1 flex flex-col gap-4 max-w-[1920px] mx-auto w-full">
        <FuturesDashboard />
      </main>

      {/* Shared Modals */}
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
          updateAgentConfig({
            takeProfitMultiplier: thresholds.targetTakeProfitR,
            trailingStopLossPct: thresholds.trailingStopLossR,
            antiRugpull: {
              ...agentConfig.antiRugpull,
              requireMintRevoked: thresholds.requireMintRevoked,
              requireFreezeRevoked: thresholds.requireFreezeRevoked,
              maxTop10HoldersPct: thresholds.maxTop10HoldersPct,
            },
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
      <EarlyGemsModal isOpen={isEarlyGemsOpen} onClose={() => setIsEarlyGemsOpen(false)} />
      <ExecutionSettingsModal
        isOpen={isExecutionModalOpen}
        onClose={() => setIsExecutionModalOpen(false)}
        config={executionConfig}
        onSaveConfig={updateExecutionConfig}
      />
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSuccess={() => {
          appendLog('SYSTEM', 'SUCCESS', 'Master Admin Passcode berhasil diubah.');
        }}
      />
      <SmartMoneyModal
        isOpen={isSmartMoneyOpen}
        onClose={() => setIsSmartMoneyOpen(false)}
        onLogMessage={appendLog}
      />
      <VpsBotModal isOpen={isVpsBotOpen} onClose={() => setIsVpsBotOpen(false)} />
      <AutoSnipeModal
        isOpen={isAutoSnipeModalOpen}
        onClose={() => setIsAutoSnipeModalOpen(false)}
        config={autoSnipeConfig}
        onSaveConfig={updateAutoSnipeConfig}
        currentBalanceSol={walletState.isConnected ? walletState.balanceSol : telemetry.currentBalanceSol}
      />

      {/* Floating AI Assistant Chatbot */}
      <FuturesAIChat />
    </div>
  );
}

export default function FuturesPage() {
  return (
    <TradingProvider>
      <FuturesPageInner />
    </TradingProvider>
  );
}
