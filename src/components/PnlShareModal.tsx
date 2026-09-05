'use client';

import React, { useRef, useState } from 'react';
import { X, Download, Share2, Check, TrendingUp, TrendingDown, Shield, Zap, Terminal } from 'lucide-react';
import { ActivePosition, ClosedTrade } from '../types/terminal';

interface PnlShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  trade: ClosedTrade | ActivePosition | null;
}

export default function PnlShareModal({ isOpen, onClose, trade }: PnlShareModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen || !trade) return null;

  const isClosed = 'exitPriceSol' in trade;
  const token = trade.token;
  const pnlPct = trade.pnlPct;
  const pnlSol = trade.pnlSol;
  const isProfit = pnlPct >= 0;
  const rMultiple = trade.rMultiplier;

  const handleCopyText = () => {
    const text = `⚡ GROK TRENCHER EXECUTION RECEIPT ⚡
Token: ${token.symbol} (${token.name})
Platform: ${token.platform}
Result: ${isProfit ? '+' : ''}${pnlPct.toFixed(1)}% (${isProfit ? '+' : ''}${pnlSol.toFixed(3)} SOL)
R-Multiple: ${rMultiple.toFixed(2)}R
Status: ${isClosed ? 'COMPLETED' : 'ACTIVE POSITION'}
Mint: ${token.mint}
Powered by Grok Trencher 5-Agent Consensus + Jito MEV`;

    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-terminal-panel border border-terminal-border rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4 font-mono select-none">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-terminal-border pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-terminal-green/10 border border-terminal-green/30 text-terminal-green">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-black text-terminal-text uppercase tracking-wider">
                PnL Receipt Generator
              </h2>
              <p className="text-[10px] text-terminal-muted">Hacker Flex Card for X (Twitter) &amp; Telegram</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-terminal-card text-terminal-muted hover:text-terminal-text transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* The Cyberpunk Flex Card to Share */}
        <div
          ref={cardRef}
          className="relative overflow-hidden rounded-2xl bg-[#030706] border-2 border-terminal-green/40 p-5 space-y-4 shadow-[0_0_30px_rgba(13,242,137,0.15)]"
        >
          {/* Subtle Grid Background Pattern */}
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(#0DF289 1px, transparent 1px)',
              backgroundSize: '16px 16px',
            }}
          />

          {/* Top Brand Bar */}
          <div className="relative z-10 flex items-center justify-between border-b border-terminal-green/20 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-terminal-green animate-ping" />
              <span className="font-black text-xs tracking-widest text-terminal-green">
                GROK TRENCHER
              </span>
            </div>
            <span className="text-[9px] px-2 py-0.5 rounded bg-terminal-green/10 border border-terminal-green/30 text-terminal-green font-bold">
              JITO MEV VERIFIED
            </span>
          </div>

          {/* Token Header */}
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xl text-terminal-text tracking-wide">
                  {token.symbol}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-terminal-card border border-terminal-border text-terminal-muted">
                  {token.platform}
                </span>
              </div>
              <p className="text-xs text-terminal-muted truncate max-w-[200px]">{token.name}</p>
            </div>

            <div className="text-right">
              <span className="text-[9px] text-terminal-muted block">OUTCOME</span>
              <span className={`text-xs font-black px-2 py-0.5 rounded border inline-block ${
                isProfit
                  ? 'bg-terminal-green/20 text-terminal-green border-terminal-green/40'
                  : 'bg-terminal-red/20 text-terminal-red border-terminal-red/40'
              }`}>
                {isProfit ? 'WIN' : 'STOP'}
              </span>
            </div>
          </div>

          {/* Big Glowing PnL Metric */}
          <div className="relative z-10 py-3 text-center rounded-xl bg-terminal-card/80 border border-terminal-border/80">
            <span className="text-[10px] text-terminal-muted uppercase tracking-widest block font-bold">
              NET RETURN ON STAKE
            </span>
            <div className={`text-3xl font-black font-mono tracking-tight my-0.5 ${
              isProfit ? 'text-terminal-green drop-shadow-[0_0_15px_rgba(13,242,137,0.5)]' : 'text-terminal-red drop-shadow-[0_0_15px_rgba(229,72,77,0.5)]'
            }`}>
              {isProfit ? '+' : ''}{pnlPct.toFixed(1)}%
            </div>
            <div className="flex items-center justify-center gap-3 text-xs font-mono">
              <span className={isProfit ? 'text-terminal-green' : 'text-terminal-red'}>
                {isProfit ? '+' : ''}{pnlSol.toFixed(3)} SOL
              </span>
              <span className="text-terminal-muted">|</span>
              <span className="text-terminal-cyan font-bold">
                {rMultiple.toFixed(2)}R Multiple
              </span>
            </div>
          </div>

          {/* Trade Details 2x2 Grid */}
          <div className="relative z-10 grid grid-cols-2 gap-2 text-[10px]">
            <div className="p-2 rounded-lg bg-terminal-panel/80 border border-terminal-border">
              <span className="text-terminal-muted block">INITIAL LP</span>
              <span className="font-bold text-terminal-text">${token.initialLpUsd.toLocaleString()}</span>
            </div>
            <div className="p-2 rounded-lg bg-terminal-panel/80 border border-terminal-border">
              <span className="text-terminal-muted block">NARRATIVE COS-SIM</span>
              <span className="font-bold text-terminal-cyan">{token.narrativeCosineSim.toFixed(2)}</span>
            </div>
            <div className="p-2 rounded-lg bg-terminal-panel/80 border border-terminal-border">
              <span className="text-terminal-muted block">EXECUTION</span>
              <span className="font-bold text-terminal-green">5-Agent Consensus</span>
            </div>
            <div className="p-2 rounded-lg bg-terminal-panel/80 border border-terminal-border">
              <span className="text-terminal-muted block">POSITION GUARD</span>
              <span className="font-bold text-terminal-text">Single Active Mutex</span>
            </div>
          </div>

          {/* Card Footer Watermark */}
          <div className="relative z-10 pt-1 flex items-center justify-between text-[8px] text-terminal-muted font-mono border-t border-terminal-border/40">
            <span className="truncate max-w-[180px]">MINT: {token.mint}</span>
            <span className="text-terminal-green font-bold">alzalwn/ai-agent-memecoin-alza</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleCopyText}
            className="flex-1 py-2 px-3 rounded-xl bg-terminal-card border border-terminal-border hover:border-terminal-green text-xs font-bold text-terminal-text hover:text-terminal-green transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-terminal-green" /> : <Terminal className="w-3.5 h-3.5" />}
            {copied ? 'Tersalin!' : 'Salin Receipt Teks'}
          </button>
          
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-terminal-card border border-terminal-border text-xs font-bold text-terminal-muted hover:text-terminal-text transition-colors cursor-pointer"
          >
            Tutup (Esc)
          </button>
        </div>
      </div>
    </div>
  );
}
