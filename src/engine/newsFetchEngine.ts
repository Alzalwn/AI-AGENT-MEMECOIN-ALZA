/**
 * News Fetch Engine (Public Mode)
 * Mengambil berita crypto dari sumber publik tanpa API key (CoinTelegraph RSS, CoinDesk RSS, Decrypt RSS, CryptoPanic).
 * Dilengkapi caching in-memory 15 menit agar tidak membebani server dan responsif.
 */

import { CryptoNewsItem } from '@/types/newsTypes';

interface CacheEntry {
  data: CryptoNewsItem[];
  timestamp: number;
}

let newsCache: CacheEntry | null = null;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 menit

// Daftar token umum yang sering dipantau di futures
const KNOWN_CURRENCIES = [
  'BTC', 'ETH', 'SOL', 'AVAX', 'BNB', 'DOGE', 'XRP', 'ADA', 'LINK',
  'NEAR', 'SUI', 'APT', 'PEPE', 'SHIB', 'WIF', 'BONK', 'RENDER', 'FET',
  'ARB', 'OP', 'TIA', 'INJ', 'SEI', 'KULR'
];

/**
 * Ekstrak simbol crypto dari judul dan teks berita
 */
function extractCurrencies(text: string): string[] {
  const upper = text.toUpperCase();
  const matched = new Set<string>();

  // Cek kata kunci nama & simbol
  const aliases: Record<string, string> = {
    BITCOIN: 'BTC',
    ETHEREUM: 'ETH',
    SOLANA: 'SOL',
    AVALANCHE: 'AVAX',
    RIPPLE: 'XRP',
    DOGECOIN: 'DOGE',
    CARDANO: 'ADA',
    CHAINLINK: 'LINK',
  };

  for (const [name, sym] of Object.entries(aliases)) {
    if (upper.includes(name)) {
      matched.add(sym);
    }
  }

  for (const sym of KNOWN_CURRENCIES) {
    // Cari kecocokan kata utuh misal $BTC atau BTC
    const regex = new RegExp(`(^|[^A-Z0-9])${sym}([^A-Z0-9]|$)`, 'i');
    if (regex.test(text)) {
      matched.add(sym);
    }
  }

  return Array.from(matched);
}

/**
 * Parser sederhana untuk RSS XML tanpa library eksternal
 */
function parseRssXml(xmlText: string, sourceName: string): CryptoNewsItem[] {
  const items: CryptoNewsItem[] = [];
  const itemRegex = /<item[\s\S]*?<\/item>/gi;
  const matchItems = xmlText.match(itemRegex) || [];

  for (const rawItem of matchItems.slice(0, 15)) {
    const titleMatch = rawItem.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
    const linkMatch = rawItem.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/i);
    const pubDateMatch = rawItem.match(/<pubDate>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/pubDate>/i);
    const descMatch = rawItem.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);

    const title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : '';
    const url = linkMatch ? linkMatch[1].trim() : '';
    const publishedAt = pubDateMatch ? pubDateMatch[1].trim() : new Date().toISOString();
    const rawDesc = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : '';

    if (title) {
      const currencies = extractCurrencies(`${title} ${rawDesc}`);
      items.push({
        id: Buffer.from(url || title).toString('base64').slice(0, 16),
        title,
        url,
        publishedAt,
        source: sourceName,
        currencies,
        body: rawDesc.slice(0, 300),
      });
    }
  }

  return items;
}

/**
 * Fetch berita dari CoinTelegraph RSS
 */
async function fetchCoinTelegraph(): Promise<CryptoNewsItem[]> {
  try {
    const res = await fetch('https://cointelegraph.com/rss', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      next: { revalidate: 900 }
    });
    if (!res.ok) return [];
    const text = await res.text();
    return parseRssXml(text, 'CoinTelegraph');
  } catch (err) {
    console.warn('[NewsFetch] Failed to fetch CoinTelegraph RSS:', err);
    return [];
  }
}

/**
 * Fetch berita dari CoinDesk RSS
 */
async function fetchCoinDesk(): Promise<CryptoNewsItem[]> {
  try {
    const res = await fetch('https://www.coindesk.com/arc/outboundfeeds/rss/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      next: { revalidate: 900 }
    });
    if (!res.ok) return [];
    const text = await res.text();
    return parseRssXml(text, 'CoinDesk');
  } catch (err) {
    console.warn('[NewsFetch] Failed to fetch CoinDesk RSS:', err);
    return [];
  }
}

/**
 * Fetch berita dari CryptoPanic Public Feed
 */
async function fetchCryptoPanicPublic(): Promise<CryptoNewsItem[]> {
  try {
    // CryptoPanic public RSS feed
    const res = await fetch('https://cryptopanic.com/news/rss/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      next: { revalidate: 900 }
    });
    if (!res.ok) return [];
    const text = await res.text();
    return parseRssXml(text, 'CryptoPanic');
  } catch (err) {
    console.warn('[NewsFetch] Failed to fetch CryptoPanic RSS:', err);
    return [];
  }
}

/**
 * Mengambil berita crypto terkini dari seluruh agregator publik
 */
export async function fetchRecentCryptoNews(forceRefresh = false): Promise<CryptoNewsItem[]> {
  const now = Date.now();
  if (!forceRefresh && newsCache && now - newsCache.timestamp < CACHE_TTL_MS) {
    return newsCache.data;
  }

  // Jalankan fetch paralel
  const [ctNews, cdNews, cpNews] = await Promise.all([
    fetchCoinTelegraph(),
    fetchCoinDesk(),
    fetchCryptoPanicPublic(),
  ]);

  const combined = [...cpNews, ...ctNews, ...cdNews];

  // Dedup berdasarkan judul mirip atau url
  const seenTitles = new Set<string>();
  const uniqueItems: CryptoNewsItem[] = [];

  for (const item of combined) {
    const cleanTitle = item.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40);
    if (!seenTitles.has(cleanTitle)) {
      seenTitles.add(cleanTitle);
      uniqueItems.push(item);
    }
  }

  // Urutkan berdasarkan waktu publikasi descending jika memungkinkan
  uniqueItems.sort((a, b) => {
    const timeA = new Date(a.publishedAt).getTime() || 0;
    const timeB = new Date(b.publishedAt).getTime() || 0;
    return timeB - timeA;
  });

  const finalResults = uniqueItems.slice(0, 30);
  newsCache = {
    data: finalResults,
    timestamp: now,
  };

  return finalResults;
}

/**
 * Filter berita berdasarkan simbol token (misal: 'AVAX' atau 'AVAXUSDT' -> 'AVAX')
 */
export async function getNewsForSymbol(symbol: string): Promise<CryptoNewsItem[]> {
  const baseCurrency = symbol.replace(/USDT$|BUSD$|USDC$|PERP$/i, '').toUpperCase();
  const allNews = await fetchRecentCryptoNews();

  return allNews.filter((item) => {
    if (item.currencies && item.currencies.includes(baseCurrency)) return true;
    const titleUpper = item.title.toUpperCase();
    return (
      titleUpper.includes(baseCurrency) ||
      (item.body && item.body.toUpperCase().includes(baseCurrency))
    );
  });
}
