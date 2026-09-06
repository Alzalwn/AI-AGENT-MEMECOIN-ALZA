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
