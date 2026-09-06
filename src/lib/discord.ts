import { TokenSignal } from '../types/terminal';

export interface DiscordConfig {
  webhookUrl: string;
  isEnabled: boolean;
}

export async function testDiscordWebhook(webhookUrl: string): Promise<{ success: boolean; message: string }> {
  const url = webhookUrl.trim();
  if (!url) {
    return { success: false, message: 'Discord Webhook URL wajib diisi!' };
  }

  if (!url.startsWith('https://discord.com/api/webhooks/') && !url.startsWith('https://discordapp.com/api/webhooks/')) {
    return { success: false, message: 'URL webhook tidak valid (harus dimulai dengan https://discord.com/api/webhooks/)' };
  }

  try {
    const payload = {
      username: 'Grok Trencher Terminal',
      avatar_url: 'https://cdn-icons-png.flaticon.com/512/6001/6001368.png',
      embeds: [
        {
          title: '⚡ GROK TRENCHER // DISCORD WEBHOOK TEST ⚡',
          description: 'Koneksi webhook Discord berhasil terhubung ke terminal Grok Trencher! Sinyal 5/5 AI Agent Consensus akan dikirimkan otomatis ke channel ini.',
          color: 914057, // #0DF289 Terminal Green
          fields: [
            { name: 'Status', value: 'ONLINE & READY', inline: true },
            { name: 'Engine', value: 'Solana High-Frequency Sniper', inline: true },
            { name: 'MEV Relay', value: 'Jito Private Bundles', inline: true }
          ],
          footer: {
            text: 'Grok Trencher Multi-Agent Terminal • Test Alert',
            icon_url: 'https://cdn-icons-png.flaticon.com/512/6001/6001368.png'
          },
          timestamp: new Date().toISOString()
        }
      ]
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok || res.status === 204) {
      return { success: true, message: 'Pesan tes berhasil dikirim ke Discord channel!' };
    } else {
      const errText = await res.text();
      return { success: false, message: `Gagal mengirim ke Discord (${res.status}): ${errText || 'Invalid request'}` };
    }
  } catch (err: any) {
    return { success: false, message: err.message || 'Network error saat menghubungi Discord Webhook' };
  }
}

