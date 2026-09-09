import { NextRequest, NextResponse } from 'next/server';
import { generateFuturesSignals } from '@/engine/futuresSignalEngine';

export const dynamic = 'force-dynamic';
export const revalidate = 15; // 15 detik ISR cache

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const direction = searchParams.get('direction'); // 'ALL' | 'LONG' | 'SHORT'
    const strategy = searchParams.get('strategy');
    const search = searchParams.get('search')?.toUpperCase();
    const tier = searchParams.get('tier');

    let signals = await generateFuturesSignals();

    // Filter Arah (LONG / SHORT)
    if (direction && direction !== 'ALL') {
      signals = signals.filter((s) => s.direction === direction);
    }

    // Filter Strategi
    if (strategy && strategy !== 'ALL') {
      signals = signals.filter((s) => s.strategy === strategy);
    }

    // Filter Tier
    if (tier && tier !== 'ALL') {
      signals = signals.filter((s) => s.signalTier === tier);
    }

    // Filter Pencarian Koin (Support semua koin, misal BTC, SOL, PEPE, SUI)
    if (search && search.trim() !== '') {
      signals = signals.filter(
        (s) =>
          s.symbol.includes(search) ||
          s.baseAsset.includes(search)
      );
    }

    return NextResponse.json({
      success: true,
      total: signals.length,
      signals,
      timestamp: Date.now(),
    });
  } catch (error: unknown) {
    console.error('[API /api/futures/signals] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Gagal menghasilkan sinyal futures',
        signals: [],
      },
      { status: 500 }
    );
  }
}
