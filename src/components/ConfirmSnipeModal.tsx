'use client';

import React, { useEffect } from 'react';
import { useTradingAgent } from '../hooks/useTradingAgent';
import { useSolRate } from '../hooks/useSolRate';
import { 
  AlertTriangle, 
  ShieldCheck, 
  Zap, 
  X, 
  Coins, 
  CheckCircle2
} from 'lucide-react';
import Button from './ui/Button';
import Badge from './ui/Badge';

export const ConfirmSnipeModal: React.FC = () => {
  const { pendingSnipeConfirmation, confirmSnipe, cancelSnipe } = useTradingAgent();
  const { rate, formatIdrShort, formatUsd } = useSolRate();

  // Keyboard shortcut listener: Enter to confirm, Escape to cancel
  useEffect(() => {
    if (!pendingSnipeConfirmation) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelSnipe();
      } else if (e.key === 'Enter') {
        confirmSnipe();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pendingSnipeConfirmation, confirmSnipe, cancelSnipe]);

  if (!pendingSnipeConfirmation) return null;

  const { token, consensus, solInvest } = pendingSnipeConfirmation;
  const entryPriceUsd = token.priceSol * rate.solUsd;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 font-mono"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-snipe-title"
    >
      <div className="bg-zinc-950 border border-emerald-500/40 rounded-2xl w-full max-w-lg shadow-[0_0_50px_rgba(16,185,129,0.25)] overflow-hidden flex flex-col text-xs">
        {/* Modal Header */}
        <div className="p-4 border-b border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 id="confirm-snipe-title" className="font-black text-sm text-zinc-100 uppercase tracking-wider flex items-center gap-2">
                <span>Konfirmasi Eksekusi Beli</span>
                <Badge variant="emerald" size="xs">5/5 CONSENSUS PASSED</Badge>
              </h2>
              <p className="text-[11px] text-zinc-400">
                Target manual CA lulus audit keamanan & narasi
              </p>
            </div>
          </div>
          <button
            onClick={cancelSnipe}
            aria-label="Batalkan snipe"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* Target Token Card */}
          <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-emerald-400">{token.symbol}</span>
                <span className="text-zinc-400 text-xs truncate max-w-[150px]">{token.name}</span>
                <Badge variant="cyan" size="xs">{token.platform}</Badge>
              </div>
              <div className="text-right">
                <span className="text-zinc-200 font-bold">{token.priceSol.toFixed(8)} SOL</span>
                <p className="text-[10px] text-zinc-400">≈ ${entryPriceUsd.toFixed(6)}</p>
              </div>
            </div>

            {/* Mint Address snippet */}
            <div className="flex items-center justify-between text-[11px] bg-zinc-950/80 px-2.5 py-1.5 rounded-lg border border-zinc-800/60">
              <span className="text-zinc-500">CA Mint:</span>
              <span className="text-zinc-300 font-mono select-all">
                {token.mint.slice(0, 8)}...{token.mint.slice(-8)}
              </span>
            </div>
          </div>

          {/* Investment & Order Summary */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-1">
              <span className="text-[10px] text-emerald-400 uppercase font-bold flex items-center gap-1">
                <Coins className="w-3 h-3" /> Ukuran Investasi
              </span>
              <p className="text-base font-black text-emerald-300">{solInvest} SOL</p>
              <p className="text-[10px] text-zinc-400">
                ≈ {formatIdrShort(solInvest)} ({formatUsd(solInvest)})
              </p>
            </div>

            <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 space-y-1">
              <span className="text-[10px] text-purple-400 uppercase font-bold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Consensus Verdict
              </span>
              <p className="text-base font-black text-purple-300">{consensus.verdict}</p>
              <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> {consensus.consensusLatencyMs}ms (5/5 Approved)
              </p>
            </div>
          </div>

          {/* Key Safety Verification */}
          <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/60 space-y-1.5 text-[11px]">
            <span className="text-zinc-400 font-bold uppercase text-[10px] block">
              Parameter Keamanan On-Chain:
            </span>
            <div className="grid grid-cols-2 gap-y-1 text-zinc-300">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                LP Burn: {token.burntLiquidityPct}%
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                Top 10 Holder: {token.top10HolderPct}%
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                Mint Revoked: {token.mintAuthorityRevoked ? 'YES' : 'NO'}
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                Freeze Revoked: {token.freezeAuthorityRevoked ? 'YES' : 'NO'}
              </span>
            </div>
          </div>

          <p className="text-[10px] text-zinc-500 leading-relaxed">
            * Order akan disiarkan langsung melalui bundle Jito MEV Private mempool dengan target eksekusi sub-350ms. Tekan <kbd className="px-1 py-0.2 bg-zinc-800 text-zinc-300 rounded font-bold">Enter</kbd> untuk konfirmasi atau <kbd className="px-1 py-0.2 bg-zinc-800 text-zinc-300 rounded font-bold">Esc</kbd> untuk membatalkan.
          </p>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-zinc-800/80 bg-zinc-900/60 flex items-center justify-end gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={cancelSnipe}
            aria-label="Batalkan order snipe"
          >
            BATALKAN (Esc)
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={confirmSnipe}
            aria-label="Konfirmasi buka posisi beli"
            leftIcon={<Zap className="w-3.5 h-3.5 text-zinc-950" />}
            glow
          >
            KONFIRMASI BELI ({solInvest} SOL)
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmSnipeModal;
