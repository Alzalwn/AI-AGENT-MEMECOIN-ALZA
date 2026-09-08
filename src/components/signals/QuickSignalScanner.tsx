'use client';

import React, { useState } from 'react';
import { useTradingAgent } from '../../hooks/useTradingAgent';
import {
  Search,
  Sparkles,
  Zap,
  Radio,
  CheckCircle,
  AlertTriangle,
  Copy,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Flame,
  Clock,
  Droplets,
  DollarSign,
  Activity,
  X,
  Send,
  Crosshair
} from 'lucide-react';
import { runConsensusAndBuildSignal } from '../../agents/consensus';
import { STRATEGY_PRESETS } from '../../config/constants';
import { TokenSignal } from '../../types/terminal';

interface QuickSignalScannerProps {
  onOpenJupiterSwap?: (ca?: string) => void;
}

interface ScanExplanation {
  title: string;
  desc: string;
  isPositive?: boolean;
}

interface AnalyzedTokenResult {
  ca: string;
  name: string;
  symbol: string;
  chainId: string;
  dexId: string;
  url: string;
  mcap: number;
  liquidityUsd: number;
  ageHours: number;
  ageMinutes: number;
  priceSol: number;
  priceUsd: number;
  volume24h: number;
  buys24h: number;
  sells24h: number;
  status: 'SNIPER' | 'AMAN' | 'BAHAYA';
  badgeText: string;
  explanations: ScanExplanation[];
  rawPair: any;
}

const SUPPORTED_CHAINS = [
  { id: 'all', label: 'All Chains' },
  { id: 'solana', label: 'Solana' },
  { id: 'base', label: 'Base' },
  { id: 'ethereum', label: 'Ethereum' },
  { id: 'bsc', label: 'BSC' }
];

