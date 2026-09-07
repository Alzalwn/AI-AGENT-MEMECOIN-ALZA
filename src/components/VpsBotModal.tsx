'use client';

import React, { useState, useEffect } from 'react';
import {
  Server,
  Zap,
  ShieldAlert,
  Smartphone,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Copy,
  X,
  Layers,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';

interface VpsBotModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BotData {
  status: 'ONLINE' | 'STANDBY' | 'NOT_CONFIGURED' | 'OFFLINE';
  mode: string;
  walletPublicKey: string | null;
  balanceSol: number;
  lastScannedAt: number;
  activePositions: Array<{
    id: string;
    mint: string;
    symbol: string;
    name: string;
    investedSol: number;
    entryPriceUsd: number;
    currentPriceUsd: number;
    pnlPct: number;
    openedAt: number;
    txSignature?: string;
  }>;
  recentTrades: Array<{
    type: 'BUY' | 'SELL';
    symbol: string;
    mint: string;
    amountSol: number;
    pnlPct?: number;
    txSignature: string;
    timestamp: number;
  }>;
  totalPnLSol: number;
  scannedCount: number;
  signalsApproved: number;
  settings: {
    buyAmountSol: number;
    minViralityScore: number;
    takeProfitPct: number;
    stopLossPct: number;
    jitoTipSol: number;
  };
}

export const VpsBotModal: React.FC<VpsBotModalProps> = ({ isOpen, onClose }) => {
  const [botData, setBotData] = useState<BotData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'monitor' | 'guide'>('monitor');

  const fetchBotStatus = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/bot/status', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setBotData(json.data);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch bot status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchBotStatus();
      const interval = setInterval(fetchBotStatus, 10000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isOnline = botData?.status === 'ONLINE';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-terminal-panel border border-terminal-border rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col font-mono text-xs max-h-[92vh]">
        {/* Header */}
        <div className="p-4 border-b border-terminal-border flex items-center justify-between bg-terminal-card/80">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${isOnline ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400 animate-pulse' : 'bg-amber-500/15 border-amber-500/30 text-amber-400'}`}>
              <Server className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm tracking-wider text-terminal-text">
                  VPS 24/7 AUTONOMOUS SIGNAL BOT
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${isOnline ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-amber-500/20 text-amber-400 border-amber-500/40'}`}>
                  {isOnline ? 'ONLINE (PM2)' : 'STANDBY'}
                </span>
              </div>
              <p className="text-[10px] text-terminal-muted">
                Background service on-chain scanner & broadcaster di AlmaLinux VPS • Jito Tokyo MEV Sub-Slot
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={fetchBotStatus}
              disabled={isLoading}
              title="Refresh Status Bot"
              className="p-1.5 rounded-lg bg-terminal-card hover:bg-zinc-800 text-terminal-muted hover:text-terminal-text transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-terminal-cyan' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-terminal-card hover:bg-zinc-800 text-terminal-muted hover:text-terminal-text transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-terminal-border bg-terminal-panel/50 px-4 pt-2 gap-2">
          <button
            onClick={() => setActiveTab('monitor')}
            className={`pb-2 px-3 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'monitor'
                ? 'border-terminal-cyan text-terminal-cyan'
                : 'border-transparent text-terminal-muted hover:text-zinc-300'
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
                : 'border-transparent text-terminal-muted hover:text-zinc-300'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Panduan Koneksi Phantom HP</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'monitor' ? (
            <>
              {/* Dual-Mode Architecture Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 rounded-xl bg-terminal-card/80 border border-terminal-border space-y-1">
                  <div className="flex items-center gap-1.5 text-terminal-cyan font-bold text-[11px]">
                    <Layers className="w-3.5 h-3.5" />
                    <span>OPSI A: Web-Client Trading</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-relaxed">
                    Trading via browser di HP/Laptop. Memerlukan konfirmasi klik <strong>Approve</strong> di Phantom extension demi keamanan maksimal.
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-terminal-card/80 border border-purple-500/30 space-y-1">
                  <div className="flex items-center gap-1.5 text-purple-300 font-bold text-[11px]">
                    <Zap className="w-3.5 h-3.5" />
                    <span>OPSI B: VPS 24/7 Autonomous</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-relaxed">
                    Bot berjalan 24 jam di VPS. Menggunakan <strong>Hot Wallet Khusus</strong>, pemindaian sinyal otomatis tanpa perlu buka website.
                  </p>
                </div>
              </div>

              {/* Bot Wallet & Metrics Card */}
              <div className="p-3.5 rounded-xl bg-terminal-card border border-terminal-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-terminal-muted font-bold uppercase tracking-wider">
                    DEDICATED BOT HOT WALLET (VPS)
                  </span>
                  <span className="text-[10px] text-terminal-cyan">
                    Jito Tokyo Block Engine: Online
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="p-2.5 rounded-lg bg-zinc-900/90 border border-zinc-800">
                    <span className="text-[9px] text-terminal-muted block">PUBLIC ADDRESS</span>
                    {botData?.walletPublicKey ? (
                      <div className="flex items-center justify-between gap-1 mt-0.5">
                        <span className="font-mono text-terminal-cyan truncate text-[11px]" title={botData.walletPublicKey}>
                          {botData.walletPublicKey.slice(0, 4)}...{botData.walletPublicKey.slice(-4)}
                        </span>
                        <button
                          onClick={() => {
                            if (botData.walletPublicKey) {
                              navigator.clipboard.writeText(botData.walletPublicKey);
                              setCopiedKey(true);
                              setTimeout(() => setCopiedKey(false), 2000);
                            }
                          }}
                          className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-amber-400 font-bold mt-0.5 block">
                        Belum Diisi di .env.local
                      </span>
                    )}
                  </div>

                  <div className="p-2.5 rounded-lg bg-zinc-900/90 border border-zinc-800">
                    <span className="text-[9px] text-terminal-muted block">SALDO SOL REAL-TIME</span>
                    <span className="text-sm font-bold text-terminal-green mt-0.5 block">
                      {botData?.balanceSol ? `${botData.balanceSol.toFixed(4)} SOL` : '0.0000 SOL'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-zinc-900/90 border border-zinc-800">
                    <span className="text-[9px] text-terminal-muted block">PENGATURAN TRADING</span>
                    <span className="text-[11px] font-bold text-terminal-text mt-0.5 block">
                      {botData?.settings?.buyAmountSol || 0.02} SOL / Trade (Min Score: {botData?.settings?.minViralityScore || 80})
                    </span>
                  </div>
                </div>
              </div>

              {/* Active Positions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-terminal-muted">
                    POSISI AKTIF AUTONOMOUS VPS ({botData?.activePositions?.length || 0})
                  </span>
                  <span className="text-[9px] text-terminal-muted">
                    TP: +50% | SL: -20% Trailing
                  </span>
                </div>

                {botData?.activePositions && botData.activePositions.length > 0 ? (
                  <div className="space-y-1.5">
                    {botData.activePositions.map((pos) => (
                      <div key={pos.id} className="p-2.5 rounded-xl bg-terminal-card border border-terminal-border flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-terminal-cyan">{pos.symbol}</span>
                            <span className="text-[10px] text-zinc-500 font-mono">({pos.name})</span>
                          </div>
                          <div className="text-[10px] text-terminal-muted mt-0.5">
                            Investasi: {pos.investedSol} SOL • Dibuka: {new Date(pos.openedAt).toLocaleTimeString()}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`font-bold text-xs ${pos.pnlPct >= 0 ? 'text-terminal-green' : 'text-terminal-red'}`}>
                            {pos.pnlPct >= 0 ? `+${pos.pnlPct.toFixed(2)}%` : `${pos.pnlPct.toFixed(2)}%`}
                          </span>
                          {pos.txSignature && (
                            <a
                              href={`https://solscan.io/tx/${pos.txSignature}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[9px] text-purple-400 hover:underline flex items-center justify-end gap-0.5 mt-0.5"
                            >
                              <span>Solscan</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-terminal-card/50 border border-dashed border-zinc-800 text-center text-[11px] text-zinc-500">
                    Tidak ada posisi aktif saat ini. Bot akan membuka posisi secara otomatis ketika koin lolos scoring multi-agent.
                  </div>
                )}
              </div>

              {/* Recent Trades */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase text-terminal-muted">
                  RIWAYAT TRADE ON-CHAIN TERAKHIR
                </span>
                {botData?.recentTrades && botData.recentTrades.length > 0 ? (
                  <div className="space-y-1.5">
                    {botData.recentTrades.slice(0, 5).map((t, idx) => (
                      <div key={idx} className="p-2 rounded-lg bg-zinc-900/80 border border-zinc-800 flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${t.type === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-purple-500/20 text-purple-400'}`}>
                            {t.type}
                          </span>
                          <span className="font-bold text-zinc-200">{t.symbol}</span>
                          <span className="text-zinc-500 font-mono text-[10px]">{t.amountSol} SOL</span>
                        </div>
                        <a
                          href={`https://solscan.io/tx/${t.txSignature}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-terminal-cyan hover:underline flex items-center gap-1"
                        >
                          <span>{t.txSignature.slice(0, 6)}...</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-terminal-card/50 border border-zinc-800 text-center text-[10px] text-zinc-500">
                    Belum ada riwayat transaksi on-chain.
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Guide Tab: How to connect & view in Phantom HP */
            <div className="space-y-3 text-zinc-300">
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 space-y-1.5">
                <div className="flex items-center gap-1.5 text-purple-300 font-bold text-xs">
                  <Smartphone className="w-4 h-4" />
                  <span>Cara Kerja: Koin Otomatis Muncul di Phantom HP Anda</span>
                </div>
                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  Dengan mengimpor <strong>Private Key Hot Wallet VPS</strong> yang sama ke aplikasi Phantom di HP Anda, Anda bisa memantau pergerakan saldo dan menerima koin meme secara live tanpa perlu menyalakan laptop.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-terminal-text text-xs uppercase tracking-wider">
                  Langkah-Langkah Setup (Hanya 3 Menit):
                </h4>

                <div className="p-3 rounded-xl bg-terminal-card border border-terminal-border space-y-1">
                  <span className="text-[10px] text-terminal-cyan font-bold block">LANGKAH 1: Buat Akun Khusus di Phantom</span>
                  <p className="text-[10px] text-zinc-400">
                    Buka Phantom di HP atau browser &gt; Tambah Wallet &gt; Buat Akun Baru (beri nama misalnya <strong>&quot;Grok Signal VPS&quot;</strong>).
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-terminal-card border border-terminal-border space-y-1">
                  <span className="text-[10px] text-terminal-cyan font-bold block">LANGKAH 2: Isi Saldo Uji Coba</span>
                  <p className="text-[10px] text-zinc-400">
                    Transfer <strong>0.05 - 0.1 SOL</strong> ke wallet tersebut untuk modal awal bot atau gas fee.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-terminal-card border border-terminal-border space-y-1">
                  <span className="text-[10px] text-terminal-cyan font-bold block">LANGKAH 3: Salin Private Key ke VPS</span>
                  <p className="text-[10px] text-zinc-400">
                    Di Phantom: Buka Settings &gt; Security &amp; Privacy &gt; <strong>Export Private Key</strong>. Salin string Base58 tersebut, lalu buka terminal VPS:
                  </p>
                  <pre className="p-2 rounded bg-black/60 border border-zinc-800 text-[10px] text-emerald-400 overflow-x-auto mt-1">
                    nano ~/AI-AGENT-MEMECOIN-ALZA/.env.local
                  </pre>
                  <p className="text-[10px] text-zinc-400 mt-1">
                    Tambahkan baris berikut di baris paling bawah:
                  </p>
                  <pre className="p-2 rounded bg-black/60 border border-zinc-800 text-[10px] text-cyan-300 overflow-x-auto mt-1">
                    AUTONOMOUS_BOT_PRIVATE_KEY=PASTE_PRIVATE_KEY_KAMU_DISINI
                  </pre>
                </div>

                <div className="p-3 rounded-xl bg-terminal-card border border-terminal-border space-y-1">
                  <span className="text-[10px] text-terminal-cyan font-bold block">LANGKAH 4: Jalankan Service PM2 di VPS</span>
                  <p className="text-[10px] text-zinc-400">
                    Jalankan daemon agar bot bekerja otomatis 24 jam nonstop:
                  </p>
                  <pre className="p-2 rounded bg-black/60 border border-zinc-800 text-[10px] text-purple-300 overflow-x-auto mt-1">
                    pm2 start scripts/signal-daemon.mjs --name &quot;grok-signal&quot;
                  </pre>
                  <pre className="p-2 rounded bg-black/60 border border-zinc-800 text-[10px] text-zinc-400 overflow-x-auto mt-1">
                    pm2 save
                  </pre>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2 text-[10px] text-amber-300">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <p>
                  <strong>Tips Keamanan:</strong> Jangan gunakan private key dari dompet utama Anda yang berisi aset besar. Selalu gunakan dompet cadangan (burner wallet) dengan saldo yang cukup untuk testing strategi sinyal.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-terminal-border bg-terminal-card/80 flex items-center justify-between">
          <span className="text-[10px] text-terminal-muted">
            {copiedKey ? '✅ Alamat disalin ke clipboard!' : 'Dual-Mode Engine: Web Client (Manual) & VPS Daemon (24/7 Auto)'}
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
