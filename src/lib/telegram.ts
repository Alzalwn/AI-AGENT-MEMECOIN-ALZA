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
// MAIN: Kirim sinyal baru ke Telegram (format profesional)
// ─────────────────────────────────────────────────────────
export async function sendSignalAlert(
  signal: TradingSignal,
  config: TelegramConfig
): Promise<boolean> {
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

  const text =
    `🚨 <b>SOLANA AI ALPHA SIGNAL</b> 🚨\n` +
    `${tierEmoji} <b>${tierLabel} · $${token.symbol}</b> — ${token.name}\n` +
    `🏷️ Platform: ${token.platform} · ${marketContext.isGraduated ? 'Raydium ✅' : 'Pump.fun'}\n` +
    `📊 MC: ~${fmtUsd(marketContext.marketCapUsd)} | LP: ${fmtUsd(marketContext.liquidityUsd)} (${marketContext.lpBurntPct}% Burnt)\n` +
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

  return sendTelegramMessage(config, text, keyboard);
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

  const text =
    `${emoji} <b>${title}</b>\n\n` +
    `🪙 <b>$${token.symbol}</b> — ${token.name}\n` +
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
  const text =
    `🚨 <b>ALPHA SIGNAL</b> 🚨\n\n` +
    `🪙 <b>$${token.symbol}</b> (${token.name})\n` +
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
  const text =
    `🎯 <b>POSITION ALERT</b>\n\n` +
    `🪙 <b>$${token.symbol}</b>\n` +
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
  const text =
    `${emoji} <b>${isProfit ? 'PROFIT' : 'LOSS'} ALERT</b>\n\n` +
    `🪙 <b>$${trade.token.symbol}</b>\n` +
    `📊 P&L: <b>${sign}${trade.pnlSol.toFixed(4)} SOL (${sign}${trade.pnlPct.toFixed(2)}%)</b>\n` +
    `📝 Reason: ${trade.exitReason}`;
  return sendTelegramMessage(config, text);
}

export async function sendTelegramRugpullWarning(
  token: TokenSignal,
  config: TelegramConfig,
  riskDetails: string
): Promise<boolean> {
  const text =
    `⚠️ <b>RUGPULL / RISK DETECTED</b>\n\n` +
    `🪙 <b>$${token.symbol}</b>\n` +
    `🚨 Risk: ${riskDetails}\n` +
    `🛡️ Sinyal DIBATALKAN oleh Risk Agent.`;
  return sendTelegramMessage(config, text);
}
