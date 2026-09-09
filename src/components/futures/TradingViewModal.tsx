'use client';

import React, { useEffect, useRef } from 'react';
import { X, ExternalLink, Maximize2 } from 'lucide-react';

interface TradingViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string; // e.g. "BTCUSDT" or "SOLUSDT"
}

export const TradingViewModal: React.FC<TradingViewModalProps> = ({
  isOpen,
  onClose,
  symbol,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !symbol) return;

    // Clean up previous widget
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }

    // Embed official TradingView Advanced Real-Time Chart Widget
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      // @ts-expect-error TradingView global comes from external script
      if (typeof window.TradingView !== 'undefined' && containerRef.current) {
        // @ts-expect-error TradingView global constructor
        new window.TradingView.widget({
          autosize: true,
          symbol: `BINANCE:${symbol}.P`,
          interval: '15',
          timezone: 'Asia/Jakarta',
          theme: 'dark',
          style: '1',
          locale: 'id',
          toolbar_bg: '#09090b',
          enable_publishing: false,
          allow_symbol_change: true,
          container_id: 'tradingview_futures_container',
          studies: ['RSI@tv-basicstudies', 'MASimple@tv-basicstudies'],
        });
      }
    };

    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [isOpen, symbol]);

  if (!isOpen) return null;

  const binanceUrl = `https://www.binance.com/en/futures/${symbol}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in font-sans">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-6xl h-[85vh] flex flex-col shadow-2xl overflow-hidden border-emerald-500/20">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-zinc-800/80 bg-zinc-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center font-black text-xs text-yellow-400">
              BIN
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-zinc-100 font-mono tracking-wide">
                  {symbol} <span className="text-xs text-zinc-400 font-normal">Perpetual Futures</span>
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  LIVE 15M
                </span>
              </div>
              <p className="text-[11px] text-zinc-500">
                TradingView Interactive Candlestick Chart (RSI & Moving Average)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={binanceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 text-xs font-bold transition-all"
            >
              <span>Buka di Binance</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-all border border-zinc-800 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TradingView Chart Container */}
        <div className="flex-1 w-full bg-zinc-950 relative">
          <div
            id="tradingview_futures_container"
            ref={containerRef}
            className="w-full h-full"
          />
        </div>
      </div>
    </div>
  );
};
