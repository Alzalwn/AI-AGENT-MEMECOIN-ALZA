import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const JITO_ENDPOINTS = [
  'https://tokyo.mainnet.block-engine.jito.wtf/api/v1/transactions',
  'https://frankfurt.mainnet.block-engine.jito.wtf/api/v1/transactions',
  'https://ny.mainnet.block-engine.jito.wtf/api/v1/transactions'
];

async function submitToJito(serializedTx: string): Promise<string | null> {
  for (const ep of JITO_ENDPOINTS) {
    try {
      const res = await fetch(ep, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'sendTransaction',
          params: [serializedTx, { encoding: 'base64', skipPreflight: true }]
        }),
        signal: AbortSignal.timeout(5000)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.result) return data.result;
      }
    } catch {
      continue;
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { quoteResponse, userPublicKey, prioritizationFeeLamports = 50000 } = body;

    // Require valid wallet public key for real on-chain execution
    if (!userPublicKey || userPublicKey.length < 32) {
      // Return simulated swap for paper trading (no pubkey = not connected)
      const randomTxChars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
      let mockTxSignature = '';
      for (let i = 0; i < 88; i++) {
        mockTxSignature += randomTxChars.charAt(Math.floor(Math.random() * randomTxChars.length));
      }
      return NextResponse.json({
        success: true,
        swapTransaction: null, // null = no wallet signing needed (paper trade)
        transactionSignature: mockTxSignature,
        isSimulated: true,
        reason: 'paper_trading_no_wallet'
      });
    }

    // If we have a real Jupiter raw quote, build the real swap transaction
    if (quoteResponse && quoteResponse.jupiterRawQuote) {
      const jupSwapEndpoints = [
        'https://api.jup.ag/swap/v1/swap',
        'https://quote-api.jup.ag/v6/swap'
      ];

      for (const ep of jupSwapEndpoints) {
        try {
          const jupRes = await fetch(ep, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'GrokTrencher-Pro/2.0'
            },
            body: JSON.stringify({
              quoteResponse: quoteResponse.jupiterRawQuote,
              userPublicKey: userPublicKey,
              wrapAndUnwrapSol: true,
              dynamicComputeUnitLimit: true,
              prioritizationFeeLamports: typeof prioritizationFeeLamports === 'number' ? prioritizationFeeLamports : 50000,
              asLegacyTransaction: false
            }),
            signal: AbortSignal.timeout(8000)
          });

          if (jupRes.ok) {
            const swapData = await jupRes.json();
            if (swapData.swapTransaction) {
              return NextResponse.json({
                success: true,
                swapTransaction: swapData.swapTransaction, // base64 VersionedTransaction
                lastValidBlockHeight: swapData.lastValidBlockHeight,
                isSimulated: false
              });
            }
          }
        } catch (e: any) {
          console.warn(`Jupiter swap build at ${ep} failed:`, e.message);
        }
      }
    }

    // Fallback: Simulated swap transaction (paper trading or Jupiter API down)
    const randomTxChars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let mockTxSignature = '';
    for (let i = 0; i < 88; i++) {
      mockTxSignature += randomTxChars.charAt(Math.floor(Math.random() * randomTxChars.length));
    }

    return NextResponse.json({
      success: true,
      swapTransaction: null,
      transactionSignature: mockTxSignature,
      isSimulated: true,
      reason: 'jupiter_api_fallback'
    });
  } catch (err: any) {
    console.error('API /api/jupiter/swap error:', err);
    return NextResponse.json({ error: err.message || 'Swap assembly failed' }, { status: 500 });
  }
}
