'use client';

import React, { useState } from 'react';
import { AutoSnipeConfig } from '@/types/terminal';
import { 
  X, 
  Bot, 
  Zap, 
  ShieldCheck, 
  Sliders, 
  AlertTriangle, 
  DollarSign, 
  TrendingUp, 
  Power,
  Flame,
  Gauge
} from 'lucide-react';

interface AutoSnipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AutoSnipeConfig;
  onSaveConfig: (newConfig: AutoSnipeConfig) => void;
  currentBalanceSol: number;
}

export const AutoSnipeModal: React.FC<AutoSnipeModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  currentBalanceSol
}) => {
  const [form, setForm] = useState<AutoSnipeConfig>({ ...config });
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveConfig(form);
    if (typeof window !== 'undefined') {
      localStorage.setItem('GT_AUTOSNIPE_CONFIG', JSON.stringify(form));
    }
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  const buyPresets = [0.05, 0.1, 0.25, 0.5];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-terminal-panel border border-terminal-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col font-mono text-xs max-h-[92vh]">
        {/* Header */}
        <div className="p-4 border-b border-terminal-border flex items-center justify-between bg-terminal-card/80">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border transition-all ${
              form.isEnabled 
                ? 'bg-terminal-green/15 border-terminal-green text-terminal-green glow-green'
                : 'bg-terminal-card border-terminal-border text-terminal-muted'
            }`}>
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm tracking-wider text-terminal-text">
                  AUTONOMOUS AI SNIPER BOT
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${
                  form.isEnabled
                    ? 'bg-terminal-green/20 border-terminal-green text-terminal-green'
                    : 'bg-terminal-card border-terminal-border text-terminal-muted'
                }`}>
                  {form.isEnabled ? 'ACTIVE' : 'DISABLED'}
                </span>
              </div>
              <p className="text-[10px] text-terminal-muted">
                Sub-350ms 5-Agent Consensus Auto-Execution Engine
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup modal auto-sniper"
            className="p-1.5 rounded-lg text-terminal-muted hover:text-terminal-text hover:bg-terminal-card border border-transparent hover:border-terminal-border transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* Master Toggle */}
          <div className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
            form.isEnabled
              ? 'bg-terminal-green/10 border-terminal-green/50 shadow-[0_0_15px_rgba(13,242,137,0.15)]'
              : 'bg-terminal-card border-terminal-border'
          }`}>
            <div className="space-y-0.5">
              <span className="font-bold text-sm text-terminal-text flex items-center gap-2">
                <Power className={`w-4 h-4 ${form.isEnabled ? 'text-terminal-green' : 'text-terminal-muted'}`} />
                <span>Autonomous Sniping Mode</span>
              </span>
              <p className="text-[10px] text-terminal-muted">
                {form.isEnabled 
                  ? 'Bot memindai dan otomatis membeli token saat 5/5 agen menyetujui.'
                  : 'Bot dalam kondisi standby (tidak melakukan order otomatis).'}
              </p>
            </div>
            <button
              onClick={() => setForm(f => ({ ...f, isEnabled: !f.isEnabled }))}
              className={`px-4 py-2 rounded-xl font-black text-xs transition-all cursor-pointer border ${
                form.isEnabled
                  ? 'bg-terminal-green text-terminal-bg border-terminal-green glow-green'
                  : 'bg-terminal-panel text-terminal-muted border-terminal-border hover:text-terminal-text'
              }`}
            >
              {form.isEnabled ? 'ACTIVE (ON)' : 'TURN ON'}
            </button>
          </div>

          {/* Allocation per Snipe */}
          <div className="bg-terminal-card p-3.5 rounded-xl border border-terminal-border space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-terminal-text flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-terminal-green" />
                <span>Capital Allocation per Snipe</span>
              </span>
              <span className="text-terminal-muted text-[10px]">
                Balance: <strong className="text-terminal-text">{currentBalanceSol.toFixed(2)} SOL</strong>
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {buyPresets.map((amount) => (
                <button
                  key={amount}
                  onClick={() => setForm(f => ({ ...f, buyAmountSol: amount }))}
                  className={`py-2 rounded-lg font-bold text-center border transition-all cursor-pointer ${
                    form.buyAmountSol === amount
                      ? 'bg-terminal-green/20 border-terminal-green text-terminal-green'
                      : 'bg-terminal-panel border-terminal-border text-terminal-muted hover:text-terminal-text'
                  }`}
                >
                  {amount} SOL
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[10px] text-terminal-muted whitespace-nowrap">Custom Amount:</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                max="5"
                value={form.buyAmountSol}
                onChange={(e) => setForm(f => ({ ...f, buyAmountSol: Math.max(0.01, parseFloat(e.target.value) || 0.05) }))}
                className="w-full bg-terminal-panel border border-terminal-border focus:border-terminal-green rounded px-2 py-1 text-terminal-text text-xs font-bold outline-none"
              />
              <span className="text-[10px] font-bold text-terminal-green">SOL</span>
            </div>
          </div>

          {/* Risk Guardrails & Thresholds */}
          <div className="bg-terminal-card p-3.5 rounded-xl border border-terminal-border space-y-3">
            <span className="font-bold text-terminal-text flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-terminal-cyan" />
              <span>Safety Guardrails & Filters</span>
            </span>

            {/* Min Grok Virality */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-terminal-muted flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-terminal-amber" />
                  <span>Min. Grok Virality Score:</span>
                </span>
                <span className="font-bold text-terminal-amber">{form.minGrokViralityScore}%</span>
              </div>
              <input
                type="range"
                min="70"
                max="95"
                step="1"
                value={form.minGrokViralityScore}
                onChange={(e) => setForm(f => ({ ...f, minGrokViralityScore: parseInt(e.target.value, 10) }))}
                className="w-full accent-terminal-amber cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-terminal-muted">
                <span>70% (Loose)</span>
                <span>85% (Recommended)</span>
                <span>95% (Ultra-Selective)</span>
              </div>
            </div>

            {/* Min Liquidity */}
            <div className="flex items-center justify-between pt-2 border-t border-terminal-border/60">
              <span className="text-terminal-muted text-[11px]">Min. Initial LP:</span>
              <div className="flex items-center gap-1">
                <span className="text-terminal-muted">$</span>
                <input
                  type="number"
                  min="2000"
                  step="1000"
                  max="50000"
                  value={form.minLiquidityUsd}
                  onChange={(e) => setForm(f => ({ ...f, minLiquidityUsd: parseInt(e.target.value, 10) || 5000 }))}
                  className="w-24 bg-terminal-panel border border-terminal-border rounded px-2 py-0.5 text-terminal-text text-right font-bold outline-none"
                />
              </div>
            </div>

            {/* Max Top 10 Concentration */}
            <div className="flex items-center justify-between pt-2 border-t border-terminal-border/60">
              <span className="text-terminal-muted text-[11px]">Max. Top 10 Concentration:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="5"
                  max="30"
                  value={form.maxTop10HoldersPct}
                  onChange={(e) => setForm(f => ({ ...f, maxTop10HoldersPct: parseInt(e.target.value, 10) || 15 }))}
                  className="w-16 bg-terminal-panel border border-terminal-border rounded px-2 py-0.5 text-terminal-text text-right font-bold outline-none"
                />
                <span className="text-terminal-muted">%</span>
              </div>
            </div>
          </div>

          {/* Jito MEV Tip Level */}
          <div className="bg-terminal-card p-3.5 rounded-xl border border-terminal-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-terminal-text flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-terminal-green" />
                <span>Jito MEV Bundling Priority</span>
              </span>
              <span className="text-[10px] text-terminal-green font-bold">0% FRONT-RUN LEAK</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {(['ECONOMY', 'STANDARD', 'FAST', 'TURBO'] as const).map((tier) => (
                <button
                  key={tier}
                  onClick={() => setForm(f => ({ ...f, jitoTipTier: tier }))}
                  className={`py-1.5 rounded-lg font-bold text-center border transition-all cursor-pointer text-[10px] ${
                    form.jitoTipTier === tier
                      ? 'bg-terminal-green/20 border-terminal-green text-terminal-green'
                      : 'bg-terminal-panel border-terminal-border text-terminal-muted hover:text-terminal-text'
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>
          </div>

          {/* Daily Trades Limit & Exit Agent Targets */}
          <div className="bg-terminal-card p-3.5 rounded-xl border border-terminal-border space-y-2 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-terminal-muted flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-terminal-cyan" />
                <span>Max Trades per Day:</span>
              </span>
              <span className="font-bold text-terminal-text">{form.maxDailyTrades} Trades</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-terminal-border/60">
              <span className="text-terminal-muted flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-terminal-green" />
                <span>Exit Agent TP / SL:</span>
              </span>
              <span className="font-bold text-terminal-green">+{form.takeProfitMultiplierR}R / -{form.stopLossMultiplierR}R</span>
            </div>
          </div>

          {/* Safety Notice */}
          <div className="bg-terminal-cyan/5 border border-terminal-cyan/20 p-3 rounded-xl flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-terminal-cyan shrink-0 mt-0.5" />
            <p className="text-[10px] text-terminal-muted leading-relaxed">
              <strong>Single Position Mutex Guard</strong>: Auto-Sniper akan otomatis berhenti mencari token baru saat ada 1 posisi aktif yang sedang terbuka, sampai posisi tersebut di-close oleh Exit Agent.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-terminal-border bg-terminal-card/80 flex items-center gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-terminal-panel border border-terminal-border text-terminal-muted hover:text-terminal-text font-bold transition-all cursor-pointer"
          >
            Batal
          </button>
          <button
            onClick={handleSave}
            className={`flex-1 py-2 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
              savedSuccess
                ? 'bg-terminal-green text-terminal-bg'
                : 'bg-terminal-green text-terminal-bg hover:bg-terminal-hover glow-green'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>{savedSuccess ? 'PENGATURAN TERSIMPAN!' : 'SIMPAN PENGATURAN BOT'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
