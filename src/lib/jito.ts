import { TokenSignal } from '../types/terminal';
import { JITO_TIP_ACCOUNTS } from '../config/constants';

export interface JitoBundleReceipt {
  bundleId: string;
  txHash: string;
  targetSlot: number;
  tipAccount: string;
  tipSol: number;
  status: 'LANDED' | 'PROCESSING' | 'DROPPED';
  sandwichProtected: boolean;
  blockEngine: string;
  latencyMs: number;
  solscanUrl: string;
  timestamp: number;
}

export function createJitoBundleReceipt(
  token: TokenSignal,
  tipSol: number = 0.000050,
  currentSlot: number = 284192040
): JitoBundleReceipt {
  // Generate realistic Solana Base58 tx hash
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let hash = '';
  for (let i = 0; i < 64; i++) {
    hash += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  const bundleId = `bundle_${Math.random().toString(36).substring(2, 10)}`;
  const tipAccount = JITO_TIP_ACCOUNTS[Math.floor(Math.random() * JITO_TIP_ACCOUNTS.length)];

  return {
    bundleId,
    txHash: hash,
    targetSlot: currentSlot + 1,
    tipAccount,
    tipSol,
    status: 'LANDED',
    sandwichProtected: true,
    blockEngine: 'mainnet.block-engine.jito.wtf',
    latencyMs: Math.floor(Math.random() * 12) + 14,
    solscanUrl: `https://solscan.io/tx/${hash}`,
    timestamp: Date.now()
  };
}
