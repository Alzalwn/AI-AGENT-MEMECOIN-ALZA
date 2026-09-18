/**
 * Unit Test Skrip: Gatekeeper TradFi & Pre-Market Blacklist
 * Memvalidasi keakuratan sistem pemblokiran instrumen TradFi, ETF, dan Pre-Market,
 * serta memastikan koin kripto asli (seperti JUP, SUPER, BTC, ETH, SOL) tetap aman dan tidak salah blokir.
 */

import assert from 'assert';
import { isTradFiOrEtfBlacklisted } from '../src/lib/tradfiBlacklist';
import { validateFuturesEntryGate, formatFuturesPrice } from '../src/engine/futuresSignalEngine';
import { BinanceFuturesSignal } from '../src/types/futures';

async function runBlacklistTests() {
  console.log('====================================================');
  console.log('🛡️ RUNNING TEST: GATEKEEPER TRADFI & ETF BLACKLIST');
  console.log('====================================================\n');

  // TEST 1: KORU & CRCL (Kasus Spesifik yang Menyebabkan 3x SL)
  console.log('--- TEST 1: Validasi Blacklist KORU & CRCL ---');
  const koruCheck1 = isTradFiOrEtfBlacklisted('KORU');
  const koruCheck2 = isTradFiOrEtfBlacklisted('KORUUSDT');
  const crclCheck1 = isTradFiOrEtfBlacklisted('CRCL');
  const crclCheck2 = isTradFiOrEtfBlacklisted('CRCLUSDT');

  assert.strictEqual(koruCheck1.isBlacklisted, true, 'KORU harus diblokir');
  assert.strictEqual(koruCheck2.isBlacklisted, true, 'KORUUSDT harus diblokir');
  assert.strictEqual(crclCheck1.isBlacklisted, true, 'CRCL harus diblokir');
  assert.strictEqual(crclCheck2.isBlacklisted, true, 'CRCLUSDT harus diblokir');
  console.log('✅ PASS: KORU dan CRCL berhasil dicegat 100% oleh Gatekeeper.');
  console.log(`   Pesan Veto: "${koruCheck2.reason}"\n`);

  // TEST 2: ETF & Indeks Bursa Tradisional (SPY, QQQ, TLT, SOXL, NVDA, dll)
  console.log('--- TEST 2: Validasi TradFi Equity & Index ETF ---');
  const tradFiTickers = ['SPY', 'SPYUSDT', 'QQQ', 'QQQUSDT', 'TLTUSDT', 'SOXLUSDT', 'NVDAUSDT', 'TSLAUSDT'];
  for (const t of tradFiTickers) {
    const res = isTradFiOrEtfBlacklisted(t);
    assert.strictEqual(res.isBlacklisted, true, `${t} harus diblokir sebagai TradFi`);
  }
  console.log(`✅ PASS: ${tradFiTickers.length} instrumen ETF & saham TradFi berhasil diblokir.\n`);

  // TEST 3: Leveraged Tokens (BTCUP, ETHDOWN, SOLBULL, XRPBEAR, BTC3L, dll)
  console.log('--- TEST 3: Validasi Regex Leveraged Tokens ---');
  const leveragedTokens = ['BTCUPUSDT', 'ETHDOWNUSDT', 'SOLBULLUSDT', 'XRPBEARUSDT', 'BTC3LUSDT', 'ETH3SUSDT'];
  for (const t of leveragedTokens) {
    const res = isTradFiOrEtfBlacklisted(t);
    assert.strictEqual(res.isBlacklisted, true, `${t} harus diblokir sebagai Leveraged Token`);
  }
  console.log(`✅ PASS: ${leveragedTokens.length} token leverage terdeteksi oleh regex ketat.\n`);

  // TEST 4: Pre-Market Pattern Tokens
  console.log('--- TEST 4: Validasi Deteksi Pola Pre-Market ---');
  const preMarketTokens = ['PRE_TOKEN', 'NEWCOIN_PRE', 'ALPHAPREUSDT'];
  for (const t of preMarketTokens) {
    const res = isTradFiOrEtfBlacklisted(t);
    assert.strictEqual(res.isBlacklisted, true, `${t} harus diblokir sebagai Pre-Market`);
  }
  console.log(`✅ PASS: ${preMarketTokens.length} instrumen Pre-Market berhasil dicegat.\n`);

  // TEST 5: Proteksi Whitelist Kripto Murni (JUP, SUPER, BTC, ETH, SOL, PEPE, dll)
  console.log('--- TEST 5: Proteksi Presisi (Whitelist Kripto Murni - Jangan False Positive) ---');
  const legitimateCrypto = ['JUP', 'JUPUSDT', 'SUPER', 'SUPERUSDT', 'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'DOGEUSDT', 'PEPEUSDT'];
  for (const coin of legitimateCrypto) {
    const res = isTradFiOrEtfBlacklisted(coin);
    assert.strictEqual(res.isBlacklisted, false, `${coin} TIDAK BOLEH diblokir!`);
  }
  console.log(`✅ PASS: Token sah seperti JUP dan SUPER TIDAK terblokir oleh regex UP/DOWN.\n`);

  // TEST 6: Integrasi validateFuturesEntryGate
  console.log('--- TEST 6: Integrasi validateFuturesEntryGate ---');
  const mockBlacklistedSignal: BinanceFuturesSignal = {
    id: 'test-koru',
    symbol: 'KORUUSDT',
    baseAsset: 'KORU',
    quoteAsset: 'USDT',
    direction: 'LONG',
    signalTier: 'HIGH',
    strategy: 'BREAKOUT_MOMENTUM',
    strategyLabel: '🚀 Breakout Momentum',
    entryZone: { low: 10, high: 10.2, current: 10.1, label: '$10 - $10.2' },
    targets: {
      tp1: { price: 10.5, gainPct: 4, isHit: false, eta: '1h' },
      tp2: { price: 11.0, gainPct: 9, isHit: false, eta: '3h' },
      tp3: { price: 12.0, gainPct: 19, isHit: false, eta: '1d' },
    },
    stopLoss: { price: 9.8, lossPct: -2.0, label: '$9.8 (-2%)', isHit: false },
    riskRewardRatio: 2.0,
    leverage: {
      safe: { range: '3x - 5x', multiplier: 3, mode: 'ISOLATED', description: '' },
      scalp: { range: '5x - 10x', multiplier: 5, mode: 'ISOLATED', description: '' },
    },
    timeframe: '15m',
    derivativesData: {
      fundingRate: 0.0001,
      fundingRatePct: 0.01,
      nextFundingTime: Date.now() + 3600000,
      openInterestUsd: 100000,
      openInterestChange24h: 1,
      longShortRatio: 1.0,
      volume24hUsd: 5000000, // Likuiditas tipis
      priceChange24hPct: 2.5,
      high24h: 10.5,
      low24h: 9.5,
    },
    agentConsensus: {
      trendAgent: { pass: true, score: 80, reason: '' },
      volatilityAgent: { pass: true, score: 80, reason: '' },
      derivativesAgent: { pass: true, score: 80, reason: '' },
      orderbookAgent: { pass: true, score: 80, reason: '' },
    },
    overallScore: 82,
    rationale: 'Test',
    status: 'ACTIVE',
    binanceUrl: '',
    tradingViewSymbol: '',
    timestamp: Date.now(),
  };

  const gateResult = validateFuturesEntryGate(mockBlacklistedSignal);
  assert.strictEqual(gateResult.isRestricted, true, 'KORUUSDT harus dinyatakan isRestricted === true');
  assert.ok(
    gateResult.warnings.some((w) => w.includes('GATEKEEPER BLACKLIST') || w.includes('KORUUSDT')),
    'Peringatan harus menyertakan Gatekeeper Blacklist'
  );
  console.log('✅ PASS: validateFuturesEntryGate berhasil memberlakukan hard restriction pada koin blacklist.\n');

  console.log('====================================================');
  console.log('🎉 SEMUA 6 TEST GATEKEEPER BLACKLIST BERHASIL 100%!');
  console.log('====================================================');
}

runBlacklistTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
