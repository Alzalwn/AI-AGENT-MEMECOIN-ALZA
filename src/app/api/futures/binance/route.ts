import { NextRequest, NextResponse } from 'next/server';
import {
  BinanceApiCredentials,
  getBinanceAccountInfo,
  getBinancePositions,
  getBinanceUserTrades,
  placeFuturesOrder,
  closeFuturesPosition,
  getBinanceDailyIncome,
  PlaceOrderParams,
  placeFullBracketOrder,
} from '@/lib/binanceAuthClient';

export const dynamic = 'force-dynamic';

function resolveCredentials(body: {
  apiKey?: string;
  apiSecret?: string;
  isTestnet?: boolean;
}): BinanceApiCredentials {
  const apiKey = (body.apiKey?.trim() || process.env.BINANCE_API_KEY || '').trim();
  const apiSecret = (body.apiSecret?.trim() || process.env.BINANCE_API_SECRET || '').trim();
  const isTestnet =
    body.isTestnet !== undefined
      ? Boolean(body.isTestnet)
      : process.env.BINANCE_USE_TESTNET !== 'false';

  return { apiKey, apiSecret, isTestnet };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { action = 'get_account', symbol, limit, order, startTime, endTime } = body;
    const credentials = resolveCredentials(body);

    if (!credentials.apiKey || !credentials.apiSecret) {
      return NextResponse.json(
        {
          success: false,
          error:
            'API Key atau Secret Key Binance belum dikonfigurasi. Masukkan kunci Anda di Modal Pengaturan atau file .env.local.',
        },
        { status: 400 }
      );
    }

    switch (action) {
      case 'test_connection': {
        const account = await getBinanceAccountInfo(credentials);
        return NextResponse.json({
          success: true,
          message: 'Koneksi ke Binance Futures berhasil diverifikasi!',
          isTestnet: credentials.isTestnet,
          canTrade: account.canTrade,
          totalWalletBalance: account.totalWalletBalance,
          availableBalance: account.availableBalance,
          timestamp: Date.now(),
        });
      }

      case 'get_account': {
        const account = await getBinanceAccountInfo(credentials);
        return NextResponse.json({
          success: true,
          isTestnet: credentials.isTestnet,
          account,
          timestamp: Date.now(),
        });
      }

      case 'get_positions': {
        const positions = await getBinancePositions(credentials, symbol);
        return NextResponse.json({
          success: true,
          isTestnet: credentials.isTestnet,
          positions,
          timestamp: Date.now(),
        });
      }

      case 'sync_trades': {
        const trades = await getBinanceUserTrades(credentials, symbol, limit || 50);
        return NextResponse.json({
          success: true,
          isTestnet: credentials.isTestnet,
          trades,
          totalFetched: trades.length,
          timestamp: Date.now(),
        });
      }

      // GAP-2: Ambil PnL Harian untuk Daily Performance Summary
      case 'get_daily_income': {
        const now = Date.now();
        const dayStartMs = startTime || (now - 24 * 60 * 60 * 1000); // default: 24 jam terakhir
        const income = await getBinanceDailyIncome(credentials, dayStartMs, endTime || now, limit || 500);
        const totalPnl = income.reduce((sum, r) => sum + parseFloat(r.income || '0'), 0);
        return NextResponse.json({
          success: true,
          isTestnet: credentials.isTestnet,
          income,
          totalRealizedPnl: totalPnl.toFixed(4),
          recordCount: income.length,
          periodStartMs: dayStartMs,
          periodEndMs: endTime || now,
          timestamp: Date.now(),
        });
      }

      // GAP-1: Place Order (buka posisi baru dengan Enforced ISOLATED & Auto Bracket Stop Loss)
      case 'place_order': {
        if (!order) {
          return NextResponse.json(
            { success: false, error: 'Parameter "order" wajib diisi untuk action place_order.' },
            { status: 400 }
          );
        }
        const orderParams = order as PlaceOrderParams;
        if (!orderParams.symbol || !orderParams.side || !orderParams.type) {
          return NextResponse.json(
            { success: false, error: 'Field wajib: symbol, side, type.' },
            { status: 400 }
          );
        }

        const orderDirection: 'LONG' | 'SHORT' =
          body.direction === 'LONG' || body.direction === 'SHORT'
            ? body.direction
            : orderParams.side === 'BUY' ? 'LONG' : 'SHORT';

        const stopLossPrice = typeof body.stopLossPrice === 'number' ? body.stopLossPrice : undefined;
        const targetLeverage = typeof body.leverage === 'number' ? body.leverage : 5;

        const result = await placeFullBracketOrder(credentials, {
          ...orderParams,
          direction: orderDirection,
          stopLossPrice,
          leverage: targetLeverage,
        });

        const slMsg = result.stopLossOrder
          ? `Auto-Stop Loss terpasang di $${stopLossPrice}.`
          : result.stopLossError
          ? `⚠️ Peringatan: Auto-SL gagal dipasang (${result.stopLossError}). Harap pasang SL manual!`
          : 'Tanpa Auto-SL.';

        return NextResponse.json({
          success: true,
          isTestnet: credentials.isTestnet,
          marginType: result.marginType,
          leverage: result.leverage,
          order: result.entryOrder,
          stopLossOrder: result.stopLossOrder,
          stopLossError: result.stopLossError,
          message: `Order ${orderParams.side} ${orderParams.symbol} berhasil dieksekusi [Mode: ISOLATED, Lev: ${result.leverage}x]. ${slMsg}`,
          timestamp: Date.now(),
        });
      }

      // GAP-1: Close Position (tutup posisi aktif)
      case 'close_position': {
        if (!symbol) {
          return NextResponse.json(
            { success: false, error: 'Parameter "symbol" wajib untuk action close_position.' },
            { status: 400 }
          );
        }
        // Ambil posisi aktif dulu untuk mendapatkan positionAmt
        const positions = await getBinancePositions(credentials, symbol);
        const activePos = positions.find(
          (p) => p.symbol === symbol.toUpperCase() && Math.abs(parseFloat(p.positionAmt)) > 0
        );
        if (!activePos) {
          return NextResponse.json(
            { success: false, error: `Tidak ada posisi aktif untuk ${symbol}.` },
            { status: 404 }
          );
        }
        const result = await closeFuturesPosition(credentials, symbol, activePos.positionAmt);
        return NextResponse.json({
          success: true,
          isTestnet: credentials.isTestnet,
          order: result,
          closedPositionAmt: activePos.positionAmt,
          message: `Posisi ${symbol} berhasil ditutup (Market Order — Status: ${result.status})`,
          timestamp: Date.now(),
        });
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: `Action tidak dikenal: ${action}`,
          },
          { status: 400 }
        );
    }
  } catch (error: unknown) {
    console.error('[API /api/futures/binance] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan sistem';
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  const hasEnvKey = Boolean(process.env.BINANCE_API_KEY && process.env.BINANCE_API_SECRET);
  const isTestnet = process.env.BINANCE_USE_TESTNET !== 'false';

  return NextResponse.json({
    service: 'Binance Futures Proxy Service',
    configuredInEnv: hasEnvKey,
    defaultMode: isTestnet ? 'TESTNET' : 'MAINNET_LIVE',
    supportedActions: [
      'test_connection',
      'get_account',
      'get_positions',
      'sync_trades',
      'get_daily_income',  // NEW: Daily PnL summary
      'place_order',       // NEW: Order execution
      'close_position',    // NEW: Close active position
    ],
    timestamp: Date.now(),
  });
}
