'use client';

import React, { useState } from 'react';
import { useTradingAgent } from '../../hooks/useTradingAgent';
import { useSupabaseRealtime } from '../../hooks/useSupabaseRealtime';
import {
  Activity,
  Zap,
  Volume2,
  VolumeX,
  Sliders,
  Bell,
  BarChart3,
  Wallet,
  Play,
  Pause,
  Layers,
  Radio,
  ExternalLink,
  RefreshCw,
  Keyboard,
  LogOut,
  KeyRound,
  Menu,
  X as CloseIcon,
  Users,
  Server,
  Database,
  Send,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';
import { rpcFailoverInstance } from '../../lib/rpcFailover';
import { useSolRate } from '../../hooks/useSolRate';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { ScannerStatus } from './ScannerStatus';

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
  onOpenPassword?: () => void;
  onOpenSmartMoney?: () => void;
  onOpenVpsBot?: () => void;
  onOpenAutoSnipe?: () => void;
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
  onOpenConverter,
  onOpenPassword,
  onOpenSmartMoney,
  onOpenVpsBot,
  onOpenAutoSnipe
}) => {
  const {
    engineStatus,
    toggleEngine,
    networkMetrics,
    walletState,
    isAudioMuted,
    toggleAudio,
    autoSnipeConfig,
    telegramConfig
  } = useTradingAgent();

  const { rate, formatIdrShort, formatUsd } = useSolRate();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

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
                  AI Alpha Signal
                </h1>
                <Badge variant="cyan" size="xs">
                  v2.0 PRO
                </Badge>
              </div>
              <p className="text-[10px] text-zinc-500 hidden sm:block">
                Multi-Agent AI Consensus Signal Terminal
              </p>
            </div>
          </div>

          {/* Bot State Indicator & Style Badge */}
          <div className="flex items-center gap-2">
            <Badge
              variant={isAutonomous ? 'emerald' : 'amber'}
              size="xs"
              dot
              pulse={isAutonomous}
            >
              {isAutonomous ? 'SIGNAL ENGINE: ON' : 'ENGINE: PAUSED'}
            </Badge>

            <button
              onClick={toggleEngine}
              title={isAutonomous ? 'Jeda Engine Sinyal' : 'Mulai Engine Sinyal'}
              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
            >
              {isAutonomous ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
            </button>

            {/* Quick Trading Style Badge / Switcher */}
            <button
              onClick={() => (onOpenAutoSnipe ? onOpenAutoSnipe() : onOpenStrategy())}
              title="Klik untuk membuka Pengaturan Sinyal (Profil Target, Throttling & Filter)"
              className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-800 hover:border-cyan-500/40 transition-all cursor-pointer text-[10px] shadow-sm"
            >
              <span className="text-zinc-500 font-bold">SINYAL:</span>
              <span className={`font-black tracking-wide ${
                autoSnipeConfig.tradingStyle === 'HODL'
                  ? 'text-cyan-400'
                  : autoSnipeConfig.tradingStyle === 'SWING'
                  ? 'text-purple-400'
                  : 'text-emerald-400'
              }`}>
                {autoSnipeConfig.tradingStyle === 'HODL'
                  ? 'ðŸ’Ž MOONBAG'
                  : autoSnipeConfig.tradingStyle === 'SWING'
                  ? 'ðŸ“ˆ SWING'
                  : 'âš¡ SCALP'}
              </span>
            </button>
          </div>
        </div>

        {/* Middle: RPC & Network Telemetry with Sub-100ms Failover (PRD Section 7.2) */}
        <div className="hidden lg:flex items-center gap-5 text-[11px] bg-zinc-900/60 border border-zinc-800/80 px-3.5 py-1.5 rounded-xl">
          <button
            onClick={() => (onOpenRpc ? onOpenRpc() : rpcFailoverInstance.triggerFailover('Manual failover test'))}
            title="Klik untuk membuka RPC Manager & Latency Benchmark (PRD Â§7.2)"
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

          {/* Scanner Live Sniffing & Rejection Counter Heartbeat */}
          <ScannerStatus variant="compact" />

          <div className="h-3 w-px bg-zinc-800" />

          {/* Supabase Realtime Connection Indicator */}
          <SupabaseRealtimeIndicator />

          <div className="h-3 w-px bg-zinc-800" />

          {/* Live SOL Price in Rupiah & USD */}
          <button
            onClick={() => onOpenConverter?.()}
            title="Klik untuk membuka Kalkulator Kurs SOL â‡„ Rupiah (IDR) & USD"
            aria-label="Kalkulator Kurs SOL ke Rupiah dan USD"
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
            aria-label="Kalkulator Kurs SOL Mobile"
            className="lg:hidden flex items-center gap-1.5 bg-gradient-to-r from-purple-500/10 to-emerald-500/10 hover:from-purple-500/20 hover:to-emerald-500/20 border border-purple-500/30 px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-zinc-200 transition-all cursor-pointer active:scale-95"
          >
            <span className="text-purple-400">SOL:</span>
            <span className="text-emerald-400">{formatIdrShort(1)}</span>
          </button>
          {/* Audio Synthesizer */}
          <button
            onClick={toggleAudio}
            title={isAudioMuted ? 'Aktifkan Audio Telemetri' : 'Bisukan Audio'}
            aria-label={isAudioMuted ? 'Aktifkan Audio Telemetri' : 'Bisukan Audio'}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
          >
            {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {/* Keyboard Shortcuts Cheat Sheet (Desktop) */}
          {onOpenShortcuts && (
            <button
              onClick={onOpenShortcuts}
              title="Keyboard Shortcuts Cheat Sheet (?)"
              aria-label="Buka Keyboard Shortcuts"
              className="hidden lg:flex p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
            >
              <Keyboard className="w-4 h-4 text-purple-400" />
            </button>
          )}

          {/* Strategy Presets (Desktop) */}
          <button
            onClick={onOpenStrategy}
            className="hidden lg:flex p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer items-center gap-1.5 text-xs"
            title="Konfigurasi Preset Strategi 5-Agen"
            aria-label="Buka Strategy Presets"
          >
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span className="hidden xl:inline text-[11px] font-bold">Strategy</span>
          </button>

          {/* Omnichannel Alerts (Desktop) */}
          <button
            onClick={onOpenAlerts}
            className="hidden lg:flex p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer items-center gap-1.5 text-xs"
            title="Telegram & Discord Webhook Alerts"
            aria-label="Buka Omnichannel Alerts"
          >
            <Bell className="w-4 h-4 text-emerald-400" />
            <span className="hidden xl:inline text-[11px] font-bold">Alerts</span>
          </button>

          {/* Early Gems Hunter (<$100k MC) */}
          <button
            onClick={onOpenAnalytics}
            className="hidden lg:flex p-2 rounded-xl bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-cyan-500/20 border border-emerald-500/40 text-emerald-400 hover:text-emerald-300 transition-all cursor-pointer items-center gap-1.5 text-xs shadow-[0_0_12px_rgba(16,185,129,0.18)]"
            title="Radar Koin Early Sub-$100k Market Cap (Potensi 5x - 50x)"
            aria-label="Buka Radar Koin Early Sub-$100k"
          >
            <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="hidden xl:inline text-[11px] font-black tracking-wide">Gems &lt;$100k</span>
          </button>

          {/* Smart Money Copy-Trading (Desktop) */}
          {onOpenSmartMoney && (
            <button
              onClick={onOpenSmartMoney}
              className="hidden lg:flex p-2 rounded-xl bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 hover:from-emerald-500/20 hover:to-cyan-500/20 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 transition-all cursor-pointer items-center gap-1.5 text-xs shadow-[0_0_10px_rgba(16,185,129,0.15)]"
              title="Smart Money & Whale Tracker (Copy-Trading)"
              aria-label="Buka Smart Money Tracker"
            >
              <Users className="w-4 h-4 text-emerald-400" />
              <span className="hidden xl:inline text-[11px] font-bold">Copy-Trade</span>
            </button>
          )}

          {/* VPS Autonomous Sniper 24/7 (Desktop) */}
          {onOpenVpsBot && (
            <button
              onClick={onOpenVpsBot}
              className="hidden lg:flex p-2 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:text-purple-200 transition-all cursor-pointer items-center gap-1.5 text-xs shadow-[0_0_10px_rgba(168,85,247,0.15)]"
              title="VPS 24/7 Autonomous Signal Bot (Hot Wallet & PM2)"
              aria-label="Buka VPS Bot Status"
            >
              <Server className="w-4 h-4 text-purple-400" />
              <span className="hidden xl:inline text-[11px] font-bold">VPS Bot (24/7)</span>
            </button>
          )}

          {/* VPS Monitor & Supabase Data Explorer (Desktop) */}
          <Link
            href="/vps-explorer"
            className="hidden lg:flex p-2 rounded-xl bg-[#3ecf8e]/10 hover:bg-[#3ecf8e]/20 border border-[#3ecf8e]/30 text-[#3ecf8e] hover:text-emerald-300 transition-all cursor-pointer items-center gap-1.5 text-xs shadow-[0_0_10px_rgba(62,207,142,0.15)]"
            title="Buka VPS Monitor & Data Explorer (Supabase Table Editor & Live PM2 Terminal)"
            aria-label="Buka VPS Monitor & Data Explorer"
          >
            <Database className="w-4 h-4 text-[#3ecf8e]" />
            <span className="hidden xl:inline text-[11px] font-bold">VPS & Explorer</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#3ecf8e] animate-pulse" />
          </Link>

          {/* Telegram Live Broadcast Status Pill */}
          <button
            onClick={onOpenAlerts}
            title={
              telegramConfig?.isEnabled && telegramConfig?.botToken && telegramConfig?.chatId
                ? 'Telegram Webhook Aktif: Sinyal otomatis disiarkan ke channel/chat Telegram'
                : 'Klik untuk menghubungkan Bot Telegram (Auto-Broadcast)'
            }
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-mono font-bold border transition-all cursor-pointer ${
              telegramConfig?.isEnabled && telegramConfig?.botToken && telegramConfig?.chatId
                ? 'bg-blue-500/15 border-blue-500/40 text-blue-300 shadow-[0_0_10px_rgba(59,130,246,0.25)]'
                : 'bg-zinc-900/90 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
            }`}
          >
            <Send className={`w-3.5 h-3.5 ${telegramConfig?.isEnabled && telegramConfig?.botToken && telegramConfig?.chatId ? 'text-blue-400 animate-pulse' : 'text-zinc-500'}`} />
            <span className="hidden sm:inline text-zinc-400">TG:</span>
            <span>{telegramConfig?.isEnabled && telegramConfig?.botToken && telegramConfig?.chatId ? 'Aktif âœ…' : 'Setup'}</span>
          </button>

          {/* AI Consensus Live Scanner Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="hidden sm:inline">CONSENSUS</span>
            <span>LIVE</span>
          </div>

          {/* Web3 Wallet Button */}
          <Button
            variant={walletState.isConnected ? 'outline' : 'secondary'}
            size="sm"
            onClick={onOpenWallet}
            aria-label={walletState.isConnected ? `Wallet terhubung: ${walletState.balanceSol} SOL` : 'Koneksikan Web3 Solana Wallet'}
            leftIcon={<Wallet className="w-3.5 h-3.5 text-emerald-400" />}
          >
            {walletState.isConnected ? (
              <span className="flex items-center gap-1.5 font-bold">
                <span className="text-emerald-400">
                  {walletState.balanceSol < 1 && walletState.balanceSol > 0
                    ? walletState.balanceSol.toFixed(4)
                    : walletState.balanceSol.toFixed(2)}{' '}
                  SOL
                </span>
                <span className="text-[10px] text-zinc-400 hidden xl:inline">
                  ({walletState.publicKey})
                </span>
              </span>
            ) : (
              <span>Connect Wallet</span>
            )}
          </Button>

          {/* GANTI PASSWORD / SECURITY (Desktop) */}
          {onOpenPassword && (
            <button
              onClick={onOpenPassword}
              title="Pengaturan Keamanan: Ganti Password Master (Aktif: Alza0839)"
              aria-label="Ganti Password Master Terminal"
              className="hidden lg:flex p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-emerald-400 hover:border-emerald-500/40 transition-all cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
            </button>
          )}

          {/* LOCK / LOGOUT SESSION (Desktop) */}
          <button
            onClick={async () => {
              if (confirm('Kunci terminal dan akhiri sesi admin sekarang?')) {
                await fetch('/api/auth/logout', { method: 'POST' });
                window.location.href = '/login';
              }
            }}
            title="Kunci Akses Terminal (Logout)"
            aria-label="Logout dan Kunci Terminal"
            className="hidden lg:flex p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-500 hover:text-rose-400 hover:border-rose-500/40 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>

          {/* Mobile Hamburger Menu Toggle (Fix #16) */}
          <button
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            aria-label={isMobileMenuOpen ? 'Tutup menu navigasi terminal' : 'Buka menu navigasi terminal'}
            className="lg:hidden p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-all cursor-pointer"
          >
            {isMobileMenuOpen ? <CloseIcon className="w-4 h-4 text-rose-400" /> : <Menu className="w-4 h-4 text-cyan-400" />}
          </button>
        </div>

        {/* Mobile Slide-Down Drawer (Fix #16) */}
        {isMobileMenuOpen && (
          <div className="lg:hidden w-full pt-3 pb-1 border-t border-zinc-800/80 mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-xs animate-in slide-in-from-top-2 duration-150">
            {/* Strategy */}
            <button
              onClick={() => { onOpenStrategy(); setIsMobileMenuOpen(false); }}
              className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 hover:border-cyan-500/50 flex items-center gap-2 text-zinc-300 hover:text-cyan-300 transition-all cursor-pointer"
            >
              <Sliders className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Strategy</span>
            </button>

            {/* Alerts */}
            <button
              onClick={() => { onOpenAlerts(); setIsMobileMenuOpen(false); }}
              className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 hover:border-emerald-500/50 flex items-center gap-2 text-zinc-300 hover:text-emerald-300 transition-all cursor-pointer"
            >
              <Bell className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Alerts</span>
            </button>

            {/* Early Gems Hunter */}
            <button
              onClick={() => { onOpenAnalytics(); setIsMobileMenuOpen(false); }}
              className="p-2.5 rounded-xl bg-zinc-900/90 border border-emerald-500/40 hover:border-emerald-500/80 flex items-center gap-2 text-emerald-300 transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
              <span className="font-bold">Gems &lt;$100k MC</span>
            </button>

            {/* Smart Money Whale Tracker */}
            {onOpenSmartMoney && (
              <button
                onClick={() => { onOpenSmartMoney(); setIsMobileMenuOpen(false); }}
                className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-300 flex items-center gap-2 transition-all cursor-pointer"
              >
                <Users className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Smart Money Whale</span>
              </button>
            )}

            {/* VPS Bot 24/7 (Mobile) */}
            {onOpenVpsBot && (
              <button
                onClick={() => { onOpenVpsBot(); setIsMobileMenuOpen(false); }}
                className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 text-purple-300 flex items-center gap-2 transition-all cursor-pointer col-span-2 sm:col-span-1"
              >
                <Server className="w-4 h-4 text-purple-400 shrink-0" />
                <span>VPS Bot (24/7)</span>
              </button>
            )}

            {/* Shortcuts */}
            {onOpenShortcuts && (
              <button
                onClick={() => { onOpenShortcuts(); setIsMobileMenuOpen(false); }}
                className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 hover:border-purple-500/50 flex items-center gap-2 text-zinc-300 hover:text-purple-300 transition-all cursor-pointer"
              >
                <Keyboard className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Hotkeys (?)</span>
              </button>
            )}

            {/* VPS Monitor & Data Explorer */}
            <Link
              href="/vps-explorer"
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2.5 rounded-xl bg-[#3ecf8e]/10 border border-[#3ecf8e]/30 hover:bg-[#3ecf8e]/20 text-[#3ecf8e] flex items-center gap-2 transition-all cursor-pointer font-bold"
            >
              <Database className="w-4 h-4 text-[#3ecf8e] shrink-0" />
              <span>VPS Monitor & Data Explorer</span>
            </Link>

            {/* Ganti Password */}
            {onOpenPassword && (
              <button
                onClick={() => {
                  onOpenPassword();
                  setIsMobileMenuOpen(false);
                }}
                className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400 flex items-center gap-2 transition-all cursor-pointer"
              >
                <KeyRound className="w-4 h-4 shrink-0" />
                <span>Ganti Password</span>
              </button>
            )}

            {/* Logout */}
            <button
              onClick={async () => {
                if (confirm('Kunci terminal dan akhiri sesi admin sekarang?')) {
                  await fetch('/api/auth/logout', { method: 'POST' });
                  window.location.href = '/login';
                }
              }}
              className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-400 flex items-center gap-2 transition-all cursor-pointer"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span>Lock Terminal</span>
            </button>
          </div>
        )}
      </header>
    </>
  );
};


// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// SUB-COMPONENT: Supabase Realtime Connection Indicator
// Titik berwarna berkedip di header menampilkan status DB realtime
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function SupabaseRealtimeIndicator() {
  const { status, lastEventAt, eventCount } = useSupabaseRealtime();
  const [showTooltip, setShowTooltip] = useState(false);

  const dotConfig = (
    status === 'CONNECTED'    ? { color: 'bg-emerald-400', shadow: 'shadow-[0_0_6px_rgba(52,211,153,0.8)]', pulse: true,  label: 'CONNECTED' }
    : status === 'CONNECTING' ? { color: 'bg-amber-400',   shadow: 'shadow-[0_0_6px_rgba(251,191,36,0.6)]', pulse: false, label: 'CONNECTING...' }
    : status === 'DISCONNECTED' ? { color: 'bg-rose-500',  shadow: 'shadow-[0_0_6px_rgba(239,68,68,0.7)]',  pulse: false, label: 'DISCONNECTED' }
    : { color: 'bg-zinc-600', shadow: '', pulse: false, label: 'UNAVAILABLE' }
  );

  const timeAgo = lastEventAt
    ? `${Math.round((Date.now() - lastEventAt) / 1000)}s lalu`
    : 'Belum ada event';

  return (
    <div
      className="relative flex items-center gap-1.5 cursor-default"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Pulsing dot indicator */}
      <span
        className={`w-2 h-2 rounded-full ${dotConfig.color} ${dotConfig.shadow} ${dotConfig.pulse ? 'animate-pulse' : ''} shrink-0`}
      />
      <span className="text-zinc-500 text-[11px] font-mono hidden xl:inline select-none">
        DB
      </span>

      {/* Tooltip on hover */}
      {showTooltip && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 z-50 w-52 bg-zinc-900 border border-zinc-700/80 rounded-xl p-3 shadow-2xl text-[10px] font-mono pointer-events-none">
          <div className="flex items-center gap-2 mb-2">
            <span className={`w-2 h-2 rounded-full ${dotConfig.color} shrink-0`} />
            <span className="text-zinc-200 font-bold tracking-wide">Supabase Realtime</span>
          </div>
          <div className="text-zinc-400 space-y-1">
            <div className="flex justify-between">
              <span>Status:</span>
              <span className={`font-bold ${status === 'CONNECTED' ? 'text-emerald-400' : status === 'DISCONNECTED' ? 'text-rose-400' : 'text-amber-400'}`}>
                {dotConfig.label}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Event Masuk:</span>
              <span className="text-zinc-200">{eventCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Terakhir:</span>
              <span className="text-zinc-200">{timeAgo}</span>
            </div>
            {status === 'UNAVAILABLE' && (
              <div className="text-amber-400 mt-1.5 text-[9px] leading-tight">
                âš  Set NEXT_PUBLIC_SUPABASE_URL di .env.local
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Header;
