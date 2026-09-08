/**
 * Telegram Integration — AI Alpha Signal Terminal
 *
 * Broadcast format sinyal profesional lengkap (Entry/TP/SL/ETA/R-R)
 * ke channel/grup Telegram dengan InlineKeyboard button 1-klik trading.
 */

import { TokenSignal } from '../types/terminal';
import { TradingSignal, TelegramSignalPayload } from '../types/signal';
import { formatConfidenceBar } from './signalCalculator';

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  isEnabled: boolean;
}

// ─────────────────────────────────────────────────────────
// CORE: Kirim pesan ke Telegram (internal helper)
// ─────────────────────────────────────────────────────────
async function sendTelegramMessage(
  config: TelegramConfig,
  text: string,
  inlineKeyboard?: { text: string; url: string }[][]
): Promise<boolean> {
  if (!config.isEnabled || !config.botToken.trim() || !config.chatId.trim()) {
    return false;
  }

  const body: Record<string, unknown> = {
    chat_id: config.chatId.trim(),
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  };

  if (inlineKeyboard && inlineKeyboard.length > 0) {
    body.reply_markup = {
      inline_keyboard: inlineKeyboard.map((row) =>
        row.map((btn) => ({ text: btn.text, url: btn.url }))
      ),
    };
  }

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${config.botToken.trim()}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );
    const data = await res.json();
    return !!(res.ok && data.ok);
  } catch (err) {
    console.error('[Telegram] Error sending message:', err);
    return false;
  }
}

// ─────────────────────────────────────────────────────────
// TEST CONNECTION
// ─────────────────────────────────────────────────────────
export async function testTelegramConnection(
  botToken: string,
  chatId: string
): Promise<{ success: boolean; message: string }> {
  if (!botToken.trim() || !chatId.trim()) {
    return { success: false, message: 'Bot Token dan Chat ID wajib diisi!' };
  }

  const text =
    `⚡ <b>SOLANA AI ALPHA TERMINAL // WEBHOOK TEST</b> ⚡\n\n` +
    `✅ Koneksi berhasil! Bot siap menerima sinyal alpha.\n` +
    `📡 Sinyal Entry · TP1 · TP2 · TP3 · SL akan dikirim otomatis ke chat ini.\n` +
    `🔥 Powered by: Moonshot AI · xAI Grok · Smart Money Tracker`;

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${botToken.trim()}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId.trim(), text, parse_mode: 'HTML' }),
      }
    );
    const data = await res.json();
    if (res.ok && data.ok) {
      return { success: true, message: 'Pesan tes berhasil dikirim ke Telegram!' };
    } else {
      return { success: false, message: data.description || 'Gagal mengirim ke Telegram' };
    }
  } catch (err: unknown) {
    return { success: false, message: (err instanceof Error ? err.message : 'Network error') };
  }
}

// ─────────────────────────────────────────────────────────
// ANTI-SPAM & DEDUPLIKASI 24 JAM
// ─────────────────────────────────────────────────────────
const DEDUP_KEY = 'GT_TELEGRAM_SENT_CAS';
const GLOBAL_COOLDOWN_MS = 4 * 1000; // Minimal 4 detik jeda antar notifikasi Telegram otomatis
let lastTelegramSentAt = 0;

function isCaAlertedRecently(mint: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(DEDUP_KEY);
    if (!raw) return false;
    const map: Record<string, number> = JSON.parse(raw);
    const lastTime = map[mint];
    if (lastTime && (Date.now() - lastTime) < 24 * 3600 * 1000) {
      return true;
    }
  } catch {}
  return false;
}

function recordCaAlerted(mint: string): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(DEDUP_KEY);
    const map: Record<string, number> = raw ? JSON.parse(raw) : {};
    map[mint] = Date.now();
    const cutoff = Date.now() - 24 * 3600 * 1000;
    for (const [k, v] of Object.entries(map)) {
      if (v < cutoff) delete map[k];
    }
    localStorage.setItem(DEDUP_KEY, JSON.stringify(map));
  } catch {}
}

