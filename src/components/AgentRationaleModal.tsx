'use client';

import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Flame,
  Activity,
  BarChart3,
  Cpu,
  Palette,
  Eye,
  Zap,
} from 'lucide-react';

export type RationaleTheme = 'cyberpunk' | 'bloomberg' | 'hyperneon';

interface AgentRationaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol?: string;
  direction?: 'LONG' | 'SHORT';
  overallScore?: number;
}

export const AgentRationaleModal: React.FC<AgentRationaleModalProps> = ({
  isOpen,
  onClose,
  symbol = 'SOLUSDT',
  direction = 'LONG',
  overallScore = 94,
}) => {
  const [theme, setTheme] = useState<RationaleTheme>('cyberpunk');

  if (!isOpen) return null;

  const agents = [
    {
      id: 'trend-matrix',
      name: '4-Timeframe Matrix Alignment Agent',
      role: 'Macro Trend & Multi-TF Confluence',
      status: 'APPROVED',
      confidence: 96,
      icon: TrendingUp,
      verdict: '4/4 Timeframes Aligned',
      details: [
        '15m: Bullish Structure Break (BOS)',
        '1h: Strong Momentum di atas EMA-20 & EMA-50',
        '4h: Higher High & Higher Low terkonfirmasi',
        'Daily: Rebound dari Macro Value Area Low (VAL)',
      ],
      warning: null,
    },
    {
      id: 'liquidity-guard',
      name: 'Volume & Order Book Depth Agent',
      role: 'Liquidity Filter & Slippage Protection',
      status: 'APPROVED',
      confidence: 91,
      icon: BarChart3,
      verdict: 'Volume 24h: $184.2M (SOP Min: $12M)',
      details: [
        '24h Volume Binance Futures melampaui threshold $12M SOP',
        'Bid/Ask Spread 0.012% — sangat likuid untuk eksekusi market/limit',
        'Slippage terproyeksi < 0.03% untuk sizing posisi hingga $50,000 notional',
      ],
      warning: null,
    },
    {
      id: 'smc-engine',
      name: 'Smart Money Concepts (SMC) Agent',
      role: 'Institutional Footprint & Liquidity Sweeps',
      status: 'APPROVED',
      confidence: 95,
      icon: Activity,
      verdict: 'Liquidity Sweep + Unmitigated Bullish OB',
      details: [
        'Equal Lows di TF 1h berhasil di-sweep oleh wick agresif',
        'Rejection candle tajam dengan volume delta positif institusional',
        'Entry berada persis di zona Fair Value Gap (FVG) 50% discount',
      ],
      warning: null,
    },
    {
      id: 'btc-guard',
      name: 'Bitcoin Guard Safety Agent',
      role: 'Macro Correlation & Market Dump Shield',
      status: 'APPROVED',
      confidence: 92,
      icon: ShieldCheck,
      verdict: 'BTC Trend Stable / Non-Dumping',
      details: [
        'BTCUSDT 1h & 4h berada di atas EMA-50 (Struktur Bullish Aman)',
        'Tidak ada lonjakan volume panic selling pada order book BTC spot',
        'Korelasi risiko altcoin diizinkan untuk posisi LONG',
      ],
      warning: null,
    },
    {
      id: 'funding-squeeze',
      name: 'Funding Rate & Squeeze Velocity Agent',
      role: 'Derivatives Sentiment & Liquidation Engine',
      status: 'APPROVED',
      confidence: 89,
      icon: Flame,
      verdict: 'Negative Funding Rate (-0.018%)',
      details: [
        'Funding rate condong negatif: crowd retail sedang menumpuk Short',
        'Open Interest (OI) meningkat +6.4% menandakan posisi baru masuk',
        'Kerapatan likuidasi short di level atas siap memicu Short Squeeze',
      ],
      warning: null,
    },
  ];

  // Theme styling definitions
  const themeStyles = {
    cyberpunk: {
      modalBg: 'bg-zinc-950/95 border-emerald-500/40 text-zinc-100 shadow-[0_0_50px_rgba(16,185,129,0.25)]',
      headerBg: 'bg-gradient-to-r from-zinc-900 via-zinc-900 to-emerald-950/40 border-emerald-500/30',
      accentText: 'text-emerald-400',
      accentBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
      scoreColor: 'text-emerald-400',
      cardBg: 'bg-zinc-900/60 border-zinc-800 hover:border-emerald-500/40',
      tag: 'font-mono text-emerald-400',
    },
    bloomberg: {
      modalBg: 'bg-slate-950/95 border-amber-500/40 text-slate-100 shadow-[0_0_50px_rgba(245,158,11,0.2)]',
      headerBg: 'bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border-amber-500/30',
      accentText: 'text-amber-400',
      accentBg: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
      scoreColor: 'text-amber-400',
      cardBg: 'bg-slate-900/60 border-slate-800 hover:border-amber-500/40',
      tag: 'font-serif text-amber-400',
    },
    hyperneon: {
      modalBg: 'bg-zinc-950/95 border-cyan-500/50 text-cyan-50 shadow-[0_0_50px_rgba(6,182,212,0.3)]',
      headerBg: 'bg-gradient-to-r from-zinc-900 via-purple-950/30 to-cyan-950/50 border-cyan-500/40',
      accentText: 'text-cyan-400',
      accentBg: 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300',
      scoreColor: 'text-cyan-300',
      cardBg: 'bg-zinc-900/70 border-zinc-800 hover:border-cyan-400/50',
      tag: 'font-mono text-cyan-300',
    },
  };

  const currentStyle = themeStyles[theme];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto font-sans">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-in fade-in"
      />

      {/* Modal Dialog */}
      <div
        className={`relative w-full max-w-4xl rounded-2xl border backdrop-blur-xl transition-all duration-300 overflow-hidden z-10 my-8 ${currentStyle.modalBg} animate-in zoom-in-95`}
      >
        {/* Top Header */}
        <div className={`p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${currentStyle.headerBg}`}>
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl border flex items-center justify-center shadow-lg ${currentStyle.accentBg}`}>
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold tracking-wide">
                  5-Agent Consensus Chain-of-Thought
                </h3>
                <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300">
                  {symbol}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    direction === 'LONG'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  {direction}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Audit pertimbangan dan alasan matematis dari kelima agen AI sebelum sinyal disetujui.
              </p>
            </div>
          </div>

          {/* Theme Selector & Close */}
          <div className="flex items-center gap-3 self-end sm:self-center">
            {/* Theme Selector Controls */}
            <div className="flex items-center bg-zinc-950/80 border border-zinc-800 rounded-lg p-1 gap-1">
              <span className="text-[10px] uppercase font-mono text-zinc-500 px-1.5 flex items-center gap-1">
                <Palette className="w-3 h-3" /> Tema:
              </span>
              <button
                onClick={() => setTheme('cyberpunk')}
                className={`px-2 py-1 rounded text-[11px] font-mono transition-all ${
                  theme === 'cyberpunk'
                    ? 'bg-emerald-500 text-zinc-950 font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Cyberpunk
              </button>
              <button
                onClick={() => setTheme('bloomberg')}
                className={`px-2 py-1 rounded text-[11px] font-mono transition-all ${
                  theme === 'bloomberg'
                    ? 'bg-amber-500 text-zinc-950 font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Bloomberg
              </button>
              <button
                onClick={() => setTheme('hyperneon')}
                className={`px-2 py-1 rounded text-[11px] font-mono transition-all ${
                  theme === 'hyperneon'
                    ? 'bg-cyan-500 text-zinc-950 font-bold shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                HyperNeon
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-800/80 rounded-xl text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Overview Bar */}
        <div className="px-6 py-4 bg-zinc-900/40 border-b border-zinc-800/60 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-[10px] uppercase font-mono text-zinc-500">Skor Konsensus Akhir</span>
              <div className="flex items-baseline gap-1.5">
                <span className={`text-2xl font-black font-mono ${currentStyle.scoreColor}`}>
                  {overallScore}
                </span>
                <span className="text-xs text-zinc-400 font-mono">/ 100</span>
              </div>
            </div>
            <div className="h-8 w-[1px] bg-zinc-800" />
            <div>
              <span className="text-[10px] uppercase font-mono text-zinc-500">Status Voting</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-bold text-emerald-400 font-mono">5 / 5 UNANIMOUS APPROVED</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Single-Veto Safety Gatekeeper Active</span>
          </div>
        </div>

        {/* Agent Cards Grid */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
          {agents.map((agent, index) => {
            const Icon = agent.icon;
            return (
              <div
                key={agent.id}
                className={`p-4 rounded-xl border transition-all ${currentStyle.cardBg}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/60 pb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${currentStyle.accentBg}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-zinc-500">#{index + 1}</span>
                        <h4 className="font-bold text-sm text-zinc-100">{agent.name}</h4>
                      </div>
                      <span className="text-[11px] text-zinc-400">{agent.role}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-[10px] font-mono text-zinc-500">Confidence</span>
                      <div className="text-xs font-bold font-mono text-zinc-200">{agent.confidence}%</div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {agent.status}
                    </span>
                  </div>
                </div>

                {/* Verdict & Details */}
                <div className="mt-3">
                  <div className="text-xs font-semibold text-zinc-300 flex items-center gap-2">
                    <span className="text-zinc-500 font-mono">Verdict:</span>
                    <span className={currentStyle.accentText}>{agent.verdict}</span>
                  </div>

                  <ul className="mt-2 space-y-1 text-xs text-zinc-400 pl-4 list-disc marker:text-zinc-600">
                    {agent.details.map((detail, dIdx) => (
                      <li key={dIdx}>{detail}</li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 bg-zinc-900/60 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500 px-6">
          <span>AI Architecture: <strong className="text-zinc-300">Multi-Agent Byzantine Consensus</strong></span>
          <span className="font-mono">Alza Private Trading Terminal</span>
        </div>
      </div>
    </div>
  );
};
