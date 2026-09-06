export interface TrackedWallet {
  id: string;
  address: string;
  label: string;
  category: 'WHALE' | 'INSIDER_DEV' | 'KOL_SNIPER' | 'EARLY_ACCUMULATOR';
  winRatePct: number;
  totalPnlSol: number;
  totalTradesCount: number;
  avgHoldTimeMin: number;
  isCopyTradingActive: boolean;
  copyMultiplier: number; // e.g. 0.5x, 1.0x, 2.0x of base buy size
  maxSolPerCopy: number;
  addedAt: number;
  isPreset?: boolean;
}

export interface WalletTransactionActivity {
  id: string;
  walletId: string;
  walletAddress: string;
  walletLabel: string;
  tokenMint: string;
  tokenSymbol: string;
  tokenName: string;
  action: 'BUY' | 'SELL';
  amountSol: number;
  tokenAmount: number;
  priceSol: number;
  txSignature: string;
  timestamp: number;
  copyTradeStatus: 'COPIED' | 'SKIPPED' | 'FAILED' | 'PENDING';
  copyTxHash?: string;
  profitEstimatePct?: number;
}

export interface CopyTradingMasterConfig {
  isMasterEnabled: boolean;
  baseBuyAmountSol: number;
  maxSlippagePct: number;
  autoSellWhenWhaleSells: boolean;
  minWhaleBuySol: number;
  maxDailyCopyTrades: number;
  dailyCopyTradesExecuted: number;
  preferredJitoTipSol: number;
}
