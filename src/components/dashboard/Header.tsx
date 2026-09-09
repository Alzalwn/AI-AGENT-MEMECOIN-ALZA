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
  activeDashboard?: 'memecoin' | 'binance-futures';
  onSwitchDashboard?: (dashboard: 'memecoin' | 'binance-futures') => void;
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
  activeDashboard = 'memecoin',
  onSwitchDashboard,
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
        {/* Left: Brand & Dashboard Switcher */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center border shadow-sm ${
              activeDashboard === 'binance-futures'
                ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-400'
                : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
            }`}>
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-black text-xs sm:text-sm tracking-wider text-zinc-100 uppercase font-mono">
                  {activeDashboard === 'binance-futures' ? 'Binance Futures' : 'AI Alpha Signal'}
                </h1>
                <Badge variant={activeDashboard === 'binance-futures' ? 'amber' : 'cyan'} size="xs">
                  {activeDashboard === 'binance-futures' ? 'RADAR' : 'v2.0 PRO'}
                </Badge>
              </div>
              <p className="text-[10px] text-zinc-500 hidden sm:block">
                {activeDashboard === 'binance-futures' ? 'Derivatives Squeeze & Multi-Agent Radar' : 'Multi-Agent AI Consensus Terminal'}
              </p>
            </div>
          </div>

          {/* Dual-Dashboard Segmented Switcher */}
          {onSwitchDashboard && (
            <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-700/80 p-0.5 rounded-xl shadow-inner">
              <button
                onClick={() => onSwitchDashboard('memecoin')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer font-mono ${
                  activeDashboard === 'memecoin'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span>🦄</span>
                <span className="hidden sm:inline">Memecoin</span>
              </button>
              <button
                onClick={() => onSwitchDashboard('binance-futures')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer font-mono ${
                  activeDashboard === 'binance-futures'
                    ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 shadow-[0_0_10px_rgba(234,179,8,0.2)]'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span>⚡</span>
                <span className="hidden sm:inline">Futures</span>
                <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
              </button>
            </div>
          )}

          {/* Memecoin Engine State (Only on Memecoin dashboard) */}
          {activeDashboard === 'memecoin' && (
            <div className="hidden xl:flex items-center gap-2">
              <Badge
                variant={isAutonomous ? 'emerald' : 'amber'}
                size="xs"
                dot
                pulse={isAutonomous}
              >
                {isAutonomous ? 'SIGNAL: ON' : 'PAUSED'}
              </Badge>

              <button
                onClick={toggleEngine}
                title={isAutonomous ? 'Jeda Engine Sinyal' : 'Mulai Engine Sinyal'}
                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
              >
                {isAutonomous ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 text-emerald-400" />}
              </button>

              <button
                onClick={() => (onOpenAutoSnipe ? onOpenAutoSnipe() : onOpenStrategy())}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-900/90 border border-zinc-800 text-[10px]"
              >
                <span className="text-zinc-500 font-bold">GAYA:</span>
                <span className="font-bold text-emerald-400">
                  {autoSnipeConfig.tradingStyle === 'HODL'
                    ? '💎 MOONBAG'
                    : autoSnipeConfig.tradingStyle === 'SWING'
                    ? '📈 SWING'
                    : '⚡ SCALP'}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Middle Section: Context-Aware Telemetry */}
        {activeDashboard === 'binance-futures' ? (
          <div className="hidden lg:flex items-center gap-3 text-[11px] bg-zinc-900/80 border border-yellow-500/25 px-3.5 py-1 rounded-xl text-zinc-300 font-mono">
            <span className="flex items-center gap-1.5 font-bold text-yellow-400">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              BINANCE FUTURES LIVE
            </span>
            <span className="text-zinc-700">•</span>
            <span className="text-zinc-300">570+ Koin USDT-M</span>
            <span className="text-zinc-700">•</span>
            <span className="text-emerald-400 font-bold">Public Stream (Zero-Risk)</span>
          </div>
        ) : (
          <div className="hidden lg:flex items-center gap-4 text-[11px] bg-zinc-900/60 border border-zinc-800/80 px-3 py-1 rounded-xl">
            <button
              onClick={() => (onOpenRpc ? onOpenRpc() : rpcFailoverInstance.triggerFailover('Manual failover test'))}
              title="Klik untuk membuka RPC Manager"
              className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-100 transition-all cursor-pointer group"
            >
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>RPC:</span>
              <span className="text-zinc-200 font-bold">{networkMetrics.rpcLabel}</span>
              <span className="text-[10px] text-emerald-400">({networkMetrics.latencyMs}ms)</span>
            </button>

            <div className="h-3 w-px bg-zinc-800" />

            <div className="flex items-center gap-1 text-zinc-400">
              <span>Slot:</span>
              <span className="text-zinc-200 font-bold">#{networkMetrics.currentSlot}</span>
            </div>

            <div className="h-3 w-px bg-zinc-800" />

            <ScannerStatus variant="compact" />

            <div className="h-3 w-px bg-zinc-800" />

            <SupabaseRealtimeIndicator />

            <div className="h-3 w-px bg-zinc-800" />

            <button
              onClick={() => onOpenConverter?.()}
              className="flex items-center gap-1 text-zinc-300 hover:text-purple-300 transition-all cursor-pointer"
            >
              <span className="text-purple-400 font-bold">1 SOL =</span>
              <span className="text-emerald-400 font-bold">
                {formatIdrShort(1)}
              </span>
            </button>
          </div>
        )}

        {/* Right Section: Quick Tools & Navigation */}
        {/* Right: Quick Tools & Navigation */}
        <div className="flex items-center gap-2 shrink-0 flex-nowrap justify-end">
          {activeDashboard === 'binance-futures' ? (
            <>
              {/* Binance Futures Quick Link */}
              <a
                href="https://www.binance.com/en/futures"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-yellow-500/15 hover:bg-yellow-500/25 border border-yellow-500/40 text-yellow-300 text-xs font-bold transition-all shadow-sm font-mono"
              >
                <span>Buka Binance.com</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              {/* Telegram Alerts */}
              <button
                onClick={onOpenAlerts}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-bold transition-all font-mono"
                title="Pengaturan Telegram Alerts"
              >
                <Bell className="w-3.5 h-3.5 text-yellow-400" />
                <span className="hidden sm:inline">Alerts</span>
              </button>

              {/* Security / Ganti Password */}
              {onOpenPassword && (
                <button
                  onClick={onOpenPassword}
                  title="Ganti Password Master"
                  className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-yellow-400 transition-all cursor-pointer"
                >
                  <KeyRound className="w-4 h-4" />
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
                title="Kunci Akses Terminal (Logout)"
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-500 hover:text-rose-400 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              {/* Quick SOL Converter Pill (Visible on mobile) */}
              <button
                onClick={() => onOpenConverter?.()}
                title="Kalkulator Kurs: 1 SOL = Berapa Rupiah / USD"
                className="lg:hidden flex items-center gap-1.5 bg-gradient-to-r from-purple-500/10 to-emerald-500/10 border border-purple-500/30 px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-zinc-200"
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

              {/* Early Gems Hunter */}
              <button
                onClick={onOpenAnalytics}
                className="hidden xl:flex p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 transition-all cursor-pointer items-center gap-1.5 text-xs"
                title="Radar Koin Early Sub-$100k MC"
              >
                <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span className="text-[11px] font-black">Gems &lt;$100k</span>
              </button>

              {/* Smart Money Copy-Trading */}
              {onOpenSmartMoney && (
                <button
                  onClick={onOpenSmartMoney}
                  className="hidden 2xl:flex p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:text-emerald-300 transition-all cursor-pointer items-center gap-1.5 text-xs"
                  title="Smart Money & Whale Tracker"
                >
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span className="text-[11px] font-bold">Copy-Trade</span>
                </button>
              )}

              {/* VPS Monitor */}
              <Link
                href="/vps-explorer"
                className="hidden xl:flex p-2 rounded-xl bg-[#3ecf8e]/10 border border-[#3ecf8e]/30 text-[#3ecf8e] transition-all cursor-pointer items-center gap-1.5 text-xs"
                title="Buka VPS Monitor"
              >
                <Database className="w-4 h-4 text-[#3ecf8e]" />
                <span className="text-[11px] font-bold">VPS</span>
              </Link>

              {/* Telegram Status Pill */}
              <button
                onClick={onOpenAlerts}
                className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-mono font-bold border transition-all cursor-pointer ${
                  telegramConfig?.isEnabled && telegramConfig?.botToken && telegramConfig?.chatId
                    ? 'bg-blue-500/15 border-blue-500/40 text-blue-300'
                    : 'bg-zinc-900/90 border-zinc-800 text-zinc-400'
                }`}
              >
                <Send className={`w-3.5 h-3.5 ${telegramConfig?.isEnabled && telegramConfig?.botToken && telegramConfig?.chatId ? 'text-blue-400 animate-pulse' : 'text-zinc-500'}`} />
                <span>{telegramConfig?.isEnabled && telegramConfig?.botToken && telegramConfig?.chatId ? 'TG: Aktif' : 'TG: Setup'}</span>
              </button>

              {/* Web3 Wallet Button */}
              <Button
                variant={walletState.isConnected ? 'outline' : 'secondary'}
                size="sm"
                onClick={onOpenWallet}
                leftIcon={<Wallet className="w-3.5 h-3.5 text-emerald-400" />}
              >
                {walletState.isConnected ? (
                  <span className="flex items-center gap-1 font-bold">
                    <span className="text-emerald-400">
                      {walletState.balanceSol < 1 && walletState.balanceSol > 0
                        ? walletState.balanceSol.toFixed(4)
                        : walletState.balanceSol.toFixed(2)}{' '}
                      SOL
                    </span>
                  </span>
                ) : (
                  <span>Connect Wallet</span>
                )}
              </Button>

              {/* Password */}
              {onOpenPassword && (
                <button
                  onClick={onOpenPassword}
                  title="Ganti Password Master"
                  className="hidden lg:flex p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-emerald-400 transition-all cursor-pointer"
                >
                  <KeyRound className="w-4 h-4" />
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
                title="Logout"
                className="hidden lg:flex p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-500 hover:text-rose-400 transition-all cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Mobile Hamburger Menu Toggle */}
          <button
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            aria-label="Menu"
            className="lg:hidden p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white transition-all cursor-pointer"
          >
            {isMobileMenuOpen ? <CloseIcon className="w-4 h-4 text-rose-400" /> : <Menu className="w-4 h-4 text-cyan-400" />}
          </button>
        </div>

        {/* Mobile Slide-Down Drawer (Fix #16) */}
        {isMobileMenuOpen && (
          <div className="lg:hidden w-full pt-3 pb-1 border-t border-zinc-800/80 mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-xs animate-in slide-in-from-top-2 duration-150">
            {/* Mobile Dashboard Switcher */}
            {onSwitchDashboard && (
              <div className="col-span-2 sm:col-span-3 flex items-center gap-2 p-1 bg-zinc-900 border border-zinc-700/80 rounded-xl mb-1">
                <button
                  onClick={() => {
                    onSwitchDashboard('memecoin');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                    activeDashboard === 'memecoin'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                      : 'text-zinc-400'
                  }`}
                >
                  <span>🦄</span>
                  <span>Solana Memecoin</span>
                </button>
                <button
                  onClick={() => {
                    onSwitchDashboard('binance-futures');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                    activeDashboard === 'binance-futures'
                      ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 shadow-sm'
                      : 'text-zinc-400'
                  }`}
                >
                  <span>⚡</span>
                  <span>Binance Futures</span>
                </button>
              </div>
            )}

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
                ⚠️ Set NEXT_PUBLIC_SUPABASE_URL di .env.local
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Header;
