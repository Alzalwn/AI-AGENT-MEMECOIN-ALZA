import { TokenSignal, AgentVerdict } from '../types/terminal';
import { verifySafeToSell, HoneypotCheckResult } from '../lib/honeypot';

/**
 * Honeypot Defense Agent
 * 
 * Melakukan evaluasi Honeypot pra-transaksi tingkat tinggi:
 * - Freeze Authority
 * - Token-2022 Extensions & Tax
 * - Pre-flight sell simulation
 * - Deployer blacklist
 */
export async function evaluateHoneypotAgent(token: TokenSignal): Promise<AgentVerdict> {
  const start = performance.now();
  const res: HoneypotCheckResult = await verifySafeToSell(token);

  if (!res.isSafeToSell) {
    return {
      agentId: 'risk',
      agentName: 'Honeypot Shield',
      status: 'VETO',
      reason: `[HONEYPOT DETECTED] ${res.reason || 'Token tidak aman untuk dijual kembali.'}`,
      metricValue: 'Honeypot',
      threshold: 'Safe To Sell',
      latencyMs: +(performance.now() - start).toFixed(2)
    };
  }

  return {
    agentId: 'risk',
    agentName: 'Honeypot Shield',
    status: 'APPROVE',
    reason: 'Keamanan 100% Bersih: Freeze Authority dicabut, tidak ada pajak Token-2022, rute jual terverifikasi.',
    metricValue: 'Clean & Sellable',
    threshold: 'Safe To Sell',
    latencyMs: +(performance.now() - start).toFixed(2)
  };
}

export { verifySafeToSell };
export type { HoneypotCheckResult };
