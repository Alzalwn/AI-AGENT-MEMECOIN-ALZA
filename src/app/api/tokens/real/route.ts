import { NextResponse } from 'next/server';
import { fetchLiveSolanaTokens } from '@/engine/realIngestion';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const tokens = await fetchLiveSolanaTokens();
    return NextResponse.json({ success: true, tokens, count: tokens.length });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Failed' }, { status: 500 });
  }
}