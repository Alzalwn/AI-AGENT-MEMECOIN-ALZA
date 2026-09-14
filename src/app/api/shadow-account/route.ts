import { NextRequest, NextResponse } from 'next/server';
import {
  getBinanceUserTrades,
  BinanceApiCredentials,
  BinanceUserTrade,
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

    // Gunakan data dummy jika kunci API belum disediakan
    if (!credentials.apiKey || !credentials.apiSecret) {
      return getDummyData();
    }

    try {
      // Ambil 50 trade riil terakhir pengguna
      const trades = await getBinanceUserTrades(credentials, undefined, 50);

      if (!trades || trades.length === 0) {
        return getDummyData(
          'Akun Binance terhubung, namun belum memiliki histori transaksi. Menampilkan data benchmark simulasi.'
        );
      }

      // Analisis psikologi dari data riil
      const analysis = analyzeTrades(trades);

      return NextResponse.json({
        success: true,
        data: analysis,
        isDummy: false,
        isTestnet: credentials.isTestnet,
        timestamp: Date.now(),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mengambil data trade Binance';
      console.warn('Gagal mengambil data trade asli, fallback ke dummy:', msg);
      return getDummyData(`Gagal menghubungkan ke Binance (${msg}). Menampilkan data simulasi.`);
    }
  } catch (error: unknown) {
    console.error('Shadow Account API Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan sistem';
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}

// Psychology and behavior analyzer
function analyzeTrades(trades: BinanceUserTrade[]) {
  // Sort trades by timestamp descending
  const sorted = [...trades].sort((a, b) => b.time - a.time);
  const totalTrades = sorted.length;

  // Group trades by day to detect overtrading
  const tradesByDay: Record<string, number> = {};
  sorted.forEach((t) => {
    const date = new Date(t.time).toISOString().split('T')[0];
    tradesByDay[date] = (tradesByDay[date] || 0) + 1;
  });

  const dates = Object.keys(tradesByDay);
  const avgTradesPerDay = dates.length > 0 ? totalTrades / dates.length : 0;

  // Realized PnL analysis
  let winningTrades = 0;
  let losingTrades = 0;
  let totalProfit = 0;
  let totalLoss = 0;

  sorted.forEach((t) => {
    const pnl = parseFloat(t.realizedPnl) || 0;
    if (pnl > 0) {
      winningTrades++;
      totalProfit += pnl;
    } else if (pnl < 0) {
      losingTrades++;
      totalLoss += Math.abs(pnl);
    }
  });

  const totalResolved = winningTrades + losingTrades;
  const winRate = totalResolved > 0 ? (winningTrades / totalResolved) * 100 : 0;

  let psychologyState = 'Disiplin Terjaga (Optimal)';
  let warning: string | null = null;

  if (avgTradesPerDay > 15) {
    psychologyState = 'Revenge Trading / Overtrading';
    warning =
      'Frekuensi transaksi Anda sangat tinggi dalam sehari. Emosi Anda mungkin sedang terpacu. Tarik napas dan istirahat sejenak untuk memulihkan fokus mental.';
  } else if (winRate < 40 && totalResolved >= 5) {
    psychologyState = 'Fear / Tilt Phase';
    warning =
      'Win rate transaksi Anda berada di bawah 40%. Turunkan ukuran posisi (size) dan evaluasi kembali setup teknikal sebelum mengambil risiko baru.';
  } else if (winRate > 75 && totalResolved >= 5) {
    psychologyState = 'Overconfident / Greed Hazard';
    warning =
      'Anda sedang dalam kemenangan beruntun. Waspadai godaan memperbesar leverage atau melanggar Stop Loss karena rasa terlalu percaya diri.';
  }

  return {
    psychologyState,
    warning,
    winRate: winRate.toFixed(1),
    totalTrades,
    avgTradesPerDay: avgTradesPerDay.toFixed(1),
    totalProfitUsd: totalProfit.toFixed(2),
    totalLossUsd: totalLoss.toFixed(2),
    recentActivity: sorted.slice(0, 10).map((t) => ({
      id: String(t.id),
      symbol: t.symbol,
      side: t.side.toLowerCase(),
      price: parseFloat(t.price),
      amount: parseFloat(t.qty),
      realizedPnl: parseFloat(t.realizedPnl),
      timestamp: t.time,
    })),
  };
}

function getDummyData(customWarning?: string) {
  const dummyAnalysis = {
    psychologyState: 'Overtrading / Tilt (Benchmark Demo)',
    warning:
      customWarning ||
      'Ini adalah data SIMULASI benchmark. Hubungkan API Key Binance Anda di atas untuk menganalisis kebiasaan trading dan psikologi riil Anda secara otomatis.',
    winRate: '35.5',
    totalTrades: 142,
    avgTradesPerDay: '18.5',
    totalProfitUsd: '124.50',
    totalLossUsd: '210.80',
    recentActivity: [
      {
        id: '1',
        symbol: 'BTCUSDT',
        side: 'buy',
        price: 64500,
        amount: 0.1,
        realizedPnl: 15.2,
        timestamp: Date.now() - 1000 * 60 * 5,
      },
      {
        id: '2',
        symbol: 'BTCUSDT',
        side: 'sell',
        price: 64100,
        amount: 0.1,
        realizedPnl: -22.5,
        timestamp: Date.now() - 1000 * 60 * 35,
      },
      {
        id: '3',
        symbol: 'ETHUSDT',
        side: 'buy',
        price: 3420,
        amount: 1.5,
        realizedPnl: 45.0,
        timestamp: Date.now() - 1000 * 60 * 120,
      },
      {
        id: '4',
        symbol: 'SOLUSDT',
        side: 'buy',
        price: 152,
        amount: 20,
        realizedPnl: -18.0,
        timestamp: Date.now() - 1000 * 60 * 180,
      },
    ],
  };

  return NextResponse.json({
    success: true,
    data: dummyAnalysis,
    isDummy: true,
    timestamp: Date.now(),
  });
}
