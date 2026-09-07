'use client';

/**
 * SignalCard — Komponen kartu sinyal trading premium
 * Menampilkan Entry Zone, TP1/2/3, Stop Loss, ETA, R/R, dan confidence score
 * Desain: dark glassmorphism dengan glow sesuai tier (SUPERNOVA/HIGH/MODERATE)
 */

import React, { useState, useEffect } from 'react';
import { TradingSignal } from '../../types/signal';
import { getSignalTierMeta, getConfidenceTierMeta } from '../../lib/signalCalculator';

// ─────────────────────────────────────────────────────────
// UTILITY HELPERS
// ─────────────────────────────────────────────────────────
function fmtSol(n: number): string {
  if (n < 0.000001) return n.toExponential(3) + ' SOL';
  if (n < 0.0001) return n.toFixed(9) + ' SOL';
  if (n < 0.01) return n.toFixed(7) + ' SOL';
  return n.toFixed(5) + ' SOL';
}

function fmtUsd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

// ─────────────────────────────────────────────────────────
// STATUS BADGE
// ─────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: TradingSignal['status'] }) {
  const cfg: Record<TradingSignal['status'], { label: string; cls: string }> = {
    ACTIVE:     { label: '● ACTIVE', cls: 'text-emerald-400 bg-emerald-400/10' },
    TP1_HIT:    { label: '✓ TP1 HIT', cls: 'text-blue-400 bg-blue-400/10' },
    TP2_HIT:    { label: '★ TP2 HIT', cls: 'text-violet-400 bg-violet-400/10' },
    TP3_HIT:    { label: '💎 TP3 HIT', cls: 'text-yellow-400 bg-yellow-400/10' },
    SL_HIT:     { label: '✗ SL HIT', cls: 'text-red-400 bg-red-400/10' },
    EXPIRED:    { label: '⏰ EXPIRED', cls: 'text-gray-500 bg-gray-500/10' },
    CANCELLED:  { label: '✗ CANCELLED', cls: 'text-gray-500 bg-gray-500/10' },
  };
  const s = cfg[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold ${s.cls}`}>
      {s.label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────
// CONFIDENCE BAR
// ─────────────────────────────────────────────────────────
function ConfidenceBar({ score, tier }: { score: number; tier: string }) {
  const { color } = getConfidenceTierMeta(tier);
  const pct = Math.min(100, Math.max(0, score));
  const label = tier === 'ALPHA' ? '🏆 ALPHA' : tier === 'STRONG' ? '💪 STRONG' : tier === 'MODERATE' ? '📊 MODERATE' : '📡 WEAK';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
        />
      </div>
      <span className="text-xs font-mono font-bold" style={{ color }}>{score}% [{label}]</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// TP TARGET ROW
// ─────────────────────────────────────────────────────────
function TPRow({
  target,
  isLast,
  signalStatus,
}: {
  target: TradingSignal['targets'][number];
  isLast: boolean;
  signalStatus: TradingSignal['status'];
}) {
  const isHit = signalStatus === `${target.tier}_HIT` ||
    (target.tier === 'TP1' && ['TP2_HIT', 'TP3_HIT'].includes(signalStatus)) ||
    (target.tier === 'TP2' && signalStatus === 'TP3_HIT');

  return (
    <div className={`flex items-start gap-2 py-1.5 ${!isLast ? 'border-b border-white/5' : ''}`}>
      <div className="flex items-center gap-1.5 w-16 flex-shrink-0">
        {isHit ? (
          <span className="text-emerald-400 text-sm">✓</span>
        ) : (
          <span className="text-white/20 text-sm">{isLast ? '└─' : '├─'}</span>
        )}
        <span
          className={`text-xs font-mono font-bold ${isHit ? 'text-emerald-400' : 'text-white/60'}`}
        >
          {target.tier}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span
            className={`text-sm font-mono font-bold ${isHit ? 'text-emerald-400' : 'text-white/90'}`}
          >
            +{target.gainPct.toFixed(0)}%
          </span>
          <span className="text-xs text-white/40 font-mono">{fmtSol(target.priceSol)}</span>
          <span className="text-xs text-white/30">~{fmtUsd(target.marketCapUsd)} MC</span>
        </div>
        <div className="text-xs text-white/30 mt-0.5">
          ⏱ {target.etaMinutes.min}–{target.etaMinutes.max} min · {target.rationale}
        </div>
      </div>
      {isHit && (
        <span className="text-xs text-emerald-400 font-bold flex-shrink-0">HIT ✓</span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// TRADING ACTION BUTTONS
// ─────────────────────────────────────────────────────────
function TradingButtons({ signal }: { signal: TradingSignal }) {
  const { tradingLinks, token } = signal;
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    copyToClipboard(token.mint);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const btnBase =
    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 border hover:scale-105 active:scale-95';

  return (
    <div className="flex flex-wrap gap-1.5 pt-3 border-t border-white/5">
      <button
        onClick={handleCopy}
        className={`${btnBase} border-white/10 text-white/60 hover:text-white hover:border-white/20 bg-white/5`}
      >
        {copied ? '✓ Copied!' : '📋 Copy CA'}
      </button>
      <a
        href={tradingLinks.bullx}
        target="_blank"
        rel="noreferrer"
        className={`${btnBase} border-orange-500/30 text-orange-400 hover:bg-orange-500/10`}
      >
        🔗 BullX
      </a>
      <a
        href={tradingLinks.photon}
        target="_blank"
        rel="noreferrer"
        className={`${btnBase} border-violet-500/30 text-violet-400 hover:bg-violet-500/10`}
      >
        📈 Photon
      </a>
      <a
        href={tradingLinks.gmgn}
        target="_blank"
        rel="noreferrer"
        className={`${btnBase} border-blue-500/30 text-blue-400 hover:bg-blue-500/10`}
      >
        🦅 GMGN
      </a>
      <a
        href={tradingLinks.dexscreener}
        target="_blank"
        rel="noreferrer"
        className={`${btnBase} border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10`}
      >
        📊 DexScreener
      </a>
      <a
        href={tradingLinks.rugcheck}
        target="_blank"
        rel="noreferrer"
        className={`${btnBase} border-yellow-500/20 text-yellow-400/70 hover:bg-yellow-500/10`}
      >
        🔍 Rugcheck
      </a>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// MAIN: SignalCard Component
// ─────────────────────────────────────────────────────────
interface SignalCardProps {
  signal: TradingSignal;
  compact?: boolean;
}

export function SignalCard({ signal, compact = false }: SignalCardProps) {
  const [expanded, setExpanded] = useState(!compact);
  const [timeStr, setTimeStr] = useState(timeAgo(signal.timestamp));

  // Update timestamp every 30s
  useEffect(() => {
    setTimeStr(timeAgo(signal.timestamp));
    const iv = setInterval(() => setTimeStr(timeAgo(signal.timestamp)), 30000);
    return () => clearInterval(iv);
  }, [signal.timestamp]);

  const tierMeta = getSignalTierMeta(signal.signalTier);
  const { token, entryZone, stopLoss, targets, marketContext } = signal;

  const isActive = signal.status === 'ACTIVE';
  const isProfit = ['TP1_HIT', 'TP2_HIT', 'TP3_HIT'].includes(signal.status);
  const isLoss = signal.status === 'SL_HIT';

  // Card border glow based on tier + status
  const glowStyle =
    isLoss
      ? { boxShadow: '0 0 0 1px rgba(239,68,68,0.3), 0 0 20px rgba(239,68,68,0.05)' }
      : isProfit
      ? { boxShadow: '0 0 0 1px rgba(52,211,153,0.3), 0 0 20px rgba(52,211,153,0.05)' }
      : signal.signalTier === 'SUPERNOVA'
      ? { boxShadow: `0 0 0 1px ${tierMeta.color}55, 0 0 30px ${tierMeta.glowColor}` }
      : { boxShadow: `0 0 0 1px ${tierMeta.color}33, 0 0 15px ${tierMeta.glowColor}` };

  return (
    <div
      className="relative bg-[#111111] rounded-xl overflow-hidden transition-all duration-300 hover:translate-y-[-1px]"
      style={glowStyle}
    >
      {/* SUPERNOVA animated top border */}
      {signal.signalTier === 'SUPERNOVA' && isActive && (
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${tierMeta.color}, transparent)`,
            animation: 'pulse 2s ease-in-out infinite',
          }}
        />
      )}

      <div className="p-4 space-y-3">
        {/* ─── HEADER ─── */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {/* Token icon */}
            {token.iconUrl ? (
              <img
                src={token.iconUrl}
                alt={token.symbol}
                className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10 flex-shrink-0"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            ) : (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0 ring-1 ring-white/10"
                style={{ backgroundColor: `${tierMeta.color}22` }}
              >
                {tierMeta.emoji}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-white text-sm">${token.symbol}</span>
                <span
                  className="text-xs font-bold px-1.5 py-0.5 rounded uppercase tracking-wide"
                  style={{ color: tierMeta.color, backgroundColor: `${tierMeta.color}18` }}
                >
                  {tierMeta.emoji} {tierMeta.label}
                </span>
                <StatusBadge status={signal.status} />
              </div>
              <p className="text-xs text-white/40 truncate mt-0.5">{token.name} · {token.platform}</p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-xs text-white/30 font-mono">{timeStr}</div>
            <div className="text-xs text-white/40 mt-0.5">
              MC {fmtUsd(marketContext.marketCapUsd)} · LP {fmtUsd(marketContext.liquidityUsd)}
            </div>
          </div>
        </div>

        {/* ─── CONFIDENCE BAR ─── */}
        <ConfidenceBar score={signal.confidenceScore} tier={signal.confidenceTier} />

        {/* ─── ENTRY ZONE ─── */}
        <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-lg p-2.5">
          <div className="text-xs text-white/50 mb-1 font-semibold uppercase tracking-wider">🟢 Entry Zone</div>
          <div className="font-mono text-sm font-bold text-emerald-400">
            {fmtSol(entryZone.low)} – {fmtSol(entryZone.high)}
          </div>
          <div className="text-xs text-white/30 mt-0.5">
            MC: {fmtUsd(entryZone.marketCapLow)} – {fmtUsd(entryZone.marketCapHigh)} ·
            LP {marketContext.lpBurntPct}% Burnt {marketContext.lpBurntPct >= 90 ? '✅' : '⚠️'}
          </div>
        </div>

        {/* ─── TAKE PROFIT TARGETS ─── */}
        <div className="bg-white/[0.02] border border-white/5 rounded-lg p-2.5">
          <div className="text-xs text-white/50 mb-2 font-semibold uppercase tracking-wider">🎯 Take Profit Targets</div>
          {targets.map((t, i) => (
            <TPRow
              key={t.tier}
              target={t}
              isLast={i === targets.length - 1}
              signalStatus={signal.status}
            />
          ))}
        </div>

        {/* ─── STOP LOSS + R/R ─── */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-red-500/5 border border-red-500/15 rounded-lg p-2.5">
            <div className="text-xs text-white/40 mb-1 uppercase tracking-wider">🛑 Stop Loss</div>
            <div className="font-mono text-sm font-bold text-red-400">{stopLoss.pctFromEntry}%</div>
            <div className="text-xs text-white/30 font-mono">{fmtSol(stopLoss.priceSol)}</div>
          </div>
          <div className="bg-blue-500/5 border border-blue-500/15 rounded-lg p-2.5">
            <div className="text-xs text-white/40 mb-1 uppercase tracking-wider">⚖️ Risk / Reward</div>
            <div className="font-mono text-sm font-bold text-blue-400">1 : {signal.riskRewardRatio}</div>
            <div className="text-xs text-white/30">TP3: 1 : {signal.riskRewardToTP3}</div>
          </div>
        </div>

        {/* ─── EXPAND/COLLAPSE for extra info ─── */}
        {compact && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full text-xs text-white/30 hover:text-white/60 transition-colors py-1 flex items-center justify-center gap-1"
          >
            {expanded ? '▲ Sembunyikan detail' : '▼ Tampilkan detail'}
          </button>
        )}

        {/* ─── DETAIL PANEL ─── */}
        {expanded && (
          <>
            {/* Security Badges */}
            <div className="flex flex-wrap gap-1.5 text-xs">
              <span className={`px-2 py-0.5 rounded font-mono ${token.mintAuthorityRevoked ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                Mint {token.mintAuthorityRevoked ? '✅ REVOKED' : '❌ ACTIVE'}
              </span>
              <span className={`px-2 py-0.5 rounded font-mono ${token.freezeAuthorityRevoked ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                Freeze {token.freezeAuthorityRevoked ? '✅ REVOKED' : '❌ ACTIVE'}
              </span>
              <span className={`px-2 py-0.5 rounded font-mono ${(token.top10HolderPct || 100) <= 25 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                Top10: {token.top10HolderPct || '?'}%
              </span>
              {signal.smartMoneyCount > 0 && (
                <span className="px-2 py-0.5 rounded font-mono bg-violet-500/10 text-violet-400">
                  🐋 {signal.smartMoneyCount} Smart Money
                </span>
              )}
              <span className="px-2 py-0.5 rounded font-mono bg-orange-500/10 text-orange-400">
                Grok {(signal.grokViralityScore * 10).toFixed(1)}/10
              </span>
            </div>

            {/* Pump Thesis */}
            <div className="bg-white/[0.015] rounded-lg px-3 py-2 border border-white/5">
              <p className="text-xs text-white/50 leading-relaxed">{signal.pumpThesis}</p>
            </div>

            {/* Mint address */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/30 font-mono truncate flex-1">{token.mint}</span>
              <button
                onClick={() => copyToClipboard(token.mint)}
                className="text-xs text-white/30 hover:text-white/60 flex-shrink-0"
              >
                📋
              </button>
            </div>

            {/* Trading Buttons */}
            <TradingButtons signal={signal} />
          </>
        )}
      </div>
    </div>
  );
}

export default SignalCard;
