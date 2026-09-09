/**
 * Generator Format Deskripsi Sinyal Trading Komunitas Kripto Telegram/Discord
 * Gaya bahasa analis kripto profesional Indonesia: natural, berbobot, meyakinkan, dan mudah dipahami.
 * Menjaga narasi lengkap TP1, TP2, TP3 serta seluruh data eksekusi tanpa ada yang terhapus.
 */

export interface TargetTierInfo {
  price: string | number;
  gainPct: number;
  eta?: string;
}

export interface SignalPostParams {
  pair: string;            // Misal: "ATOM/USDT", "BTC/USDT"
  position: 'LONG' | 'SHORT';
  entry: number | string;
  takeProfit?: number | string; // Fallback jika single TP
  targets?: {
    tp1: TargetTierInfo;
    tp2: TargetTierInfo;
    tp3: TargetTierInfo;
  };
  stopLoss: number | string;
  technicalContext?: string;
  riskRewardRatio?: number;
  durationSummary?: string;
  leverage?: {
    safe?: string;
    scalp?: string;
  };
  fundingRatePct?: number;
  binanceUrl?: string;
  overallScore?: number;
  strategyLabel?: string;
}

/**
 * Membentuk deskripsi narasi sinyal sesuai format baku komunitas kripto
 * dengan tetap mempertahankan target TP1, TP2, TP3 secara berjenjang.
 */
export function generateCommunitySignalPost(params: SignalPostParams): string {
  const isLong = params.position === 'LONG';
  const cleanPair = params.pair.includes('/') ? params.pair : `${params.pair.replace('USDT', '')}/USDT`;
  const baseAsset = cleanPair.split('/')[0];

  const entryStr = typeof params.entry === 'number' ? params.entry.toString() : params.entry;
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

  // 2. Format Target TP: Mendukung berjenjang TP1, TP2, TP3
  let tpSection = '';
  if (params.targets) {
    const { tp1, tp2, tp3 } = params.targets;
    tpSection = `🎯 Target TP1: $${tp1.price} (+${tp1.gainPct.toFixed(1)}%)${tp1.eta ? ` ⏱️ ${tp1.eta}` : ''}
🎯 Target TP2: $${tp2.price} (+${tp2.gainPct.toFixed(1)}%)${tp2.eta ? ` ⏱️ ${tp2.eta}` : ''}
🎯 Target TP3: $${tp3.price} (+${tp3.gainPct.toFixed(1)}%)${tp3.eta ? ` ⏱️ ${tp3.eta}` : ''}`;
  } else if (params.takeProfit) {
    tpSection = `🎯 Take Profit: ${params.takeProfit}`;
  }

  // 3. Paragraf 2: Skenario probabilitas 1 kalimat mencakup target TP1-TP3
  let paragraph2 = '';
  if (params.targets) {
    const tp1Price = params.targets.tp1.price;
    const tp2Price = params.targets.tp2.price;
    const tp3Price = params.targets.tp3.price;
    paragraph2 = isLong
      ? `Jika harga mampu bertahan kuat di area ${entryStr} setelah momentum ini, peluang reli menuju TP1 ($${tp1Price}) dan TP2 ($${tp2Price}) hingga ekstensi TP3 ($${tp3Price}) akan semakin terbuka, sedangkan penurunan kembali di bawah ${slStr} akan menandakan hilangnya area breakout terdekat dan melemahnya skenario Long.`
      : `Jika harga mampu bertahan di bawah area ${entryStr} setelah penolakan ini, peluang penurunan berjenjang menuju TP1 ($${tp1Price}) dan TP2 ($${tp2Price}) hingga ekstensi TP3 ($${tp3Price}) akan terbuka lebar, sedangkan kenaikan kembali di atas ${slStr} akan menandakan kegagalan breakdown dan membatalkan skenario Short.`;
  } else {
    paragraph2 = isLong
      ? `Jika harga mampu bertahan kuat di area ${entryStr} setelah momentum ini, peluang untuk melanjutkan kenaikan akan semakin terbuka, sedangkan penurunan kembali di bawah ${slStr} akan menandakan hilangnya area breakout terdekat dan melemahnya skenario Long.`
      : `Jika harga mampu bertahan di bawah area ${entryStr} setelah penolakan ini, peluang untuk melanjutkan penurunan ke target terbuka lebar, sedangkan kenaikan kembali di atas ${slStr} akan menandakan kegagalan breakdown dan membatalkan skenario Short.`;
  }

  // 4. Metadata Tambahan (Risk/Reward, Leverage, Funding, Binance Link)
  const extraLines: string[] = [];
  if (params.riskRewardRatio) {
    extraLines.push(`⚖️ Risk/Reward: ${params.riskRewardRatio}x`);
  }
  if (params.durationSummary) {
    extraLines.push(`⏳ Estimasi Waktu Tempuh: ${params.durationSummary}`);
  }
  if (params.leverage?.safe && params.leverage?.scalp) {
    extraLines.push(`🛡️ Leverage Aman (Swing): ${params.leverage.safe}`);
    extraLines.push(`⚡ Leverage Scalp (Kilat): ${params.leverage.scalp}`);
  }
  if (params.fundingRatePct !== undefined) {
    extraLines.push(`📊 Funding Rate: ${params.fundingRatePct > 0 ? '+' : ''}${params.fundingRatePct.toFixed(4)}%`);
  }
  if (params.binanceUrl) {
    extraLines.push(`🔗 Eksekusi di Binance: ${params.binanceUrl}`);
  }

  const extraSection = extraLines.length > 0 ? `\n\n${extraLines.join('\n')}` : '';

  return `${params.position} ${cleanPair}

${paragraph1}

🟢 Entry: ${entryStr}
${tpSection}
🔴 Stop-Loss: ${slStr}

${paragraph2}${extraSection}`;
}
