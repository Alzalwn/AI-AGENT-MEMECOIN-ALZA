'use client';

import React, { useState } from 'react';
import { useTradingAgent } from '../../hooks/useTradingAgent';
import { Crosshair, Search, RefreshCw, Zap } from 'lucide-react';
import Button from '../ui/Button';

interface ManualMintSniperProps {
  onOpenJitoTracker?: () => void;
  onOpenJupiterSwap?: (ca?: string) => void;
}

export const ManualMintSniper: React.FC<ManualMintSniperProps> = ({ onOpenJitoTracker, onOpenJupiterSwap }) => {
  const { snipeManualMint, isSearchingMint, sniperStatus } = useTradingAgent();
  const [mintInput, setMintInput] = useState<string>('');

  const handleSnipe = async () => {
    if (!mintInput.trim() || isSearchingMint) return;
    await snipeManualMint(mintInput.trim());
  };

  const handleOpenBuy = () => {
    if (onOpenJupiterSwap) {
      onOpenJupiterSwap(mintInput.trim() || undefined);
    }
  };

  return (
    <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-2.5 px-4 flex flex-col md:flex-row items-center justify-between gap-3 shadow-lg font-mono text-xs">
      <div className="flex items-center gap-2.5 w-full md:w-auto flex-1">
        <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <Crosshair className="w-4 h-4" />
        </div>
        <span className="text-[11px] font-bold tracking-wider text-zinc-400 uppercase whitespace-nowrap hidden sm:inline">
          SNIPE MINT CA:
        </span>
        <div className="relative flex-1">
          <input
            type="text"
            value={mintInput}
            onChange={(e) => setMintInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSnipe()}
            placeholder="Paste Solana CA mint (Pump.fun, Raydium, DEX pair address)..."
            className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-emerald-500 text-zinc-100 px-3 py-1.5 rounded-xl text-xs font-mono placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-all pr-8"
            disabled={isSearchingMint}
          />
          {mintInput && (
            <button
              onClick={() => setMintInput('')}
              aria-label="Bersihkan input mint CA"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
        
        {/* Tombol Beli / Swap Langsung */}
        <button
          onClick={handleOpenBuy}
          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-terminal-cyan to-terminal-green text-zinc-950 font-black text-xs flex items-center gap-1.5 shadow-[0_0_12px_rgba(0,240,255,0.3)] hover:brightness-110 transition-all cursor-pointer whitespace-nowrap"
          title="Buka Jupiter Swap untuk membeli token ini dengan SOL"
        >
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span>BELI / SWAP</span>
        </button>

        {/* Tombol Audit 5-Agen */}
        <Button
          variant="secondary"
          size="sm"
          onClick={handleSnipe}
          disabled={isSearchingMint || !mintInput.trim()}
          isLoading={isSearchingMint}
          leftIcon={<Search className="w-3.5 h-3.5" />}
        >
          {isSearchingMint ? 'AUDITING...' : 'AUDIT CA'}
        </Button>
      </div>

      {/* Quick Status Pill */}
      {sniperStatus && (
        <span className="text-amber-400 animate-pulse font-semibold px-2.5 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-[11px]">
          {sniperStatus}
        </span>
      )}
    </div>
  );
};

export default ManualMintSniper;
