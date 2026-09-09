import { NextResponse } from 'next/server';
import { generateFuturesSignals, computeFuturesMarketStats } from '@/engine/futuresSignalEngine';

export const dynamic = 'force-dynamic';
export const revalidate = 20;

export async function GET() {
  try {
    const signals = await generateFuturesSignals();
    const stats = await computeFuturesMarketStats(signals);

    return NextResponse.json({
      success: true,
      stats,
      timestamp: Date.now(),
    });
  } catch (error: unknown) {
    console.error('[API /api/futures/market] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Gagal mengambil metrik pasar futures',
      },
      { status: 500 }
    );
  }
}
