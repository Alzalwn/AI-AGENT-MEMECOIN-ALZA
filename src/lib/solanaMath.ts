import { Connection, PublicKey } from '@solana/web3.js';

export const LAMPORTS_PER_SOL = 1_000_000_000; // 10 ** 9

/**
 * Convert raw Lamports to SOL with high floating-point precision.
 */
export function lamportsToSol(lamports: number | string | bigint): number {
  const num = typeof lamports === 'bigint' ? Number(lamports) : Number(lamports);
  if (isNaN(num) || num <= 0) return 0;
  return +(num / LAMPORTS_PER_SOL).toFixed(8);
}

/**
 * Convert SOL to raw Lamports (integer).
 */
export function solToLamports(sol: number): number {
  if (isNaN(sol) || sol <= 0) return 0;
  return Math.floor(sol * LAMPORTS_PER_SOL);
}

/**
 * Parse raw token base units from RPC/Jupiter into human-readable UI tokens.
 * Example: 1,000,000,000 raw units with 6 decimals = 1,000.00 UI tokens.
 * NEVER treat raw units as whole tokens.
 */
export function parseRawTokenUnits(rawAmount: string | number | bigint, decimals: number = 6): number {
  const rawStr = rawAmount.toString().replace(/,/g, '');
  const rawNum = Number(rawStr);
  if (isNaN(rawNum) || rawNum <= 0) return 0;

  const divisor = 10 ** Math.max(0, Math.min(18, decimals));
  return +(rawNum / divisor);
}

/**
 * Convert human-readable UI tokens into raw base units integer string for Jupiter/RPC instructions.
 * Example: 1,000.5 tokens with 6 decimals = "1000500000".
 */
export function toRawTokenUnits(uiAmount: number, decimals: number = 6): string {
  if (isNaN(uiAmount) || uiAmount <= 0) return '0';
  const multiplier = 10 ** Math.max(0, Math.min(18, decimals));
  return BigInt(Math.floor(uiAmount * multiplier)).toString();
}

/**
 * Resolves the true on-chain decimals of a Solana SPL Token Mint.
 * Defaults to 6 decimals (standard for pump.fun & Raydium memecoins).
 */
const decimalsCache = new Map<string, number>();

export async function fetchMintDecimals(
  connection: Connection,
  mintAddress: string,
  fallback: number = 6
): Promise<number> {
  const cleanMint = mintAddress.trim();
  if (decimalsCache.has(cleanMint)) {
    return decimalsCache.get(cleanMint)!;
  }

  try {
    const pubKey = new PublicKey(cleanMint);
    const supplyInfo = await connection.getTokenSupply(pubKey, 'confirmed');
    if (supplyInfo?.value && typeof supplyInfo.value.decimals === 'number') {
      const dec = supplyInfo.value.decimals;
      decimalsCache.set(cleanMint, dec);
      return dec;
    }
  } catch (err: any) {
    console.warn(`[solanaMath] Notice fetching decimals for ${cleanMint}, falling back to ${fallback}:`, err.message);
  }

  decimalsCache.set(cleanMint, fallback);
  return fallback;
}

/**
 * Strict, bounded PnL calculator for Solana memecoin spot trading.
 * Eliminates Lamport decimal multiplier bugs and prevents anomalous billions-of-SOL spikes.
 */
export function calculateSolanaPnl(
  solInvested: number,
  entryPriceSol: number,
  currentPriceSol: number
): {
  pnlPct: number;
  pnlSol: number;
  rMultiplier: number;
} {
  const safeInvest = Math.max(0.0001, solInvested);
  if (entryPriceSol <= 0 || currentPriceSol <= 0) {
    return { pnlPct: 0, pnlSol: 0, rMultiplier: 0 };
  }

  // Percentage change from entry
  const rawPnlPct = ((currentPriceSol - entryPriceSol) / entryPriceSol) * 100;
  // Clamp between -100% (total rug) and +10,000% (100x maximum realistic pump capture)
  const pnlPct = +(Math.max(-100, Math.min(10000, rawPnlPct))).toFixed(2);

  // In Solana spot DEX trading: Realized / Unrealized PnL in SOL is strictly:
  // solInvested * (pnlPct / 100)
  const rawPnlSol = safeInvest * (pnlPct / 100);
  const pnlSol = +(Math.max(-safeInvest, Math.min(safeInvest * 100, rawPnlSol))).toFixed(4);

  // R-Multiple based on 15% risk unit
  const rMultiplier = +(pnlPct / 15).toFixed(2);

  return { pnlPct, pnlSol, rMultiplier };
}
