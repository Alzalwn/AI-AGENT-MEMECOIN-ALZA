/**
 * TradFi, ETF & Pre-Market Gatekeeper Blacklist
 * Modul terpusat untuk memblokir instrumen derivatif bursa tradisional,
 * ETF sintetis/leveraged, dan aset Pre-Market yang minim likuiditas serta memiliki spread lebar.
 *
 * ARSITEKTUR PERTAHANAN BERLAPIS:
 * Layer 0: Whitelist murni (50 Top Futures Binance) — tolak semua di luar ini
 * Layer 1: Blacklist statis simbol spesifik (KORU, CRCL, SPY, QQQ, dll).
 * Layer 2: Regex leveraged tokens dengan proteksi ketat (whitelist koin murni seperti JUP / JUPUSDT).
 * Layer 3: Deteksi pola instrumen Pre-Market / Pre-IPO synthetics.
 */

export interface BlacklistCheckResult {
  isBlacklisted: boolean;
  symbol: string;
  reason?: string;
  category?: 'TRADFI_EQUITY' | 'ETF_SYNTHETIC' | 'LEVERAGED_TOKEN' | 'PRE_MARKET';
}

/**
 * ============================================================
 * LAYER 0 — PURE CRYPTO WHITELIST (50 Top Binance Futures)
 * ============================================================
 * Hanya koin murni yang terdaftar di sini yang diizinkan masuk
 * ke mesin kalkulasi sinyal. Semua ticker lain DIBLOKIR di awal.
 *
 * Berdasarkan: Binance Futures top 50 by open interest & volume (Q3 2026)
 * Tidak termasuk: Leveraged tokens, ETF saham, Pre-Market synthetics
 */
export const PURE_CRYPTO_WHITELIST: Set<string> = new Set([
  // ── Layer 1: Blue Chips (BTC, ETH, Layer-1s) ──
  'BTCUSDT',
  'ETHUSDT',
  'SOLUSDT',
  'BNBUSDT',
  'XRPUSDT',
  'ADAUSDT',
  'AVAXUSDT',
  'DOTUSDT',
  'LINKUSDT',
  'LTCUSDT',
  'ATOMUSDT',
  'NEARUSDT',
  'APTUSDT',
  'SUIUSDT',
  'INJUSDT',
  'SEIUSDT',
  'ALGOUSDT',
  'FTMUSDT',
  'MATICUSDT',
  // ── Layer 2: DeFi Majors ──
  'UNIUSDT',
  'AAVEUSDT',
  'LDOUSDT',
  'MKRUSDT',
  'SNXUSDT',
  'CRVUSDT',
  'JUPUSDT',
  'RAYUSDT',
  'JITOUSDT',
  // ── Layer 3: Meme & Culture Coins (High Volume, Liquid) ──
  'DOGEUSDT',
  'SHIBUSDT',
  'PEPEUSDT',
  'FLOKIUSDT',
  'BONKUSDT',
  'WIFUSDT',
  'MEMEUSDT',
  'TRUMPUSDT',
  // ── Layer 4: Infra, Storage & AI ──
  'FILUSDT',
  'ARUSDT',
  'RENDERUSDT',
  'FETUSDT',
  'WLDUSDT',
  'TAIUSDT',
  // ── Layer 5: Exchange & Utility Tokens ──
  'OKBUSDT',
  'GTUSDT',
  'CAKEUSDT',
  // ── Layer 6: Gaming & Metaverse ──
  'SANDUSDT',
  'MANAUSDT',
  'AXSUSDT',
  'IMXUSDT',
  // ── Layer 7: Others (High Liquidity Altcoins) ──
  'OPUSDT',
  'ARBUSDT',
  'STXUSDT',
  'EIGENUSDT',
  'GALAUSDT',
  'ENSTUSDT',
  'PENDLEUSDT',
]);

/**
 * Mengecek apakah simbol ada dalam Pure Crypto Whitelist.
 * Gunakan ini sebagai GATE PERTAMA sebelum masuk ke mesin kalkulasi.
 *
 * @returns true jika koin diizinkan, false jika ditolak (non-whitelist)
 */
