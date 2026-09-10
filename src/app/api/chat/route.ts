import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { getFuturesSignals } from '@/engine/futuresSignalEngine';

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : new GoogleGenAI({});

export async function POST(req: Request) {
  try {
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY belum dikonfigurasi di file .env' }, { status: 500 });
    }

    const { message } = await req.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Dapatkan sinyal terbaru sebagai konteks AI
    const signals = await getFuturesSignals();
    
    // Buat string konteks dari data sinyal
    const signalsContext = signals.map(s => `
Koin: ${s.symbol}
Sinyal Arah: ${s.direction} (Skor: ${s.overallScore}/100)
Harga Entry: ${s.entryZone.current}
Take Profit 1: ${s.targets.tp1.price} (Estimasi: ${s.indicatorExplanation?.estimatedDuration?.tp1Eta || '-'})
Take Profit 2: ${s.targets.tp2.price}
Take Profit 3: ${s.targets.tp3.price}
Stop Loss: ${s.stopLoss.price}
Ringkasan Analisa AI: ${s.rationale}
`).join('\n');

    const systemPrompt = `Anda adalah AI Trading Assistant ahli untuk Binance Futures. Anda diintegrasikan langsung ke dalam dashboard trading pengguna.
Tugas Anda: Menjawab pertanyaan pengguna dengan singkat, padat, jelas, dan akurat menggunakan gaya bahasa trader crypto profesional Indonesia.
Gunakan data sinyal terkini yang didapatkan sistem di bawah ini untuk menjawab:

--- DATA SINYAL TERKINI ---
${signalsContext}
---------------------------

Aturan Menjawab:
1. Jika pengguna menanyakan koin yang ada di data sinyal, berikan insight berdasarkan data tersebut (Entry, TP, SL, Arah, dan Analisanya).
2. Jika pengguna menanyakan koin yang tidak ada di data, beritahu bahwa sistem algoritma teknikal saat ini belum mendeteksi setup yang solid untuk koin tersebut.
3. Gunakan markdown list atau bold untuk memformat angka agar mudah dibaca.
4. Jawab dalam bahasa Indonesia. Jangan memberikan rekomendasi membabi buta, selalu ingatkan manajemen risiko (Risk/Reward).
5. Fokus pada koin yang ditanya. Jika tidak spesifik, bisa rekomendasikan sinyal dengan skor tertinggi (SUPERNOVA atau skor >= 88).`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: message,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.5,
      }
    });

    return NextResponse.json({ reply: response.text });
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
