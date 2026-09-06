import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface CachedRate {
  solUsd: number;
  usdIdr: number;
  solIdr: number;
  change24h: number;
  high24h: number;
  low24h: number;
  timestamp: number;
}

let cachedData: CachedRate | null = null;
let lastFetchTime = 0;
const CACHE_TTL_MS = 30_000; // 30 seconds cache

export async function GET() {
  const now = Date.now();

  // Return cached rate if fresh
  if (cachedData && now - lastFetchTime < CACHE_TTL_MS) {
    return NextResponse.json({
      ...cachedData,
      fromCache: true
    });
  }

  try {
    // 1. Fetch SOL Price from DexScreener (Solana Native Wrapped SOL token)
    const solPromise = fetch(
      'https://api.dexscreener.com/latest/dex/tokens/So11111111111111111111111111111111111111112',
      {
        headers: { 'User-Agent': 'GrokTrencher/1.0' },
        next: { revalidate: 30 }
      }
    ).then(res => res.json()).catch(() => null);

    // 2. Fetch USD to IDR exchange rate from open.er-api.com
    const idrPromise = fetch('https://open.er-api.com/v6/latest/USD', {
      headers: { 'User-Agent': 'GrokTrencher/1.0' },
      next: { revalidate: 300 }
    }).then(res => res.json()).catch(() => null);

    const [dexData, idrData] = await Promise.all([solPromise, idrPromise]);

    // Parse SOL/USD
    let solUsd = 103.20; // sensible fallback
    let change24h = 0;
    let high24h = 105.0;
    let low24h = 100.0;

    if (dexData?.pairs && Array.isArray(dexData.pairs) && dexData.pairs.length > 0) {
      // Find highest liquidity pair (usually SOL/USDC on Raydium/Orca)
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

    cachedData = {
      solUsd,
      usdIdr,
      solIdr,
      change24h,
      high24h,
      low24h,
      timestamp: now
    };
    lastFetchTime = now;

    return NextResponse.json({
      ...cachedData,
      fromCache: false
    });
  } catch (error) {
    console.error('Error fetching SOL/IDR rate:', error);
    
    // If cache exists even if stale, return it
    if (cachedData) {
      return NextResponse.json({
        ...cachedData,
        fromCache: true,
        stale: true
      });
    }

    // Fallback response
    const fallbackUsd = 103.20;
    const fallbackIdrRate = 17650;
    return NextResponse.json({
      solUsd: fallbackUsd,
      usdIdr: fallbackIdrRate,
      solIdr: Math.round(fallbackUsd * fallbackIdrRate),
      change24h: 1.25,
      high24h: 106.5,
      low24h: 101.0,
      timestamp: now,
      fallback: true
    });
  }
}
