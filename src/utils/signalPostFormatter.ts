/**
 * Generator Format Deskripsi Sinyal Trading Komunitas Kripto Telegram/Discord
 * Gaya bahasa analis kripto profesional Indonesia: natural, berbobot, meyakinkan, dan mudah dipahami.
 */

export interface SignalPostParams {
  pair: string;            // Misal: "ATOM/USDT", "BTC/USDT"
  position: 'LONG' | 'SHORT';
  entry: number | string;
  takeProfit: number | string;
  stopLoss: number | string;
  technicalContext?: string;
}

/**
 * Membentuk deskripsi narasi sinyal sesuai format baku komunitas kripto:
 * 
 * [POSISI] [PAIR]
 * 
 * [Paragraf 1: Narasi teknikal]
 * 
 * 🟢 Entry: [Entry]
 * 🎯 Take Profit: [TP]
 * 🔴 Stop-Loss: [SL]
 * 
 * [Paragraf 2: Skenario probabilitas & batas risiko]
 */
export function generateCommunitySignalPost(params: SignalPostParams): string {
  const isLong = params.position === 'LONG';
  const cleanPair = params.pair.includes('/') ? params.pair : `${params.pair.replace('USDT', '')}/USDT`;
  const baseAsset = cleanPair.split('/')[0];

  const entryStr = typeof params.entry === 'number' ? params.entry.toString() : params.entry;
  const tpStr = typeof params.takeProfit === 'number' ? params.takeProfit.toString() : params.takeProfit;
  const slStr = typeof params.stopLoss === 'number' ? params.stopLoss.toString() : params.stopLoss;

  // 1. Paragraf 1: Narasi teknikal 1 kalimat
  let paragraph1 = '';
  if (params.technicalContext && params.technicalContext.trim() !== '') {
    paragraph1 = isLong
      ? `${baseAsset} mempercepat pergerakan naik dan mendekati area resistance penting di sekitar ${entryStr}, sementara ${params.technicalContext.trim().replace(/\.$/, '')}.`
      : `${baseAsset} mempercepat pergerakan turun dan mendekati area breakdown penting di sekitar ${entryStr}, sementara ${params.technicalContext.trim().replace(/\.$/, '')}.`;
  } else {
    paragraph1 = isLong
      ? `${baseAsset} mempercepat pergerakan naik dan mendekati area resistance penting di sekitar ${entryStr}, sementara mayoritas moving average saat ini masih solid mendukung skenario bullish.`
      : `${baseAsset} mempercepat pergerakan turun dan mendekati area support krusial di sekitar ${entryStr}, sementara tekanan jual dan formasi moving average saat ini menegaskan dominasi tren bearish.`;
  }

  // 2. Paragraf 2: Skenario probabilitas 1 kalimat
  const paragraph2 = isLong
    ? `Jika harga mampu bertahan kuat di area ${entryStr} setelah momentum ini, peluang untuk melanjutkan kenaikan akan semakin terbuka, sedangkan penurunan kembali di bawah ${slStr} akan menandakan hilangnya area breakout terdekat dan melemahnya skenario Long.`
    : `Jika harga mampu bertahan di bawah area ${entryStr} setelah penolakan ini, peluang untuk melanjutkan penurunan ke target terbuka lebar, sedangkan kenaikan kembali di atas ${slStr} akan menandakan kegagalan breakdown dan membatalkan skenario Short.`;

  return `${params.position} ${cleanPair}

${paragraph1}

🟢 Entry: ${entryStr}
🎯 Take Profit: ${tpStr}
🔴 Stop-Loss: ${slStr}

${paragraph2}`;
}
