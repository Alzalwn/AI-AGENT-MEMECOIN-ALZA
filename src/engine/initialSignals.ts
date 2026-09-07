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
    priceSol: 0.001850,
    detectedAt: now - 300000,
    smartMoneyCount: 3,
    smartMoneyWallets: ['Alpha Whale #1', 'Top 50 PnL Sniper', 'KOL Fund'],
    bondingCurveProgress: 100,
    isBondingCurveGraduated: true,
    rugcheckScore: 'GOOD'
  };

  const actMoonshot: MoonshotVerdict = {
    tokenMint: actToken.mint,
    symbol: actToken.symbol,
    moonshotScore: 94,
    tier: 'SUPERNOVA',
    isApproved: true,
    pumpThesis: 'AI Swarm Narrative breakout with high order-flow velocity and smart-money inflows.',
    pillars: defaultPillars,
    timestamp: now - 300000
  };

  const actSignal = computeSignal({
    token: actToken,
    moonshot: actMoonshot,
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
    priceSol: 0.000720,
    detectedAt: now - 600000,
    smartMoneyCount: 1,
    smartMoneyWallets: ['Pump.fun 100x Early Sniper'],
    bondingCurveProgress: 88,
    isBondingCurveGraduated: false,
    rugcheckScore: 'GOOD'
  };

  const fartMoonshot: MoonshotVerdict = {
    tokenMint: fartToken.mint,
    symbol: fartToken.symbol,
    moonshotScore: 86,
    tier: 'HIGH_POTENTIAL',
    isApproved: true,
    pumpThesis: 'Approaching bonding curve graduation with accelerated retail velocity.',
    pillars: defaultPillars,
    timestamp: now - 600000
  };

  const fartSignal = computeSignal({
    token: fartToken,
    moonshot: fartMoonshot,
    grokViralityScore: 0.84,
    solRateUsd: 140
  });

  // 3. GOAT (Historical TP3 HIT Moonshot)
  const goatToken: TokenSignal = {
    id: 'SIG-SEED-03',
    mint: 'CzLSujWBLFsSjncfkh59rQDqJgRq6uUEZ3bpddG9pump',
    symbol: 'GOAT',
    name: 'Goatseus Maximus',
    platform: 'Raydium',
    initialLpUsd: 250000,
    burntLiquidityPct: 100,
    mintAuthorityRevoked: true,
    freezeAuthorityRevoked: true,
    top10HolderPct: 8.5,
    creatorBalancePct: 0.2,
    narrativeCosineSim: 0.98,
    narrativeTheme: 'Truth Terminal AI',
    volumeDelta15s: 45.2,
    uniqueBuyersCount: 65,
    txVelocityPerSec: 22.1,
    buySellRatio: 6.8,
    priceSol: 0.004200,
    detectedAt: now - 3600000 * 4,
    smartMoneyCount: 4,
    bondingCurveProgress: 100,
    isBondingCurveGraduated: true,
    rugcheckScore: 'GOOD'
  };

  const goatMoonshot: MoonshotVerdict = {
    tokenMint: goatToken.mint,
    symbol: goatToken.symbol,
    moonshotScore: 98,
    tier: 'SUPERNOVA',
    isApproved: true,
    pumpThesis: 'Historical mega runner, benchmark token for AI narrative.',
    pillars: defaultPillars,
    timestamp: now - 3600000 * 4
  };

  const goatSignal: TradingSignal = {
    ...computeSignal({
      token: goatToken,
      moonshot: goatMoonshot,
      grokViralityScore: 0.98,
      solRateUsd: 140
    }),
    status: 'TP3_HIT',
    timestamp: now - 3600000 * 4,
    performance: {
      peakGainPct: 340.5,
      peakPriceSol: 0.0142,
      bestTPHit: 'TP3',
      resolvedAt: now - 3600000 * 2,
      actualDurationMin: 45.2
    }
  };

  // 4. PENGU (Historical TP1 HIT)
  const penguToken: TokenSignal = {
    id: 'SIG-SEED-04',
    mint: '2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv',
    symbol: 'PENGU',
    name: 'Pudgy Penguins',
    platform: 'Raydium',
    initialLpUsd: 180000,
    burntLiquidityPct: 100,
    mintAuthorityRevoked: true,
    freezeAuthorityRevoked: true,
    top10HolderPct: 12.0,
    creatorBalancePct: 0.5,
    narrativeCosineSim: 0.82,
    narrativeTheme: 'NFT Brand Ecosystem',
    volumeDelta15s: 11.0,
    uniqueBuyersCount: 19,
    txVelocityPerSec: 8.5,
    buySellRatio: 2.8,
    priceSol: 0.000310,
    detectedAt: now - 3600000 * 2,
    smartMoneyCount: 2,
    bondingCurveProgress: 100,
    isBondingCurveGraduated: true,
    rugcheckScore: 'GOOD'
  };

  const penguMoonshot: MoonshotVerdict = {
    tokenMint: penguToken.mint,
    symbol: penguToken.symbol,
    moonshotScore: 82,
    tier: 'HIGH_POTENTIAL',
    isApproved: true,
    pumpThesis: 'Ecosystem brand meme with steady liquidity and volume.',
    pillars: defaultPillars,
    timestamp: now - 3600000 * 2
  };

  const penguSignal: TradingSignal = {
    ...computeSignal({
      token: penguToken,
      moonshot: penguMoonshot,
      grokViralityScore: 0.80,
      solRateUsd: 140
    }),
    status: 'TP1_HIT',
    timestamp: now - 3600000 * 2,
    performance: {
      peakGainPct: 42.1,
      peakPriceSol: 0.00044,
      bestTPHit: 'TP1',
      resolvedAt: now - 3600000,
      actualDurationMin: 18.5
    }
  };

  return {
    activeSignals: [actSignal, fartSignal],
    historySignals: [goatSignal, penguSignal]
  };
}
