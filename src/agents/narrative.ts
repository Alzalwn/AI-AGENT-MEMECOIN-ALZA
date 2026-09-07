import { TokenSignal, AgentVerdict, AgentThresholds } from '../types/terminal';
import { PRD_THRESHOLDS } from '../config/constants';

export function evaluateNarrativeAgent(token: TokenSignal, thresholds?: AgentThresholds): AgentVerdict {
  const start = performance.now();
  const minCosSim = thresholds ? thresholds.minCosineSimilarity : PRD_THRESHOLDS.MIN_COSINE_SIMILARITY;

  if (token.narrativeCosineSim < minCosSim) {
    return {
      agentId: 'narrative',
      agentName: 'Narrative Agent (Gemini AI Powered)',
      status: 'VETO',
      reason: `Cosine similarity narasi (${token.narrativeCosineSim.toFixed(2)}) di bawah ambang batas ${minCosSim.toFixed(2)}`,
      metricValue: token.narrativeCosineSim.toFixed(2),
      threshold: `>= ${minCosSim.toFixed(2)}`,
      latencyMs: +(performance.now() - start).toFixed(2)
    };
  }

  return {
    agentId: 'narrative',
    agentName: 'Narrative Agent (Gemini AI Powered)',
    status: 'APPROVE',
    reason: `Narasi '${token.narrativeTheme}' selaras dengan tren pasar aktif (${token.narrativeCosineSim.toFixed(2)} >= ${minCosSim.toFixed(2)}).`,
    metricValue: token.narrativeCosineSim.toFixed(2),
    threshold: `>= ${minCosSim.toFixed(2)}`,
    latencyMs: +(performance.now() - start).toFixed(2)
  };
}
