import { NextResponse } from 'next/server';
import ccxt from 'ccxt';

export async function GET() {
  try {
    const apiKey = process.env.BINANCE_API_KEY;
    const secret = process.env.BINANCE_API_SECRET;

    if (!apiKey || !secret) {
      return NextResponse.json({
        success: false,
        error: 'API Keys Binance (BINANCE_API_KEY & BINANCE_API_SECRET) tidak ditemukan di environment variables. Silakan tambahkan untuk melihat portofolio asli Anda.',
        data: null
      });
    }

    const exchange = new ccxt.binance({
      apiKey: apiKey,
      secret: secret,
      options: { defaultType: 'future' },
      enableRateLimit: true,
    });

    // Ambil saldo futures
    const balance = await exchange.fetchBalance();
    
    // Ambil posisi terbuka
    const positions = await exchange.fetchPositions();
    const activePositions = positions.filter((p: any) => p.contracts && p.contracts > 0);

    const portfolioData = {
      totalWalletBalance: balance?.info?.totalWalletBalance || 0,
      totalUnrealizedProfit: balance?.info?.totalUnrealizedProfit || 0,
      totalMarginBalance: balance?.info?.totalMarginBalance || 0,
      availableBalance: balance?.info?.availableBalance || 0,
      activePositions: activePositions.map((p: any) => ({
        symbol: p.symbol,
        side: p.side,
        contracts: p.contracts,
        entryPrice: p.entryPrice,
        markPrice: p.markPrice,
        unrealizedPnl: p.unrealizedPnl,
        percentage: p.percentage,
        leverage: p.leverage,
        initialMargin: p.initialMargin
      }))
    };

    return NextResponse.json({
      success: true,
      data: portfolioData,
      timestamp: Date.now()
    });

  } catch (error: any) {
    console.error('Portfolio API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
