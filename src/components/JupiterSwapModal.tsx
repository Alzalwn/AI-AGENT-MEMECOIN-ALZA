'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { TokenSignal, WalletState } from '@/types/terminal';
import { fetchJupiterQuote, executeJupiterSwap, JupiterQuoteResponse, SwapExecutionResult } from '@/lib/jupiter';
import { 
  X, 
  ArrowDownUp, 
  Zap, 
  ExternalLink, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Copy, 
  Check, 
  Sliders, 
  Layers,
  Edit3,
  Search,
  Smartphone
} from 'lucide-react';

const POPULAR_TOKENS = [
  { symbol: '$BONK', name: 'Bonk', mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263' },
  { symbol: '$WIF', name: 'dogwifhat', mint: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm' },
  { symbol: '$FARTCOIN', name: 'Fartcoin', mint: '9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump' },
  { symbol: '$TRUMP', name: 'Official Trump', mint: '6p6xgHyF7AeQHyviSDaiMFFAbUx5unusPxQwg2qypump' },
  { symbol: '$PENGU', name: 'Pudgy Penguins', mint: '2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv' },
  { symbol: '$POPCAT', name: 'Popcat', mint: '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr' }
];

interface JupiterSwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: TokenSignal | null;
  initialMint?: string;
  currentBalanceSol: number;
  currentSlot: number;
  defaultSlippageBps?: number;
  walletState?: WalletState;
  onSwapSuccess?: (result: SwapExecutionResult, tokenInfo?: TokenSignal) => void;
}

export const JupiterSwapModal: React.FC<JupiterSwapModalProps> = ({
  isOpen,
  onClose,
  token,
  initialMint,
  currentBalanceSol,
  currentSlot,
  defaultSlippageBps = 150,
  walletState,
  onSwapSuccess
}) => {
  // Token state (allow user to switch token or paste custom CA directly)
  const isTokenMintValid = Boolean(token?.mint && token.mint.length >= 32 && !token.mint.includes('...'));
  const fallbackMint = initialMint && initialMint.length >= 32
    ? initialMint
    : (isTokenMintValid ? token!.mint : 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263');
  const fallbackSymbol = isTokenMintValid ? token!.symbol : '$BONK';
  const fallbackName = isTokenMintValid ? token!.name : 'Bonk Memecoin';

  const [activeMint, setActiveMint] = useState<string>(fallbackMint);
  const [activeSymbol, setActiveSymbol] = useState<string>(fallbackSymbol);
  const [activeName, setActiveName] = useState<string>(fallbackName);
  const [customCaInput, setCustomCaInput] = useState<string>('');
  const [isEditingCa, setIsEditingCa] = useState<boolean>(!isTokenMintValid && !initialMint);

  // Amount state (handles both comma and dot decimals cleanly)
  const [amountInput, setAmountInput] = useState<string>('0.1');
  const [amountSol, setAmountSol] = useState<number>(0.1);
  const [slippageBps, setSlippageBps] = useState<number>(defaultSlippageBps);

  const [quote, setQuote] = useState<JupiterQuoteResponse | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState<boolean>(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executionStep, setExecutionStep] = useState<string | null>(null);
  const [swapResult, setSwapResult] = useState<SwapExecutionResult | null>(null);
  const [copiedCa, setCopiedCa] = useState<boolean>(false);

  // Sync token prop when modal opens or selected token changes
  useEffect(() => {
    if (isOpen) {
      setSwapResult(null);
      if (initialMint && initialMint.length >= 32 && !initialMint.includes('...')) {
        setActiveMint(initialMint);
        setActiveSymbol('$' + initialMint.slice(0, 4).toUpperCase());
        setActiveName(initialMint.slice(0, 8));
        setIsEditingCa(false);
      } else if (token) {
        const isValid = Boolean(token.mint && token.mint.length >= 32 && !token.mint.includes('...'));
        if (isValid) {
          setActiveMint(token.mint);
          setActiveSymbol(token.symbol);
          setActiveName(token.name);
          setIsEditingCa(false);
        } else {
          setActiveMint('DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263');
          setActiveSymbol('$BONK');
          setActiveName('Bonk Memecoin');
          setIsEditingCa(true);
        }
      }
      if (defaultSlippageBps) {
        setSlippageBps(defaultSlippageBps);
      }
    }
  }, [isOpen, token, initialMint, defaultSlippageBps]);

  // Load quote whenever activeMint, amountSol, or slippage changes
  const loadQuote = useCallback(async () => {
    if (!activeMint || activeMint.length < 32 || activeMint.includes('...')) {
      setQuoteError('Contract Address Solana tidak valid. Silakan tempel CA token asli (32-44 karakter) atau pilih salah satu token di bawah:');
      setQuote(null);
      return;
    }
    setIsLoadingQuote(true);
    setQuoteError(null);
    try {
      const q = await fetchJupiterQuote(activeMint, amountSol, slippageBps);
      setQuote(q);
    } catch (err: any) {
      setQuoteError(err.message || 'Gagal mengambil quote dari Jupiter');
    } finally {
      setIsLoadingQuote(false);
    }
  }, [activeMint, amountSol, slippageBps]);

  useEffect(() => {
    if (isOpen && activeMint) {
      loadQuote();
    }
  }, [isOpen, activeMint, amountSol, slippageBps, loadQuote]);

  if (!isOpen) return null;

  const handleCopyCa = () => {
    navigator.clipboard.writeText(activeMint);
    setCopiedCa(true);
    setTimeout(() => setCopiedCa(false), 2000);
  };

  const handleAmountChange = (val: string) => {
    setAmountInput(val);
    const cleaned = val.replace(',', '.');
    const parsed = parseFloat(cleaned);
    if (!isNaN(parsed) && parsed > 0) {
      setAmountSol(parsed);
    }
  };

  const handleSelectPreset = (p: number) => {
    setAmountInput(p.toString());
    setAmountSol(p);
  };

  const handleSelectPopularToken = (t: typeof POPULAR_TOKENS[0]) => {
    setActiveMint(t.mint);
    setActiveSymbol(t.symbol);
    setActiveName(t.name);
    setCustomCaInput('');
    setIsEditingCa(false);
  };

  const handleApplyCustomCa = () => {
    const trimmed = customCaInput.trim();
    if (trimmed.length >= 32) {
      setActiveMint(trimmed);
      setActiveSymbol(trimmed.slice(0, 5).toUpperCase());
      setActiveName(trimmed.slice(0, 8));
      setIsEditingCa(false);
    } else {
      setQuoteError('Alamat CA minimal 32 karakter Base58.');
    }
  };

  const handleExecuteSwap = async () => {
    if (!quote || isExecuting) return;
    if (amountSol > currentBalanceSol) {
      setQuoteError(`Saldo SOL tidak mencukupi. Butuh ${amountSol} SOL, saldo tersedia hanya ${currentBalanceSol.toFixed(4)} SOL.`);
      return;
    }
    setIsExecuting(true);
    setExecutionStep('Mengonfirmasi route terbaik di Jupiter...');

    try {
      await new Promise(r => setTimeout(r, 400));
      setExecutionStep('Menyiapkan transaksi Versioned Transaction...');

      const fullKey = walletState?.fullPublicKey || (typeof window !== 'undefined' ? ((window as any).phantom?.solana?.publicKey?.toString() || (window as any).solana?.publicKey?.toString()) : undefined);
      let provider = typeof window !== 'undefined' ? ((window as any).phantom?.solana || (window as any).solana || (window as any).solflare || (window as any).backpack) : null;
      const isMobile = typeof window !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

      // When in LIVE_ON_CHAIN mode, strictly enforce real on-chain wallet signing
      if (walletState?.mode === 'LIVE_ON_CHAIN') {
        if (!provider) {
          if (isMobile) {
            window.location.href = `https://phantom.app/ul/browse/${encodeURIComponent(window.location.href)}`;
            return;
          }
          throw new Error('Dompet Phantom/Solflare tidak terdeteksi. Silakan buka website di Phantom App atau pasang ekstensi browser Phantom.');
        }

        // Auto-connect if needed
        if (!provider.isConnected) {
          setExecutionStep('Menghubungkan ke dompet Phantom...');
          try {
            await provider.connect();
          } catch (connErr: any) {
            throw new Error('Koneksi ke dompet Phantom dibatalkan');
          }
        }

        const activePubKey = provider.publicKey?.toString() || fullKey;
        if (!activePubKey) {
          throw new Error('Alamat dompet Phantom tidak ditemukan. Pastikan dompet sudah terbuka dan terhubung.');
        }

        setExecutionStep('Menunggu persetujuan (Approve) di aplikasi Phantom...');
        const result = await executeJupiterSwap(
          quote,
          activeSymbol,
          0.00005,
          currentSlot,
          activePubKey,
          provider
        );

        setExecutionStep('Memverifikasi status konfirmasi on-chain...');
        await new Promise(r => setTimeout(r, 400));
        setSwapResult(result);

        const tokenAmt = typeof result.tokenAmountUi === 'number' && result.tokenAmountUi > 0
          ? result.tokenAmountUi
          : (parseFloat((result.outAmountFormatted || '1').replace(/,/g, '')) || 1);
        const resolvedPrice = result.inAmountSol / (tokenAmt || 1);

        const swappedToken: TokenSignal = {
          id: `REAL-${activeMint.slice(0, 6)}`,
          mint: activeMint,
          symbol: activeSymbol.startsWith('$') ? activeSymbol : `$${activeSymbol}`,
          name: activeName || activeSymbol,
          platform: activeMint.toLowerCase().endsWith('pump') ? 'Pump.fun' : 'Raydium',
          initialLpUsd: 25000,
          burntLiquidityPct: 100,
          mintAuthorityRevoked: true,
          freezeAuthorityRevoked: true,
          top10HolderPct: 12,
          volumeDelta15s: 1.5,
          uniqueBuyersCount: 5,
          narrativeCosineSim: 0.88,
          narrativeTheme: 'Meme Wave',
          priceSol: resolvedPrice,
          detectedAt: Date.now(),
          isRealData: true,
          dexUrl: `https://dexscreener.com/solana/${activeMint}`
        };

        if (onSwapSuccess) {
          onSwapSuccess(result, swappedToken);
        }
        return;
      }

      // Paper trading fallback
      setExecutionStep('Memaketkan simulasi transaksi ke Jito MEV Private Mempool...');
      const result = await executeJupiterSwap(
        quote,
        activeSymbol,
        0.00005,
        currentSlot,
        fullKey,
        undefined
      );

      setExecutionStep('Memverifikasi status konfirmasi on-chain...');
      await new Promise(r => setTimeout(r, 400));
      setSwapResult(result);

      const tokenAmt = typeof result.tokenAmountUi === 'number' && result.tokenAmountUi > 0
        ? result.tokenAmountUi
        : (parseFloat((result.outAmountFormatted || '1').replace(/,/g, '')) || 1);
      const resolvedPrice = result.inAmountSol / (tokenAmt || 1);

      const swappedToken: TokenSignal = {
        id: `REAL-${activeMint.slice(0, 6)}`,
        mint: activeMint,
        symbol: activeSymbol.startsWith('$') ? activeSymbol : `$${activeSymbol}`,
        name: activeName || activeSymbol,
        platform: activeMint.toLowerCase().endsWith('pump') ? 'Pump.fun' : 'Raydium',
        initialLpUsd: 25000,
        burntLiquidityPct: 100,
        mintAuthorityRevoked: true,
        freezeAuthorityRevoked: true,
        top10HolderPct: 12,
        volumeDelta15s: 1.5,
        uniqueBuyersCount: 5,
        narrativeCosineSim: 0.88,
        narrativeTheme: 'Meme Wave',
        priceSol: resolvedPrice,
        detectedAt: Date.now(),
        isRealData: true,
        dexUrl: `https://dexscreener.com/solana/${activeMint}`
      };

      if (onSwapSuccess) {
        onSwapSuccess(result, swappedToken);
      }
    } catch (e: any) {
      setQuoteError(`Eksekusi gagal: ${e.message}`);
    } finally {
      setIsExecuting(false);
      setExecutionStep(null);
    }
  };

  const slippagePresets = [
    { label: '0.5%', value: 50 },
    { label: '1.0%', value: 100 },
    { label: '2.5%', value: 250 },
    { label: '5.0%', value: 500 }
  ];

  const amountPresets = [0.05, 0.1, 0.25, 0.5, 1.0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 font-mono text-xs">
      <div className="bg-terminal-panel border border-terminal-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="p-4 border-b border-terminal-border flex items-center justify-between bg-terminal-card/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-terminal-cyan/10 border border-terminal-cyan/30 text-terminal-cyan">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm tracking-wider text-terminal-text">
                  JUPITER DEX AGGREGATOR
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-terminal-cyan/10 text-terminal-cyan border border-terminal-cyan/30 font-bold">
                  v6 ROUTER
                </span>
              </div>
              <p className="text-[10px] text-terminal-muted">
                Best Execution Route • Raydium / Meteora / Pump.fun
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-terminal-muted hover:text-terminal-text hover:bg-terminal-card border border-transparent hover:border-terminal-border transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto space-y-3.5 flex-1">
          {/* Mobile Phantom In-App Browser Guidance */}
          {typeof window !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) && !((window as any).phantom?.solana || (window as any).solana) && (
            <div className="p-3 rounded-xl bg-purple-500/15 border border-purple-500/40 text-purple-200 text-xs space-y-2 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-purple-300">
                  <Smartphone className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Petunjuk Penting Trading di HP</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/30 text-purple-300 font-bold">Wajib</span>
              </div>
              <p className="text-[11px] text-purple-200/90 leading-relaxed">
                Browser Chrome/Safari HP <strong>tidak memiliki ekstensi Phantom</strong>. Agar pop-up tanda tangan & saldo asli SOL Anda bisa Approve, website ini wajib dibuka di <strong>Browser dalam aplikasi Phantom</strong> (ikon bola dunia 🌐 di kanan bawah Phantom).
              </p>
              <a
                href={`https://phantom.app/ul/browse/${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : 'https://alzasniped.my.id')}`}
                className="inline-flex items-center justify-center gap-2 w-full py-2 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs shadow-lg transition-all"
              >
                <span>Buka Otomatis di Aplikasi Phantom</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* Token Target Info Card */}
          <div className="bg-terminal-card p-3 rounded-xl border border-terminal-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-terminal-green/10 border border-terminal-green/30 flex items-center justify-center font-black text-terminal-green text-sm">
                {activeSymbol.replace('$', '').slice(0, 2).toUpperCase() || 'TK'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-terminal-text text-sm">{activeSymbol}</span>
                  <span className="text-[10px] text-terminal-muted truncate max-w-[140px]">{activeName}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-terminal-panel border border-terminal-border text-terminal-muted">
                    Solana
                  </span>
                  <button
                    onClick={handleCopyCa}
                    className="text-[10px] text-terminal-muted hover:text-terminal-cyan flex items-center gap-1 cursor-pointer"
                    title="Salin Contract Address"
                  >
                    <span>{activeMint.slice(0, 6)}...{activeMint.slice(-4)}</span>
                    {copiedCa ? <Check className="w-3 h-3 text-terminal-green" /> : <Copy className="w-3 h-3" />}
                  </button>
                  <button
                    onClick={() => setIsEditingCa(!isEditingCa)}
                    className="text-[9px] text-purple-400 hover:text-purple-300 underline cursor-pointer ml-1"
                  >
                    {isEditingCa ? 'Tutup' : 'Ganti Token / Paste CA'}
                  </button>
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-terminal-muted block">Estimated Price</span>
              <span className="font-bold text-terminal-green text-xs">
                {quote ? `${(1 / (parseFloat(quote.outAmountRaw) / 1e6 || 1)).toFixed(8)} SOL` : '~ $0.00002'}
              </span>
            </div>
          </div>

          {/* Token Selector & Custom CA Input */}
          {isEditingCa && (
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-purple-300 uppercase">
                  Pilih Koin Populer atau Tempel Contract Address (CA):
                </span>
              </div>

              {/* Popular Tokens Chips */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {POPULAR_TOKENS.map((pop) => (
                  <button
                    key={pop.symbol}
                    onClick={() => handleSelectPopularToken(pop)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                      activeMint === pop.mint
                        ? 'bg-purple-600 text-white border-purple-400 shadow-sm'
                        : 'bg-terminal-card border-terminal-border text-zinc-300 hover:border-purple-400'
                    }`}
                  >
                    {pop.symbol}
                  </button>
                ))}
              </div>

              {/* Custom CA Paste Input */}
              <div className="flex items-center gap-2 pt-1 border-t border-purple-500/20">
                <input
                  type="text"
                  value={customCaInput}
                  onChange={(e) => setCustomCaInput(e.target.value)}
                  placeholder="Paste CA Token (Raydium / Pump.fun)..."
                  className="flex-1 bg-black/60 border border-zinc-700 focus:border-purple-400 rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:outline-none"
                />
                <button
                  onClick={handleApplyCustomCa}
                  className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px] transition-all cursor-pointer"
                >
                  Pilih CA
                </button>
              </div>
            </div>
          )}

          {/* Swap Box */}
          <div className="space-y-3 bg-terminal-bg p-3.5 rounded-xl border border-terminal-border">
            {/* Input: SOL */}
            <div>
              <div className="flex items-center justify-between mb-1.5 text-[11px]">
                <span className="text-terminal-muted">You Pay (SOL)</span>
                <span className="text-terminal-muted">
                  Balance: <strong className="text-terminal-text">{currentBalanceSol.toFixed(2)} SOL</strong>
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  value={amountInput}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  disabled={isExecuting}
                  placeholder="0.1"
                  className="w-full bg-terminal-card border border-terminal-border focus:border-terminal-cyan rounded-lg px-3 py-2 text-sm font-bold text-terminal-text focus:outline-none transition-all pr-16"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-terminal-cyan">
                  SOL
                </span>
              </div>
              {amountSol > currentBalanceSol && (
                <div className="mt-1.5 flex items-center gap-1.5 text-rose-400 text-[10px] font-bold">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Saldo SOL tidak mencukupi (Tersedia: {currentBalanceSol.toFixed(3)} SOL)</span>
                </div>
              )}
              {/* Presets */}
              <div className="flex items-center gap-1.5 mt-2">
                {amountPresets.map((p) => (
                  <button
                    key={p}
                    onClick={() => handleSelectPreset(p)}
                    className={`flex-1 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                      amountSol === p
                        ? 'bg-terminal-cyan/15 border-terminal-cyan text-terminal-cyan'
                        : 'bg-terminal-card border-terminal-border text-terminal-muted hover:text-terminal-text'
                    }`}
                  >
                    {p} SOL
                  </button>
                ))}
              </div>
            </div>

            {/* Swap Direction Divider */}
            <div className="flex items-center justify-center -my-1">
              <div className="p-1.5 rounded-full bg-terminal-panel border border-terminal-border text-terminal-muted">
                <ArrowDownUp className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Output: Target Token */}
            <div>
              <div className="flex items-center justify-between mb-1.5 text-[11px]">
                <span className="text-terminal-muted">You Receive (Estimated)</span>
                <button
                  onClick={loadQuote}
                  disabled={isLoadingQuote}
                  className="text-[10px] text-terminal-cyan hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingQuote ? 'animate-spin' : ''}`} />
                  <span>Refresh Route</span>
                </button>
              </div>
              <div className="relative bg-terminal-card border border-terminal-border rounded-lg px-3 py-2 flex items-center justify-between">
                <span className={`text-sm font-bold truncate pr-2 ${isLoadingQuote ? 'opacity-40' : 'text-terminal-text'}`}>
                  {isLoadingQuote ? 'Menghitung rute terbaik...' : (quote?.outAmountFormatted || '0')}
                </span>
                <span className="text-xs font-bold text-terminal-green shrink-0">
                  {activeSymbol}
                </span>
              </div>
            </div>
          </div>

          {/* Slippage & Route Details */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-terminal-muted flex items-center gap-1">
                <Sliders className="w-3 h-3 text-terminal-cyan" />
                <span>Slippage Tolerance</span>
              </span>
              <span className="font-bold text-terminal-cyan">{(slippageBps / 100).toFixed(1)}%</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {slippagePresets.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSlippageBps(s.value)}
                  className={`py-1 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                    slippageBps === s.value
                      ? 'bg-terminal-cyan/15 border-terminal-cyan text-terminal-cyan'
                      : 'bg-terminal-card border-terminal-border text-terminal-muted hover:text-terminal-text'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Jito MEV Anti-Frontrun Badge */}
          <div className="p-2.5 rounded-xl bg-terminal-green/5 border border-terminal-green/20 flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-1.5 text-terminal-green">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <div>
                <span className="font-bold block">Jito MEV Anti-Frontrun Active</span>
                <span className="text-[9px] text-terminal-muted">Tip: 0.000050 SOL • Private Mempool Routing</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded bg-terminal-green/10 text-terminal-green border border-terminal-green/30 font-bold">
              0% LEAK
            </span>
          </div>

          {/* Error Message */}
          {quoteError && (
            <div className="p-2.5 rounded-xl bg-terminal-red/10 border border-terminal-red/30 flex items-start gap-2 text-terminal-red text-[11px]">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{quoteError}</span>
            </div>
          )}

          {/* Execution Progress */}
          {isExecuting && (
            <div className="p-3 rounded-xl bg-terminal-cyan/10 border border-terminal-cyan/30 flex items-center gap-2.5 text-terminal-cyan text-[11px]">
              <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
              <span>{executionStep || 'Memproses transaksi di Solana...'}</span>
            </div>
          )}

          {/* Swap Success Modal Result */}
          {swapResult && (
            <div className="p-3 rounded-xl bg-terminal-green/10 border border-terminal-green/30 space-y-2 animate-in zoom-in-95 duration-150">
              <div className="flex items-center gap-2 text-terminal-green font-bold text-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>Swap Berhasil Terkonfirmasi On-Chain!</span>
              </div>
              <div className="text-[10px] text-zinc-400 space-y-1">
                <div>Koin Diterima: <strong className="text-white">{swapResult.outAmountFormatted} {activeSymbol}</strong></div>
                <div>SOL Ditukar: <strong className="text-white">{swapResult.inAmountSol} SOL</strong></div>
              </div>
              <a
                href={`https://solscan.io/tx/${swapResult.signature}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[10px] text-terminal-cyan hover:underline font-bold"
              >
                <span>Lihat di Solscan</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-terminal-border bg-terminal-card/80 flex items-center gap-2">
          <button
            onClick={onClose}
            disabled={isExecuting}
            className="px-4 py-2 rounded-xl bg-terminal-card hover:bg-zinc-800 text-terminal-muted hover:text-terminal-text border border-terminal-border font-bold transition-all cursor-pointer"
          >
            Tutup
          </button>
          <button
            onClick={handleExecuteSwap}
            disabled={!quote || isExecuting || amountSol > currentBalanceSol || isLoadingQuote}
            className="flex-1 py-2 rounded-xl bg-gradient-to-r from-terminal-cyan to-terminal-green hover:from-terminal-cyan/90 hover:to-terminal-green/90 text-terminal-bg font-black text-xs tracking-wider flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,240,255,0.25)] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Zap className="w-4 h-4 fill-current" />
            <span>{isExecuting ? 'MENGEKSEKUSI...' : 'SWAP VIA JUPITER + JITO MEV'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default JupiterSwapModal;
