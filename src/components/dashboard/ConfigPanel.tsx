'use client';

import React from 'react';
import { useTradingAgent } from '../../hooks/useTradingAgent';
import {
  SlidersHorizontal,
  Shield,
  Zap,
  Percent,
  Coins,
  CheckCircle2,
  Lock,
  Unlock,
  AlertTriangle
} from 'lucide-react';
import Badge from '../ui/Badge';

export const ConfigPanel: React.FC = () => {
  const {
    agentConfig,
    updateAgentConfig,
    executionConfig,
    updateExecutionConfig,
    appendLog
  } = useTradingAgent();

  const slippagePresets = [0.5, 1.0, 1.5, 2.5, 5.0];
  const jitoTiers = [
    { label: 'ECO', value: 'ECONOMY', tip: '0.000010 SOL' },
    { label: 'STD', value: 'STANDARD', tip: '0.000050 SOL' },
    { label: 'FAST', value: 'FAST', tip: '0.000100 SOL' },
    { label: 'TURBO', value: 'TURBO', tip: '0.000500 SOL' }
  ] as const;

  const handleSlippageChange = (val: number) => {
    updateExecutionConfig({ slippagePct: val });
    updateAgentConfig({ slippagePct: val });
    appendLog('SYSTEM', 'INFO', `Updated execution slippage tolerance to ${val}%`);
  };

  const handleToggleAntiRug = (key: keyof typeof agentConfig.antiRugpull) => {
    const updated = {
      ...agentConfig.antiRugpull,
      [key]: !agentConfig.antiRugpull[key]
    };
    updateAgentConfig({ antiRugpull: updated });
    appendLog('RISK', 'INFO', `Toggled anti-rug rule ${String(key)}: ${updated[key] ? 'ENABLED' : 'DISABLED'}`);
  };

  return (
    <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-4 font-mono shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <span className="font-black text-xs tracking-wider text-zinc-100 uppercase">
            Execution & Risk Controls
          </span>
        </div>
        <Badge variant="emerald" size="xs">
          SYNCED
        </Badge>
      </div>

      {/* 1. Slippage Tolerance */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-zinc-400 flex items-center gap-1">
            <Percent className="w-3 h-3 text-cyan-400" />
            <span>Slippage Tolerance</span>
          </span>
          <span className="font-bold text-zinc-200">
            {executionConfig.slippagePct}%
          </span>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {slippagePresets.map((val) => (
            <button
              key={val}
              onClick={() => handleSlippageChange(val)}
              className={`py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                executionConfig.slippagePct === val
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 font-black shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                  : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              {val}%
            </button>
          ))}
        </div>
      </div>

      {/* 2. Priority Fee / Jito Validator Tip Tier */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-zinc-400 flex items-center gap-1">
            <Zap className="w-3 h-3 text-cyan-400" />
            <span>Jito MEV Tip Tier</span>
          </span>
          <span className="text-[10px] text-cyan-400 font-bold">0% Frontrun Leak</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {jitoTiers.map((t) => (
            <button
              key={t.value}
              onClick={() => {
                updateAgentConfig({ jitoTipTier: t.value });
                appendLog('JITO', 'INFO', `Selected Jito tip tier: ${t.value} (${t.tip})`);
              }}
              className={`py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex flex-col items-center justify-center ${
                agentConfig.jitoTipTier === t.value
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400 font-black shadow-[0_0_8px_rgba(0,229,255,0.2)]'
                  : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              <span>{t.label}</span>
              <span className="text-[8px] opacity-70 font-mono">{t.tip.slice(0, 7)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Max Buy Size Per Token */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-zinc-400 flex items-center gap-1">
            <Coins className="w-3 h-3 text-amber-400" />
            <span>Max Position Sizing</span>
          </span>
          <span className="font-bold text-amber-400">
            {agentConfig.maxBuyAmountSol} SOL
          </span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {[0.25, 0.5, 0.62, 1.0].map((amt) => (
            <button
              key={amt}
              onClick={() => {
                updateAgentConfig({ maxBuyAmountSol: amt });
                appendLog('SYSTEM', 'INFO', `Updated max buy size to ${amt} SOL`);
              }}
              className={`py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                agentConfig.maxBuyAmountSol === amt
                  ? 'bg-amber-500/20 border-amber-500/50 text-amber-400 font-black shadow-[0_0_8px_rgba(245,166,35,0.2)]'
                  : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              {amt} SOL
            </button>
          ))}
        </div>
      </div>

      {/* 4. Anti-Rugpull On-Chain Security Toggles */}
      <div className="space-y-2 pt-2 border-t border-zinc-800/80">
        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
          Anti-Rugpull Guardrails (PRD §6)
        </span>

        <div className="space-y-1.5">
          {/* Require Mint Revoked */}
          <div
            onClick={() => handleToggleAntiRug('requireMintRevoked')}
            className="flex items-center justify-between p-2 rounded-xl bg-zinc-950/60 border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer text-[11px]"
          >
            <div className="flex items-center gap-2 text-zinc-300">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Require Mint Revoked</span>
            </div>
            <span
              className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                agentConfig.antiRugpull.requireMintRevoked
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-zinc-800 text-zinc-500'
              }`}
            >
              {agentConfig.antiRugpull.requireMintRevoked ? 'ACTIVE' : 'OFF'}
            </span>
          </div>

          {/* Require Freeze Revoked */}
          <div
            onClick={() => handleToggleAntiRug('requireFreezeRevoked')}
            className="flex items-center justify-between p-2 rounded-xl bg-zinc-950/60 border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer text-[11px]"
          >
            <div className="flex items-center gap-2 text-zinc-300">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Require Freeze Revoked</span>
            </div>
            <span
              className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                agentConfig.antiRugpull.requireFreezeRevoked
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-zinc-800 text-zinc-500'
              }`}
            >
              {agentConfig.antiRugpull.requireFreezeRevoked ? 'ACTIVE' : 'OFF'}
            </span>
          </div>

          {/* Auto Blacklist Honeypot */}
          <div
            onClick={() => handleToggleAntiRug('autoBlacklistHoneypot')}
            className="flex items-center justify-between p-2 rounded-xl bg-zinc-950/60 border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer text-[11px]"
          >
            <div className="flex items-center gap-2 text-zinc-300">
              <Shield className="w-3.5 h-3.5 text-purple-400" />
              <span>Honeypot Zero Tolerance</span>
            </div>
            <span
              className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                agentConfig.antiRugpull.autoBlacklistHoneypot
                  ? 'bg-purple-500/20 text-purple-400'
                  : 'bg-zinc-800 text-zinc-500'
              }`}
            >
              {agentConfig.antiRugpull.autoBlacklistHoneypot ? 'ACTIVE' : 'OFF'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigPanel;
