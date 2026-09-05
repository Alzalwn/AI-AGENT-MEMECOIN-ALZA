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

  if (token.isHoneypotDetected) {
    return {
      agentId: 'risk',
      agentName: 'Risk Agent',
      status: 'VETO',
      reason: 'Honeypot terdeteksi oleh Rugcheck security audit! Pembelian tidak dapat dijual kembali.',
      metricValue: 'Honeypot',
      threshold: 'Safe',
      latencyMs: +(performance.now() - start).toFixed(2)
    };
  }

  if (token.rugcheckScore === 'DANGER') {
    return {
      agentId: 'risk',
      agentName: 'Risk Agent',
      status: 'VETO',
      reason: `Audit Rugcheck berstatus DANGER (Skor: ${token.rugcheckNumericScore ?? 'High'}). Terindikasi risiko penipuan/rugpull!`,
      metricValue: `Rugcheck ${token.rugcheckNumericScore ?? 'Danger'}`,
      threshold: 'Safe/Warning',
      latencyMs: +(performance.now() - start).toFixed(2)
    };
  }

  if (token.creatorBalancePct !== undefined && token.creatorBalancePct > 15) {
    return {
      agentId: 'risk',
      agentName: 'Risk Agent',
      status: 'VETO',
      reason: `Deployer/Creator wallet memegang ${token.creatorBalancePct}% suplai (batas aman <= 15%). Terindikasi risiko insider dump!`,
      metricValue: `${token.creatorBalancePct}% Creator`,
      threshold: '<= 15%',
      latencyMs: +(performance.now() - start).toFixed(2)
    };
  }

  const creatorNote = token.creatorAddress ? ` [Creator: ${token.creatorAddress.slice(0, 4)}..${token.creatorAddress.slice(-4)}]` : '';

  return {
    agentId: 'risk',
    agentName: 'Risk Agent',
    status: 'APPROVE',
    reason: `Keamanan on-chain bersih: Mint/Freeze dicabut${token.rugcheckNumericScore !== undefined ? ` (Rugcheck: ${token.rugcheckNumericScore})` : ''} & Top 10 (${token.top10HolderPct}%) terdistribusi wajar.${creatorNote}`,
    metricValue: `${token.top10HolderPct}% Top10`,
    threshold: 'PASS',
    latencyMs: +(performance.now() - start).toFixed(2)
  };
}
