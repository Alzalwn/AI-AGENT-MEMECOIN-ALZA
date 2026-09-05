import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { quoteResponse, userPublicKey, prioritizationFeeLamports = 'auto' } = body;

    const pubkey = userPublicKey || 'GrokTrencherTrader111111111111111111111111111';

    // If we have a real Jupiter raw quote, attempt real Jupiter swap build
    if (quoteResponse && quoteResponse.jupiterRawQuote) {
      try {
        const jupRes = await fetch('https://quote-api.jup.ag/v6/swap', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'GrokTrencher-JupiterSwap/1.0'
          },
          body: JSON.stringify({
            quoteResponse: quoteResponse.jupiterRawQuote,
            userPublicKey: pubkey,
            wrapAndUnwrapSol: true,
            prioritizationFeeLamports: prioritizationFeeLamports === 'auto' ? 50000 : prioritizationFeeLamports
          })
        });

        if (jupRes.ok) {
          const swapData = await jupRes.json();
          return NextResponse.json({
            success: true,
            swapTransaction: swapData.swapTransaction,
            lastValidBlockHeight: swapData.lastValidBlockHeight,
            isSimulated: false
          });
        }
      } catch (e: any) {
        console.warn('Real Jupiter swap API call failed, falling back to simulated payload:', e.message);
      }
    }

    // Simulated swap transaction for Paper Trading or unindexed liquidity
    const randomTxChars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    let mockTxSignature = '';
    for (let i = 0; i < 88; i++) {
      mockTxSignature += randomTxChars.charAt(Math.floor(Math.random() * randomTxChars.length));
    }

    return NextResponse.json({
      success: true,
      swapTransaction: Buffer.from(`mock_jupiter_versioned_tx_${Date.now()}`).toString('base64'),
      transactionSignature: mockTxSignature,
      isSimulated: true
    });
  } catch (err: any) {
    console.error('API /api/jupiter/swap error:', err);
    return NextResponse.json({ error: err.message || 'Swap assembly failed' }, { status: 500 });
  }
}
