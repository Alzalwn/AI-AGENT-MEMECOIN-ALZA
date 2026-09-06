import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_TRACKED_WALLETS, generateMockWhaleActivity } from '@/lib/smartMoney';
import { WalletTransactionActivity } from '@/types/smartMoney';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const activities: WalletTransactionActivity[] = [];
    const count = 8;
    for (let i = 0; i < count; i++) {
      activities.push(generateMockWhaleActivity(DEFAULT_TRACKED_WALLETS));
    }

    return NextResponse.json({
      success: true,
      activities: activities.sort((a, b) => b.timestamp - a.timestamp)
    });
  } catch (error: any) {
    console.error('API /api/smart-money/activity error:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch wallet activity' }, { status: 500 });
  }
}
