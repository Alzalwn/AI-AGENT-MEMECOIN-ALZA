import { NextRequest, NextResponse } from 'next/server';
import { computeSignal } from '@/lib/signalCalculator';
import { getActivePasscode } from '@/lib/passcodeStorage';
import { TokenSignal, MoonshotVerdict, MoonshotPillars } from '@/types/terminal';

export const dynamic = 'force-dynamic';

/**
 * GET/POST /api/dev/trigger-mock-signal
 *
 * ============================================================
 * DEV-ONLY ENDPOINT — Pipeline Integration Test
 * ============================================================
 * Membuat satu sinyal koin palsu ultra-presisi (APPROVED 5/5 konsensus)
 * dan menyuntikkannya langsung ke Telegram Pipeline.
 *
 * Fitur khusus:
 * - BYPASS semua filter produksi: dedup 24 jam, rate limit 60 detik,
 *   Early Entry Guard → karena ini adalah mock test yang disengaja.
 * - Menggunakan fungsi computeSignal() yang SAMA dengan pipeline produksi.
 * - Aman: TIDAK mempengaruhi localStorage, state Zustand, atau DB Supabase.
 *
 * Autentikasi: ?passcode=Alza0839 atau header x-admin-passcode
 *
 * Query params opsional:
 *   ?symbol=MOCKBOT    — Nama token (default: MOCKBOT)
 *   ?telegram=true     — Kirim ke Telegram (default: true)
 *   ?passcode=Alza0839 — Passcode admin
 */

function verifyPasscode(req: NextRequest, bodyPasscode?: string): boolean {
  const activePasscode = getActivePasscode();

  const queryPasscode =
    req.nextUrl.searchParams.get('passcode') ||
    req.nextUrl.searchParams.get('key');

  if (queryPasscode && queryPasscode === activePasscode) return true;

  const headerPasscode =
    req.headers.get('x-admin-passcode') ||
    req.headers.get('x-admin-key') ||
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

  if (headerPasscode && headerPasscode === activePasscode) return true;
  if (bodyPasscode && bodyPasscode === activePasscode) return true;

  return false;
}

function generateMockSignal(symbol: string) {
  const mintBase = `MOCK${Date.now().toString(36).toUpperCase()}pump`;
  const priceSol = 0.000032;
  const now = Date.now();

  const mockPillars: MoonshotPillars = {
    orderFlow: {
      score: 30,
      txVelocityPerSec: 14.2,
      buySellRatio: 5.1,
      uniqueBuyersCount: 34,
      status: 'EXPLOSIVE'
    },
    distribution: {
      score: 24,
      top10HolderPct: 9.2,
      isBundlingDetected: false,
      status: 'ORGANIC'
    },
    smartMoney: {
      score: 26,
      detectedCount: 4,
      walletLabels: ['Alpha Whale #1', 'Pump.fun 100x Sniper', 'KOL Fund Asia', 'Smart Accumulator'],
      status: 'ALPHA_WHALE_IN'
    },
    security: {
      score: 20,
      mintRevoked: true,
      freezeRevoked: true,
      lpBurntPct: 100,
      isHoneypot: false,
      isAbsoluteSafe: true
    }
  };

  const mockMoonshot: MoonshotVerdict = {
    tokenMint: mintBase,
    symbol: symbol.toUpperCase().slice(0, 10),
    tier: 'SUPERNOVA',
    moonshotScore: 95,
    isApproved: true,
    pumpThesis: `[MOCK TEST] ${symbol} sinyal pengujian pipeline dari /api/dev/trigger-mock-signal. Tidak ada eksekusi nyata.`,
    pillars: mockPillars,
    timestamp: Date.now(),
  };

  const mockToken: TokenSignal = {
    id: `MOCK-SIG-${Date.now()}`,
    mint: mintBase,
    symbol: symbol.toUpperCase().slice(0, 10),
    name: `${symbol} Mock Test Token`,
    platform: 'Pump.fun',
    initialLpUsd: 2800,
    burntLiquidityPct: 100,
    mintAuthorityRevoked: true,
    freezeAuthorityRevoked: true,
    top10HolderPct: 9.2,
    creatorBalancePct: 0.5,
    narrativeCosineSim: 0.96,
    narrativeTheme: 'AI Agent / Mock Pipeline Test',
    volumeDelta15s: 18.6,
    uniqueBuyersCount: 34,
    txVelocityPerSec: 14.2,
    buySellRatio: 5.1,
    priceSol,
    detectedAt: now,
    smartMoneyCount: 4,
    smartMoneyWallets: ['Alpha Whale #1', 'Pump.fun 100x Sniper', 'KOL Fund Asia', 'Smart Accumulator'],
    bondingCurveProgress: 18,
    isBondingCurveGraduated: false,
    rugcheckScore: 'GOOD',
    isRealData: false,
  };

  return computeSignal({
    token: mockToken,
    moonshot: mockMoonshot,
    grokViralityScore: 0.97,
    grokSentiment: 'BULLISH',
    solRateUsd: 140,
  });
}

