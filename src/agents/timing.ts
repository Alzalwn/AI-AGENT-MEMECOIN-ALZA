import { TokenSignal, AgentVerdict } from '../types/terminal';
import { PRD_THRESHOLDS } from '../config/constants';

export function evaluateTimingAgent(token: TokenSignal): AgentVerdict {
  const start = performance.now();

  if (token.volumeDelta15s <= PRD_THRESHOLDS.MIN_15S_VOLUME_DELTA) {
    return {
      agentId: 'timing',
      agentName: 'Timing Agent',
      status: 'VETO',
      reason: `Delta volume 15 detik negatif/stagnan (${token.volumeDelta15s} SOL). Momentum beli belum terbentuk.`,
      metricValue: `${token.volumeDelta15s} SOL`,
      threshold: `> 0 SOL`,
      latencyMs: +(performance.now() - start).toFixed(2)
    };
  }

  if (token.uniqueBuyersCount < PRD_THRESHOLDS.MIN_UNIQUE_BUYERS) {
    return {
      agentId: 'timing',
      agentName: 'Timing Agent',
      status: 'VETO',
      reason: `Transaksi terkonsentrasi hanya pada ${token.uniqueBuyersCount} dompet (Indikasi wash trading / bot pengembang).`,
      metricValue: `${token.uniqueBuyersCount} Wallets`,
      threshold: `>= ${PRD_THRESHOLDS.MIN_UNIQUE_BUYERS} Wallets`,
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
