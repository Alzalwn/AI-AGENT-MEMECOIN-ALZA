import { NextRequest, NextResponse } from 'next/server';
import { analyzeSpecificFuturesCoin } from '@/engine/futuresSignalEngine';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    if (!symbol || symbol.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Parameter simbol koin wajib diisi (contoh: BTC, SOL, ETH, PEPE).' },
        { status: 400 }
      );
    }

    const signal = await analyzeSpecificFuturesCoin(symbol);

    return NextResponse.json({
      success: true,
      signal,
      timestamp: Date.now(),
    });
  } catch (error: unknown) {
    console.error('[API /api/futures/analyze] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Gagal menganalisa koin futures.',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const symbol = body.symbol;

    if (!symbol || typeof symbol !== 'string' || symbol.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Simbol koin wajib diisi (contoh: BTC, SOL, ETH).' },
        { status: 400 }
      );
    }

    const signal = await analyzeSpecificFuturesCoin(symbol);

    return NextResponse.json({
      success: true,
      signal,
      timestamp: Date.now(),
    });
  } catch (error: unknown) {
    console.error('[API /api/futures/analyze POST] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Gagal menganalisa koin futures.',
      },
      { status: 500 }
    );
  }
}
