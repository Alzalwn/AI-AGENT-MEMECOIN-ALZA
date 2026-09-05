'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { TokenSignal } from '@/types/terminal';
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
  Layers
} from 'lucide-react';

interface JupiterSwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: TokenSignal | null;
  currentBalanceSol: number;
  currentSlot: number;
  defaultSlippageBps?: number;
  onSwapSuccess?: (result: SwapExecutionResult) => void;
}

export const JupiterSwapModal: React.FC<JupiterSwapModalProps> = ({
  isOpen,
  onClose,
  token,
  currentBalanceSol,
  currentSlot,
  defaultSlippageBps = 150,
  onSwapSuccess
}) => {
  const [amountSol, setAmountSol] = useState<number>(0.1);
  const [slippageBps, setSlippageBps] = useState<number>(defaultSlippageBps);
  const [quote, setQuote] = useState<JupiterQuoteResponse | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState<boolean>(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [executionStep, setExecutionStep] = useState<string | null>(null);
  const [swapResult, setSwapResult] = useState<SwapExecutionResult | null>(null);
  const [copiedCa, setCopiedCa] = useState<boolean>(false);

  // Load quote whenever token, amount, or slippage changes
  const loadQuote = useCallback(async () => {
    if (!token || !token.mint) return;
    setIsLoadingQuote(true);
    setQuoteError(null);
    try {
      const q = await fetchJupiterQuote(token.mint, amountSol, slippageBps);
      setQuote(q);
    } catch (err: any) {
      setQuoteError(err.message || 'Gagal mengambil quote dari Jupiter');
    } finally {
      setIsLoadingQuote(false);
    }
  }, [token, amountSol, slippageBps]);

  useEffect(() => {
    if (isOpen && token) {
      setSwapResult(null);
      if (defaultSlippageBps) {
        setSlippageBps(defaultSlippageBps);
      }
      loadQuote();
    }
  }, [isOpen, token, defaultSlippageBps, loadQuote]);

  if (!isOpen || !token) return null;

  const handleCopyCa = () => {
    navigator.clipboard.writeText(token.mint);
    setCopiedCa(true);
    setTimeout(() => setCopiedCa(false), 2000);
  };

  const handleExecuteSwap = async () => {
    if (!quote || isExecuting) return;
    setIsExecuting(true);
    setExecutionStep('Mengonfirmasi route terbaik di Jupiter...');

    try {
      await new Promise(r => setTimeout(r, 600));
      setExecutionStep('Memaketkan transaksi ke Jito MEV Private Mempool...');
      await new Promise(r => setTimeout(r, 700));
      setExecutionStep('Mengirim ke Validator Jito (0% Frontrun Leak)...');

      const result = await executeJupiterSwap(
        quote,
        token.symbol,
        0.00005,
        currentSlot
      );

      await new Promise(r => setTimeout(r, 500));
      setSwapResult(result);
      if (onSwapSuccess) {
        onSwapSuccess(result);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-terminal-panel border border-terminal-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col font-mono text-xs max-h-[92vh]">
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
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* Token Target Info Card */}
          <div className="bg-terminal-card p-3 rounded-xl border border-terminal-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-terminal-green/10 border border-terminal-green/30 flex items-center justify-center font-black text-terminal-green text-sm">
                {token.symbol.slice(1, 3).toUpperCase() || '$'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-terminal-text text-sm">{token.symbol}</span>
                  <span className="text-[10px] text-terminal-muted truncate max-w-[120px]">{token.name}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-terminal-panel border border-terminal-border text-terminal-muted">
                    {token.platform}
                  </span>
                  <button
                    onClick={handleCopyCa}
                    className="text-[10px] text-terminal-muted hover:text-terminal-cyan flex items-center gap-1 cursor-pointer"
                    title="Salin Contract Address"
                  >
                    <span>{token.mint.slice(0, 6)}...{token.mint.slice(-4)}</span>
                    {copiedCa ? <Check className="w-3 h-3 text-terminal-green" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-terminal-muted block">Estimated Price</span>
              <span className="font-bold text-terminal-green text-xs">
                {token.priceSol ? `${token.priceSol.toFixed(8)} SOL` : '~ $0.00002'}
              </span>
            </div>
          </div>

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
                  type="number"
                  min="0.001"
                  step="0.01"
                  value={amountSol}
                  onChange={(e) => setAmountSol(Math.max(0.001, parseFloat(e.target.value) || 0.001))}
                  disabled={isExecuting}
                  className="w-full bg-terminal-card border border-terminal-border focus:border-terminal-cyan rounded-lg px-3 py-2 text-sm font-bold text-terminal-text focus:outline-none transition-all pr-16"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-terminal-cyan">
                  SOL
                </span>
              </div>
              {/* Presets */}
              <div className="flex items-center gap-1.5 mt-2">
                {amountPresets.map((p) => (
                  <button
                    key={p}
                    onClick={() => setAmountSol(p)}
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
              <div className="bg-terminal-card border border-terminal-border rounded-lg p-2.5 flex items-center justify-between">
                <div>
                  <span className="text-sm font-black text-terminal-green">
                    {isLoadingQuote ? (
                      <span className="text-terminal-muted animate-pulse">Menghitung rute...</span>
                    ) : quote ? (
                      quote.outAmountFormatted
                    ) : (
                      '0'
                    )}
                  </span>
                  {quote && (
                    <span className="text-[10px] text-terminal-muted block mt-0.5">
                      Min. Received: {quote.minimumReceivedFormatted}
                    </span>
                  )}
                </div>
                <span className="text-xs font-bold text-terminal-text px-2 py-1 rounded bg-terminal-panel border border-terminal-border">
                  {token.symbol}
                </span>
              </div>
            </div>
          </div>

          {/* Slippage Settings */}
          <div className="bg-terminal-card p-3 rounded-xl border border-terminal-border space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-terminal-muted flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-terminal-cyan" />
                <span>Slippage Tolerance</span>
              </span>
              <span className="font-bold text-terminal-text">{(slippageBps / 100).toFixed(1)}%</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {slippagePresets.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => setSlippageBps(preset.value)}
                  className={`py-1.5 rounded-lg font-bold text-center border transition-all cursor-pointer ${
                    slippageBps === preset.value
                      ? 'bg-terminal-cyan/15 border-terminal-cyan text-terminal-cyan'
                      : 'bg-terminal-panel border-terminal-border text-terminal-muted hover:text-terminal-text'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Jupiter Best Route Display */}
          {quote && (
            <div className="bg-terminal-card p-3 rounded-xl border border-terminal-border space-y-2">
              <span className="text-[10px] font-bold text-terminal-muted uppercase tracking-wider block">
                Jupiter Routing Path
              </span>
              <div className="space-y-1.5">
                {quote.routes.map((route, idx) => (
                  <div key={idx} className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 text-terminal-text">
                      <span className="w-1.5 h-1.5 rounded-full bg-terminal-green"></span>
                      <span>{route.label}</span>
                    </div>
                    <span className="font-bold text-terminal-cyan">{route.percent}%</span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-terminal-border/60 flex items-center justify-between text-[10px]">
                <span className="text-terminal-muted">Price Impact:</span>
                <span className={`font-bold ${quote.priceImpactPct > 1.5 ? 'text-terminal-amber' : 'text-terminal-green'}`}>
                  {quote.priceImpactPct}%
                </span>
              </div>
            </div>
          )}

          {/* Jito MEV Bundle Protection Bar */}
          <div className="bg-terminal-green/5 border border-terminal-green/20 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-terminal-green" />
              <div>
                <span className="font-bold text-terminal-green block text-[11px]">
                  Jito MEV Anti-Frontrun Active
                </span>
                <span className="text-[10px] text-terminal-muted">
                  Tip: 0.000050 SOL • Private Mempool Routing
                </span>
              </div>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-terminal-green/15 text-terminal-green font-mono font-bold">
              0% LEAK
            </span>
          </div>

          {/* Error display */}
          {quoteError && (
            <div className="bg-terminal-red/10 border border-terminal-red/30 p-2.5 rounded-xl text-terminal-red text-[11px] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{quoteError}</span>
            </div>
          )}

          {/* Success Receipt */}
          {swapResult && (
            <div className="bg-terminal-green/10 border border-terminal-green/30 rounded-xl p-3.5 space-y-2 animate-in zoom-in-95">
              <div className="flex items-center gap-2 text-terminal-green">
                <CheckCircle2 className="w-4 h-4" />
                <span className="font-bold text-xs">SWAP EXECUTED & CONFIRMED!</span>
              </div>
              <p className="text-[11px] text-terminal-text">
                Membeli <strong>{swapResult.outAmountFormatted} {swapResult.symbol}</strong> seharga {swapResult.inAmountSol} SOL via {swapResult.routeSummary}.
              </p>
              <div className="pt-2 flex items-center justify-between border-t border-terminal-green/20">
                <span className="text-[10px] text-terminal-muted">Slot #{swapResult.slot}</span>
                <a
                  href={`https://solscan.io/tx/${swapResult.signature}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-terminal-cyan hover:underline flex items-center gap-1 text-[10px] font-bold"
                >
                  <span>Lihat di Solscan</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-terminal-border bg-terminal-card/80 flex items-center gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-terminal-panel border border-terminal-border text-terminal-muted hover:text-terminal-text font-bold transition-all cursor-pointer"
          >
            Tutup
          </button>
          <button
            onClick={handleExecuteSwap}
            disabled={!quote || isExecuting || isLoadingQuote}
            className="flex-1 py-2 rounded-xl bg-terminal-cyan text-terminal-bg hover:bg-terminal-cyan/90 font-black text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg cursor-pointer glow-cyan"
          >
            {isExecuting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{executionStep || 'EXECUTING SWAP...'}</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>SWAP VIA JUPITER + JITO MEV</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
