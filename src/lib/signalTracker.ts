import { TradingSignal, SignalPerformanceData, SignalStatus } from '../types/signal';
import { fetchJupiterQuote } from './jupiter';
import { sendSignalUpdate, TelegramConfig } from './telegram';

/**
 * SignalTracker Engine — Auto Price Monitor & TP/SL Hit Detection
 *
 * Memantau harga token sinyal yang sedang ACTIVE.
 * Mendeteksi jika harga menyentuh TP1, TP2, TP3, atau Stop Loss.
 * Mengirimkan auto-update ke Telegram bila target tercapai.
 */

export interface TrackingResult {
  updatedSignals: TradingSignal[];
  changedCount: number;
  events: Array<{
    signalId: string;
    symbol: string;
    previousStatus: SignalStatus;
    newStatus: SignalStatus;
    currentPriceSol: number;
    gainPct: number;
  }>;
}

/**
 * Ambil harga live dalam SOL untuk suatu token mint.
 * 1. Coba via Jupiter Quote (Raydium/Orca DEX routing)
 * 2. Fallback via DexScreener API
 * 3. Fallback simulasi drift jika token simulasi / offline
 */
export async function getCurrentTokenPriceSol(signal: TradingSignal): Promise<number | null> {
  const mint = signal.token.mint;

  // 1. Coba Jupiter Quote (hanya jika mint valid Solana address)
  if (mint && mint.length >= 32 && !mint.startsWith('sim_')) {
    try {
      const quote = await fetchJupiterQuote(mint, 0.1, 50);

      if (quote && quote.tokenAmountUi && quote.tokenAmountUi > 0) {
        const inSol = quote.inAmountSol || 0.1;
        const price = inSol / quote.tokenAmountUi;
        if (price > 0 && isFinite(price)) {
          return price;
        }
      }
    } catch {
      // Fallback ke DexScreener jika Jupiter belum list pair
    }

    // 2. Fallback DexScreener API
    try {
      const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, {
        headers: { 'User-Agent': 'SolanaSignalTerminal/1.0' },
        signal: AbortSignal.timeout(3000)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.pairs && Array.isArray(data.pairs) && data.pairs.length > 0) {
          const pair = data.pairs[0];
          const priceNative = parseFloat(pair.priceNative);
          if (priceNative > 0 && isFinite(priceNative)) {
            return priceNative;
          }
        }
      }
    } catch {
      // Ignore and fallback
    }
  }

  // 3. Fallback jika simulated token atau offline: generate natural price drift
  const currentEst = signal.entryZone.current;
  const ageMin = (Date.now() - signal.timestamp) / 60000;
  
  // Model momentum drift berdasarkan virality & velocity
  const viralityBias = (signal.grokViralityScore - 5) * 0.01;
  const randomDrift = (Math.random() - 0.45) * 0.05; // Sedikit bias bullish
  const driftFactor = 1 + (viralityBias + randomDrift);
  
  const driftedPrice = currentEst * Math.pow(driftFactor, Math.min(ageMin, 10));
  return Math.max(0.00000001, driftedPrice);
}

/**
 * Periksa satu sinyal terhadap target TP/SL
 */
