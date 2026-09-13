'use client';

import React from 'react';
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  Zap,
  Radio,
  Bell,
  Layers,
  Download,
  ShieldCheck,
  ExternalLink,
  Bot,
  Flame,
  Activity,
} from 'lucide-react';

interface SystemRoadmapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SystemRoadmapModal: React.FC<SystemRoadmapModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-5">
      <div className="bg-[#0b0e14] border border-cyan-500/40 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans relative">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-white tracking-wide font-mono">
                  RANGKUMAN SISTEM & GAP ANALYSIS ROADMAP
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  v2.0 Pro Audit
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Status kesiapan sistem aktif dan daftar kebutuhan penyempurnaan terminal
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

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar text-xs font-mono">
          {/* Section 1: Completed Systems */}
          <div>
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 mb-3">
              <CheckCircle2 className="w-4 h-4" />
              <span>SISTEM AKTIF & TERINTEGRASI PENUH (100% OPERASIONAL)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-black/40 border border-emerald-500/30 p-3 rounded-xl space-y-2">
                <div className="text-white font-bold flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-emerald-400" />
                  <span>1. Solana Memecoin Sniping Terminal</span>
                </div>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  Konsensus 5 Agen AI (Scanner, Narrative, Risk, Timing, Exit) dengan batas pembatalan single-veto (&lt;10ms), alokasi Fractional Kelly, dan bundel privat Jito MEV anti-sandwich.
                </p>
              </div>

              <div className="bg-black/40 border border-emerald-500/30 p-3 rounded-xl space-y-2">
                <div className="text-white font-bold flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  <span>2. Binance Futures AI Alpha Engine</span>
                </div>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  Filter likuiditas $12M+, konfluensi MACD/RSI/EMA, Orderbook Depth Imbalance, dan BTC Market Guard untuk membatalkan sinyal saat Bitcoin flash dump.
                </p>
              </div>

              <div className="bg-black/40 border border-emerald-500/30 p-3 rounded-xl space-y-2">
                <div className="text-white font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>3. Suite Kuantitatif & SOP 2%</span>
                </div>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  Kalkulator Margin Interaktif, Matriks Open Interest 4 Rezim, Monitor Arbitrase Cash & Carry Delta-Neutral, Radar Killzones Sesi Pasar, dan Jurnal Paper Trading tersimpan di localStorage.
                </p>
              </div>

              <div className="bg-black/40 border border-emerald-500/30 p-3 rounded-xl space-y-2">
                <div className="text-white font-bold flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5 text-yellow-400" />
                  <span>4. Adversarial Debate & Auto-Hedge</span>
                </div>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  Simulasi tesis Banteng vs Beruang sebelum eksekusi serta rekomendasi lindung nilai dinamis untuk mengunci risiko saat pasar bergejolak ekstrem.
                </p>
              </div>

              <div className="bg-black/40 border border-emerald-500/30 p-3 rounded-xl space-y-2 md:col-span-2">
                <div className="text-white font-bold flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-400" />
                  <span>5. Multi-Timeframe Alignment Matrix (15m, 1h, 4h, Daily)</span>
                </div>
                <p className="text-zinc-400 text-[11px] leading-relaxed">
                  Higher Timeframe Alignment Protocol: Menguji keselarasan arah 4 horizon waktu secara simultan dengan sistem peringatan otomatis Counter-Trend Trap untuk mencegah trader melawan arus tren institusi.
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Gap Analysis - What is Missing */}
          <div>
            <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5 mb-3">
              <AlertCircle className="w-4 h-4" />
              <span>APA YANG MASIH KURANG? (ROADMAP PENYEMPURNAAN BERIKUTNYA)</span>
            </div>

            <div className="space-y-2.5">
              <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-white font-bold">
                    <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px]">PRIORITAS 1</span>
                    <span>⚡ Eksekusi Order Otomatis ke Binance (One-Click API Execution)</span>
                  </div>
                  <p className="text-zinc-400 text-[11px]">
                    Saat ini parameter order masih harus disalin manual. Penambahan integrasi Binance Futures API (Testnet / Live) akan memungkinkan eksekusi Limit/TP/SL otomatis dalam 0.3 detik.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-white font-bold">
                    <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px]">PRIORITAS 2</span>
                    <span>⚡ Live Binance WebSocket Stream (Sub-Detik)</span>
                  </div>
                  <p className="text-zinc-400 text-[11px]">
                    Menggantikan polling REST API (25 detik) dengan koneksi WebSocket (wss://) sehingga harga dan orderbook berdetik secara real-time sub-detik tanpa jeda.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-white font-bold">
                    <span className="px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-300 text-[10px]">PRIORITAS 3</span>
                    <span>🔔 Notifikasi Suara & Browser Web Push Alerts</span>
                  </div>
                  <p className="text-zinc-400 text-[11px]">
                    Memunculkan pop-up pemberitahuan laptop dan suara peringatan sci-fi saat terdeteksi sinyal berkategori SUPERNOVA (skor ≥85) agar tidak terlewat saat membuka tab lain.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-white font-bold">
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">PRIORITAS 4</span>
                    <span>📥 Ekspor Jurnal Trading ke CSV / Excel</span>
                  </div>
                  <p className="text-zinc-400 text-[11px]">
                    Tombol 1-klik untuk mengunduh seluruh riwayat paper trading ke file spreadsheet untuk keperluan audit kinerja dan laporan bulanan.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/10 bg-black/60 flex items-center justify-between text-xs font-mono">
          <div className="text-zinc-400 text-[11px]">
            Dokumen terkait: <span className="text-cyan-400 font-bold">SOP_TRADING_FUTURES.md</span> &amp; <span className="text-emerald-400 font-bold">PANDUAN_LENGKAP_CRYPTO_FUTURES.md</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-lg transition-all cursor-pointer"
          >
            Tutup Window
          </button>
        </div>
      </div>
    </div>
  );
};
