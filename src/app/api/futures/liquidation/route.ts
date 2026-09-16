import { NextRequest, NextResponse } from 'next/server';
import { 
  getFuturesSingleTicker, 
  getKlines, 
  getFuturesOpenInterest, 
  getSingleFundingRate 
} from '@/lib/binanceClient';
import { analyzeLiquidationClusters } from '@/engine/liquidationEngine';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawSymbol = searchParams.get('symbol') || 'BTCUSDT';
    const symbol = rawSymbol.trim().toUpperCase().endsWith('USDT') 
      ? rawSymbol.trim().toUpperCase() 
      : `${rawSymbol.trim().toUpperCase()}USDT`;

    const interval = (searchParams.get('interval') || '1h') as '15m' | '1h' | '4h';

    // Fetch parallel real Binance Futures data
    const [ticker, rawKlines, rawOi, funding] = await Promise.all([
      getFuturesSingleTicker(symbol),
      getKlines(symbol, interval, 80),
      getFuturesOpenInterest(symbol),
      getSingleFundingRate(symbol),
    ]);

    const currentPrice = ticker ? parseFloat(ticker.lastPrice) : (funding ? parseFloat(funding.markPrice) : 0);
    const volume24hUsd = ticker ? parseFloat(ticker.quoteVolume) : 50_000_000;
    const openInterestCoins = rawOi || 0;
    const openInterestUsd = openInterestCoins > 0 && currentPrice > 0 
      ? openInterestCoins * currentPrice 
      : volume24hUsd * 0.4;

    const candles = rawKlines.map((k) => ({
      open: k[1],
      high: k[2],
      low: k[3],
      close: k[4],
      volume: k[5],
    }));

    const liquidationData = analyzeLiquidationClusters({
      symbol,
      currentPrice: currentPrice || 50000,
      openInterestUsd,
      volume24hUsd,
      candles,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...liquidationData,
        fundingRate: funding ? parseFloat(funding.lastFundingRate) : 0.0001,
        high24h: ticker ? parseFloat(ticker.highPrice) : currentPrice * 1.05,
        low24h: ticker ? parseFloat(ticker.lowPrice) : currentPrice * 0.95,
        priceChangePct24h: ticker ? parseFloat(ticker.priceChangePercent) : 0,
      },
    });
  } catch (error: unknown) {
    console.error('[API /api/futures/liquidation] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Gagal memproses kalkulasi liquidation heatmap',
      },
      { status: 500 }
    );
  }
}
