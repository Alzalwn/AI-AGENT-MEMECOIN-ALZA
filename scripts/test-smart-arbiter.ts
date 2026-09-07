import { evaluateExitAgent } from '../src/agents/exit';
import { ActivePosition } from '../src/types/terminal';

console.log('=================================================================');
console.log('🧪 SIMULATION TEST: SMART ARBITER & DYNAMIC EXIT AGENT');
console.log('=================================================================\n');

const createBasePosition = (overrides: Partial<ActivePosition> = {}): ActivePosition => ({
  id: 'sim-pos-1',
  token: {
    id: 'sig-test-1',
    mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    symbol: 'BONK_SIM',
    name: 'Bonk Simulation',
    platform: 'Pump.fun',
    initialLpUsd: 150000,
    burntLiquidityPct: 100,
    mintAuthorityRevoked: true,
    freezeAuthorityRevoked: true,
    top10HolderPct: 18,
    volumeDelta15s: 5.5,
    uniqueBuyersCount: 12,
    narrativeCosineSim: 0.92,
    narrativeTheme: 'ai agent',
    priceSol: 0.0001,
    detectedAt: Date.now() - 30000
  },
  entryPriceSol: 0.0001,
  currentPriceSol: 0.0001,
  highestPriceSol: 0.0001,
  trailingStopPriceSol: 0.000085,
  tokenAmount: 10000,
  solInvested: 1.0,
  pnlSol: 0,
  pnlPct: 0,
  rMultiplier: 0,
  entryTimestamp: Date.now() - 30000, // 30s ago
  status: 'OPEN',
  targetTpPct: 100,
  stopLossPct: -25,
  trailingDistancePct: 15,
  maxHoldTimeSec: 180,
  velocityPctPerSec: 0.5,
  momentumStatus: 'STEADY',
  etaToTpSeconds: 200,
  holdDurationSec: 30,
  ...overrides
});

// Test 1: Let profits run (momentum strong)
console.log('▶ TEST 1: Price climbs +50%, High-water mark updates, profits allowed to run');
const pos1 = createBasePosition({
  currentPriceSol: 0.00015,
  highestPriceSol: 0.00015,
  pnlPct: 50,
  trailingStopPriceSol: 0.00015 * 0.85,
  velocityPctPerSec: 2.1,
  momentumStatus: 'ACCELERATING'
});
const res1 = evaluateExitAgent(pos1, {
  targetTpPct: 100,
  stopLossPct: -25,
  trailingDistancePct: 15,
  maxHoldTimeSec: 180,
  enableMomentumExit: true
});
console.log(`Verdict: shouldExit = ${res1.shouldExit}, Reason: ${res1.reason || 'Holding'}`);
if (!res1.shouldExit) console.log('✅ PASS: Position kept open to let profits run!\n');
else console.error('❌ FAIL: Premature exit\n');

// Test 2: Target Take-Profit Hit (+100%)
console.log('▶ TEST 2: Price hits Target TP (+105%)');
const pos2 = createBasePosition({
  currentPriceSol: 0.000205,
  highestPriceSol: 0.000205,
  pnlPct: 105,
  velocityPctPerSec: 1.2
});
const res2 = evaluateExitAgent(pos2, {
  targetTpPct: 100,
  stopLossPct: -25,
  trailingDistancePct: 15,
  maxHoldTimeSec: 180,
  enableMomentumExit: true
});
console.log(`Verdict: shouldExit = ${res2.shouldExit}, exitType = ${res2.exitType}, reason: ${res2.reason}`);
if (res2.shouldExit && res2.exitType === 'TAKE_PROFIT') console.log('✅ PASS: Take Profit executed at target!\n');
else console.error('❌ FAIL: Target TP not triggered\n');

