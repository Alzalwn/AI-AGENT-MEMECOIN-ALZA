'use client';

import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Activity, DollarSign, Target, ShieldAlert, ArrowRight, Loader2, RefreshCw } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface SignalData {
    ok: boolean;
    symbol: string;
    timeframe: string;
    timestamp: string;
    currentPrice: number;
    signal: 'LONG' | 'SHORT' | 'NEUTRAL';
    reason: string;
    entryPrice: number;
    takeProfit: number;
    stopLoss: number;
    indicators: {
        rsi: number;
        macd: { histogram: number; macd: number; signal: number };
        bollinger: { lower: number; middle: number; upper: number };
        ema20: number;
        adx: { adx: number; pdi: number; mdi: number };
        atr: number;
    }
}

export default function CryptoSignalGenerator() {
    const [symbol, setSymbol] = useState('BTC/USDT');
    const [timeframe, setTimeframe] = useState('1h');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<SignalData | null>(null);
    const [error, setError] = useState<string | null>(null);

    const generateSignal = async () => {
        setLoading(true);
        setError(null);
        setData(null);

        try {
            const res = await fetch(`/api/signals?symbol=${symbol}&timeframe=${timeframe}`);
            const result = await res.json();

            if (!res.ok || !result.ok) {
                throw new Error(result.error || 'Failed to fetch signal');
            }

            setData(result);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
            <div className="flex flex-col space-y-2 text-center md:text-left">
                <h2 className="text-3xl font-bold tracking-tight text-white flex items-center justify-center md:justify-start gap-2">
                    <Activity className="w-8 h-8 text-blue-500" />
                    AI Futures Signal
                </h2>
                <p className="text-gray-400">Analisis cerdas menggunakan indikator teknikal tingkat lanjut.</p>
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-4 p-4 rounded-2xl bg-[#111116] border border-gray-800 shadow-xl">
                <div className="flex-1 space-y-1">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Trading Pair</label>
                    <select
                        value={symbol}
                        onChange={(e) => setSymbol(e.target.value)}
                        className="w-full bg-[#1A1A24] border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    >
                        <option value="BTC/USDT">BTC/USDT</option>
                        <option value="ETH/USDT">ETH/USDT</option>
                        <option value="SOL/USDT">SOL/USDT</option>
                        <option value="BNB/USDT">BNB/USDT</option>
                        <option value="XRP/USDT">XRP/USDT</option>
                    </select>
                </div>
                <div className="flex-1 space-y-1">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Timeframe</label>
                    <select
                        value={timeframe}
                        onChange={(e) => setTimeframe(e.target.value)}
                        className="w-full bg-[#1A1A24] border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    >
                        <option value="15m">15m (Scalping)</option>
                        <option value="1h">1h (Day Trading)</option>
                        <option value="4h">4h (Swing Trading)</option>
                        <option value="1d">1d (Position)</option>
                    </select>
                </div>
                <div className="flex items-end">
                    <button
                        onClick={generateSignal}
                        disabled={loading}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-8 py-3 rounded-lg font-medium transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                        Generate
                    </button>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl text-sm">
                    {error}
                </div>
            )}

            {/* Results */}
            {data && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Main Signal Card */}
                    <div className="md:col-span-2 rounded-2xl bg-gradient-to-b from-[#16161D] to-[#0D0D12] border border-gray-800 overflow-hidden shadow-2xl relative">
                        <div className={cn(
                            "absolute top-0 left-0 w-full h-1",
                            data.signal === 'LONG' ? "bg-green-500" :
                            data.signal === 'SHORT' ? "bg-red-500" : "bg-gray-500"
                        )} />
                        
                        <div className="p-6 md:p-8 space-y-6">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-2xl font-bold text-white tracking-tight">{data.symbol}</h3>
                                    <p className="text-gray-400 text-sm">Market: Binance Futures • TF: {data.timeframe}</p>
                                </div>
                                <div className={cn(
                                    "px-4 py-2 rounded-full font-bold flex items-center gap-2",
                                    data.signal === 'LONG' ? "bg-green-500/10 text-green-400 border border-green-500/30" :
                                    data.signal === 'SHORT' ? "bg-red-500/10 text-red-400 border border-red-500/30" :
                                    "bg-gray-500/10 text-gray-400 border border-gray-500/30"
                                )}>
                                    {data.signal === 'LONG' && <TrendingUp className="w-5 h-5" />}
                                    {data.signal === 'SHORT' && <TrendingDown className="w-5 h-5" />}
                                    {data.signal === 'NEUTRAL' && <Activity className="w-5 h-5" />}
                                    {data.signal}
                                </div>
                            </div>

                            <div className="py-4 border-y border-gray-800/50">
                                <p className="text-sm font-medium text-gray-500 mb-1">Current Price</p>
                                <div className="text-4xl font-black text-white tracking-tighter">
                                    ${data.currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                                </div>
                                <p className="text-sm text-gray-400 mt-2 flex items-center gap-2">
                                    <ArrowRight className="w-4 h-4" /> {data.reason}
                                </p>
                            </div>

                            {data.signal !== 'NEUTRAL' && (
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                    <div className="bg-[#1A1A24] p-4 rounded-xl border border-gray-800">
                                        <div className="flex items-center gap-2 text-gray-400 text-sm font-medium mb-2">
                                            <DollarSign className="w-4 h-4 text-blue-400" /> Entry
                                        </div>
                                        <div className="text-lg font-bold text-white">
                                            ${data.entryPrice.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                                        </div>
                                    </div>
                                    <div className="bg-[#1A1A24] p-4 rounded-xl border border-gray-800">
                                        <div className="flex items-center gap-2 text-gray-400 text-sm font-medium mb-2">
                                            <Target className="w-4 h-4 text-green-400" /> Take Profit
                                        </div>
                                        <div className="text-lg font-bold text-green-400">
                                            ${data.takeProfit.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                                        </div>
                                    </div>
                                    <div className="bg-[#1A1A24] p-4 rounded-xl border border-gray-800 col-span-2 sm:col-span-1">
                                        <div className="flex items-center gap-2 text-gray-400 text-sm font-medium mb-2">
                                            <ShieldAlert className="w-4 h-4 text-red-400" /> Stop Loss
                                        </div>
                                        <div className="text-lg font-bold text-red-400">
                                            ${data.stopLoss.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Indicators Stats Card */}
                    <div className="rounded-2xl bg-[#111116] border border-gray-800 p-6 flex flex-col space-y-6">
                        <h3 className="text-lg font-bold text-white">Indicators X-Ray</h3>
                        
                        <div className="space-y-4 flex-1">
                            {/* RSI */}
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-400">RSI (14)</span>
                                    <span className={cn(
                                        "font-medium",
                                        data.indicators.rsi < 30 ? "text-green-400" :
                                        data.indicators.rsi > 70 ? "text-red-400" : "text-gray-300"
                                    )}>{data.indicators.rsi}</span>
                                </div>
                                <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-blue-500 rounded-full transition-all" 
                                        style={{ width: `${Math.min(100, Math.max(0, data.indicators.rsi))}%` }}
                                    />
                                </div>
                            </div>

                            {/* MACD */}
                            <div className="flex justify-between items-center py-2 border-b border-gray-800/50">
                                <span className="text-sm text-gray-400">MACD Hist</span>
                                <span className={cn(
                                    "font-medium text-sm",
                                    data.indicators.macd.histogram > 0 ? "text-green-400" : "text-red-400"
                                )}>
                                    {data.indicators.macd.histogram > 0 ? "+" : ""}{data.indicators.macd.histogram}
                                </span>
                            </div>

                            {/* ADX Trend Strength */}
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-400">Trend (ADX)</span>
                                    <span className={cn(
                                        "font-medium",
                                        data.indicators.adx.adx > 25 ? "text-green-400" : "text-yellow-400"
                                    )}>
                                        {data.indicators.adx.adx > 25 ? "Strong" : "Weak"} ({data.indicators.adx.adx})
                                    </span>
                                </div>
                                <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-indigo-500 rounded-full transition-all" 
                                        style={{ width: `${Math.min(100, Math.max(0, data.indicators.adx.adx))}%` }}
                                    />
                                </div>
                            </div>

                            {/* EMA 20 */}
                            <div className="flex justify-between items-center py-2 border-b border-gray-800/50">
                                <span className="text-sm text-gray-400">EMA (20)</span>
                                <span className="font-medium text-gray-300 text-sm">
                                    ${data.indicators.ema20.toLocaleString()}
                                </span>
                            </div>

                            {/* ATR */}
                            <div className="flex justify-between items-center py-2">
                                <span className="text-sm text-gray-400">Volatility (ATR)</span>
                                <span className="font-medium text-gray-300 text-sm">
                                    ${data.indicators.atr.toLocaleString()}
                                </span>
                            </div>
                        </div>

                        <div className="text-xs text-gray-500 text-center mt-4">
                            Last updated: {new Date(data.timestamp).toLocaleTimeString()}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
