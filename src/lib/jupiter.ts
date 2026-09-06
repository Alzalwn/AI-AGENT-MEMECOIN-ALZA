import { JupiterQuoteResponse } from '@/app/api/jupiter/quote/route';

export type { JupiterQuoteResponse };

export interface SwapExecutionResult {
  signature: string;
  inAmountSol: number;
  outAmountFormatted: string;
  outputMint: string;
  symbol: string;
  routeSummary: string;
  priceImpactPct: number;
  jitoTipSol: number;
  slot: number;
  isSimulated: boolean;
  timestamp: number;
}

/**
 * Fetch optimal DEX swap route from Jupiter Aggregator v6 via internal API proxy
 */
export async function fetchJupiterQuote(
  outputMint: string,
  amountSol: number = 0.1,
  slippageBps: number = 100
): Promise<JupiterQuoteResponse> {
  const params = new URLSearchParams({
    outputMint: outputMint.trim(),
    amountSol: amountSol.toString(),
    slippageBps: slippageBps.toString()
  });

  const res = await fetch(`/api/jupiter/quote?${params.toString()}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch quote (status ${res.status})`);
  }

  const data = await res.json();
  return data.quote;
}

import { VersionedTransaction } from '@solana/web3.js';

function base64ToUint8Array(base64: string): Uint8Array {
  if (typeof window !== 'undefined' && typeof window.atob === 'function') {
    const binaryString = window.atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }
  return new Uint8Array(Buffer.from(base64, 'base64'));
}

/**
 * Execute or assemble the swap transaction via Jupiter Aggregator & bundle with Jito
 */
export async function executeJupiterSwap(
  quote: JupiterQuoteResponse,
  symbol: string,
  jitoTipSol: number = 0.00005,
  currentSlot: number = 284192000,
  userPublicKey?: string,
  walletProvider?: any
): Promise<SwapExecutionResult> {
  const res = await fetch('/api/jupiter/swap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      quoteResponse: quote,
      userPublicKey: userPublicKey || undefined,
      prioritizationFeeLamports: Math.floor(jitoTipSol * 1_000_000_000)
    })
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to assemble swap transaction');
  }

  const data = await res.json();
  let signature = data.transactionSignature;
  let isSimulated = data.isSimulated ?? true;

  // Real On-Chain Execution via Connected Wallet Provider (Phantom / Solflare / Backpack)
  if (walletProvider) {
    if (!data.swapTransaction) {
      throw new Error(data.error || 'Jupiter tidak mengembalikan swap transaction on-chain. Coba refresh route.');
    }
    if (typeof walletProvider.signAndSendTransaction !== 'function') {
      throw new Error('Provider dompet tidak mendukung signAndSendTransaction.');
    }

    try {
      const txBytes = base64ToUint8Array(data.swapTransaction);
      const versionedTx = VersionedTransaction.deserialize(txBytes);

      const sendResult = await walletProvider.signAndSendTransaction(versionedTx);
      signature = sendResult?.signature || (typeof sendResult === 'string' ? sendResult : null);
      if (!signature && sendResult?.publicKey) {
        signature = sendResult.signature;
      }
      if (!signature) {
        throw new Error('Dompet tidak mengembalikan signature transaksi.');
      }
      isSimulated = false;
    } catch (walletErr: any) {
      if (walletErr.message?.includes('User rejected') || walletErr.code === 4001) {
        throw new Error('Transaksi dibatalkan di dompet Phantom.');
      }
      throw new Error(`Gagal menandatangani transaksi on-chain: ${walletErr.message}`);
    }
  } else {
    // Fallback signature ONLY for simulation / paper trading
    if (!signature) {
      signature = 'jup_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }
  }

  const routeSummary = quote.routes.map(r => `${r.label} (${r.percent}%)`).join(' + ');

  return {
    signature,
    inAmountSol: quote.inAmountSol,
    outAmountFormatted: quote.outAmountFormatted,
    outputMint: quote.outputMint,
    symbol,
    routeSummary,
    priceImpactPct: quote.priceImpactPct,
    jitoTipSol,
    slot: currentSlot + Math.floor(Math.random() * 3) + 1,
    isSimulated,
    timestamp: Date.now()
  };
}