export async function sendDiscordAlphaAlert(
  token: TokenSignal,
  config: DiscordConfig,
  viralityScore: number = 85,
  sentiment: string = 'BULLISH',
  jitoTipSol: number = 0.000050
): Promise<boolean> {
  if (!config.isEnabled || !config.webhookUrl?.trim()) {
    return false;
  }

  const url = config.webhookUrl.trim();
  if (!url.startsWith('https://discord.com/api/webhooks/') && !url.startsWith('https://discordapp.com/api/webhooks/')) {
    return false;
  }

  try {
    const dexUrl = token.dexUrl || (
      token.mint.includes('...')
        ? `https://dexscreener.com/search?q=${encodeURIComponent(token.symbol.replace('$', ''))}`
        : `https://dexscreener.com/search?q=${encodeURIComponent(token.mint)}`
    );
    const photonUrl = `https://photon-sol.tinyastro.io/en/lp/${token.mint}`;
    const rugcheckUrl = token.rugcheckReportUrl || `https://rugcheck.xyz/tokens/${token.mint}`;

    const payload = {
      username: 'Grok Trencher Alpha',
      avatar_url: token.iconUrl || 'https://cdn-icons-png.flaticon.com/512/6001/6001368.png',
      embeds: [
        {
          title: `🚨 ALPHA ALERT: ${token.symbol} (${token.name})`,
          url: dexUrl,
          description: `**5/5 AI Consensus Approved** • Eksekusi MEV via Jito Private Bundle (${jitoTipSol} SOL tip)`,
          color: 914057, // #0DF289
          thumbnail: token.iconUrl ? { url: token.iconUrl } : undefined,
          fields: [
            { name: '🪙 Token & Platform', value: `**${token.symbol}** (${token.platform})`, inline: true },
            { name: '🔥 Grok Virality', value: `**${viralityScore}/100** [${sentiment}]`, inline: true },
            { name: '💧 Initial LP', value: `$${token.initialLpUsd.toLocaleString()} USD`, inline: true },
            { name: '🧠 Narrative Cos-Sim', value: `${token.narrativeCosineSim.toFixed(2)} (${token.narrativeTheme})`, inline: true },
            { name: '🛡️ Rugcheck Score', value: `${token.rugcheckScore || 'GOOD'} (${token.rugcheckNumericScore ?? 100})`, inline: true },
            { name: '👥 Top 10 Holders', value: `${token.top10HolderPct}%`, inline: true },
            { name: '🔑 Contract Mint (CA)', value: `\`${token.mint}\``, inline: false },
            { name: '🔗 Quick Links', value: `[DexScreener](${dexUrl}) • [Rugcheck](${rugcheckUrl}) • [Photon](${photonUrl})`, inline: false }
          ],
          footer: {
            text: 'Grok Trencher • Sub-350ms Solana Autonomous Terminal',
            icon_url: 'https://cdn-icons-png.flaticon.com/512/6001/6001368.png'
          },
          timestamp: new Date().toISOString()
        }
      ]
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return res.ok || res.status === 204;
  } catch (err) {
    console.error('sendDiscordAlphaAlert error:', err);
    return false;
  }
}

export async function sendDiscordBuyAlert(
  token: TokenSignal,
  config: DiscordConfig,
  amountSol: number,
  txSignature: string,
  jitoTipSol: number = 0.0001
): Promise<boolean> {
  if (!config.isEnabled || !config.webhookUrl?.trim()) return false;
  const url = config.webhookUrl.trim();
  if (!url.startsWith('https://discord.com/api/webhooks/') && !url.startsWith('https://discordapp.com/api/webhooks/')) return false;

  try {
    const solscanTx = `https://solscan.io/tx/${txSignature}`;
    const dexUrl = token.dexUrl || `https://dexscreener.com/solana/${token.mint}`;

    const payload = {
      username: 'Grok Trencher Execution',
      avatar_url: token.iconUrl || 'https://cdn-icons-png.flaticon.com/512/6001/6001368.png',
      embeds: [
        {
          title: `🎯 POSITION OPENED: ${token.symbol}`,
          url: dexUrl,
          description: `Bot telah membuka posisi aktif via **Jito Tokyo MEV Bundle**`,
          color: 3066993, // #2ECC71
          fields: [
            { name: '🪙 Token', value: `**${token.symbol}** (${token.name})`, inline: true },
            { name: '💰 Invested', value: `**${amountSol.toFixed(3)} SOL**`, inline: true },
            { name: '💵 Entry Price', value: `${token.priceSol.toFixed(8)} SOL`, inline: true },
            { name: '🛡️ Jito MEV Tip', value: `${jitoTipSol.toFixed(5)} SOL (Private Bundle)`, inline: true },
            { name: '🔑 Contract Mint', value: `\`${token.mint}\``, inline: false },
            { name: '🔗 Explorer Links', value: `[Solscan TX](${solscanTx}) • [DexScreener](${dexUrl})`, inline: false }
          ],
          footer: { text: 'Grok Trencher Multi-Agent Terminal' },
          timestamp: new Date().toISOString()
        }
      ]
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.ok || res.status === 204;
  } catch (err) {
    console.error('sendDiscordBuyAlert error:', err);
    return false;
  }
}

export async function sendDiscordExitAlert(
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
  config: DiscordConfig
): Promise<boolean> {
  if (!config.isEnabled || !config.webhookUrl?.trim()) return false;
  const url = config.webhookUrl.trim();
  if (!url.startsWith('https://discord.com/api/webhooks/') && !url.startsWith('https://discordapp.com/api/webhooks/')) return false;

  try {
    const isProfit = trade.pnlSol >= 0;
    const sign = isProfit ? '+' : '';
    const color = isProfit ? 3066993 : 15158332; // Green #2ECC71 or Red #E74C3C
    const dexUrl = trade.token.dexUrl || `https://dexscreener.com/solana/${trade.token.mint}`;

    const payload = {
      username: 'Grok Trencher Exit Agent',
      avatar_url: trade.token.iconUrl || 'https://cdn-icons-png.flaticon.com/512/6001/6001368.png',
      embeds: [
        {
          title: isProfit ? `🟢 TAKE PROFIT: ${trade.token.symbol} (${sign}${trade.pnlPct.toFixed(2)}%)` : `🔴 STOP LOSS: ${trade.token.symbol} (${sign}${trade.pnlPct.toFixed(2)}%)`,
          url: dexUrl,
          description: `**Exit Reason:** ${trade.exitReason}`,
          color,
          fields: [
            { name: '🪙 Token', value: `**${trade.token.symbol}**`, inline: true },
            { name: '📊 Net P&L', value: `**${sign}${trade.pnlSol.toFixed(4)} SOL**`, inline: true },
            { name: '🎯 R-Multiple', value: `${sign}${trade.rMultiplier}R`, inline: true },
            { name: '⏱️ Hold Duration', value: `${trade.holdDurationSec}s`, inline: true },
            { name: '💵 Entry / Exit Price', value: `${trade.entryPriceSol.toFixed(8)} → ${trade.exitPriceSol.toFixed(8)} SOL`, inline: false },
            { name: '🔑 Contract Mint', value: `\`${trade.token.mint}\``, inline: false }
          ],
          footer: { text: 'Grok Trencher Autonomous Exit Engine' },
          timestamp: new Date().toISOString()
        }
      ]
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.ok || res.status === 204;
  } catch (err) {
    console.error('sendDiscordExitAlert error:', err);
    return false;
  }
}

export async function sendDiscordRugpullWarning(
  token: TokenSignal,
  config: DiscordConfig,
  riskDetails: string
): Promise<boolean> {
  if (!config.isEnabled || !config.webhookUrl?.trim()) return false;
  const url = config.webhookUrl.trim();
  if (!url.startsWith('https://discord.com/api/webhooks/') && !url.startsWith('https://discordapp.com/api/webhooks/')) return false;

  try {
    const payload = {
      username: 'Grok Trencher Risk Engine',
      avatar_url: 'https://cdn-icons-png.flaticon.com/512/6001/6001368.png',
      embeds: [
        {
          title: `⚠️ RUGPULL BLOCKED: ${token.symbol}`,
          description: `Risk Agent telah memblokir eksekusi token ini untuk melindungi modal Anda.`,
          color: 15158332, // Red
          fields: [
            { name: '🪙 Token Name', value: `${token.name} (${token.symbol})`, inline: true },
            { name: '🚨 Veto Reason', value: `**${riskDetails}**`, inline: true },
            { name: '🔑 Contract Mint', value: `\`${token.mint}\``, inline: false }
          ],
          footer: { text: 'Grok Trencher Anti-Rugpull Guard' },
          timestamp: new Date().toISOString()
        }
      ]
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.ok || res.status === 204;
  } catch (err) {
    console.error('sendDiscordRugpullWarning error:', err);
    return false;
  }
}

