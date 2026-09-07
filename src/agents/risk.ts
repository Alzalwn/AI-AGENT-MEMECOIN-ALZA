import { TokenSignal, AgentVerdict, AgentThresholds } from '../types/terminal';
import { PRD_THRESHOLDS } from '../config/constants';
import { KNOWN_DEPLOYER_BLACKLIST } from '../lib/honeypot';

export function evaluateRiskAgent(token: TokenSignal, thresholds?: AgentThresholds): AgentVerdict {
  const start = performance.now();
  const maxTop10 = thresholds ? thresholds.maxTop10HoldersPct : PRD_THRESHOLDS.MAX_TOP10_HOLDERS_PCT;
  const reqMint = thresholds ? thresholds.requireMintRevoked : PRD_THRESHOLDS.REQUIRE_MINT_REVOKED;
  const reqFreeze = thresholds ? thresholds.requireFreezeRevoked : PRD_THRESHOLDS.REQUIRE_FREEZE_REVOKED;

  // 1. Mint Authority Verification
  if (reqMint && !token.mintAuthorityRevoked) {
    return {
      agentId: 'risk',
      agentName: 'Risk Agent',
      status: 'VETO',
      reason: 'Mint Authority masih AKTIF. Risiko pencetakan suplai token tak terbatas (Honeypot/Dilution).',
      metricValue: 'Mint Active',
      threshold: 'Must Revoke',
      latencyMs: +(performance.now() - start).toFixed(2)
    };
  }

  // 2. Freeze Authority Verification
  if (reqFreeze && !token.freezeAuthorityRevoked) {
    return {
      agentId: 'risk',
      agentName: 'Risk Agent',
      status: 'VETO',
      reason: 'Freeze Authority masih AKTIF. Risiko pembekuan dompet pembeli oleh pengembang (Blacklist).',
      metricValue: 'Freeze Active',
      threshold: 'Must Revoke',
      latencyMs: +(performance.now() - start).toFixed(2)
    };
  }

  // 3. Honeypot & Can-Not-Sell Pattern Check
  if (token.isHoneypotDetected) {
    return {
      agentId: 'risk',
      agentName: 'Risk Agent',
      status: 'VETO',
      reason: 'Honeypot terdeteksi oleh Rugcheck security audit! Pembelian tidak dapat dijual kembali di DEX.',
      metricValue: 'Honeypot',
      threshold: 'Safe',
      latencyMs: +(performance.now() - start).toFixed(2)
    };
  }

  // 4. Rugcheck Danger Score Tier
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

  // 5. Transfer Tax / Fee Extension Detection (Solana Token-2022)
  if (
    token.rugcheckRisks &&
    token.rugcheckRisks.some(
      (r) =>
        r.toLowerCase().includes('transfer fee') ||
        r.toLowerCase().includes('transfer tax') ||
        r.toLowerCase().includes('tax')
    )
  ) {
    return {
      agentId: 'risk',
      agentName: 'Risk Agent',
      status: 'VETO',
      reason: 'Terdeteksi Transfer Fee / Tax pada token (Token-2022). Potongan tersembunyi pada transaksi beli/jual.',
      metricValue: 'Transfer Tax',
      threshold: '0% Tax',
      latencyMs: +(performance.now() - start).toFixed(2)
    };
  }

  // 6. Permanent Delegate Risk
  if (
    token.rugcheckRisks &&
    token.rugcheckRisks.some((r) => r.toLowerCase().includes('permanent delegate'))
  ) {
    return {
      agentId: 'risk',
      agentName: 'Risk Agent',
      status: 'VETO',
      reason: 'Terdeteksi Permanent Delegate pada token. Otoritas deployer dapat memindahkan token dari dompet pembeli.',
      metricValue: 'Perm Delegate',
      threshold: 'None',
      latencyMs: +(performance.now() - start).toFixed(2)
    };
  }

  // 7. Creator / Deployer Blacklist & Wallet Balance Check
  if (token.creatorAddress && KNOWN_DEPLOYER_BLACKLIST.has(token.creatorAddress)) {
    return {
      agentId: 'risk',
      agentName: 'Risk Agent',
      status: 'VETO',
      reason: `Deployer wallet (${token.creatorAddress.slice(0, 6)}...${token.creatorAddress.slice(-4)}) terdaftar dalam blacklist serial rug pull / honeypot!`,
      metricValue: 'Blacklisted Dev',
      threshold: 'Clean Dev',
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

  // 8. Top 10 Non-LP Holder Concentration
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

  const creatorNote = token.creatorAddress
    ? ` [Creator: ${token.creatorAddress.slice(0, 4)}..${token.creatorAddress.slice(-4)}]`
    : '';

  return {
    agentId: 'risk',
    agentName: 'Risk Agent',
    status: 'APPROVE',
    reason: `Keamanan on-chain bersih: Mint/Freeze dicabut${
      token.rugcheckNumericScore !== undefined ? ` (Rugcheck: ${token.rugcheckNumericScore})` : ''
    } & Top 10 (${token.top10HolderPct}%) terdistribusi wajar.${creatorNote}`,
    metricValue: `${token.top10HolderPct}% Top10`,
    threshold: 'PASS',
    latencyMs: +(performance.now() - start).toFixed(2)
  };
}
