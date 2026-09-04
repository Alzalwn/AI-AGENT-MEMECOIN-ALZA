import { TokenSignal } from '../types/terminal';

const SAMPLE_NAMES = [
  { symbol: '$GROKNET', name: 'Grok Neural Net', theme: 'ai agent' },
  { symbol: '$MEVBOT', name: 'Solana MEV Hunter', theme: 'solana mev' },
  { symbol: '$SINGUL', name: 'Singularity Core', theme: 'singularity' },
  { symbol: '$SWARM', name: 'Autonomous Agent Swarm', theme: 'agentic' },
  { symbol: '$PEPEAI', name: 'Pepe Cyber Agent', theme: 'ai agent' },
  { symbol: '$DOGEAI', name: 'Doge Quantum Mind', theme: 'neural' },
  { symbol: '$SCAMCOIN', name: 'Free Money Token', theme: 'unrelated meme' },
  { symbol: '$RUGME', name: 'Safe Moon Rocket', theme: 'ponzi' },
  { symbol: '$DEVTRAP', name: 'Honey Pot Protocol', theme: 'trap' }
];

export function generateRandomTokenSignal(): TokenSignal {
  const meta = SAMPLE_NAMES[Math.floor(Math.random() * SAMPLE_NAMES.length)];
  const isTrap = meta.theme === 'trap' || meta.theme === 'ponzi' || meta.theme === 'unrelated meme';

  const randomHash = Math.random().toString(36).substring(2, 8).toUpperCase();
  const mint = `${randomHash}pump...${Math.random().toString(36).substring(2, 6)}`;

  return {
    id: `SIG-${Date.now().toString().slice(-5)}`,
    mint,
    symbol: meta.symbol,
    name: meta.name,
    platform: Math.random() > 0.4 ? 'Pump.fun' : 'Raydium',
    initialLpUsd: isTrap ? Math.floor(Math.random() * 3500) + 1000 : Math.floor(Math.random() * 20000) + 5500,
    burntLiquidityPct: isTrap ? (Math.random() > 0.5 ? 0 : 70) : 100,
    mintAuthorityRevoked: isTrap ? Math.random() > 0.6 : true,
    freezeAuthorityRevoked: isTrap ? Math.random() > 0.5 : true,
    top10HolderPct: isTrap ? Math.floor(Math.random() * 35) + 18 : Math.floor(Math.random() * 10) + 4,
    volumeDelta15s: isTrap ? +(Math.random() * 2 - 2.5).toFixed(2) : +(Math.random() * 8 + 1.2).toFixed(2),
    uniqueBuyersCount: isTrap ? Math.floor(Math.random() * 2) + 1 : Math.floor(Math.random() * 12) + 4,
    narrativeCosineSim: isTrap ? +(Math.random() * 0.4 + 0.3).toFixed(2) : +(Math.random() * 0.14 + 0.86).toFixed(2),
    narrativeTheme: meta.theme,
    priceSol: +(Math.random() * 0.0004 + 0.00001).toFixed(6),
    detectedAt: Date.now()
  };
}