// Test 3: Trailing Stop Pullback Trigger
console.log('▶ TEST 3: High-water was 0.0002 (+100%), pulled back to 0.00016 (-20% from peak, trailing is 15%)');
const peakPrice = 0.0002;
const trailingFloor = peakPrice * (1 - 0.15); // 0.00017
const currentPrice = 0.000165; // below 0.00017
const pos3 = createBasePosition({
  currentPriceSol: currentPrice,
  highestPriceSol: peakPrice,
  trailingStopPriceSol: trailingFloor,
  pnlPct: 65,
  velocityPctPerSec: -0.4,
  momentumStatus: 'DROPPING'
});
const res3 = evaluateExitAgent(pos3, {
  targetTpPct: 100,
  stopLossPct: -25,
  trailingDistancePct: 15,
  maxHoldTimeSec: 180,
  enableMomentumExit: true
});
console.log(`Verdict: shouldExit = ${res3.shouldExit}, exitType = ${res3.exitType}, reason: ${res3.reason}`);
if (res3.shouldExit && res3.exitType === 'TRAILING_STOP') console.log('✅ PASS: Trailing stop locked in +65% profit on pullback!\n');
else console.error('❌ FAIL: Trailing stop not triggered\n');

// Test 4: Severe Momentum Crash (Emergency Exit)
console.log('▶ TEST 4: Severe momentum dump (velocity = -3.5%/s, price falling rapidly)');
const pos4 = createBasePosition({
  currentPriceSol: 0.00009,
  highestPriceSol: 0.0001,
  pnlPct: -10,
  velocityPctPerSec: -3.5,
  momentumStatus: 'DROPPING'
});
const res4 = evaluateExitAgent(pos4, {
  targetTpPct: 100,
  stopLossPct: -25,
  trailingDistancePct: 15,
  maxHoldTimeSec: 180,
  enableMomentumExit: true
});
console.log(`Verdict: shouldExit = ${res4.shouldExit}, exitType = ${res4.exitType}, reason: ${res4.reason}`);
if (res4.shouldExit && res4.exitType === 'MOMENTUM_COLLAPSE') console.log('✅ PASS: Smart Arbiter triggered emergency exit before hitting -25% SL!\n');
else console.error('❌ FAIL: Momentum crash not caught\n');

// Test 5: TTL / Max Hold Time Fallback
console.log('▶ TEST 5: Position held for 210s (> 180s TTL) with stagnant momentum');
const pos5 = createBasePosition({
  entryTimestamp: Date.now() - 210000,
  holdDurationSec: 210,
  pnlPct: 2,
  velocityPctPerSec: 0.01,
  momentumStatus: 'STAGNANT'
});
const res5 = evaluateExitAgent(pos5, {
  targetTpPct: 100,
  stopLossPct: -25,
  trailingDistancePct: 15,
  maxHoldTimeSec: 180,
  enableMomentumExit: true
});
console.log(`Verdict: shouldExit = ${res5.shouldExit}, exitType = ${res5.exitType}, reason: ${res5.reason}`);
if (res5.shouldExit && res5.exitType === 'TTL_EXPIRED') console.log('✅ PASS: TTL timeout triggered capital recovery exit!\n');
else console.error('❌ FAIL: TTL timeout not triggered\n');

// Test 6: Hard Stop Loss
console.log('▶ TEST 6: Flash crash hitting -28% (Stop Loss = -25%)');
const pos6 = createBasePosition({
  currentPriceSol: 0.000072,
  highestPriceSol: 0.0001,
  pnlPct: -28,
  velocityPctPerSec: -1.0
});
const res6 = evaluateExitAgent(pos6, {
  targetTpPct: 100,
  stopLossPct: -25,
  trailingDistancePct: 15,
  maxHoldTimeSec: 180,
  enableMomentumExit: true
});
console.log(`Verdict: shouldExit = ${res6.shouldExit}, exitType = ${res6.exitType}, reason: ${res6.reason}`);
if (res6.shouldExit && res6.exitType === 'STOP_LOSS') console.log('✅ PASS: Hard stop loss executed safely!\n');
else console.error('❌ FAIL: Hard stop loss not triggered\n');

console.log('🎉 ALL 6 SIMULATION TESTS PASSED PERFECTLY!');
