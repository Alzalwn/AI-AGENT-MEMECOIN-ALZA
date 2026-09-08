import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health/rpc-stream
 *
 * Health check endpoint untuk WebSocket RPC Stream (Helius).
 * Mengembalikan status real-time koneksi blockchain stream.
 *
 * Response: JSON dengan status HEALTHY | DEGRADED | CRITICAL | OFFLINE
 */
export async function GET(req: NextRequest) {
  try {
    // Import secara dinamis untuk menghindari singleton clash di browser
    const { heliusStreamInstance } = await import('@/lib/heliusStreamSingleton').catch(() => ({
      heliusStreamInstance: null
    }));

    if (!heliusStreamInstance) {
      return NextResponse.json({
        status: 'OFFLINE',
        wsReadyState: 'UNAVAILABLE',
        eventsLastMinute: 0,
        reconnectCount: 0,
        uptimeSec: 0,
        lastEventAt: null,
        frozenMinutes: 0,
        message: 'Stream singleton belum diinisialisasi. Bot daemon belum berjalan di server ini.',
        checkedAt: new Date().toISOString(),
        endpoint: req.nextUrl.pathname,
      }, { status: 200 });
    }

    const health = heliusStreamInstance.getStreamHealth();

    const httpStatus = health.status === 'HEALTHY' ? 200
      : health.status === 'DEGRADED' ? 200
      : health.status === 'CRITICAL' ? 503
      : 200;

    return NextResponse.json({
      ...health,
      checkedAt: new Date().toISOString(),
      endpoint: req.nextUrl.pathname,
      rpcWsUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL
        ? `${process.env.NEXT_PUBLIC_SOLANA_RPC_URL.replace(/^http/, 'ws').slice(0, 40)}...`
        : 'DEFAULT_HELIUS_WS',
    }, { status: httpStatus });

  } catch (err: any) {
    return NextResponse.json({
      status: 'CRITICAL',
      wsReadyState: 'UNAVAILABLE',
      eventsLastMinute: 0,
      reconnectCount: 0,
      uptimeSec: 0,
      lastEventAt: null,
      frozenMinutes: 0,
      error: err?.message ?? 'Unknown error',
      checkedAt: new Date().toISOString(),
    }, { status: 500 });
  }
}
