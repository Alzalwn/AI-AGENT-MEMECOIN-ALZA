import { TokenSignal } from '../types/terminal';

const SAMPLE_NAMES = [
  { symbol: '$BONK', name: 'Bonk Memecoin', theme: 'ai agent', mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263' },
  { symbol: '$WIF', name: 'dogwifhat', theme: 'solana mev', mint: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm' },
  { symbol: '$FARTCOIN', name: 'Fartcoin Terminal', theme: 'singularity', mint: '9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump' },
  { symbol: '$TRUMP', name: 'Official Trump', theme: 'agentic', mint: '6p6xgHyF7AeQHyviSDaiMFFAbUx5unusPxQwg2qypump' },
  { symbol: '$PENGU', name: 'Pudgy Penguins', theme: 'ai agent', mint: '2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv' },
  { symbol: '$GOAT', name: 'Goatseus Maximus', theme: 'neural', mint: 'CzLSujWBLFsSjncfkh59rQDqJgRq6uUEZ3bpddG9pump' },
  { symbol: '$ACT', name: 'Act I : AI Prophecy', theme: 'ai agent', mint: 'GJAFwWjJ3vnTsrQVabjBVK2TYB1YtRCQXRDfNbYarg3B' },
  { symbol: '$POPCAT', name: 'Popcat Solana', theme: 'solana mev', mint: '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr' },
  { symbol: '$GIGA', name: 'GigaChad Memecoin', theme: 'agentic', mint: '63LfDmNb3MQ8mw9MtZ2To9bEA2M71kZUUGq5EHJpump' },
  { symbol: '$MELANIA', name: 'Melania Meme', theme: 'unrelated meme', mint: 'FU1q8vJpZNUrmqsciSjp8bAKKidGsLmouB8CBdf8TKQv' }
];

export function generateRandomTokenSignal(): TokenSignal {
  const meta = SAMPLE_NAMES[Math.floor(Math.random() * SAMPLE_NAMES.length)];
  const isTrap = meta.theme === 'trap' || meta.theme === 'ponzi' || meta.theme === 'unrelated meme';

  const mint = meta.mint;

  const platform = Math.random() > 0.4 ? 'Pump.fun' : 'Raydium';
  const bondingCurveProgress = platform === 'Pump.fun'
    ? Math.floor(Math.random() * 85) + 8
    : 100;
  const isBondingCurveGraduated = platform === 'Raydium' || bondingCurveProgress >= 100;

  const mintAuthorityRevoked = isTrap ? Math.random() > 0.6 : true;
  const freezeAuthorityRevoked = isTrap ? Math.random() > 0.5 : true;
  const top10HolderPct = isTrap ? Math.floor(Math.random() * 35) + 18 : Math.floor(Math.random() * 10) + 4;

  let rugcheckScore: 'GOOD' | 'WARNING' | 'DANGER' = 'GOOD';
  if (!mintAuthorityRevoked || !freezeAuthorityRevoked || top10HolderPct > 20) {
    rugcheckScore = 'DANGER';
  } else if (top10HolderPct > 12) {
    rugcheckScore = 'WARNING';
  }

  const volumeDelta15s = isTrap ? +(Math.random() * 2 - 2.5).toFixed(2) : +(Math.random() * 8 + 1.2).toFixed(2);
  const uniqueBuyersCount = isTrap ? Math.floor(Math.random() * 2) + 1 : Math.floor(Math.random() * 12) + 4;
  const txVelocityPerSec = isTrap ? +(Math.random() * 2 + 0.3).toFixed(1) : +(Math.random() * 14 + 3.5).toFixed(1);
  const buySellRatio = isTrap ? +(Math.random() * 0.8 + 0.3).toFixed(1) : +(Math.random() * 4.5 + 2.0).toFixed(1);
  const smartMoneyCount = isTrap ? 0 : (Math.random() > 0.4 ? Math.floor(Math.random() * 3) + 1 : 0);
  const smartMoneyWallets = smartMoneyCount > 0
    ? ['Alpha Whale #1 (Ansem Clan)', 'Pump.fun 100x Early Sniper'].slice(0, smartMoneyCount)
    : undefined;

  return {
    id: `SIG-${Date.now().toString().slice(-5)}`,
    mint,
    symbol: meta.symbol,
    name: meta.name,
    platform,
    initialLpUsd: isTrap ? Math.floor(Math.random() * 3500) + 1000 : Math.floor(Math.random() * 20000) + 5500,
    burntLiquidityPct: isTrap ? (Math.random() > 0.5 ? 0 : 70) : 100,
    mintAuthorityRevoked,
    freezeAuthorityRevoked,
    top10HolderPct,
    volumeDelta15s,
    uniqueBuyersCount,
    txVelocityPerSec,
    buySellRatio,
    smartMoneyCount,
    smartMoneyWallets,
    narrativeCosineSim: isTrap ? +(Math.random() * 0.4 + 0.3).toFixed(2) : +(Math.random() * 0.14 + 0.86).toFixed(2),
    narrativeTheme: meta.theme,
    priceSol: +(Math.random() * 0.0004 + 0.00001).toFixed(6),
    detectedAt: Date.now(),
    bondingCurveProgress,
    isBondingCurveGraduated,
    rugcheckScore
  };
}