export function isCryptoPureWhitelisted(rawSymbol: string): boolean {
  if (!rawSymbol) return false;
  const clean = rawSymbol.trim().toUpperCase();
  return PURE_CRYPTO_WHITELIST.has(clean);
}



/**
 * Daftar Ticker Statis TradFi, ETF, Indeks, dan Derivatif Saham Tradisional
 * Termasuk koin yang dilaporkan memicu Stop Loss beruntun (KORU, CRCL)
 */
export const TRADFI_STATIC_BLACKLIST: Set<string> = new Set([
  // Ticker spesifik dari user yang memicu kerugian Stop Loss beruntun
  'KORU',
  'KORUUSDT',
  'CRCL',
  'CRCLUSDT',
  'MUU',
  'MUUUSDT',

  // ETF Tradisional & Indeks Pasar Saham
  'SPY',
  'SPYUSDT',
  'QQQ',
  'QQQUSDT',
  'TLT',
  'TLTUSDT',
  'GLD',
  'GLDUSDT',
  'SLV',
  'SLVUSDT',
  'USO',
  'USOUSDT',
  'IWM',
  'IWMUSDT',
  'EEM',
  'EEMUSDT',
  'VXX',
  'VXXUSDT',
  'UVXY',
  'UVXYUSDT',
  'SQQQ',
  'SQQQUSDT',
  'TQQQ',
  'TQQQUSDT',
  'SOXL',
  'SOXLUSDT',
  'SOXS',
  'SOXSUSDT',
  'NVDL',
  'NVDLUSDT',
  'TSLL',
  'TSLLUSDT',
  'AAPU',
  'AAPUUSDT',

  // Derivatif Ekuitas / Saham TradFi & Pre-IPO Synthetics
  'NVDA',
  'NVDAUSDT',
  'TSLA',
  'TSLAUSDT',
  'AAPL',
  'AAPLUSDT',
  'MSFT',
  'MSFTUSDT',
  'AMZN',
  'AMZNUSDT',
  'GOOG',
  'GOOGUSDT',
  'META',
  'METAUSDT',
  'COIN',
  'COINUSDT',
]);

/**
 * Whitelist token kripto asli yang namanya kebetulan memiliki substring UP/DOWN/BULL/BEAR
 * Contoh: JUP (Jupiter), SUPER (SuperVerse), PUP, CUP, dll agar TIDAK salah diblokir.
 */
const LEGITIMATE_CRYPTO_WHITELIST: Set<string> = new Set([
  'JUP',
  'JUPUSDT',
  'SUPER',
  'SUPERUSDT',
  'PUP',
  'PUPUSDT',
  'CUP',
  'CUPUSDT',
  'UPP',
  'UPPUSDT',
  'DOWN', // Hanya jika ada token murni bernama DOWN
]);

/**
 * Regex untuk mendeteksi token leverage (seperti BTCUP, ETHDOWN, SOLBULL, XRPBEAR)
 * Pola ketat: minimal 2 karakter aset dasar diikuti UP/DOWN/BULL/BEAR dan opsional USDT
 */
const LEVERAGED_SUFFIX_REGEX = /^([A-Z0-9]{2,6})(UP|DOWN|BULL|BEAR)(USDT)?$/i;

/**
 * Regex untuk token leverage berbasis perkalian (misal BTC3L, ETH3S, SOL2L, dll)
 */
const LEVERAGED_MULTIPLIER_REGEX = /^([A-Z0-9]{2,6})(2L|2S|3L|3S|5L|5S)(USDT)?$/i;

/**
 * Regex untuk token Pre-Market / Pre-IPO sintetis
 */
const PRE_MARKET_REGEX = /^(PRE[_\-]|[A-Z0-9]+[_\-]PRE|.*PREUSDT$)/i;

/**
 * Mengecek apakah suatu simbol terdaftar dalam Blacklist TradFi / ETF / Pre-Market
 */
