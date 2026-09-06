'use client';

import React from 'react';
import {
  Keyboard,
  X,
  Play,
  Pause,
  AlertOctagon,
  Activity,
  Compass,
  ShieldCheck,
  History,
  TrendingUp,
  Grid,
  Volume2,
  Sliders,
  Bell,
  BarChart3,
  SlidersHorizontal,
  Wallet,
  Zap,
  Radio,
  Coins
} from 'lucide-react';
import Badge from './ui/Badge';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose
}) => {
  if (!isOpen) return null;

  const shortcuts = [
    {
      category: 'Bot & Order Control',
      items: [
        { key: 'Space', desc: 'Pause / Lanjutkan Autonomous Engine', icon: <Play className="w-3.5 h-3.5 text-emerald-400" /> },
        { key: 'K', desc: 'Emergency Kill-Switch (Liquidate & Halt)', icon: <AlertOctagon className="w-3.5 h-3.5 text-rose-400" /> },
        { key: 'J', desc: 'Buka Jupiter DEX Swap Modal', icon: <Zap className="w-3.5 h-3.5 text-cyan-400" /> },
        { key: 'M', desc: 'Bisukan / Aktifkan Sound FX Audio', icon: <Volume2 className="w-3.5 h-3.5 text-amber-400" /> }
      ]
    },
    {
      category: 'Visual Mode Tabs',
      items: [
        { key: '1', desc: 'Tab 4D Strategy Manifold Radar', icon: <Activity className="w-3.5 h-3.5 text-emerald-400" /> },
        { key: '2', desc: 'Tab 2D Narrative Embedding Cluster', icon: <Compass className="w-3.5 h-3.5 text-cyan-400" /> },
        { key: '3', desc: 'Tab Kelly Risk & Position Sizing', icon: <ShieldCheck className="w-3.5 h-3.5 text-amber-400" /> },
        { key: '4', desc: 'Tab Closed Trade History Ledger', icon: <History className="w-3.5 h-3.5 text-emerald-400" /> },
        { key: '5', desc: 'Tab DEX Screener Candlestick Chart', icon: <TrendingUp className="w-3.5 h-3.5 text-cyan-400" /> },
        { key: '6', desc: 'Tab Scan Grid Matrix (96-Cell)', icon: <Grid className="w-3.5 h-3.5 text-purple-400" /> }
      ]
    },
    {
      category: 'System & Modals',
      items: [
        { key: 'S', desc: 'Konfigurasi Strategy Presets 5-Agen', icon: <Sliders className="w-3.5 h-3.5 text-cyan-400" /> },
        { key: 'A', desc: 'Omnichannel Alerts (Telegram & Discord)', icon: <Bell className="w-3.5 h-3.5 text-emerald-400" /> },
        { key: 'P', desc: 'Performance Analytics ($E[R]$ & Winrate)', icon: <BarChart3 className="w-3.5 h-3.5 text-amber-400" /> },
        { key: 'E', desc: 'Execution Profile & Slippage Settings', icon: <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" /> },
        { key: 'W', desc: 'Koneksikan Web3 Solana Wallet', icon: <Wallet className="w-3.5 h-3.5 text-emerald-400" /> },
        { key: 'R', desc: 'RPC Manager & Failover Telemetri', icon: <Radio className="w-3.5 h-3.5 text-emerald-400" /> },
        { key: 'C', desc: 'Kalkulator Kurs SOL ⇄ IDR (Rupiah) & USD', icon: <Coins className="w-3.5 h-3.5 text-purple-400" /> },
        { key: '?', desc: 'Buka Bantuan Keyboard Shortcuts ini', icon: <Keyboard className="w-3.5 h-3.5 text-zinc-400" /> }
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800/90 rounded-2xl w-full max-w-2xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] font-mono">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:px-6 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.2)]">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm text-zinc-100 uppercase tracking-wider">
                  Pro Trader Hotkeys & Shortcuts
                </h3>
                <Badge variant="purple" size="xs">
                  SPEED DIAL
                </Badge>
              </div>
              <p className="text-[11px] text-zinc-400">
                Akses cepat eksekusi terminal tanpa menyentuh mouse
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {shortcuts.map((cat, idx) => (
            <div key={idx} className="space-y-2">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block border-b border-zinc-800/60 pb-1">
                {cat.category}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {cat.items.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition-all text-xs"
                  >
                    <div className="flex items-center gap-2.5 text-zinc-300">
                      {item.icon}
                      <span className="text-[11px]">{item.desc}</span>
                    </div>
                    <kbd className="px-2 py-0.5 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-200 text-[10px] font-black font-mono shadow-sm">
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400 flex items-center justify-between">
            <span>💡 Tips: Tekan tombol <kbd className="px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-white font-bold">?</kbd> kapan saja di keyboard untuk menampilkan panduan ini.</span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:px-6 border-t border-zinc-800 bg-zinc-900/40 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-all cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsModal;
