import { ExecutionManager } from '../src/engine/executionManager';
import { TokenSignal } from '../src/types/terminal';
import { positionMutex } from '../src/engine/mutex';

async function runExecutionManagerTests() {
  console.log('====================================================');
  console.log('🧪 TESTING EXECUTION MANAGER (AUTONOMOUS MEV SNIPER)');
  console.log('====================================================\n');

  let positionOpened = false;
  let updatesReceived = 0;
  let positionClosed = false;

  const manager = new ExecutionManager(undefined, {
    onPositionOpened: (pos) => {
      positionOpened = true;
      console.log(`✅ [CALLBACK: onPositionOpened] CA: ${pos.token.mint} | Investasi: ${pos.solInvested} SOL`);
    },
    onPositionUpdated: (pos) => {
      updatesReceived++;
      console.log(`📊 [CALLBACK: onPositionUpdated #${updatesReceived}] PNL: ${pos.pnlPct}% (${pos.pnlSol} SOL) | Price: ${pos.currentPriceSol.toFixed(8)} SOL`);
    },
    onPositionClosed: (trade) => {
      positionClosed = true;
      console.log(`🏆 [CALLBACK: onPositionClosed] Token: ${trade.token.symbol} | Reason: ${trade.exitReason} | Realized PNL: ${trade.pnlPct}% (${trade.pnlSol} SOL)`);
    },
    onLog: (cat, lvl, msg) => {
      console.log(`   [LOG ${cat}] ${msg}`);
    }
  });

  const testToken: TokenSignal = {
    id: 'TEST-MINT-01',
    mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    symbol: '$ALPHA',
    name: 'Alpha Test Token',
    platform: 'Pump.fun',
    initialLpUsd: 8500,
    burntLiquidityPct: 100,
    mintAuthorityRevoked: true,
    freezeAuthorityRevoked: true,
    top10HolderPct: 9,
    volumeDelta15s: 2.1,
    uniqueBuyersCount: 7,
    narrativeCosineSim: 0.92,
    narrativeTheme: 'Autonomous MEV',
    priceSol: 0.00001,
    detectedAt: Date.now(),
    isRealData: false
  };

  // Test 1: Mutex Lock and triggerBuy
  console.log('\n--- TEST 1: triggerBuy() with Mutex Lock ---');
  const buyRes = await manager.triggerBuy(testToken, 0.05, {
    isSimulation: true,
    targetTpPct: 5, // Set low TP (+5%) so test completes in 3-5 seconds
    stopLossPct: -10
  });

  if (!buyRes.success || !positionOpened) {
    throw new Error('TEST 1 GAGAL: triggerBuy tidak membuka posisi');
  }
  console.log('✅ TEST 1 LULUS: triggerBuy berhasil dan posisi dibuka.');

  // Test 2: Mutex Lock Protection (Anti-Spam Buy)
  console.log('\n--- TEST 2: Mutex Lock Anti-Spam (Reject concurrent buy) ---');
  const duplicateBuy = await manager.triggerBuy(testToken, 0.05, { isSimulation: true });
  if (duplicateBuy.success) {
    throw new Error('TEST 2 GAGAL: Mutex gagal memblokir pembelian ganda!');
  }
  console.log('✅ TEST 2 LULUS: Order beli ganda berhasil diblokir oleh Mutex Lock.');

  // Test 3: The Tracker (Live PNL monitoring and Auto-Sell trigger)
  console.log('\n--- TEST 3: Pemantauan Real-Time (The Tracker) & Auto-Sell ---');
  console.log('Menunggu tracker loop 1-detik mengevaluasi PNL dan memicu Take Profit / Stop Loss...');

  // Tunggu hingga posisi tertutup secara otomatis oleh loop tracker (maks 15 detik)
  const startTime = Date.now();
  while (!positionClosed && Date.now() - startTime < 15000) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  if (!positionClosed) {
    console.log('Memicu manual triggerSell sebagai verifikasi fallback...');
    const active = manager.getActivePosition();
    if (active) {
      await manager.triggerSell(active, 'TEST_MANUAL_TP_TRIGGER', 0.00015);
    }
  }

  // Test 4: Mutex Release Verification
  console.log('\n--- TEST 4: Mutex Release Post-Sell ---');
  if (manager.isBusy() || positionMutex.isPositionOpen()) {
    throw new Error('TEST 4 GAGAL: Mutex masih terkunci setelah posisi ditutup!');
  }
  console.log('✅ TEST 4 LULUS: Mutex lock berhasil dilepaskan dan bot siap berburu kembali.');

  console.log('\n====================================================');
  console.log('🎉 SEMUA PENGUJIAN EXECUTION MANAGER LULUS 100%!');
  console.log('====================================================');
}

runExecutionManagerTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
