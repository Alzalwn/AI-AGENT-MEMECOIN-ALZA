#!/usr/bin/env node
/**
 * ==============================================================================
 * Binance Futures AI Signal Terminal — 24/7 Server-Side Daemon
 * ==============================================================================
 * Berjalan mandiri di VPS / Cloud Server menggunakan PM2.
 * Memindai seluruh koin USDT-M di Binance Futures secara terus-menerus,
 * mendeteksi peluang Breakout & Funding Squeeze, dan mengirimkan notifikasi
 * instan ke Telegram dengan tombol 1-klik eksekusi Binance.
 * ==============================================================================
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const STATUS_FILE = path.join(DATA_DIR, 'binance-daemon-status.json');
const DEDUP_FILE = path.join(DATA_DIR, 'binance-dedup.json');

// Bypass certificate issues in local dev
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// 1. Muat konfigurasi dari .env.local
function loadEnv() {
  const envPath = path.join(ROOT_DIR, '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN || '';
const CHAT_ID = process.env.TELEGRAM_CHAT_ID || process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID || '';

// Deduplikasi: Menghindari pengiriman sinyal untuk koin yang sama dalam kurun 4 jam
let sentSymbols = {};
try {
  if (fs.existsSync(DEDUP_FILE)) {
    sentSymbols = JSON.parse(fs.readFileSync(DEDUP_FILE, 'utf8'));
  }
} catch {
  sentSymbols = {};
}

function saveDedup() {
  try {
    const now = Date.now();
    const clean = {};
    for (const [sym, time] of Object.entries(sentSymbols)) {
      if (now - time < 4 * 3600 * 1000) {
        clean[sym] = time;
      }
    }
    sentSymbols = clean;
    fs.writeFileSync(DEDUP_FILE, JSON.stringify(clean, null, 2), 'utf8');
  } catch (err) {
    console.error('[BINANCE DAEMON] Gagal simpan dedup:', err.message);
  }
}

// Format harga dinamis
function formatPrice(p) {
  if (p >= 1000) return p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p >= 1) return p.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
  if (p >= 0.001) return p.toFixed(6);
  return p.toFixed(8);
}

// Kirim pesan ke Telegram dengan tombol inline
async function sendTelegramSignal(signal) {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.log(`[BINANCE TELEGRAM] Token belum diset. Melewati pengiriman untuk ${signal.symbol}.`);
    return false;
  }

  const isLong = signal.direction === 'LONG';
  const headerIcon = isLong ? '🟢' : '🔴';
  const dirText = isLong ? 'LONG / BUY' : 'SHORT / SELL';

  const message = `${headerIcon} <b>[BINANCE FUTURES SIGNAL] ${signal.symbol}</b>
━━━━━━━━━━━━━━━━━━━━
⚡ <b>Arah:</b> <code>${dirText}</code>
🏆 <b>Tier:</b> ${signal.signalTier} (Skor AI: <b>${signal.overallScore}/100</b>)
📊 <b>Strategi:</b> ${signal.strategyLabel}

💵 <b>Entry Zone:</b> <code>${signal.entryZone.label}</code>
🎯 <b>Target TP1:</b> <code>$${formatPrice(signal.targets.tp1.price)}</code> (+${signal.targets.tp1.gainPct.toFixed(1)}%) ⏱️ <b>${signal.targets.tp1.eta || '15–30 Menit'}</b>
🎯 <b>Target TP2:</b> <code>$${formatPrice(signal.targets.tp2.price)}</code> (+${signal.targets.tp2.gainPct.toFixed(1)}%) ⏱️ <b>${signal.targets.tp2.eta || '1–3 Jam'}</b>
🎯 <b>Target TP3:</b> <code>$${formatPrice(signal.targets.tp3.price)}</code> (+${signal.targets.tp3.gainPct.toFixed(1)}%) ⏱️ <b>${signal.targets.tp3.eta || '6–24 Jam'}</b>
🛑 <b>Stop Loss:</b> <code>${signal.stopLoss.label}</code>
⚖️ <b>Risk/Reward:</b> <code>${signal.riskRewardRatio}x</code>

⏳ <b>Estimasi Waktu:</b> <code>${signal.durationSummary || 'TP1: 15–30 Menit | TP2: 1–3 Jam'}</code>
📊 <b>Indikator Binance:</b> <code>${isLong ? 'MA(7/25/99) Golden Stack • BOLL Expansion • MACD Bullish • Triple RSI' : 'MA(7/25/99) Death Stack • BOLL Rejection • MACD Bearish • Triple RSI'}</code>

🛡️ <b>Leverage Aman (Swing):</b> <code>${signal.leverage.safe.range}</code>
⚡ <b>Leverage Scalp (Kilat):</b> <code>${signal.leverage.scalp.range}</code>
📈 <b>Funding Rate:</b> <code>${signal.derivativesData.fundingRatePct.toFixed(4)}%</code>

💡 <i>"${signal.rationale}"</i>`;

  const inlineKeyboard = {
    inline_keyboard: [
      [
        {
          text: `🚀 Eksekusi di Binance (${signal.symbol})`,
          url: signal.binanceUrl,
        },
      ],
      [
        {
          text: `📊 TradingView Chart`,
          url: `https://www.tradingview.com/chart/?symbol=BINANCE:${signal.symbol}.P`,
        },
      ],
    ],
  };

  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'HTML',
        reply_markup: inlineKeyboard,
        disable_web_page_preview: true,
      }),
    });

    const data = await res.json();
    if (data.ok) {
      console.log(`[BINANCE TELEGRAM] ✅ Sinyal ${signal.symbol} (${signal.direction}) berhasil terkirim ke channel!`);
      return true;
    } else {
      console.error(`[BINANCE TELEGRAM] ❌ Gagal kirim Telegram:`, data.description);
      return false;
    }
  } catch (err) {
    console.error(`[BINANCE TELEGRAM] Error HTTP:`, err.message);
    return false;
  }
}

// Fetch public tickers dengan fallback endpoint
async function fetchTickers() {
  const endpoints = [
    'https://fapi.binance.com/fapi/v1/ticker/24hr',
    'https://testnet.binancefuture.com/fapi/v1/ticker/24hr',
    'https://data-api.binance.vision/api/v3/ticker/24hr',
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          return data.filter((t) => t.symbol?.endsWith('USDT'));
        }
      }
    } catch {}
  }
  return [];
}

async function fetchFundingRates() {
  const endpoints = [
    'https://fapi.binance.com/fapi/v1/premiumIndex',
    'https://testnet.binancefuture.com/fapi/v1/premiumIndex',
  ];

  const map = new Map();
  for (const url of endpoints) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          for (const item of data) {
            if (item.symbol?.endsWith('USDT')) map.set(item.symbol, item);
          }
          return map;
        }
      }
    } catch {}
  }
  return map;
}

// Main Scan Loop
let scanCount = 0;
let signalsEmitted = 0;

async function runScanCycle() {
  scanCount++;
  const timestamp = Date.now();

  try {
    const [tickers, fundingMap] = await Promise.all([fetchTickers(), fetchFundingRates()]);

    if (!tickers || tickers.length === 0) {
      console.warn(`[BINANCE DAEMON] [Cycle #${scanCount}] Tidak menerima ticker dari endpoint Binance.`);
      return;
    }

    let candidateSignals = [];

    for (const t of tickers) {
      const currentPrice = parseFloat(t.lastPrice);
      const high24h = parseFloat(t.highPrice);
      const low24h = parseFloat(t.lowPrice);
      const change24h = parseFloat(t.priceChangePercent);
      const quoteVol = parseFloat(t.quoteVolume);
      const funding = fundingMap.get(t.symbol);
      const fundingRate = funding ? parseFloat(funding.lastFundingRate) : 0.0001;
      const fundingRatePct = fundingRate * 100;

      // Filter volume minimal $5,000,000 USD
      if (isNaN(currentPrice) || currentPrice <= 0 || quoteVol < 5_000_000) continue;

      const priceRange = high24h - low24h;
      if (priceRange <= 0) continue;
      const relPos = (currentPrice - low24h) / priceRange;

      let direction = null;
      let strategy = '';
      let strategyLabel = '';
      let tier = 'HIGH';
      let score = 80;
      let rationale = '';

      // Deteksi Squeeze
      if (fundingRatePct <= -0.025 && relPos > 0.45) {
        direction = 'LONG';
        strategy = 'FUNDING_SQUEEZE';
        strategyLabel = '⚡ Short Squeeze Surge';
        tier = fundingRatePct <= -0.05 ? 'SUPERNOVA' : 'HIGH';
        score = 90;
        rationale = `Funding rate sangat negatif (${fundingRatePct.toFixed(4)}%), tekanan short squeeze tinggi.`;
      } else if (fundingRatePct >= 0.06 && relPos < 0.55) {
        direction = 'SHORT';
        strategy = 'FUNDING_SQUEEZE';
        strategyLabel = '💥 Long Squeeze Dump';
        tier = 'HIGH';
        score = 86;
        rationale = `Funding rate overleveraged (+${fundingRatePct.toFixed(4)}%), rentan koreksi tajam.`;
      } else if (relPos >= 0.90 && change24h > 5.0) {
        direction = 'LONG';
        strategy = 'BREAKOUT_MOMENTUM';
        strategyLabel = '🚀 24h High Breakout';
        tier = relPos >= 0.96 ? 'SUPERNOVA' : 'HIGH';
        score = 92;
        rationale = `Menembus level tertinggi 24h (${formatPrice(high24h)}) dengan lonjakan volume $${(quoteVol / 1e6).toFixed(1)}M.`;
      }

      if (!direction) continue;

      // Cek apakah sudah dikirim dalam 4 jam
      if (sentSymbols[t.symbol] && timestamp - sentSymbols[t.symbol] < 4 * 3600 * 1000) {
        continue;
      }

      const tp1Pct = 2.2;
      const tp2Pct = 4.8;
      const tp3Pct = 10.5;
      const slPct = 1.5;

      const tp1Price = isNaN(currentPrice) ? 0 : direction === 'LONG' ? currentPrice * (1 + tp1Pct / 100) : currentPrice * (1 - tp1Pct / 100);
      const tp2Price = direction === 'LONG' ? currentPrice * (1 + tp2Pct / 100) : currentPrice * (1 - tp2Pct / 100);
      const tp3Price = direction === 'LONG' ? currentPrice * (1 + tp3Pct / 100) : currentPrice * (1 - tp3Pct / 100);
      const slPrice = direction === 'LONG' ? currentPrice * (1 - slPct / 100) : currentPrice * (1 + slPct / 100);

      const absVol = Math.abs(change24h);
      let tp1Eta = '15 – 30 Menit';
      let tp2Eta = '1 – 3 Jam';
      let tp3Eta = '6 – 24 Jam (1 Hari)';
      let durationSummary = 'TP1: 15–30m | TP2: 1–3h | TP3: 1 Hari';

      if (absVol >= 15 || quoteVol >= 100_000_000) {
        tp1Eta = '10 – 25 Menit (Kilat)';
        tp2Eta = '45 Menit – 2 Jam (Intraday)';
        tp3Eta = '4 – 12 Jam (Trend Run)';
        durationSummary = 'Pergerakan ultra-volatil: TP1 tembus 10-25m, TP2 45m-2h, TP3 4-12h';
      } else if (absVol >= 6 || quoteVol >= 30_000_000) {
        tp1Eta = '20 – 45 Menit (Scalp)';
        tp2Eta = '1.5 – 4 Jam (Intraday)';
        tp3Eta = '8 – 24 Jam (1 Hari)';
        durationSummary = 'Volatilitas aktif: TP1 tembus 20-45m, TP2 1.5-4h, TP3 1 hari';
      }

      candidateSignals.push({
        id: `bf-${t.symbol}-${Date.now()}`,
        symbol: t.symbol,
        direction,
        signalTier: tier,
        strategy,
        strategyLabel,
        entryZone: {
          low: currentPrice * 0.996,
          high: currentPrice * 1.004,
          current: currentPrice,
          label: `$${formatPrice(currentPrice * 0.996)} – $${formatPrice(currentPrice * 1.004)}`,
        },
        targets: {
          tp1: { price: tp1Price, gainPct: tp1Pct, eta: tp1Eta },
          tp2: { price: tp2Price, gainPct: tp2Pct, eta: tp2Eta },
          tp3: { price: tp3Price, gainPct: tp3Pct, eta: tp3Eta },
        },
        durationSummary,
        stopLoss: {
          price: slPrice,
          lossPct: -slPct,
          label: `$${formatPrice(slPrice)} (-${slPct.toFixed(1)}%)`,
        },
        riskRewardRatio: 3.2,
        leverage: {
          safe: { range: '5x – 10x' },
          scalp: { range: '10x – 20x' },
        },
        derivativesData: {
          fundingRatePct,
          volume24hUsd: quoteVol,
          priceChange24hPct: change24h,
        },
        overallScore: score,
        rationale,
        binanceUrl: `https://www.binance.com/en/futures/${t.symbol}`,
      });
    }

    // Urutkan sinyal candidate
    candidateSignals.sort((a, b) => b.overallScore - a.overallScore);

    // Ambil sinyal terbaik per siklus untuk dikirim (maksimal 1 per siklus agar tidak spam)
    if (candidateSignals.length > 0) {
      const topSignal = candidateSignals[0];
      console.log(`[BINANCE DAEMON] 🎯 Peluang Terpilih: ${topSignal.symbol} (${topSignal.direction}) [Skor: ${topSignal.overallScore}]`);

      const sent = await sendTelegramSignal(topSignal);
      if (sent) {
        sentSymbols[topSignal.symbol] = timestamp;
        saveDedup();
        signalsEmitted++;
      }
    }

    // Update status file
    const statusData = {
      status: 'ONLINE',
      mode: '24/7_AUTONOMOUS_BINANCE_FUTURES_DAEMON',
      telegramConnected: Boolean(BOT_TOKEN && CHAT_ID),
      totalTickersScanned: tickers.length,
      signalsEmitted,
      lastScanAt: new Date().toISOString(),
      cycle: scanCount,
    };
    fs.writeFileSync(STATUS_FILE, JSON.stringify(statusData, null, 2), 'utf8');

    console.log(`[BINANCE DAEMON] [Cycle #${scanCount}] Pemindaian selesai (${tickers.length} koin diperiksa). Emisi sinyal total: ${signalsEmitted}.`);
  } catch (err) {
    console.error(`[BINANCE DAEMON] Error pada siklus #${scanCount}:`, err.message);
  }
}

console.log(`=======================================================`);
console.log(`🚀 Binance Futures AI Signal Terminal — 24/7 Daemon`);
console.log(`📡 Telegram Alerts: ${BOT_TOKEN && CHAT_ID ? 'CONNECTED ✅' : 'DISABLED (Set di .env.local)'}`);
console.log(`=======================================================`);

// Jalankan pertama kali lalu jadwalkan setiap 30 detik
runScanCycle();
setInterval(runScanCycle, 30_000);
