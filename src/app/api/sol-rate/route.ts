import { NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';

export const dynamic = 'force-dynamic';

interface CachedRate {
  solUsd: number;
  usdIdr: number;
  solIdr: number;
  change24h: number;
  high24h: number;
  low24h: number;
  timestamp: number;
}

const fetchSolRateData = async (): Promise<CachedRate> => {
  const now = Date.now();
  // 1. Fetch SOL Price from DexScreener (Solana Native Wrapped SOL token)
  const solPromise = fetch(
    'https://api.dexscreener.com/latest/dex/tokens/So11111111111111111111111111111111111111112',
    {
      headers: { 'User-Agent': 'GrokTrencher/1.0' }
    }
  ).then(res => res.json()).catch(() => null);

  // 2. Fetch USD to IDR exchange rate from open.er-api.com
  const idrPromise = fetch('https://open.er-api.com/v6/latest/USD', {
    headers: { 'User-Agent': 'GrokTrencher/1.0' }
  }).then(res => res.json()).catch(() => null);

  const [dexData, idrData] = await Promise.all([solPromise, idrPromise]);

  // Parse SOL/USD
  let solUsd = 103.20; // sensible fallback
  let change24h = 0;
  let high24h = 105.0;
  let low24h = 100.0;

  if (dexData?.pairs && Array.isArray(dexData.pairs) && dexData.pairs.length > 0) {
    const validPair = dexData.pairs.find(
      (p: any) => p.quoteToken?.symbol === 'USDC' || p.quoteToken?.symbol === 'USDT'
    ) || dexData.pairs[0];

    if (validPair) {
      solUsd = parseFloat(validPair.priceUsd) || solUsd;
      change24h = parseFloat(validPair.priceChange?.h24) || 0;
    }
  }

  // Parse USD/IDR
  let usdIdr = 17650; // standard fallback
  if (idrData?.rates?.IDR) {
    usdIdr = parseFloat(idrData.rates.IDR) || usdIdr;
  }

  const solIdr = Math.round(solUsd * usdIdr);

  return {
    solUsd,
    usdIdr,
    solIdr,
    change24h,
    high24h,
    low24h,
    timestamp: now
  };
};

// Persistent Next.js Data Cache (revalidated every 30 seconds across serverless functions) (Fix #20)
const getCachedSolRate = unstable_cache(
  fetchSolRateData,
  ['sol-rate-cache-key'],
  { revalidate: 30, tags: ['sol-rate'] }
);

export async function GET() {
  try {
    const data = await getCachedSolRate();
    return NextResponse.json(
      {
        ...data,
        fromCache: true
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60'
        }
      }
    );
  } catch (error) {
    console.error('Error fetching SOL/IDR rate:', error);
    const fallbackUsd = 103.20;
    const fallbackIdrRate = 17650;
    return NextResponse.json(
      {
        solUsd: fallbackUsd,
        usdIdr: fallbackIdrRate,
        solIdr: Math.round(fallbackUsd * fallbackIdrRate),
        change24h: 1.25,
        high24h: 106.5,
        low24h: 101.0,
        timestamp: Date.now(),
        fallback: true
      },
      { status: 200 }
    );
  }
}
