'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Newspaper,
  Send,
  RefreshCw,
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { NewsImpactScore, CryptoNewsItem } from '@/types/newsTypes';

interface NewsSentimentPanelProps {
  onSelectCoin?: (symbol: string) => void;
  onRefreshSignals?: () => void;
}

export function NewsSentimentPanel({ onSelectCoin, onRefreshSignals }: NewsSentimentPanelProps) {
  const [symbolScores, setSymbolScores] = useState<Record<string, NewsImpactScore>>({});
  const [headlines, setHeadlines] = useState<CryptoNewsItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // Manual Paste State
  const [manualText, setManualText] = useState<string>('');
  const [isAnalyzingManual, setIsAnalyzingManual] = useState<boolean>(false);
  const [manualSuccessMsg, setManualSuccessMsg] = useState<string | null>(null);

  const fetchNewsData = useCallback(async (refresh = false) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/futures/news-sentiment?refresh=${refresh}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSymbolScores(data.symbolScores || {});
          setHeadlines(data.recentHeadlines || []);
          setLastUpdated(data.lastUpdated || Date.now());
        }
      }
    } catch (err) {
      console.warn('Failed to load news sentiment:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNewsData(false);
    // Auto-refresh news every 15 minutes
    const interval = setInterval(() => fetchNewsData(false), 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchNewsData]);

  const handleManualAnalyze = async () => {
    if (!manualText.trim()) return;
    setIsAnalyzingManual(true);
    setManualSuccessMsg(null);

    try {
      const res = await fetch('/api/futures/news-sentiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manualNews: manualText }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.scores) {
          setSymbolScores((prev) => ({ ...prev, ...data.scores }));
          setManualSuccessMsg(`✅ AI berhasil menganalisis sentimen untuk ${data.count || 1} simbol.`);
          setManualText('');
          if (onRefreshSignals) {
            onRefreshSignals();
          }
        }
      } else {
        setManualSuccessMsg('⚠️ Gagal memproses teks berita. Coba lagi beberapa saat.');
      }
    } catch (err) {
      setManualSuccessMsg('⚠️ Terjadi gangguan koneksi saat analisis berita.');
    } finally {
      setIsAnalyzingManual(false);
    }
  };

  const scoreEntries = Object.entries(symbolScores);

  return (
    <div className="bg-[#0e0e0e] border border-cyan-500/20 hover:border-cyan-500/30 rounded-2xl p-4 shadow-[0_0_25px_rgba(6,182,212,0.06)] transition-all">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Newspaper className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-mono text-xs sm:text-sm font-black text-white tracking-wide flex items-center gap-1.5">
                AI NEWS SENTIMENT ENGINE
                <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                  PUBLIC FEED & GEMINI
                </span>
              </h3>
            </div>
            <p className="text-[11px] text-zinc-400 font-sans">
              Bobot konfluensi 70% teknikal + 30% berita pasar real-time
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchNewsData(true)}
            disabled={isLoading}
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer"
            title="Refresh berita & sentimen"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer"
            title={isExpanded ? 'Kecilkan panel' : 'Buka panel'}
          >
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-4 pt-3">
          {/* Active Symbol Sentiment Chips */}
          {scoreEntries.length > 0 ? (
            <div>
              <div className="text-[10px] font-mono font-bold text-zinc-500 uppercase mb-2 flex items-center justify-between">
                <span>SENTIMEN PASAR TERBARU PER SIMBOL:</span>
                <span className="text-zinc-600">Updated: {new Date(lastUpdated).toLocaleTimeString()}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {scoreEntries.map(([sym, item]) => {
                  const isBullish = item.sentimentScore > 0;
                  const isBearish = item.sentimentScore < 0;
                  const absScore = Math.abs(item.sentimentScore);

                  let badgeColor = 'bg-zinc-800 text-zinc-300 border-zinc-700';
                  let iconColor = 'text-zinc-400';
                  if (isBullish) {
                    badgeColor = 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30';
                    iconColor = 'text-emerald-400';
                  } else if (isBearish) {
                    badgeColor = 'bg-red-500/10 text-red-300 border-red-500/30';
                    iconColor = 'text-red-400';
                  }

                  return (
                    <div
                      key={sym}
                      onClick={() => onSelectCoin && onSelectCoin(sym)}
                      className={`p-2.5 rounded-xl border ${badgeColor} transition-all cursor-pointer hover:scale-[1.02] flex flex-col justify-between`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="font-mono font-black text-xs text-white">{sym}</span>
                        <div className="flex items-center gap-1 font-mono text-[11px] font-bold">
                          {isBullish ? (
                            <TrendingUp className={`w-3 h-3 ${iconColor}`} />
                          ) : isBearish ? (
                            <TrendingDown className={`w-3 h-3 ${iconColor}`} />
                          ) : null}
                          <span className={iconColor}>
                            {isBullish ? `+${item.sentimentScore}` : item.sentimentScore}
                          </span>
                        </div>
                      </div>

                      <p className="text-[10px] text-zinc-300 line-clamp-2 leading-snug mb-1.5 font-sans">
                        {item.keyHeadline}
                      </p>

                      <div className="flex items-center justify-between text-[9px] font-mono text-zinc-400 pt-1 border-t border-white/5">
                        <span className="truncate max-w-[110px]">🏷️ {item.catalystType}</span>
                        <span className="text-zinc-500">{item.impactLevel}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-900 text-center text-xs text-zinc-500 font-mono">
              Belum ada data sentimen berita. Tekan tombol refresh atau paste berita di bawah.
            </div>
          )}

          {/* Section: Paste Berita Manual (WA / Telegram) */}
          <div className="bg-zinc-950/80 border border-white/5 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-mono font-bold text-cyan-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                PASTE BERITA MANUAL (FORWARD TELEGRAM / WHATSAPP):
              </label>
              <span className="text-[10px] text-zinc-500 font-mono">AI Auto-Extract Symbols</span>
            </div>

            <p className="text-[10px] text-zinc-400 mb-2 leading-relaxed">
              Dapat menyerap berita forward unformatted (misal: pengumuman adopsi, rilis data whale, penjualan korporasi, opsi expiry).
            </p>

            <div className="space-y-2">
              <textarea
                value={manualText}
                onChange={(e) => setManualText(e.target.value)}
                placeholder="Tempel teks berita di sini, contoh:&#10;🇦🇪 UEA mengintegrasikan teknologi Avalanche ke infrastruktur identitas digital...&#10;🐋 KULR Technology menjual 764 BTC..."
                rows={3}
                className="w-full bg-[#0a0a0a] border border-white/10 focus:border-cyan-500/50 rounded-xl p-2.5 text-xs text-zinc-200 placeholder:text-zinc-600 font-sans focus:outline-none transition-all resize-none"
              />

              <div className="flex items-center justify-between gap-2">
                {manualSuccessMsg && (
                  <span className="text-[11px] font-mono font-medium text-emerald-400 animate-fade-in">
                    {manualSuccessMsg}
                  </span>
                )}
                {!manualSuccessMsg && <span />}

                <button
                  onClick={handleManualAnalyze}
                  disabled={isAnalyzingManual || !manualText.trim()}
                  className={`px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer ml-auto ${
                    isAnalyzingManual || !manualText.trim()
                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                      : 'bg-cyan-500 hover:bg-cyan-400 text-zinc-950 shadow-[0_0_15px_rgba(6,182,212,0.3)] active:scale-95'
                  }`}
                >
                  <Send className={`w-3.5 h-3.5 ${isAnalyzingManual ? 'animate-spin' : ''}`} />
                  <span>{isAnalyzingManual ? 'MENGANALISIS AI...' : 'ANALISIS SENTIMEN SEKARANG'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Section: Public RSS Ticker Feed */}
          {headlines.length > 0 && (
            <div className="pt-2 border-t border-white/5">
              <div className="text-[10px] font-mono font-bold text-zinc-500 uppercase mb-1.5">
                HEADLINE BERITA TERKINI (PUBLIC FEED):
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {headlines.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-zinc-900/40 hover:bg-zinc-900 text-[11px] border border-transparent hover:border-white/5 transition-all"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-zinc-800 text-zinc-400 shrink-0">
                        {item.source}
                      </span>
                      <span className="text-zinc-300 truncate font-sans">{item.title}</span>
                    </div>
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-zinc-500 hover:text-cyan-400 shrink-0"
                        title="Baca artikel"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
