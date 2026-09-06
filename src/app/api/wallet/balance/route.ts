import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const RPC_FALLBACKS = [
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
  'https://solana-rpc.publicnode.com',
  'https://api.mainnet-beta.solana.com',
  'https://solana.publicnode.com'
].filter(Boolean) as string[];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get('address')?.trim();

  if (!address || address.length < 32 || address.length > 44) {
    return NextResponse.json(
      { success: false, error: 'Invalid Solana address' },
      { status: 400 }
    );
  }

  let lastError = 'RPC call failed';

  for (const rpcUrl of RPC_FALLBACKS) {
    try {
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getBalance',
          params: [address]
        }),
        signal: AbortSignal.timeout(4500)
      });

      if (!response.ok) {
        lastError = `RPC ${rpcUrl} returned HTTP ${response.status}`;
        continue;
      }

      const data = await response.json();
      if (data.result?.value !== undefined) {
        const balanceLamports = Number(data.result.value);
        const balanceSol = +(balanceLamports / 1e9).toFixed(4);
        return NextResponse.json({
          success: true,
          address,
          balanceSol,
          balanceLamports,
          rpcUsed: rpcUrl
        });
      } else if (data.error) {
        lastError = data.error.message || JSON.stringify(data.error);
      }
    } catch (err: any) {
      lastError = err.message || 'Timeout/Network error';
    }
  }

  return NextResponse.json(
    { success: false, error: lastError, balanceSol: 0 },
    { status: 502 }
  );
}
