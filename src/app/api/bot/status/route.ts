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
    const hasPrivateKey = Boolean(process.env.AUTONOMOUS_SNIPER_PRIVATE_KEY);
    return NextResponse.json({
      success: true,
      data: {
        status: hasPrivateKey ? 'STANDBY' : 'NOT_CONFIGURED',
        mode: hasPrivateKey ? 'READY_TO_START' : 'NEEDS_HOT_WALLET',
        walletPublicKey: null,
        balanceSol: 0,
        lastScannedAt: Date.now(),
        activePositions: [],
        recentTrades: [],
        totalPnLSol: 0,
        scannedCount: 0,
        signalsApproved: 0,
        settings: {
          buyAmountSol: parseFloat(process.env.AUTONOMOUS_SNIPER_BUY_AMOUNT_SOL || '0.02'),
          minViralityScore: parseInt(process.env.AUTONOMOUS_SNIPER_MIN_SCORE || '80', 10),
          takeProfitPct: 50,
          stopLossPct: 20
        }
      }
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}
