/**
 * News Sentiment Engine
 * Menganalisis berita crypto (otomatis dari RSS/CryptoPanic maupun manual paste dari WA/Telegram)
 * menggunakan Gemini Flash untuk menghasilkan skor sentimen (-100 s/d +100) dan signal modifier.
 */

import { CryptoNewsItem, NewsImpactScore, NewsCatalystType, NewsSignalModifier } from '@/types/newsTypes';

interface CachedSentiment {
  score: NewsImpactScore;
  timestamp: number;
}

// In-memory cache skor sentimen per simbol (TTL 1 jam)
const sentimentCache = new Map<string, CachedSentiment>();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 jam

/**
 * Heuristic fallback jika Gemini API tidak tersedia atau kuota habis
 */
function heuristicSentiment(symbol: string, headlines: string[]): NewsImpactScore {
  const combined = headlines.join(' ').toLowerCase();
  let score = 0;
  let catalyst: NewsCatalystType = 'OTHER';

  const bullishKeywords = ['integrat', 'adopsi', 'adopt', 'partnership', 'kerjasama', 'etf', 'approval', 'surge', 'breakout', 'bullish', 'invest', 'pemerintah', 'government'];
  const bearishKeywords = ['sell', 'jual', 'dump', 'hack', 'exploit', 'sec', 'tuntutan', 'lawsuit', 'ban', 'turun', 'drop', 'put option', 'tekanan', 'rug', 'liquidat'];

  for (const w of bullishKeywords) {
    if (combined.includes(w)) score += 20;
  }
  for (const w of bearishKeywords) {
    if (combined.includes(w)) score -= 20;
  }

  score = Math.max(-100, Math.min(100, score));

  if (combined.includes('hack') || combined.includes('exploit')) catalyst = 'HACK_EXPLOIT';
  else if (combined.includes('pemerintah') || combined.includes('adopsi') || combined.includes('integrat')) catalyst = 'ADOPTION';
  else if (combined.includes('jual') || combined.includes('sell') || combined.includes('whale')) catalyst = 'WHALE_MOVEMENT';
  else if (combined.includes('option') || combined.includes('derivat')) catalyst = 'DERIVATIVES_OPTIONS';
  else if (combined.includes('sec') || combined.includes('lawsuit')) catalyst = 'REGULATORY';

  let modifier: NewsSignalModifier = 'NEUTRAL';
  if (score >= 50) modifier = 'STRONG_BOOST_LONG';
  else if (score >= 20) modifier = 'BOOST_LONG';
  else if (score <= -50) modifier = 'STRONG_BOOST_SHORT';
  else if (score <= -20) modifier = 'BOOST_SHORT';

  return {
    symbol,
    sentimentScore: score,
    catalystType: catalyst,
    signalModifier: modifier,
    keyHeadline: headlines[0] || 'Sentimen Algoritmik Heuristic',
    summary: `Analisis heuristik: sentimen ${score >= 0 ? 'positif' : 'negatif'} (skor ${score}) terdeteksi dari kata kunci berita.`,
    confidence: 0.65,
    impactLevel: Math.abs(score) >= 50 ? 'HIGH' : 'MEDIUM',
    analyzedAt: Date.now(),
    sources: ['Heuristic Heuristic Fallback'],
  };
}

/**
 * Panggil Gemini API untuk analisis sentimen terstruktur
 */
async function callGeminiForSentiment(
  symbol: string,
  newsTexts: string[],
  customApiKey?: string
): Promise<NewsImpactScore | null> {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const prompt = `Anda adalah Chief Crypto News & Sentiment Analyst untuk Binance Futures Terminal.
Tugas Anda adalah mengevaluasi dampak berita berikut terhadap aset kripto: "${symbol}".

Daftar Berita / Teks Pasar:
${newsTexts.map((n, i) => `${i + 1}. ${n}`).join('\n')}

Berikan analisis obyektif tentang bagaimana berita ini mempengaruhi bias harga ${symbol} dalam rentang 1-24 jam ke depan.
Format respon HANYA JSON valid:
{
  "sentimentScore": <angka antara -100 (sangat bearish) hingga +100 (sangat bullish)>,
  "catalystType": "<REGULATORY | MACRO | ADOPTION | HACK_EXPLOIT | WHALE_MOVEMENT | LISTING_DELISTING | UPGRADE_HARDFORK | DERIVATIVES_OPTIONS | OTHER>",
  "signalModifier": "<STRONG_BOOST_LONG | BOOST_LONG | NEUTRAL | BOOST_SHORT | STRONG_BOOST_SHORT | VETO_LONG | VETO_SHORT>",
  "keyHeadline": "<1 kalimat ringkasan headline utama>",
  "summary": "<1-2 kalimat analisa tajam dalam Bahasa Indonesia>",
  "confidence": <angka 0.1 hingga 1.0>,
  "impactLevel": "<HIGH | MEDIUM | LOW>"
}`;

  const models = ['gemini-3.6-flash', 'gemini-flash-latest', 'gemini-2.5-flash', 'gemini-1.5-flash'];

  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-goog-api-key': apiKey,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1,
            },
          }),
          signal: AbortSignal.timeout(6000),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawText) {
          const parsed = JSON.parse(rawText);
          const score = Math.max(-100, Math.min(100, Number(parsed.sentimentScore) || 0));

          return {
            symbol,
            sentimentScore: score,
            catalystType: parsed.catalystType || 'OTHER',
            signalModifier: parsed.signalModifier || (score >= 20 ? 'BOOST_LONG' : score <= -20 ? 'BOOST_SHORT' : 'NEUTRAL'),
            keyHeadline: parsed.keyHeadline || newsTexts[0]?.slice(0, 100) || 'Sentimen Pasar Terkini',
            summary: parsed.summary || 'Analisis sentimen berbasis AI berhasil diproses.',
            confidence: Math.max(0.1, Math.min(1, Number(parsed.confidence) || 0.8)),
            impactLevel: parsed.impactLevel || (Math.abs(score) >= 50 ? 'HIGH' : 'MEDIUM'),
            analyzedAt: Date.now(),
            sources: ['Gemini AI Intelligence'],
          };
        }
      }
    } catch (err) {
      console.warn(`[NewsSentiment] Failed with model ${model}:`, err);
    }
  }

  return null;
}

