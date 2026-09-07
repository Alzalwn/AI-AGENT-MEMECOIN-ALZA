import { ActivePosition } from '../types/terminal';
import { PRD_THRESHOLDS } from '../config/constants';

export interface ExitSignal {
  shouldExit: boolean;
  reason?: string;
  exitType?: 'TAKE_PROFIT' | 'TRAILING_STOP' | 'STOP_LOSS' | 'MOMENTUM_COLLAPSE' | 'TTL_EXPIRED' | 'EMERGENCY_DRAIN';
  suggestedTipLamports: number;
}

export interface ExitEvaluationOptions {
  targetTpPct?: number; // Target Take Profit % (default: +100%)
  stopLossPct?: number; // Stop Loss % (default: -25%)
  trailingDistancePct?: number; // Trailing distance % from High-Water Mark (default: 15%)
  maxHoldTimeSec?: number; // TTL in seconds (default: 180s)
  enableMomentumExit?: boolean; // Emergency exit on extreme momentum collapse (default: true)
  currentPoolLpDropPct?: number;
}

/**
 * Smart Arbiter & Quantitative Exit Agent
 * Mengevaluasi posisi terbuka secara terus menerus dengan menggabungkan:
 * 1. Emergency Liquidity Drain Check (Rugpull Shield)
 * 2. Momentum Collapse & Extreme Velocity Deceleration Check
 * 3. Hard Stop Loss Boundary Check
 * 4. Time-to-Live (TTL) Max Hold Time Stagnancy Fallback
 * 5. High-Water Mark Dynamic Trailing Stop Loss
 * 6. Smart Arbiter Dynamic Take Profit (Let profits run if accelerating momentum)
 */
export function evaluateExitAgent(
  position: ActivePosition,
  options: ExitEvaluationOptions = {}
): ExitSignal {
  const {
    targetTpPct = position.targetTpPct ?? 100,
    stopLossPct = position.stopLossPct ?? -25,
    trailingDistancePct = position.trailingDistancePct ?? 15,
    maxHoldTimeSec = position.maxHoldTimeSec ?? 180,
    enableMomentumExit = true,
    currentPoolLpDropPct = 0
  } = options;

  // 1. Emergency Liquidity Drain Check
  if (currentPoolLpDropPct >= PRD_THRESHOLDS.EMERGENCY_DRAIN_PCT_DROP) {
    return {
      shouldExit: true,
      reason: `EMERGENCY DRAIN: Likuiditas pool anjlok ${currentPoolLpDropPct}% dalam 1 blok! Rugpull darurat terdeteksi.`,
      exitType: 'EMERGENCY_DRAIN',
      suggestedTipLamports: PRD_THRESHOLDS.JITO_BASE_TIP_LAMPORTS * 5
    };
  }

  // 2. Momentum Anomaly / Flash Dump Deceleration Check
  const velocity = position.velocityPctPerSec ?? 0;
  if (enableMomentumExit && velocity <= -3.0 && position.pnlPct < 15) {
    return {
      shouldExit: true,
      reason: `MOMENTUM COLLAPSE: Kecepatan harga anjlok tajam (${velocity.toFixed(2)}%/dtk). Menjual sebelum flash dump mendalam.`,
      exitType: 'MOMENTUM_COLLAPSE',
      suggestedTipLamports: PRD_THRESHOLDS.JITO_BASE_TIP_LAMPORTS * 3
    };
  }

  // 3. Hard Stop Loss Boundary Check
  const hardStopPrice = position.stopLossPriceSol ?? position.entryPriceSol * (1 + stopLossPct / 100);
  if (position.pnlPct <= stopLossPct || position.currentPriceSol <= hardStopPrice) {
    return {
      shouldExit: true,
      reason: `STOP LOSS HIT: Kerugian mencapai ${position.pnlPct.toFixed(1)}% (Batas SL: ${stopLossPct}% @ ${hardStopPrice.toFixed(8)} SOL).`,
      exitType: 'STOP_LOSS',
      suggestedTipLamports: PRD_THRESHOLDS.JITO_BASE_TIP_LAMPORTS * 2
    };
  }

  // 4. Time-to-Live (TTL) Max Hold Time Stagnancy Fallback
  const holdDuration = position.holdDurationSec ?? Math.round((Date.now() - position.entryTimestamp) / 1000);
  if (holdDuration >= maxHoldTimeSec && velocity <= 0.08 && position.pnlPct < targetTpPct * 0.3) {
    return {
      shouldExit: true,
      reason: `TTL EXPIRED (${holdDuration}s / Max ${maxHoldTimeSec}s): Momentum stagnan (${velocity.toFixed(2)}%/dtk). Market sell untuk melepaskan modal dari dead coin.`,
      exitType: 'TTL_EXPIRED',
      suggestedTipLamports: PRD_THRESHOLDS.JITO_BASE_TIP_LAMPORTS
    };
  }

  // 5. High-Water Mark Dynamic Trailing Stop Loss
  if (position.highestPriceSol > position.entryPriceSol) {
    const drawDownFromPeakPct =
      ((position.highestPriceSol - position.currentPriceSol) / position.highestPriceSol) * 100;

    if (drawDownFromPeakPct >= trailingDistancePct) {
      return {
        shouldExit: true,
        reason: `TRAILING STOP HIT: Koreksi -${drawDownFromPeakPct.toFixed(1)}% dari puncak tertinggi (${position.highestPriceSol.toFixed(8)} SOL). Mengamankan profit.`,
        exitType: 'TRAILING_STOP',
        suggestedTipLamports: PRD_THRESHOLDS.JITO_BASE_TIP_LAMPORTS * 2
      };
    }
  }

  // 6. Smart Arbiter Dynamic Take Profit Target
  const targetTpPrice = position.targetTpPriceSol ?? position.entryPriceSol * (1 + targetTpPct / 100);
  if (position.pnlPct >= targetTpPct || position.currentPriceSol >= targetTpPrice) {
    // Smart Arbiter: Jika momentum masih sangat kuat (ACCELERATING >= +1.5%/s), biarkan profit berlari (let profits run)!
    const isSuperAccelerating = position.momentumStatus === 'ACCELERATING' && velocity >= 1.5;
    if (isSuperAccelerating) {
      // Perketat trailing stop ke 8% di bawah puncak agar tidak kehilangan keuntungan besar
      const runnerDrawdown =
        ((position.highestPriceSol - position.currentPriceSol) / position.highestPriceSol) * 100;
      if (runnerDrawdown >= 8.0) {
        return {
          shouldExit: true,
          reason: `SUPER-RUNNER TRAIL: Koreksi -${runnerDrawdown.toFixed(1)}% dari puncak pelari profit. Mengunci keuntungan maksimal (+${position.pnlPct.toFixed(1)}%).`,
          exitType: 'TAKE_PROFIT',
          suggestedTipLamports: PRD_THRESHOLDS.JITO_BASE_TIP_LAMPORTS * 2
        };
      }
      // Biarkan posisi terus berjalan
      return {
        shouldExit: false,
        suggestedTipLamports: 0
      };
    }

    return {
      shouldExit: true,
      reason: `TARGET TAKE PROFIT HIT: Target keuntungan +${targetTpPct}% tercapai (+${position.pnlPct.toFixed(1)}% @ ${position.currentPriceSol.toFixed(8)} SOL).`,
      exitType: 'TAKE_PROFIT',
      suggestedTipLamports: PRD_THRESHOLDS.JITO_BASE_TIP_LAMPORTS
    };
  }

  return {
    shouldExit: false,
    suggestedTipLamports: 0
  };
}
