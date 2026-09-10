import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { generateFuturesSignals } from '@/engine/futuresSignalEngine';

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

    const systemPrompt = `Anda adalah AI Trading Assistant ahli untuk Binance Futures. Anda diintegrasikan langsung ke dalam dashboard trading pengguna.
Tugas Anda: Menjawab pertanyaan pengguna dengan singkat, padat, jelas, dan ramah menggunakan bahasa Indonesia ala trader crypto profesional.
Gunakan data sinyal terkini yang didapatkan sistem di bawah ini jika relevan:

--- DATA SINYAL TERKINI ---
${signalsContext}
---------------------------

Aturan Menjawab:
1. Jika pengguna hanya menyapa (seperti "halo", "hai", "p"), balas dengan ramah, perkenalkan diri sebagai AI Trading Assistant, dan tawarkan analisa koin atau kondisi market terkini.
2. Jika pengguna menanyakan koin yang ada di data sinyal, berikan insight berdasarkan data tersebut (Entry, TP, SL, Arah, dan Analisanya).
3. Jika pengguna menanyakan koin yang tidak ada di data, berikan analisa singkat atau beri tahu bahwa sistem algoritma teknikal saat ini belum mendeteksi setup yang solid untuk koin tersebut.
4. Gunakan format yang rapi dan mudah dibaca (bullet points, bold angka).
5. Selalu ingatkan manajemen risiko (Risk/Reward, Stop Loss).`;

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
