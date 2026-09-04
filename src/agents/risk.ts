import { TokenSignal, AgentVerdict, AgentThresholds } from '../types/terminal';
import { PRD_THRESHOLDS } from '../config/constants';

export function evaluateRiskAgent(token: TokenSignal, thresholds?: AgentThresholds): AgentVerdict {
  const start = performance.now();
  const maxTop10 = thresholds ? thresholds.maxTop10HoldersPct : PRD_THRESHOLDS.MAX_TOP10_HOLDERS_PCT;
  const reqMint = thresholds ? thresholds.requireMintRevoked : PRD_THRESHOLDS.REQUIRE_MINT_REVOKED;
  const reqFreeze = thresholds ? thresholds.requireFreezeRevoked : PRD_THRESHOLDS.REQUIRE_FREEZE_REVOKED;

  if (reqMint && !token.mintAuthorityRevoked) {
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

  if (reqFreeze && !token.freezeAuthorityRevoked) {
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

  if (token.top10HolderPct > maxTop10) {
    return {
      agentId: 'risk',
      agentName: 'Risk Agent',
      status: 'VETO',
      reason: `Konsentrasi pemegang Top 10 (${token.top10HolderPct}%) melebihi batas maksimal ${maxTop10}%.`,
      metricValue: `${token.top10HolderPct}%`,
      threshold: `<= ${maxTop10}%`,
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
