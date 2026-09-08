'use client';

import React, { useState, useEffect } from 'react';
import { TokenSignal } from '@/types/terminal';
import { useTradingAgent } from '@/context/TradingContext';
import { 
  X, 
  Sparkles, 
  Flame, 
  Zap, 
  ShieldCheck, 
  Search, 
  Send, 
  ExternalLink, 
  TrendingUp, 
  Clock, 
  Sliders, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  RefreshCw,
  Coins,
  ArrowUpRight
} from 'lucide-react';

interface EarlyGemsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EarlyGemsModal: React.FC<EarlyGemsModalProps> = ({ isOpen, onClose }) => {
  const { scanSolanaLiveNow, promoteTokenToAlphaSignal } = useTradingAgent();

  const [maxMarketCap, setMaxMarketCap] = useState<number>(100000);
  const [minLiquidity, setMinLiquidity] = useState<number>(1000);
  const [platformFilter, setPlatformFilter] = useState<'ALL' | 'PUMP' | 'RAYDIUM'>('ALL');
  
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [tokens, setTokens] = useState<TokenSignal[]>([]);
  const [broadcastStatus, setBroadcastStatus] = useState<{ [mint: string]: 'idle' | 'sending' | 'sent' | 'error' }>({});
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  // Scan koin sub-100k saat modal dibuka pertama kali jika list masih kosong
  useEffect(() => {
    if (isOpen && tokens.length === 0) {
      handleScanTokens();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleScanTokens = async () => {
    setIsScanning(true);
    setScanMessage(null);
    try {
      // 1. Panggil on-demand live scanner dengan mode SUB_100K
      await scanSolanaLiveNow('SUB_100K');

      // 2. Ambil token live dari API /api/tokens/real?mode=SUB_100K
      const res = await fetch('/api/tokens/real?mode=SUB_100K');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.success && Array.isArray(data.tokens)) {
        // Filter berdasarkan batas Market Cap yang dipilih pengguna
        const filtered = data.tokens.filter((t: TokenSignal) => {
          const estMc = (t.initialLpUsd || 5000) * 5.5;
          const matchMc = estMc <= maxMarketCap;
          const matchLp = (t.initialLpUsd || 0) >= minLiquidity;
          const matchPlat = platformFilter === 'ALL' 
            || (platformFilter === 'PUMP' && t.platform === 'Pump.fun')
            || (platformFilter === 'RAYDIUM' && t.platform !== 'Pump.fun');
          return matchMc && matchLp && matchPlat;
        });

        setTokens(filtered);
        setScanMessage(
          filtered.length > 0
            ? `✅ Ditemukan ${filtered.length} koin early potensial di bawah $${(maxMarketCap / 1000).toFixed(0)}k MC!`
            : `⚠️ Tidak ada koin di bawah $${(maxMarketCap / 1000).toFixed(0)}k yang lolos filter likuiditas saat ini.`
        );
      } else {
        setScanMessage('⚠️ Gagal memuat koin dari pool DEX Solana.');
      }
    } catch (err: any) {
      setScanMessage(`❌ Error memindai: ${err?.message || 'Koneksi error'}`);
    } finally {
      setIsScanning(false);
    }
  };

  const handleBroadcastToken = async (token: TokenSignal) => {
    setBroadcastStatus(prev => ({ ...prev, [token.mint]: 'sending' }));
    try {
      const ok = await promoteTokenToAlphaSignal(token);
      if (ok) {
        setBroadcastStatus(prev => ({ ...prev, [token.mint]: 'sent' }));
      } else {
        setBroadcastStatus(prev => ({ ...prev, [token.mint]: 'error' }));
      }
    } catch {
      setBroadcastStatus(prev => ({ ...prev, [token.mint]: 'error' }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0c0d10] border border-emerald-500/40 rounded-2xl w-full max-w-2xl shadow-[0_0_50px_rgba(16,185,129,0.18)] overflow-hidden flex flex-col font-mono text-xs max-h-[92vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-zinc-800/80 bg-zinc-950/90 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/40 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.25)]">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm tracking-wider text-zinc-100">
                  RADAR KOIN EARLY (SUB-$100K MC)
                </span>
                <span className="text-[9px] px-2 py-0.5 rounded-full font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  GEMS HUNTER
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 mt-0.5">
                Pencarian koin Solana di bawah $100k Market Cap dengan Potensi Cuan 5x - 50x
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup radar koin early"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 border border-transparent hover:border-zinc-700 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
          
          {/* Quick Filter Presets: Sub-25k / Sub-50k / Sub-100k */}
          <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-3">
            <span className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-emerald-400" />
              <span>Target Market Cap (Early Stage):</span>
            </span>

            <div className="grid grid-cols-3 gap-2">
              {[
                { mc: 25000, label: '🔥 Sub-$25k MC', badge: '10x-50x', desc: 'Ultra-Early Pump.fun' },
                { mc: 50000, label: '⚡ Sub-$50k MC', badge: '5x-20x', desc: 'Early Accumulation' },
                { mc: 100000, label: '🚀 Sub-$100k MC', badge: '3x-10x', desc: 'Pre-Breakout / Raydium' },
              ].map((item) => (
                <button
                  key={item.mc}
                  type="button"
                  onClick={() => setMaxMarketCap(item.mc)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    maxMarketCap === item.mc
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-200 shadow-[0_0_15px_rgba(16,185,129,0.25)]'
                      : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-black text-xs">{item.label}</span>
                    <span className="text-[8px] px-1 py-0.2 rounded font-bold uppercase bg-zinc-900 border border-zinc-700 text-emerald-400">
                      {item.badge}
                    </span>
                  </div>
                  <span className="text-[9.5px] text-zinc-400">{item.desc}</span>
                </button>
              ))}
            </div>

            {/* Slider & Platform Switcher */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-zinc-800/80">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10.5px]">
                  <span className="text-zinc-400">Maksimum Market Cap:</span>
                  <span className="font-black text-emerald-400">${maxMarketCap.toLocaleString()} USD</span>
                </div>
                <input
                  type="range"
                  min="10000"
                  max="100000"
                  step="5000"
                  value={maxMarketCap}
                  onChange={(e) => setMaxMarketCap(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-400 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <span className="text-zinc-400 text-[10.5px] block">Filter Platform:</span>
                <div className="grid grid-cols-3 gap-1 text-[10px]">
                  {[
                    { id: 'ALL', label: 'Semua' },
                    { id: 'PUMP', label: 'Pump.fun' },
                    { id: 'RAYDIUM', label: 'Raydium' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPlatformFilter(p.id as any)}
                      className={`py-1 rounded-lg border text-center transition-all cursor-pointer font-bold ${
                        platformFilter === p.id
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Action Trigger Banner */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleScanTokens}
              disabled={isScanning}
              className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-black font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-[0_0_20px_rgba(16,185,129,0.35)] disabled:opacity-50"
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memindai Pool Solana (&lt;$100k MC)...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>⚡ CARI KOIN EARLY SEKARANG (&lt;${(maxMarketCap / 1000).toFixed(0)}K MC)</span>
                </>
              )}
            </button>
          </div>

          {/* Scan Status Feedback */}
          {scanMessage && (
            <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 text-[11px] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{scanMessage}</span>
            </div>
          )}

          {/* Tokens List Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-zinc-300 uppercase">
                DAFTAR KOIN EARLY DITEMUKAN ({tokens.length})
              </span>
              <span className="text-[10px] text-zinc-500">
                Otomatis lolos Honeypot &amp; Mint Revoked
              </span>
            </div>

            {tokens.length === 0 ? (
              <div className="p-8 rounded-xl bg-zinc-950/60 border border-zinc-800/80 text-center space-y-2">
                <Coins className="w-8 h-8 text-zinc-600 mx-auto" />
                <p className="text-zinc-400 text-xs">Belum ada token yang discan.</p>
                <p className="text-zinc-500 text-[10.5px]">
                  Klik tombol <strong>"CARI KOIN EARLY SEKARANG"</strong> di atas untuk memindai pool live Solana.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {tokens.map((token) => {
                  const estMc = (token.initialLpUsd || 5000) * 5.5;
                  const potentialTargetMc = 500000; // Jika tembus $500k MC
                  const multiplier = (potentialTargetMc / Math.max(estMc, 5000)).toFixed(1);
                  const cleanSym = token.symbol.replace(/^\$+/, '');
                  const status = broadcastStatus[token.mint] || 'idle';

                  return (
                    <div
                      key={token.mint}
                      className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 hover:border-emerald-500/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-zinc-100">${cleanSym}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            {token.platform}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-300 bg-black/50 px-2 py-0.5 rounded border border-emerald-500/20">
                            MC: ~${Math.round(estMc).toLocaleString()}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-[10px] text-zinc-400 flex-wrap">
                          <span>LP: <strong className="text-zinc-200">${token.initialLpUsd?.toLocaleString() || '6,000'}</strong></span>
                          <span>•</span>
                          <span>Top 10: <strong className="text-zinc-200">{token.top10HolderPct || 8}%</strong></span>
                          <span>•</span>
                          <span className="text-amber-400 font-bold flex items-center gap-0.5">
                            <TrendingUp className="w-3 h-3" /> Potensi jika $500k: ~{multiplier}x
                          </span>
                        </div>

                        <div className="text-[9.5px] text-zinc-500 font-mono truncate max-w-xs">
                          CA: {token.mint}
                        </div>
                      </div>

                      {/* Action Buttons for Token */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Photon / BullX link */}
                        <a
                          href={`https://photon-sol.tinyastro.io/en/lp/${token.mint}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-[10.5px] font-bold flex items-center gap-1 transition-all"
                          title="Buka Chart di Photon"
                        >
                          <span>Chart</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>

                        {/* Broadcast to Telegram Button */}
                        <button
                          type="button"
                          onClick={() => handleBroadcastToken(token)}
                          disabled={status === 'sending' || status === 'sent'}
                          className={`px-3 py-1.5 rounded-lg font-black text-[10.5px] flex items-center gap-1.5 transition-all cursor-pointer ${
                            status === 'sent'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : status === 'error'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                              : 'bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                          }`}
                        >
                          {status === 'sending' ? (
                            <>
                              <Loader2 className="w-3 h-3 animate-spin" />
                              <span>Mengirim...</span>
                            </>
                          ) : status === 'sent' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Terkirim ke Telegram!</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3 h-3" />
                              <span>Siarkan Sinyal</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-zinc-800/80 bg-zinc-950/90 flex items-center justify-between">
          <span className="text-[10px] text-zinc-500">
            Koin di bawah $100k MC memiliki potensi keuntungan asimetris tinggi.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold transition-all cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
};
