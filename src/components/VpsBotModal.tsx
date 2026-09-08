'use client';

import React, { useState, useEffect } from 'react';
import {
  Server,
  Zap,
  Send,
  CheckCircle2,
  RefreshCw,
  Copy,
  X,
  Layers,
  Terminal,
  Clock,
  ExternalLink,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

interface VpsBotModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BotData {
  status: 'ONLINE' | 'STANDBY' | 'NOT_CONFIGURED' | 'OFFLINE';
  mode: string;
  service?: string;
  telegramConnected?: boolean;
  telegramChatId?: string;
  lastScannedAt: number;
  scannedCount: number;
  signalsApproved: number;
  uptimeSec?: number;
  recentSignals?: Array<{
    symbol: string;
    mint: string;
    tier: string;
    score: number;
    priceSol: number;
    timestamp: number;
  }>;
  settings?: {
    minScore: number;
    minLiquidityUsd: number;
    scanIntervalSec: number;
  };
}

export const VpsBotModal: React.FC<VpsBotModalProps> = ({ isOpen, onClose }) => {
  const [botData, setBotData] = useState<BotData | null>(null);
  const [pm2Data, setPm2Data] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isToggling, setIsToggling] = useState<boolean>(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [copiedCmd, setCopiedCmd] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'monitor' | 'guide'>('monitor');

  const [botToken, setBotToken] = useState<string>('');
  const [chatId, setChatId] = useState<string>('');
  const [isSavingConfig, setIsSavingConfig] = useState<boolean>(false);
  const [isTestingTelegram, setIsTestingTelegram] = useState<boolean>(false);
  const [configStatus, setConfigStatus] = useState<{ success: boolean; message: string } | null>(null);

  const fetchBotStatus = async () => {
    setIsLoading(true);
    try {
      const [resStatus, resDaemon] = await Promise.all([
        fetch('/api/bot/status', { cache: 'no-store' }).catch(() => null),
        fetch('/api/bot/daemon', { cache: 'no-store' }).catch(() => null)
      ]);

      if (resStatus?.ok) {
        const json = await resStatus.json();
        if (json.success && json.data) setBotData(json.data);
      }

      if (resDaemon?.ok) {
        const jsonDaemon = await resDaemon.json();
        if (jsonDaemon.success) {
          if (jsonDaemon.pm2) setPm2Data(jsonDaemon.pm2);
          if (jsonDaemon.telegramChatId && !chatId) {
            setChatId(jsonDaemon.telegramChatId);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to fetch bot status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleDaemon = async (action: 'start' | 'stop' | 'restart') => {
    setIsToggling(true);
    setActionMsg(null);
    try {
      const res = await fetch('/api/bot/daemon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (data.success) {
        setActionMsg(data.message || `Berhasil ${action === 'start' ? 'menyalakan' : 'menghentikan'} daemon!`);
        if (data.pm2) setPm2Data(data.pm2);
        fetchBotStatus();
      } else {
        setActionMsg(`Gagal: ${data.error || 'Terjadi kesalahan'}`);
      }
    } catch (err: any) {
      setActionMsg(`Gagal menghubungi server: ${err?.message}`);
    } finally {
      setIsToggling(false);
    }
  };

  const handleSaveConfig = async () => {
    if (!botToken.trim() || !chatId.trim()) {
      setConfigStatus({ success: false, message: 'Bot Token dan Chat ID wajib diisi!' });
      return;
    }
    setIsSavingConfig(true);
    setConfigStatus(null);
    try {
      const res = await fetch('/api/bot/daemon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_config', botToken, chatId })
      });
      const data = await res.json();
      if (data.success) {
        setConfigStatus({ success: true, message: data.message || 'Konfigurasi tersimpan ke server!' });
        fetchBotStatus();
        try {
          localStorage.setItem('GT_TELEGRAM_CONFIG', JSON.stringify({ botToken, chatId, isEnabled: true }));
        } catch {}
      } else {
        setConfigStatus({ success: false, message: data.error || 'Gagal menyimpan konfigurasi.' });
      }
    } catch (err: any) {
      setConfigStatus({ success: false, message: err?.message || 'Gagal terhubung ke server.' });
    } finally {
      setIsSavingConfig(false);
    }
  };

  const handleTestTelegram = async () => {
    setIsTestingTelegram(true);
    setConfigStatus(null);
    try {
      const res = await fetch('/api/bot/daemon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test_telegram', botToken, chatId })
      });
      const data = await res.json();
      if (data.success) {
        setConfigStatus({ success: true, message: data.message || 'Pesan tes berhasil dikirim ke Telegram!' });
      } else {
        setConfigStatus({ success: false, message: data.error || 'Pesan tes gagal dikirim.' });
      }
    } catch (err: any) {
      setConfigStatus({ success: false, message: err?.message || 'Error mengirim tes.' });
    } finally {
      setIsTestingTelegram(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      try {
        const raw = localStorage.getItem('GT_TELEGRAM_CONFIG');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.botToken) setBotToken(parsed.botToken);
          if (parsed.chatId) setChatId(parsed.chatId);
        }
      } catch {}
      fetchBotStatus();
      const interval = setInterval(fetchBotStatus, 10000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isPm2Running = pm2Data?.isRunning || botData?.status === 'ONLINE';
  const isOnline = isPm2Running;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col font-mono text-xs max-h-[92vh]">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/80">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${isOnline ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 animate-pulse' : 'bg-purple-500/15 border-purple-500/30 text-purple-400'}`}>
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm tracking-wider text-zinc-100">
                  VPS 24/7 SIGNAL DAEMON (BACKGROUND RUNNER)
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${isOnline ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                  {isOnline ? 'ONLINE (PM2)' : 'STANDBY'}
                </span>
              </div>
              <p className="text-[10px] text-zinc-400">
                Memindai Solana & mengirim sinyal ke Telegram 24 jam nonstop tanpa perlu browser dibuka
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={fetchBotStatus}
              disabled={isLoading}
              title="Refresh Status Daemon"
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-zinc-800 bg-zinc-900/50 px-4 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('monitor')}
            className={`pb-2 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'monitor'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Status & Telemetri Real-Time</span>
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`pb-2 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'guide'
                ? 'border-purple-400 text-purple-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Panduan Jalankan 24/7 Tanpa Buka Web</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'monitor' ? (
            <>
              {/* 1-Click Interactive Daemon Controller */}
              <div className={`p-4 rounded-xl border transition-all ${
                isPm2Running
                  ? 'bg-emerald-950/20 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                  : 'bg-zinc-900/90 border-zinc-800'
              }`}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-zinc-100 flex items-center gap-1.5">
                        <Server className={`w-4 h-4 ${isPm2Running ? 'text-emerald-400' : 'text-zinc-500'}`} />
                        <span>Kontrol Otomatis Daemon 24/7 (PM2)</span>
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-black border ${
                        isPm2Running
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse'
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                      }`}>
                        {isPm2Running ? 'ONLINE 24/7' : 'OFFLINE'}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      {isPm2Running
                        ? `Bot sedang berjalan di VPS (PID: ${pm2Data?.pid || 'PM2'}, RAM: ${pm2Data?.memoryMb || 25}MB, CPU: ${pm2Data?.cpu || 0}%). Anda bisa menutup browser kapan saja.`
                        : 'Nyalakan bot langsung dari browser dengan 1-klik tanpa perlu buka terminal SSH atau ketik perintah manual!'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {isPm2Running ? (
                      <button
                        type="button"
                        onClick={() => handleToggleDaemon('stop')}
                        disabled={isToggling}
                        className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/40 font-black text-xs transition-all cursor-pointer shadow-sm hover:text-rose-300"
                      >
                        {isToggling ? 'Memproses...' : '🛑 HENTIKAN BOT'}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleToggleDaemon('start')}
                        disabled={isToggling}
                        className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-xs transition-all cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.35)]"
                      >
                        {isToggling ? 'Menyalakan...' : '🚀 AKTIFKAN BOT 24/7 (1-KLIK)'}
                      </button>
                    )}
                  </div>
                </div>

                {actionMsg && (
                  <div className="mt-3 p-2.5 rounded-lg bg-zinc-950 border border-zinc-700 text-cyan-300 text-[11px] flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    <span>{actionMsg}</span>
                  </div>
                )}
              </div>

              {/* Architecture Summary Banner */}
              <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-emerald-500/10 border border-blue-500/30 space-y-1">
                <div className="flex items-center gap-2 text-blue-400 font-bold text-xs">
                  <Send className="w-4 h-4" />
                  <span>Cloud Daemon: Kirim Sinyal Tanpa Perlu Buka Web</span>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  Daemon berjalan sebagai background service (PM2) di VPS Linux. Engine memindai pool Solana detik demi detik, menyaring honeypot & volume, lalu langsung mengirim sinyal terformat lengkap ke Telegram Channel/Grup Anda.
                </p>
              </div>

              {/* Bot Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-1">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold block">STATUS TELEGRAM</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${botData?.telegramConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                    <span className={`text-xs font-bold ${botData?.telegramConnected ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {botData?.telegramConnected ? 'Terhubung & Aktif' : 'Belum Dikonfigurasi'}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400 block truncate">
                    Chat: {botData?.telegramChatId || 'Belum diisi'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-1">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold block">TOKEN DIPINDAI</span>
                  <span className="text-base font-black text-cyan-400 block">
                    {botData?.scannedCount || 0} Token
                  </span>
                  <span className="text-[10px] text-zinc-400 block">
                    Interval: {botData?.settings?.scanIntervalSec || 15}s
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-1">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold block">SINYAL LOLOS & DISIARKAN</span>
                  <span className="text-base font-black text-emerald-400 block">
                    {botData?.signalsApproved || 0} Sinyal
                  </span>
                  <span className="text-[10px] text-zinc-400 block">
                    Min Skor: {botData?.settings?.minScore || 82}%
                  </span>
                </div>
              </div>

              {/* Telegram Bot Credentials Configuration Panel */}
              <div className="p-3.5 rounded-xl bg-zinc-900/90 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.08)] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Send className="w-4 h-4 text-cyan-400" />
                    <span className="font-bold text-xs text-zinc-100">Konfigurasi Telegram Bot & Channel VPS</span>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                    botData?.telegramConnected
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  }`}>
                    {botData?.telegramConnected ? `TERHUBUNG (${botData.telegramChatId || 'Aktif'})` : 'BELUM DISINKRONKAN'}
                  </span>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="block text-[10px] text-zinc-400 font-bold mb-1">TELEGRAM BOT TOKEN (dari @BotFather):</label>
                    <input
                      type="password"
                      value={botToken}
                      onChange={(e) => setBotToken(e.target.value)}
                      placeholder="1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ"
                      className="w-full bg-black/60 border border-zinc-800 focus:border-cyan-500/80 text-zinc-200 px-3 py-1.5 rounded-lg text-xs font-mono placeholder:text-zinc-600 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-zinc-400 font-bold mb-1">TELEGRAM CHAT ID / CHANNEL ID:</label>
                    <input
                      type="text"
                      value={chatId}
                      onChange={(e) => setChatId(e.target.value)}
                      placeholder="-1001234567890 atau @nama_channel"
                      className="w-full bg-black/60 border border-zinc-800 focus:border-cyan-500/80 text-zinc-200 px-3 py-1.5 rounded-lg text-xs font-mono placeholder:text-zinc-600 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap pt-1">
                  <button
                    type="button"
                    onClick={handleSaveConfig}
                    disabled={isSavingConfig}
                    className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-black text-[11px] transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isSavingConfig ? 'Menyimpan...' : '💾 Simpan Konfigurasi Otomatis'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleTestTelegram}
                    disabled={isTestingTelegram}
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{isTestingTelegram ? 'Mengirim...' : '🧪 Tes Kirim Pesan'}</span>
                  </button>
                </div>

                {configStatus && (
                  <div className={`p-2 rounded-lg text-[11px] flex items-center gap-2 border ${
                    configStatus.success
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                  }`}>
                    {configStatus.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                    <span>{configStatus.message}</span>
                  </div>
                )}
              </div>

              {/* Anti-Spam Safeguards */}
              <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2">
                <span className="text-[10px] text-zinc-400 uppercase font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Fitur Anti-Spam Gatekeeper Aktif</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] text-zinc-300">
                  <div className="p-2 rounded bg-black/40 border border-white/5 flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Deduplikasi CA 24 Jam (1 Token hanya 1x / hari)</span>
                  </div>
                  <div className="p-2 rounded bg-black/40 border border-white/5 flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Dual Rate-Limiter (Maks 3/5m & 10/1h)</span>
                  </div>
                  <div className="p-2 rounded bg-black/40 border border-white/5 flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Filter Likuiditas Minimum ($8,000 USD)</span>
                  </div>
                  <div className="p-2 rounded bg-black/40 border border-white/5 flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Honeypot Shield (Mint & Freeze Revoked)</span>
                  </div>
                </div>
              </div>

              {/* Recent Dispatched Signals */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase text-zinc-400">
                  SINYAL DAEMON TERAKHIR YANG DISIARKAN ({botData?.recentSignals?.length || 0})
                </span>
                {botData?.recentSignals && botData.recentSignals.length > 0 ? (
                  <div className="space-y-1.5">
                    {botData.recentSignals.slice(0, 5).map((sig, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between text-[11px]">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-zinc-100">${sig.symbol}</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                              {sig.tier}
                            </span>
                            <span className="text-[10px] text-cyan-400 font-bold">
                              Skor: {sig.score}%
                            </span>
                          </div>
                          <div className="text-[10px] text-zinc-500 mt-0.5 font-mono">
                            CA: {sig.mint.slice(0, 6)}...{sig.mint.slice(-6)} • {new Date(sig.timestamp).toLocaleTimeString()}
                          </div>
                        </div>
                        <a
                          href={`https://dexscreener.com/solana/${sig.mint}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] font-bold flex items-center gap-1 transition-all"
                        >
                          <span>Chart</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-zinc-900/50 border border-dashed border-zinc-800 text-center text-[11px] text-zinc-500">
                    Belum ada sinyal yang disiarkan oleh daemon. Jalankan daemon di VPS untuk mulai mengirim otomatis.
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Guide Tab: How to run 24/7 without opening website */
            <div className="space-y-3 text-zinc-300">
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 space-y-1.5">
                <div className="flex items-center gap-1.5 text-purple-300 font-bold text-xs">
                  <Terminal className="w-4 h-4" />
                  <span>Cara Menjalankan Bot 24/7 di VPS Tanpa Perlu Buka Web</span>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  💡 <strong>CARA PALING MUDAH (OTOMATIS 1-KLIK)</strong>: Buka tab <strong>Status &amp; Telemetri</strong> di atas, lalu cukup klik tombol hijau <strong>&quot;🚀 AKTIFKAN BOT 24/7 (1-KLIK)&quot;</strong>. Sistem langsung menyalakan background process PM2 di server tanpa Anda perlu menyentuh terminal!
                </p>
                <p className="text-[10px] text-zinc-400">
                  Jika Anda tetap ingin menjalankan atau mengecek log secara manual lewat terminal SSH server VPS, Anda bisa gunakan panduan di bawah ini:
                </p>
              </div>

              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                  <span className="text-[10px] text-cyan-400 font-bold block">LANGKAH 1: Pastikan Telegram Token Sudah Diisi</span>
                  <p className="text-[10px] text-zinc-400">
                    Buka file <code>.env.local</code> di folder project VPS:
                  </p>
                  <pre className="p-2 rounded bg-black/60 border border-zinc-800 text-[10px] text-emerald-400 overflow-x-auto mt-1">
                    nano ~/AI-AGENT-MEMECOIN-ALZA/.env.local
                  </pre>
                  <p className="text-[10px] text-zinc-400 mt-1">
                    Isi token bot dan chat ID channel Anda:
                  </p>
                  <pre className="p-2 rounded bg-black/60 border border-zinc-800 text-[10px] text-cyan-300 overflow-x-auto mt-1">
                    TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrSTUvwxYZ<br />
                    TELEGRAM_CHAT_ID=-1001234567890
                  </pre>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                  <span className="text-[10px] text-cyan-400 font-bold block">LANGKAH 2: Jalankan Daemon dengan PM2 (1-Klik)</span>
                  <p className="text-[10px] text-zinc-400">
                    Jalankan perintah berikut di terminal VPS untuk menyalakan background service:
                  </p>
                  <div className="relative mt-1">
                    <pre className="p-2.5 rounded bg-black/60 border border-zinc-800 text-[10px] text-purple-300 overflow-x-auto">
                      pm2 start scripts/signal-daemon.mjs --name &quot;alpha-signal-bot&quot;<br />
                      pm2 save<br />
                      pm2 startup
                    </pre>
                    <button
                      onClick={() => copyToClipboard('pm2 start scripts/signal-daemon.mjs --name "alpha-signal-bot" && pm2 save')}
                      className="absolute right-2 top-2 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[9px] flex items-center gap-1 cursor-pointer font-bold"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedCmd ? 'Disalin!' : 'Salin Perintah'}</span>
                    </button>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 space-y-1">
                  <span className="text-[10px] text-cyan-400 font-bold block">LANGKAH 3: Cek Log Live</span>
                  <p className="text-[10px] text-zinc-400">
                    Untuk melihat log koin yang sedang dianalisis secara live di terminal VPS:
                  </p>
                  <pre className="p-2 rounded bg-black/60 border border-zinc-800 text-[10px] text-emerald-400 overflow-x-auto mt-1">
                    pm2 logs alpha-signal-bot
                  </pre>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2 text-[10px] text-emerald-300">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
                <p>
                  <strong>Selesai!</strong> Setelah langkah ini, Anda bisa menutup laptop, mematikan browser, atau bepergian. Server VPS akan memindai pasar 24 jam nonstop dan menembakkan sinyal secara instan ke Telegram Anda!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-zinc-800 bg-zinc-900/80 flex items-center justify-between">
          <span className="text-[10px] text-zinc-400">
            {copiedCmd ? '✅ Perintah disalin ke clipboard!' : 'Arsitektur: Headless Node.js Worker + PM2 Background Service'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-bold transition-all cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
