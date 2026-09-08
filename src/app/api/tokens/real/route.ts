import { NextRequest, NextResponse } from 'next/server';
import { fetchLiveSolanaTokens } from '@/engine/realIngestion';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode') || 'ALL';
    const tokens = await fetchLiveSolanaTokens(mode);
    return NextResponse.json({ success: true, tokens, count: tokens.length, mode });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Failed' }, { status: 500 });
  }
}