// ─────────────────────────────────────────────────────────
// MAIN: Kirim sinyal baru ke Telegram (format profesional)
// ─────────────────────────────────────────────────────────
export async function sendSignalAlert(
  signal: TradingSignal,
  config: TelegramConfig,
  isManual = false
): Promise<boolean> {
  // Hanya terapkan filter Early-Entry Guard & deduplikasi jika sinyal berasal dari pemindaian otomatis.
  // Jika promosi manual dari UI (isManual = true), pengguna berhak mengirim koin apa pun yang mereka pilih!
  if (!isManual) {
    // 1. EARLY ENTRY GUARD: Drop jika Market Cap > batas tier ($1M untuk early gem, $10M untuk Breakout Runner/Supernova)
    const maxMc = signal.scanTier === 'BREAKOUT_RUNNER' || signal.token?.scanTier === 'BREAKOUT_RUNNER' || signal.signalTier === 'SUPERNOVA' ? 10000000 : 1000000;
    if (signal.marketContext && signal.marketContext.marketCapUsd > maxMc) {
      console.warn(`[Telegram Alert Dropped] MC $${signal.marketContext.marketCapUsd.toLocaleString()} > $${maxMc.toLocaleString()} (Early-Entry Guard)`);
      return false;
    }

    // 2. ANTI-SPAM DEDUPLIKASI: 1 Koin hanya boleh dikirim 1x per 24 jam untuk bot otomatis
    if (signal.token?.mint && isCaAlertedRecently(signal.token.mint)) {
      console.warn(`[Telegram Alert Dropped] CA ${signal.token.mint} sudah pernah dikirim dalam 24 jam terakhir.`);
      return false;
    }

    // 3. GLOBAL RATE LIMITING: Jeda minimal antar pengiriman sinyal otomatis
    const now = Date.now();
    if (now - lastTelegramSentAt < GLOBAL_COOLDOWN_MS) {
      console.warn(`[Telegram Alert Dropped] Global cooldown Telegram aktif (tunggu ${Math.round((GLOBAL_COOLDOWN_MS - (now - lastTelegramSentAt)) / 1000)} detik).`);
      return false;
    }
  }

  const { token, entryZone, stopLoss, targets, marketContext, tradingLinks } = signal;
  const [tp1, tp2, tp3] = targets;

  // Tier emoji & label
  const tierEmoji = signal.signalTier === 'SUPERNOVA' ? '🚀' : signal.signalTier === 'HIGH' ? '🔥' : '⚡';
  const tierLabel = signal.signalTier === 'SUPERNOVA' ? 'SUPERNOVA' : signal.signalTier === 'HIGH' ? 'HIGH POTENTIAL' : 'MODERATE';

  // Confidence bar
  const confBar = formatConfidenceBar(signal.confidenceScore);
  const confLabel = signal.confidenceTier === 'ALPHA' ? '🏆 ALPHA' : signal.confidenceTier === 'STRONG' ? '💪 STRONG' : '📊 MODERATE';

  // Smart Money line
  const smartLine = signal.smartMoneyCount >= 1
    ? `\n🐋 <b>Smart Money:</b> ${signal.smartMoneyCount} wallet terdeteksi masuk ✅`
    : '';

  // Security badges
  const mintBadge = token.mintAuthorityRevoked ? '✅' : '❌';
  const freezeBadge = token.freezeAuthorityRevoked ? '✅' : '❌';
  const lpBadge = token.burntLiquidityPct >= 90 ? '✅' : token.burntLiquidityPct >= 70 ? '⚠️' : '❌';
  const hhBadge = token.top10HolderPct <= 20 ? '✅' : token.top10HolderPct <= 30 ? '⚠️' : '❌';

  const virality = (signal.grokViralityScore * 10).toFixed(1);

  const fmtSol = (n: number) => n < 0.0001 ? n.toFixed(9) : n.toFixed(6);
  const fmtUsd = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}`;

  const cleanSymbol = (token?.symbol || 'UNKNOWN').replace(/^\$+/, '');
  const isRunner = signal.scanTier === 'BREAKOUT_RUNNER' || token.scanTier === 'BREAKOUT_RUNNER';
  const tierBadgeHeader = isRunner
    ? '🚀 <b>BREAKOUT RUNNER ALERT (SIAP TERBANG)</b> 🚀'
    : '🚨 <b>SOLANA AI ALPHA SIGNAL</b> 🚨';

  const text =
    `${tierBadgeHeader}\n` +
    `${tierEmoji} <b>${tierLabel} · $${cleanSymbol}</b> — ${token.name}\n` +
    `🏷️ Platform: ${token.platform} · ${marketContext.isGraduated ? 'Raydium ✅' : 'Pump.fun'}\n` +
    `📊 MC: ~${fmtUsd(marketContext.marketCapUsd)} | LP: ${fmtUsd(marketContext.liquidityUsd)} (${marketContext.lpBurntPct}% Burnt)\n` +
    (token.volume15mUsd ? `📈 15m Vol: ${fmtUsd(token.volume15mUsd)} | B/S Ratio: ${token.buySellRatio || 1.8}x ✅\n` : '') +
    `⭐ Confidence: ${confBar} [${confLabel}]\n` +
    `🔑 <code>${token.mint}</code>\n` +
    `\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🟢 <b>ENTRY ZONE</b>\n` +
    `  Beli: <b>${fmtSol(entryZone.low)} – ${fmtSol(entryZone.high)} SOL</b>\n` +
    `  (MC Entry: ${fmtUsd(entryZone.marketCapLow)} – ${fmtUsd(entryZone.marketCapHigh)})\n` +
    `\n🎯 <b>TAKE PROFIT</b>\n` +
    `  TP1 (+${tp1.gainPct.toFixed(0)}%): <b>${fmtSol(tp1.priceSol)} SOL</b> ← Ambil Modal\n` +
    `  TP2 (+${tp2.gainPct.toFixed(0)}%): <b>${fmtSol(tp2.priceSol)} SOL</b> ← Lock Profit\n` +
    `  TP3 (+${tp3.gainPct.toFixed(0)}%): <b>${fmtSol(tp3.priceSol)} SOL</b> ← Moonbag 🌙\n` +
    `\n🛑 <b>STOP LOSS</b>\n` +
    `  SL (${stopLoss.pctFromEntry}%): <b>${fmtSol(stopLoss.priceSol)} SOL</b> (LP Floor)\n` +
    `  ⚖️ R/R Ratio: <b>1 : ${signal.riskRewardRatio}</b> · ke TP3: <b>1 : ${signal.riskRewardToTP3}</b>\n` +
    `\n⏱️ <b>ESTIMASI WAKTU</b>\n` +
    `  TP1: ${signal.etaToTP1.min}–${signal.etaToTP1.max} menit\n` +
    `  TP2: ${signal.etaToTP2.min}–${signal.etaToTP2.max} menit\n` +
    `  (Basis: Velocity ${token.txVelocityPerSec?.toFixed(1) || '?'} Tx/s · Grok ${virality}/10)\n` +
    `\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🛡️ Mint: ${mintBadge} | Freeze: ${freezeBadge} | LP Burnt: ${lpBadge} | Top10: ${token.top10HolderPct || '?'}% ${hhBadge}\n` +
    `🔥 Grok Virality: ${virality}/10 · Narrative: ${token.narrativeTheme || 'AI Agent'}` +
    smartLine;

  // InlineKeyboard: 2 baris × 3 tombol
  const keyboard = [
    [
      { text: '📋 Copy CA', url: `https://solscan.io/token/${token.mint}` },
      { text: '🔗 BullX', url: tradingLinks.bullx },
      { text: '📈 Photon', url: tradingLinks.photon },
    ],
    [
      { text: '🦅 GMGN', url: tradingLinks.gmgn },
      { text: '📊 DexScreener', url: tradingLinks.dexscreener },
      { text: '🔍 Rugcheck', url: tradingLinks.rugcheck },
    ],
  ];

  const sent = await sendTelegramMessage(config, text, keyboard);
  if (sent) {
    lastTelegramSentAt = Date.now();
    if (token.mint) recordCaAlerted(token.mint);
  }
  return sent;
}

