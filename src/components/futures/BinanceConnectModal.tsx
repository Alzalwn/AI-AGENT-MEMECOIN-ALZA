'use client';

import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  RefreshCw,
  Wallet,
  Zap,
  Trash2,
} from 'lucide-react';

interface BinanceConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectionSuccess?: (info: {
    isTestnet: boolean;
    totalWalletBalance: string;
    availableBalance: string;
  }) => void;
}

export const BINANCE_STORAGE_KEY = 'GROK_FUTURES_BINANCE_CONFIG_V1';

export interface SavedBinanceConfig {
  apiKey: string;
  apiSecret: string;
  isTestnet: boolean;
  lastConnectedAt?: number;
  walletBalance?: string;
  availableBalance?: string;
}

export const BinanceConnectModal: React.FC<BinanceConnectModalProps> = ({
  isOpen,
  onClose,
  onConnectionSuccess,
}) => {
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [isTestnet, setIsTestnet] = useState(true);
  const [showSecret, setShowSecret] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'idle';
    text: string;
    details?: {
      totalWalletBalance: string;
      availableBalance: string;
      canTrade: boolean;
    };
  }>({ type: 'idle', text: '' });

  // Load saved credentials on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(BINANCE_STORAGE_KEY);
      if (saved) {
        const parsed: SavedBinanceConfig = JSON.parse(saved);
        setApiKey(parsed.apiKey || '');
        setApiSecret(parsed.apiSecret || '');
        setIsTestnet(parsed.isTestnet !== undefined ? parsed.isTestnet : true);
        if (parsed.walletBalance) {
          setStatusMessage({
            type: 'success',
            text: `Tersambung sebelumnya (${parsed.isTestnet ? 'Testnet' : 'Live'})`,
            details: {
              totalWalletBalance: parsed.walletBalance,
              availableBalance: parsed.availableBalance || parsed.walletBalance,
              canTrade: true,
            },
          });
        }
      }
    } catch (e) {
      console.error('Failed to load Binance credentials from storage:', e);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!apiKey.trim() || !apiSecret.trim()) {
      setStatusMessage({
        type: 'error',
        text: 'Mohon isi API Key dan API Secret Key terlebih dahulu.',
      });
      return;
    }

    setIsTesting(true);
    setStatusMessage({ type: 'idle', text: '' });

    try {
      const res = await fetch('/api/futures/binance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'test_connection',
          apiKey: apiKey.trim(),
          apiSecret: apiSecret.trim(),
          isTestnet,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal menghubungi server Binance');
      }

      const balance = parseFloat(data.totalWalletBalance || '0').toFixed(2);
      const available = parseFloat(data.availableBalance || '0').toFixed(2);

      // Save to localStorage
      const configToSave: SavedBinanceConfig = {
        apiKey: apiKey.trim(),
        apiSecret: apiSecret.trim(),
        isTestnet,
        lastConnectedAt: Date.now(),
        walletBalance: balance,
        availableBalance: available,
      };
      localStorage.setItem(BINANCE_STORAGE_KEY, JSON.stringify(configToSave));

      setStatusMessage({
        type: 'success',
        text: `Koneksi Berhasil! Terhubung ke Binance Futures (${isTestnet ? 'Testnet' : 'Mainnet Live'})`,
        details: {
          totalWalletBalance: balance,
          availableBalance: available,
          canTrade: data.canTrade ?? true,
        },
      });

      if (onConnectionSuccess) {
        onConnectionSuccess({
          isTestnet,
          totalWalletBalance: balance,
          availableBalance: available,
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kegagalan koneksi';
      setStatusMessage({
        type: 'error',
        text: msg,
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleDisconnect = () => {
    if (window.confirm('Hapus kredensial Binance dari browser lokal ini?')) {
      localStorage.removeItem(BINANCE_STORAGE_KEY);
      setApiKey('');
      setApiSecret('');
      setStatusMessage({ type: 'idle', text: 'Koneksi Binance diputus.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-5 font-sans">
      <div className="bg-[#0b0e14] border border-amber-500/40 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden relative">
        {/* Modal Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-white tracking-wide font-mono">
                  INTEGRASI API BINANCE FUTURES
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  USDⓈ-M v2
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Hubungkan jurnal trading ke akun simulasi (Testnet) atau akun Live Binance Anda
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-white/10 text-zinc-400 hover:text-white text-xs font-mono cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 custom-scrollbar text-xs font-mono">
          {/* Target Environment Switcher */}
          <div className="bg-zinc-900/70 border border-white/10 rounded-xl p-3 sm:p-4">
            <div className="text-[11px] font-bold text-zinc-300 mb-2 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              Pilih Jaringan Binance (Target Network)
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsTestnet(true)}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                  isTestnet
                    ? 'bg-amber-500/15 border-amber-500/60 text-amber-200'
                    : 'bg-black/30 border-white/5 text-zinc-400 hover:border-white/20'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5 text-xs">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                  Binance Futures Testnet
                </div>
                <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">
                  Saldo virtual gratis. Sangat aman untuk uji coba tanpa risiko uang asli.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setIsTestnet(false)}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                  !isTestnet
                    ? 'bg-emerald-500/15 border-emerald-500/60 text-emerald-200'
                    : 'bg-black/30 border-white/5 text-zinc-400 hover:border-white/20'
                }`}
              >
                <div className="font-bold flex items-center gap-1.5 text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  Binance Mainnet (Live)
                </div>
                <p className="text-[10px] text-zinc-400 mt-1 leading-relaxed">
                  Akun riil Binance. Membaca saldo asli dan riwayat trade riil.
                </p>
              </button>
            </div>
          </div>

          {/* Credentials Inputs */}
          <div className="space-y-3.5">
            <div>
              <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                API KEY
              </label>
              <input
                type="text"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={
                  isTestnet
                    ? 'Paste API Key dari testnet.binancefuture.com...'
                    : 'Paste API Key dari Binance.com API Management...'
                }
                className="w-full bg-black/60 border border-white/10 focus:border-amber-500/80 rounded-lg px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                API SECRET KEY
              </label>
              <div className="relative">
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  placeholder="Paste Secret Key Anda di sini..."
                  className="w-full bg-black/60 border border-white/10 focus:border-amber-500/80 rounded-lg px-3 py-2 pr-10 text-xs text-white placeholder-zinc-600 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                >
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Status Message / Result Box */}
          {statusMessage.type !== 'idle' && (
            <div
              className={`p-3.5 rounded-xl border ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {statusMessage.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span className="font-semibold text-xs">{statusMessage.text}</span>
              </div>

              {statusMessage.details && (
                <div className="mt-3 grid grid-cols-2 gap-2 pt-2 border-t border-emerald-500/20 text-zinc-300">
                  <div className="bg-black/40 p-2 rounded-lg">
                    <div className="text-[10px] text-zinc-400 flex items-center gap-1">
                      <Wallet className="w-3 h-3 text-emerald-400" /> Saldo Dompet (USDT)
                    </div>
                    <div className="text-sm font-bold text-white mt-0.5">
                      ${statusMessage.details.totalWalletBalance}
                    </div>
                  </div>
                  <div className="bg-black/40 p-2 rounded-lg">
                    <div className="text-[10px] text-zinc-400">Margin Tersedia (USDT)</div>
                    <div className="text-sm font-bold text-emerald-400 mt-0.5">
                      ${statusMessage.details.availableBalance}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Security & Guide Box */}
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3.5 text-zinc-300 space-y-2">
            <div className="flex items-center gap-1.5 text-blue-400 font-bold text-xs">
              <ShieldCheck className="w-4 h-4" />
              Panduan Keamanan Rekomendasi:
            </div>
            <ul className="list-disc pl-4 space-y-1 text-[11px] text-zinc-400 leading-relaxed">
              <li>
                <strong>Cukup Izin &quot;Read-Only&quot;:</strong> Untuk sinkronisasi saldo dan histori
                transaksi ke jurnal, Anda TIDAK PERLU mengaktifkan izin penarikan (Withdraw) atau Spot.
              </li>
              <li>
                <strong>Koneksi Langsung Server:</strong> Kunci ditandatangani via HMAC-SHA256 langsung di
                Next.js API route server-side sehingga aman dari pembajakan skrip eksternal.
              </li>
              <li>
                <strong>Link Testnet:</strong> Anda bisa mendapatkan API Key gratis tanpa modal di{' '}
                <a
                  href="https://testnet.binancefuture.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 hover:underline inline-flex items-center gap-0.5"
                >
                  testnet.binancefuture.com <ExternalLink className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between bg-black/40">
          <div>
            {apiKey && (
              <button
                type="button"
                onClick={handleDisconnect}
                className="px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-mono flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Hapus Kredensial
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold text-xs font-mono flex items-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer"
            >
              {isTesting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Menghubungkan...
                </>
              ) : (
                <>
                  <KeyRound className="w-3.5 h-3.5" /> Hubungkan & Simpan
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