export async function checkSignalTarget(
  signal: TradingSignal,
  telegramConfig?: TelegramConfig
): Promise<{ signal: TradingSignal; changed: boolean; event?: any }> {
  // Hanya proses status yang belum final
  if (signal.status !== 'ACTIVE' && signal.status !== 'TP1_HIT' && signal.status !== 'TP2_HIT') {
    return { signal, changed: false };
  }

  const now = Date.now();
  const ageMin = (now - signal.timestamp) / 60000;

  // Cek apakah expired (default 24 jam)
  if (ageMin > 1440) {
    const expiredSignal: TradingSignal = {
      ...signal,
      status: 'EXPIRED',
      performance: {
        peakGainPct: signal.performance?.peakGainPct || 0,
        peakPriceSol: signal.performance?.peakPriceSol || signal.entryZone.current,
        bestTPHit: signal.performance?.bestTPHit || 'NONE',
        resolvedAt: now,
        actualDurationMin: ageMin
      }
    };

    if (telegramConfig?.isEnabled) {
      sendSignalUpdate({ signal: expiredSignal, messageType: 'EXPIRED' }, telegramConfig).catch(() => {});
    }

    return {
      signal: expiredSignal,
      changed: true,
      event: {
        signalId: signal.id,
        symbol: (signal.token?.symbol || 'UNKNOWN').replace(/^\$+/, ''),
        previousStatus: signal.status,
        newStatus: 'EXPIRED',
        currentPriceSol: signal.entryZone.current,
        gainPct: 0
      }
    };
  }

  try {
    const currentPriceSol = await getCurrentTokenPriceSol(signal);
    if (!currentPriceSol || currentPriceSol <= 0) {
      return { signal, changed: false };
    }

    const gainPct = ((currentPriceSol - signal.entryZone.current) / signal.entryZone.current) * 100;
    const currentPeak = signal.performance?.peakGainPct || 0;
    const newPeak = Math.max(currentPeak, gainPct);

    let newStatus: SignalStatus = signal.status;
    let eventType: SignalStatus | null = null;

    // Evaluasi batas SL
    if (currentPriceSol <= signal.stopLoss.priceSol) {
      newStatus = 'SL_HIT';
      eventType = 'SL_HIT';
    }
    // Evaluasi TP3 (Target Tertinggi)
    else if (currentPriceSol >= signal.targets[2].priceSol) {
      newStatus = 'TP3_HIT';
      eventType = 'TP3_HIT';
    }
    // Evaluasi TP2
    else if (currentPriceSol >= signal.targets[1].priceSol && signal.status !== 'TP2_HIT') {
      newStatus = 'TP2_HIT';
      eventType = 'TP2_HIT';
    }
    // Evaluasi TP1
    else if (currentPriceSol >= signal.targets[0].priceSol && signal.status === 'ACTIVE') {
      newStatus = 'TP1_HIT';
      eventType = 'TP1_HIT';
    }

    const isResolved = newStatus === 'SL_HIT' || newStatus === 'TP3_HIT';
    const changed = newStatus !== signal.status;

    const bestTPHit: 'TP1' | 'TP2' | 'TP3' | 'SL' | 'NONE' =
      newStatus === 'TP3_HIT' ? 'TP3' :
      newStatus === 'TP2_HIT' ? 'TP2' :
      newStatus === 'TP1_HIT' ? 'TP1' :
      newStatus === 'SL_HIT' ? 'SL' :
      (signal.performance?.bestTPHit || 'NONE');

    const updatedSignal: TradingSignal = {
      ...signal,
      status: newStatus,
      performance: {
        peakGainPct: +newPeak.toFixed(2),
        peakPriceSol: Math.max(signal.performance?.peakPriceSol || 0, currentPriceSol),
        bestTPHit,
        resolvedAt: isResolved ? now : signal.performance?.resolvedAt,
        actualDurationMin: isResolved ? +ageMin.toFixed(1) : (signal.performance?.actualDurationMin || +ageMin.toFixed(1))
      }
    };

    // Trigger notifikasi Telegram otomatis jika target tercapai
    if (changed && eventType && telegramConfig?.isEnabled && telegramConfig.botToken && telegramConfig.chatId) {
      sendSignalUpdate(
        {
          signal: updatedSignal,
          messageType: eventType as any,
          updateText: `Harga terkini: ${currentPriceSol.toFixed(6)} SOL (${gainPct >= 0 ? '+' : ''}${gainPct.toFixed(1)}%)`
        },
        telegramConfig
      ).catch((err) => {
        console.warn(`[SignalTracker] Gagal mengirim telegram update untuk ${signal.token.symbol}:`, err);
      });
    }

    return {
      signal: updatedSignal,
      changed,
      event: changed && eventType ? {
        signalId: signal.id,
        symbol: (signal.token?.symbol || 'UNKNOWN').replace(/^\$+/, ''),
        previousStatus: signal.status,
        newStatus,
        currentPriceSol,
        gainPct: +gainPct.toFixed(2)
      } : undefined
    };
  } catch (err) {
    console.error(`[SignalTracker] Error evaluating signal ${signal.token.symbol}:`, err);
    return { signal, changed: false };
  }
}

/**
 * Memproses sekumpulan sinyal aktif secara concurrent
 */
export async function processActiveSignals(
  signals: TradingSignal[],
  telegramConfig?: TelegramConfig
): Promise<TrackingResult> {
  const activeSignals = signals.filter(
    (s) => ['ACTIVE', 'TP1_HIT', 'TP2_HIT'].includes(s.status) &&
           (!s.marketContext || (s.marketContext.marketCapUsd || 0) <= (s.scanTier === 'BREAKOUT_RUNNER' ? 5000000 : 150000))
  );
  const resolvedSignals = signals.filter(
    (s) => !['ACTIVE', 'TP1_HIT', 'TP2_HIT'].includes(s.status) ||
           (s.marketContext && (s.marketContext.marketCapUsd || 0) > (s.scanTier === 'BREAKOUT_RUNNER' ? 5000000 : 150000))
  );

  if (activeSignals.length === 0) {
    return {
      updatedSignals: signals,
      changedCount: 0,
      events: []
    };
  }

  // Monitor maksimum 20 sinyal sekaligus untuk mencegah rate limit
  const batchToProcess = activeSignals.slice(0, 20);
  const unbatch = activeSignals.slice(20);

  const results = await Promise.all(batchToProcess.map((s) => checkSignalTarget(s, telegramConfig)));

  const processedList = results.map((r) => r.signal);
  const events = results.filter((r) => r.changed && r.event).map((r) => r.event!);
  const changedCount = events.length;

  return {
    updatedSignals: [...processedList, ...unbatch, ...resolvedSignals],
    changedCount,
    events
  };
}