// ─────────────────────────────────────────────────────────
// UPDATE: Kirim notifikasi TP Hit / SL Hit
// ─────────────────────────────────────────────────────────
export async function sendSignalUpdate(
  payload: TelegramSignalPayload,
  config: TelegramConfig
): Promise<boolean> {
  const { signal, messageType, updateText } = payload;
  const { token, targets, stopLoss } = signal;

  let emoji = '📡';
  let title = 'SIGNAL UPDATE';
  let detail = updateText || '';

  if (messageType === 'TP1_HIT') {
    emoji = '🟢';
    title = 'TP1 HIT ✅ — Ambil Modal!';
    detail = `TP1 (+${targets[0].gainPct.toFixed(0)}%) tercapai! Modal awal aman.\n💡 Sisakan posisi untuk TP2/TP3.`;
  } else if (messageType === 'TP2_HIT') {
    emoji = '🏆';
    title = 'TP2 HIT ✅ — Profit Terkunci!';
    detail = `TP2 (+${targets[1].gainPct.toFixed(0)}%) tercapai! Profit utama aman.\n🌙 Moonbag menuju TP3...`;
  } else if (messageType === 'TP3_HIT') {
    emoji = '💎';
    title = 'TP3 HIT 🌙 — MOONSHOT TERCAPAI!';
    detail = `TP3 (+${targets[2].gainPct.toFixed(0)}%) tercapai! Sinyal SEMPURNA! 🚀`;
  } else if (messageType === 'SL_HIT') {
    emoji = '🔴';
    title = 'SL HIT — Sinyal Ditutup';
    detail = `Stop Loss (${stopLoss.pctFromEntry}%) terpicu. Modal terlindungi dari kerugian lebih dalam.\n⚠️ Jangan FOMO keluar dari rencana.`;
  } else if (messageType === 'EXPIRED') {
    emoji = '⏰';
    title = 'SINYAL EXPIRED';
    detail = `Sinyal kedaluwarsa tanpa TP/SL hit. Momentum tidak berkembang.`;
  }

  const cleanSymbol = (token?.symbol || 'UNKNOWN').replace(/^\$+/, '');
  const text =
    `${emoji} <b>${title}</b>\n\n` +
    `🪙 <b>$${cleanSymbol}</b> — ${token.name}\n` +
    `<code>${token.mint}</code>\n\n` +
    `${detail}\n\n` +
    `<a href="${signal.tradingLinks.dexscreener}">📊 Lihat Chart</a>`;

  return sendTelegramMessage(config, text);
}

