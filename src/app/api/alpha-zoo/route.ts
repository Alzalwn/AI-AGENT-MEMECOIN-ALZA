import { NextResponse } from 'next/server';
import ccxt from 'ccxt';
import { analyzeSpecificFuturesCoin } from '@/engine/futuresSignalEngine';

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
    
    // Get top 10 for micro analysis
    const topAnomalies = anomalyResults.slice(0, 10);
    
    // Run micro analysis (15m technicals) concurrently
    await Promise.allSettled(
      topAnomalies.map(async (anomaly) => {
        try {
          // analyzeSpecificFuturesCoin expects the pair symbol like BTCUSDT
          const signal = await analyzeSpecificFuturesCoin(anomaly.symbol + 'USDT');
          if (signal) {
            (anomaly as any).microSignal = signal;
            
            // Calculate Consensus
            const macroActionBase = anomaly.action.includes('LONG') ? 'LONG' : anomaly.action.includes('SHORT') ? 'SHORT' : 'NEUTRAL';
            const microActionBase = signal.direction;
            
            if (macroActionBase === 'LONG' && microActionBase === 'LONG') {
              (anomaly as any).consensusAction = 'STRONG BUY (TERKONFIRMASI)';
            } else if (macroActionBase === 'SHORT' && microActionBase === 'SHORT') {
              (anomaly as any).consensusAction = 'STRONG SELL (TERKONFIRMASI)';
            } else {
              (anomaly as any).consensusAction = 'WAIT & SEE (RAWAN FAKEOUT)';
            }
          }
        } catch (e) {
          // If micro analysis fails, just leave it without consensus
        }
      })
    );

    return NextResponse.json({
      success: true,
      data: topAnomalies, // Return top anomalies with consensus
      totalScanned: Object.keys(tickers).length,
      timestamp: Date.now()
    });

  } catch (error: any) {
    console.error('Alpha Zoo API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
