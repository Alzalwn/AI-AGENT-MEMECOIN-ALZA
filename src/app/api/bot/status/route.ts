import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const STATUS_FILE = path.join(process.cwd(), 'data', 'bot-status.json');

export async function GET() {
  try {
    if (fs.existsSync(STATUS_FILE)) {
      const content = fs.readFileSync(STATUS_FILE, 'utf8');
      const data = JSON.parse(content);
      return NextResponse.json({
        success: true,
        data
      });
    }

    // Default fallback if daemon hasn't started yet
    const hasTelegram = Boolean(
      process.env.TELEGRAM_BOT_TOKEN ||
      process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN
    );
    return NextResponse.json({
      success: true,
      data: {
        status: hasTelegram ? 'STANDBY' : 'NOT_CONFIGURED',
        mode: hasTelegram ? 'READY_TO_START_PM2' : 'NEEDS_TELEGRAM_TOKEN',
        service: 'PM2 Headless Background Worker',
        telegramConnected: hasTelegram,
        telegramChatId: process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID || 'Belum diisi',
        lastScannedAt: Date.now(),
        scannedCount: 0,
        signalsApproved: 0,
        recentSignals: [],
        uptimeSec: 0,
        settings: {
          minScore: 82,
          minLiquidityUsd: 8000,
          scanIntervalSec: 15
        }
      }
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