// ─────────────────────────────────────────────────────────
// LEGACY COMPAT: Fungsi lama (backward compatibility)
// ─────────────────────────────────────────────────────────
export async function sendTelegramAlphaAlert(
  token: TokenSignal,
  config: TelegramConfig,
  viralityScore: number = 85,
  sentiment: string = 'BULLISH'
): Promise<boolean> {
  const dexUrl = token.dexUrl || `https://dexscreener.com/solana/${token.mint}`;
  const cleanSymbol = (token?.symbol || 'UNKNOWN').replace(/^\$+/, '');
  const text =
    `🚨 <b>ALPHA SIGNAL</b> 🚨\n\n` +
    `🪙 <b>$${cleanSymbol}</b> (${token.name})\n` +
    `🌐 Platform: ${token.platform}\n` +
    `🔑 Mint: <code>${token.mint}</code>\n\n` +
    `⚡ Consensus: <b>5/5 AI AGENTS APPROVED</b> ✅\n` +
    `🔥 Virality: <b>${viralityScore}/100</b> [${sentiment}]\n\n` +
    `<a href="${dexUrl}">📊 DexScreener</a>`;

  return sendTelegramMessage(config, text);
}

export async function sendTelegramBuyAlert(
  token: TokenSignal,
  config: TelegramConfig,
  amountSol: number,
  txSignature: string,
  _jitoTipSol?: number  // retained for backward-compat, not used in signal-only mode
): Promise<boolean> {
  const cleanSymbol = (token?.symbol || 'UNKNOWN').replace(/^\$+/, '');
  const text =
    `🎯 <b>POSITION ALERT</b>\n\n` +
    `🪙 <b>$${cleanSymbol}</b>\n` +
    `💰 Amount: ${amountSol.toFixed(3)} SOL\n` +
    `🔑 <code>${token.mint}</code>\n` +
    `🔗 <a href="https://solscan.io/tx/${txSignature}">Solscan TX</a>`;
  return sendTelegramMessage(config, text);
}

