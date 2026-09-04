import { ActivePosition, AgentVerdict } from '../types/terminal';
import { PRD_THRESHOLDS } from '../config/constants';

export interface ExitSignal {
  shouldExit: boolean;
  reason?: string;
  exitType?: 'TAKE_PROFIT' | 'TRAILING_STOP' | 'EMERGENCY_DRAIN';
  suggestedTipLamports: number;
}

export function evaluateExitAgent(position: ActivePosition, currentPoolLpDropPct: number = 0): ExitSignal {
  // 1. Emergency Liquidity Drain Check
  if (currentPoolLpDropPct >= PRD_THRESHOLDS.EMERGENCY_DRAIN_PCT_DROP) {
    return {
      shouldExit: true,
      reason: `EMERGENCY: Likuiditas pool anjlok ${currentPoolLpDropPct}% dalam 1 blok! Rugpull darurat.`,
      exitType: 'EMERGENCY_DRAIN',
      suggestedTipLamports: PRD_THRESHOLDS.JITO_BASE_TIP_LAMPORTS * 5 // High tip for priority exit
    };
  }

  // 2. Take Profit Target (E[R] >= 3.0R)
  if (position.rMultiplier >= PRD_THRESHOLDS.TARGET_TAKE_PROFIT_R) {
    return {
      shouldExit: true,
      reason: `TARGET HIT: Keuntungan mencapai +${position.rMultiplier.toFixed(2)}R (+${position.pnlPct.toFixed(1)}%).`,
      exitType: 'TAKE_PROFIT',
      suggestedTipLamports: PRD_THRESHOLDS.JITO_BASE_TIP_LAMPORTS
    };
  }

  // 3. Trailing Stop (Loss > 0.33R from peak)
  const drawDownFromPeak = (position.highestPriceSol - position.currentPriceSol) / position.highestPriceSol;
  if (drawDownFromPeak >= PRD_THRESHOLDS.TRAILING_STOP_LOSS_R) {
    return {
      shouldExit: true,
      reason: `TRAILING STOP: Koreksi ${(drawDownFromPeak * 100).toFixed(1)}% dari puncak harga tertinggi. Mengunci profit/minimalisir risiko.`,
      exitType: 'TRAILING_STOP',
      suggestedTipLamports: PRD_THRESHOLDS.JITO_BASE_TIP_LAMPORTS * 2
    };
  }

  return {
    shouldExit: false,
    suggestedTipLamports: 0
  };
}
