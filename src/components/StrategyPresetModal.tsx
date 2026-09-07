'use client';

import React, { useState } from 'react';
import { Sliders, Zap, Shield, Flame, Check, X, RotateCcw, Award } from 'lucide-react';
import { AgentThresholds, StrategyPresetType } from '../types/terminal';
import { STRATEGY_PRESETS } from '../config/constants';

interface StrategyPresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentThresholds: AgentThresholds;
  onSaveThresholds: (thresholds: AgentThresholds) => void;
}

export default function StrategyPresetModal({
  isOpen,
  onClose,
  currentThresholds,
  onSaveThresholds,
}: StrategyPresetModalProps) {
  const [thresholds, setThresholds] = useState<AgentThresholds>(currentThresholds);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: StrategyPresetType) => {
    if (preset === 'CUSTOM') return;
    setThresholds({ ...STRATEGY_PRESETS[preset] });
  };

  const handleSave = () => {
    onSaveThresholds(thresholds);
    onClose();
  };

  const handleReset = () => {
    setThresholds({ ...STRATEGY_PRESETS.BALANCED });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-terminal-panel border border-terminal-border rounded-2xl w-full max-w-xl shadow-2xl p-5 space-y-4 font-mono select-none">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-terminal-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-terminal-green/10 border border-terminal-green/40 text-terminal-green">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-terminal-text uppercase tracking-wider flex items-center gap-2">
                5-Agent Strategy Presets &amp; Threshold Tuner
              </h2>
              <p className="text-[11px] text-terminal-muted">
                Kalibrasi sensitivitas konsensus &amp; alokasi modal Fractional Kelly
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-terminal-card text-terminal-muted hover:text-terminal-text transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 3 Quick Strategy Preset Cards */}
        <div className="grid grid-cols-3 gap-2.5">
          
          {/* 1. Balanced Trencher */}
          <div
            onClick={() => handleSelectPreset('BALANCED')}
            className={`p-3 rounded-xl border transition-all cursor-pointer space-y-1 ${
              thresholds.presetName === 'BALANCED'
                ? 'bg-terminal-card border-terminal-green text-terminal-green shadow-[0_0_12px_rgba(13,242,137,0.2)]'
                : 'bg-terminal-card/50 border-terminal-border hover:border-terminal-border-active'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs uppercase flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-terminal-green" /> Balanced
              </span>
              {thresholds.presetName === 'BALANCED' && <Check className="w-3.5 h-3.5 text-terminal-green" />}
            </div>
            <p className="text-[10px] text-terminal-muted">PRD Default (LP &ge; $5k, Sim &ge; 0.85, Top10 &le; 15%)</p>
          </div>

          {/* 2. Degen Alpha */}
          <div
            onClick={() => handleSelectPreset('DEGEN')}
            className={`p-3 rounded-xl border transition-all cursor-pointer space-y-1 ${
              thresholds.presetName === 'DEGEN'
                ? 'bg-terminal-card border-terminal-amber text-terminal-amber shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                : 'bg-terminal-card/50 border-terminal-border hover:border-terminal-border-active'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs uppercase flex items-center gap-1 text-terminal-amber">
                <Flame className="w-3.5 h-3.5" /> Degen
              </span>
              {thresholds.presetName === 'DEGEN' && <Check className="w-3.5 h-3.5 text-terminal-amber" />}
            </div>
            <p className="text-[10px] text-terminal-muted">Agresif (LP &ge; $2.5k, Sim &ge; 0.80, Kelly 0.40x)</p>
          </div>

          {/* 3. Conservative */}
          <div
            onClick={() => handleSelectPreset('CONSERVATIVE')}
            className={`p-3 rounded-xl border transition-all cursor-pointer space-y-1 ${
              thresholds.presetName === 'CONSERVATIVE'
                ? 'bg-terminal-card border-terminal-cyan text-terminal-cyan shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                : 'bg-terminal-card/50 border-terminal-border hover:border-terminal-border-active'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-xs uppercase flex items-center gap-1 text-terminal-cyan">
                <Shield className="w-3.5 h-3.5" /> Safe
              </span>
              {thresholds.presetName === 'CONSERVATIVE' && <Check className="w-3.5 h-3.5 text-terminal-cyan" />}
            </div>
            <p className="text-[10px] text-terminal-muted">Konservatif (LP &ge; $12k, Sim &ge; 0.90, Top10 &le; 10%)</p>
          </div>

        </div>

        {/* Sliders for Parameter Tuning */}
        <div className="p-3.5 rounded-xl bg-terminal-card border border-terminal-border space-y-3 text-xs">
          
          {/* Scanner: Min LP */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-terminal-muted">Scanner: Min Initial LP (USD):</span>
              <span className="font-bold text-terminal-green font-mono">${thresholds.minInitialLpUsd.toLocaleString()}</span>
            </div>
            <input
              type="range"
              min="1000"
              max="20000"
              step="500"
              value={thresholds.minInitialLpUsd}
              onChange={(e) => setThresholds({ ...thresholds, presetName: 'CUSTOM', minInitialLpUsd: Number(e.target.value) })}
              className="w-full accent-terminal-green cursor-pointer"
            />
          </div>

          {/* Narrative: Min Cosine Similarity */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-terminal-muted">Narrative: Min Cosine Similarity:</span>
              <span className="font-bold text-terminal-cyan font-mono">{thresholds.minCosineSimilarity.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.70"
              max="0.95"
              step="0.01"
              value={thresholds.minCosineSimilarity}
              onChange={(e) => setThresholds({ ...thresholds, presetName: 'CUSTOM', minCosineSimilarity: Number(e.target.value) })}
              className="w-full accent-terminal-cyan cursor-pointer"
            />
          </div>

          {/* Risk: Max Top 10 Holders % */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-terminal-muted">Risk: Max Top 10 Holders %:</span>
              <span className="font-bold text-terminal-amber font-mono">{thresholds.maxTop10HoldersPct}%</span>
            </div>
            <input
              type="range"
              min="5"
              max="35"
              step="1"
              value={thresholds.maxTop10HoldersPct}
              onChange={(e) => setThresholds({ ...thresholds, presetName: 'CUSTOM', maxTop10HoldersPct: Number(e.target.value) })}
              className="w-full accent-terminal-amber cursor-pointer"
            />
          </div>

          {/* Risk Sizing: Kelly Fraction */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-terminal-muted">Kelly Fraction Multiplier (f*):</span>
              <span className="font-bold text-terminal-text font-mono">{(thresholds.kellyFraction * 100).toFixed(0)}% (Quarter-Kelly)</span>
            </div>
            <input
              type="range"
              min="0.10"
              max="0.50"
              step="0.05"
              value={thresholds.kellyFraction}
              onChange={(e) => setThresholds({ ...thresholds, presetName: 'CUSTOM', kellyFraction: Number(e.target.value) })}
              className="w-full accent-terminal-green cursor-pointer"
            />
          </div>

          {/* Exit: Take Profit & Trailing Stop */}
          <div className="grid grid-cols-2 gap-3 pt-1 border-t border-terminal-border/50">
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-terminal-muted">Target Take Profit:</span>
                <span className="font-bold text-terminal-green">+{thresholds.targetTakeProfitR}R</span>
              </div>
              <input
                type="range"
                min="2.0"
                max="6.0"
                step="0.5"
                value={thresholds.targetTakeProfitR}
                onChange={(e) => setThresholds({ ...thresholds, presetName: 'CUSTOM', targetTakeProfitR: Number(e.target.value) })}
                className="w-full accent-terminal-green cursor-pointer"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-terminal-muted">Trailing Stop:</span>
                <span className="font-bold text-terminal-red">-{thresholds.trailingStopLossR}R</span>
              </div>
              <input
                type="range"
                min="0.15"
                max="0.60"
                step="0.03"
                value={thresholds.trailingStopLossR}
                onChange={(e) => setThresholds({ ...thresholds, presetName: 'CUSTOM', trailingStopLossR: Number(e.target.value) })}
                className="w-full accent-terminal-red cursor-pointer"
              />
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-terminal-border flex items-center justify-between text-[11px]">
          <button
            onClick={handleReset}
            className="px-3 py-1.5 bg-terminal-card border border-terminal-border rounded-lg text-terminal-muted hover:text-terminal-text flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Reset ke PRD Default
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-terminal-card border border-terminal-border rounded-lg text-terminal-muted hover:text-terminal-text transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 bg-terminal-green text-terminal-bg font-black rounded-lg transition-all cursor-pointer shadow-[0_0_12px_rgba(13,242,137,0.3)] hover:opacity-90 flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" /> Terapkan Parameter
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
