'use client';

import React from 'react';
import { X } from 'lucide-react';
import { BinanceFuturesSignal } from '../../types/futures';
import { TradeSetupChart } from './TradeSetupChart';

interface TradingViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string; // e.g. "BTCUSDT" or "SOLUSDT"
  signal?: BinanceFuturesSignal | null;
}

export const TradingViewModal: React.FC<TradingViewModalProps> = ({
  isOpen,
  onClose,
  symbol,
  signal,
}) => {
  if (!isOpen || !symbol) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-5 bg-black/85 backdrop-blur-md animate-fade-in font-sans">
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-6xl h-[88vh] flex flex-col shadow-2xl overflow-hidden border-yellow-500/20 relative">
        {/* Modal Close Button (Floating Top-Right) */}
        <button
          onClick={onClose}
          className="absolute right-4 top-3 z-20 p-2 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all border border-zinc-700/80 cursor-pointer shadow-lg"
          title="Tutup Chart"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Trade Setup Chart Component */}
        <div className="flex-1 w-full h-full overflow-hidden">
          <TradeSetupChart
            symbol={symbol}
            signal={signal}
            defaultDirection={signal?.direction || 'LONG'}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
};
