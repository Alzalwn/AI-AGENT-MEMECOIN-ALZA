'use client';

import React, { useState } from 'react';
import { Shield, Zap, ExternalLink, Copy, Check, X, Terminal, CheckCircle2, Lock } from 'lucide-react';
import { JitoBundleReceipt } from '../lib/jito';
import { TokenSignal } from '../types/terminal';

interface JitoBundleTrackerModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: JitoBundleReceipt | null;
  token?: TokenSignal | null;
}

export default function JitoBundleTrackerModal({
  isOpen,
  onClose,
  receipt,
  token,
}: JitoBundleTrackerModalProps) {
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen || !receipt) return null;

  const handleCopyHash = () => {
    if (navigator?.clipboard && receipt.txHash) {
      navigator.clipboard.writeText(receipt.txHash);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-terminal-panel border border-terminal-border rounded-2xl w-full max-w-lg shadow-2xl p-5 space-y-4 font-mono select-none">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-terminal-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-terminal-green/10 border border-terminal-green/40 text-terminal-green">
              <Zap className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-black text-terminal-text uppercase tracking-wider flex items-center gap-2">
                Jito MEV Bundle Tracker
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-terminal-green/20 text-terminal-green border border-terminal-green/40 font-bold">
                  PRIVATE RELAYER
                </span>
              </h2>
              <p className="text-[11px] text-terminal-muted">Private Mempool Bundle Execution &amp; Sandwich Defense</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-terminal-card text-terminal-muted hover:text-terminal-text transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Highlight Banner */}
        <div className="p-3 bg-terminal-card rounded-xl border border-terminal-green/50 flex items-center justify-between shadow-[0_0_15px_rgba(13,242,137,0.1)]">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-terminal-green" />
            <div>
              <span className="text-xs font-black text-terminal-text block">BUNDLE STATUS: LANDED</span>
              <span className="text-[10px] text-terminal-muted">Terkonfirmasi pada slot #{receipt.targetSlot.toLocaleString()}</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[9px] text-terminal-green font-bold block uppercase flex items-center gap-1">
              <Lock className="w-3 h-3" /> Zero Sandwich Leak
            </span>
            <span className="text-[10px] font-mono text-terminal-cyan">{receipt.latencyMs}ms confirmation</span>
          </div>
        </div>

        {/* Transaction Signature Hash */}
        <div className="p-3 bg-terminal-bg rounded-xl border border-terminal-border space-y-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-terminal-muted font-bold flex items-center gap-1">
              <Terminal className="w-3 h-3 text-terminal-cyan" /> SOLANA TRANSACTION SIGNATURE
            </span>
            <button
              onClick={handleCopyHash}
              className="text-terminal-cyan hover:underline flex items-center gap-1 cursor-pointer font-bold"
            >
              {copied ? <Check className="w-3 h-3 text-terminal-green" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Tersalin!' : 'Salin Signature'}
            </button>
          </div>
          <div className="p-2 bg-terminal-panel rounded border border-terminal-border font-mono text-[10px] text-terminal-green break-all select-all">
            {receipt.txHash}
          </div>
        </div>

        {/* Bundle Execution Metrics 2x2 Grid */}
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="p-2.5 bg-terminal-card rounded-lg border border-terminal-border">
            <span className="text-[10px] text-terminal-muted block">BUNDLE ID</span>
            <span className="font-bold text-terminal-text font-mono truncate block">{receipt.bundleId}</span>
          </div>
          <div className="p-2.5 bg-terminal-card rounded-lg border border-terminal-border">
            <span className="text-[10px] text-terminal-muted block">DYNAMIC VALIDATOR TIP</span>
            <span className="font-bold text-terminal-green font-mono block">
              {receipt.tipSol.toFixed(6)} SOL
            </span>
          </div>
          <div className="p-2.5 bg-terminal-card rounded-lg border border-terminal-border">
            <span className="text-[10px] text-terminal-muted block">BLOCK ENGINE RELAYER</span>
            <span className="font-bold text-terminal-cyan font-mono text-[10px] truncate block">
              {receipt.blockEngine}
            </span>
          </div>
          <div className="p-2.5 bg-terminal-card rounded-lg border border-terminal-border">
            <span className="text-[10px] text-terminal-muted block">TIP VAULT ACCOUNT</span>
            <span className="font-mono text-terminal-muted text-[10px] truncate block">
              {receipt.tipAccount.slice(0, 8)}...{receipt.tipAccount.slice(-6)}
            </span>
          </div>
        </div>

        {/* External Solscan Explorer Action */}
        <div className="pt-2 border-t border-terminal-border flex items-center justify-between gap-2">
          <a
            href={receipt.solscanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2 px-3 rounded-lg bg-terminal-cyan/15 hover:bg-terminal-cyan/25 border border-terminal-cyan/50 text-terminal-cyan font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-[0_0_10px_rgba(0,240,255,0.15)]"
          >
            Verifikasi di Solscan Explorer <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={onClose}
            className="py-2 px-4 rounded-lg bg-terminal-card border border-terminal-border text-xs font-semibold text-terminal-muted hover:text-terminal-text transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}
