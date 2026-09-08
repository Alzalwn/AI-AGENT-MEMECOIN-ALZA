import { TokenSignal } from '../types/terminal';

const SAMPLE_NAMES = [
  { symbol: 'NEURA', name: 'NeuraAgent AI', theme: 'ai agent', mint: 'Neura881Z8B1q7Z9K4mP5Q6Y7Z8W9E0pump99887766' },
  { symbol: 'CLAW', name: 'OpenClaw Swarm', theme: 'agentic', mint: 'CLAW772q9B1q7Z9K4mP5Q6Y7Z8W9E0pump11223344' },
  { symbol: 'DEEP', name: 'DeepSol Agent', theme: 'neural', mint: 'DEEP334m9B1q7Z9K4mP5Q6Y7Z8W9E0pump55667788' },
  { symbol: 'GROKX', name: 'GrokX Engine', theme: 'ai agent', mint: 'GrokX11111111111111111111111111111111111pump' },
  { symbol: 'SOLCAT', name: 'SolCat Micro', theme: 'solana mev', mint: 'CAT111111111111111111111111111111111111pump' },
  { symbol: 'ZEREBRO', name: 'Zerebro AI', theme: 'neural', mint: '8x5VqbHA8D7NkD52uNuS5nnt3PwA8pLD34ymbpspump' },
  { symbol: 'SWARMS', name: 'Swarms Autonomous', theme: 'ai agent', mint: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU' },
  { symbol: 'ELIZA', name: 'Eliza Framework', theme: 'agentic', mint: 'DuA1qY4XmC41Z1YVq1H4R4mH8Q4mP5Q6Y7Z8W9E0pump' }
];

export function generateRandomTokenSignal(): TokenSignal {
  const meta = SAMPLE_NAMES[Math.floor(Math.random() * SAMPLE_NAMES.length)];
  const isTrap = meta.theme === 'trap' || meta.theme === 'ponzi' || meta.theme === 'unrelated meme';

  const mint = meta.mint;

  const platform = 'Pump.fun';
  const bondingCurveProgress = Math.floor(Math.random() * 28) + 5;
  const isBondingCurveGraduated = false;

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
    initialLpUsd: isTrap ? Math.floor(Math.random() * 2000) + 800 : Math.floor(Math.random() * 2400) + 1200,
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
