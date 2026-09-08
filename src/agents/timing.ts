import { TokenSignal, AgentVerdict, AgentThresholds } from '../types/terminal';
import { PRD_THRESHOLDS } from '../config/constants';

export function evaluateTimingAgent(token: TokenSignal, thresholds?: AgentThresholds): AgentVerdict {
  const start = performance.now();
  const minVolDelta = thresholds ? thresholds.minVolumeDelta15s : PRD_THRESHOLDS.MIN_15S_VOLUME_DELTA;
  const minBuyers = thresholds ? thresholds.minUniqueBuyers : PRD_THRESHOLDS.MIN_UNIQUE_BUYERS;

  // 1. Anti-COT Veto: Jika buy/sell ratio < 0.7 atau volume 15m mati total (< $1,000)
  if (token.buySellRatio !== undefined && token.buySellRatio < 0.7) {
    return {
      agentId: 'timing',
      agentName: 'Timing Agent',
      status: 'VETO',
      reason: `Tekanan jual mendominasi (Rasio Buy/Sell: ${token.buySellRatio}x < 0.7x). Terindikasi pola dump/slow-bleed seperti COT.`,
      metricValue: `${token.buySellRatio}x B/S`,
      threshold: '>= 0.7x',
      latencyMs: +(performance.now() - start).toFixed(2)
    };
  }

  if (token.volume15mUsd !== undefined && token.volume15mUsd < 1000 && !token.id.startsWith('B0-')) {
    return {
      agentId: 'timing',
      agentName: 'Timing Agent',
      status: 'VETO',
      reason: `Volume transaksi mati ($${token.volume15mUsd.toLocaleString()}/15m). Pola koin ditinggalkan seperti kasus COT.`,
      metricValue: `$${token.volume15mUsd}`,
      threshold: '>= $1,000',
      latencyMs: +(performance.now() - start).toFixed(2)
    };
  }

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

  const isRunner = token.scanTier === 'BREAKOUT_RUNNER';
  const reasonText = isRunner
    ? `🚀 [BREAKOUT RUNNER DETECTED] Akumulasi masif terkonfirmasi (+${token.volumeDelta15s} SOL | ${token.uniqueBuyersCount} pembeli unik | Rasio B/S: ${token.buySellRatio || 1.8}x). Token bersiap terbang (pola Nasduck)!`
    : `Momentum beli organik positif (+${token.volumeDelta15s} SOL) dari ${token.uniqueBuyersCount} pembeli unik.`;

  return {
    agentId: 'timing',
    agentName: 'Timing Agent',
    status: 'APPROVE',
    reason: reasonText,
    metricValue: `+${token.volumeDelta15s} SOL / ${token.uniqueBuyersCount} Buyers`,
    threshold: 'PASS',
    latencyMs: +(performance.now() - start).toFixed(2)
  };
}
