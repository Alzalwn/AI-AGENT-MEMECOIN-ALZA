'use client';

import React, { useState, useEffect } from 'react';
import { AutoSnipeConfig, TradingStyle } from '@/types/terminal';
import { TRADING_STYLE_PRESETS } from '@/config/constants';
import { useSettingsStore } from '@/store/useSettingsStore';
import { testTelegramConnection } from '@/lib/telegram';
import { 
  X, 
  Radio, 
  Zap, 
  ShieldCheck, 
  Sliders, 
  Flame, 
  Clock, 
  Target, 
  UploadCloud, 
  RotateCcw,
  CheckCircle2, 
  Loader2,
  Send,
  SlidersHorizontal,
  Sparkles,
  Info
} from 'lucide-react';

interface AutoSnipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AutoSnipeConfig;
  onSaveConfig: (newConfig: AutoSnipeConfig) => void;
  currentBalanceSol?: number;
}

export const AutoSnipeModal: React.FC<AutoSnipeModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  currentBalanceSol = 0
}) => {
  const [form, setForm] = useState<AutoSnipeConfig>({ ...config });
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<string | null>(null);
  const [isCloudLoading, setIsCloudLoading] = useState<boolean>(false);
  
  // Telegram testing state
  const [isTestingTelegram, setIsTestingTelegram] = useState<boolean>(false);
  const [telegramStatus, setTelegramStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [showTelegramInputs, setShowTelegramInputs] = useState<boolean>(false);

  // Synchronize state with persistent store and props whenever modal opens
  useEffect(() => {
    if (isOpen) {
      const store = useSettingsStore.getState();
      setForm({
        ...config,
        tradingStyle: store.tradingStyle || config.tradingStyle || 'SWING',
        takeProfitPct: store.takeProfitPct ?? config.takeProfitPct ?? 150,
        stopLossPct: store.stopLossPct ?? config.stopLossPct ?? -25,
        trailingStopLossPct: store.trailingStopLossPct ?? config.trailingStopLossPct ?? 15,
        maxHoldTimeSec: store.maxHoldTimeSec ?? config.maxHoldTimeSec ?? 14400,
        ttlUnlimited: store.ttlUnlimited ?? config.ttlUnlimited ?? false,
        autoSellEnabled: store.autoSellEnabled ?? config.autoSellEnabled ?? true,
        buyAmountSol: store.buyAmountSol ?? config.buyAmountSol ?? 0.05,
        minLiquidityUsd: store.minLiquidityUsd ?? config.minLiquidityUsd ?? 10000,
        minGrokViralityScore: store.minGrokViralityScore ?? config.minGrokViralityScore ?? 85,
        maxTop10HoldersPct: store.maxTop10HoldersPct ?? config.maxTop10HoldersPct ?? 20,
        jitoTipTier: (store.jitoTipTier as any) ?? config.jitoTipTier ?? 'STANDARD',
        isEnabled: store.isAutonomousEnabled ?? config.isEnabled ?? true,
        maxSignalsPer5m: (store as any).maxSignalsPer5m ?? config.maxSignalsPer5m ?? 3,
        dedup24hEnabled: (store as any).dedup24hEnabled ?? config.dedup24hEnabled ?? true,
        minRiskRewardRatio: (store as any).minRiskRewardRatio ?? config.minRiskRewardRatio ?? 2.0,
        telegramAlertsEnabled: (store as any).telegramAlertsEnabled ?? config.telegramAlertsEnabled ?? true,
        telegramBotToken: (store as any).telegramBotToken ?? config.telegramBotToken ?? '',
        telegramChatId: (store as any).telegramChatId ?? config.telegramChatId ?? '',
      });
      setCloudSyncStatus(null);
      setTelegramStatus(null);
    }
  }, [config, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    // 1. Persist to Zustand persistent store (automatic localStorage sync)
    useSettingsStore.getState().updateSettings({
      tradingStyle: form.tradingStyle || 'SWING',
      takeProfitPct: form.takeProfitPct || 150,
      stopLossPct: form.stopLossPct || -25,
      trailingStopLossPct: form.trailingStopLossPct || 15,
      maxHoldTimeSec: form.maxHoldTimeSec || 14400,
      ttlUnlimited: form.ttlUnlimited || false,
      autoSellEnabled: form.autoSellEnabled !== false,
      buyAmountSol: form.buyAmountSol,
      minLiquidityUsd: form.minLiquidityUsd,
      minGrokViralityScore: form.minGrokViralityScore,
      maxTop10HoldersPct: form.maxTop10HoldersPct,
      jitoTipTier: form.jitoTipTier,
      isAutonomousEnabled: form.isEnabled,
      maxSignalsPer5m: form.maxSignalsPer5m ?? 3,
      dedup24hEnabled: form.dedup24hEnabled ?? true,
      minRiskRewardRatio: form.minRiskRewardRatio ?? 2.0,
      telegramBotToken: form.telegramBotToken ?? '',
      telegramChatId: form.telegramChatId ?? '',
      telegramAlertsEnabled: form.telegramAlertsEnabled ?? true,
    } as any);

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

  const handleResetDefaults = () => {
    setForm((prev) => ({
      ...prev,
      tradingStyle: 'SWING',
      isEnabled: true,
      takeProfitPct: 150,
      stopLossPct: -25,
      trailingStopLossPct: 20,
      maxHoldTimeSec: 14400,
      ttlUnlimited: false,
      minGrokViralityScore: 85,
      minLiquidityUsd: 10000,
      maxTop10HoldersPct: 20,
      maxSignalsPer5m: 3,
      dedup24hEnabled: true,
      minRiskRewardRatio: 2.0,
      telegramAlertsEnabled: true,
    }));
  };

  const handleCloudSave = async () => {
    setIsCloudLoading(true);
    setCloudSyncStatus('Menyinkronkan pengaturan sinyal ke Supabase...');

    useSettingsStore.getState().updateSettings({
      tradingStyle: form.tradingStyle || 'SWING',
      takeProfitPct: form.takeProfitPct || 150,
      stopLossPct: form.stopLossPct || -25,
      trailingStopLossPct: form.trailingStopLossPct || 15,
      maxHoldTimeSec: form.maxHoldTimeSec || 14400,
      ttlUnlimited: form.ttlUnlimited || false,
      autoSellEnabled: form.autoSellEnabled !== false,
      buyAmountSol: form.buyAmountSol,
      minLiquidityUsd: form.minLiquidityUsd,
      minGrokViralityScore: form.minGrokViralityScore,
      maxTop10HoldersPct: form.maxTop10HoldersPct,
      jitoTipTier: form.jitoTipTier,
      isAutonomousEnabled: form.isEnabled,
      maxSignalsPer5m: form.maxSignalsPer5m ?? 3,
      dedup24hEnabled: form.dedup24hEnabled ?? true,
      minRiskRewardRatio: form.minRiskRewardRatio ?? 2.0,
      telegramBotToken: form.telegramBotToken ?? '',
      telegramChatId: form.telegramChatId ?? '',
      telegramAlertsEnabled: form.telegramAlertsEnabled ?? true,
    } as any);

    const res = await useSettingsStore.getState().saveToSupabase();
    setIsCloudLoading(false);
    if (res.success) {
      setCloudSyncStatus('✅ Berhasil tersimpan di Supabase Cloud!');
      setTimeout(() => setCloudSyncStatus(null), 3000);
    } else {
      setCloudSyncStatus(`⚠️ ${res.error || 'Gagal sinkron cloud'}`);
    }
  };

  const handleTestTelegram = async () => {
    const token = form.telegramBotToken || process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN || '';
    const chat = form.telegramChatId || process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID || '';

    if (!token || !chat) {
      setTelegramStatus({
        success: false,
        message: 'Bot Token dan Chat ID wajib diisi untuk tes pengiriman sinyal!'
      });
      setShowTelegramInputs(true);
      return;
    }

    setIsTestingTelegram(true);
    setTelegramStatus(null);
    try {
      const res = await testTelegramConnection(token, chat);
      setTelegramStatus(res);
    } catch (err: any) {
      setTelegramStatus({
        success: false,
        message: err?.message || 'Gagal mengirim pesan tes ke Telegram'
      });
    } finally {
      setIsTestingTelegram(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0e0e10] border border-cyan-500/30 rounded-2xl w-full max-w-lg shadow-[0_0_40px_rgba(6,182,212,0.15)] overflow-hidden flex flex-col font-mono text-xs max-h-[92vh]">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/90">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border transition-all ${
              form.isEnabled 
                ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500'
            }`}>
              <Radio className={`w-5 h-5 ${form.isEnabled ? 'animate-pulse' : ''}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm tracking-wider text-zinc-100">
                  PENGATURAN SINYAL ALPHA
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold border ${
                  form.isEnabled
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                    : 'bg-zinc-800/60 border-zinc-700 text-zinc-400'
                }`}>
                  {form.isEnabled ? 'ENGINE AKTIF' : 'DIJEDA'}
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 mt-0.5">
                Multi-Agent AI Filter, Throttling & Telegram Broadcaster
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup modal pengaturan sinyal"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 border border-transparent hover:border-zinc-700 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
          {/* Master Signal Switch */}
          <div className={`p-3.5 rounded-xl border transition-all flex items-center justify-between ${
            form.isEnabled
              ? 'bg-cyan-950/20 border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.12)]'
              : 'bg-zinc-900/60 border-zinc-800'
          }`}>
            <div className="space-y-1 pr-3">
              <span className="font-bold text-sm text-zinc-100 flex items-center gap-2">
                <Zap className={`w-4 h-4 ${form.isEnabled ? 'text-cyan-400' : 'text-zinc-500'}`} />
                <span>Mode Penyiaran Sinyal Otomatis</span>
              </span>
              <p className="text-[10px] text-zinc-400 leading-relaxed">
                {form.isEnabled 
                  ? 'Engine memindai pasar live & menyiarkan sinyal Entry/TP/SL saat konsensus 5/5 agen tercapai.'
                  : 'Penyiaran sinyal sedang dijeda (tidak memproduksi sinyal baru ke feed & Telegram).'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, isEnabled: !f.isEnabled }))}
              className={`px-3.5 py-2 rounded-xl font-black text-xs transition-all cursor-pointer border whitespace-nowrap shadow-sm ${
                form.isEnabled
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-black border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.35)]'
                  : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:text-white'
              }`}
            >
              {form.isEnabled ? 'AKTIF (ON)' : 'AKTIFKAN'}
            </button>
          </div>

          {/* Signal Strategy Profile Selector */}
          <div className="bg-zinc-900/70 p-3.5 rounded-xl border border-zinc-800/90 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span>Profil Target Sinyal</span>
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded font-black border bg-zinc-950 border-purple-500/30 text-purple-400">
                {form.tradingStyle === 'HODL' ? '💎 MOONBAG' : form.tradingStyle === 'SWING' ? '📈 SWING RUNNER' : '⚡ SCALP ALPHA'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(['SCALPING', 'SWING', 'HODL'] as const).map((styleKey) => {
                const p = TRADING_STYLE_PRESETS[styleKey];
                const isSelected = (form.tradingStyle || 'SWING') === styleKey;
                return (
                  <button
                    key={styleKey}
                    type="button"
                    onClick={() => {
                      setForm((prev) => ({
                        ...prev,
                        tradingStyle: styleKey,
                        takeProfitPct: styleKey === 'SCALPING' ? 80 : styleKey === 'SWING' ? 200 : 500,
                        stopLossPct: p.stopLossPct,
                        trailingStopLossPct: p.trailingStopLossPct,
                        maxHoldTimeSec: p.maxHoldTimeSec,
                        minLiquidityUsd: p.minLiquidityUsd,
                        minGrokViralityScore: p.minGrokViralityScore,
                        ttlUnlimited: p.ttlUnlimited,
                        autoSellEnabled: p.autoSellEnabled
                      }));
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-purple-950/40 border-purple-500 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.25)]'
                        : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-black text-[11px] tracking-wider text-zinc-100">
                        {styleKey === 'SCALPING' && '⚡ SCALP'}
                        {styleKey === 'SWING' && '📈 SWING'}
                        {styleKey === 'HODL' && '💎 MOONBAG'}
                      </span>
                      <span className="text-[8px] px-1 py-0.5 rounded border border-current font-bold opacity-90">
                        {styleKey === 'SCALPING' ? 'RAPID' : styleKey === 'SWING' ? 'RECOMMENDED' : 'RUNNER'}
                      </span>
                    </div>
                    <span className="text-[9.5px] opacity-80 leading-tight">
                      {styleKey === 'SCALPING' && 'TP +50-100% • ETA 3-15m'}
                      {styleKey === 'SWING' && 'TP +150-350% • ETA 1-4h'}
                      {styleKey === 'HODL' && 'TP +500%+ • Moonshot'}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="p-2.5 rounded-lg bg-zinc-950/70 border border-zinc-800/80 text-[10px] text-zinc-400 leading-relaxed flex items-start gap-2">
              <Info className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
              <div>
                {form.tradingStyle === 'SCALPING' && (
                  <span>⚡ <strong>Profil Scalp Alpha</strong>: Memprioritaskan sinyal entry cepat detik awal peluncuran dengan target TP1-2 kilat dan waktu estimasi singkat (3-15 menit).</span>
                )}
                {form.tradingStyle === 'SWING' && (
                  <span>📈 <strong>Profil Swing Runner (Disarankan)</strong>: Menangkap konfirmasi momentum gelombang kedua dengan akumulasi Smart Money dan target TP +150% s/d +350%.</span>
                )}
                {form.tradingStyle === 'HODL' && (
                  <span>💎 <strong>Profil Moonbag Runner</strong>: Target narasi viral xAI Grok dengan potensi lonjakan ratusan persen untuk koin berkapitalisasi organik.</span>
                )}
              </div>
            </div>
          </div>

          {/* Anti-Spam & Signal Throttling */}
          <div className="bg-zinc-900/70 p-3.5 rounded-xl border border-zinc-800/90 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-200 flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
                <span>Anti-Spam & Signal Throttling</span>
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded font-black border bg-emerald-950/50 border-emerald-500/40 text-emerald-400">
                RATE LIMITER
              </span>
            </div>
            <p className="text-[10px] text-zinc-400">
              Membatasi frekuensi sinyal agar feed bersih, terpercaya, dan hanya koin probabilitas tertinggi yang lolos.
            </p>

            {/* Max Signals per 5 Minutes */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-300">Batas Frekuensi Sinyal (Per 5 Menit):</span>
                <span className="font-bold text-emerald-400">
                  Maks. {form.maxSignalsPer5m ?? 3} Sinyal
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { count: 1, label: '1 Sinyal', desc: 'Ketat' },
                  { count: 2, label: '2 Sinyal', desc: 'Stabil' },
                  { count: 3, label: '3 Sinyal', desc: 'Disarankan' },
                  { count: 5, label: '5 Sinyal', desc: 'Agresif' },
                ].map((item) => (
                  <button
                    key={item.count}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, maxSignalsPer5m: item.count }))}
                    className={`py-1.5 px-2 rounded-lg font-bold text-center border transition-all cursor-pointer flex flex-col items-center ${
                      (form.maxSignalsPer5m ?? 3) === item.count
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-black shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span className="text-[10px]">{item.label}</span>
                    <span className="text-[8px] opacity-70 font-normal">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 24-Hour Token Deduplication Toggle */}
            <div className="pt-2.5 border-t border-zinc-800/80 flex items-center justify-between">
              <div className="space-y-0.5 pr-2">
                <span className="font-bold text-[11px] text-zinc-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Deduplikasi Token 24 Jam (Single Alert Rule)</span>
                </span>
                <p className="text-[9.5px] text-zinc-400">
                  Blokir Contract Address (CA) yang sama dalam 24 jam agar pengguna tidak dihujani spam.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, dedup24hEnabled: !(f.dedup24hEnabled ?? true) }))}
                className={`px-3 py-1.5 rounded-lg font-bold text-[10px] border transition-all cursor-pointer whitespace-nowrap ${
                  (form.dedup24hEnabled ?? true)
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-extrabold shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-400'
                }`}
              >
                {(form.dedup24hEnabled ?? true) ? 'DEDUP ON ✅' : 'NONAKTIF'}
              </button>
            </div>

            {/* Minimum Risk / Reward Ratio */}
            <div className="pt-2.5 border-t border-zinc-800/80 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-300">Minimum Risk / Reward (R:R) Ratio:</span>
                <span className="font-bold text-cyan-400">1 : {form.minRiskRewardRatio ?? 2.0}</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { rr: 1.5, label: '1 : 1.5' },
                  { rr: 2.0, label: '1 : 2.0 (Standar)' },
                  { rr: 2.5, label: '1 : 2.5' },
                  { rr: 3.0, label: '1 : 3.0+' },
                ].map((item) => (
                  <button
                    key={item.rr}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, minRiskRewardRatio: item.rr }))}
                    className={`py-1.5 rounded-lg font-bold text-center border transition-all cursor-pointer text-[10px] ${
                      (form.minRiskRewardRatio ?? 2.0) === item.rr
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-extrabold'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quality Gate & Security Filters */}
          <div className="bg-zinc-900/70 p-3.5 rounded-xl border border-zinc-800/90 space-y-3">
            <span className="font-bold text-zinc-200 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>Quality Gate & Filter Keamanan AI</span>
            </span>

            {/* Min Grok Virality */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-zinc-300 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>Min. Skor Virality xAI Grok:</span>
                </span>
                <span className="font-black text-amber-400">{form.minGrokViralityScore}%</span>
              </div>
              <input
                type="range"
                min="70"
                max="95"
                step="1"
                value={form.minGrokViralityScore}
                onChange={(e) => setForm(f => ({ ...f, minGrokViralityScore: parseInt(e.target.value, 10) }))}
                className="w-full accent-amber-400 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
              />
              <div className="flex justify-between text-[9px] text-zinc-500">
                <span>70% (Longgar)</span>
                <span className="text-amber-400/80">85% (Rekomendasi Alpha)</span>
                <span>95% (Supernova Only)</span>
              </div>
            </div>

            {/* Min Liquidity */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
              <span className="text-zinc-300 text-[11px]">Min. Likuiditas Awal ($ USD):</span>
              <div className="flex items-center gap-1">
                <span className="text-zinc-500">$</span>
                <input
                  type="number"
                  min="2000"
                  step="1000"
                  max="50000"
                  value={form.minLiquidityUsd}
                  onChange={(e) => setForm(f => ({ ...f, minLiquidityUsd: parseInt(e.target.value, 10) || 5000 }))}
                  className="w-24 bg-zinc-950 border border-zinc-800 focus:border-cyan-500 rounded px-2 py-0.5 text-zinc-100 text-right font-bold outline-none"
                />
              </div>
            </div>

            {/* Max Top 10 Concentration */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
              <span className="text-zinc-300 text-[11px]">Maks. Konsentrasi Top 10 Holder:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="5"
                  max="35"
                  value={form.maxTop10HoldersPct}
                  onChange={(e) => setForm(f => ({ ...f, maxTop10HoldersPct: parseInt(e.target.value, 10) || 20 }))}
                  className="w-16 bg-zinc-950 border border-zinc-800 focus:border-cyan-500 rounded px-2 py-0.5 text-zinc-100 text-right font-bold outline-none"
                />
                <span className="text-zinc-500">%</span>
              </div>
            </div>
          </div>

          {/* Telegram Broadcast Channel Integration */}
          <div className="bg-zinc-900/70 p-3.5 rounded-xl border border-zinc-800/90 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-200 flex items-center gap-1.5">
                <Send className="w-4 h-4 text-cyan-400" />
                <span>Saluran Penyiaran Telegram</span>
              </span>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, telegramAlertsEnabled: !(f.telegramAlertsEnabled ?? true) }))}
                className={`text-[9px] px-2 py-0.5 rounded font-extrabold border transition-all cursor-pointer ${
                  (form.telegramAlertsEnabled ?? true)
                    ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                    : 'bg-zinc-800 border-zinc-700 text-zinc-500'
                }`}
              >
                {(form.telegramAlertsEnabled ?? true) ? 'BROADCAST ON' : 'OFF'}
              </button>
            </div>

            <p className="text-[10px] text-zinc-400 leading-relaxed">
              Kirim kartu sinyal lengkap (Entry Zone, TP1-3, Stop Loss, Estimasi Waktu, dan Tombol BullX/Photon) otomatis ke Telegram Channel.
            </p>

            {telegramStatus && (
              <div className={`p-2.5 rounded-lg border text-[10px] leading-relaxed flex items-start gap-2 ${
                telegramStatus.success
                  ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
              }`}>
                {telegramStatus.success ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" /> : <Info className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />}
                <span>{telegramStatus.message}</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleTestTelegram}
                disabled={isTestingTelegram}
                className="flex-1 py-1.5 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700/80 border border-zinc-700 text-zinc-200 hover:text-white font-bold text-[10px] flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {isTestingTelegram ? <Loader2 className="w-3 h-3 animate-spin text-cyan-400" /> : <Send className="w-3 h-3 text-cyan-400" />}
                <span>{isTestingTelegram ? 'Mengirim Sinyal Tes...' : 'Kirim Sinyal Tes ke Telegram'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowTelegramInputs(prev => !prev)}
                className="py-1.5 px-2.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-[10px] font-bold transition-all cursor-pointer"
              >
                {showTelegramInputs ? 'Tutup Kredensial' : 'Edit Token/Chat ID'}
              </button>
            </div>

            {showTelegramInputs && (
              <div className="pt-2 border-t border-zinc-800/80 space-y-2 animate-in fade-in">
                <div>
                  <label className="text-[9.5px] text-zinc-400 block mb-0.5">Telegram Bot Token:</label>
                  <input
                    type="password"
                    placeholder="123456:ABC-DEF..."
                    value={form.telegramBotToken || ''}
                    onChange={(e) => setForm(f => ({ ...f, telegramBotToken: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 rounded px-2.5 py-1 text-zinc-200 text-[11px] outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9.5px] text-zinc-400 block mb-0.5">Telegram Chat ID / Channel ID:</label>
                  <input
                    type="text"
                    placeholder="-100xxxxxxxxx atau @channel_name"
                    value={form.telegramChatId || ''}
                    onChange={(e) => setForm(f => ({ ...f, telegramChatId: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 rounded px-2.5 py-1 text-zinc-200 text-[11px] outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Target Take Profit Customizer */}
          <div className="bg-zinc-900/70 p-3.5 rounded-xl border border-zinc-800/90 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-200 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-emerald-400" />
                <span>Target Take Profit (TP) Utama</span>
              </span>
              <span className="text-[10px] font-bold text-emerald-400">+{form.takeProfitPct || 150}% TP</span>
            </div>

            <div className="grid grid-cols-5 gap-1.5">
              {[50, 100, 150, 250, 500].map((tp) => (
                <button
                  key={tp}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, takeProfitPct: tp }))}
                  className={`py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer text-center ${
                    form.takeProfitPct === tp
                      ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-black shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  +{tp}%
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 text-[10px]">
              <span className="text-zinc-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Estimasi Waktu Sampai Target (ETA):</span>
              </span>
              <span className="font-bold text-cyan-400">
                {form.tradingStyle === 'SCALPING' ? '3 - 15 Menit' : form.tradingStyle === 'SWING' ? '1 - 4 Jam' : '6 - 24 Jam+'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/90 flex flex-col gap-2.5">
          {cloudSyncStatus && (
            <div className="text-[10px] text-center font-bold text-cyan-400 flex items-center justify-center gap-1.5">
              {isCloudLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{cloudSyncStatus}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 font-bold transition-all cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleResetDefaults}
              title="Kembalikan semua pengaturan ke nilai rekomendasi AI"
              className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 font-bold transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleCloudSave}
              disabled={isCloudLoading}
              title="Simpan backup konfigurasi ke database cloud Supabase"
              className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-cyan-500/50 text-cyan-400 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Backup</span> Cloud
            </button>
            <button
              type="button"
              onClick={handleSave}
              className={`flex-1 py-2 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg ${
                savedSuccess
                  ? 'bg-emerald-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.5)]'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-black font-extrabold shadow-[0_0_20px_rgba(6,182,212,0.3)]'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{savedSuccess ? 'PENGATURAN SINYAL TERSIMPAN! ✅' : 'SIMPAN PENGATURAN SINYAL'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
