'use client';

import React, { useState } from 'react';
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
  AlertTriangle,
  KeyRound,
  ChevronDown,
  ChevronsUpDown
} from 'lucide-react';
import Badge from '../ui/Badge';
import CollapsibleCard from '../ui/CollapsibleCard';

interface ConfigPanelProps {
  onOpenPasswordModal?: () => void;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({ onOpenPasswordModal }) => {
  const {
    agentConfig,
    updateAgentConfig,
    executionConfig,
    updateExecutionConfig,
    appendLog
  } = useTradingAgent();

  // Accordion states for sub-sections
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(['execution', 'sizing', 'antirug', 'security'])
  );

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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
    <CollapsibleCard
      title="Execution & Risk Controls"
      badge="SYNCED"
      badgeVariant="emerald"
      icon={<SlidersHorizontal className="w-4 h-4 text-emerald-400" />}
      storageKey="card_config_controls"
      defaultCollapsed={false}
    >
      <div className="space-y-3 font-mono text-xs">
        {/* Section 1: Slippage & Jito MEV Tip */}
        <div className="border border-zinc-800/80 rounded-xl overflow-hidden bg-zinc-950/50">
          <button
            type="button"
            onClick={() => toggleSection('execution')}
            className="w-full px-3 py-2 flex items-center justify-between text-[11px] font-bold text-zinc-300 hover:bg-zinc-800/30 transition-colors cursor-pointer"
            aria-expanded={openSections.has('execution')}
          >
            <span className="flex items-center gap-1.5 text-zinc-200">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              Slippage & Jito MEV
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
                {executionConfig.slippagePct}% • {agentConfig.jitoTipTier}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${
                  openSections.has('execution') ? 'rotate-180' : ''
                }`}
              />
            </div>
          </button>

          {openSections.has('execution') && (
            <div className="p-3 pt-1 border-t border-zinc-800/60 space-y-3">
              {/* Slippage Tolerance */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-zinc-400 flex items-center gap-1">
                    <Percent className="w-3 h-3 text-cyan-400" />
                    <span>Slippage Tolerance</span>
                  </span>
                  <span className="font-bold text-zinc-200">
                    {executionConfig.slippagePct}%
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {slippagePresets.map((val) => (
                    <button
                      key={val}
                      type="button"
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

              {/* Jito MEV Tip Tier */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-zinc-400 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-cyan-400" />
                    <span>Jito MEV Tip Tier</span>
                  </span>
                  <span className="text-[9px] text-cyan-400 font-bold">0% Frontrun Leak</span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {jitoTiers.map((t) => (
                    <button
                      key={t.value}
                      type="button"
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
            </div>
          )}
        </div>

        {/* Section 2: Position Sizing & Kelly */}
        <div className="border border-zinc-800/80 rounded-xl overflow-hidden bg-zinc-950/50">
          <button
            type="button"
            onClick={() => toggleSection('sizing')}
            className="w-full px-3 py-2 flex items-center justify-between text-[11px] font-bold text-zinc-300 hover:bg-zinc-800/30 transition-colors cursor-pointer"
            aria-expanded={openSections.has('sizing')}
          >
            <span className="flex items-center gap-1.5 text-zinc-200">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              Position Sizing & Kelly
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                {agentConfig.maxBuyAmountSol} SOL
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${
                  openSections.has('sizing') ? 'rotate-180' : ''
                }`}
              />
            </div>
          </button>

          {openSections.has('sizing') && (
            <div className="p-3 pt-1 border-t border-zinc-800/60 space-y-2.5">
              <div className="grid grid-cols-4 gap-1">
                {[0.25, 0.5, 0.62, 1.0].map((amt) => (
                  <button
                    key={amt}
                    type="button"
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

              {/* Fractional Kelly Toggle */}
              <div
                onClick={() => {
                  const nextVal = !agentConfig.useKellySizing;
                  updateAgentConfig({ useKellySizing: nextVal });
                  appendLog(
                    'RISK',
                    'INFO',
                    `Dynamic Fractional Kelly Sizing: ${nextVal ? 'ENABLED (Capped at 6.2% balance)' : 'DISABLED (Using static sizing)'}`
                  );
                }}
                className="flex items-center justify-between p-2 rounded-xl bg-zinc-950/80 border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer text-[10px]"
              >
                <div className="flex items-center gap-2 text-zinc-300">
                  <Coins className="w-3.5 h-3.5 text-emerald-400" />
                  <div>
                    <span className="block font-bold">Dynamic Fractional Kelly</span>
                    <span className="text-[9px] text-zinc-500 block">Auto-size ≤6.2% balance</span>
                  </div>
                </div>
                <span
                  className={`text-[9px] px-2 py-0.5 rounded font-bold ${
                    agentConfig.useKellySizing
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {agentConfig.useKellySizing ? 'KELLY (6.2%)' : 'STATIC'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Anti-Rugpull Guardrails */}
        <div className="border border-zinc-800/80 rounded-xl overflow-hidden bg-zinc-950/50">
          <button
            type="button"
            onClick={() => toggleSection('antirug')}
            className="w-full px-3 py-2 flex items-center justify-between text-[11px] font-bold text-zinc-300 hover:bg-zinc-800/30 transition-colors cursor-pointer"
            aria-expanded={openSections.has('antirug')}
          >
            <span className="flex items-center gap-1.5 text-zinc-200">
              <Shield className="w-3.5 h-3.5 text-emerald-400" />
              Anti-Rugpull Guardrails
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                ACTIVE
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${
                  openSections.has('antirug') ? 'rotate-180' : ''
                }`}
              />
            </div>
          </button>

          {openSections.has('antirug') && (
            <div className="p-3 pt-1 border-t border-zinc-800/60 space-y-1.5">
              {/* Require Mint Revoked */}
              <div
                onClick={() => handleToggleAntiRug('requireMintRevoked')}
                className="flex items-center justify-between p-2 rounded-xl bg-zinc-950/80 border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer text-[10px]"
              >
                <div className="flex items-center gap-2 text-zinc-300">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Require Mint Revoked</span>
                </div>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
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
                className="flex items-center justify-between p-2 rounded-xl bg-zinc-950/80 border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer text-[10px]"
              >
                <div className="flex items-center gap-2 text-zinc-300">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Require Freeze Revoked</span>
                </div>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
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
                className="flex items-center justify-between p-2 rounded-xl bg-zinc-950/80 border border-zinc-800 hover:border-zinc-700 transition-all cursor-pointer text-[10px]"
              >
                <div className="flex items-center gap-2 text-zinc-300">
                  <Shield className="w-3.5 h-3.5 text-purple-400" />
                  <span>Honeypot Zero Tolerance</span>
                </div>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                    agentConfig.antiRugpull.autoBlacklistHoneypot
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {agentConfig.antiRugpull.autoBlacklistHoneypot ? 'ACTIVE' : 'OFF'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Section 4: Master Password */}
        {onOpenPasswordModal && (
          <div className="border border-zinc-800/80 rounded-xl overflow-hidden bg-zinc-950/50">
            <button
              type="button"
              onClick={onOpenPasswordModal}
              className="w-full p-2.5 flex items-center justify-between bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 hover:from-emerald-500/20 hover:to-cyan-500/20 transition-all cursor-pointer text-[11px] group"
            >
              <div className="flex items-center gap-2 text-zinc-200">
                <div className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 group-hover:scale-110 transition-transform">
                  <KeyRound className="w-3.5 h-3.5" />
                </div>
                <div className="text-left">
                  <span className="block font-bold group-hover:text-emerald-300 transition-colors">
                    Ganti Master Password
                  </span>
                  <span className="text-[9px] text-zinc-400 block">
                    Aktif: Alza0839 • Klik untuk ubah
                  </span>
                </div>
              </div>
              <span className="text-[9px] px-2 py-0.5 rounded font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                UBAH
              </span>
            </button>
          </div>
        )}
      </div>
    </CollapsibleCard>
  );
};

export default ConfigPanel;