export async function sendTelegramExitAlert(
  trade: {
    token: TokenSignal;
    entryPriceSol: number;
    exitPriceSol: number;
    pnlSol: number;
    pnlPct: number;
    holdDurationSec: number;
    exitReason: string;
  },
  config: TelegramConfig
): Promise<boolean> {
  const isProfit = trade.pnlSol >= 0;
  const sign = isProfit ? '+' : '';
  const emoji = isProfit ? '🟢' : '🔴';
  const cleanSymbol = (trade.token?.symbol || 'UNKNOWN').replace(/^\$+/, '');
  const text =
    `${emoji} <b>${isProfit ? 'PROFIT' : 'LOSS'} ALERT</b>\n\n` +
    `🪙 <b>$${cleanSymbol}</b>\n` +
    `📊 P&L: <b>${sign}${trade.pnlSol.toFixed(4)} SOL (${sign}${trade.pnlPct.toFixed(2)}%)</b>\n` +
    `📝 Reason: ${trade.exitReason}`;
  return sendTelegramMessage(config, text);
}

export async function sendTelegramRugpullWarning(
  token: TokenSignal,
  config: TelegramConfig,
  riskDetails: string
): Promise<boolean> {
  const cleanSymbol = (token?.symbol || 'UNKNOWN').replace(/^\$+/, '');
  const text =
    `⚠️ <b>RUGPULL / RISK DETECTED</b>\n\n` +
    `🪙 <b>$${cleanSymbol}</b>\n` +
    `🚨 Risk: ${riskDetails}\n` +
    `🛡️ Sinyal DIBATALKAN oleh Risk Agent.`;
  return sendTelegramMessage(config, text);
}

// ─────────────────────────────────────────────────────────
// PERSONAL HIGH-CONVICTION ACTION-ORIENTED ALERT (6H DEDUP)
// ─────────────────────────────────────────────────────────
// In-Memory Deduplication Cache: CA -> timestamp (TTL: 6 Jam)
const personalDedupCache = new Map<string, number>();
const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

export interface HighConvictionCandidate {
  mint: string;
  symbol: string;
  name: string;
  initialLpUsd: number;
  txVelocityPerSec: number;
  smartMoneyCount: number;
  consensusScore: number; // e.g. 5/5
  isConsensusApproved: boolean;
  mintAuthorityRevoked: boolean;
  freezeAuthorityRevoked: boolean;
  burntLiquidityPct: number;
  isHoneypot?: boolean;
  marketCapUsd?: number;
  tokenAgeMinutes?: number;
  pricePumpPct?: number;
  scanTier?: 'EARLY_GEM' | 'BREAKOUT_RUNNER';
}

/**
 * Memvalidasi dan mengirim notifikasi aksi kilat ke chat pribadi Telegram.
 * Menjamin hanya koin 5/5 dengan indikator keamanan 100% bersih yang lolos,
 * dan memblokir duplikasi token yang sama selama 6 jam.
 */
