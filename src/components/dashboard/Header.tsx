'use client';

import React, { useState } from 'react';
import { useTradingAgent } from '../../hooks/useTradingAgent';
import {
  Activity,
  Zap,
  Volume2,
  VolumeX,
  Sliders,
  Bell,
  BarChart3,
  SlidersHorizontal,
  Wallet,
  AlertOctagon,
  Play,
  Pause,
  Layers,
  Radio,
  ExternalLink,
  RefreshCw,
  Keyboard,
  LogOut
} from 'lucide-react';
import { rpcFailoverInstance } from '../../lib/rpcFailover';
import { useSolRate } from '../../hooks/useSolRate';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import ConfirmModal from '../ui/ConfirmModal';

interface HeaderProps {
  onOpenWallet: () => void;
  onOpenStrategy: () => void;
  onOpenAlerts: () => void;
  onOpenAnalytics: () => void;
  onOpenExecution: () => void;
  onOpenJupiter?: () => void;
  onOpenRpc?: () => void;
  onOpenShortcuts?: () => void;
  onOpenConverter?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenWallet,
  onOpenStrategy,
  onOpenAlerts,
  onOpenAnalytics,
  onOpenExecution,
  onOpenJupiter,
  onOpenRpc,
  onOpenShortcuts,
  onOpenConverter
}) => {
  const {
    engineStatus,
    toggleEngine,
    emergencyKillSwitch,
    networkMetrics,
    walletState,
    isAudioMuted,
    toggleAudio,
    activePosition,
    executionConfig
  } = useTradingAgent();

  const { rate, formatIdrShort, formatUsd } = useSolRate();

  const [isKillModalOpen, setIsKillModalOpen] = useState<boolean>(false);

  const isAutonomous = engineStatus === 'AUTONOMOUS';

  return (
    <>
      <header className="bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 p-3 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4 font-mono sticky top-0 z-40">
        {/* Left: Brand & Bot Status */}
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/10 border border-emerald-500/40 flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.3)]">
              <Zap className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-black text-sm sm:text-base tracking-wider text-zinc-100 uppercase">
                  Grok Trencher
                </h1>
                <Badge variant="cyan" size="xs">
                  v2.0 PRO
                </Badge>
              </div>
              <p className="text-[10px] text-zinc-500 hidden sm:block">
                Multi-Agent Solana Sniper & Jito MEV Defense Terminal
              </p>
            </div>
          </div>

          {/* Bot State Indicator */}
          <div className="flex items-center gap-2">
            <Badge
              variant={isAutonomous ? 'emerald' : 'amber'}
              size="xs"
              dot
              pulse={isAutonomous}
            >
              {isAutonomous ? 'AUTONOMOUS BOT' : 'MANUAL / PAUSED'}
            </Badge>

            <button
              onClick={toggleEngine}
              title={isAutonomous ? 'Pause Autonomous Engine' : 'Resume Autonomous Engine'}
              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
            >
              {isAutonomous ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
            </button>
          </div>
        </div>

        {/* Middle: RPC & Network Telemetry with Sub-100ms Failover (PRD Section 7.2) */}
        <div className="hidden lg:flex items-center gap-5 text-[11px] bg-zinc-900/60 border border-zinc-800/80 px-3.5 py-1.5 rounded-xl">
          <button
            onClick={() => (onOpenRpc ? onOpenRpc() : rpcFailoverInstance.triggerFailover('Manual failover test'))}
            title="Klik untuk membuka RPC Manager & Latency Benchmark (PRD §7.2)"
            className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-100 transition-all cursor-pointer group"
          >
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse group-hover:scale-110" />
            <span>RPC:</span>
            <span className="text-zinc-200 font-bold group-hover:underline">{networkMetrics.rpcLabel}</span>
            <span className="text-[10px] text-emerald-400">({networkMetrics.latencyMs}ms)</span>
            <RefreshCw className="w-2.5 h-2.5 opacity-40 group-hover:opacity-100 transition-opacity ml-0.5" />
          </button>

          <div className="h-3 w-px bg-zinc-800" />

          <div className="flex items-center gap-1.5 text-zinc-400">
            <span>Slot:</span>
            <span className="text-zinc-200 font-bold">#{networkMetrics.currentSlot}</span>
          </div>

          <div className="h-3 w-px bg-zinc-800" />

          <div className="flex items-center gap-1.5 text-zinc-400">
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>Jito Tip:</span>
            <span className="text-cyan-400 font-bold">{networkMetrics.jitoTipSol} SOL</span>
          </div>

          <div className="h-3 w-px bg-zinc-800" />

          {/* Live SOL Price in Rupiah & USD */}
          <button
            onClick={() => onOpenConverter?.()}
            title="Klik untuk membuka Kalkulator Kurs SOL ⇄ Rupiah (IDR) & USD"
            className="flex items-center gap-1.5 text-zinc-300 hover:text-purple-300 transition-all cursor-pointer group"
          >
            <span className="text-purple-400 font-bold">1 SOL =</span>
            <span className="text-emerald-400 font-bold group-hover:underline">
              {formatIdrShort(1)}
            </span>
            <span className="text-[10px] text-zinc-500 hidden xl:inline">
              ({formatUsd(1)})
            </span>
            <span
              className={`text-[9px] px-1 py-0.2 rounded font-bold ${
                rate.change24h >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
              }`}
            >
              {rate.change24h >= 0 ? '+' : ''}
              {rate.change24h.toFixed(1)}%
            </span>
          </button>
        </div>

        {/* Right: Quick Tools & Emergency Kill Switch */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
          {/* Quick SOL Converter Pill (Visible on all screens) */}
          <button
            onClick={() => onOpenConverter?.()}
            title="Kalkulator Kurs: 1 SOL = Berapa Rupiah / USD"
            className="lg:hidden flex items-center gap-1.5 bg-gradient-to-r from-purple-500/10 to-emerald-500/10 hover:from-purple-500/20 hover:to-emerald-500/20 border border-purple-500/30 px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-zinc-200 transition-all cursor-pointer active:scale-95"
          >
            <span className="text-purple-400">SOL:</span>
            <span className="text-emerald-400">{formatIdrShort(1)}</span>
          </button>
          {/* Audio Synthesizer */}
          <button
            onClick={toggleAudio}
            title={isAudioMuted ? 'Aktifkan Audio Telemetri' : 'Bisukan Audio'}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
          >
            {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Keyboard Shortcuts Cheat Sheet */}
          {onOpenShortcuts && (
            <button
              onClick={onOpenShortcuts}
              title="Keyboard Shortcuts Cheat Sheet (?)"
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
            >
              <Keyboard className="w-4 h-4 text-purple-400" />
            </button>
          )}

          {/* Strategy Presets */}
          <button
            onClick={onOpenStrategy}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer flex items-center gap-1.5 text-xs"
            title="Konfigurasi Preset Strategi 5-Agen"
          >
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span className="hidden xl:inline text-[11px] font-bold">Strategy</span>
          </button>

          {/* Omnichannel Alerts */}
          <button
            onClick={onOpenAlerts}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer flex items-center gap-1.5 text-xs"
            title="Telegram & Discord Webhook Alerts"
          >
            <Bell className="w-4 h-4 text-emerald-400" />
            <span className="hidden xl:inline text-[11px] font-bold">Alerts</span>
          </button>

          {/* Performance Analytics */}
          <button
            onClick={onOpenAnalytics}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer flex items-center gap-1.5 text-xs"
            title="Performance Stats ($E[R]$ Expectancy & Winrate)"
          >
            <BarChart3 className="w-4 h-4 text-amber-400" />
            <span className="hidden xl:inline text-[11px] font-bold">Analytics</span>
          </button>

          {/* Execution Settings */}
          <button
            onClick={onOpenExecution}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer flex items-center gap-1.5 text-xs"
            title="Slippage & Priority Fee Settings"
          >
            <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
            <span className="hidden xl:inline text-[11px] font-bold">Slip: {executionConfig.slippagePct}%</span>
          </button>

          {/* Web3 Wallet Button */}
          <Button
            variant={walletState.isConnected ? 'outline' : 'secondary'}
            size="sm"
            onClick={onOpenWallet}
            leftIcon={<Wallet className="w-3.5 h-3.5 text-emerald-400" />}
          >
            {walletState.isConnected ? (
              <span className="flex items-center gap-1">
                <span>{walletState.balanceSol.toFixed(2)} SOL</span>
                <span className="text-[10px] text-zinc-400 hidden xl:inline">
                  (≈ {formatIdrShort(walletState.balanceSol)})
                </span>
              </span>
            ) : (
              <span>Connect Wallet</span>
            )}
          </Button>

          {/* EMERGENCY KILL-SWITCH */}
          <Button
            variant="danger"
            size="sm"
            onClick={() => setIsKillModalOpen(true)}
            leftIcon={<AlertOctagon className="w-3.5 h-3.5 animate-pulse" />}
            glow
          >
            KILL-SWITCH
          </Button>

          {/* LOCK / LOGOUT SESSION */}
          <button
            onClick={async () => {
              if (confirm('Kunci terminal dan akhiri sesi admin sekarang?')) {
                await fetch('/api/auth/logout', { method: 'POST' });
                window.location.href = '/login';
              }
            }}
            title="Kunci Akses Terminal (Logout)"
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-500 hover:text-rose-400 hover:border-rose-500/40 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Confirmation Modal for Kill Switch */}
      <ConfirmModal
        isOpen={isKillModalOpen}
        onClose={() => setIsKillModalOpen(false)}
        onConfirm={() => emergencyKillSwitch()}
        title="AKTIFKAN EMERGENCY KILL-SWITCH?"
        description={
          activePosition
            ? `Peringatan: Posisi aktif pada ${activePosition.token.symbol} (${activePosition.pnlPct}%) akan langsung dilikuidasi ke SOL via private mempool Jito dan seluruh bot autonomous akan dihentikan seketika.`
            : 'Seluruh bot autonomous akan dihentikan seketika dan status bot diubah ke PAUSED/IDLE.'
        }
        confirmText="YA, DUMP & HALT SEMUA"
        cancelText="BATAL"
        variant="danger"
      />
    </>
  );
};

export default Header;
