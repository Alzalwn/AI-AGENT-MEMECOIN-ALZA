'use client';

import React, { useState, useEffect } from 'react';
import { AutoSnipeConfig, TradingStyle } from '@/types/terminal';
import { TRADING_STYLE_PRESETS } from '@/config/constants';
import { useSettingsStore } from '@/store/useSettingsStore';
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
  Gauge,
  Clock,
  Target,
  Cloud,
  UploadCloud,
  CheckCircle2,
  Loader2
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
  const [cloudSyncStatus, setCloudSyncStatus] = useState<string | null>(null);
  const [isCloudLoading, setIsCloudLoading] = useState<boolean>(false);

  // Synchronize state with persistent store and props whenever modal opens
  useEffect(() => {
    if (isOpen) {
      const store = useSettingsStore.getState();
      setForm({
        ...config,
        tradingStyle: store.tradingStyle || config.tradingStyle || 'SCALPING',
        takeProfitPct: store.takeProfitPct ?? config.takeProfitPct ?? 100,
        stopLossPct: store.stopLossPct ?? config.stopLossPct ?? -25,
        trailingStopLossPct: store.trailingStopLossPct ?? config.trailingStopLossPct ?? 15,
        maxHoldTimeSec: store.maxHoldTimeSec ?? config.maxHoldTimeSec ?? 180,
        ttlUnlimited: store.ttlUnlimited ?? config.ttlUnlimited ?? false,
        autoSellEnabled: store.autoSellEnabled ?? config.autoSellEnabled ?? true,
        buyAmountSol: store.buyAmountSol ?? config.buyAmountSol ?? 0.02,
        minLiquidityUsd: store.minLiquidityUsd ?? config.minLiquidityUsd ?? 10000,
        minGrokViralityScore: store.minGrokViralityScore ?? config.minGrokViralityScore ?? 85,
        maxTop10HoldersPct: store.maxTop10HoldersPct ?? config.maxTop10HoldersPct ?? 20,
        jitoTipTier: (store.jitoTipTier as any) ?? config.jitoTipTier ?? 'STANDARD',
        isEnabled: store.isAutonomousEnabled ?? config.isEnabled ?? true
      });
      setCloudSyncStatus(null);
    }
  }, [config, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    // 1. Persist to Zustand persistent store (automatic localStorage sync)
    useSettingsStore.getState().updateSettings({
      tradingStyle: form.tradingStyle || 'SCALPING',
      takeProfitPct: form.takeProfitPct || 100,
      stopLossPct: form.stopLossPct || -25,
      trailingStopLossPct: form.trailingStopLossPct || 15,
      maxHoldTimeSec: form.maxHoldTimeSec || 180,
      ttlUnlimited: form.ttlUnlimited || false,
      autoSellEnabled: form.autoSellEnabled !== false,
      buyAmountSol: form.buyAmountSol,
      minLiquidityUsd: form.minLiquidityUsd,
      minGrokViralityScore: form.minGrokViralityScore,
      maxTop10HoldersPct: form.maxTop10HoldersPct,
      jitoTipTier: form.jitoTipTier,
      isAutonomousEnabled: form.isEnabled,
    });

    // 2. Propagate to context callback & legacy localStorage key
    onSaveConfig(form);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('GT_AUTOSNIPE_CONFIG', JSON.stringify(form));
      } catch {}
    }

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  const handleCloudSave = async () => {
    setIsCloudLoading(true);
    setCloudSyncStatus('Menyinkronkan ke Supabase...');

    // First update local state
    useSettingsStore.getState().updateSettings({
      tradingStyle: form.tradingStyle || 'SCALPING',
      takeProfitPct: form.takeProfitPct || 100,
      stopLossPct: form.stopLossPct || -25,
      trailingStopLossPct: form.trailingStopLossPct || 15,
      maxHoldTimeSec: form.maxHoldTimeSec || 180,
      ttlUnlimited: form.ttlUnlimited || false,
      autoSellEnabled: form.autoSellEnabled !== false,
      buyAmountSol: form.buyAmountSol,
      minLiquidityUsd: form.minLiquidityUsd,
      minGrokViralityScore: form.minGrokViralityScore,
      maxTop10HoldersPct: form.maxTop10HoldersPct,
      jitoTipTier: form.jitoTipTier,
      isAutonomousEnabled: form.isEnabled,
    });

    const res = await useSettingsStore.getState().saveToSupabase();
    setIsCloudLoading(false);
    if (res.success) {
      setCloudSyncStatus('✅ Berhasil tersimpan di Supabase!');
      setTimeout(() => setCloudSyncStatus(null), 3000);
    } else {
      setCloudSyncStatus(`⚠️ ${res.error || 'Gagal sinkron cloud'}`);
    }
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

          {/* Trading Style Profile Selector */}
          <div className="bg-terminal-card p-3.5 rounded-xl border border-terminal-border space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-terminal-text flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-terminal-cyan" />
                <span>Trading Style Profile</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded font-bold border bg-terminal-panel border-terminal-border text-terminal-cyan">
                {form.tradingStyle || 'SCALPING'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(['SCALPING', 'SWING', 'HODL'] as const).map((styleKey) => {
                const p = TRADING_STYLE_PRESETS[styleKey];
                const isSelected = (form.tradingStyle || 'SCALPING') === styleKey;
                return (
                  <button
                    key={styleKey}
                    type="button"
                    onClick={() => {
                      setForm((prev) => ({
                        ...prev,
                        tradingStyle: styleKey,
                        takeProfitPct: p.targetTpPct,
                        stopLossPct: p.stopLossPct,
                        trailingStopLossPct: p.trailingStopLossPct,
                        maxHoldTimeSec: p.maxHoldTimeSec,
                        minLiquidityUsd: p.minLiquidityUsd,
                        minGrokViralityScore: p.minGrokViralityScore,
                        jitoTipTier: p.jitoTipTier,
                        ttlUnlimited: p.ttlUnlimited,
                        autoSellEnabled: p.autoSellEnabled
                      }));
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-terminal-green/15 border-terminal-green text-terminal-green shadow-[0_0_12px_rgba(13,242,137,0.2)]'
                        : 'bg-terminal-panel border-terminal-border text-terminal-muted hover:text-terminal-text'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-black text-[11px] tracking-wider">
                        {styleKey === 'SCALPING' && '⚡ SCALP'}
                        {styleKey === 'SWING' && '📈 SWING'}
                        {styleKey === 'HODL' && '💎 HODL'}
                      </span>
                      <span className="text-[8px] px-1 py-0.2 rounded border border-current font-bold opacity-80">
                        {p.badge}
                      </span>
                    </div>
                    <span className="text-[9px] opacity-75 line-clamp-1">
                      {styleKey === 'SCALPING' && 'TTL 3m • +100% TP'}
                      {styleKey === 'SWING' && 'TTL 4h • +300% TP'}
                      {styleKey === 'HODL' && 'No Auto-Sell'}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="text-[9.5px] text-terminal-muted leading-relaxed">
              {form.tradingStyle === 'HODL' && '💎 Mode Spot / HODL menonaktifkan auto-sell waktu (TTL) sehingga posisi Anda tetap tersimpan dan aman hingga Anda menjualnya manual.'}
              {form.tradingStyle === 'SWING' && '📈 Mode Swing menahan token selama beberapa jam untuk menangkap lonjakan breakout gelombang kedua dan moonshot.'}
              {(!form.tradingStyle || form.tradingStyle === 'SCALPING') && '⚡ Mode Scalping memindai detik ke-0 peluncuran Pump.fun dan auto-sell cepat dalam 3 menit untuk mengamankan profit.'}
            </p>
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

          {/* Hold Duration (TTL) & Take Profit Target Customizer */}
          <div className="bg-terminal-card p-3.5 rounded-xl border border-terminal-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-terminal-text flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-terminal-cyan" />
                <span>Max Hold Duration (Time-to-Live)</span>
              </span>
              <span className="text-[10px] font-bold text-terminal-cyan">
                {form.ttlUnlimited || !form.maxHoldTimeSec || form.maxHoldTimeSec <= 0
                  ? 'UNLIMITED (HODL)'
                  : form.maxHoldTimeSec >= 3600
                  ? `${form.maxHoldTimeSec / 3600} Jam`
                  : `${Math.round(form.maxHoldTimeSec / 60)} Menit`}
              </span>
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {[
                { label: '3m', sec: 180, unlimited: false },
                { label: '15m', sec: 900, unlimited: false },
                { label: '1h', sec: 3600, unlimited: false },
                { label: '4h', sec: 14400, unlimited: false },
                { label: '∞ HODL', sec: 0, unlimited: true }
              ].map((opt) => {
                const isMatch = opt.unlimited
                  ? Boolean(form.ttlUnlimited || !form.maxHoldTimeSec || form.maxHoldTimeSec <= 0)
                  : form.maxHoldTimeSec === opt.sec && !form.ttlUnlimited;
                return (
                  <button
                    key={opt.label}
                    type="button"
                    onClick={() => {
                      setForm((prev) => ({
                        ...prev,
                        maxHoldTimeSec: opt.sec,
                        ttlUnlimited: opt.unlimited,
                        autoSellEnabled: !opt.unlimited
                      }));
                    }}
                    className={`py-1.5 rounded-lg font-bold text-center border transition-all cursor-pointer text-[10px] ${
                      isMatch
                        ? 'bg-terminal-cyan/20 border-terminal-cyan text-terminal-cyan font-black'
                        : 'bg-terminal-panel border-terminal-border text-terminal-muted hover:text-terminal-text'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Target Take Profit % */}
            <div className="pt-2 border-t border-terminal-border/60 flex items-center justify-between">
              <span className="text-terminal-muted text-[11px] flex items-center gap-1">
                <Target className="w-3.5 h-3.5 text-terminal-green" />
                <span>Target Take Profit (TP):</span>
              </span>
              <div className="flex items-center gap-1.5">
                {[50, 100, 200, 300, 500].map((tp) => (
                  <button
                    key={tp}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, takeProfitPct: tp }))}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all ${
                      form.takeProfitPct === tp
                        ? 'bg-terminal-green/20 border-terminal-green text-terminal-green'
                        : 'bg-terminal-panel border-terminal-border text-terminal-muted hover:text-terminal-text'
                    }`}
                  >
                    +{tp}%
                  </button>
                ))}
              </div>
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
                <span>Exit Strategy TP / SL:</span>
              </span>
              <span className="font-bold text-terminal-green">
                {form.ttlUnlimited || form.autoSellEnabled === false
                  ? 'MANUAL EXIT (HODL) / SL -50%'
                  : `+${form.takeProfitPct || 100}% TP / ${form.stopLossPct || -25}% SL`}
              </span>
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
        <div className="p-4 border-t border-terminal-border bg-terminal-card/80 flex flex-col gap-2.5">
          {cloudSyncStatus && (
            <div className="text-[10px] text-center font-bold text-terminal-cyan flex items-center justify-center gap-1.5">
              {isCloudLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{cloudSyncStatus}</span>
            </div>
          )}

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-terminal-panel border border-terminal-border text-terminal-muted hover:text-terminal-text font-bold transition-all cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleCloudSave}
              disabled={isCloudLoading}
              title="Simpan backup konfigurasi ke database cloud Supabase"
              className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/80 hover:border-cyan-500/50 text-cyan-400 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Backup</span> Cloud
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
    </div>
  );
};
