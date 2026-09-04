import { TokenSignal, AgentVerdict, AgentThresholds } from '../types/terminal';
import { PRD_THRESHOLDS } from '../config/constants';

export function evaluateTimingAgent(token: TokenSignal, thresholds?: AgentThresholds): AgentVerdict {
  const start = performance.now();
  const minVolDelta = thresholds ? thresholds.minVolumeDelta15s : PRD_THRESHOLDS.MIN_15S_VOLUME_DELTA;
  const minBuyers = thresholds ? thresholds.minUniqueBuyers : PRD_THRESHOLDS.MIN_UNIQUE_BUYERS;

  if (token.volumeDelta15s <= minVolDelta) {
    return {
      agentId: 'timing',
      agentName: 'Timing Agent',
      status: 'VETO',
      reason: `Delta volume 15 detik (${token.volumeDelta15s} SOL) di bawah batas (${minVolDelta} SOL). Momentum beli belum terbentuk.`,
      metricValue: `${token.volumeDelta15s} SOL`,
      threshold: `> ${minVolDelta} SOL`,
      latencyMs: +(performance.now() - start).toFixed(2)
    };
  }

  if (token.uniqueBuyersCount < minBuyers) {
    return {
      agentId: 'timing',
      agentName: 'Timing Agent',
      status: 'VETO',
      reason: `Transaksi terkonsentrasi hanya pada ${token.uniqueBuyersCount} dompet (min: ${minBuyers} pembeli unik).`,
      metricValue: `${token.uniqueBuyersCount} Wallets`,
      threshold: `>= ${minBuyers} Wallets`,
      latencyMs: +(performance.now() - start).toFixed(2)
    };
  }

  return {
    agentId: 'timing',
    agentName: 'Timing Agent',
    status: 'APPROVE',
    reason: `Momentum beli organik positif (+${token.volumeDelta15s} SOL) dari ${token.uniqueBuyersCount} pembeli unik.`,
    metricValue: `+${token.volumeDelta15s} SOL / ${token.uniqueBuyersCount} Buyers`,
    threshold: 'PASS',
    latencyMs: +(performance.now() - start).toFixed(2)
  };
}
