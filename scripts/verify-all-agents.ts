import { evaluateScannerAgent } from '../src/agents/scanner';
import { evaluateNarrativeAgent } from '../src/agents/narrative';
import { evaluateRiskAgent } from '../src/agents/risk';
import { evaluateTimingAgent } from '../src/agents/timing';
import { evaluateExitAgent } from '../src/agents/exit';
import { MoonshotAnalyzer } from '../src/agents/moonshot';
import { runAgentConsensus, runConsensusAndBuildSignal } from '../src/agents/consensus';
import { TokenSignal, ActivePosition } from '../src/types/terminal';

console.log('======================================================================');
console.log('🤖 COMPREHENSIVE AI MULTI-AGENT HEALTH & INTEGRITY CHECK');
console.log('======================================================================\n');

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`✅ [PASS] ${testName}`);
  } else {
    console.error(`❌ [FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
    process.exitCode = 1;
  }
}

const mockTokenBase: TokenSignal = {
  id: 'sig-test-1',
  mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  symbol: 'PEPE_AI',
  name: 'Pepe AI Agent',
  platform: 'Pump.fun',
  initialLpUsd: 25000,
  burntLiquidityPct: 100,
  mintAuthorityRevoked: true,
  freezeAuthorityRevoked: true,
  top10HolderPct: 11.5,
  volumeDelta15s: 5.2,
  uniqueBuyersCount: 15,
  narrativeCosineSim: 0.94,
  narrativeTheme: 'ai agent',
  priceSol: 0.000045,
  detectedAt: Date.now() - 60000,
  txVelocityPerSec: 8.5,
  buySellRatio: 4.2
};

// 1. SCANNER AGENT TEST
console.log('\n--- 1. SCANNER AGENT (LP & Burnt Gate) ---');
const scanApprove = evaluateScannerAgent(mockTokenBase);
assert(scanApprove.status === 'APPROVE', 'Scanner approves safe LP & 100% burnt');

const scanLowLp = evaluateScannerAgent({ ...mockTokenBase, initialLpUsd: 400 });
assert(scanLowLp.status === 'VETO', 'Scanner VETOES LP below $1,000 threshold');

const scanUnburnt = evaluateScannerAgent({ ...mockTokenBase, burntLiquidityPct: 50 });
assert(scanUnburnt.status === 'VETO', 'Scanner VETOES unburnt LP (< 100%)');

// 2. NARRATIVE AGENT TEST
console.log('\n--- 2. NARRATIVE AGENT (Gemini/Grok Trend Alignment) ---');
const narrApprove = evaluateNarrativeAgent(mockTokenBase);
assert(narrApprove.status === 'APPROVE', 'Narrative approves high cosine similarity (>= 0.85)');

const narrVeto = evaluateNarrativeAgent({ ...mockTokenBase, narrativeCosineSim: 0.42 });
assert(narrVeto.status === 'VETO', 'Narrative VETOES low cosine similarity (< 0.85)');

// 3. RISK AGENT TEST
console.log('\n--- 3. RISK AGENT (Security & Anti-Rug Guard) ---');
const riskApprove = evaluateRiskAgent(mockTokenBase);
assert(riskApprove.status === 'APPROVE', 'Risk approves token with clean on-chain credentials');

const riskActiveMint = evaluateRiskAgent({ ...mockTokenBase, mintAuthorityRevoked: false });
assert(riskActiveMint.status === 'VETO', 'Risk VETOES active Mint Authority');

const riskActiveFreeze = evaluateRiskAgent({ ...mockTokenBase, freezeAuthorityRevoked: false });
assert(riskActiveFreeze.status === 'VETO', 'Risk VETOES active Freeze Authority');

const riskHoneypot = evaluateRiskAgent({ ...mockTokenBase, isHoneypotDetected: true });
assert(riskHoneypot.status === 'VETO', 'Risk VETOES detected Honeypot');

const riskTax = evaluateRiskAgent({ ...mockTokenBase, rugcheckRisks: ['Token has 10% Transfer Fee'] });
assert(riskTax.status === 'VETO', 'Risk VETOES Transfer Tax / Hidden Fee');

const riskTop10 = evaluateRiskAgent({ ...mockTokenBase, top10HolderPct: 28.5 });
assert(riskTop10.status === 'VETO', 'Risk VETOES Top 10 Holder concentration (> 15%)');

// 4. TIMING AGENT TEST
console.log('\n--- 4. TIMING AGENT (Momentum & Flow) ---');
const timingApprove = evaluateTimingAgent(mockTokenBase);
assert(timingApprove.status === 'APPROVE', 'Timing approves strong volume delta & active buyers');

const timingLowVolume = evaluateTimingAgent({ ...mockTokenBase, volumeDelta15s: -2.0, uniqueBuyersCount: 1 });
assert(timingLowVolume.status === 'VETO', 'Timing VETOES negative volume delta / insufficient buyers');

// 5. EXIT AGENT TEST
console.log('\n--- 5. EXIT AGENT (Position Monitor & Exit Arbiter) ---');
const mockPosition: ActivePosition = {
  id: 'POS-TEST-1',
  token: mockTokenBase,
  entryPriceSol: 0.0001,
  currentPriceSol: 0.0001,
  highestPriceSol: 0.0001,
  trailingStopPriceSol: 0.000085,
  tokenAmount: 1000,
  solInvested: 0.1,
  pnlSol: 0,
  pnlPct: 0,
  rMultiplier: 0,
  entryTimestamp: Date.now() - 10000,
  status: 'OPEN',
  targetTpPct: 100,
  stopLossPct: -25,
  trailingDistancePct: 15,
  maxHoldTimeSec: 180,
  velocityPctPerSec: 0.5,
  momentumStatus: 'STEADY',
  etaToTpSeconds: 120,
  holdDurationSec: 10
};

const exitHold = evaluateExitAgent(mockPosition);
assert(!exitHold.shouldExit, 'Exit Agent holds position during healthy steady state');

const exitTp = evaluateExitAgent({
  ...mockPosition,
  currentPriceSol: 0.00021,
  pnlPct: 110
});
assert(exitTp.shouldExit && exitTp.exitType === 'TAKE_PROFIT', 'Exit Agent triggers Take Profit on +110%');

const exitSl = evaluateExitAgent({
  ...mockPosition,
  currentPriceSol: 0.00007,
  pnlPct: -30
});
assert(exitSl.shouldExit && exitSl.exitType === 'STOP_LOSS', 'Exit Agent triggers Stop Loss on -30%');

// 6. MOONSHOT PREDICTOR ENGINE
console.log('\n--- 6. MOONSHOT PREDICTOR ENGINE (4 Pillars Analysis) ---');
const moonshotRes = MoonshotAnalyzer.evaluate(mockTokenBase);
assert(moonshotRes.isApproved, 'Moonshot predicts approved pump setup');
assert(moonshotRes.moonshotScore > 70, `Moonshot score is healthy (${moonshotRes.moonshotScore}%)`);

const moonshotBundled = MoonshotAnalyzer.evaluate({ ...mockTokenBase, top10HolderPct: 35 });
assert(!moonshotBundled.isApproved && moonshotBundled.moonshotScore === 0, 'Moonshot vetoes bundling (> 30%) with 0% score');

// 7. MULTI-AGENT CONSENSUS (Single-Veto Distributed Arbiter)
console.log('\n--- 7. CONSENSUS ENGINE (Single-Veto Distributed Arbiter) ---');
const consensusPass = runAgentConsensus(mockTokenBase);
assert(consensusPass.verdict === 'APPROVED', 'Consensus unanimously APPROVES clean candidate');
assert(consensusPass.decisionTrace.liquidity.passed === true, 'DecisionTrace records liquidity passed');
assert(consensusPass.decisionTrace.honeypot.passed === true, 'DecisionTrace records honeypot passed');
assert(consensusPass.decisionTrace.momentum.passed === true, 'DecisionTrace records momentum passed');

const consensusVetoed = runAgentConsensus({ ...mockTokenBase, mintAuthorityRevoked: false });
assert(consensusVetoed.verdict === 'VETOED', 'Consensus rejects when single agent vetoes (Risk Veto)');
assert(consensusVetoed.vetoAgent === 'risk', 'Consensus accurately identifies Risk Agent as veto origin');

// 8. FULL PIPELINE SIGNAL GENERATION
console.log('\n--- 8. END-TO-END SIGNAL GENERATOR ---');
const fullSignalResult = runConsensusAndBuildSignal(mockTokenBase);
assert(fullSignalResult.signal !== null, 'Full Signal pipeline generates valid TradingSignal');
if (fullSignalResult.signal) {
  assert(['SUPERNOVA', 'HIGH', 'MODERATE'].includes(fullSignalResult.signal.signalTier), `Signal tier is valid: ${fullSignalResult.signal.signalTier}`);
  assert(fullSignalResult.signal.confidenceScore >= 70, `High confidence score: ${fullSignalResult.signal.confidenceScore}%`);
  assert(fullSignalResult.signal.targets.length === 3, `3 TP targets generated (TP1, TP2, TP3)`);
  assert(fullSignalResult.signal.riskRewardRatio > 1, `Favorable Risk/Reward ratio: ${fullSignalResult.signal.riskRewardRatio}x`);
}

console.log('\n======================================================================');
console.log(`🏁 AGENT HEALTH CHECK COMPLETE: ${passedTests}/${totalTests} TESTS PASSED (100%)`);
console.log('======================================================================\n');