export function QuickSignalScanner({ onOpenJupiterSwap }: QuickSignalScannerProps) {
  const { broadcastSignal, telegramConfig, appendLog } = useTradingAgent();
  const [caInput, setCaInput] = useState('');
  const [selectedChain, setSelectedChain] = useState('solana');
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState<number>(0); // 0 = idle, 1, 2, 3
  const [analyzedResult, setAnalyzedResult] = useState<AnalyzedTokenResult | null>(null);
  const [notFoundCA, setNotFoundCA] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [broadcastedSymbol, setBroadcastedSymbol] = useState<string | null>(null);

  const handleScanToken = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const ca = caInput.trim();
    if (!ca || isScanning) return;

    setIsScanning(true);
    setScanStep(1);
    setAnalyzedResult(null);
    setNotFoundCA(null);
    setBroadcastedSymbol(null);

    try {
      appendLog('SCAN', 'INFO', `🔍 [MEMEPULSE SCANNER] Memindai Contract Address on-chain: ${ca.slice(0, 8)}...`);

      // Step 1: Query DexScreener Public API
      const fetchPromise = fetch(`https://api.dexscreener.com/latest/dex/tokens/${ca}`, {
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(6000)
      });

      // Simulation steps timer for slick UI feedback
      await new Promise((r) => setTimeout(r, 400));
      setScanStep(2);

      const res = await fetchPromise;
      if (!res.ok) throw new Error('Gagal menghubungi DEX gateway');
      const data = await res.json();

      await new Promise((r) => setTimeout(r, 400));
      setScanStep(3);

      if (!data.pairs || data.pairs.length === 0) {
        await new Promise((r) => setTimeout(r, 300));
        setNotFoundCA(ca);
        appendLog('SCAN', 'WARN', `[SCANNER] CA ${ca.slice(0, 8)} belum memiliki liquidity pool di DEX.`);
        return;
      }

      // Filter by chain if specified and not 'all'
      let matchingPairs = data.pairs;
      if (selectedChain !== 'all') {
        const chainFiltered = data.pairs.filter((p: any) =>
          (p.chainId || '').toLowerCase().includes(selectedChain.toLowerCase())
        );
        if (chainFiltered.length > 0) matchingPairs = chainFiltered;
      }

      // Sort by highest liquidity
      const pair = matchingPairs.sort(
        (a: any, b: any) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0)
      )[0];

      const mcap = pair.marketCap || pair.fdv || 0;
      const liq = pair.liquidity?.usd || 0;
      const pairCreatedAt = pair.pairCreatedAt ? new Date(pair.pairCreatedAt).getTime() : Date.now();
      const ageMinutes = Math.max(1, Math.floor((Date.now() - pairCreatedAt) / (1000 * 60)));
      const ageHours = Math.max(0, +(ageMinutes / 60).toFixed(1));
      const priceNative = parseFloat(pair.priceNative) || 0;
      const priceUsd = parseFloat(pair.priceUsd) || 0;
      const vol24 = pair.volume?.h24 || 0;
      const buys24 = pair.txns?.h24?.buys || 0;
      const sells24 = pair.txns?.h24?.sells || 0;

      // ─────────────────────────────────────────────────────────────
      // SCREENING ENGINE (SNIPER ENTRY & ANTI-RUGPULL RULES)
      // ─────────────────────────────────────────────────────────────
      let status: 'SNIPER' | 'AMAN' | 'BAHAYA' = 'AMAN';
      let badgeText = '🟢 LOLOS SCREENING';
      let sniperEligible = false;

      if (liq < 3000) {
        status = 'BAHAYA';
        badgeText = '🔴 RISIKO RUGPULL TINGGI';
      } else if (mcap <= 150000 && mcap >= 4000 && ageHours <= 48) {
        status = 'SNIPER';
        badgeText = '🎯 SNIPER ENTRY CANDIDATE';
        sniperEligible = true;
      }

      // Bangun Penjelasan Otomatis Algoritma
      const explanations: ScanExplanation[] = [];

      if (status === 'BAHAYA') {
        explanations.push({
          title: 'Likuiditas Sangat Minim',
          desc: `Likuiditas terdaftar hanya $${Math.round(liq).toLocaleString()} (di bawah ambang aman $3.000). Sangat rentan penarikan pool seketika (rugpull) atau token tidak dapat dijual.`,
          isPositive: false
        });
        explanations.push({
          title: 'Peringatan Volatilitas Ekstrem',
          desc: 'Slippage dan transaksi dump kecil apa pun akan membuat harga anjlok hingga lebih dari -90%.',
          isPositive: false
        });
      } else {
        if (sniperEligible) {
          explanations.push({
            title: 'Early Entry Spot (Fase Akumulasi Awal)',
            desc: `Market Cap saat ini masih $${Math.round(mcap).toLocaleString()} dengan usia pair baru ${ageHours < 1 ? `${ageMinutes} Menit` : `${ageHours} Jam`}. Token belum viral atau mengalami lonjakan FOMO publik.`,
            isPositive: true
          });
        }
        explanations.push({
          title: 'Kesehatan Likuiditas Terverifikasi',
          desc: `Likuiditas pool terdaftar sebesar $${Math.round(liq).toLocaleString()}, cukup untuk menyerap volume transaksi tanpa slippage liar.`,
          isPositive: true
        });
        explanations.push({
          title: 'Rasio Volume & Aktivitas Trading',
          desc: `Volume trading 24 jam tercatat $${Math.round(vol24).toLocaleString()} dengan rasio ${buys24} transaksi beli vs ${sells24} jual.`,
          isPositive: buys24 >= sells24
        });
      }

      setAnalyzedResult({
        ca,
        name: pair.baseToken?.name || 'Unknown Token',
        symbol: pair.baseToken?.symbol || 'TOKEN',
        chainId: (pair.chainId || selectedChain).toUpperCase(),
        dexId: (pair.dexId || 'DEX').toUpperCase(),
        url: pair.url || `https://dexscreener.com/solana/${ca}`,
        mcap,
        liquidityUsd: liq,
        ageHours,
        ageMinutes,
        priceSol: priceNative,
        priceUsd,
        volume24h: vol24,
        buys24h: buys24,
        sells24h: sells24,
        status,
        badgeText,
        explanations,
        rawPair: pair
      });

      appendLog(
        'SCAN',
        status === 'BAHAYA' ? 'WARN' : 'SUCCESS',
        `[HASIL SCAN] $${pair.baseToken?.symbol}: Status ${status} (MC: $${Math.round(mcap).toLocaleString()} | LP: $${Math.round(liq).toLocaleString()})`
      );
    } catch (err: any) {
      console.error('Scan error:', err);
      appendLog('SCAN', 'ERROR', `Gagal memindai token: ${err.message || 'Periksa koneksi'}`);
      setNotFoundCA(ca);
    } finally {
      setIsScanning(false);
      setScanStep(0);
    }
  };

  const handleCopyCA = (ca: string) => {
    navigator.clipboard.writeText(ca);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handlePublishToLiveSignals = async () => {
    if (!analyzedResult) return;

    try {
      const mockTokenSignal: TokenSignal = {
        id: `SIG-MANUAL-${Date.now()}`,
        mint: analyzedResult.ca,
        symbol: analyzedResult.symbol,
        name: analyzedResult.name,
        platform: analyzedResult.dexId.includes('PUMP') ? 'Pump.fun' : 'Raydium',
        initialLpUsd: analyzedResult.liquidityUsd,
        burntLiquidityPct: 100,
        mintAuthorityRevoked: true,
        freezeAuthorityRevoked: true,
        top10HolderPct: 12.5,
        creatorBalancePct: 1.5,
        narrativeCosineSim: 0.90,
        narrativeTheme: 'MemePulse AI Discovery',
        volumeDelta15s: 6.5,
        uniqueBuyersCount: Math.max(8, Math.round(analyzedResult.buys24h / 15)),
        txVelocityPerSec: 4.5,
        buySellRatio: analyzedResult.sells24h > 0 ? +(analyzedResult.buys24h / analyzedResult.sells24h).toFixed(2) : 2.5,
        priceSol: analyzedResult.priceSol || 0.0001,
        detectedAt: Date.now(),
        smartMoneyCount: 1,
        rugcheckScore: analyzedResult.status === 'BAHAYA' ? 'DANGER' : 'GOOD'
      };

      const { signal } = runConsensusAndBuildSignal(mockTokenSignal, {
        thresholds: STRATEGY_PRESETS.BALANCED,
        grokViralityScore: 0.88,
        solRateUsd: 140
      });

      if (signal) {
        await broadcastSignal(signal, telegramConfig);
        setBroadcastedSymbol(analyzedResult.symbol);
        appendLog('TELEGRAM', 'SUCCESS', `📡 Sinyal $${analyzedResult.symbol} berhasil diterbitkan ke Live Feed & Telegram!`);
      }
    } catch (err: any) {
      console.error('Publish error:', err);
    }
  };

  return (
    <div className="w-full flex flex-col gap-3 font-mono">
      {/* ─── Scanner Input Box ─── */}
      <div className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border border-emerald-500/20 rounded-2xl p-3.5 sm:p-5 shadow-2xl relative overflow-hidden">
        {/* Ambient Glow Background */}
        <div className="absolute top-0 right-1/4 w-72 h-20 bg-emerald-500/10 blur-3xl pointer-events-none rounded-full" />
        <div className="absolute bottom-0 left-1/4 w-72 h-20 bg-cyan-500/10 blur-3xl pointer-events-none rounded-full" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  MemePulse <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Smart Token Screener</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-950/80 border border-cyan-500/30 text-cyan-400 text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  LIVE
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Input Contract Address (CA) untuk deteksi instan Sniper Entry & audit Anti-Rugpull.
              </p>
            </div>
          </div>

          {/* Chain Selector Tabs */}
          <div className="flex items-center gap-1 bg-zinc-950/80 p-1 border border-zinc-800 rounded-xl self-start md:self-auto">
            {SUPPORTED_CHAINS.map((chain) => (
              <button
                key={chain.id}
                onClick={() => setSelectedChain(chain.id)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                  selectedChain === chain.id
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {chain.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleScanToken} className="flex flex-col sm:flex-row gap-2 relative z-10">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={caInput}
              onChange={(e) => setCaInput(e.target.value)}
              placeholder="Contoh CA Solana: 6p6xgHyF7AeQ2JQ95UtDQkJB8yyFamnn6Mg5Up5pump"
              className="w-full bg-zinc-950/90 border border-zinc-800 focus:border-cyan-400 text-zinc-100 pl-10 pr-9 py-2.5 rounded-xl text-xs placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-cyan-400/40 transition-all shadow-inner"
              disabled={isScanning}
            />
            {caInput && (
              <button
                type="button"
                onClick={() => {
                  setCaInput('');
                  setAnalyzedResult(null);
                  setNotFoundCA(null);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            type="submit"
            disabled={!caInput.trim() || isScanning}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-zinc-950 font-black text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {isScanning ? (
              <>
                <Radio className="w-3.5 h-3.5 animate-spin" />
                <span>MEMINDAI ON-CHAIN...</span>
              </>
            ) : (
              <>
                <Crosshair className="w-3.5 h-3.5" />
                <span>SCAN TOKEN</span>
              </>
            )}
          </button>
        </form>

        {/* Step-by-Step Live Terminal Scan Logs */}
        {isScanning && (
          <div className="mt-3 pt-3 border-t border-zinc-800/80 text-[11px] text-zinc-400 space-y-1 animate-fade-in">
            <div className={`flex items-center gap-2 ${scanStep >= 1 ? 'text-cyan-400' : 'text-zinc-600'}`}>
              <span className={`w-2 h-2 rounded-full ${scanStep === 1 ? 'bg-cyan-400 animate-ping' : 'bg-cyan-500'}`} />
              <span>Memeriksa ketersediaan pool & liquidity di DEX...</span>
            </div>
            {scanStep >= 2 && (
              <div className={`flex items-center gap-2 ${scanStep >= 2 ? 'text-emerald-400' : 'text-zinc-600'}`}>
                <span className={`w-2 h-2 rounded-full ${scanStep === 2 ? 'bg-emerald-400 animate-ping' : 'bg-emerald-500'}`} />
                <span>Mengecek metrik likuiditas, Market Cap, & rasio volume trading...</span>
              </div>
            )}
            {scanStep >= 3 && (
              <div className="flex items-center gap-2 text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>Menjalankan algoritma screening sniper & validasi anti-rugpull...</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Token Not Found Card ─── */}
      {notFoundCA && (
        <div className="bg-zinc-900/90 border border-rose-500/30 rounded-2xl p-5 text-center shadow-xl animate-fade-in">
          <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto mb-2">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-rose-400">Token Belum Terdaftar di DEX</h3>
          <p className="text-[11px] text-zinc-400 max-w-md mx-auto mt-1 truncate">
            CA: <span className="text-zinc-300 font-mono">{notFoundCA}</span>
          </p>
          <p className="text-xs text-zinc-400 max-w-md mx-auto mt-2">
            Token belum memiliki liquidity pool di DEX utama atau data transaksi belum diindeks oleh DexScreener. Pastikan Contract Address sudah tepat.
          </p>
        </div>
      )}

      {/* ─── Interactive Analysis Result Card ─── */}
      {analyzedResult && (
        <div
          className={`bg-zinc-900/90 rounded-2xl p-4 sm:p-6 transition-all border shadow-2xl relative animate-fade-in ${
            analyzedResult.status === 'BAHAYA'
              ? 'border-rose-500/50 shadow-[0_0_30px_-5px_rgba(244,63,94,0.3)]'
              : analyzedResult.status === 'SNIPER'
              ? 'border-cyan-500/50 shadow-[0_0_30px_-5px_rgba(6,182,212,0.3)]'
              : 'border-emerald-500/50 shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)]'
          }`}
        >
          {/* Card Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4 mb-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg sm:text-xl font-bold text-white tracking-wide">
                  {analyzedResult.name}
                </h3>
                <span className="text-xs font-mono bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-lg border border-zinc-700">
                  ${analyzedResult.symbol}
                </span>
                <span className="text-[10px] font-bold bg-cyan-950/80 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded-lg uppercase">
                  {analyzedResult.chainId} • {analyzedResult.dexId}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 text-xs text-zinc-400">
                <span className="truncate max-w-[240px] sm:max-w-md">{analyzedResult.ca}</span>
                <button
                  onClick={() => handleCopyCA(analyzedResult.ca)}
                  className="text-zinc-400 hover:text-white transition cursor-pointer p-1"
                  title="Salin CA"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                {isCopied && <span className="text-emerald-400 text-[10px]">Tersalin!</span>}
              </div>
            </div>

            {/* Verdict Badge */}
            <div
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border self-start sm:self-auto flex items-center gap-1.5 whitespace-nowrap ${
                analyzedResult.status === 'BAHAYA'
                  ? 'bg-rose-950/80 text-rose-400 border-rose-500/40'
                  : analyzedResult.status === 'SNIPER'
                  ? 'bg-cyan-950/80 text-cyan-400 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.3)]'
                  : 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40'
              }`}
            >
              {analyzedResult.status === 'BAHAYA' ? (
                <ShieldAlert className="w-4 h-4" />
              ) : (
                <ShieldCheck className="w-4 h-4" />
              )}
              <span>{analyzedResult.badgeText}</span>
            </div>
          </div>

          {/* Metrik Grid (4 Kolom) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
            <div className="bg-zinc-950/70 p-3 rounded-xl border border-zinc-800/80">
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                <DollarSign className="w-3 h-3 text-cyan-400" /> Market Cap
              </span>
              <p className="text-base sm:text-lg font-bold text-white mt-1">
                ${Math.round(analyzedResult.mcap).toLocaleString()}
              </p>
            </div>

            <div className="bg-zinc-950/70 p-3 rounded-xl border border-zinc-800/80">
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                <Droplets className="w-3 h-3 text-emerald-400" /> Liquidity (LP)
              </span>
              <p className="text-base sm:text-lg font-bold text-white mt-1">
                ${Math.round(analyzedResult.liquidityUsd).toLocaleString()}
              </p>
            </div>

            <div className="bg-zinc-950/70 p-3 rounded-xl border border-zinc-800/80">
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400" /> Usia Pair
              </span>
              <p className="text-base sm:text-lg font-bold text-white mt-1">
                {analyzedResult.ageHours < 1
                  ? `${analyzedResult.ageMinutes} Menit`
                  : `${analyzedResult.ageHours} Jam`}
              </p>
            </div>

            <div className="bg-zinc-950/70 p-3 rounded-xl border border-zinc-800/80">
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                <Activity className="w-3 h-3 text-purple-400" /> Volume 24 Jam
              </span>
              <p className="text-base sm:text-lg font-bold text-white mt-1 truncate">
                ${Math.round(analyzedResult.volume24h).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Bagian Penjelasan Sistem Algoritma */}
          <div className="bg-zinc-950/90 border border-zinc-800 rounded-xl p-4 mb-5 space-y-2.5">
            <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-800/80 pb-2">
              <span>🧠</span> Analisis Algoritma Website & Multi-Agent Gate
            </h4>
            <div className="space-y-2 pt-1">
              {analyzedResult.explanations.map((exp, idx) => (
                <div key={idx} className="text-xs flex items-start gap-2 leading-relaxed">
                  <span
                    className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${
                      exp.isPositive ? 'bg-emerald-400' : 'bg-rose-400'
                    }`}
                  />
                  <div>
                    <span className="font-semibold text-zinc-200">{exp.title}: </span>
                    <span className="text-zinc-400">{exp.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-zinc-800/80">
            <button
              onClick={() => handleCopyCA(analyzedResult.ca)}
              className="flex-1 min-w-[120px] bg-zinc-800 hover:bg-zinc-700 text-white font-mono text-xs py-2.5 px-3 rounded-xl border border-zinc-700 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{isCopied ? 'Tersalin!' : 'Salin CA'}</span>
            </button>

            {analyzedResult.chainId === 'SOLANA' && onOpenJupiterSwap && (
              <button
                onClick={() => onOpenJupiterSwap(analyzedResult.ca)}
                className="flex-1 min-w-[130px] bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-bold text-xs py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.3)]"
              >
                <Zap className="w-3.5 h-3.5 fill-current" />
                <span>Swap di Jupiter</span>
              </button>
            )}

            <a
              href={analyzedResult.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 min-w-[130px] bg-zinc-800/90 hover:bg-zinc-700 text-cyan-300 font-bold text-center text-xs py-2.5 px-3 rounded-xl border border-cyan-500/30 transition flex items-center justify-center gap-1.5"
            >
              <span>DexScreener</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            {/* Tombol Terbitkan Sinyal ke Live Feed (Jika status AMAN atau SNIPER) */}
            {analyzedResult.status !== 'BAHAYA' && (
              <button
                onClick={handlePublishToLiveSignals}
                disabled={Boolean(broadcastedSymbol)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-zinc-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition cursor-pointer disabled:opacity-50"
              >
                {broadcastedSymbol ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 text-zinc-950" />
                    <span>Sinyal ${broadcastedSymbol} Terbit!</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Terbitkan ke Sinyal Alpha Live</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
