import { TradingSignal } from '../types/signal';
import { computeSignal } from '../lib/signalCalculator';
import { TokenSignal, MoonshotVerdict, MoonshotPillars } from '../types/terminal';

const defaultPillars: MoonshotPillars = {
  orderFlow: { score: 28, txVelocityPerSec: 12.4, buySellRatio: 4.2, uniqueBuyersCount: 28, status: 'EXPLOSIVE' },
  distribution: { score: 22, top10HolderPct: 11.4, isBundlingDetected: false, status: 'ORGANIC' },
  smartMoney: { score: 24, detectedCount: 3, walletLabels: ['Alpha Whale #1', 'KOL Fund'], status: 'ALPHA_WHALE_IN' },
  security: { score: 20, mintRevoked: true, freezeRevoked: true, lpBurntPct: 100, isHoneypot: false, isAbsoluteSafe: true }
};

export function getInitialSeedSignals(): { activeSignals: TradingSignal[]; historySignals: TradingSignal[] } {
  const now = Date.now();

  // ─────────────────────────────────────────────────────────────
  // ACTIVE SIGNALS (Live Being Monitored)
  // ─────────────────────────────────────────────────────────────

  // 1. ACT (Supernova Active)
  const actToken: TokenSignal = {
    id: 'SIG-SEED-01',
    mint: 'GJAFwWjJ3vnTsrQVabjBVK2TYB1YtRCQXRDfNbYarg3B',
    symbol: 'ACT',
    name: 'Act I : AI Prophecy',
    platform: 'Raydium',
    initialLpUsd: 145000,
    burntLiquidityPct: 100,
    mintAuthorityRevoked: true,
    freezeAuthorityRevoked: true,
    top10HolderPct: 11.4,
    creatorBalancePct: 0.8,
    narrativeCosineSim: 0.94,
    narrativeTheme: 'AI Agent Swarm',
    volumeDelta15s: 14.8,
    uniqueBuyersCount: 28,
    txVelocityPerSec: 12.4,
    buySellRatio: 4.2,
    priceSol: 0.00185,
    detectedAt: now - 180000,
    smartMoneyCount: 3,
    smartMoneyWallets: ['Alpha Whale #1', 'Top 50 PnL Sniper', 'KOL Fund'],
    bondingCurveProgress: 100,
    isBondingCurveGraduated: true,
    rugcheckScore: 'GOOD'
  };

  const actSignal = computeSignal({
    token: actToken,
    moonshot: {
      tokenMint: actToken.mint,
      symbol: actToken.symbol,
      moonshotScore: 94,
      tier: 'SUPERNOVA',
      isApproved: true,
      pumpThesis: 'AI Swarm Narrative breakout with high order-flow velocity and smart-money inflows.',
      pillars: defaultPillars,
      timestamp: now - 180000
    },
    grokViralityScore: 0.92,
    solRateUsd: 140
  });

  // 2. FARTCOIN (High Potential Active)
  const fartToken: TokenSignal = {
    id: 'SIG-SEED-02',
    mint: '9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump',
    symbol: 'FARTCOIN',
    name: 'Fartcoin Terminal',
    platform: 'Pump.fun',
    initialLpUsd: 62000,
    burntLiquidityPct: 98,
    mintAuthorityRevoked: true,
    freezeAuthorityRevoked: true,
    top10HolderPct: 14.2,
    creatorBalancePct: 1.2,
    narrativeCosineSim: 0.86,
    narrativeTheme: 'Singularity Meme',
    volumeDelta15s: 8.4,
    uniqueBuyersCount: 16,
    txVelocityPerSec: 7.8,
    buySellRatio: 3.1,
    priceSol: 0.00072,
    detectedAt: now - 420000,
    smartMoneyCount: 1,
    smartMoneyWallets: ['Pump.fun 100x Early Sniper'],
    bondingCurveProgress: 88,
    isBondingCurveGraduated: false,
    rugcheckScore: 'GOOD'
  };

  const fartSignal = computeSignal({
    token: fartToken,
    moonshot: {
      tokenMint: fartToken.mint,
      symbol: fartToken.symbol,
      moonshotScore: 86,
      tier: 'HIGH_POTENTIAL',
      isApproved: true,
      pumpThesis: 'Approaching bonding curve graduation with accelerated retail velocity.',
      pillars: defaultPillars,
      timestamp: now - 420000
    },
    grokViralityScore: 0.84,
    solRateUsd: 140
  });

  // 3. BONK (Supernova Active)
  const bonkToken: TokenSignal = {
    id: 'SIG-SEED-03',
    mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    symbol: 'BONK',
    name: 'Bonk Doge Breakout',
    platform: 'Raydium',
    initialLpUsd: 320000,
    burntLiquidityPct: 100,
    mintAuthorityRevoked: true,
    freezeAuthorityRevoked: true,
    top10HolderPct: 9.8,
    creatorBalancePct: 0.3,
    narrativeCosineSim: 0.95,
    narrativeTheme: 'Solana Ecosystem OG Meme',
    volumeDelta15s: 22.5,
    uniqueBuyersCount: 45,
    txVelocityPerSec: 18.2,
    buySellRatio: 4.8,
    priceSol: 0.00021,
    detectedAt: now - 600000,
    smartMoneyCount: 4,
    smartMoneyWallets: ['Solana Whale 0x9a', 'Wintermute Alpha'],
    bondingCurveProgress: 100,
    isBondingCurveGraduated: true,
    rugcheckScore: 'GOOD'
  };

  const bonkSignal = computeSignal({
    token: bonkToken,
    moonshot: {
      tokenMint: bonkToken.mint,
      symbol: bonkToken.symbol,
      moonshotScore: 96,
      tier: 'SUPERNOVA',
      isApproved: true,
      pumpThesis: 'Major breakout volume accumulation from smart money desks.',
      pillars: defaultPillars,
      timestamp: now - 600000
    },
    grokViralityScore: 0.96,
    solRateUsd: 140
  });

  // 4. GIGA (Active)
  const gigaToken: TokenSignal = {
    id: 'SIG-SEED-04',
    mint: '63LfDmNb3MQ8mw9MtZ2To9bEA2M71kZUUGq5EHJpump',
    symbol: 'GIGA',
    name: 'GigaChad Movement',
    platform: 'Raydium',
    initialLpUsd: 95000,
    burntLiquidityPct: 100,
    mintAuthorityRevoked: true,
    freezeAuthorityRevoked: true,
    top10HolderPct: 13.5,
    creatorBalancePct: 0.5,
    narrativeCosineSim: 0.88,
    narrativeTheme: 'Cult Fitness Meme',
    volumeDelta15s: 11.2,
    uniqueBuyersCount: 22,
    txVelocityPerSec: 9.6,
    buySellRatio: 3.5,
    priceSol: 0.000356,
    detectedAt: now - 900000,
    smartMoneyCount: 2,
    smartMoneyWallets: ['Alpha Whale Chad'],
    bondingCurveProgress: 100,
    isBondingCurveGraduated: true,
    rugcheckScore: 'GOOD'
  };

  const gigaSignal = computeSignal({
    token: gigaToken,
    moonshot: {
      tokenMint: gigaToken.mint,
      symbol: gigaToken.symbol,
      moonshotScore: 88,
      tier: 'HIGH_POTENTIAL',
      isApproved: true,
      pumpThesis: 'Strong community engagement with healthy liquidity floor.',
      pillars: defaultPillars,
      timestamp: now - 900000
    },
    grokViralityScore: 0.87,
    solRateUsd: 140
  });

  // ─────────────────────────────────────────────────────────────
  // HISTORICAL SIGNALS (12 Wins / 3 Losses = 80.0% Win Rate)
  // ─────────────────────────────────────────────────────────────
  const helperHistoricalSignal = (
    id: string,
    mint: string,
    symbol: string,
    name: string,
    priceSol: number,
    tier: 'SUPERNOVA' | 'HIGH_POTENTIAL',
    status: 'TP1_HIT' | 'TP2_HIT' | 'TP3_HIT' | 'SL_HIT',
    gainPct: number,
    offsetHours: number
  ): TradingSignal => {
    const t: TokenSignal = {
      id,
      mint,
      symbol,
      name,
      platform: 'Raydium',
      initialLpUsd: 100000,
      burntLiquidityPct: 100,
      mintAuthorityRevoked: true,
      freezeAuthorityRevoked: true,
      top10HolderPct: 12.0,
      creatorBalancePct: 0.5,
      narrativeCosineSim: tier === 'SUPERNOVA' ? 0.94 : 0.85,
      narrativeTheme: 'AI / Solana Meme Breakout',
      volumeDelta15s: 12.0,
      uniqueBuyersCount: 25,
      txVelocityPerSec: 10.0,
      buySellRatio: status === 'SL_HIT' ? 1.2 : 3.8,
      priceSol,
      detectedAt: now - offsetHours * 3600000,
      smartMoneyCount: status === 'SL_HIT' ? 1 : 3,
      bondingCurveProgress: 100,
      isBondingCurveGraduated: true,
      rugcheckScore: 'GOOD'
    };

    const base = computeSignal({
      token: t,
      moonshot: {
        tokenMint: mint,
        symbol,
        moonshotScore: tier === 'SUPERNOVA' ? 95 : 85,
        tier,
        isApproved: true,
        pumpThesis: 'Historical verified signal with full consensus.',
        pillars: defaultPillars,
        timestamp: now - offsetHours * 3600000
      },
      grokViralityScore: tier === 'SUPERNOVA' ? 0.92 : 0.84,
      solRateUsd: 140
    });

    return {
      ...base,
      status,
      timestamp: now - offsetHours * 3600000,
      performance: {
        peakGainPct: gainPct,
        peakPriceSol: +(priceSol * (1 + gainPct / 100)).toFixed(8),
        bestTPHit: status === 'TP3_HIT' ? 'TP3' : status === 'TP2_HIT' ? 'TP2' : status === 'TP1_HIT' ? 'TP1' : status === 'SL_HIT' ? 'SL' : 'NONE',
        resolvedAt: now - (offsetHours - 1) * 3600000,
        actualDurationMin: Math.round(15 + Math.random() * 30)
      }
    };
  };

  const historySignals: TradingSignal[] = [
    // 12 WINS
    helperHistoricalSignal('H-01', 'CzLSujWBLFsSjncfkh59rQDqJgRq6uUEZ3bpddG9pump', 'GOAT', 'Goatseus Maximus', 0.0042, 'SUPERNOVA', 'TP3_HIT', 340.5, 3),
    helperHistoricalSignal('H-02', '2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv', 'PENGU', 'Pudgy Penguins', 0.00031, 'HIGH_POTENTIAL', 'TP1_HIT', 52.4, 5),
    helperHistoricalSignal('H-03', 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', 'WIF', 'dogwifhat', 0.0021, 'SUPERNOVA', 'TP2_HIT', 115.0, 7),
    helperHistoricalSignal('H-04', 'ED5nyyWEZyPPokBSWWBm34PMECwWAUks6BaST42PB7i', 'MOODENG', 'Moo Deng Baby Hippo', 0.00115, 'SUPERNOVA', 'TP3_HIT', 285.0, 9),
    helperHistoricalSignal('H-05', '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr', 'POPCAT', 'Popcat Solana', 0.0034, 'HIGH_POTENTIAL', 'TP1_HIT', 58.2, 12),
    helperHistoricalSignal('H-06', 'Df6yfrKC8kZE3KNsqtPGXPWh5nEdwULshrMmR3p2pump', 'CHILLGUY', 'Just a Chill Guy', 0.00085, 'HIGH_POTENTIAL', 'TP2_HIT', 108.5, 14),
    helperHistoricalSignal('H-07', 'J3NKxxXZcnNiMjKw9hzn2C8D2PCcjLHJFaMFGbjCpump', 'SPX', 'SPX6900 Token', 0.00142, 'HIGH_POTENTIAL', 'TP1_HIT', 54.0, 16),
    helperHistoricalSignal('H-08', '8x5VqbHA8D7NkD52uNuS5nnt3PwA8pLD34ymbpspump', 'ZEREBRO', 'Zerebro AI Agent', 0.0019, 'SUPERNOVA', 'TP3_HIT', 312.0, 18),
    helperHistoricalSignal('H-09', 'HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC', 'AI16Z', 'ai16z Marc Venture', 0.0028, 'SUPERNOVA', 'TP2_HIT', 125.0, 21),
    helperHistoricalSignal('H-10', 'KENJSUYLASHGxWnyh52ch5T32CgWDt76wn92VU3Epump', 'GRIFFAIN', 'Griffain Agent', 0.00045, 'HIGH_POTENTIAL', 'TP1_HIT', 49.5, 24),
    helperHistoricalSignal('H-11', '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU', 'SWARMS', 'Swarms Autonomous', 0.00062, 'HIGH_POTENTIAL', 'TP1_HIT', 53.8, 28),
    helperHistoricalSignal('H-12', 'DuA1qY4XmC41Z1YVq1H4R4mH8Q4mP5Q6Y7Z8W9E0pump', 'ELIZA', 'Eliza AI Protocol', 0.00175, 'SUPERNOVA', 'TP2_HIT', 112.0, 32),

    // 3 LOSSES (Controlled Stop Loss)
    helperHistoricalSignal('H-13', 'SLOTH11111111111111111111111111111111111111', 'SLOTH', 'Slothana Slow', 0.00015, 'HIGH_POTENTIAL', 'SL_HIT', -20.0, 10),
    helperHistoricalSignal('H-14', 'DOGS111111111111111111111111111111111111111', 'DOGS', 'Dogs Community', 0.00018, 'HIGH_POTENTIAL', 'SL_HIT', -20.0, 20),
    helperHistoricalSignal('H-15', 'TRAP111111111111111111111111111111111111111', 'TRAP', 'Trap Meme Pull', 0.00009, 'HIGH_POTENTIAL', 'SL_HIT', -20.0, 30)
  ];

  return {
    activeSignals: [actSignal, fartSignal, bonkSignal, gigaSignal],
    historySignals
  };
}
