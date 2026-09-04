import { TokenSignal, AgentVerdict } from '../types/terminal';
import { PRD_THRESHOLDS } from '../config/constants';

export function evaluateNarrativeAgent(token: TokenSignal): AgentVerdict {
  const start = performance.now();

  if (token.narrativeCosineSim < PRD_THRESHOLDS.MIN_COSINE_SIMILARITY) {
    return {
      agentId: 'narrative',
      agentName: 'Narrative Agent',
      status: 'VETO',
      reason: `Cosine similarity narasi (${token.narrativeCosineSim.toFixed(2)}) di bawah ambang batas ${PRD_THRESHOLDS.MIN_COSINE_SIMILARITY}`,
      metricValue: token.narrativeCosineSim.toFixed(2),
      threshold: `>= ${PRD_THRESHOLDS.MIN_COSINE_SIMILARITY}`,
      latencyMs: +(performance.now() - start).toFixed(2)
    };
  }

  return {
    agentId: 'narrative',
    agentName: 'Narrative Agent',
    status: 'APPROVE',
    reason: `Narasi '${token.narrativeTheme}' selaras dengan tren pasar aktif (${token.narrativeCosineSim.toFixed(2)}).`,
    metricValue: token.narrativeCosineSim.toFixed(2),
    threshold: `>= ${PRD_THRESHOLDS.MIN_COSINE_SIMILARITY}`,
    latencyMs: +(performance.now() - start).toFixed(2)
  };
}
