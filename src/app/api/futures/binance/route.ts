import { NextRequest, NextResponse } from 'next/server';
import {
  BinanceApiCredentials,
  getBinanceAccountInfo,
  getBinancePositions,
  getBinanceUserTrades,
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
    const { action = 'get_account', symbol, limit } = body;
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
    supportedActions: ['test_connection', 'get_account', 'get_positions', 'sync_trades'],
    timestamp: Date.now(),
  });
}
