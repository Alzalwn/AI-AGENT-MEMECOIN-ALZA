'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  SlidersHorizontal, 
  Zap, 
  ShieldCheck, 
  AlertTriangle, 
  Check, 
  Flame, 
  Layers, 
  RefreshCw 
} from 'lucide-react';

export interface ExecutionConfig {
  slippagePct: number;
  priorityFeeMicrolamports: number;
  computeUnits: number;
  antiMevProtection: boolean;
  maxPriceImpactPct: number;
}

export const DEFAULT_EXECUTION_CONFIG: ExecutionConfig = {
  slippagePct: 1.5,
  priorityFeeMicrolamports: 100000, // 0.0001 SOL per 1M CU
  computeUnits: 200000,
  antiMevProtection: true,
  maxPriceImpactPct: 3.5,
};

interface ExecutionSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ExecutionConfig;
  onSaveConfig: (cfg: ExecutionConfig) => void;
}

export default function ExecutionSettingsModal({
  isOpen,
  onClose,
  config,
  onSaveConfig,
}: ExecutionSettingsModalProps) {
  const [slippagePct, setSlippagePct] = useState<number>(config.slippagePct);
  const [priorityFee, setPriorityFee] = useState<number>(config.priorityFeeMicrolamports);
  const [antiMev, setAntiMev] = useState<boolean>(config.antiMevProtection);
  const [maxPriceImpact, setMaxPriceImpact] = useState<number>(config.maxPriceImpactPct);

  useEffect(() => {
    setSlippagePct(config.slippagePct);
    setPriorityFee(config.priorityFeeMicrolamports);
    setAntiMev(config.antiMevProtection);
    setMaxPriceImpact(config.maxPriceImpactPct);
  }, [config]);

  if (!isOpen) return null;

  const slippagePresets = [0.5, 1.0, 2.5, 5.0];

  const handleApplyPreset = (type: 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE_SNIPER') => {
    if (type === 'CONSERVATIVE') {
      setSlippagePct(0.5);
      setPriorityFee(50000);
      setAntiMev(true);
      setMaxPriceImpact(1.5);
    } else if (type === 'BALANCED') {
      setSlippagePct(1.5);
      setPriorityFee(150000);
      setAntiMev(true);
      setMaxPriceImpact(3.5);
    } else if (type === 'AGGRESSIVE_SNIPER') {
      setSlippagePct(4.5);
      setPriorityFee(500000);
      setAntiMev(true);
      setMaxPriceImpact(7.0);
    }
  };

  const handleSave = () => {
    const updated: ExecutionConfig = {
      slippagePct: Math.max(0.1, slippagePct),
      priorityFeeMicrolamports: Math.max(1000, priorityFee),
      computeUnits: config.computeUnits || 200000,
      antiMevProtection: antiMev,
      maxPriceImpactPct: Math.max(0.5, maxPriceImpact),
    };
    onSaveConfig(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('GT_EXECUTION_CONFIG', JSON.stringify(updated));
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-200 font-mono select-none">
      <div className="bg-terminal-panel border border-terminal-border rounded-2xl w-full max-w-lg shadow-2xl p-5 space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-terminal-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-terminal-cyan/10 border border-terminal-cyan/40 text-terminal-cyan">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-terminal-text uppercase tracking-wider flex items-center gap-2">
                Execution Engine Profiles
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-terminal-cyan/20 text-terminal-cyan border border-terminal-cyan/40 font-bold">
                  SLIPPAGE &amp; MEV
                </span>
              </h2>
              <p className="text-[11px] text-terminal-muted">Konfigurasi Rute Eksekusi On-Chain &amp; Parameter Swap</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-terminal-card text-terminal-muted hover:text-terminal-text transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Profile Presets */}
        <div className="space-y-1.5">
          <span className="text-[10px] text-terminal-muted uppercase font-bold block">Quick Preset Profil:</span>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleApplyPreset('CONSERVATIVE')}
              className="p-2.5 rounded-xl bg-terminal-card hover:bg-terminal-card/80 border border-terminal-border hover:border-terminal-green transition-all text-center cursor-pointer space-y-0.5"
            >
              <span className="text-xs font-bold text-terminal-green block">Konservatif</span>
              <span className="text-[9px] text-terminal-muted block">0.5% Slip • 50k Fee</span>
            </button>

            <button
              onClick={() => handleApplyPreset('BALANCED')}
              className="p-2.5 rounded-xl bg-terminal-card hover:bg-terminal-card/80 border border-terminal-border hover:border-terminal-cyan transition-all text-center cursor-pointer space-y-0.5"
            >
              <span className="text-xs font-bold text-terminal-cyan block">Balanced (PRD)</span>
              <span className="text-[9px] text-terminal-muted block">1.5% Slip • 150k Fee</span>
            </button>

            <button
              onClick={() => handleApplyPreset('AGGRESSIVE_SNIPER')}
              className="p-2.5 rounded-xl bg-terminal-card hover:bg-terminal-card/80 border border-terminal-border hover:border-terminal-red transition-all text-center cursor-pointer space-y-0.5"
            >
              <span className="text-xs font-bold text-terminal-red block">Ultra Sniper</span>
              <span className="text-[9px] text-terminal-muted block">4.5% Slip • 500k Fee</span>
            </button>
          </div>
        </div>

        {/* Slippage Tolerance Settings */}
        <div className="p-3.5 rounded-xl bg-terminal-card border border-terminal-border space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-terminal-text">Toleransi Slippage</span>
            <span className="font-bold text-terminal-cyan text-xs font-mono">{slippagePct}%</span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {slippagePresets.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setSlippagePct(preset)}
                className={`py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                  slippagePct === preset
                    ? 'bg-terminal-cyan/20 border-terminal-cyan text-terminal-cyan shadow-[0_0_8px_rgba(0,240,255,0.2)]'
                    : 'bg-terminal-bg border-terminal-border text-terminal-muted hover:text-terminal-text'
                }`}
              >
                {preset}%
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <span className="text-[10px] text-terminal-muted">Custom %:</span>
            <input
              type="number"
              min="0.1"
              max="25"
              step="0.1"
              value={slippagePct}
              onChange={(e) => setSlippagePct(parseFloat(e.target.value) || 1.0)}
              className="w-24 bg-terminal-bg border border-terminal-border rounded-lg px-2.5 py-1 text-xs text-terminal-text focus:outline-none focus:border-terminal-cyan font-mono"
            />
          </div>
        </div>

        {/* Priority Fee & MEV Settings */}
        <div className="p-3.5 rounded-xl bg-terminal-card border border-terminal-border space-y-3">
          {/* Anti-MEV Toggle */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-terminal-text flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-terminal-green" /> Anti-MEV Sandwich Defense
              </span>
              <span className="text-[10px] text-terminal-muted block">
                Paketkan transaksi langsung ke Jito Validator (0% sandwich leak)
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={antiMev}
                onChange={(e) => setAntiMev(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-terminal-panel peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-terminal-green border border-terminal-border"></div>
            </label>
          </div>

          {/* Priority Fee Microlamports */}
          <div className="pt-2 border-t border-terminal-border/60 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-terminal-muted">Solana Priority Fee (Compute Budget)</span>
              <span className="font-bold text-terminal-text font-mono">{priorityFee.toLocaleString()} µLamports</span>
            </div>
            <input
              type="range"
              min="10000"
              max="1000000"
              step="10000"
              value={priorityFee}
              onChange={(e) => setPriorityFee(parseInt(e.target.value))}
              className="w-full accent-terminal-cyan cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-terminal-muted">
              <span>Standard (10k)</span>
              <span>Fast (150k)</span>
              <span>Turbo (500k)</span>
              <span>Ultra (1M)</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 border-t border-terminal-border flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-3 rounded-lg bg-terminal-card border border-terminal-border text-xs font-semibold text-terminal-muted hover:text-terminal-text transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="py-2 px-4 rounded-lg bg-terminal-green text-terminal-bg text-xs font-black hover:bg-terminal-green/90 transition-all cursor-pointer shadow-[0_0_10px_rgba(13,242,137,0.3)]"
          >
            Terapkan Profil Eksekusi
          </button>
        </div>

      </div>
    </div>
  );
}
