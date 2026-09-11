import { NextResponse } from 'next/server';
import ccxt from 'ccxt';

export async function GET() {
  try {
    const exchange = new ccxt.binance({
      options: { defaultType: 'future' },
      enableRateLimit: true,
    });

    // Fetch all tickers
    const tickers = await exchange.fetchTickers();
    
    const anomalyResults = [];
    
    // Simple Alpha Zoo Algorithms
    for (const symbol in tickers) {
      if (!symbol.endsWith(':USDT')) continue; // only USDT-M futures
      
      const ticker = tickers[symbol];
      if (!ticker.last || !ticker.baseVolume || !ticker.quoteVolume) continue;
      
      // We need sufficient volume to filter out noise
      if (ticker.quoteVolume < 10000000) continue; // Minimum $10M 24h volume
      
      const priceChangePct = ticker.percentage || 0;
      const volatility = ((ticker.high! - ticker.low!) / ticker.low!) * 100;
      
      let anomalyType = null;
      let score = 0;
      let action = 'NEUTRAL';
      
      // Algo 1: Extreme Squeeze / Breakout (High Volatility + Strong Direction)
      if (volatility > 15) {
        if (priceChangePct > 10) {
          anomalyType = 'BULLISH_VOLATILITY_BREAKOUT';
          score = 85;
          action = 'LONG';
        } else if (priceChangePct < -10) {
          anomalyType = 'BEARISH_VOLATILITY_BREAKOUT';
          score = 88;
          action = 'SHORT';
        }
      }
      
      // Algo 2: Abnormal Pump & Dump
      if (priceChangePct > 25) {
         anomalyType = 'EXTREME_PUMP_WARNING';
         score = 92;
         action = 'SHORT (MEAN REVERSION)';
      } else if (priceChangePct < -25) {
         anomalyType = 'EXTREME_DUMP_WARNING';
         score = 95;
         action = 'LONG (MEAN REVERSION)';
      }

      // Algo 3: Tight Consolidation (Low Volatility, waiting for explosion)
      if (volatility < 2 && ticker.quoteVolume > 50000000) {
        anomalyType = 'WHALE_ACCUMULATION_SQUEEZE';
        score = 80;
        action = 'WATCH_FOR_BREAKOUT';
      }
      
      if (anomalyType) {
        anomalyResults.push({
          symbol: symbol.replace(':USDT', ''),
          price: ticker.last,
          change24h: priceChangePct,
          volatility24h: volatility,
          volumeUsd: ticker.quoteVolume,
          anomalyType,
          score,
          action,
          timestamp: Date.now()
        });
      }
    }
    
    // Sort by score descending
    anomalyResults.sort((a, b) => b.score - a.score);

    return NextResponse.json({
      success: true,
      data: anomalyResults.slice(0, 20), // Return top 20 anomalies
      totalScanned: Object.keys(tickers).length,
      timestamp: Date.now()
    });

  } catch (error: any) {
    console.error('Alpha Zoo API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
