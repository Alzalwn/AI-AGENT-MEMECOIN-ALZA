import { TokenSignal, ConsensusResult, AgentVerdict, AgentId, AgentThresholds } from '../types/terminal';
import { TradingSignal } from '../types/signal';
import { evaluateScannerAgent } from './scanner';
import { evaluateNarrativeAgent } from './narrative';
import { evaluateRiskAgent } from './risk';
import { evaluateTimingAgent } from './timing';
import { MoonshotAnalyzer } from './moonshot';
import { computeSignal } from '../lib/signalCalculator';

export function runAgentConsensus(token: TokenSignal, thresholds?: AgentThresholds): ConsensusResult {
  const startTime = performance.now();

  // Evaluate Moonshot Predictor Engine (Pillar 1-4)
  const moonshotVerdict = MoonshotAnalyzer.evaluate(token);
  token.moonshot = moonshotVerdict;

  // Evaluate agents concurrently with custom thresholds support
  const scannerVerdict = evaluateScannerAgent(token, thresholds);
  const narrativeVerdict = evaluateNarrativeAgent(token, thresholds);
  const riskVerdict = evaluateRiskAgent(token, thresholds);
  const timingVerdict = evaluateTimingAgent(token, thresholds);

  // Default exit agent state for new candidate token
  const exitVerdict: AgentVerdict = {
    agentId: 'exit',
    agentName: 'Exit Agent',
    status: 'APPROVE',
    reason: 'Standby - Exit agent akan aktif saat posisi OPEN.',
    metricValue: 'Standby',
    threshold: 'Ready',
    latencyMs: 0.1
  };

  const verdicts: Record<AgentId, AgentVerdict> = {
    scanner: scannerVerdict,
    narrative: narrativeVerdict,
    risk: riskVerdict,
    timing: timingVerdict,
    exit: exitVerdict
  };

  // Check for any VETO (Single-Veto Distributed Rule)
  const agentKeys: AgentId[] = ['risk', 'scanner', 'narrative', 'timing'];
  let firstVetoAgent: AgentId | undefined;
  let firstVetoReason: string | undefined;

  for (const key of agentKeys) {
    if (verdicts[key].status === 'VETO') {
      firstVetoAgent = key;
      firstVetoReason = verdicts[key].reason;
      break;
    }
  }

  // Jika semua agen lolos tetapi Moonshot Analyzer mendeteksi bundling > 30% atau honeypot
  if (!firstVetoAgent && !moonshotVerdict.isApproved && moonshotVerdict.vetoReason) {
    firstVetoAgent = 'risk';
    firstVetoReason = moonshotVerdict.vetoReason;
    verdicts.risk = {
      agentId: 'risk',
      agentName: 'Risk Agent (Moonshot Guard)',
      status: 'VETO',
      reason: moonshotVerdict.vetoReason,
      metricValue: `${token.top10HolderPct}% Top10`,
      threshold: '<= 30% (Anti-Bundling)',
      latencyMs: 0.2
    };
  }

  const consensusLatencyMs = +(performance.now() - startTime).toFixed(2);

  const isLpPassed = scannerVerdict.status === 'APPROVE';
  const isHoneypotPassed = riskVerdict.status === 'APPROVE';
  const isMomentumPassed = timingVerdict.status === 'APPROVE';

  const decisionTrace: import('../types/terminal').DecisionTrace = {
    liquidity: {
      passed: isLpPassed,
      initialLpUsd: token.initialLpUsd,
      burntLiquidityPct: token.burntLiquidityPct,
      reason: scannerVerdict.reason
    },
    honeypot: {
      passed: isHoneypotPassed,
      mintRevoked: token.mintAuthorityRevoked,
      freezeRevoked: token.freezeAuthorityRevoked,
      top10HolderPct: token.top10HolderPct,
      rugcheckScore: token.rugcheckScore || 'GOOD',
      transferFeeDetected: token.rugcheckRisks?.some((r) => r.toLowerCase().includes('fee') || r.toLowerCase().includes('tax')) ?? false,
      reason: riskVerdict.reason
    },
    momentum: {
      passed: isMomentumPassed,
      volumeDelta15s: token.volumeDelta15s,
      uniqueBuyersCount: token.uniqueBuyersCount,
      narrativeCosineSim: token.narrativeCosineSim,
      txVelocityPerSec: token.txVelocityPerSec ?? +(token.uniqueBuyersCount * 0.45).toFixed(1),
      buySellRatio: token.buySellRatio ?? +(Math.max(1.1, token.volumeDelta15s > 0 ? 2.4 : 0.8)).toFixed(2),
      reason: timingVerdict.reason
    },
    summary: firstVetoAgent
      ? `DITOLAK oleh ${verdicts[firstVetoAgent]?.agentName || firstVetoAgent}: ${firstVetoReason}`
      : 'LOLOS 5/5 Konsensus Agen - Kriteria Likuiditas, Honeypot, dan Momentum Terpenuhi!'
  };

  // Verbose Structured Decision Logging for Terminal and Backend Console
  try {
    console.log(
      `\n========================================================================\n` +
      `🧠 [DECISION ENGINE] EVALUATING: ${token.symbol} (${token.mint.slice(0, 6)}...${token.mint.slice(-4)})\n` +
      `  [1/3] LIKUIDITAS       : ${isLpPassed ? '✅ PASS' : '🛑 VETO'} | LP: $${token.initialLpUsd.toLocaleString()} | Burnt: ${token.burntLiquidityPct}%\n` +
      `  [2/3] HONEYPOT SHIELD  : ${isHoneypotPassed ? '✅ PASS' : '🛑 VETO'} | Mint: ${token.mintAuthorityRevoked ? 'REVOKED' : 'ACTIVE'} | Freeze: ${token.freezeAuthorityRevoked ? 'REVOKED' : 'ACTIVE'} | Top10: ${token.top10HolderPct}%\n` +
      `  [3/3] MOMENTUM/VELOCITY: ${isMomentumPassed ? '✅ PASS' : '🛑 VETO'} | VolDelta: ${token.volumeDelta15s > 0 ? '+' : ''}${token.volumeDelta15s} SOL | Buyers: ${token.uniqueBuyersCount} | Virality: ${token.narrativeCosineSim}\n` +
      `  🎯 FINAL VERDICT       : ${firstVetoAgent ? `❌ REJECTED [${verdicts[firstVetoAgent]?.agentName || firstVetoAgent}: ${firstVetoReason}]` : '✅ APPROVED (5/5 CONSENSUS - GENERATING SIGNAL 📡)'}\n` +
      `========================================================================`
    );
  } catch {}

  return {
    token,
    verdict: firstVetoAgent ? 'VETOED' : 'APPROVED',
    vetoAgent: firstVetoAgent,
    vetoReason: firstVetoReason,
    verdicts,
    consensusLatencyMs,
    timestamp: Date.now(),
    moonshot: moonshotVerdict,
    decisionTrace
  };
}

/**
 * Helper: Jalankan konsensus lengkap dan jika APPROVED, hasilkan TradingSignal.
 * Ini adalah entry point utama untuk pipeline signal provider.
 * @returns { consensusResult, signal? } — signal hanya ada jika APPROVED
 */
export function runConsensusAndBuildSignal(
  token: TokenSignal,
  opts?: {
    thresholds?: AgentThresholds;
    grokViralityScore?: number;
    solRateUsd?: number;
  }
): { consensusResult: ConsensusResult; signal: TradingSignal | null } {
  const consensusResult = runAgentConsensus(token, opts?.thresholds);

  if (consensusResult.verdict !== 'APPROVED' || !consensusResult.moonshot) {
    return { consensusResult, signal: null };
  }

  const signal = computeSignal({
    token,
    moonshot: consensusResult.moonshot,
    grokViralityScore: opts?.grokViralityScore ?? token.narrativeCosineSim,
    solRateUsd: opts?.solRateUsd ?? 140,
  });

  return { consensusResult, signal };
}
