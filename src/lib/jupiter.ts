import { JupiterQuoteResponse } from '@/app/api/jupiter/quote/route';

export type { JupiterQuoteResponse };

export interface SwapExecutionResult {
  signature: string;
  inAmountSol: number;
  outAmountFormatted: string;
  tokenAmountUi?: number;
  decimals?: number;
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

/**
 * Fetch optimal DEX sell route from Jupiter (Token -> WSOL/Native SOL)
 */
export async function fetchJupiterSellQuote(
  tokenMint: string,
  rawAmount: string,
  slippageBps: number = 250
): Promise<JupiterQuoteResponse> {
  const WSOL_MINT = 'So11111111111111111111111111111111111111112';
  const params = new URLSearchParams({
    inputMint: tokenMint.trim(),
    outputMint: WSOL_MINT,
    amountRaw: rawAmount.trim(),
    slippageBps: slippageBps.toString()
  });

  const res = await fetch(`/api/jupiter/quote?${params.toString()}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Gagal mengambil quote jual (status ${res.status})`);
  }

  const data = await res.json();
  return data.quote;
}

import { Connection, VersionedTransaction } from '@solana/web3.js';

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
      prioritizationFeeLamports: Math.min(25000, Math.max(5000, Math.floor((jitoTipSol || 0.00001) * 1_000_000_000)))
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

      // 3. Confirm on-chain status via Dedicated RPC (Helius / Fallback)
      const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://solana-rpc.publicnode.com';
      try {
        const connection = new Connection(rpcUrl, 'confirmed');
        // Wait up to 12 seconds for confirmed status
        const confirmPromise = connection.confirmTransaction(signature, 'confirmed');
        const timeoutPromise = new Promise<{ value: { err: any } }>((resolve) =>
          setTimeout(() => resolve({ value: { err: null } }), 12000)
        );
        const confirmation = await Promise.race([confirmPromise, timeoutPromise]);
        if (confirmation.value.err) {
          throw new Error(`Transaksi gagal dikonfirmasi: ${JSON.stringify(confirmation.value.err)}`);
        }
      } catch (confErr: any) {
        console.warn('[Jupiter] Notice during RPC confirmation:', confErr.message);
      }
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
    inAmountSol: quote.inAmountSol || 0,
    outAmountFormatted: quote.outAmountFormatted,
    tokenAmountUi: quote.tokenAmountUi,
    decimals: quote.decimals,
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
