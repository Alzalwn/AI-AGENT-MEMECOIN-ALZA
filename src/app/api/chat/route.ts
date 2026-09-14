import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { generateFuturesSignals } from '@/engine/futuresSignalEngine';
import { BINANCE_FUTURES_COPILOT_PROMPT } from '@/lib/grokSystemPrompt';
import dns from 'node:dns';

// Pastikan Node.js memprioritaskan IPv4 untuk mencegah timeout IPv6 di VPS
try {
  dns.setDefaultResultOrder('ipv4first');
} catch (_) {}

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : new GoogleGenAI({});

export async function POST(req: Request) {
  try {
    const currentApiKey = process.env.GEMINI_API_KEY || apiKey;
    if (!currentApiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY belum dikonfigurasi di file .env' }, { status: 500 });
    }

    const client = new GoogleGenAI({ apiKey: currentApiKey });
    const { message } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Dapatkan sinyal terbaru sebagai konteks AI dengan fallback aman
    let signalsContext = 'Data sinyal sedang diperbarui...';
    try {
      // Set timeout 4 detik untuk mengambil sinyal agar chat tidak lambat
      const timeoutPromise = new Promise<any[]>((_, reject) =>
        setTimeout(() => reject(new Error('Signal fetch timeout')), 4000)
      );
      const signals = await Promise.race([generateFuturesSignals(), timeoutPromise]);

      if (Array.isArray(signals) && signals.length > 0) {
        signalsContext = signals.slice(0, 10).map(s => `
Koin: ${s.symbol}
Sinyal Arah: ${s.direction} (Skor: ${s.overallScore}/100)
Harga Entry: ${s.entryZone.current}
Take Profit 1: ${s.targets.tp1.price} (Estimasi: ${s.indicatorExplanation?.estimatedDuration?.tp1Eta || '-'})
Take Profit 2: ${s.targets.tp2.price}
Take Profit 3: ${s.targets.tp3.price}
Stop Loss: ${s.stopLoss.price}
Ringkasan Analisa AI: ${s.rationale}
`).join('\n');
      }
    } catch (sigErr) {
      console.warn('Gagal memuat sinyal realtime untuk chat context (tetap melanjutkan chat):', sigErr);
      signalsContext = 'Sinyal realtime sedang di-refresh di latar belakang.';
    }

    const systemPrompt = `${BINANCE_FUTURES_COPILOT_PROMPT}

========================================================================
📡 DATA REALTIME LIVE SETUP FUTURES SAAT INI
========================================================================
${signalsContext}
========================================================================

Selalu utamakan SOP, batasan risiko 2%, dan protokol Bitcoin Guard saat Alza menanyakan setup trading!`;

    const response = await client.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: message,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
      }
    });

    return NextResponse.json({ reply: response.text });
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
