'use client';

import React, { useState } from 'react';
import {
  X,
  Copy,
  Check,
  Download,
  Share2,
  Image as ImageIcon,
  FileText,
  ExternalLink,
  Sparkles,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Send,
} from 'lucide-react';
import {
  copyImageToClipboard,
  copyTextToClipboard,
  copySignalWithImageToClipboard,
  downloadImageBlob
} from '../../utils/generateSignalImage';

export interface SignalShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  direction: 'LONG' | 'SHORT';
  formattedText: string;
  imageBlob: Blob | null;
  imageUrl: string | null;
  strategyLabel?: string;
  entryPrice: number;
  tpPrice: number;
  slPrice: number;
  binanceUrl?: string;
}

export const SignalShareModal: React.FC<SignalShareModalProps> = ({
  isOpen,
  onClose,
  symbol,
  direction,
  formattedText,
  imageBlob,
  imageUrl,
  strategyLabel,
  entryPrice,
  tpPrice,
  slPrice,
  binanceUrl,
}) => {
  const [copiedType, setCopiedType] = useState<'both' | 'image' | 'text' | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen) return null;

  const isLong = direction === 'LONG';
  const filename = `${symbol.replace('/', '-')}-${direction}-analisis.png`;
  const targetShareUrl = binanceUrl || `https://www.binance.com/en/futures/${symbol.replace('/', '')}`;

  const handleCopyBoth = async () => {
    if (!imageBlob) return;
    setCopiedType('both');
    // Salin ke clipboard tanpa otomatis men-download file gambar ke disk
    await copySignalWithImageToClipboard(formattedText, imageBlob);
    setTimeout(() => setCopiedType(null), 3000);
  };

  const handleCopyImageOnly = async () => {
    if (!imageBlob) return;
    setCopiedType('image');
    await copyImageToClipboard(imageBlob);
    setTimeout(() => setCopiedType(null), 3000);
  };

  const handleCopyTextOnly = async () => {
    setCopiedType('text');
    await copyTextToClipboard(formattedText);
    setTimeout(() => setCopiedType(null), 3000);
  };

  const handleDownload = () => {
    if (!imageBlob) return;
    setIsDownloading(true);
    downloadImageBlob(imageBlob, filename);
    setTimeout(() => setIsDownloading(false), 1500);
  };

  const handleShareTelegramApp = () => {
    const encodedText = encodeURIComponent(formattedText);
    const encodedUrl = encodeURIComponent(targetShareUrl);
    // Buka aplikasi Telegram resmi (Desktop/Mobile) via protocol tg://
    window.location.href = `tg://msg_url?url=${encodedUrl}&text=${encodedText}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:px-6 py-3.5 bg-zinc-900/80 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${isLong ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white font-mono flex items-center gap-1.5">
                  Salin Sinyal &amp; Gambar Analisis
                </h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-black font-mono flex items-center gap-0.5 ${
                  isLong ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}>
                  {isLong ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {direction}
                </span>
                <span className="text-xs text-zinc-400 font-mono font-bold">{symbol}</span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Format profesional komunitas Telegram/Discord siap salin &amp; posting.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Two Columns (Image Preview & Text Preview) */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {/* Action Callout Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/80">
            {/* 1. Salin Gambar Saja */}
            <button
              onClick={handleCopyImageOnly}
              className={`p-2.5 rounded-xl border font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                copiedType === 'image'
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-md'
                  : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-200 hover:text-white'
              }`}
            >
              {copiedType === 'image' ? <Check className="w-4 h-4 text-emerald-400" /> : <ImageIcon className="w-4 h-4 text-yellow-400" />}
              <span>{copiedType === 'image' ? 'Foto Disalin!' : '1. Salin Gambar (Ctrl+V)'}</span>
            </button>

            {/* 2. Salin Teks Saja */}
            <button
              onClick={handleCopyTextOnly}
              className={`p-2.5 rounded-xl border font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                copiedType === 'text'
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 shadow-md'
                  : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-700 text-zinc-200 hover:text-white'
              }`}
            >
              {copiedType === 'text' ? <Check className="w-4 h-4 text-emerald-400" /> : <FileText className="w-4 h-4 text-sky-400" />}
              <span>{copiedType === 'text' ? 'Teks Disalin!' : '2. Salin Caption Teks'}</span>
            </button>

            {/* 3. Salin Keduanya (Tanpa Unduh Otomatis) */}
            <button
              onClick={handleCopyBoth}
              className={`p-2.5 rounded-xl border font-mono text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                copiedType === 'both'
                  ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 shadow-lg'
                  : 'bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-zinc-950 border-yellow-400 shadow-sm'
              }`}
            >
              {copiedType === 'both' ? <Check className="w-4 h-4 text-zinc-950 font-black" /> : <Sparkles className="w-4 h-4 text-zinc-950 font-black" />}
              <span>{copiedType === 'both' ? 'Sinyal & Foto Tersalin!' : '⚡ Salin Sinyal + Foto'}</span>
            </button>
          </div>

          {/* Side-by-side display */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left: HD Chart Image Preview */}
            <div className="lg:col-span-7 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
                <span className="flex items-center gap-1.5 font-bold text-zinc-300">
                  <ImageIcon className="w-3.5 h-3.5 text-yellow-400" />
                  Gambar Grafik Analisis (1200 x 675 HD)
                </span>
                <button
                  onClick={handleDownload}
                  disabled={isDownloading}
                  className="text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer font-bold"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download (.PNG)</span>
                </button>
              </div>

              <div className="relative rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900/60 flex items-center justify-center shadow-lg group">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={`${symbol} Analisis Teknikal`}
                    className="w-full h-auto object-contain rounded-xl"
                  />
                ) : (
                  <div className="py-24 text-center text-zinc-500 text-xs font-mono">
                    Memuat visual grafik analisis...
                  </div>
                )}
                {/* Floating Quick Download Badge */}
                {imageUrl && (
                  <button
                    onClick={handleDownload}
                    className="absolute top-3 right-3 px-2.5 py-1.5 rounded-lg bg-zinc-950/80 hover:bg-zinc-900 border border-zinc-700 text-zinc-200 hover:text-white text-[11px] font-mono font-bold flex items-center gap-1.5 backdrop-blur-sm shadow-md transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-sky-400" />
                    <span>Unduh PNG</span>
                  </button>
                )}
              </div>
            </div>

            {/* Right: Formatted Signal Text Preview */}
            <div className="lg:col-span-5 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs text-zinc-400 font-mono">
                <span className="flex items-center gap-1.5 font-bold text-zinc-300">
                  <FileText className="w-3.5 h-3.5 text-sky-400" />
                  Narasi Caption Telegram / Discord
                </span>
                <button
                  onClick={handleCopyTextOnly}
                  className="text-yellow-400 hover:text-yellow-300 flex items-center gap-1 cursor-pointer font-bold"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Salin Teks</span>
                </button>
              </div>

              <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/40 text-xs text-zinc-200 font-sans leading-relaxed whitespace-pre-wrap select-all max-h-[360px] overflow-y-auto custom-scrollbar border-l-2 border-l-yellow-400">
                {formattedText}
              </div>
            </div>
          </div>

          {/* Telegram Posting Guide Box */}
          <div className="bg-sky-500/[0.06] border border-sky-500/25 rounded-xl p-3.5 flex items-start gap-3 text-xs text-zinc-300">
            <span className="text-lg">💡</span>
            <div className="space-y-1">
              <p className="font-bold text-sky-300">Cara Kirim Sinyal ke Aplikasi Telegram:</p>
              <ol className="list-decimal list-inside text-zinc-400 space-y-0.5 text-[11.5px]">
                <li>Klik tombol <strong>&ldquo;Buka di Aplikasi Telegram&rdquo;</strong> di bawah untuk membuka Telegram Desktop/HP langsung dengan teks dan tautan trading aktif!</li>
                <li>Atau klik <strong>&ldquo;1. Salin Gambar&rdquo;</strong> lalu tekan <code>Ctrl + V</code> di chat Telegram jika ingin melampirkan gambar grafik.</li>
                <li>Jika membutuhkan file gambar disimpan di komputer, klik tombol <strong>&ldquo;Download (.PNG)&rdquo;</strong>.</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-zinc-900/80 border-t border-zinc-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            {/* Direct Deep Link to Telegram Desktop / Mobile App */}
            <button
              onClick={handleShareTelegramApp}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white text-xs font-mono font-bold flex items-center gap-2 transition-all shadow-md shadow-sky-500/25 active:scale-95 cursor-pointer"
              title="Buka Aplikasi Telegram Desktop atau HP langsung dengan teks dan tautan"
            >
              <Send className="w-3.5 h-3.5 text-white" />
              <span>Buka di Aplikasi Telegram (Ada Link)</span>
            </button>

            <button
              onClick={() => {
                const encodedText = encodeURIComponent(formattedText);
                const encodedUrl = encodeURIComponent(targetShareUrl);
                window.open(`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`, '_blank');
              }}
              className="text-[11px] text-zinc-500 hover:text-zinc-300 font-mono underline cursor-pointer px-1"
              title="Buka Telegram Web jika aplikasi belum terpasang"
            >
              (Versi Web)
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-mono font-bold transition-colors cursor-pointer"
            >
              Tutup
            </button>
            <button
              onClick={handleCopyBoth}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-zinc-950 text-xs font-mono font-black flex items-center gap-2 transition-all shadow-md cursor-pointer"
            >
              {copiedType === 'both' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedType === 'both' ? 'Sinyal & Foto Tersalin!' : 'Salin Semua'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
