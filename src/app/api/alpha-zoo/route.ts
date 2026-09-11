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
    
    // Fetch Funding Rates
    let premiumIndexes: any[] = [];
    try {
      if (exchange.fapiPublicGetPremiumIndex) {
        premiumIndexes = await exchange.fapiPublicGetPremiumIndex();
      }
    } catch (e) {
      console.warn("Failed to fetch premium indexes", e);
    }
    const fundingMap = new Map<string, number>();
    for (const item of premiumIndexes) {
      if (item.symbol && item.lastFundingRate) {
        fundingMap.set(item.symbol, parseFloat(item.lastFundingRate));
      }
    }
    
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
        if (priceChangePct > 8) {
          anomalyType = 'BULLISH_VOLATILITY_BREAKOUT';
          score = 88;
          action = 'LONG (MOMENTUM RIDER)';
        } else if (priceChangePct < -8) {
          anomalyType = 'BEARISH_VOLATILITY_BREAKDOWN';
          score = 88;
          action = 'SHORT (BREAKDOWN RIDER)';
        }
      }
      
      // Algo 2: Abnormal Momentum Expansion (Parabolic Bull vs Heavy Capitulation)
      if (priceChangePct > 20) {
         anomalyType = 'PARABOLIC_BULL_EXPANSION';
         score = 94;
         action = 'LONG (BUY PULLBACK) / JANGAN SHORT';
      } else if (priceChangePct < -20) {
         anomalyType = 'HEAVY_CAPITULATION_DUMP';
         score = 92;
         action = 'WAIT FOR BASE (JANGAN TANGKAP PISAU JATUH)';
      }

      // Algo 3: Tight Consolidation (Low Volatility, waiting for explosion)
      if (volatility < 2 && ticker.quoteVolume > 50000000) {
        anomalyType = 'WHALE_ACCUMULATION_SQUEEZE';
        score = 80;
        action = 'WATCH_FOR_BREAKOUT';
      }
      
      const cleanBinanceSymbol = symbol.split(':')[0].replace('/', ''); // e.g. BTC/USDT:USDT -> BTCUSDT
      const fundingRate = fundingMap.get(cleanBinanceSymbol) || 0;
      const fundingRatePct = fundingRate * 100;
      
      // Algo 4: Funding Rate Anomaly (Extreme Funding)
      if (fundingRatePct < -0.10) {
        anomalyType = 'EXTREME_NEGATIVE_FUNDING (SHORT SQUEEZE RISK)';
        score = Math.max(score, 90);
        action = 'LONG (SHORT SQUEEZE SURGE)';
      } else if (fundingRatePct > 0.15) {
        anomalyType = 'OVERHEATED_BULLISH_SENTIMENT';
        score = Math.max(score, 82);
        action = 'WAIT & SEE / WASPADA PROFIT TAKING (JANGAN SHORT)';
      }
      
      if (anomalyType) {
        anomalyResults.push({
          symbol: cleanBinanceSymbol, // e.g., BTCUSDT
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
          const signal = await analyzeSpecificFuturesCoin(anomaly.symbol);
          if (signal) {
            (anomaly as any).microSignal = signal;
            
            // Check Orderbook Imbalance via REST API (Top 20 levels)
            let obInsight = '';
            try {
              if (exchange.fapiPublicGetDepth) {
                const depth = await exchange.fapiPublicGetDepth({ symbol: anomaly.symbol, limit: 20 });
                let totalBidQty = 0;
                let totalAskQty = 0;
                for (const bid of depth.bids) totalBidQty += parseFloat(bid[1]);
                for (const ask of depth.asks) totalAskQty += parseFloat(ask[1]);
                
                const imbalanceRatio = totalBidQty / (totalAskQty || 1);
                if (imbalanceRatio > 3.0) {
                  obInsight = `⚠️ ORDERBOOK IMBALANCE: Tembok Beli Raksasa (Bid ${imbalanceRatio.toFixed(1)}x lebih tebal dari Ask).`;
                  anomaly.anomalyType += ' + BUY WALL (BULLISH)';
                  anomaly.score = Math.min(100, anomaly.score + 4);
                } else if (imbalanceRatio < 0.33) {
                  const sellRatio = totalAskQty / (totalBidQty || 1);
                  obInsight = `⚠️ ORDERBOOK IMBALANCE: Tembok Jual Raksasa (Ask ${sellRatio.toFixed(1)}x lebih tebal dari Bid).`;
                  anomaly.anomalyType += ' + SELL WALL (BEARISH)';
                  anomaly.score = Math.min(100, anomaly.score + 4);
                }
              }
            } catch (obErr) {
               console.warn(`Gagal fetch orderbook untuk ${anomaly.symbol}`);
            }
            
            // Integrate micro-analysis to tweak anomaly type
            const rsiInsight = signal.indicatorExplanation?.rsiInsight || '';
            if (rsiInsight.toLowerCase().includes('divergence')) {
              anomaly.anomalyType += ' + RSI DIVERGENCE';
              anomaly.score = Math.min(100, anomaly.score + 5);
            } else if (signal.indicators?.rsi?.rsi12 !== undefined && signal.indicators.rsi.rsi12 > 80) {
              anomaly.anomalyType += ' + EXTREME OVERBOUGHT';
            } else if (signal.indicators?.rsi?.rsi12 !== undefined && signal.indicators.rsi.rsi12 < 20) {
              anomaly.anomalyType += ' + EXTREME OVERSOLD';
            }
            
            // Calculate Consensus dengan Proteksi Trend-Following
            const isMacroBull = anomaly.change24h >= 2.0;
            const isMacroBear = anomaly.change24h <= -2.0;
            
            if (isMacroBull) {
              // Jika tren 24 jam koin naik/pump, dilarang keras merekomendasikan SHORT!
              if (signal.direction === 'LONG') {
                (anomaly as any).consensusAction = 'STRONG BUY (TREN NAIK TERKONFIRMASI)';
              } else {
                (anomaly as any).consensusAction = 'TUNGGU PULLBACK (DIP BUYING)';
              }
            } else if (isMacroBear) {
              // Jika tren 24 jam koin dump tajam, dilarang merekomendasikan LONG sembarangan!
              if (signal.direction === 'SHORT') {
                (anomaly as any).consensusAction = 'STRONG SELL (BREAKDOWN TERKONFIRMASI)';
              } else {
                (anomaly as any).consensusAction = 'WAIT & SEE (RAWAN DUMP LANJUTAN)';
              }
            } else {
              (anomaly as any).consensusAction = 'WAIT & SEE (NETRAL / KONSOLIDASI)';
            }
            
            // Inject Alpha Zoo explanation into the card's signal
            signal.strategyLabel = anomaly.anomalyType.replace(/_/g, ' ');
            signal.rationale = `[Alpha Zoo: ${anomaly.anomalyType.replace(/_/g, ' ')}] Skor Anomali: ${anomaly.score}/100. Rekomendasi Makro: ${anomaly.action}. Volatilitas: ${anomaly.volatility24h.toFixed(2)}%. \n${obInsight ? obInsight + '\n' : ''}🛡️ Filter Trend: ${isMacroBull ? 'Momentum 24h Bullish Dominan (+'+anomaly.change24h.toFixed(1)+'%). Sinyal Short dinonaktifkan demi proteksi modal.' : isMacroBear ? 'Momentum 24h Bearish Dominan ('+anomaly.change24h.toFixed(1)+'%). Sinyal Long dinonaktifkan.' : 'Kondisi Konsolidasi.'} \nAnalisis Mikro: ${signal.rationale}`;
          }
        } catch (e) {
          // If micro analysis fails, just leave it without consensus
          console.error(`Micro analysis failed for ${anomaly.symbol}`, e);
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
