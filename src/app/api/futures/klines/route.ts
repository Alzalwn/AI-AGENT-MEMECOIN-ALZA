import { NextRequest, NextResponse } from 'next/server';
import { getKlines } from '@/lib/binanceClient';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get('symbol') || 'BTCUSDT';
    const interval = (searchParams.get('interval') || '15m') as '15m' | '1h' | '4h';
    const limit = parseInt(searchParams.get('limit') || '60', 10);

    const rawKlines = await getKlines(symbol, interval, Math.min(limit, 100));

    // Map into clean structured objects
    const klines = rawKlines.map((k) => ({
      time: k[0],
      open: k[1],
      high: k[2],
      low: k[3],
      close: k[4],
      volume: k[5],
    }));

    return NextResponse.json({
      success: true,
      symbol,
      interval,
      count: klines.length,
      klines,
    });
  } catch (error: unknown) {
    console.error('[API /api/futures/klines] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Gagal memuat klines dari Binance',
      },
      { status: 500 }
    );
  }
}
