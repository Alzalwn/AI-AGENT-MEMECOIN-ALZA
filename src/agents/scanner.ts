import { TokenSignal, AgentVerdict } from '../types/terminal';
import { PRD_THRESHOLDS } from '../config/constants';

export function evaluateScannerAgent(token: TokenSignal): AgentVerdict {
  const start = performance.now();

  if (token.initialLpUsd < PRD_THRESHOLDS.MIN_INITIAL_LP_USD) {
    return {
      agentId: 'scanner',
      agentName: 'Scanner Agent',
      status: 'VETO',
      reason: `LP awal ($${token.initialLpUsd.toLocaleString()}) di bawah ambang batas minimum $${PRD_THRESHOLDS.MIN_INITIAL_LP_USD.toLocaleString()}`,
      metricValue: `$${token.initialLpUsd}`,
      threshold: `>= $${PRD_THRESHOLDS.MIN_INITIAL_LP_USD}`,
      latencyMs: +(performance.now() - start).toFixed(2)
    };
  }

  if (token.burntLiquidityPct < PRD_THRESHOLDS.MIN_BURNT_LIQUIDITY_PCT) {
    return {
      agentId: 'scanner',
      agentName: 'Scanner Agent',
      status: 'VETO',
      reason: `Likuiditas belum dibakar 100% (saat ini: ${token.burntLiquidityPct}%)`,
      metricValue: `${token.burntLiquidityPct}%`,
      threshold: `${PRD_THRESHOLDS.MIN_BURNT_LIQUIDITY_PCT}% Burnt`,
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
