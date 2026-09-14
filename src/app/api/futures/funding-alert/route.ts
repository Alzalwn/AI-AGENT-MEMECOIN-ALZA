import { NextRequest, NextResponse } from 'next/server';
import { getFundingRates, RawFundingRate } from '@/lib/binanceClient';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const botToken = (body.botToken || process.env.TELEGRAM_BOT_TOKEN || process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN || '').trim();
    const chatId = (body.chatId || process.env.TELEGRAM_CHAT_ID || process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID || '').trim();
    const threshold = Number(body.threshold) || 0.05; // 0.05% threshold

    const fundingMap = await getFundingRates();
    if (!fundingMap || fundingMap.size === 0) {
      return NextResponse.json({ success: false, error: 'Gagal mengambil data funding rates dari Binance.' }, { status: 502 });
    }

    const fundingRates: RawFundingRate[] = Array.from(fundingMap.values());

    // Filter extreme funding
    const extremeNegative = fundingRates.filter(f => parseFloat(f.lastFundingRate) * 100 <= -threshold);
    const extremePositive = fundingRates.filter(f => parseFloat(f.lastFundingRate) * 100 >= threshold);

    let sent = false;
    let message = '';

    if (botToken && chatId && (extremeNegative.length > 0 || extremePositive.length > 0)) {
      message = `🚨 <b>BINANCE FUTURES FUNDING ALERT</b> 🚨\n\n`;
      if (extremeNegative.length > 0) {
        message += `🔥 <b>EXTREME NEGATIVE (POTENSI SHORT SQUEEZE):</b>\n`;
        extremeNegative.slice(0, 5).forEach(f => {
          message += `• <b>${f.symbol}</b>: <code>${(parseFloat(f.lastFundingRate) * 100).toFixed(4)}%</code>\n`;
        });
        message += `\n`;
      }
      if (extremePositive.length > 0) {
        message += `⚠️ <b>EXTREME POSITIVE (POTENSI LONG SQUEEZE):</b>\n`;
        extremePositive.slice(0, 5).forEach(f => {
          message += `• <b>${f.symbol}</b>: <code>+${(parseFloat(f.lastFundingRate) * 100).toFixed(4)}%</code>\n`;
        });
      }
      message += `\n⏰ <i>Checked: ${new Date().toLocaleTimeString('id-ID')} WIB</i>`;

      const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML',
        }),
      });
      sent = tgRes.ok;
    }

    return NextResponse.json({
      success: true,
      extremeNegativeCount: extremeNegative.length,
      extremePositiveCount: extremePositive.length,
      topNegative: extremeNegative.slice(0, 5),
      topPositive: extremePositive.slice(0, 5),
      telegramSent: sent,
      timestamp: Date.now(),
    });
  } catch (error: unknown) {
    console.error('[API /api/futures/funding-alert] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Terjadi kesalahan sistem' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const fundingMap = await getFundingRates();
    const fundingRates = Array.from(fundingMap.values());
    const extremeNegative = fundingRates.filter(f => parseFloat(f.lastFundingRate) * 100 <= -0.04);
    const extremePositive = fundingRates.filter(f => parseFloat(f.lastFundingRate) * 100 >= 0.05);

    return NextResponse.json({
      success: true,
      totalTracked: fundingRates.length,
      extremeNegative,
      extremePositive,
      timestamp: Date.now(),
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Gagal' },
      { status: 500 }
    );
  }
}