/**
 * Menganalisis sentimen untuk simbol tertentu berdasarkan berita terkini
 */
export async function analyzeSentimentForSymbol(
  symbol: string,
  newsItems: CryptoNewsItem[],
  forceRefresh = false
): Promise<NewsImpactScore> {
  const normSymbol = symbol.toUpperCase();
  const cached = sentimentCache.get(normSymbol);
  const now = Date.now();

  if (!forceRefresh && cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.score;
  }

  const baseSymbol = normSymbol.replace(/USDT$|BUSD$|USDC$|PERP$/i, '');
  // Ambil berita spesifik token, atau jika tidak ada, sertakan berita makro/BTC
  const tokenSpecific = newsItems.filter(
    (item) =>
      (item.currencies && item.currencies.includes(baseSymbol)) ||
      item.title.toUpperCase().includes(baseSymbol) ||
      (item.body && item.body.toUpperCase().includes(baseSymbol))
  );

  const macroNews = newsItems.filter(
    (item) =>
      item.title.toUpperCase().includes('BTC') ||
      item.title.toUpperCase().includes('BITCOIN') ||
      item.title.toUpperCase().includes('FED') ||
      item.title.toUpperCase().includes('MARKET')
  );

  const selectedNews = tokenSpecific.length > 0 ? tokenSpecific : macroNews.slice(0, 5);

  if (selectedNews.length === 0) {
    const neutralScore: NewsImpactScore = {
      symbol: normSymbol,
      sentimentScore: 0,
      catalystType: 'OTHER',
      signalModifier: 'NEUTRAL',
      keyHeadline: 'Tidak ada berita signifikan terdeteksi',
      summary: 'Kondisi berita netral / sepi katalis untuk token ini.',
      confidence: 0.5,
      impactLevel: 'LOW',
      analyzedAt: now,
      sources: ['Market Scanner'],
    };
    sentimentCache.set(normSymbol, { score: neutralScore, timestamp: now });
    return neutralScore;
  }

  const newsTexts = selectedNews.map((n) => `${n.title} - ${n.source}: ${n.body || ''}`.trim());

  let result = await callGeminiForSentiment(normSymbol, newsTexts);
  if (!result) {
    result = heuristicSentiment(normSymbol, newsTexts);
  }

  result.sources = Array.from(new Set(selectedNews.map((n) => n.source)));
  sentimentCache.set(normSymbol, { score: result, timestamp: now });

  return result;
}

/**
 * Analisis manual teks berita dari WhatsApp/Telegram
 * Mengekstrak sentimen dan mendistribusikannya ke simbol terkait (misal AVAX, BTC, dll.)
 */
