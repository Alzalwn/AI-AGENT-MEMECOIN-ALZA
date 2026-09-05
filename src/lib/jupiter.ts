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

/**
 * Execute or assemble the swap transaction via Jupiter Aggregator & bundle with Jito
 */
export async function executeJupiterSwap(
  quote: JupiterQuoteResponse,
  symbol: string,
  jitoTipSol: number = 0.00005,
  currentSlot: number = 284192000,
  userPublicKey?: string
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

  // Create signature
  const signature = data.transactionSignature || (
    'jup_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  );

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
    isSimulated: data.isSimulated ?? true,
    timestamp: Date.now()
  };
}