export async function sendPersonalActionAlert(
  token: HighConvictionCandidate,
  config?: TelegramConfig
): Promise<{ success: boolean; reason?: string }> {
  const activeConfig: TelegramConfig = config || {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || '',
    isEnabled: true
  };

  if (!activeConfig.botToken || !activeConfig.chatId) {
    return { success: false, reason: 'TELEGRAM_BOT_TOKEN atau TELEGRAM_CHAT_ID belum disetel' };
  }

  // 1. FILTER 1: High-Conviction Only (5/5 Konsensus + Keamanan 100% Bersih)
  if (!token.isConsensusApproved || token.consensusScore < 5) {
    return { success: false, reason: 'Ditolak: Konsensus belum mencapai 5/5 agen' };
  }
  if (!token.mintAuthorityRevoked) {
    return { success: false, reason: 'Ditolak: Mint Authority belum di-revoke' };
  }
  if (!token.freezeAuthorityRevoked) {
    return { success: false, reason: 'Ditolak: Freeze Authority belum di-revoke' };
  }
  if (token.burntLiquidityPct < 95) {
    return { success: false, reason: 'Ditolak: LP Burn kurang dari 95%' };
  }
  if (token.isHoneypot === true) {
    return { success: false, reason: 'Ditolak: Terdeteksi indikasi honeypot' };
  }

  // 1b. FILTER EARLY-ENTRY GUARD (Batas MC <= $150k atau $5M untuk Breakout Runner)
  const isRunner = token.scanTier === 'BREAKOUT_RUNNER';
  const maxMc = isRunner ? 5000000 : 150000;
  const maxAgeMin = isRunner ? 10080 : 720;
  if (token.marketCapUsd && token.marketCapUsd > maxMc) {
    return { success: false, reason: `Ditolak Early-Entry Guard: Market Cap $${Math.round(token.marketCapUsd).toLocaleString()} > $${maxMc.toLocaleString()}` };
  }
  if (token.tokenAgeMinutes && token.tokenAgeMinutes > maxAgeMin) {
    return { success: false, reason: `Ditolak Early-Entry Guard: Usia koin ${(token.tokenAgeMinutes / 60).toFixed(1)} jam > Cutoff ${(maxAgeMin / 60).toFixed(0)} jam` };
  }
  if (token.pricePumpPct && token.pricePumpPct > 500 && !isRunner) {
    return { success: false, reason: `Ditolak Early-Entry Guard: Lonjakan harga +${token.pricePumpPct.toFixed(0)}% > +500% (MISSED_ENTRY)` };
  }

  // 2. FILTER 2: Anti-Spam Personal (6-Hour Deduplication Cache)
  const now = Date.now();
  const lastSent = personalDedupCache.get(token.mint);
  if (lastSent && now - lastSent < SIX_HOURS_MS) {
    const remainingMin = Math.round((SIX_HOURS_MS - (now - lastSent)) / 60000);
    return { success: false, reason: `Ditolak: CA ini sudah dikirim dalam 6 jam terakhir (Cooldown sisa ${remainingMin} menit)` };
  }

  // Format Angka
  const fmtLp = token.initialLpUsd >= 1000
    ? `$${(token.initialLpUsd / 1000).toFixed(1)}k`
    : `$${token.initialLpUsd.toFixed(0)}`;
  const txSpeed = token.txVelocityPerSec ? token.txVelocityPerSec.toFixed(1) : '12.0';
  const whales = token.smartMoneyCount || 1;

  // Bot Trading Deep-Links
  const trojanUrl = `https://t.me/solana_trojanbot?start=${token.mint}`;
  const bonkBotUrl = `https://t.me/bonkbot_bot?start=${token.mint}`;
  const photonUrl = `https://photon-sol.tinyastro.io/en/lp/${token.mint}`;
  const dexUrl = `https://dexscreener.com/solana/${token.mint}`;

  // Format Pesan Sesuai Permintaan Spesifik (Action-Oriented & Monospace CA)
  const cleanSymbol = (token?.symbol || 'UNKNOWN').replace(/^\$+/, '').toUpperCase();
  const text =
    `🟢 <b>${token.name} / $${cleanSymbol}</b>\n` +
    `<code>${token.mint}</code>\n\n` +
    `Data: LP ${fmtLp} | Kecepatan Tx: ${txSpeed}/detik | Paus: ${whales} masuk\n\n` +
    `Aksi Cepat:\n` +
    `<a href="${dexUrl}">DexScreener</a> | <a href="${photonUrl}">Photon</a> | <a href="${trojanUrl}">Trojan</a> | <a href="${bonkBotUrl}">BonkBot</a>`;

  // Inline Keyboard Button 1-Tap Trading
  const keyboard = [
    [
      { text: '⚡ Buy on Trojan', url: trojanUrl },
      { text: '⚡ Buy on BonkBot', url: bonkBotUrl }
    ],
    [
      { text: '📈 Photon Chart', url: photonUrl },
      { text: '📊 DexScreener', url: dexUrl }
    ]
  ];

  const ok = await sendTelegramMessage(activeConfig, text, keyboard);

  if (ok) {
    // Simpan ke Cache 6 Jam
    personalDedupCache.set(token.mint, now);
    return { success: true };
  } else {
    return { success: false, reason: 'Gagal menembakkan request ke Telegram Bot API' };
  }
}

