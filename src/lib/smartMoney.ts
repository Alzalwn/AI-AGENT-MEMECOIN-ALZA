import { TrackedWallet, WalletTransactionActivity, CopyTradingMasterConfig } from '../types/smartMoney';
import { createJitoBundleReceipt } from './jito';

export const DEFAULT_TRACKED_WALLETS: TrackedWallet[] = [
  {
    id: 'wallet-whale-1',
    address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    label: 'Alpha Whale #1 (Ansem Clan)',
    category: 'WHALE',
    winRatePct: 78.4,
    totalPnlSol: 142.8,
    totalTradesCount: 312,
    avgHoldTimeMin: 14,
    isCopyTradingActive: true,
    copyMultiplier: 1.0,
    maxSolPerCopy: 0.5,
    addedAt: Date.now() - 86400000 * 12,
    isPreset: true
  },
  {
    id: 'wallet-insider-2',
    address: '5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1',
    label: 'Pump.fun 100x Early Sniper',
    category: 'INSIDER_DEV',
    winRatePct: 86.2,
    totalPnlSol: 295.4,
    totalTradesCount: 184,
    avgHoldTimeMin: 6,
    isCopyTradingActive: true,
    copyMultiplier: 0.8,
    maxSolPerCopy: 0.4,
    addedAt: Date.now() - 86400000 * 8,
    isPreset: true
  },
  {
    id: 'wallet-kol-3',
    address: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM',
    label: 'Raydium Multi-Hop MEV Bot',
    category: 'KOL_SNIPER',
    winRatePct: 71.9,
    totalPnlSol: 88.5,
    totalTradesCount: 520,
    avgHoldTimeMin: 3,
    isCopyTradingActive: false,
    copyMultiplier: 0.5,
    maxSolPerCopy: 0.25,
    addedAt: Date.now() - 86400000 * 5,
    isPreset: true
  },
  {
    id: 'wallet-early-4',
    address: 'GThUX1Atko4tqhN2NaiTazWSeFWMuiUvfFnyJyUghFMJ',
    label: 'Solana Cult Meta Accumulator',
    category: 'EARLY_ACCUMULATOR',
    winRatePct: 81.0,
    totalPnlSol: 180.2,
    totalTradesCount: 94,
    avgHoldTimeMin: 45,
    isCopyTradingActive: true,
    copyMultiplier: 1.2,
    maxSolPerCopy: 0.6,
    addedAt: Date.now() - 86400000 * 3,
    isPreset: true
  }
];

export const DEFAULT_COPY_CONFIG: CopyTradingMasterConfig = {
  isMasterEnabled: true,
  baseBuyAmountSol: 0.25,
  maxSlippagePct: 2.5,
  autoSellWhenWhaleSells: true,
  minWhaleBuySol: 0.5,
  maxDailyCopyTrades: 10,
  dailyCopyTradesExecuted: 2,
  preferredJitoTipSol: 0.001
};

export function getTrackedWallets(): TrackedWallet[] {
  if (typeof window === 'undefined') return DEFAULT_TRACKED_WALLETS;
  try {
    const saved = localStorage.getItem('GT_TRACKED_WALLETS');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.warn('Failed to parse tracked wallets from storage:', err);
  }
  return DEFAULT_TRACKED_WALLETS;
}

export function saveTrackedWallets(wallets: TrackedWallet[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('GT_TRACKED_WALLETS', JSON.stringify(wallets));
  } catch (err) {
    console.warn('Failed to save tracked wallets to storage:', err);
  }
}

export function getCopyTradeMasterConfig(): CopyTradingMasterConfig {
  if (typeof window === 'undefined') return DEFAULT_COPY_CONFIG;
  try {
    const saved = localStorage.getItem('GT_COPY_TRADE_CONFIG');
    if (saved) {
      return { ...DEFAULT_COPY_CONFIG, ...JSON.parse(saved) };
    }
  } catch (err) {
    console.warn('Failed to parse copy trade config:', err);
  }
  return DEFAULT_COPY_CONFIG;
}

export function saveCopyTradeMasterConfig(cfg: CopyTradingMasterConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('GT_COPY_TRADE_CONFIG', JSON.stringify(cfg));
  } catch (err) {
    console.warn('Failed to save copy trade config:', err);
  }
}

const SAMPLE_TOKENS = [
  { symbol: '$TRUMP', name: 'Official Trump', mint: '6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN' },
  { symbol: '$FARTCOIN', name: 'Fartcoin AI', mint: '9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump' },
  { symbol: '$GIGA', name: 'GigaChad', mint: '63LfDmNb3MQ8mw9MtZ2To9bEA2M71kZUUGq5RJ61pump' },
  { symbol: '$AI16Z', name: 'ai16z Marc', mint: 'HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC' },
  { symbol: '$CHILLGUY', name: 'Just a Chill Guy', mint: 'Df6yfrKC8kZE3KNkrHERKzAetSxbrWeniQfyJY4Jpump' },
  { symbol: '$PENGU', name: 'Pudgy Penguins', mint: '2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv' }
];

export function generateMockWhaleActivity(wallets: TrackedWallet[]): WalletTransactionActivity {
  const activeWallets = wallets.filter(w => w.isCopyTradingActive);
  const selectedWallet = activeWallets.length > 0 && Math.random() > 0.3
    ? activeWallets[Math.floor(Math.random() * activeWallets.length)]
    : wallets[Math.floor(Math.random() * wallets.length)];

  const selectedToken = SAMPLE_TOKENS[Math.floor(Math.random() * SAMPLE_TOKENS.length)];
  const isBuy = Math.random() > 0.35;
  const amountSol = +(0.5 + Math.random() * 4.5).toFixed(2);
  const priceSol = +(0.000015 + Math.random() * 0.00012).toFixed(8);
  const tokenAmount = Math.round(amountSol / priceSol);

  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let txSignature = '';
  for (let i = 0; i < 64; i++) {
    txSignature += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const isCopied = isBuy && selectedWallet.isCopyTradingActive;

  return {
    id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    walletId: selectedWallet.id,
    walletAddress: selectedWallet.address,
    walletLabel: selectedWallet.label,
    tokenMint: selectedToken.mint,
    tokenSymbol: selectedToken.symbol,
    tokenName: selectedToken.name,
    action: isBuy ? 'BUY' : 'SELL',
    amountSol,
    tokenAmount,
    priceSol,
    txSignature,
    timestamp: Date.now(),
    copyTradeStatus: isCopied ? 'COPIED' : 'SKIPPED',
    copyTxHash: isCopied ? `jito_copy_${txSignature.slice(0, 16)}` : undefined,
    profitEstimatePct: !isBuy ? +(15 + Math.random() * 85).toFixed(1) : undefined
  };
}
