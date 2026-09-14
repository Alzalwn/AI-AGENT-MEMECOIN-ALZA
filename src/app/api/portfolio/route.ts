import { NextRequest, NextResponse } from 'next/server';
import {
  getBinanceAccountInfo,
  getBinancePositions,
  BinanceApiCredentials,
} from '@/lib/binanceAuthClient';

export const dynamic = 'force-dynamic';

function getCredentials(req: NextRequest): BinanceApiCredentials {
  const apiKey = (
    req.headers.get('x-binance-api-key') ||
    process.env.BINANCE_API_KEY ||
    ''
  ).trim();

  const apiSecret = (
    req.headers.get('x-binance-secret') ||
    process.env.BINANCE_API_SECRET ||
    ''
  ).trim();

  const isTestnetHeader = req.headers.get('x-binance-testnet');
  const isTestnet =
    isTestnetHeader !== null
      ? isTestnetHeader === 'true'
      : process.env.BINANCE_USE_TESTNET !== 'false';

  return { apiKey, apiSecret, isTestnet };
}

export async function GET(req: NextRequest) {
  try {
    const credentials = getCredentials(req);

    if (!credentials.apiKey || !credentials.apiSecret) {
      return NextResponse.json({
        success: false,
        error:
          'API Key & Secret Key Binance belum terhubung. Klik tombol "Hubungkan Binance" di atas untuk menyinkronkan saldo dan posisi Anda langsung dari website.',
        data: null,
      });
    }

    // Ambil saldo akun & posisi secara simultan
    const [account, positions] = await Promise.all([
      getBinanceAccountInfo(credentials),
      getBinancePositions(credentials),
    ]);

    const activePositions = positions.map((p) => {
      const contracts = Math.abs(parseFloat(p.positionAmt));
      const entryPrice = parseFloat(p.entryPrice) || 0;
      const markPrice = parseFloat(p.markPrice) || 0;
      const unrealizedPnl = parseFloat(p.unRealizedProfit) || 0;
      const leverage = parseFloat(p.leverage) || 1;
      const initialMargin = parseFloat(p.isolatedMargin) || (contracts * entryPrice) / leverage;
      const percentage = initialMargin > 0 ? (unrealizedPnl / initialMargin) * 100 : 0;
      const side = parseFloat(p.positionAmt) >= 0 ? 'LONG' : 'SHORT';

      return {
        symbol: p.symbol,
        side,
        contracts,
        entryPrice,
        markPrice,
        unrealizedPnl,
        percentage: Number(percentage.toFixed(2)),
        leverage,
        initialMargin: Number(initialMargin.toFixed(2)),
      };
    });

    const portfolioData = {
      totalWalletBalance: parseFloat(account.totalWalletBalance || '0').toFixed(2),
      totalUnrealizedProfit: parseFloat(account.totalUnrealizedProfit || '0').toFixed(2),
      totalMarginBalance: parseFloat(account.totalMarginBalance || '0').toFixed(2),
      availableBalance: parseFloat(account.availableBalance || '0').toFixed(2),
      isTestnet: credentials.isTestnet,
      canTrade: account.canTrade,
      activePositions,
    };

    return NextResponse.json({
      success: true,
      data: portfolioData,
      isTestnet: credentials.isTestnet,
      timestamp: Date.now(),
    });
  } catch (error: unknown) {
    console.error('Portfolio API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan sistem';
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        data: null,
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const apiKey = (body.apiKey || process.env.BINANCE_API_KEY || '').trim();
    const apiSecret = (body.apiSecret || process.env.BINANCE_API_SECRET || '').trim();
    const isTestnet =
      body.isTestnet !== undefined
        ? Boolean(body.isTestnet)
        : process.env.BINANCE_USE_TESTNET !== 'false';

    if (!apiKey || !apiSecret) {
      return NextResponse.json({
        success: false,
        error: 'API Key dan Secret Key Binance wajib disertakan.',
        data: null,
      });
    }

    const credentials: BinanceApiCredentials = { apiKey, apiSecret, isTestnet };

    const [account, positions] = await Promise.all([
      getBinanceAccountInfo(credentials),
      getBinancePositions(credentials),
    ]);

    const activePositions = positions.map((p) => {
      const contracts = Math.abs(parseFloat(p.positionAmt));
      const entryPrice = parseFloat(p.entryPrice) || 0;
      const markPrice = parseFloat(p.markPrice) || 0;
      const unrealizedPnl = parseFloat(p.unRealizedProfit) || 0;
      const leverage = parseFloat(p.leverage) || 1;
      const initialMargin = parseFloat(p.isolatedMargin) || (contracts * entryPrice) / leverage;
      const percentage = initialMargin > 0 ? (unrealizedPnl / initialMargin) * 100 : 0;
      const side = parseFloat(p.positionAmt) >= 0 ? 'LONG' : 'SHORT';

      return {
        symbol: p.symbol,
        side,
        contracts,
        entryPrice,
        markPrice,
        unrealizedPnl,
        percentage: Number(percentage.toFixed(2)),
        leverage,
        initialMargin: Number(initialMargin.toFixed(2)),
      };
    });

    const portfolioData = {
      totalWalletBalance: parseFloat(account.totalWalletBalance || '0').toFixed(2),
      totalUnrealizedProfit: parseFloat(account.totalUnrealizedProfit || '0').toFixed(2),
      totalMarginBalance: parseFloat(account.totalMarginBalance || '0').toFixed(2),
      availableBalance: parseFloat(account.availableBalance || '0').toFixed(2),
      isTestnet: credentials.isTestnet,
      canTrade: account.canTrade,
      activePositions,
    };

    return NextResponse.json({
      success: true,
      data: portfolioData,
      isTestnet: credentials.isTestnet,
      timestamp: Date.now(),
    });
  } catch (error: unknown) {
    console.error('Portfolio POST Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Gagal mengambil data portfolio';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
