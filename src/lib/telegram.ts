import { TokenSignal } from '../types/terminal';

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  isEnabled: boolean;
}

export async function testTelegramConnection(botToken: string, chatId: string): Promise<{ success: boolean; message: string }> {
  if (!botToken.trim() || !chatId.trim()) {
    return { success: false, message: 'Bot Token dan Chat ID wajib diisi!' };
  }

  try {
    const text = `⚡ <b>GROK TRENCHER // TELEGRAM WEBHOOK TEST</b> ⚡\n\nKoneksi bot berhasil terhubung ke terminal Grok Trencher! Sinyal 5/5 AI Agent Consensus akan dikirimkan otomatis ke chat ini.`;
    const res = await fetch(`https://api.telegram.org/bot${botToken.trim()}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId.trim(),
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });

    const data = await res.json();
    if (res.ok && data.ok) {
      return { success: true, message: 'Pesan tes berhasil dikirim ke Telegram!' };
    } else {
      return { success: false, message: data.description || 'Gagal mengirim pesan ke Telegram' };
    }
  } catch (err: any) {
    return { success: false, message: err.message || 'Network error saat menghubungi Telegram API' };
  }
}

export async function sendTelegramAlphaAlert(
  token: TokenSignal,
  config: TelegramConfig,
  viralityScore: number = 85,
  sentiment: string = 'BULLISH',
  jitoTipSol: number = 0.000050
): Promise<boolean> {
  if (!config.isEnabled || !config.botToken.trim() || !config.chatId.trim()) {
    return false;
  }

  try {
    const dexUrl = token.dexUrl || (
      token.mint.includes('...')
        ? `https://dexscreener.com/search?q=${encodeURIComponent(token.symbol.replace('$', ''))}`
        : `https://dexscreener.com/search?q=${encodeURIComponent(token.mint)}`
    );
    const photonUrl = `https://photon-sol.tinyastro.io/en/lp/${token.mint}`;

    const text = `🚨 <b>GROK TRENCHER // 5-AGENT ALPHA ALERT</b> 🚨\n\n` +
      `🪙 <b>Token:</b> <b>${token.symbol}</b> (${token.name})\n` +
      `🌐 <b>Platform:</b> ${token.platform}\n` +
      `🔑 <b>Mint:</b> <code>${token.mint}</code>\n\n` +
      `⚡ <b>Consensus:</b> <b>5/5 AI AGENTS APPROVED</b> ✅\n` +
      `🔥 <b>xAI Grok Virality:</b> <b>${viralityScore}/100</b> [${sentiment}]\n` +
      `🧠 <b>Narrative Cos-Sim:</b> <b>${token.narrativeCosineSim.toFixed(2)}</b> (${token.narrativeTheme})\n` +
      `💧 <b>Initial LP:</b> $${token.initialLpUsd.toLocaleString()} USD\n` +
      `🛡️ <b>RugCheck:</b> ${token.rugcheckScore || 'GOOD'} (Mint/Freeze Revoked)\n\n` +
      `🔒 <b>Execution:</b> Single Mutex Position Locked\n` +
      `💸 <b>Jito MEV Tip:</b> ${jitoTipSol.toFixed(6)} SOL (Private Bundle)\n\n` +
      `🔗 <a href="${dexUrl}">DexScreener</a> | <a href="${photonUrl}">Photon SOL</a>`;

    const res = await fetch(`https://api.telegram.org/bot${config.botToken.trim()}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chatId.trim(),
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: false
      })
    });

    const data = await res.json();
    return !!(res.ok && data.ok);
  } catch (err) {
    console.error('Failed to send Telegram alpha alert:', err);
    return false;
  }
}

export async function sendTelegramBuyAlert(
  token: TokenSignal,
  config: TelegramConfig,
  amountSol: number,
  txSignature: string,
  jitoTipSol: number = 0.0001
): Promise<boolean> {
  if (!config.isEnabled || !config.botToken.trim() || !config.chatId.trim()) {
    return false;
  }

  try {
    const solscanTx = `https://solscan.io/tx/${txSignature}`;
    const dexUrl = token.dexUrl || `https://dexscreener.com/solana/${token.mint}`;

    const text = `🎯 <b>GROK TRENCHER // POSITION OPENED</b> ⚡\n\n` +
      `🪙 <b>Token:</b> <b>${token.symbol}</b> (${token.name})\n` +
      `💰 <b>Amount:</b> <b>${amountSol.toFixed(3)} SOL</b>\n` +
      `💵 <b>Entry Price:</b> ${token.priceSol.toFixed(8)} SOL\n` +
      `🔑 <b>Mint:</b> <code>${token.mint}</code>\n` +
      `🛡️ <b>MEV Defense:</b> Jito Tokyo Bundle (${jitoTipSol.toFixed(5)} SOL Tip)\n\n` +
      `🔗 <a href="${solscanTx}">Solscan TX</a> | <a href="${dexUrl}">DexScreener</a>`;

    const res = await fetch(`https://api.telegram.org/bot${config.botToken.trim()}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chatId.trim(),
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });

    const data = await res.json();
    return !!(res.ok && data.ok);
  } catch (err) {
    console.error('sendTelegramBuyAlert error:', err);
    return false;
  }
}

export async function sendTelegramExitAlert(
  trade: {
    token: TokenSignal;
    entryPriceSol: number;
    exitPriceSol: number;
    solInvested: number;
    pnlSol: number;
    pnlPct: number;
    rMultiplier: number;
    holdDurationSec: number;
    exitReason: string;
  },
  config: TelegramConfig
): Promise<boolean> {
  if (!config.isEnabled || !config.botToken.trim() || !config.chatId.trim()) {
    return false;
  }

  try {
    const isProfit = trade.pnlSol >= 0;
    const emoji = isProfit ? '🟢 💰 <b>TAKE PROFIT HIT</b>' : '🔴 🛑 <b>STOP LOSS TRIGGERED</b>';
    const sign = isProfit ? '+' : '';
    const dexUrl = trade.token.dexUrl || `https://dexscreener.com/solana/${trade.token.mint}`;

    const text = `${emoji} 🚨\n\n` +
      `🪙 <b>Token:</b> <b>${trade.token.symbol}</b>\n` +
      `📊 <b>P&L:</b> <b>${sign}${trade.pnlSol.toFixed(4)} SOL (${sign}${trade.pnlPct.toFixed(2)}%)</b>\n` +
      `🎯 <b>R-Multiple:</b> ${sign}${trade.rMultiplier}R\n` +
      `⏱️ <b>Hold Time:</b> ${trade.holdDurationSec} detik\n` +
      `📝 <b>Reason:</b> ${trade.exitReason}\n` +
      `🔑 <b>Mint:</b> <code>${trade.token.mint}</code>\n\n` +
      `🔗 <a href="${dexUrl}">DexScreener Chart</a>`;

    const res = await fetch(`https://api.telegram.org/bot${config.botToken.trim()}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chatId.trim(),
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });

    const data = await res.json();
    return !!(res.ok && data.ok);
  } catch (err) {
    console.error('sendTelegramExitAlert error:', err);
    return false;
  }
}

export async function sendTelegramRugpullWarning(
  token: TokenSignal,
  config: TelegramConfig,
  riskDetails: string
): Promise<boolean> {
  if (!config.isEnabled || !config.botToken.trim() || !config.chatId.trim()) {
    return false;
  }

  try {
    const text = `⚠️ <b>GROK TRENCHER // RUGPULL DETECTED</b> ⚠️\n\n` +
      `🪙 <b>Token:</b> <b>${token.symbol}</b> (${token.name})\n` +
      `🚨 <b>Veto Reason:</b> ${riskDetails}\n` +
      `🔑 <b>Mint:</b> <code>${token.mint}</code>\n` +
      `🛡️ <b>Action:</b> Execution blocked by Risk Agent automatically.`;

    const res = await fetch(`https://api.telegram.org/bot${config.botToken.trim()}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chatId.trim(),
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });

    const data = await res.json();
    return !!(res.ok && data.ok);
  } catch (err) {
    console.error('sendTelegramRugpullWarning error:', err);
    return false;
  }
}

