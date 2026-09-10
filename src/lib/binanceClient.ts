/**
 * Binance Futures API Client with Multi-Endpoint Failover
 * Mendukung pembacaan data publik Binance Futures (Zero-API Key / Non-Custodial).
 * Memiliki mekanisme failover otomatis jika endpoint utama dibatasi oleh ISP/WAF.
 */

import { BtcMarketContext } from '../types/futures';

// Bypass local Windows certificate issues in dev if necessary
if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const PRIMARY_FUTURES_URL = 'https://fapi.binance.com';
const FALLBACK_FUTURES_URLS = [
  'https://testnet.binancefuture.com',
  'https://data-api.binance.vision',
];

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (entry && Date.now() < entry.expiresAt) {
    return entry.data;
  }
  return null;
}

function setCached<T>(key: string, data: T, ttlMs: number): void {
  memoryCache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
}

/**
 * Fetch generic dengan failover bertingkat
 */
export async function fetchWithFailover(endpoint: string, options?: RequestInit): Promise<Response> {
  const urls = [PRIMARY_FUTURES_URL, ...FALLBACK_FUTURES_URLS];
  let lastError: Error | null = null;

  const defaultHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: 'application/json',
    ...(options?.headers || {}),
  };

  for (const baseUrl of urls) {
    try {
      // Sesuaikan path jika menggunakan mirror data-api.binance.vision
      let finalUrl = `${baseUrl}${endpoint}`;
      if (baseUrl.includes('binance.vision')) {
        if (endpoint.startsWith('/fapi/v1/ticker/24hr')) {
          finalUrl = `${baseUrl}/api/v3/ticker/24hr${endpoint.replace('/fapi/v1/ticker/24hr', '')}`;
        } else if (endpoint.startsWith('/fapi/v1/klines')) {
          finalUrl = `${baseUrl}/api/v3/klines${endpoint.replace('/fapi/v1/klines', '')}`;
        }
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(finalUrl, {
        ...options,
        headers: defaultHeaders,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const contentType = res.headers.get('content-type') || '';

      // Verifikasi bahwa status OK DAN content-type adalah JSON (mencegah halaman blokir HTML dari ISP)
      if (res.ok && contentType.includes('application/json')) {
        return res;
      }

      // Jika response berupa HTML (indikasi ISP redirect/block page) atau error HTTP, coba mirror berikutnya
      continue;
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      // Coba endpoint selanjutnya
    }
  }

  throw lastError || new Error(`Gagal menghubungi semua endpoint Binance untuk ${endpoint}`);
}

export interface Raw24hTicker {
  symbol: string;
  lastPrice: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
}

export interface RawFundingRate {
  symbol: string;
  markPrice: string;
  indexPrice: string;
  lastFundingRate: string;
  nextFundingTime: number;
}

/**
 * Mengambil semua 24h Ticker Futures untuk SEMUA KOIN di Binance
 */
export async function getFutures24hTickers(): Promise<Raw24hTicker[]> {
  const cacheKey = 'binance_futures_tickers_24h';
  const cached = getCached<Raw24hTicker[]>(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetchWithFailover('/fapi/v1/ticker/24hr');
    const data = await res.json();
    if (Array.isArray(data)) {
      // Filter hanya pasangan USDT (misalnya BTCUSDT, ETHUSDT)
      const usdtPairs = data.filter((t: Raw24hTicker) => t.symbol.endsWith('USDT'));
      setCached(cacheKey, usdtPairs, 20_000); // 20 detik cache
      return usdtPairs;
    }
    return [];
  } catch (err) {
    console.warn('[BinanceClient] Gagal mengambil 24h tickers:', err);
    return getCached<Raw24hTicker[]>(cacheKey) || [];
  }
}

/**
 * Mengambil Funding Rate dan Mark Price untuk semua koin
 */
export async function getFundingRates(): Promise<Map<string, RawFundingRate>> {
  const cacheKey = 'binance_funding_rates';
  const cached = getCached<Map<string, RawFundingRate>>(cacheKey);
  if (cached) return cached;

  const map = new Map<string, RawFundingRate>();
  try {
    const res = await fetchWithFailover('/fapi/v1/premiumIndex');
    const data = await res.json();
    if (Array.isArray(data)) {
      for (const item of data) {
        if (item.symbol?.endsWith('USDT')) {
          map.set(item.symbol, item);
        }
      }
      setCached(cacheKey, map, 30_000); // 30 detik cache
    }
  } catch (err) {
    console.warn('[BinanceClient] Gagal mengambil funding rates:', err);
  }
  return map;
}

/**
 * Mengambil Klines (candlestick) untuk analisa teknikal (EMA, RSI, S/R)
 * Default limit ditingkatkan ke 100 agar MA(99) dan MACD dapat dihitung dengan presisi penuh
 */
export async function getKlines(
  symbol: string,
  interval: '15m' | '1h' | '4h' = '15m',
  limit: number = 100
): Promise<number[][]> {
  const cacheKey = `klines_${symbol}_${interval}_${limit}`;
  const cached = getCached<number[][]>(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetchWithFailover(`/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
    const rawData = await res.json();
    if (Array.isArray(rawData)) {
      // Format Binance Klines: [openTime, open, high, low, close, volume, ...]
      const parsed = rawData.map((k: Array<string | number>) => [
        Number(k[0]), // time
        parseFloat(String(k[1])), // open
        parseFloat(String(k[2])), // high
        parseFloat(String(k[3])), // low
        parseFloat(String(k[4])), // close
        parseFloat(String(k[5])), // volume
      ]);
      setCached(cacheKey, parsed, 30_000); // 30 detik cache
      return parsed;
    }
  } catch (err) {
    console.warn(`[BinanceClient] Gagal mengambil klines untuk ${symbol}:`, err);
  }
  return [];
}

/**
 * Mengambil ticker 24h untuk satu koin spesifik (misal BTCUSDT)
 */
export async function getFuturesSingleTicker(symbol: string): Promise<Raw24hTicker | null> {
  const cleanSymbol = symbol.trim().toUpperCase();
  const cacheKey = `single_ticker_${cleanSymbol}`;
  const cached = getCached<Raw24hTicker>(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetchWithFailover(`/fapi/v1/ticker/24hr?symbol=${cleanSymbol}`);
    const data = await res.json();
    if (data && data.symbol) {
      setCached(cacheKey, data as Raw24hTicker, 15_000);
      return data as Raw24hTicker;
    }
  } catch (err) {
    console.warn(`[BinanceClient] Gagal mengambil ticker untuk ${cleanSymbol}:`, err);
  }
  return null;
}

/**
 * Mengambil data Funding Rate & Premium Index untuk satu koin spesifik
 */
export async function getSingleFundingRate(symbol: string): Promise<RawFundingRate | null> {
  const cleanSymbol = symbol.trim().toUpperCase();
  const cacheKey = `single_funding_${cleanSymbol}`;
  const cached = getCached<RawFundingRate>(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetchWithFailover(`/fapi/v1/premiumIndex?symbol=${cleanSymbol}`);
    const data = await res.json();
    if (data && data.symbol) {
      setCached(cacheKey, data as RawFundingRate, 30_000);
      return data as RawFundingRate;
    }
  } catch (err) {
    console.warn(`[BinanceClient] Gagal mengambil funding rate untuk ${cleanSymbol}:`, err);
  }
  return null;
}

/**
 * Mengambil Open Interest Riil dari Binance Futures
 */
export async function getFuturesOpenInterest(symbol: string): Promise<number | null> {
  const cleanSymbol = symbol.trim().toUpperCase();
  const cacheKey = `open_interest_${cleanSymbol}`;
  const cached = getCached<number>(cacheKey);
  if (cached !== null) return cached;

  try {
    const res = await fetchWithFailover(`/fapi/v1/openInterest?symbol=${cleanSymbol}`);
    const data = await res.json();
    if (data && data.openInterest) {
      const oi = parseFloat(data.openInterest);
      if (!isNaN(oi)) {
        setCached(cacheKey, oi, 20_000);
        return oi;
      }
    }
  } catch (err) {
    console.warn(`[BinanceClient] Gagal mengambil Open Interest untuk ${cleanSymbol}:`, err);
  }
  return null;
}

/**
 * Mengambil Global Long/Short Account Ratio Riil dari Binance Futures
 */
export async function getFuturesLongShortRatio(symbol: string): Promise<number | null> {
  const cleanSymbol = symbol.trim().toUpperCase();
  const cacheKey = `long_short_ratio_${cleanSymbol}`;
  const cached = getCached<number>(cacheKey);
  if (cached !== null) return cached;

  try {
    const res = await fetchWithFailover(`/futures/data/globalLongShortAccountRatio?symbol=${cleanSymbol}&period=15m&limit=1`);
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0 && data[0].longShortRatio) {
      const ratio = parseFloat(data[0].longShortRatio);
      if (!isNaN(ratio)) {
        setCached(cacheKey, ratio, 30_000);
        return ratio;
      }
    }
  } catch {
    // Failover otomatis: jika endpoint data statistik tidak merespon di jaringan lokal, cache null sejenak
    setCached(cacheKey, null as unknown as number, 60_000);
  }
  return null;
}

/**
 * Memeriksa Kondisi Induk Pasar (BTC Market Guard) untuk proteksi sinyal Altcoin
 */
export async function getBtcMarketContext(): Promise<BtcMarketContext> {
  const cacheKey = 'btc_market_context_telemetry';
  const cached = getCached<BtcMarketContext>(cacheKey);
  if (cached) return cached;

  try {
    const [ticker, klines] = await Promise.all([
      getFuturesSingleTicker('BTCUSDT'),
      getKlines('BTCUSDT', '15m', 20),
    ]);

    const price = ticker ? parseFloat(ticker.lastPrice) : 65000;
    let change15mPct = 0;
    let change1hPct = 0;

    if (klines && klines.length >= 4) {
      const lastClose = klines[klines.length - 1][4];
      const prev15mClose = klines[klines.length - 2][4];
      const prev1hClose = klines[klines.length - 5]?.[4] ?? klines[0][4];

      change15mPct = Number((((lastClose - prev15mClose) / prev15mClose) * 100).toFixed(2));
      change1hPct = Number((((lastClose - prev1hClose) / prev1hClose) * 100).toFixed(2));
    } else if (ticker) {
      change15mPct = 0;
      change1hPct = parseFloat(ticker.priceChangePercent) / 10;
    }

    let trend: BtcMarketContext['trend'] = 'NEUTRAL';
    let isSafeForAltLong = true;
    let warningMessage: string | undefined;

    if (change15mPct <= -0.75 || change1hPct <= -1.8) {
      trend = 'DUMP_ALERT';
      isSafeForAltLong = false;
      warningMessage = `🚨 WASPADA TINGGI: Bitcoin (BTC) sedang dump tajam (${change15mPct > 0 ? '+' : ''}${change15mPct}% 15m / ${change1hPct}% 1h). Sinyal LONG Altcoin/Memecoin sangat berisiko terkena fakeout terseret market!`;
    } else if (change15mPct <= -0.35 || change1hPct <= -0.8) {
      trend = 'BEARISH';
      isSafeForAltLong = false;
      warningMessage = `⚠️ PERINGATAN: Tren BTC 15m sedang melemah (${change15mPct}%). Sangat disarankan wait & see atau hindari posisi LONG agresif pada Altcoin/Memecoin.`;
    } else if (change15mPct >= 0.75 || change1hPct >= 1.8) {
      trend = 'STRONG_BULLISH';
      isSafeForAltLong = true;
    } else if (change15mPct >= 0.2 || change1hPct >= 0.5) {
      trend = 'BULLISH';
      isSafeForAltLong = true;
    }

    const context: BtcMarketContext = {
      symbol: 'BTCUSDT',
      price,
      change15mPct,
      change1hPct,
      trend,
      warningMessage,
      isSafeForAltLong,
    };

    setCached(cacheKey, context, 20_000); // 20 detik cache
    return context;
  } catch (err) {
    console.warn('[BinanceClient] Gagal menghitung BTC context:', err);
    return {
      symbol: 'BTCUSDT',
      price: 0,
      change15mPct: 0,
      change1hPct: 0,
      trend: 'NEUTRAL',
      isSafeForAltLong: true,
    };
  }
}

