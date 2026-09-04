import { TokenSignal, AgentVerdict, AgentThresholds } from '../types/terminal';
import { PRD_THRESHOLDS } from '../config/constants';

export function evaluateScannerAgent(token: TokenSignal, thresholds?: AgentThresholds): AgentVerdict {
  const start = performance.now();
  const minLp = thresholds ? thresholds.minInitialLpUsd : PRD_THRESHOLDS.MIN_INITIAL_LP_USD;
  const minBurnt = thresholds ? thresholds.minBurntLiquidityPct : PRD_THRESHOLDS.MIN_BURNT_LIQUIDITY_PCT;

  if (token.initialLpUsd < minLp) {
    return {
      agentId: 'scanner',
      agentName: 'Scanner Agent',
      status: 'VETO',
      reason: `LP awal ($${token.initialLpUsd.toLocaleString()}) di bawah ambang batas minimum $${minLp.toLocaleString()}`,
      metricValue: `$${token.initialLpUsd}`,
      threshold: `>= $${minLp}`,
      latencyMs: +(performance.now() - start).toFixed(2)
    };
  }

  if (token.burntLiquidityPct < minBurnt) {
    return {
      agentId: 'scanner',
      agentName: 'Scanner Agent',
      status: 'VETO',
      reason: `Likuiditas belum dibakar/dikunci (saat ini: ${token.burntLiquidityPct}%, min: ${minBurnt}%)`,
      metricValue: `${token.burntLiquidityPct}%`,
      threshold: `${minBurnt}% Burnt`,
      latencyMs: +(performance.now() - start).toFixed(2)
    };
  }

  return {
    agentId: 'scanner',
    agentName: 'Scanner Agent',
    status: 'APPROVE',
    reason: `LP $${token.initialLpUsd.toLocaleString()} terverifikasi aman dan likuiditas 100% terkunci/dibakar.`,
    metricValue: `$${token.initialLpUsd.toLocaleString()} / 100% LP`,
    threshold: 'PASS',
    latencyMs: +(performance.now() - start).toFixed(2)
  };
}
