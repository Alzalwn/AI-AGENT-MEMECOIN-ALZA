import { NextRequest, NextResponse } from 'next/server';
import { BinanceFuturesSignal } from '@/types/futures';
import { formatFuturesPrice } from '@/engine/futuresSignalEngine';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const signal = body.signal as BinanceFuturesSignal;
    const botToken = (body.botToken || process.env.TELEGRAM_BOT_TOKEN || process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN || '').trim();
    const chatId = (body.chatId || process.env.TELEGRAM_CHAT_ID || process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID || '').trim();
    const imageBase64 = body.imageBlobBase64 as string | undefined;
    const customNote = body.customNote as string | undefined;

    if (!botToken || !chatId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Bot Token atau Chat ID belum dikonfigurasi! Silakan atur di pengaturan Telegram atau masukkan Bot Token & Chat ID Anda.',
        },
        { status: 400 }
      );
    }

    if (!signal || !signal.symbol) {
      return NextResponse.json(
        { success: false, error: 'Data sinyal futures tidak valid.' },
        { status: 400 }
      );
    }

    const isLong = signal.direction === 'LONG';
    const directionEmoji = isLong ? '🟢' : '🔴';
    const cleanPair = `${signal.baseAsset}/USDT`;
    const entryLow = formatFuturesPrice(signal.entryZone.low);
    const entryHigh = formatFuturesPrice(signal.entryZone.high);
    const tp1Price = formatFuturesPrice(signal.targets.tp1.price);
    const tp2Price = formatFuturesPrice(signal.targets.tp2.price);
    const tp3Price = formatFuturesPrice(signal.targets.tp3.price);
    const slPrice = formatFuturesPrice(signal.stopLoss.price);

    const candleLine = signal.candlestickPattern
      ? `\n🕯️ <b>Pola Candlestick:</b> ${signal.candlestickPattern.name} (Winrate <b>${signal.candlestickPattern.reliability}%</b> - ${signal.candlestickPattern.type})`
      : '';

    const captionText =
      `⚡ <b>BINANCE FUTURES QUANT SIGNAL // AI ALPHA</b> ⚡\n\n` +
      `${directionEmoji} <b>${signal.direction} · ${cleanPair}</b>\n` +
      `🏷️ <b>Strategi:</b> ${signal.strategyLabel}\n` +
      `⭐ <b>Skor AI:</b> ${signal.overallScore}/100 [${signal.signalTier}]` +
      candleLine +
      `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🎯 <b>ZONA ENTRY:</b> $${entryLow} – $${entryHigh}\n` +
      `🎯 <b>Target TP1 (+${signal.targets.tp1.gainPct.toFixed(1)}%):</b> $${tp1Price} ⏱️ ${signal.targets.tp1.eta}\n` +
      `🎯 <b>Target TP2 (+${signal.targets.tp2.gainPct.toFixed(1)}%):</b> $${tp2Price} ⏱️ ${signal.targets.tp2.eta}\n` +
      `🎯 <b>Target TP3 (+${signal.targets.tp3.gainPct.toFixed(1)}%):</b> $${tp3Price} ⏱️ ${signal.targets.tp3.eta}\n` +
      `🛑 <b>STOP LOSS:</b> $${slPrice} (${signal.stopLoss.lossPct.toFixed(1)}%)\n` +
      `⚖️ <b>Risk/Reward Ratio:</b> 1 : ${signal.riskRewardRatio}\n` +
      `\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🛡️ <b>Leverage Aman:</b> ${signal.leverage.safe.range}\n` +
      `⚡ <b>Leverage Scalp:</b> ${signal.leverage.scalp.range}\n` +
      `📊 <b>Funding Rate:</b> ${signal.derivativesData.fundingRatePct > 0 ? '+' : ''}${signal.derivativesData.fundingRatePct.toFixed(4)}%\n` +
      (customNote ? `\n💬 <b>Catatan Analis:</b>\n${customNote}\n` : '') +
      `\n💡 <b>Analisa Singkat AI:</b>\n${signal.rationale}`;

    const inlineKeyboard = {
      inline_keyboard: [
        [
          { text: '📈 Eksekusi di Binance Futures', url: signal.binanceUrl },
          { text: '📊 TradingView Chart', url: `https://www.tradingview.com/chart/?symbol=${signal.tradingViewSymbol}` },
        ],
      ],
    };

    // 1. Jika ada gambar chart PNG (base64)
    if (imageBase64 && imageBase64.includes('base64,')) {
      try {
        const base64Data = imageBase64.split('base64,')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        const formData = new FormData();
        formData.append('chat_id', chatId);
        const blob = new Blob([buffer], { type: 'image/png' });
        formData.append('photo', blob, `${signal.symbol}-setup.png`);
        formData.append('caption', captionText.slice(0, 1024)); // Batas caption Telegram 1024 karakter
        formData.append('parse_mode', 'HTML');
        formData.append('reply_markup', JSON.stringify(inlineKeyboard));

        const photoRes = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
          method: 'POST',
          body: formData,
        });

        const photoData = await photoRes.json();
        if (photoRes.ok && photoData.ok) {
          return NextResponse.json({
            success: true,
            message: 'Sinyal dan gambar grafik berhasil dikirim ke Telegram!',
            telegramMessageId: photoData.result?.message_id,
          });
        }
      } catch (imgErr) {
        console.warn('[TelegramBroadcast] Gagal kirim foto, fallback ke teks:', imgErr);
      }
    }

    // 2. Fallback / Standard kirim teks pesan HTML
    const msgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: captionText,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: inlineKeyboard,
      }),
    });

    const msgData = await msgRes.json();
    if (msgRes.ok && msgData.ok) {
      return NextResponse.json({
        success: true,
        message: 'Sinyal berhasil dikirim ke Telegram!',
        telegramMessageId: msgData.result?.message_id,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: msgData.description || 'Gagal mengirim pesan ke Telegram.',
        },
        { status: 400 }
      );
    }
  } catch (error: unknown) {
    console.error('[API /api/futures/telegram-broadcast] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Terjadi kesalahan sistem saat mengirim ke Telegram.',
      },
      { status: 500 }
    );
  }
}
