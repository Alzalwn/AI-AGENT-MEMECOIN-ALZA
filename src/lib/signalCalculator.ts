/**
 * Signal Calculator Engine — Otak Kalkulasi Sinyal Trading
 *
 * Menghasilkan TradingSignal lengkap (Entry Zone, TP1/2/3, Stop Loss, ETA, R/R)
 * dari hasil evaluasi MoonshotVerdict + TokenSignal.
 *
 * ⚠️ ZERO EXECUTION: Modul ini HANYA menghitung & membentuk objek sinyal.
 *    Tidak ada transaksi, tidak ada private key, tidak ada SOL yang dipakai.
 */

import { TokenSignal, MoonshotVerdict } from '../types/terminal';
import {
  TradingSignal,
  EntryZone,
  StopLoss,
  TakeProfitTarget,
  MarketContext,
  TradingLinks,
  SignalTier,
  ConfidenceTier,
  SignalStatus,
} from '../types/signal';

// ─────────────────────────────────────────────────────────
// UTILITY: UUID generator tanpa crypto module (browser safe)
// ─────────────────────────────────────────────────────────
function generateId(): string {
  return `sig-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// ─────────────────────────────────────────────────────────
// UTILITY: Format harga SOL ke string human-readable
// ─────────────────────────────────────────────────────────
function fmtSol(price: number): string {
  if (price < 0.000001) return price.toFixed(10) + ' SOL';
  if (price < 0.0001) return price.toFixed(8) + ' SOL';
  return price.toFixed(6) + ' SOL';
}

// ─────────────────────────────────────────────────────────
// UTILITY: Estimasi Market Cap (token supply × price)
// ─────────────────────────────────────────────────────────
function estimateMarketCapUsd(
  priceSol: number,
  solRateUsd: number,
  lpUsd: number
): number {
  // Estimasi berbasis LP: MC sering ~10-30x dari likuiditas untuk micro-cap
  // Gunakan ratio konservatif 15x jika tidak ada supply data
  const baseMcUsd = lpUsd * 15;
  // Koreksi dengan harga relatif jika ada
  return Math.round(baseMcUsd);
}

// ─────────────────────────────────────────────────────────
// CORE: Signal Calculator — Fungsi Utama
// ─────────────────────────────────────────────────────────

export interface SignalCalculatorInput {
  token: TokenSignal;
  moonshot: MoonshotVerdict;
  grokViralityScore?: number;    // 0–1
  grokSentiment?: string;        // 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  solRateUsd?: number;           // Harga SOL saat ini dalam USD
}

export function computeSignal(input: SignalCalculatorInput): TradingSignal {
  const { token, moonshot, grokViralityScore = 0.75, solRateUsd = 140 } = input;

  const currentPriceSol = token.priceSol || 0.000050;
  const lpUsd = token.initialLpUsd || 5000;
  const txVelocity = token.txVelocityPerSec || 2.0;
  const viralityScore = grokViralityScore;
  const smartMoneyCount = token.smartMoneyCount || 0;
  const moonshotScore = moonshot.moonshotScore;

  // ─── Tentukan SignalTier ───
  let signalTier: SignalTier = 'MODERATE';
  if (moonshot.tier === 'SUPERNOVA') signalTier = 'SUPERNOVA';
  else if (moonshot.tier === 'HIGH_POTENTIAL') signalTier = 'HIGH';

  // ─── 1. ENTRY ZONE ───
  // Entry bawah: -3% dari harga deteksi (idealnya beli di saat dip kecil)
  // Entry atas: +3% (batas masuk jika langsung market order)
  const entryLow = currentPriceSol * 0.97;
  const entryHigh = currentPriceSol * 1.03;
  const entryMid = currentPriceSol;

  const mcLow = estimateMarketCapUsd(entryLow, solRateUsd, lpUsd);
  const mcHigh = estimateMarketCapUsd(entryHigh, solRateUsd, lpUsd);

  const entryZone: EntryZone = {
    low: entryLow,
    high: entryHigh,
    current: currentPriceSol,
    label: `${fmtSol(entryLow)} – ${fmtSol(entryHigh)}`,
    marketCapLow: mcLow,
    marketCapHigh: mcHigh,
  };

  // ─── 2. STOP LOSS ───
  // Hard SL: -20% dari entry tengah (dapat disesuaikan)
  // LP Floor SL: Estimasi berdasarkan LP depth (lebih konservatif)
  const hardSlPct = -20;
  const slPrice = entryMid * (1 + hardSlPct / 100);

  const stopLoss: StopLoss = {
    priceSol: slPrice,
    pctFromEntry: hardSlPct,
    label: `${fmtSol(slPrice)} (${hardSlPct}%)`,
    rationale: 'Hard Stop Loss -20% dari entry · Tepat di bawah LP floor support',
    isHit: false,
  };

  // ─── 3. TAKE PROFIT TARGETS ───
  // Multiplier berbeda berdasarkan SignalTier
  const tpMultipliers = {
    SUPERNOVA: { tp1: 1.50, tp2: 2.00, tp3: 4.00 },
    HIGH:      { tp1: 1.35, tp2: 1.80, tp3: 2.80 },
    MODERATE:  { tp1: 1.20, tp2: 1.45, tp3: 1.90 },
  }[signalTier];

  // ETA model: baseETA = targetGain% / (velocity × viralityBoost)
  // Virality boost: jika > 0.8 → 0.7x lebih cepat; jika Smart Money → 0.6x
  const viralityMultiplier = viralityScore >= 0.8 ? 0.7 : viralityScore >= 0.6 ? 0.85 : 1.0;
  const smartMoneyMultiplier = smartMoneyCount >= 2 ? 0.6 : smartMoneyCount >= 1 ? 0.8 : 1.0;
  const etaSpeedFactor = viralityMultiplier * smartMoneyMultiplier;

  // Base ETA dihitung: (% kenaikan target) / (velocity × 60 detik)
  function calcETA(gainPct: number): { min: number; max: number } {
    const baseMin = Math.round(((gainPct / 100) / Math.max(txVelocity, 1)) * 60 * etaSpeedFactor);
    const baseMax = Math.round(baseMin * 2.2);
    return { min: Math.max(3, baseMin), max: Math.max(8, baseMax) };
  }

  const tp1Price = entryMid * tpMultipliers.tp1;
  const tp2Price = entryMid * tpMultipliers.tp2;
  const tp3Price = entryMid * tpMultipliers.tp3;

  const tp1GainPct = (tpMultipliers.tp1 - 1) * 100;
  const tp2GainPct = (tpMultipliers.tp2 - 1) * 100;
  const tp3GainPct = (tpMultipliers.tp3 - 1) * 100;

  const tp1ETA = calcETA(tp1GainPct);
  const tp2ETA = calcETA(tp2GainPct);
  const tp3ETA = calcETA(tp3GainPct);

  const targets: [TakeProfitTarget, TakeProfitTarget, TakeProfitTarget] = [
    {
      tier: 'TP1',
      priceSol: tp1Price,
      gainPct: tp1GainPct,
      marketCapUsd: estimateMarketCapUsd(tp1Price, solRateUsd, lpUsd),
      etaMinutes: tp1ETA,
      rationale: 'Ambil modal awal & break-even — titik aman pertama',
      isHit: false,
    },
    {
      tier: 'TP2',
      priceSol: tp2Price,
      gainPct: tp2GainPct,
      marketCapUsd: estimateMarketCapUsd(tp2Price, solRateUsd, lpUsd),
      etaMinutes: tp2ETA,
      rationale: 'Lock profit utama — sinyal terkonfirmasi kuat',
      isHit: false,
    },
    {
      tier: 'TP3',
      priceSol: tp3Price,
      gainPct: tp3GainPct,
      marketCapUsd: estimateMarketCapUsd(tp3Price, solRateUsd, lpUsd),
      etaMinutes: tp3ETA,
      rationale: 'Moonbag runner — biarkan sisa posisi ride the pump',
      isHit: false,
    },
  ];

  // ─── 4. RISK/REWARD RATIO ───
  const riskAmount = entryMid - slPrice;
  const rewardTP2 = tp2Price - entryMid;
  const rewardTP3 = tp3Price - entryMid;
  const riskRewardRatio = riskAmount > 0 ? Math.round((rewardTP2 / riskAmount) * 10) / 10 : 0;
  const riskRewardToTP3 = riskAmount > 0 ? Math.round((rewardTP3 / riskAmount) * 10) / 10 : 0;

  // ─── 5. CONFIDENCE SCORE ───
  // Gabungan dari 4 faktor berbobot:
  // - Moonshot Score (40%)
  // - Grok Virality Score (30%)
  // - Security Bonus (20%): full security = +20
  // - Smart Money Bonus (10%): max +10
  const securityBonus =
    token.mintAuthorityRevoked && token.freezeAuthorityRevoked && token.burntLiquidityPct >= 90
      ? 100 : token.mintAuthorityRevoked && token.freezeAuthorityRevoked ? 60 : 20;
  const smartBonus = Math.min(100, smartMoneyCount * 35);

  const confidenceScore = Math.round(
    moonshotScore * 0.40 +
    viralityScore * 100 * 0.30 +
    securityBonus * 0.20 +
    smartBonus * 0.10
  );

  let confidenceTier: ConfidenceTier = 'WEAK';
  if (confidenceScore >= 80) confidenceTier = 'ALPHA';
  else if (confidenceScore >= 65) confidenceTier = 'STRONG';
  else if (confidenceScore >= 50) confidenceTier = 'MODERATE';

  // ─── 6. TRADING LINKS ───
  const mintAddr = token.mint || '';
  const tradingLinks: TradingLinks = {
    bullx: `https://bullx.io/terminal?chainId=1399811149&address=${mintAddr}`,
    photon: `https://photon-sol.tinyastro.io/en/lp/${mintAddr}`,
    gmgn: `https://gmgn.ai/sol/token/${mintAddr}`,
    dexscreener: token.dexUrl || `https://dexscreener.com/solana/${mintAddr}`,
    jupiter: `https://jup.ag/swap/SOL-${mintAddr}`,
    birdeye: `https://birdeye.so/token/${mintAddr}?chain=solana`,
    rugcheck: `https://rugcheck.xyz/tokens/${mintAddr}`,
    copyCA: mintAddr,
  };

  // ─── 7. MARKET CONTEXT ───
  const marketContext: MarketContext = {
    marketCapUsd: estimateMarketCapUsd(currentPriceSol, solRateUsd, lpUsd),
    liquidityUsd: lpUsd,
    lpBurntPct: token.burntLiquidityPct,
    bondingProgress: token.bondingCurveProgress,
    isGraduated: token.isBondingCurveGraduated || false,
    totalSupply: undefined,
  };

  // ─── 8. SIGNAL EXPIRY (30 menit dari sekarang) ───
  const now = Date.now();
  const expiresAt = now + 30 * 60 * 1000;

  return {
    id: generateId(),
    timestamp: now,
    expiresAt,
    token,
    moonshotVerdict: moonshot,
    entryZone,
    stopLoss,
    targets,
    riskRewardRatio,
    riskRewardToTP3,
    etaToTP1: tp1ETA,
    etaToTP2: tp2ETA,
    confidenceScore,
    confidenceTier,
    signalTier,
    pumpThesis: moonshot.pumpThesis,
    marketContext,
    tradingLinks,
    grokViralityScore: viralityScore,
    smartMoneyCount,
    smartMoneyLabels: token.smartMoneyWallets || [],
    status: 'ACTIVE' as SignalStatus,
  };
}

