import { NextRequest, NextResponse } from 'next/server';
import { evaluateTokenWithGemini } from '@/lib/gemini';
import { TokenSignal } from '@/types/terminal';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, apiKey } = body as { token: TokenSignal; apiKey?: string };

    if (!token || !token.symbol) {
      return NextResponse.json(
        { error: 'TokenSignal object is required' },
        { status: 400 }
      );
    }

    const evaluation = await evaluateTokenWithGemini(token, apiKey);
    return NextResponse.json(evaluation, { status: 200 });
  } catch (error: any) {
    console.error('API /api/narrative/evaluate error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
