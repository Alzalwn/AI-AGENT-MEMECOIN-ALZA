'use client';

import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Library, 
  History, 
  Wallet, 
  Bot, 
  LineChart,
  KeyRound,
  BookOpen,
  Cpu
} from 'lucide-react';
import Link from 'next/link';
import {
  BinanceConnectModal,
  BINANCE_STORAGE_KEY,
  SavedBinanceConfig,
} from './BinanceConnectModal';
import { KnowledgeHubDrawer } from '../KnowledgeHubDrawer';
import { AgentRationaleModal } from '../AgentRationaleModal';

const modules = [
  {
    title: 'Alpha Zoo',
    icon: <Bot className="w-4 h-4 text-emerald-400" />,
    href: '/alpha-zoo',
    status: 'BETA'
  },
  {
    title: 'Shadow Account',
    icon: <History className="w-4 h-4 text-purple-400" />,
    href: '/shadow-account',
    status: 'BETA'
  },
  {
    title: 'Quant Library',
    icon: <Library className="w-4 h-4 text-blue-400" />,
    href: '/quant-library',
    status: 'WIP'
  },
  {
    title: 'Cross-Market Backtester',
    icon: <LineChart className="w-4 h-4 text-orange-400" />,
    href: '/backtest',
    status: 'WIP'
  },
  {
    title: 'Local Portfolio',
    icon: <Wallet className="w-4 h-4 text-pink-400" />,
    href: '/portfolio',
    status: 'LIVE'
  },
  {
    title: 'Signal Generator',
    icon: <Activity className="w-4 h-4 text-cyan-400" />,
    href: '/signals',
    status: 'LIVE'
  }
];

export const FuturesEcosystemNav: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isKnowledgeHubOpen, setIsKnowledgeHubOpen] = useState(false);
  const [isRationaleModalOpen, setIsRationaleModalOpen] = useState(false);
  const [binanceConfig, setBinanceConfig] = useState<SavedBinanceConfig | null>(null);

  const refreshConfig = () => {
    try {
      const saved = localStorage.getItem(BINANCE_STORAGE_KEY);
      if (saved) {
        setBinanceConfig(JSON.parse(saved));
      } else {
        setBinanceConfig(null);
      }
    } catch {
      setBinanceConfig(null);
    }
  };

  useEffect(() => {
    refreshConfig();
    // Listen for storage events across tabs or components
    window.addEventListener('storage', refreshConfig);
    return () => window.removeEventListener('storage', refreshConfig);
  }, []);

  return (
    <div className="bg-[#0e0e0e] border border-white/5 rounded-2xl p-3 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 shadow-xl font-mono">
      <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 lg:pb-0">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/20 rounded-lg shrink-0">
          <span className="text-xs font-bold text-yellow-500 uppercase tracking-wider">Pro Ecosystem</span>
        </div>
        
        <div className="flex items-center gap-2 min-w-max">
          {modules.map((mod, idx) => (
            <Link 
              key={idx} 
              href={mod.href}
              className="group flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-xl transition-all cursor-pointer"
              onClick={(e) => {
                 if (mod.status === 'WIP') {
                   e.preventDefault();
                   alert(`Modul ${mod.title} sedang menunggu integrasi tahap selanjutnya.`);
                 }
              }}
            >
              {mod.icon}
              <span className="text-sm font-medium text-zinc-300 group-hover:text-white">{mod.title}</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-sm font-bold uppercase ${
                mod.status === 'LIVE' ? 'bg-emerald-500/20 text-emerald-400' :
                mod.status === 'BETA' ? 'bg-blue-500/20 text-blue-400' :
                'bg-zinc-800 text-zinc-500'
              }`}>
                {mod.status}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Action Buttons & Global In-Website Binance Sync Pill */}
      <div className="shrink-0 flex items-center justify-end gap-2 flex-wrap sm:flex-nowrap">
        <button
          onClick={() => setIsKnowledgeHubOpen(true)}
          className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
          title="Buka 10 Perintah Trader Binance & Kalkulator Sizing 2%"
        >
          <BookOpen className="w-3.5 h-3.5 text-amber-400" />
          <span>SOP Hub</span>
        </button>

        <button
          onClick={() => setIsRationaleModalOpen(true)}
          className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
          title="Buka 5-Agent Consensus Chain-of-Thought & Pilihan Tema"
        >
          <Cpu className="w-3.5 h-3.5 text-emerald-400" />
          <span>5-Agent Rationale</span>
        </button>

        {binanceConfig?.apiKey ? (
          <button
            onClick={() => setIsModalOpen(true)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-2 border transition-all cursor-pointer shadow-md ${
              binanceConfig.isTestnet
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 hover:bg-amber-500/25'
                : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/25'
            }`}
            title="Kelola koneksi Binance Futures (Sinkronisasi Otomatis)"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                binanceConfig.isTestnet ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
              }`}
            ></span>
            <span>Binance {binanceConfig.isTestnet ? 'Testnet' : 'Live'}</span>
            {binanceConfig.walletBalance && (
              <span className="text-white font-black">(${binanceConfig.walletBalance})</span>
            )}
          </button>
        ) : (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-zinc-900 border border-zinc-700 hover:border-amber-500/50 text-zinc-300 hover:text-amber-300 flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
            title="Hubungkan akun Binance langsung di dalam website tanpa perlu edit file server"
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
            <span>Hubungkan Binance</span>
          </button>
        )}
      </div>

      {/* Unified Binance Modal */}
      <BinanceConnectModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          refreshConfig();
        }}
        onConnectionSuccess={() => {
          refreshConfig();
        }}
      />

      {/* Knowledge Hub Drawer */}
      <KnowledgeHubDrawer
        isOpen={isKnowledgeHubOpen}
        onClose={() => setIsKnowledgeHubOpen(false)}
      />

      {/* 5-Agent Consensus Chain-of-Thought Modal */}
      <AgentRationaleModal
        isOpen={isRationaleModalOpen}
        onClose={() => setIsRationaleModalOpen(false)}
      />
    </div>
  );
};
