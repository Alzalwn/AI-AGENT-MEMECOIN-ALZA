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
  candlestickPattern?: {
    name: string;
    type?: string;
    reliability?: number;
  };
  bullBearDebate?: {
    winner: 'BULL' | 'BEAR' | 'NEUTRAL';
    summary: string;
    mitigationAdvice: string;
  };
  autoHedge?: {
    isHedgeNeeded: boolean;
    hedgePair: string;
    hedgeDirection: 'SHORT' | 'LONG';
    hedgeRatioPct: number;
    strategyObjective: string;
    gatekeeperStatus: 'APPROVED' | 'CAUTION' | 'RESTRICTED';
  };
  multiTimeframe?: {
    alignmentScore: number;
    badgeLabel: string;
    tf15mTrend: string;
    tf1hTrend: string;
    tf4hTrend: string;
    tf1dTrend: string;
  };
  // V3.0 Specific Additions
  volumeMultiplier?: number;
  maValues?: { ma7: number; ma25: number; ma99: number; };
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

  let header = `${params.position} ${cleanPair}`;
  
  // Rule 2: HEADER LEDAKAN VOLUME V3.0
  if (params.volumeMultiplier && params.volumeMultiplier >= 2.0) {
    header = `🚀 [BREAKOUT DETECTED - AGGRESSIVE ENTRY]\n💡 STRATEGI: VOLUME EXPANSION ${params.volumeMultiplier.toFixed(1)}x\n\n${params.position} ${cleanPair}`;
  }

  // 1. Paragraf 1: Narasi teknikal 1 kalimat (Rule 3: FORMAT MOVING AVERAGE EKSPLISIT)
  let paragraph1 = '';
  const maString = params.maValues 
    ? `MA(7)=$${params.maValues.ma7}, MA(25)=$${params.maValues.ma25}, MA(99)=$${params.maValues.ma99}`
    : '';

  if (params.technicalContext && params.technicalContext.trim() !== '') {
    let contextStr = params.technicalContext.trim().replace(/\.$/, '');
    // V3.0 Rule 1: Breakout Momentum, No "Pullback" reference
    contextStr = contextStr.replace(/pullback/gi, 'breakout momentum');
    
    paragraph1 = isLong
      ? `${baseAsset} menembus arah tren (breakout momentum) dan mendekati area resistance penting di sekitar ${entryStr}, sementara ${contextStr}.`
      : `${baseAsset} menembus arah tren (breakout momentum) dan mendekati area breakdown penting di sekitar ${entryStr}, sementara ${contextStr}.`;
    
    if (maString) {
       paragraph1 += `\nKondisi MA: ${maString}`;
    }
  } else {
    paragraph1 = isLong
      ? `${baseAsset} menembus arah tren (breakout momentum) dan mendekati area resistance penting di sekitar ${entryStr}.\nKondisi MA: ${maString}`
      : `${baseAsset} menembus arah tren (breakout momentum) dan mendekati area support krusial di sekitar ${entryStr}.\nKondisi MA: ${maString}`;
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
      ? `Jika harga mampu bertahan kuat di area ${entryStr} setelah momentum ini, peluang reli menuju TP1 ($${tp1Price}) dan TP2 ($${tp2Price}) hingga ekstensi TP3 ($${tp3Price}) akan semakin terbuka, sedangkan penurunan kembali di bawah ${slStr} akan menandakan hilangnya momentum terdekat dan melemahnya skenario Long.`
      : `Jika harga mampu bertahan di bawah area ${entryStr} setelah penolakan ini, peluang penurunan berjenjang menuju TP1 ($${tp1Price}) dan TP2 ($${tp2Price}) hingga ekstensi TP3 ($${tp3Price}) akan terbuka lebar, sedangkan kenaikan kembali di atas ${slStr} akan menandakan kegagalan momentum dan membatalkan skenario Short.`;
  } else {
    paragraph2 = isLong
      ? `Jika harga mampu bertahan kuat di area ${entryStr} setelah momentum ini, peluang untuk melanjutkan kenaikan akan semakin terbuka, sedangkan penurunan kembali di bawah ${slStr} akan menandakan hilangnya momentum terdekat dan melemahnya skenario Long.`
      : `Jika harga mampu bertahan di bawah area ${entryStr} setelah penolakan ini, peluang untuk melanjutkan penurunan ke target terbuka lebar, sedangkan kenaikan kembali di atas ${slStr} akan menandakan kegagalan momentum dan membatalkan skenario Short.`;
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
  if (params.candlestickPattern) {
    extraLines.push(`🕯️ Pola Candlestick: ${params.candlestickPattern.name} (${params.candlestickPattern.reliability ? `Akurasi ${params.candlestickPattern.reliability}%` : 'Valid'})`);
  }
  if (params.fundingRatePct !== undefined) {
    extraLines.push(`📊 Funding Rate: ${params.fundingRatePct > 0 ? '+' : ''}${params.fundingRatePct.toFixed(4)}%`);
  }
  if (params.bullBearDebate) {
    extraLines.push(`⚔️ Vonis Arbiter Debat: ${params.bullBearDebate.winner === 'BULL' ? 'Banteng (Bullish Win)' : params.bullBearDebate.winner === 'BEAR' ? 'Beruang (Bearish Win)' : 'Netral / Wait & See'}`);
    extraLines.push(`🛡️ Saran Mitigasi Risiko: ${params.bullBearDebate.mitigationAdvice}`);
  }
  if (params.autoHedge) {
    extraLines.push(`🚦 Risk Gatekeeper: [${params.autoHedge.gatekeeperStatus}]`);
    if (params.autoHedge.isHedgeNeeded) {
      extraLines.push(`🛡️ Auto-Hedge Delta-Neutral: Buka ${params.autoHedge.hedgeDirection} ${params.autoHedge.hedgePair} (${params.autoHedge.hedgeRatioPct}% Notional)`);
    }
  }
  // Rule 4: ANTI-HALUSINASI MTF 
  if (params.multiTimeframe) {
    // Determine strict verdict based on 🟢 and 🔴 counts
    let greenCount = 0;
    let redCount = 0;
    const trends = [
      params.multiTimeframe.tf15mTrend,
      params.multiTimeframe.tf1hTrend,
      params.multiTimeframe.tf4hTrend,
      params.multiTimeframe.tf1dTrend,
    ];
    trends.forEach(t => {
      if (t === 'BULLISH') greenCount++;
      else if (t === 'BEARISH') redCount++;
    });

    let mtfVerdict = params.multiTimeframe.badgeLabel;
    if (greenCount > redCount) {
      mtfVerdict = '🟢 Bullish (Super Kuat)';
    } else if (redCount > greenCount) {
      mtfVerdict = '🔴 Bearish (Super Kuat)';
    }

    extraLines.push(`📊 Konfluensi 4-Timeframe: [15m: ${params.multiTimeframe.tf15mTrend === 'BULLISH' ? '🟢' : '🔴'}] [1h: ${params.multiTimeframe.tf1hTrend === 'BULLISH' ? '🟢' : '🔴'}] [4h: ${params.multiTimeframe.tf4hTrend === 'BULLISH' ? '🟢' : '🔴'}] [Daily: ${params.multiTimeframe.tf1dTrend === 'BULLISH' ? '🟢' : '🔴'}] (${mtfVerdict})`);
  }
  if (params.binanceUrl) {
    extraLines.push(`🔗 Eksekusi di Binance: ${params.binanceUrl}`);
  }

  const extraSection = extraLines.length > 0 ? `\n\n${extraLines.join('\n')}` : '';

  return `${header}

${paragraph1}

🟢 Entry: ${entryStr}
${tpSection}
🔴 Stop-Loss: ${slStr}

${paragraph2}${extraSection}`;
}