async function sendMockToTelegram(signal: ReturnType<typeof generateMockSignal>) {
  const botToken = process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '';
  const chatId = process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID || process.env.TELEGRAM_CHAT_ID || '';

  if (!botToken || !chatId) {
    return {
      sent: false,
      reason: 'TELEGRAM_BOT_TOKEN dan TELEGRAM_CHAT_ID belum diisi di .env.local'
    };
  }

  const { token, entryZone, stopLoss, targets, marketContext } = signal;
  const [tp1, tp2, tp3] = targets;
  const fmtSol = (n: number) => n < 0.0001 ? n.toFixed(9) : n.toFixed(6);
  const fmtUsd = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${n.toFixed(0)}`;

  const text =
    `🧪 <b>[MOCK TEST] PIPELINE VALIDATION — ALZASNIPED.MY.ID</b> 🧪\n` +
    `🚀 <b>SUPERNOVA · $${token.symbol}</b> — ${token.name}\n` +
    `🏷️ Platform: ${token.platform} · Skor: 5/5 APPROVED\n` +
    `📊 MC: ~${fmtUsd(marketContext.marketCapUsd)} | LP: ${fmtUsd(marketContext.liquidityUsd)} (100% Burnt)\n` +
    `🔑 <code>${token.mint}</code>\n` +
    `\n━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🟢 <b>ENTRY ZONE</b>\n` +
    `  ${fmtSol(entryZone.low)} – ${fmtSol(entryZone.high)} SOL\n` +
    `\n🎯 <b>TAKE PROFIT</b>\n` +
    `  TP1 (+${tp1.gainPct.toFixed(0)}%): <b>${fmtSol(tp1.priceSol)} SOL</b>\n` +
    `  TP2 (+${tp2.gainPct.toFixed(0)}%): <b>${fmtSol(tp2.priceSol)} SOL</b>\n` +
    `  TP3 (+${tp3.gainPct.toFixed(0)}%): <b>${fmtSol(tp3.priceSol)} SOL</b> 🌙\n` +
    `\n🛑 <b>STOP LOSS</b>\n` +
    `  SL (${stopLoss.pctFromEntry}%): <b>${fmtSol(stopLoss.priceSol)} SOL</b>\n` +
    `\n🛡️ Mint: ✅ | Freeze: ✅ | LP Burnt: ✅ | Top10: ${token.top10HolderPct}% ✅\n` +
    `🔥 Grok Virality: 9.7/10 · AI Agent\n` +
    `\n⚠️ <i>Pesan ini adalah uji coba pipeline (mock signal). Bukan sinyal trading nyata.</i>`;

  const keyboard = [
    [
      { text: '📋 Solscan', url: `https://solscan.io/token/${token.mint}` },
      { text: '📊 DexScreener', url: `https://dexscreener.com/solana/${token.mint}` },
    ]
  ];

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
          reply_markup: { inline_keyboard: keyboard.map(row => row.map(btn => ({ text: btn.text, url: btn.url }))) }
        })
      }
    );
    const data = await res.json();
    return {
      sent: !!(res.ok && data.ok),
      telegramResponse: data,
      reason: data.description || (data.ok ? 'Berhasil dikirim' : 'Gagal')
    };
  } catch (err: any) {
    return { sent: false, reason: err?.message || 'Network error saat menghubungi Telegram API' };
  }
}

async function handleRequest(req: NextRequest, bodyPasscode?: string) {
  if (!verifyPasscode(req, bodyPasscode)) {
    return NextResponse.json(
      {
        success: false,
        error: 'Akses ditolak: Passcode admin salah atau tidak disertakan.',
        usage: 'Gunakan ?passcode=YOUR_PASSCODE atau header x-admin-passcode'
      },
      { status: 401 }
    );
  }

  const symbol = req.nextUrl.searchParams.get('symbol') || 'MOCKBOT';
  const sendTelegram = req.nextUrl.searchParams.get('telegram') !== 'false';

  const mockSignal = generateMockSignal(symbol);

  let telegramResult = { sent: false as boolean, reason: 'Telegram dilewati (telegram=false)' };
  if (sendTelegram) {
    telegramResult = await sendMockToTelegram(mockSignal);
  }

  return NextResponse.json({
    success: true,
    mode: 'DEV_MOCK_SIGNAL',
    message: `Sinyal mock untuk $${symbol} berhasil dibuat dan ${telegramResult.sent ? 'terkirim ke Telegram ✅' : 'TIDAK terkirim ke Telegram ❌'}.`,
    mockSignal: {
      id: mockSignal.id,
      symbol: mockSignal.token.symbol,
      mint: mockSignal.token.mint,
      signalTier: mockSignal.signalTier,
      confidenceScore: mockSignal.confidenceScore,
      entryZone: mockSignal.entryZone,
      targets: mockSignal.targets.map(t => ({ gainPct: t.gainPct, priceSol: t.priceSol })),
      stopLoss: { pctFromEntry: mockSignal.stopLoss.pctFromEntry },
      riskRewardRatio: mockSignal.riskRewardRatio,
    },
    telegram: telegramResult,
    generatedAt: new Date().toISOString(),
    note: 'Mock signal ini TIDAK disimpan ke DB Supabase dan TIDAK mempengaruhi state produksi.'
  });
}

export async function GET(req: NextRequest) {
  return handleRequest(req);
}

export async function POST(req: NextRequest) {
  let bodyPasscode: string | undefined;
  try {
    const body = await req.json();
    bodyPasscode = body?.passcode || body?.key;
  } catch {}
  return handleRequest(req, bodyPasscode);
}