export function isTradFiOrEtfBlacklisted(rawSymbol: string): BlacklistCheckResult {
  if (!rawSymbol) {
    return { isBlacklisted: false, symbol: '' };
  }

  const clean = rawSymbol.trim().toUpperCase();
  const withoutUsdt = clean.endsWith('USDT') ? clean.slice(0, -4) : clean;

  // 1. Cek Whitelist Kripto Murni Terlebih Dahulu (Proteksi terhadap JUP, SUPER, dll)
  if (LEGITIMATE_CRYPTO_WHITELIST.has(clean) || LEGITIMATE_CRYPTO_WHITELIST.has(withoutUsdt)) {
    return {
      isBlacklisted: false,
      symbol: clean,
    };
  }

  // 2. Cek Blacklist Statis Simbol TradFi & ETF (KORU, CRCL, SPY, QQQ, dll)
  if (TRADFI_STATIC_BLACKLIST.has(clean) || TRADFI_STATIC_BLACKLIST.has(withoutUsdt)) {
    const isSpecialCase = clean.includes('KORU') || clean.includes('CRCL');
    return {
      isBlacklisted: true,
      symbol: clean,
      category: isSpecialCase ? 'PRE_MARKET' : 'TRADFI_EQUITY',
      reason: isSpecialCase
        ? `⛔ GATEKEEPER VETO: Ticker "${clean}" adalah derivatif Pre-Market/TradFi dengan spread lebar dan likuiditas minim yang dilarang diperdagangkan untuk mencegah Stop Loss beruntun.`
        : `⛔ GATEKEEPER VETO: Ticker "${clean}" terdaftar sebagai instrumen ekuitas/ETF bursa tradisional (TradFi). Dilarang diperdagangkan di radar kripto.`,
    };
  }

  // 3. Cek Regex Leveraged Token (misal: BTCUPUSDT, ETHDOWNUSDT, SOLBULLUSDT)
  const leveragedMatch = clean.match(LEVERAGED_SUFFIX_REGEX);
  if (leveragedMatch) {
    const base = leveragedMatch[1];
    // Pastikan bukan bagian dari whitelist
    if (!LEGITIMATE_CRYPTO_WHITELIST.has(base)) {
      return {
        isBlacklisted: true,
        symbol: clean,
        category: 'LEVERAGED_TOKEN',
        reason: `⛔ GATEKEEPER VETO: Ticker "${clean}" terdeteksi sebagai Leveraged Token (${leveragedMatch[2]}). Risiko peluruhan volatilitas (volatility decay) dan likuiditas spread lebar.`,
      };
    }
  }

  // 4. Cek Regex Multiplier Leveraged Token (misal: BTC3LUSDT, ETH3SUSDT)
  const multMatch = clean.match(LEVERAGED_MULTIPLIER_REGEX);
  if (multMatch) {
    const base = multMatch[1];
    if (!LEGITIMATE_CRYPTO_WHITELIST.has(base)) {
      return {
        isBlacklisted: true,
        symbol: clean,
        category: 'LEVERAGED_TOKEN',
        reason: `⛔ GATEKEEPER VETO: Ticker "${clean}" terdeteksi sebagai Multiplier Leveraged Token (${multMatch[2]}). Berbahaya untuk Stop Loss mekanik.`,
      };
    }
  }

  // 5. Cek Pola Pre-Market
  if (PRE_MARKET_REGEX.test(clean) && clean !== 'PREUSDT') {
    return {
      isBlacklisted: true,
      symbol: clean,
      category: 'PRE_MARKET',
      reason: `⛔ GATEKEEPER VETO: Ticker "${clean}" terdeteksi sebagai aset Pre-Market. Memiliki spread lebar dan likuiditas tidak stabil.`,
    };
  }

  return {
    isBlacklisted: false,
    symbol: clean,
  };
}

/**
 * Ringkasan audit untuk panel antarmuka dan log sistem
 */
export function getTradFiBlacklistSummary(): {
  totalStaticBlacklist: number;
  featuredBlacklist: string[];
} {
  return {
    totalStaticBlacklist: TRADFI_STATIC_BLACKLIST.size,
    featuredBlacklist: ['KORU', 'CRCL', 'MUU', 'SPY', 'QQQ', 'TLT', 'SOXL', 'UP/DOWN Tokens', 'Pre-Market Synthetics'],
  };
}
