import { NextRequest, NextResponse } from 'next/server';
import { processActiveSignals } from '@/lib/signalTracker';
import { TradingSignal } from '@/types/signal';
import { TelegramConfig } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const signals: TradingSignal[] = body.signals || [];
    const telegramConfig: TelegramConfig | undefined = body.telegramConfig;

    if (!Array.isArray(signals)) {
      return NextResponse.json(
        { success: false, error: 'Invalid payload: signals must be an array' },
        { status: 400 }
      );
    }

    const trackingResult = await processActiveSignals(signals, telegramConfig);

    return NextResponse.json({
      success: true,
      timestamp: Date.now(),
      ...trackingResult
    });
  } catch (error: unknown) {
    console.error('[API /api/signals/track] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown tracking error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'ONLINE',
    service: 'Solana AI Alpha Signal Tracker',
    description: 'Auto Price Monitor & TP/SL Target Detection with Telegram Broadcast',
    timestamp: Date.now()
  });
}
