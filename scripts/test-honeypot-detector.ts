import { verifySafeToSell, HoneypotCheckResult, KNOWN_DEPLOYER_BLACKLIST } from '../src/lib/honeypot';
import { evaluateHoneypotAgent } from '../src/agents/honeypot';
import { TokenSignal } from '../src/types/terminal';

function createMockToken(overrides: Partial<TokenSignal> = {}): TokenSignal {
  return {
    mint: 'SoL1111111111111111111111111111111111111111',
    symbol: '$TEST',
    name: 'Test Memecoin',
    priceSol: 0.0001,
    liquidityUsd: 45000,
    marketCapUsd: 120000,
    mintAuthorityRevoked: true,
    freezeAuthorityRevoked: true,
    top10HolderPct: 18.5,
    bondingCurvePct: 42,
    volumeDelta15s: 3.2,
    uniqueBuyersCount: 14,
    narrativeCosineSim: 0.91,
    creatorAddress: 'CleanCreatorWallet111111111111111111111111',
    creatorTokensCount: 2,
    devHoldingPct: 2.5,
    rugcheckScore: 'GOOD',
    rugcheckRisks: [],
    platform: 'Raydium',
    listedAt: Date.now() - 30000,
    isHoneypotDetected: false,
    ...overrides
  };
}

