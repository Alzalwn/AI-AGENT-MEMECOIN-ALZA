'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Server,
  Table as TableIcon,
  Activity,
  Terminal,
  ArrowLeft,
  LayoutGrid,
  Database,
  ExternalLink,
  Shield,
  Layers,
  Cpu,
  Radio,
  Zap,
  Globe
} from 'lucide-react';
import SupabaseTableEditor from '../../components/vps-explorer/SupabaseTableEditor';
import VpsMetricsPanel from '../../components/vps-explorer/VpsMetricsPanel';
import LiveTerminalPanel from '../../components/vps-explorer/LiveTerminalPanel';

type ActiveTab = 'table' | 'metrics' | 'terminal' | 'split';

export default function VpsExplorerPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('split');

  return (
    <div className="min-h-screen bg-[#121212] text-zinc-100 flex flex-col font-sans selection:bg-[#3ecf8e]/30 selection:text-white">
      {/* Supabase Top Navigation Header */}
      <header className="h-14 bg-[#171717] border-b border-[#262626] px-4 sm:px-6 flex items-center justify-between shrink-0 sticky top-0 z-40">
        {/* Left: Supabase Brand & Breadcrumbs */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 p-1.5 rounded-lg bg-[#1f1f1f] hover:bg-[#282828] border border-[#2e2e2e] text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Kembali ke Sniper Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-xs font-mono hidden sm:inline">Dashboard</span>
          </Link>

          <div className="h-4 w-px bg-zinc-700 mx-1" />

          {/* Supabase Logo Icon */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#3ecf8e]/10 border border-[#3ecf8e]/30 flex items-center justify-center text-[#3ecf8e] shadow-[0_0_10px_rgba(62,207,142,0.2)]">
              <Database className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className="text-zinc-400 font-medium">alza-corp</span>
              <span className="text-zinc-600">/</span>
              <span className="text-zinc-100 font-bold">solana-vps-explorer</span>
            </div>
          </div>

          {/* Production Pill */}
          <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#3ecf8e]/10 border border-[#3ecf8e]/30 text-[10px] font-mono text-[#3ecf8e]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3ecf8e] animate-pulse" />
            <span>production-vps</span>
          </div>
        </div>

        {/* Center: Tabs Switcher */}
        <div className="flex items-center bg-[#1c1c1c] border border-[#2e2e2e] rounded-lg p-1 text-xs font-mono">
          <button
            onClick={() => setActiveTab('split')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
              activeTab === 'split'
                ? 'bg-[#282828] text-zinc-100 font-bold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5 text-[#3ecf8e]" />
            <span className="hidden sm:inline">Split View</span>
          </button>

          <button
            onClick={() => setActiveTab('table')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
              activeTab === 'table'
                ? 'bg-[#282828] text-zinc-100 font-bold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5 text-[#3ecf8e]" />
            <span>Table Editor</span>
          </button>

          <button
            onClick={() => setActiveTab('metrics')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
              activeTab === 'metrics'
                ? 'bg-[#282828] text-zinc-100 font-bold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span>VPS Health</span>
          </button>

          <button
            onClick={() => setActiveTab('terminal')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all ${
              activeTab === 'terminal'
                ? 'bg-[#282828] text-zinc-100 font-bold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5 text-purple-400" />
            <span>PM2 Terminal</span>
          </button>
        </div>

        {/* Right: VPS Quick Status */}
        <div className="flex items-center gap-2">
          <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded bg-[#1c1c1c] border border-[#2a2a2a] text-[11px] font-mono text-zinc-400">
            <Server className="w-3 h-3 text-[#3ecf8e]" />
            <span>IP: 104.248.xxx.xxx</span>
            <span className="text-zinc-600">|</span>
            <span className="text-zinc-300 font-semibold">4 vCPU / 8GB</span>
          </div>

          <a
            href="https://supabase.com/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-lg bg-[#1c1c1c] hover:bg-[#252525] border border-[#2e2e2e] text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Dokumentasi Supabase & Postgres"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </header>

      {/* Main Page Workspace */}
      <main className="flex-1 p-4 sm:p-6 overflow-hidden flex flex-col">
        {/* VIEW 1: ALL-IN-ONE SPLIT VIEW */}
        {activeTab === 'split' && (
          <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-y-auto">
            {/* Top Row: Performance Metrics Grid */}
            <div>
              <VpsMetricsPanel />
            </div>

            {/* Bottom Row: 2 Columns (Table Editor 60%, Live Terminal 40%) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-[500px]">
              <div className="lg:col-span-7 h-[560px] flex flex-col">
                <SupabaseTableEditor />
              </div>
              <div className="lg:col-span-5 h-[560px] flex flex-col">
                <LiveTerminalPanel />
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: FULL-SCREEN TABLE EDITOR */}
        {activeTab === 'table' && (
          <div className="flex-1 h-[calc(100vh-100px)] flex flex-col">
            <SupabaseTableEditor />
          </div>
        )}

        {/* VIEW 3: DEDICATED METRICS DASHBOARD */}
        {activeTab === 'metrics' && (
          <div className="flex-1 overflow-y-auto space-y-6">
            <VpsMetricsPanel />

            {/* Additional Advanced Telemetry Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs">
              <div className="p-4 rounded-xl bg-[#171717] border border-[#2e2e2e]">
                <div className="flex items-center gap-2 text-[#3ecf8e] font-bold mb-2">
                  <Shield className="w-4 h-4" />
                  <span>JITO MEV Protection</span>
                </div>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  Semua transaksi disalurkan melalui direct Jito Bundle gRPC stream. Mencegah front-running dan sandwich attacks di public mempool.
                </p>
                <div className="mt-3 pt-2 border-t border-[#262626] flex justify-between text-zinc-500 text-[10px]">
                  <span>Avg Tip: 0.0035 SOL</span>
                  <span className="text-[#3ecf8e]">Protected</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#171717] border border-[#2e2e2e]">
                <div className="flex items-center gap-2 text-cyan-400 font-bold mb-2">
                  <Radio className="w-4 h-4" />
                  <span>Yellowstone gRPC Stream</span>
                </div>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  Geyser high-frequency socket menerima update akun token & liquidity pool secara sub-second (&lt; 25ms latency).
                </p>
                <div className="mt-3 pt-2 border-t border-[#262626] flex justify-between text-zinc-500 text-[10px]">
                  <span>Status: Connected</span>
                  <span className="text-cyan-400">0 dropped pkts</span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#171717] border border-[#2e2e2e]">
                <div className="flex items-center gap-2 text-purple-400 font-bold mb-2">
                  <Layers className="w-4 h-4" />
                  <span>State Synchronization</span>
                </div>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  Konfigurasi bot tersinkronisasi dua arah dengan Zustand persist localStorage dan Supabase PostgreSQL cloud table.
                </p>
                <div className="mt-3 pt-2 border-t border-[#262626] flex justify-between text-zinc-500 text-[10px]">
                  <span>Sync: Auto-Persist</span>
                  <span className="text-purple-400">Zero-Loss</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 4: FULL-SCREEN LIVE PM2 TERMINAL */}
        {activeTab === 'terminal' && (
          <div className="flex-1 h-[calc(100vh-100px)] flex flex-col">
            <LiveTerminalPanel />
          </div>
        )}
      </main>
    </div>
  );
}