export async function analyzeManualNewsText(
  rawText: string,
  targetSymbols?: string[],
  customApiKey?: string
): Promise<Record<string, NewsImpactScore>> {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;
  const results: Record<string, NewsImpactScore> = {};

  if (!rawText.trim()) return results;

  const prompt = `Anda adalah AI Crypto Sentiment Specialist.
Pengguna menempelkan (paste) berita/catatan pasar berikut dari Telegram/WhatsApp:

"""
${rawText}
"""

Tugas Anda:
1. Deteksi semua aset kripto yang relevan dan terpengaruh oleh berita tersebut (misal: BTC, ETH, AVAX, SOL, dll.).
2. Untuk setiap aset kripto tersebut, berikan evaluasi dampak sentimen.
3. Berikan output dalam format JSON valid berupa dictionary dengan key nama simbol pasangan Binance Futures (misal: "BTCUSDT", "AVAXUSDT"):

{
  "SYMBOL_USDT": {
    "sentimentScore": <angka antara -100 hingga +100>,
    "catalystType": "<REGULATORY | MACRO | ADOPTION | HACK_EXPLOIT | WHALE_MOVEMENT | LISTING_DELISTING | UPGRADE_HARDFORK | DERIVATIVES_OPTIONS | OTHER>",
    "signalModifier": "<STRONG_BOOST_LONG | BOOST_LONG | NEUTRAL | BOOST_SHORT | STRONG_BOOST_SHORT | VETO_LONG | VETO_SHORT>",
    "keyHeadline": "<1 kalimat ringkasan spesifik>",
    "summary": "<1-2 kalimat analisa tajam dalam Bahasa Indonesia>",
    "confidence": <angka 0.1 hingga 1.0>,
    "impactLevel": "<HIGH | MEDIUM | LOW>"
  }
}`;

  let parsedResponse: Record<string, any> | null = null;

  if (apiKey) {
    const models = ['gemini-3.6-flash', 'gemini-flash-latest', 'gemini-2.5-flash', 'gemini-1.5-flash'];
    for (const model of models) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-goog-api-key': apiKey,
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.1,
              },
            }),
            signal: AbortSignal.timeout(8000),
          }
        );

        if (res.ok) {
          const data = await res.json();
          const rawOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawOutput) {
            parsedResponse = JSON.parse(rawOutput);
            break;
          }
        }
      } catch (err) {
        console.warn(`[NewsSentiment] Manual parse failed with ${model}:`, err);
      }
    }
  }

  const now = Date.now();

  if (parsedResponse && typeof parsedResponse === 'object') {
    for (const [rawSym, data] of Object.entries(parsedResponse)) {
      let sym = rawSym.toUpperCase();
      if (!sym.endsWith('USDT')) sym += 'USDT';

      const score = Math.max(-100, Math.min(100, Number(data.sentimentScore) || 0));
      const impactScore: NewsImpactScore = {
        symbol: sym,
        sentimentScore: score,
        catalystType: data.catalystType || 'OTHER',
        signalModifier: data.signalModifier || (score >= 20 ? 'BOOST_LONG' : score <= -20 ? 'BOOST_SHORT' : 'NEUTRAL'),
        keyHeadline: data.keyHeadline || 'Manual News Feed',
        summary: data.summary || 'Analisis dari input manual berita.',
        confidence: Math.max(0.1, Math.min(1, Number(data.confidence) || 0.85)),
        impactLevel: data.impactLevel || (Math.abs(score) >= 50 ? 'HIGH' : 'MEDIUM'),
        analyzedAt: now,
        sources: ['Manual Paste (Telegram/WA)'],
        isManual: true,
      };

      results[sym] = impactScore;
      // Update cache
      sentimentCache.set(sym, { score: impactScore, timestamp: now });
    }
  } else {
    // Fallback regex detection jika Gemini offline
    const potentialSymbols = targetSymbols && targetSymbols.length > 0 
      ? targetSymbols 
      : ['BTCUSDT', 'AVAXUSDT', 'SOLUSDT', 'ETHUSDT'];

    for (const sym of potentialSymbols) {
      const base = sym.replace(/USDT$/i, '');
      if (rawText.toUpperCase().includes(base)) {
        const heuristic = heuristicSentiment(sym, [rawText]);
        heuristic.isManual = true;
        heuristic.sources = ['Manual Paste (Heuristic)'];
        results[sym] = heuristic;
        sentimentCache.set(sym, { score: heuristic, timestamp: now });
      }
    }
  }

  return results;
}

/**
 * Dapatkan skor sentimen tersimpan untuk simbol tertentu (jika ada)
 */
export function getCachedSentiment(symbol: string): NewsImpactScore | null {
  const norm = symbol.toUpperCase();
  const cached = sentimentCache.get(norm);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.score;
  }
  return null;
}

/**
 * Dapatkan seluruh skor sentimen aktif yang telah dianalisis
 */
export function getAllCachedSentiments(): Record<string, NewsImpactScore> {
  const result: Record<string, NewsImpactScore> = {};
  const now = Date.now();
  for (const [sym, entry] of sentimentCache.entries()) {
    if (now - entry.timestamp < CACHE_TTL_MS) {
      result[sym] = entry.score;
    }
  }
  return result;
}

/**
 * Hapus sentimen tersimpan untuk simbol tertentu atau bersihkan semua
 */
export function deleteCachedSentiment(symbol?: string): void {
  if (!symbol || symbol === 'ALL') {
    sentimentCache.clear();
  } else {
    sentimentCache.delete(symbol.toUpperCase());
  }
}
