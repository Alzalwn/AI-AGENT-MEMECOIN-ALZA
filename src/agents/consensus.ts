import { TokenSignal, ConsensusResult, AgentVerdict, AgentId, AgentThresholds } from '../types/terminal';
import { evaluateScannerAgent } from './scanner';
import { evaluateNarrativeAgent } from './narrative';
import { evaluateRiskAgent } from './risk';
import { evaluateTimingAgent } from './timing';
import { MoonshotAnalyzer } from './moonshot';

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

  return {
    token,
    verdict: firstVetoAgent ? 'VETOED' : 'APPROVED',
    vetoAgent: firstVetoAgent,
    vetoReason: firstVetoReason,
    verdicts,
    consensusLatencyMs,
    timestamp: Date.now(),
    moonshot: moonshotVerdict
  };
}
