import { TokenSignal, AgentVerdict } from '../types/terminal';
import { PRD_THRESHOLDS } from '../config/constants';

export function evaluateRiskAgent(token: TokenSignal): AgentVerdict {
  const start = performance.now();

  if (!token.mintAuthorityRevoked) {
    return {
      agentId: 'risk',
      agentName: 'Risk Agent',
      status: 'VETO',
      reason: 'Mint Authority masih AKTIF. Risiko pencetakan token tak terbatas (Honeypot).',
      metricValue: 'Mint Active',
      threshold: 'Must Revoke',
      latencyMs: +(performance.now() - start).toFixed(2)
    };
  }

  if (!token.freezeAuthorityRevoked) {
    return {
      agentId: 'risk',
      agentName: 'Risk Agent',
      status: 'VETO',
      reason: 'Freeze Authority masih AKTIF. Risiko pembekuan dompet pembeli (Blacklist).',
      metricValue: 'Freeze Active',
      threshold: 'Must Revoke',
      latencyMs: +(performance.now() - start).toFixed(2)
    };
  }

  if (token.top10HolderPct > PRD_THRESHOLDS.MAX_TOP10_HOLDERS_PCT) {
    return {
      agentId: 'risk',
      agentName: 'Risk Agent',
      status: 'VETO',
      reason: `Konsentrasi pemegang Top 10 (${token.top10HolderPct}%) melebihi batas maksimal ${PRD_THRESHOLDS.MAX_TOP10_HOLDERS_PCT}%.`,
      metricValue: `${token.top10HolderPct}%`,
      threshold: `<= ${PRD_THRESHOLDS.MAX_TOP10_HOLDERS_PCT}%`,
      latencyMs: +(performance.now() - start).toFixed(2)
    };
  }

  return {
    agentId: 'risk',
    agentName: 'Risk Agent',
    status: 'APPROVE',
    reason: `Keamanan on-chain bersih: Mint/Freeze dicabut & Top 10 (${token.top10HolderPct}%) terdistribusi wajar.`,
    metricValue: `${token.top10HolderPct}% Top10`,
    threshold: 'PASS',
    latencyMs: +(performance.now() - start).toFixed(2)
  };
}
