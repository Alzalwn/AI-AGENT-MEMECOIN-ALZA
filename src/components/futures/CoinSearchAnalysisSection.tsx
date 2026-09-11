'use client';

import React, { useState } from 'react';
import {
  Search,
  Sparkles,
  Zap,
  TrendingUp,
  TrendingDown,
  Send,
  BarChart2,
  Copy,
  Check,
  ExternalLink,
  Shield,
  Flame,
  AlertTriangle,
  RefreshCw,
  Settings,
  X,
} from 'lucide-react';
import { BinanceFuturesSignal } from '../../types/futures';
import { formatFuturesPrice } from '../../engine/futuresSignalEngine';
import { generateCommunitySignalPost } from '../../utils/signalPostFormatter';
import { useSettingsStore } from '../../store/useSettingsStore';

interface CoinSearchAnalysisSectionProps {
  onOpenChart: (symbol: string, signal?: BinanceFuturesSignal) => void;
}

const POPULAR_COINS = ['BTC', 'ETH', 'SOL', 'DOGE', 'PEPE', 'SUI', 'XRP', 'AVAX', 'NEAR', 'LINK', 'SHIB', 'WIF'];

export const CoinSearchAnalysisSection: React.FC<CoinSearchAnalysisSectionProps> = ({
  onOpenChart,
}) => {
  const [inputQuery, setInputQuery] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzedSignal, setAnalyzedSignal] = useState<BinanceFuturesSignal | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [scanStep, setScanStep] = useState<string>('');
  const [customWalletUsd, setCustomWalletUsd] = useState<number>(20);

  // Telegram Sending State
  const [isSendingTg, setIsSendingTg] = useState(false);
  const [tgSuccessMsg, setTgSuccessMsg] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState(false);

  // Quick Telegram Settings Drawer/Popover
  const [showTgConfigModal, setShowTgConfigModal] = useState(false);
  const { telegramBotToken, telegramChatId, updateSettings } = useSettingsStore();
  const [tempBotToken, setTempBotToken] = useState(telegramBotToken);
  const [tempChatId, setTempChatId] = useState(telegramChatId);

  const handleAnalyze = async (symbolToAnalyze?: string) => {
    const targetSymbol = (symbolToAnalyze || inputQuery).trim().toUpperCase();
    if (!targetSymbol) return;

    setIsAnalyzing(true);
    setErrorMsg(null);
    setTgSuccessMsg(null);
    setAnalyzedSignal(null);

    setScanStep('1/4: Menghubungkan ke Binance Futures Orderbook...');
    await new Promise((r) => setTimeout(r, 300));

    setScanStep('2/4: Membaca 35 Candlestick 15m & Deteksi Pola Reversal...');
    await new Promise((r) => setTimeout(r, 350));

    setScanStep('3/4: Mengalkulasi 5 Pilar Konfluensi (MA, BOLL, MACD, RSI, Candlestick)...');

    try {
      const res = await fetch(`/api/futures/analyze?symbol=${encodeURIComponent(targetSymbol)}`);
      const data = await res.json();

      if (data.success && data.signal) {
        setScanStep('4/4: Analisis Selesai! Menyusun Skenario Trading...');
        await new Promise((r) => setTimeout(r, 200));
        setAnalyzedSignal(data.signal);
      } else {
        setErrorMsg(data.error || `Koin "${targetSymbol}" tidak ditemukan di pasar Binance Futures.`);
      }
    } catch (err: unknown) {
      console.error('[CoinSearchAnalysis] Error:', err);
      setErrorMsg('Gagal terhubung ke server analisa. Silakan periksa koneksi internet Anda.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSendToTelegram = async () => {
    if (!analyzedSignal) return;

    if (!telegramBotToken.trim() || !telegramChatId.trim()) {
      setShowTgConfigModal(true);
      return;
    }

    setIsSendingTg(true);
    setTgSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/futures/telegram-broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signal: analyzedSignal,
          botToken: telegramBotToken,
          chatId: telegramChatId,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setTgSuccessMsg('✅ Sinyal dan analisis berhasil dikirim ke Telegram!');
        setTimeout(() => setTgSuccessMsg(null), 6000);
      } else {
        setErrorMsg(`Gagal kirim Telegram: ${data.error}`);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal mengirim sinyal ke Telegram.');
    } finally {
      setIsSendingTg(false);
    }
  };

  const handleCopyText = async () => {
    if (!analyzedSignal) return;
    const cleanPair = `${analyzedSignal.baseAsset}/USDT`;
    const text = generateCommunitySignalPost({
      pair: cleanPair,
      position: analyzedSignal.direction,
      entry: formatFuturesPrice(analyzedSignal.entryZone.current),
      targets: {
        tp1: {
          price: formatFuturesPrice(analyzedSignal.targets.tp1.price),
          gainPct: analyzedSignal.targets.tp1.gainPct,
          eta: analyzedSignal.targets.tp1.eta,
        },
        tp2: {
          price: formatFuturesPrice(analyzedSignal.targets.tp2.price),
          gainPct: analyzedSignal.targets.tp2.gainPct,
          eta: analyzedSignal.targets.tp2.eta,
        },
        tp3: {
          price: formatFuturesPrice(analyzedSignal.targets.tp3.price),
          gainPct: analyzedSignal.targets.tp3.gainPct,
          eta: analyzedSignal.targets.tp3.eta,
        },
      },
      stopLoss: formatFuturesPrice(analyzedSignal.stopLoss.price),
      riskRewardRatio: analyzedSignal.riskRewardRatio,
      durationSummary: analyzedSignal.indicatorExplanation?.estimatedDuration.summaryText || 'Intraday setup',
      leverage: {
        safe: analyzedSignal.leverage.safe.range,
        scalp: analyzedSignal.leverage.scalp.range,
      },
      fundingRatePct: analyzedSignal.derivativesData.fundingRatePct,
      binanceUrl: analyzedSignal.binanceUrl,
      overallScore: analyzedSignal.overallScore,
      strategyLabel: analyzedSignal.strategyLabel,
      candlestickPattern: analyzedSignal.candlestickPattern
        ? {
            name: analyzedSignal.candlestickPattern.name,
            type: analyzedSignal.candlestickPattern.type,
            reliability: analyzedSignal.candlestickPattern.reliability,
          }
        : undefined,
    });

    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleSaveTgConfig = () => {
    updateSettings({
      telegramBotToken: tempBotToken.trim(),
      telegramChatId: tempChatId.trim(),
    });
    setShowTgConfigModal(false);
  };

  return (
    <div className="bg-[#0b0c10] border border-yellow-500/20 rounded-2xl p-4 sm:p-5 shadow-2xl space-y-4">
      {/* Header Title & Description */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/30">
              <Zap className="w-4 h-4" />
            </span>
            <h2 className="text-sm sm:text-base font-bold text-white font-mono tracking-wide">
              Pencarian & Analisa Koin On-Demand (Bisa Kirim ke Telegram)
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Ketik simbol koin apa saja untuk dianalisa 5 pilar (MA, BOLL, MACD, RSI, 50 Pola Candlestick) dan siarkan langsung ke Telegram.
          </p>
        </div>

        {/* Telegram Config Quick Button */}
        <button
          onClick={() => {
            setTempBotToken(telegramBotToken);
            setTempChatId(telegramChatId);
            setShowTgConfigModal(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-mono transition-colors self-start sm:self-auto cursor-pointer"
          title="Atur Telegram Bot Token & Chat ID"
        >
          <Settings className="w-3.5 h-3.5 text-yellow-400" />
          <span>Pengaturan Telegram {telegramBotToken && telegramChatId ? '✅' : '⚠️'}</span>
        </button>
      </div>

      {/* Search Input Bar & Quick Chips */}
      <div className="space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAnalyze();
          }}
          className="flex items-center gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-yellow-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value.toUpperCase())}
              placeholder="Masukkan simbol koin (contoh: BTC, SOL, ETH, DOGE, PEPE, SUI, XRP, LINK)..."
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-yellow-500/70 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 font-mono focus:outline-none transition-colors"
            />
            {inputQuery && (
              <button
                type="button"
                onClick={() => setInputQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={isAnalyzing || !inputQuery.trim()}
            className={`px-4 sm:px-6 py-2.5 rounded-xl font-mono text-xs sm:text-sm font-black flex items-center gap-2 transition-all cursor-pointer ${
              isAnalyzing || !inputQuery.trim()
                ? 'bg-zinc-800 text-zinc-500 border border-zinc-700/50 cursor-not-allowed'
                : 'bg-gradient-to-r from-yellow-500 to-amber-600 text-black hover:brightness-110 shadow-lg shadow-yellow-500/20 active:scale-95'
            }`}
          >
            <Sparkles className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>{isAnalyzing ? 'MENGANALISA...' : '⚡ ANALISA SEKARANG'}</span>
          </button>
        </form>

        {/* Quick Pick Popular Coins */}
        <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-mono">
          <span className="text-zinc-500 mr-1">Koin Populer:</span>
          {POPULAR_COINS.map((sym) => (
            <button
              key={sym}
              type="button"
              onClick={() => {
                setInputQuery(sym);
                handleAnalyze(sym);
              }}
              className="px-2 py-0.5 rounded-lg bg-zinc-900/80 hover:bg-yellow-500/20 hover:text-yellow-300 border border-zinc-800 text-zinc-400 transition-colors cursor-pointer"
            >
              ${sym}
            </button>
          ))}
        </div>
      </div>

      {/* Analyzing Progress State */}
      {isAnalyzing && (
        <div className="p-4 rounded-xl bg-zinc-950 border border-yellow-500/30 flex items-center gap-3">
          <RefreshCw className="w-5 h-5 text-yellow-400 animate-spin flex-shrink-0" />
          <div className="space-y-0.5">
            <span className="text-xs font-bold text-yellow-300 font-mono">
              AI Quantitative Analyzer Sedang Bekerja...
            </span>
            <p className="text-[11px] text-zinc-400 font-mono">{scanStep}</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Telegram Success Banner */}
      {tgSuccessMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{tgSuccessMsg}</span>
        </div>
      )}

      {/* ANALYZED COIN RESULT CARD */}
      {analyzedSignal && !isAnalyzing && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 sm:p-5 space-y-4 shadow-xl">
          {/* Top Bar: Coin Identity & Badges */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-black text-sm border ${
                  analyzedSignal.direction === 'LONG'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                }`}
              >
                {analyzedSignal.direction === 'LONG' ? (
                  <TrendingUp className="w-5 h-5" />
                ) : (
                  <TrendingDown className="w-5 h-5" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap font-mono">
                  <span className="font-black text-lg text-white">{analyzedSignal.symbol}</span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-black tracking-wider ${
                      analyzedSignal.direction === 'LONG'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    {analyzedSignal.direction}
                  </span>

                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 flex items-center gap-1">
                    <Flame className="w-3 h-3 text-yellow-400" />
                    {analyzedSignal.signalTier}
                  </span>

                  {analyzedSignal.candlestickPattern && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 shadow-sm ${
                        analyzedSignal.candlestickPattern.bias === 'BULLISH'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                          : analyzedSignal.candlestickPattern.bias === 'BEARISH'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                          : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                      }`}
                    >
                      <span>🕯️</span>
                      <span>{analyzedSignal.candlestickPattern.name}</span>
                      <span className="text-amber-300 font-mono text-[9px] px-1 py-0.2 rounded bg-black/40">
                        {analyzedSignal.candlestickPattern.reliability}%
                      </span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono mt-0.5">
                  <span>{analyzedSignal.strategyLabel}</span>
                  <span>•</span>
                  <span>Skor AI: <strong className="text-white">{analyzedSignal.overallScore}</strong>/100</span>
                </div>
              </div>
            </div>

            {/* Price & Change */}
            <div className="text-left sm:text-right font-mono">
              <span className="text-[11px] text-zinc-500 block">Harga Saat Ini</span>
              <span className="text-lg font-black text-white">
                ${formatFuturesPrice(analyzedSignal.entryZone.current)}
              </span>
              <span
                className={`text-xs font-bold block ${
                  analyzedSignal.derivativesData.priceChange24hPct >= 0
                    ? 'text-emerald-400'
                    : 'text-rose-400'
                }`}
              >
                {analyzedSignal.derivativesData.priceChange24hPct >= 0 ? '+' : ''}
                {analyzedSignal.derivativesData.priceChange24hPct.toFixed(2)}% (24h)
              </span>
            </div>
          </div>

          {/* PERISAI PASAR (BTC GUARD STATUS BANNER) */}
          {analyzedSignal.btcContext && (
            <div
              className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs font-mono shadow-md ${
                !analyzedSignal.btcContext.isSafeForAltLong && analyzedSignal.direction === 'LONG'
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-200'
                  : analyzedSignal.btcContext.trend === 'STRONG_BULLISH' || analyzedSignal.btcContext.trend === 'BULLISH'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300'
              }`}
            >
              <Shield className={`w-4 h-4 mt-0.5 flex-shrink-0 ${!analyzedSignal.btcContext.isSafeForAltLong ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`} />
              <div className="space-y-0.5 flex-1">
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <span className="font-bold text-[11px] uppercase tracking-wider text-yellow-300">
                    🛡️ PERISAI PASAR (BTC GUARD) • BTC: ${formatFuturesPrice(analyzedSignal.btcContext.price)} ({analyzedSignal.btcContext.change15mPct >= 0 ? '+' : ''}{analyzedSignal.btcContext.change15mPct}% 15m)
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-black ${
                      analyzedSignal.btcContext.isSafeForAltLong
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    {analyzedSignal.btcContext.isSafeForAltLong ? 'PASAR KONDUSIF' : '⚠️ RAWAN FAKEOUT'}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-zinc-300">
                  {analyzedSignal.btcContext.warningMessage ||
                    'Kondisi pasar Bitcoin terpantau stabil, tidak terdeteksi crash/dump agresif yang berisiko menyeret sinyal ini.'}
                </p>
              </div>
            </div>
          )}

          {/* Setup Plan Grid (Entry, TP1, TP2, TP3, SL) */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono">
            {/* Entry */}
            <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800">
              <span className="text-zinc-500 block text-[10px]">🎯 Zona Entry</span>
              <span className="font-bold text-emerald-400 text-xs block mt-0.5">
                {analyzedSignal.entryZone.label}
              </span>
            </div>

            {/* TP1 */}
            <div className="p-2.5 rounded-xl bg-zinc-900 border border-emerald-500/20">
              <div className="flex items-center justify-between">
                <span className="text-emerald-400 text-[10px]">TP1</span>
                <span className="text-[9px] text-zinc-400">{analyzedSignal.targets.tp1.eta}</span>
              </div>
              <span className="font-bold text-white text-xs block mt-0.5">
                ${formatFuturesPrice(analyzedSignal.targets.tp1.price)}
              </span>
              <span className="text-[10px] text-emerald-400 font-bold">
                +{analyzedSignal.targets.tp1.gainPct.toFixed(1)}%
              </span>
            </div>

            {/* TP2 */}
            <div className="p-2.5 rounded-xl bg-zinc-900 border border-emerald-500/30">
              <div className="flex items-center justify-between">
                <span className="text-emerald-400 text-[10px]">TP2</span>
                <span className="text-[9px] text-zinc-400">{analyzedSignal.targets.tp2.eta}</span>
              </div>
              <span className="font-bold text-white text-xs block mt-0.5">
                ${formatFuturesPrice(analyzedSignal.targets.tp2.price)}
              </span>
              <span className="text-[10px] text-emerald-400 font-bold">
                +{analyzedSignal.targets.tp2.gainPct.toFixed(1)}%
              </span>
            </div>

            {/* TP3 */}
            <div className="p-2.5 rounded-xl bg-zinc-900 border border-emerald-500/40">
              <div className="flex items-center justify-between">
                <span className="text-yellow-400 text-[10px]">TP3</span>
                <span className="text-[9px] text-zinc-400">{analyzedSignal.targets.tp3.eta}</span>
              </div>
              <span className="font-bold text-white text-xs block mt-0.5">
                ${formatFuturesPrice(analyzedSignal.targets.tp3.price)}
              </span>
              <span className="text-[10px] text-yellow-400 font-bold">
                +{analyzedSignal.targets.tp3.gainPct.toFixed(1)}%
              </span>
            </div>

            {/* Stop Loss */}
            <div className="p-2.5 rounded-xl bg-zinc-900 border border-rose-500/30 col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between">
                <span className="text-rose-400 text-[10px]">🛑 Stop Loss</span>
                <span className="text-[9px] text-zinc-400">R:R {analyzedSignal.riskRewardRatio}:1</span>
              </div>
              <span className="font-bold text-rose-300 text-xs block mt-0.5">
                {analyzedSignal.stopLoss.label}
              </span>
            </div>
          </div>

          {/* KALKULATOR PROTEKSI MODAL & UKURAN MARGIN (ANTI-LOSS BERUNTUN) */}
          <div className="p-3.5 rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-emerald-500/30 space-y-2.5 font-mono text-xs shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-2">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-white text-xs sm:text-sm">
                  🛡️ Kalkulator Proteksi Modal (Position Sizing Otomatis)
                </span>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] text-zinc-400">Pilih Saldo Modal:</span>
                {[10, 20, 50, 100].map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setCustomWalletUsd(amt)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                      customWalletUsd === amt
                        ? 'bg-emerald-500 text-black border-emerald-400'
                        : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
                    }`}
                  >
                    ${amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Sizing Calculations */}
            {(() => {
              const slPct = Math.abs(analyzedSignal.stopLoss.lossPct) || 1.5;
              const maxRiskUsd = Number((customWalletUsd * 0.02).toFixed(2));
              const lev = analyzedSignal.leverage.safe.multiplier || 5;
              const notional = maxRiskUsd / (slPct / 100);
              const suggestedMargin = Math.max(Number((notional / lev).toFixed(2)), 1);

              return (
                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                    <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800/80">
                      <span className="text-zinc-400 block text-[10px]">Toleransi Risiko (2% Modal):</span>
                      <span className="text-rose-400 font-bold text-sm block mt-0.5">Maksimal -${maxRiskUsd} USD</span>
                      <span className="text-[9.5px] text-zinc-500 block mt-0.5">Jika SL tertabrak, rugi terkontrol</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-emerald-500/30 bg-emerald-500/[0.03]">
                      <span className="text-zinc-400 block text-[10px]">Margin Order Masuk:</span>
                      <span className="text-emerald-400 font-bold text-sm block mt-0.5">
                        ${suggestedMargin} USD (Lev {lev}x)
                      </span>
                      <span className="text-[9.5px] text-zinc-400 block mt-0.5">
                        Sisa modal (${(customWalletUsd - suggestedMargin).toFixed(2)}) disimpan aman
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800/80">
                      <span className="text-zinc-400 block text-[10px]">Disiplin Trading:</span>
                      <span className="text-cyan-400 font-bold text-[11px] block mt-0.5">Wajib Pasang Hard SL</span>
                      <span className="text-[9.5px] text-zinc-400 block mt-0.5">
                        Jangan geser SL atau average down saat floating minus!
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Candlestick & Technical Rationale Box */}
          {analyzedSignal.candlestickPattern && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-1 text-xs">
              <div className="flex items-center justify-between font-mono">
                <span className="font-bold text-amber-300 flex items-center gap-1.5">
                  <span>🕯️</span>
                  Pola Candlestick Terdeteksi: {analyzedSignal.candlestickPattern.name}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/40 font-bold">
                  Akurasi Historis {analyzedSignal.candlestickPattern.reliability}% ({analyzedSignal.candlestickPattern.type})
                </span>
              </div>
              <p className="text-zinc-300 leading-relaxed text-[11px]">
                {analyzedSignal.candlestickPattern.description}
              </p>
              <div className="text-[10px] text-amber-400/90 pt-1 border-t border-amber-500/20 flex items-center justify-between">
                <span><strong>Konfirmasi Valid:</strong> {analyzedSignal.candlestickPattern.confirmationRule}</span>
                {analyzedSignal.candlestickPattern.stopLossPrice && (
                  <span><strong>Level SL Pola:</strong> ${formatFuturesPrice(analyzedSignal.candlestickPattern.stopLossPrice)}</span>
                )}
              </div>
            </div>
          )}

          {/* Dual Leverage Profile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-cyan-400 flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  SAFE / SWING
                </span>
                <p className="text-[10px] text-zinc-400 mt-0.5">{analyzedSignal.leverage.safe.description}</p>
              </div>
              <span className="text-cyan-300 font-bold px-2 py-1 rounded bg-cyan-500/20 border border-cyan-500/40">
                {analyzedSignal.leverage.safe.range}
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-yellow-950/30 border border-yellow-500/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-yellow-400 flex items-center gap-1">
                  <Flame className="w-3 h-3" />
                  SCALP / KILAT
                </span>
                <p className="text-[10px] text-zinc-400 mt-0.5">{analyzedSignal.leverage.scalp.description}</p>
              </div>
              <span className="text-yellow-300 font-bold px-2 py-1 rounded bg-yellow-500/20 border border-yellow-500/40">
                {analyzedSignal.leverage.scalp.range}
              </span>
            </div>
          </div>

          {/* INDIKATOR RIIL (100 KLINES 15M) & DERIVATIF LIVE */}
          {analyzedSignal.indicators && (
            <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5">
                <span className="font-bold text-zinc-300 flex items-center gap-1.5">
                  <BarChart2 className="w-3.5 h-3.5 text-yellow-400" />
                  Kalkulasi Indikator Riil (100 Klines 15m) & Telemetri Derivatif
                </span>
                <span className="text-[10px] text-emerald-400 font-bold">● Live Feed Binance</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800">
                  <span className="text-zinc-500 block text-[10px]">MA(7, 25, 99) Riil</span>
                  <span
                    className={`font-bold text-xs ${
                      analyzedSignal.indicators.ma.alignment === 'BULLISH'
                        ? 'text-emerald-400'
                        : analyzedSignal.indicators.ma.alignment === 'BEARISH'
                        ? 'text-rose-400'
                        : 'text-zinc-300'
                    }`}
                  >
                    {analyzedSignal.indicators.ma.alignment === 'BULLISH'
                      ? 'GOLDEN STACK'
                      : analyzedSignal.indicators.ma.alignment === 'BEARISH'
                      ? 'DEATH STACK'
                      : 'NETRAL / TRANSISI'}
                  </span>
                  <span className="text-[9px] text-zinc-400 block mt-0.5">
                    MA7: ${formatFuturesPrice(analyzedSignal.indicators.ma.ma7)}
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800">
                  <span className="text-zinc-500 block text-[10px]">MACD (12, 26, 9) Riil</span>
                  <span
                    className={`font-bold text-xs ${
                      analyzedSignal.indicators.macd.dif > analyzedSignal.indicators.macd.dea
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {analyzedSignal.indicators.macd.dif > analyzedSignal.indicators.macd.dea
                      ? 'DIF > DEA (BULL)'
                      : 'DIF < DEA (BEAR)'}
                  </span>
                  <span className="text-[9px] text-zinc-400 block mt-0.5">
                    Hist: {analyzedSignal.indicators.macd.histogram.toFixed(4)}
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800">
                  <span className="text-zinc-500 block text-[10px]">Triple RSI Riil</span>
                  <span
                    className={`font-bold text-xs ${
                      analyzedSignal.indicators.rsi.rsi6 >= 50 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    RSI6: {analyzedSignal.indicators.rsi.rsi6.toFixed(1)}
                  </span>
                  <span className="text-[9px] text-zinc-400 block mt-0.5">
                    RSI12: {analyzedSignal.indicators.rsi.rsi12.toFixed(1)} | 24: {analyzedSignal.indicators.rsi.rsi24.toFixed(1)}
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800">
                  <span className="text-zinc-500 block text-[10px]">Live Open Interest</span>
                  <span className="text-yellow-400 font-bold text-xs">
                    ${(analyzedSignal.derivativesData.openInterestUsd / 1e6).toFixed(2)}M USD
                  </span>
                  <span className="text-[9px] text-zinc-400 block mt-0.5">
                    L/S Akun: {analyzedSignal.derivativesData.longShortRatio.toFixed(2)}
                  </span>
                </div>
              </div>

              {analyzedSignal.indicatorExplanation?.directionVerdict && (
                <div
                  className={`p-2.5 rounded-lg border text-[11px] leading-relaxed font-mono ${
                    analyzedSignal.indicatorExplanation.directionVerdict.includes('WAIT & SEE')
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                      : analyzedSignal.indicatorExplanation.directionVerdict.includes('LONG')
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                      : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                  }`}
                >
                  <strong>Keputusan Sistem:</strong> {analyzedSignal.indicatorExplanation.directionVerdict}
                </div>
              )}
            </div>
          )}

          {/* INTELEJEN KUANTITATIF & TEMBOK ORDERBOOK RIIL (INTEGRASI ALPHA ZOO QUANT) */}
          <div className="p-3.5 rounded-xl bg-gradient-to-br from-zinc-900/90 via-zinc-950 to-zinc-900/90 border border-yellow-500/30 space-y-3 text-xs font-mono shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-zinc-800/80 pb-2">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-lg bg-yellow-500/20 text-yellow-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span className="font-bold text-sm text-yellow-300 tracking-wide">
                  Analisis Kuantitatif & Tembok Orderbook Riil (Alpha Quant)
                </span>
              </div>
              {analyzedSignal.quantAnomaly && (
                <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 self-start sm:self-auto">
                  ⚡ Anomali: {analyzedSignal.quantAnomaly.anomalyType.replace(/_/g, ' ')}
                </span>
              )}
            </div>

            {/* 1. Tembok Orderbook Riil (Bid vs Ask Depth & Imbalance) */}
            {analyzedSignal.orderbookDepth ? (
              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-400 font-bold flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-cyan-400" />
                    Kedalaman Orderbook (Top 20 Bids vs Asks):
                  </span>
                  <span className={`px-2 py-0.5 rounded font-black text-[10px] border ${
                    analyzedSignal.orderbookDepth.status === 'BUY_WALL'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : analyzedSignal.orderbookDepth.status === 'SELL_WALL'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : 'bg-zinc-800 text-zinc-300 border-zinc-700'
                  }`}>
                    {analyzedSignal.orderbookDepth.status === 'BUY_WALL' ? '🛡️ TEMBOK BELI MASIF' : analyzedSignal.orderbookDepth.status === 'SELL_WALL' ? '🧱 TEMBOK JUAL MASIF' : '⚖️ SEIMBANG'} (Rasio {analyzedSignal.orderbookDepth.imbalanceRatio}x)
                  </span>
                </div>

                {/* Depth Visual Bar */}
                {(() => {
                  const total = (analyzedSignal.orderbookDepth.totalBidUsd + analyzedSignal.orderbookDepth.totalAskUsd) || 1;
                  const bidPct = Math.round((analyzedSignal.orderbookDepth.totalBidUsd / total) * 100);
                  const askPct = 100 - bidPct;
                  return (
                    <div className="space-y-1">
                      <div className="h-2.5 w-full bg-zinc-900 rounded-full overflow-hidden flex border border-zinc-800">
                        <div style={{ width: `${bidPct}%` }} className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-500" />
                        <div style={{ width: `${askPct}%` }} className="h-full bg-gradient-to-r from-rose-400 to-rose-600 transition-all duration-500" />
                      </div>
                      <div className="flex justify-between text-[10px] text-zinc-400">
                        <span className="text-emerald-400 font-bold">
                          Bids: ${(analyzedSignal.orderbookDepth.totalBidUsd / 1e6).toFixed(2)}M ({bidPct}%)
                          {analyzedSignal.orderbookDepth.topBidWallPrice ? ` @ $${formatFuturesPrice(analyzedSignal.orderbookDepth.topBidWallPrice)}` : ''}
                        </span>
                        <span className="text-rose-400 font-bold">
                          Asks: ${(analyzedSignal.orderbookDepth.totalAskUsd / 1e6).toFixed(2)}M ({askPct}%)
                          {analyzedSignal.orderbookDepth.topAskWallPrice ? ` @ $${formatFuturesPrice(analyzedSignal.orderbookDepth.topAskWallPrice)}` : ''}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                <p className="text-[11px] text-zinc-300 leading-relaxed pt-1 border-t border-zinc-900">
                  {analyzedSignal.orderbookDepth.insight}
                </p>
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-400">
                Orderbook likuiditas terdistribusi merata pada spread 24 jam.
              </div>
            )}

            {/* 2. Quant Radar & Panduan Squeeze */}
            {analyzedSignal.quantAnomaly && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/90 space-y-1">
                  <span className="text-[10px] text-zinc-400 font-bold block">🎯 Panduan Eksekusi Quant:</span>
                  <span className="text-yellow-400 font-bold block">{analyzedSignal.quantAnomaly.actionGuidance}</span>
                  <p className="text-[10px] text-zinc-400 leading-tight">{analyzedSignal.quantAnomaly.antiTrapRule}</p>
                </div>
                <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800/90 space-y-1">
                  <span className="text-[10px] text-zinc-400 font-bold block">⚡ Telemetri Squeeze & Sentimen:</span>
                  <p className="text-zinc-300 leading-tight">{analyzedSignal.quantAnomaly.fundingInsight}</p>
                  <span className="text-[10px] text-zinc-500 block">Volatilitas 24h: {analyzedSignal.quantAnomaly.volatility24h}%</span>
                </div>
              </div>
            )}

            {/* 3. 4-Pillar AI Agent Consensus Cards */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider block">
                Konsensus 4 Pilar AI Agent:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[10px]">
                <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-zinc-400 font-bold">Trend Agent</span>
                    <span className="text-emerald-400 font-black">{analyzedSignal.agentConsensus.trendAgent.score}/100</span>
                  </div>
                  <p className="text-zinc-300 leading-tight">{analyzedSignal.agentConsensus.trendAgent.reason}</p>
                </div>
                <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-zinc-400 font-bold">Volatility Agent</span>
                    <span className="text-yellow-400 font-black">{analyzedSignal.agentConsensus.volatilityAgent.score}/100</span>
                  </div>
                  <p className="text-zinc-300 leading-tight">{analyzedSignal.agentConsensus.volatilityAgent.reason}</p>
                </div>
                <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-zinc-400 font-bold">Derivatives Agent</span>
                    <span className="text-cyan-400 font-black">{analyzedSignal.agentConsensus.derivativesAgent.score}/100</span>
                  </div>
                  <p className="text-zinc-300 leading-tight">{analyzedSignal.agentConsensus.derivativesAgent.reason}</p>
                </div>
                <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-zinc-400 font-bold">Orderbook Agent</span>
                    <span className="text-purple-400 font-black">{analyzedSignal.agentConsensus.orderbookAgent.score}/100</span>
                  </div>
                  <p className="text-zinc-300 leading-tight">{analyzedSignal.agentConsensus.orderbookAgent.reason}</p>
                </div>
              </div>
            </div>
          </div>

          {/* ACTION BUTTONS (Send to Telegram, Open Chart, Copy Text, Binance) */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-800/80 font-mono text-xs">
            {/* Primary Action 1: Send via Telegram Bot API */}
            <button
              onClick={handleSendToTelegram}
              disabled={isSendingTg}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all cursor-pointer ${
                isSendingTg
                  ? 'bg-blue-600/50 text-white cursor-wait'
                  : 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/25 active:scale-95'
              }`}
            >
              <Send className={`w-4 h-4 ${isSendingTg ? 'animate-spin' : ''}`} />
              <span>{isSendingTg ? 'Mengirim ke Telegram...' : '🚀 KIRIM KE TELEGRAM (BOT)'}</span>
            </button>

            {/* Primary Action 2: Open directly in Telegram Desktop / Mobile App with Link */}
            <a
              href={`tg://msg_url?url=${encodeURIComponent(analyzedSignal.binanceUrl)}&text=${encodeURIComponent(
                generateCommunitySignalPost({
                  pair: `${analyzedSignal.baseAsset}/USDT`,
                  position: analyzedSignal.direction,
                  entry: formatFuturesPrice(analyzedSignal.entryZone.current),
                  targets: {
                    tp1: {
                      price: formatFuturesPrice(analyzedSignal.targets.tp1.price),
                      gainPct: analyzedSignal.targets.tp1.gainPct,
                      eta: analyzedSignal.targets.tp1.eta,
                    },
                    tp2: {
                      price: formatFuturesPrice(analyzedSignal.targets.tp2.price),
                      gainPct: analyzedSignal.targets.tp2.gainPct,
                      eta: analyzedSignal.targets.tp2.eta,
                    },
                    tp3: {
                      price: formatFuturesPrice(analyzedSignal.targets.tp3.price),
                      gainPct: analyzedSignal.targets.tp3.gainPct,
                      eta: analyzedSignal.targets.tp3.eta,
                    },
                  },
                  stopLoss: formatFuturesPrice(analyzedSignal.stopLoss.price),
                  riskRewardRatio: analyzedSignal.riskRewardRatio,
                  durationSummary: analyzedSignal.indicatorExplanation?.estimatedDuration.summaryText,
                  leverage: {
                    safe: analyzedSignal.leverage.safe.range,
                    scalp: analyzedSignal.leverage.scalp.range,
                  },
                  fundingRatePct: analyzedSignal.derivativesData.fundingRatePct,
                  binanceUrl: analyzedSignal.binanceUrl,
                  overallScore: analyzedSignal.overallScore,
                  strategyLabel: analyzedSignal.strategyLabel,
                  candlestickPattern: analyzedSignal.candlestickPattern
                    ? {
                        name: analyzedSignal.candlestickPattern.name,
                        type: analyzedSignal.candlestickPattern.type,
                        reliability: analyzedSignal.candlestickPattern.reliability,
                      }
                    : undefined,
                })
              )}`}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 hover:border-sky-500/50 text-sky-300 font-bold transition-all cursor-pointer"
              title="Buka Aplikasi Telegram Desktop atau HP langsung dengan tautan dan sinyal"
            >
              <Send className="w-4 h-4 text-sky-400" />
              <span>Buka Telegram App</span>
            </a>

            {/* Open Interactive Chart */}
            <button
              onClick={() => onOpenChart(analyzedSignal.symbol, analyzedSignal)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-bold transition-colors cursor-pointer"
            >
              <BarChart2 className="w-4 h-4 text-yellow-400" />
              <span>Buka Setup Chart</span>
            </button>

            {/* Copy Post Text */}
            <button
              onClick={handleCopyText}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 transition-colors cursor-pointer"
            >
              {copiedText ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copiedText ? 'Tersalin!' : 'Salin Teks'}</span>
            </button>

            {/* Direct Binance Futures Link */}
            <a
              href={analyzedSignal.binanceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-2.5 rounded-xl bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 transition-colors ml-auto"
            >
              <span>Binance</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      {/* QUICK TELEGRAM CONFIG MODAL */}
      {showTgConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl font-mono">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Send className="w-4 h-4 text-blue-400" />
                <h3 className="font-bold text-white text-sm">Pengaturan Bot Telegram</h3>
              </div>
              <button
                onClick={() => setShowTgConfigModal(false)}
                className="text-zinc-500 hover:text-zinc-300 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400">
              Masukkan Token Bot dan Chat ID (ID Channel/Grup/Pribadi) agar sinyal dapat disiarkan langsung dari website.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 mb-1">Telegram Bot Token:</label>
                <input
                  type="password"
                  value={tempBotToken}
                  onChange={(e) => setTempBotToken(e.target.value)}
                  placeholder="Contoh: 123456789:ABCdefGhIJKlmNoPQRstuvwxyZ"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-zinc-400 mb-1">Telegram Chat ID / Channel ID:</label>
                <input
                  type="text"
                  value={tempChatId}
                  onChange={(e) => setTempChatId(e.target.value)}
                  placeholder="Contoh: -100123456789 atau @channel_kamu"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                onClick={() => setShowTgConfigModal(false)}
                className="px-4 py-2 rounded-xl text-zinc-400 hover:text-zinc-200 text-xs cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleSaveTgConfig}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Simpan Pengaturan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
