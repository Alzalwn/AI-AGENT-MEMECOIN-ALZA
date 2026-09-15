import { NextRequest, NextResponse } from 'next/server';
import { fetchRecentCryptoNews } from '@/engine/newsFetchEngine';
import {
  analyzeSentimentForSymbol,
  analyzeManualNewsText,
  getAllCachedSentiments,
  deleteCachedSentiment,
} from '@/engine/newsSentimentEngine';
import { NewsImpactScore } from '@/types/newsTypes';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbolsParam = searchParams.get('symbols');
    const forceRefresh = searchParams.get('refresh') === 'true';

    // 1. Ambil berita publik terkini
    const newsList = await fetchRecentCryptoNews(forceRefresh);

    // 2. Tentukan simbol yang perlu dievaluasi
    const symbols = symbolsParam
      ? symbolsParam.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
      : ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'AVAXUSDT'];

    const symbolScores: Record<string, NewsImpactScore> = {};

    // 3. Gabungkan dengan cached yang sudah ada sebelumnya
    const existingCache = getAllCachedSentiments();
    Object.assign(symbolScores, existingCache);

    // 4. Evaluasi simbol-simbol yang diminta jika belum ada atau jika forceRefresh
    for (const sym of symbols) {
      if (forceRefresh || !symbolScores[sym]) {
        const score = await analyzeSentimentForSymbol(sym, newsList, forceRefresh);
        symbolScores[sym] = score;
      }
    }

    return NextResponse.json({
      success: true,
      symbolScores,
      recentHeadlines: newsList.slice(0, 15),
      lastUpdated: Date.now(),
    });
  } catch (error: any) {
    console.error('[API news-sentiment GET] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { manualNews, targetSymbols } = body;

    if (!manualNews || typeof manualNews !== 'string' || !manualNews.trim()) {
      return NextResponse.json(
        { success: false, error: 'Teks berita manual tidak boleh kosong.' },
        { status: 400 }
      );
    }

    const scores = await analyzeManualNewsText(manualNews, targetSymbols);

    return NextResponse.json({
      success: true,
      scores,
      count: Object.keys(scores).length,
      message: `Berhasil menganalisis sentimen untuk ${Object.keys(scores).length} pasangan futures.`,
      lastUpdated: Date.now(),
    });
  } catch (error: any) {
    console.error('[API news-sentiment POST] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    deleteCachedSentiment(symbol || 'ALL');

    return NextResponse.json({
      success: true,
      message: symbol ? `Sentimen untuk ${symbol} berhasil dihapus.` : 'Semua cache sentimen berhasil dibersihkan.',
    });
  } catch (error: any) {
    console.error('[API news-sentiment DELETE] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
