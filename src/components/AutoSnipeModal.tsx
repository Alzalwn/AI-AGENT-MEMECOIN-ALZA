'use client';

import React, { useState, useEffect } from 'react';
import { AutoSnipeConfig, TradingStyle } from '@/types/terminal';
import { TRADING_STYLE_PRESETS } from '@/config/constants';
import { useSettingsStore } from '@/store/useSettingsStore';
import { testTelegramConnection } from '@/lib/telegram';
import { useTradingAgent } from '@/context/TradingContext';
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
  Info,
  ChevronDown,
  ChevronUp,
  Search,
  Bot
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
  const { scanSolanaLiveNow, activeSignals } = useTradingAgent();

  const [form, setForm] = useState<AutoSnipeConfig>({ ...config });
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<string | null>(null);
  const [isCloudLoading, setIsCloudLoading] = useState<boolean>(false);
  const [isTestingTelegram, setIsTestingTelegram] = useState<boolean>(false);
  const [telegramStatus, setTelegramStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [showTelegramInputs, setShowTelegramInputs] = useState<boolean>(false);

  // New action & simplification states
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
  const [selectedScanChannel, setSelectedScanChannel] = useState<'ALL' | 'SNIPER' | 'SUPERNOVA'>('ALL');
  const [isScanningLive, setIsScanningLive] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<{ success: boolean; count: number; message: string } | null>(null);

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
        minLiquidityUsd: store.minLiquidityUsd ?? config.minLiquidityUsd ?? 1500,
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
      setScanResult(null);
    }
  }, [config, isOpen]);

  if (!isOpen) return null;

  // 1-Click Preset Selection Handler: Otomatis set parameter terbaik di latar belakang
  const handleSelectStyle = (styleKey: 'SCALPING' | 'SWING' | 'HODL') => {
    const p = TRADING_STYLE_PRESETS[styleKey];
    setForm((prev) => ({
      ...prev,
      tradingStyle: styleKey,
      takeProfitPct: p.targetTpPct,
      stopLossPct: p.stopLossPct,
      trailingStopLossPct: p.trailingStopLossPct,
      maxHoldTimeSec: p.maxHoldTimeSec,
      minLiquidityUsd: p.minLiquidityUsd,
      minGrokViralityScore: p.minGrokViralityScore,
    }));
  };

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

    // 3. Auto sync to VPS server daemon if telegram credentials provided
    if (form.telegramBotToken && form.telegramChatId) {
      fetch('/api/bot/daemon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_config',
          botToken: form.telegramBotToken,
          chatId: form.telegramChatId
        })
      }).catch((e) => console.warn('Daemon auto-sync error:', e));
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
      minLiquidityUsd: 1500,
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

    if (form.telegramBotToken && form.telegramChatId) {
      try {
        await fetch('/api/bot/daemon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'save_config',
            botToken: form.telegramBotToken,
            chatId: form.telegramChatId
          })
        });
      } catch (e) {
        console.warn('AutoSnipeModal: Gagal sinkron daemon server:', e);
      }
    }

    const res = await useSettingsStore.getState().saveToSupabase();
    setIsCloudLoading(false);
    if (res.success) {
      setCloudSyncStatus('✅ Berhasil tersimpan di Supabase Cloud & Server VPS!');
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

  // FITUR BARU: Pemindaian Langsung dari Dalam Modal dengan Hasil Instan
  const handleTriggerLiveScan = async () => {
    setIsScanningLive(true);
    setScanResult(null);
    try {
      const count = await scanSolanaLiveNow(selectedScanChannel);
      setScanResult({
        success: true,
        count,
        message: count > 0
          ? `🎉 Berhasil! ${count} koin potensial ditemukan dan disiarkan ke Feed & Telegram!`
          : '⚡ Pemindaian selesai: Pasar live sedang sepi atau belum ada token baru yang memenuhi syarat.'
      });
    } catch (err: any) {
      setScanResult({
        success: false,
        count: 0,
        message: `Gagal memindai: ${err?.message || 'Koneksi Solana DEX terputus'}`
      });
    } finally {
      setIsScanningLive(false);
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
                Multi-Agent AI Filter, Pemindai Solana Live & Telegram Broadcaster
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
        <div className="p-4 overflow-y-auto space-y-3.5 flex-1 custom-scrollbar">
          {/* Master Signal Switch */}
          <div className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
            form.isEnabled
              ? 'bg-cyan-950/20 border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.12)]'
              : 'bg-zinc-900/60 border-zinc-800'
          }`}>
            <div className="space-y-0.5 pr-2">
              <span className="font-bold text-xs text-zinc-100 flex items-center gap-1.5">
                <Zap className={`w-3.5 h-3.5 ${form.isEnabled ? 'text-cyan-400' : 'text-zinc-500'}`} />
                <span>Mode Penyiaran Sinyal Otomatis</span>
              </span>
              <p className="text-[10px] text-zinc-400">
                {form.isEnabled 
                  ? 'Engine memindai pasar live & menyiarkan sinyal Entry/TP/SL saat koin lolos konsensus.'
                  : 'Penyiaran sinyal dijeda (tidak memproduksi sinyal baru ke feed & Telegram).'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, isEnabled: !f.isEnabled }))}
              className={`px-3 py-1.5 rounded-lg font-black text-[11px] transition-all cursor-pointer border whitespace-nowrap ${
                form.isEnabled
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-black border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.35)]'
                  : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:text-white'
              }`}
            >
              {form.isEnabled ? 'AKTIF (ON)' : 'AKTIFKAN'}
            </button>
          </div>

          {/* 1-Click Strategy Profile Selection (SEDERHANA & INTUITIF) */}
          <div className="bg-zinc-900/70 p-3 rounded-xl border border-zinc-800/90 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-200 flex items-center gap-1.5 text-xs">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Profil Target Sinyal (1-Klik Otomatis)</span>
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded font-black border bg-zinc-950 border-purple-500/30 text-purple-400">
                {form.tradingStyle === 'HODL' ? '💎 MOONBAG' : form.tradingStyle === 'SWING' ? '📈 SWING RUNNER' : '⚡ SCALP ALPHA'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'SCALPING', label: '⚡ SCALP', badge: 'RAPID', desc: 'TP +50-100% • 3-15m' },
                { key: 'SWING', label: '📈 SWING', badge: 'POPULER', desc: 'TP +150-350% • 1-4h' },
                { key: 'HODL', label: '💎 MOONBAG', badge: 'RUNNER', desc: 'TP +500%+ • Runner' },
              ].map((item) => {
                const isSelected = (form.tradingStyle || 'SWING') === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleSelectStyle(item.key as any)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-purple-500/15 border-purple-500 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                        : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-black text-xs">{item.label}</span>
                      <span className="text-[8px] px-1 py-0.2 rounded font-bold uppercase bg-zinc-900 border border-zinc-700 text-zinc-400">
                        {item.badge}
                      </span>
                    </div>
                    <span className="text-[9.5px] text-zinc-400 block">{item.desc}</span>
                  </button>
                );
              })}
            </div>

            {/* Estimasi Karakteristik Profil */}
            <div className="p-2 rounded-lg bg-black/40 border border-white/5 text-[10px] text-zinc-300 flex items-center justify-between">
              <span className="text-zinc-400">
                {form.tradingStyle === 'SCALPING' && '⚡ Mengutamakan token baru Pump.fun / Raydium yang baru pecah volume.'}
                {form.tradingStyle === 'SWING' && '📈 Koin yang stabil, likuiditas terkunci, volume konsisten (Sangat Disarankan).'}
                {form.tradingStyle === 'HODL' && '💎 Koin berkapitalisasi lebih matang dengan potensi lari 5x - 10x.'}
              </span>
              <span className="font-bold text-cyan-400 shrink-0 ml-2">
                TP: +{form.takeProfitPct}% | SL: {form.stopLossPct}%
              </span>
            </div>
          </div>

          {/* FITUR BARU: PUSAT AKSI EKSEKUSI NYATA (LANGSUNG TERASA MANFAATNYA) */}
          <div className="p-3.5 rounded-xl bg-gradient-to-br from-cyan-950/30 via-zinc-900/90 to-purple-950/30 border border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.15)] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-xs text-cyan-300 flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-cyan-400" />
                <span>Pusat Aksi: Pindai & Luncurkan Sinyal Live</span>
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                {activeSignals?.length || 0} Sinyal Aktif
              </span>
            </div>

            {/* Pilihan Target Sinyal */}
            <div className="grid grid-cols-3 gap-1.5 text-[10px]">
              {[
                { id: 'ALL', label: 'Semua Pool' },
                { id: 'SNIPER', label: '🎯 Sniper Pump.fun' },
                { id: 'SUPERNOVA', label: '🚀 Supernova ($100k+)' },
              ].map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setSelectedScanChannel(ch.id as any)}
                  className={`py-1 rounded-lg border text-center transition-all cursor-pointer font-bold ${
                    selectedScanChannel === ch.id
                      ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                      : 'bg-zinc-950/80 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {ch.label}
                </button>
              ))}
            </div>

            {/* Tombol Eksekusi Langsung */}
            <div className="flex items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={handleTriggerLiveScan}
                disabled={isScanningLive}
                className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-black font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50"
              >
                {isScanningLive ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Memindai DEX Solana...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 fill-black" />
                    <span>⚡ SCAN SOLANA SEKARANG (CARI KOIN)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleTestTelegram}
                disabled={isTestingTelegram}
                title="Kirim kartu tes sinyal ke Telegram Channel"
                className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 font-bold text-[11px] flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              >
                {isTestingTelegram ? <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" /> : <Send className="w-3.5 h-3.5 text-cyan-400" />}
                <span className="hidden sm:inline">Tes</span> Telegram
              </button>
            </div>

            {/* Hasil Eksekusi Live Scan */}
            {scanResult && (
              <div className={`p-2 rounded-lg border text-[10.5px] flex items-center gap-2 ${
                scanResult.success
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              }`}>
                {scanResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <Info className="w-4 h-4 text-rose-400 shrink-0" />}
                <span>{scanResult.message}</span>
              </div>
            )}

            {/* Hasil Uji Telegram */}
            {telegramStatus && (
              <div className={`p-2 rounded-lg border text-[10.5px] flex items-center gap-2 ${
                telegramStatus.success
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              }`}>
                {telegramStatus.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <Info className="w-4 h-4 text-rose-400 shrink-0" />}
                <span>{telegramStatus.message}</span>
              </div>
            )}
          </div>

          {/* Telegram Channel Quick Status */}
          <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-zinc-200 flex items-center gap-1.5 text-xs">
                <Send className="w-3.5 h-3.5 text-cyan-400" />
                <span>Koneksi Telegram Channel / Bot</span>
              </span>
              <button
                type="button"
                onClick={() => setShowTelegramInputs(prev => !prev)}
                className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold underline cursor-pointer"
              >
                {showTelegramInputs ? 'Tutup Kredensial' : '✏️ Atur Token & Chat ID'}
              </button>
            </div>

            <div className="flex items-center justify-between text-[10.5px]">
              <span className="text-zinc-400">Target Siaran:</span>
              <span className="font-bold text-zinc-200">
                {form.telegramChatId ? form.telegramChatId : 'Belum diisi (Menggunakan default server)'}
              </span>
            </div>

            {showTelegramInputs && (
              <div className="pt-2 border-t border-zinc-800/80 space-y-2 animate-in fade-in">
                <div>
                  <label className="text-[9.5px] text-zinc-400 block mb-0.5">Telegram Bot Token (dari @BotFather):</label>
                  <input
                    type="password"
                    placeholder="123456:ABC-DEF..."
                    value={form.telegramBotToken || ''}
                    onChange={(e) => setForm(f => ({ ...f, telegramBotToken: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 rounded-lg px-2.5 py-1 text-zinc-200 text-[11px] outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9.5px] text-zinc-400 block mb-0.5">Telegram Chat ID / Channel ID:</label>
                  <input
                    type="text"
                    placeholder="-100xxxxxxxxx atau @channel_name"
                    value={form.telegramChatId || ''}
                    onChange={(e) => setForm(f => ({ ...f, telegramChatId: e.target.value }))}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 rounded-lg px-2.5 py-1 text-zinc-200 text-[11px] outline-none font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* PENGATURAN LANJUTAN (COLLAPSIBLE / ACCORDION) - BIKIN SIMPLE & TIDAK MEMUSINGKAN */}
          <div className="rounded-xl border border-zinc-800 overflow-hidden bg-zinc-900/50">
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(prev => !prev)}
              className="w-full p-3 flex items-center justify-between text-zinc-300 hover:text-white bg-zinc-900/80 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-zinc-400" />
                <span className="font-bold text-xs">Filter AI & Throttling Lanjutan (Opsional)</span>
              </div>
              {showAdvancedFilters ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
            </button>

            {showAdvancedFilters && (
              <div className="p-3.5 space-y-3.5 border-t border-zinc-800 bg-zinc-950/60 animate-in fade-in">
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
                </div>

                {/* Min Liquidity & Top 10 Concentration */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                    <span className="text-zinc-400 text-[10px] block mb-1">Min. Likuiditas ($ USD):</span>
                    <input
                      type="number"
                      min="500"
                      step="500"
                      value={form.minLiquidityUsd}
                      onChange={(e) => setForm(f => ({ ...f, minLiquidityUsd: parseInt(e.target.value, 10) || 1500 }))}
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 rounded px-2 py-0.5 text-zinc-100 font-bold outline-none"
                    />
                  </div>
                  <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                    <span className="text-zinc-400 text-[10px] block mb-1">Maks. Top 10 Holder (%):</span>
                    <input
                      type="number"
                      min="5"
                      max="35"
                      value={form.maxTop10HoldersPct}
                      onChange={(e) => setForm(f => ({ ...f, maxTop10HoldersPct: parseInt(e.target.value, 10) || 20 }))}
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-cyan-500 rounded px-2 py-0.5 text-zinc-100 font-bold outline-none"
                    />
                  </div>
                </div>

                {/* Anti-Spam Throttling */}
                <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80 text-[10.5px]">
                  <span className="text-zinc-400">Deduplikasi Token 24 Jam:</span>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, dedup24hEnabled: !f.dedup24hEnabled }))}
                    className={`px-2 py-0.5 rounded font-bold border transition-all cursor-pointer ${
                      form.dedup24hEnabled
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-500'
                    }`}
                  >
                    {form.dedup24hEnabled ? 'DEDUP ON' : 'OFF'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 border-t border-zinc-800 bg-zinc-950/90 flex flex-col gap-2">
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
              <span>{savedSuccess ? 'PENGATURAN TERSIMPAN! ✅' : 'SIMPAN PENGATURAN'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