async function runHoneypotDetectorTestSuite() {
  console.log('===============================================================');
  console.log('🛡️ RUNNING SOLANA HONEYPOT DETECTOR TEST SUITE (verifySafeToSell)');
  console.log('===============================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`✅ [PASS] ${testName}`);
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      if (detail) console.error(`   Detail: ${detail}`);
    }
  }

  // -------------------------------------------------------------------------
  // TEST 1: FREEZE AUTHORITY ACTIVE (Solana Primary Honeypot Vector)
  // -------------------------------------------------------------------------
  console.log('--- TEST 1: Freeze Authority Check ---');
  const freezeToken = createMockToken({
    symbol: '$FREEZE_SCAM',
    freezeAuthorityRevoked: false,
    creatorAddress: 'MaliciousDev11111111111111111111111111111'
  });

  const res1 = await verifySafeToSell(freezeToken);
  assert(!res1.isSafeToSell, 'Freeze Authority Active -> isSafeToSell must be false');
  assert(res1.verdict === 'HONEYPOT_DETECTED', 'Freeze Authority Active -> verdict === HONEYPOT_DETECTED');
  assert(res1.checks.freezeAuthority.status === 'FAIL_HONEYPOT', 'Freeze Authority check status === FAIL_HONEYPOT');
  assert(res1.reason?.includes('FREEZE AUTHORITY MASIH AKTIF') === true, 'Reason explains freeze authority scam vector');

  const agentVerdict1 = await evaluateHoneypotAgent(freezeToken);
  assert(agentVerdict1.status === 'VETO', 'Agent returns VETO for Active Freeze Authority');

  // -------------------------------------------------------------------------
  // TEST 2: TOKEN-2022 EXCESSIVE TRANSFER TAX (> 10%)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 2: Token-2022 Transfer Tax Check ---');
  const taxToken = createMockToken({
    symbol: '$TAX_TRAP',
    rugcheckRisks: ['Token-2022 Transfer Fee 25%', 'High Slippage Risk']
  });

  const res2 = await verifySafeToSell(taxToken);
  assert(!res2.isSafeToSell, 'Excessive Transfer Tax (25%) -> isSafeToSell must be false');
  assert(res2.checks.token2022Extensions.status === 'FAIL_EXCESSIVE_TAX', 'Extension status === FAIL_EXCESSIVE_TAX');
  assert(res2.checks.token2022Extensions.transferFeePct === 25, 'Correctly parsed 25% transfer fee');

  // -------------------------------------------------------------------------
  // TEST 3: TOKEN-2022 PERMANENT DELEGATE & NON-TRANSFERABLE
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 3: Token-2022 Permanent Delegate & Soulbound Check ---');
  const delegateToken = createMockToken({
    symbol: '$DELEGATE_STEAL',
    rugcheckRisks: ['Token-2022 Permanent Delegate active']
  });

  const res3 = await verifySafeToSell(delegateToken);
  assert(!res3.isSafeToSell, 'Permanent Delegate -> isSafeToSell must be false');
  assert(res3.checks.token2022Extensions.status === 'FAIL_PERMANENT_DELEGATE', 'Extension status === FAIL_PERMANENT_DELEGATE');

  const nonTransferableToken = createMockToken({
    symbol: '$SOULBOUND',
    rugcheckRisks: ['Token-2022 Non-transferable extension enabled']
  });
  const res3b = await verifySafeToSell(nonTransferableToken);
  assert(!res3b.isSafeToSell, 'Non-transferable extension -> isSafeToSell must be false');
  assert(res3b.checks.token2022Extensions.status === 'FAIL_NON_TRANSFERABLE', 'Extension status === FAIL_NON_TRANSFERABLE');

  // -------------------------------------------------------------------------
  // TEST 4: DEPLOYER BLACKLIST CHECK
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 4: Deployer Blacklist Filter ---');
  const blacklistedCreator = Array.from(KNOWN_DEPLOYER_BLACKLIST)[0];
  const scammerToken = createMockToken({
    symbol: '$RUG_DEV',
    creatorAddress: blacklistedCreator
  });

  const res4 = await verifySafeToSell(scammerToken);
  assert(!res4.isSafeToSell, 'Blacklisted Deployer -> isSafeToSell must be false');
  assert(res4.checks.deployer.status === 'BLACKLISTED', 'Deployer status === BLACKLISTED');
  assert(res4.checks.deployer.isBlacklisted === true, 'Deployer isBlacklisted === true');

  // -------------------------------------------------------------------------
  // TEST 5: PRE-FLIGHT SELL SIMULATION REVERT (Honeypot Trap)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 5: Pre-Flight Sell Simulation Check ---');
  const revertToken = createMockToken({
    symbol: '$REVERT_SWAP',
    isHoneypotDetected: true // Simulates Rugcheck / DEX simulation revert
  });

  const res5 = await verifySafeToSell(revertToken);
  assert(!res5.isSafeToSell, 'Swap Revert -> isSafeToSell must be false');
  assert(res5.checks.simulation.status === 'FAIL_SELL_REVERT', 'Simulation status === FAIL_SELL_REVERT');
  assert(res5.verdict === 'HONEYPOT_DETECTED', 'Verdict === HONEYPOT_DETECTED');

  // -------------------------------------------------------------------------
  // TEST 6: 100% CLEAN TOKEN (PASSED ALL GATES)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 6: Clean Token Verification (Safe to Sell) ---');
  const cleanToken = createMockToken({
    symbol: '$CLEAN_MOON',
    freezeAuthorityRevoked: true,
    mintAuthorityRevoked: true,
    top10HolderPct: 15,
    rugcheckScore: 'GOOD',
    rugcheckRisks: [],
    creatorAddress: 'VerifiedAuditedDeployer1111111111111111111'
  });

  const res6 = await verifySafeToSell(cleanToken);
  assert(res6.isSafeToSell, 'Clean Token -> isSafeToSell must be true');
  assert(res6.verdict === 'SAFE', 'Clean Token -> verdict === SAFE');
  assert(res6.checks.freezeAuthority.status === 'PASS', 'Freeze Authority PASS');
  assert(res6.checks.token2022Extensions.status === 'PASS', 'Token-2022 Extensions PASS');
  assert(res6.checks.deployer.status === 'CLEAN', 'Deployer Clean PASS');
  assert(res6.checks.simulation.status === 'PASS', 'Simulation PASS');

  const agentVerdict6 = await evaluateHoneypotAgent(cleanToken);
  assert(agentVerdict6.status === 'APPROVE', 'Agent returns APPROVE for Clean Token');

  console.log('\n===============================================================');
  console.log(`🏁 TEST RESULTS: ${passedTests}/${totalTests} TESTS PASSED (${((passedTests/totalTests)*100).toFixed(0)}%)`);
  console.log('===============================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runHoneypotDetectorTestSuite().catch((err) => {
  console.error('Test suite error:', err);
  process.exit(1);
});
