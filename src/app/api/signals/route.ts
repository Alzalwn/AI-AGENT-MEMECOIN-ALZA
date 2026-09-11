import { NextResponse } from 'next/server';
import ccxt from 'ccxt';
import { RSI, MACD, BollingerBands, EMA, ADX, ATR } from 'technicalindicators';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') || 'BTC/USDT';
    const timeframe = searchParams.get('timeframe') || '1h';

    try {
        const exchange = new ccxt.binance({
            enableRateLimit: true,
            options: { defaultType: 'future' } // Use futures market as requested
        });

        // Fetch OHLCV: [timestamp, open, high, low, close, volume]
        const limit = 200; // Need enough data for 200 SMA and proper indicator smoothing
        const ohlcv = await exchange.fetchOHLCV(symbol, timeframe, undefined, limit);

        if (!ohlcv || ohlcv.length === 0) {
            return NextResponse.json({ error: 'No data returned from exchange' }, { status: 400 });
        }

        const highs = ohlcv.map(c => c[2] as number);
        const lows = ohlcv.map(c => c[3] as number);
        const closes = ohlcv.map(c => c[4] as number);

        // Technical Indicators
        const rsiValues = RSI.calculate({ values: closes, period: 14 });
        const macdValues = MACD.calculate({ values: closes, fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, SimpleMAOscillator: false, SimpleMASignal: false });
        const bbValues = BollingerBands.calculate({ values: closes, period: 20, stdDev: 2 });
        const ema20Values = EMA.calculate({ values: closes, period: 20 });
        
        // ADX - Extra feature (Trend Strength)
        const adxValues = ADX.calculate({ high: highs, low: lows, close: closes, period: 14 });
        
        // ATR for Risk Management
        const atrValues = ATR.calculate({ high: highs, low: lows, close: closes, period: 14 });

        // Get latest values
        const currentPrice = closes[closes.length - 1];
        const latestRSI = rsiValues.length > 0 ? rsiValues[rsiValues.length - 1] : 50;
        const latestMACD = macdValues.length > 0 ? macdValues[macdValues.length - 1] : { MACD: 0, signal: 0, histogram: 0 };
        const latestBB = bbValues.length > 0 ? bbValues[bbValues.length - 1] : { lower: 0, middle: 0, upper: 0 };
        const latestEMA20 = ema20Values.length > 0 ? ema20Values[ema20Values.length - 1] : currentPrice;
        const latestADX = adxValues.length > 0 ? adxValues[adxValues.length - 1] : { adx: 0, pdi: 0, mdi: 0 };
        const latestATR = atrValues.length > 0 ? atrValues[atrValues.length - 1] : currentPrice * 0.02;

        // Signal Logic
        let signal = 'NEUTRAL';
        let reason = 'Market is ranging or conflicting indicators.';
        
        // ADX > 25 indicates strong trend
        const isTrending = latestADX.adx > 25;
        
        if (latestRSI < 40 && latestMACD.histogram! > 0 && currentPrice > latestEMA20) {
            signal = 'LONG';
            reason = 'RSI Oversold recovery + MACD Bullish + Price > EMA20';
        } else if (latestRSI > 60 && latestMACD.histogram! < 0 && currentPrice < latestEMA20) {
            signal = 'SHORT';
            reason = 'RSI Overbought rejection + MACD Bearish + Price < EMA20';
        } else if (isTrending && latestADX.pdi > latestADX.mdi && latestMACD.histogram! > 0) {
             signal = 'LONG';
             reason = 'Strong Uptrend (ADX) + MACD Bullish';
        } else if (isTrending && latestADX.mdi > latestADX.pdi && latestMACD.histogram! < 0) {
             signal = 'SHORT';
             reason = 'Strong Downtrend (ADX) + MACD Bearish';
        }

        // Risk Management (Entry, SL, TP)
        const entryPrice = currentPrice;
        let stopLoss = 0;
        let takeProfit = 0;

        if (signal === 'LONG') {
            // SL below recent ATR
            stopLoss = entryPrice - (latestATR * 1.5);
            // Risk Reward 1:2
            takeProfit = entryPrice + ((entryPrice - stopLoss) * 2);
        } else if (signal === 'SHORT') {
            stopLoss = entryPrice + (latestATR * 1.5);
            takeProfit = entryPrice - ((stopLoss - entryPrice) * 2);
        }

        return NextResponse.json({
            ok: true,
            symbol,
            timeframe,
            timestamp: new Date().toISOString(),
            currentPrice,
            signal,
            reason,
            entryPrice,
            takeProfit,
            stopLoss,
            indicators: {
                rsi: Number(latestRSI.toFixed(2)),
                macd: {
                    histogram: Number(latestMACD.histogram?.toFixed(4) || 0),
                    macd: Number(latestMACD.MACD?.toFixed(4) || 0),
                    signal: Number(latestMACD.signal?.toFixed(4) || 0)
                },
                bollinger: {
                    lower: Number(latestBB.lower.toFixed(2)),
                    middle: Number(latestBB.middle.toFixed(2)),
                    upper: Number(latestBB.upper.toFixed(2))
                },
                ema20: Number(latestEMA20.toFixed(2)),
                adx: {
                    adx: Number(latestADX.adx.toFixed(2)),
                    pdi: Number(latestADX.pdi.toFixed(2)),
                    mdi: Number(latestADX.mdi.toFixed(2))
                },
                atr: Number(latestATR.toFixed(2))
            }
        });
    } catch (error: any) {
        console.error('Signal Generator Error:', error);
        return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }
}