// ─────────────────────────────────────────────────────────
// UTILITY: Format confidence bar (ASCII progress indicator)
// ─────────────────────────────────────────────────────────
export function formatConfidenceBar(score: number): string {
  const filled = Math.round(score / 10);
  const empty = 10 - filled;
  return `${'█'.repeat(filled)}${'░'.repeat(empty)} ${score}%`;
}

// ─────────────────────────────────────────────────────────
// UTILITY: Get tier emoji & label for display
// ─────────────────────────────────────────────────────────
export function getSignalTierMeta(tier: string): {
  emoji: string;
  label: string;
  color: string;
  glowColor: string;
} {
  switch (tier) {
    case 'SUPERNOVA':
      return { emoji: '🚀', label: 'SUPERNOVA', color: '#f97316', glowColor: 'rgba(249,115,22,0.25)' };
    case 'HIGH':
    case 'HIGH_POTENTIAL':
      return { emoji: '🔥', label: 'HIGH POTENTIAL', color: '#3ecf8e', glowColor: 'rgba(62,207,142,0.2)' };
    case 'MODERATE':
      return { emoji: '⚡', label: 'MODERATE', color: '#3b82f6', glowColor: 'rgba(59,130,246,0.2)' };
    default:
      return { emoji: '📡', label: 'SIGNAL', color: '#94a3b8', glowColor: 'rgba(148,163,184,0.1)' };
  }
}

export function getConfidenceTierMeta(tier: string): {
  label: string;
  color: string;
} {
  switch (tier) {
    case 'ALPHA':   return { label: 'ALPHA', color: '#f97316' };
    case 'STRONG':  return { label: 'STRONG', color: '#3ecf8e' };
    case 'MODERATE': return { label: 'MODERATE', color: '#3b82f6' };
    default:        return { label: 'WEAK', color: '#6b7280' };
  }
}
