'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTradingAgent } from '../../hooks/useTradingAgent';
import { LogCategory, LogMessage } from '../../types/trading';
import {
  Terminal as TerminalIcon,
  Trash2,
  ArrowDown,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Info,
  Zap
} from 'lucide-react';
import Badge from '../ui/Badge';

export const TerminalLogs: React.FC = () => {
  const { logs, clearLogs } = useTradingAgent();
  const [selectedCategory, setSelectedCategory] = useState<LogCategory | 'ALL'>('ALL');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const filteredLogs = logs.filter((log) => {
    if (selectedCategory === 'ALL') return true;
    return log.category === selectedCategory;
  });

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = 0; // Since logs are prepended (newest at top)
    }
  }, [logs, autoScroll]);

  const categories: (LogCategory | 'ALL')[] = [
    'ALL',
    'SCAN',
    'RISK',
    'JITO',
    'EXECUTION',
    'SYSTEM'
  ];

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'SUCCESS':
        return <CheckCircle2 className="w-3 h-3 text-emerald-400" />;
      case 'WARN':
        return <AlertTriangle className="w-3 h-3 text-amber-400" />;
      case 'DANGER':
        return <AlertTriangle className="w-3 h-3 text-rose-500" />;
      default:
        return <Info className="w-3 h-3 text-cyan-400" />;
    }
  };

  return (
    <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800/80 rounded-2xl p-4 font-mono shadow-xl flex flex-col h-[320px]">
      {/* Top Header & Filter Bar */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            <TerminalIcon className="w-4 h-4" />
          </div>
          <span className="font-black text-xs tracking-wider text-zinc-100 uppercase">
            Live Terminal Execution Stream
          </span>
          <span className="text-[10px] text-zinc-500">({logs.length} events)</span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoScroll((v) => !v)}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
              autoScroll
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400'
            }`}
            title="Toggle Auto Scroll"
          >
            <ArrowDown className="w-3 h-3" />
            <span>Auto</span>
          </button>

          <button
            onClick={clearLogs}
            className="p-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
            title="Bersihkan Log"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Category Pills Filter */}
      <div className="flex items-center gap-1.5 py-2 overflow-x-auto scrollbar-none border-b border-zinc-800/60">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              selectedCategory === cat
                ? 'bg-zinc-100 text-zinc-950 font-black'
                : 'bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Terminal Output Log Feed */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-1.5 pt-2 pr-1 text-[11px] select-text scrollbar-thin scrollbar-thumb-zinc-800"
      >
        {filteredLogs.length > 0 ? (
          filteredLogs.map((item) => {
            const date = new Date(item.timestamp);
            const timeStr = date.toTimeString().split(' ')[0];
            const ms = String(date.getMilliseconds()).padStart(3, '0');

            return (
              <div
                key={item.id}
                className="flex items-start gap-2 py-0.5 hover:bg-zinc-800/40 px-1.5 rounded transition-colors group"
              >
                {/* Timestamp */}
                <span className="text-[10px] text-zinc-600 shrink-0 select-none">
                  [{timeStr}.{ms}]
                </span>

                {/* Level Icon */}
                <span className="shrink-0 mt-0.5">{getLevelIcon(item.level)}</span>

                {/* Category Tag */}
                <span
                  className={`text-[9px] px-1 py-0.2 rounded font-black tracking-wider shrink-0 ${
                    item.category === 'JITO'
                      ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                      : item.category === 'RISK'
                      ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                      : item.category === 'EXECUTION'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                  }`}
                >
                  {item.category}
                </span>

                {/* Log Message */}
                <span
                  className={`flex-1 break-all leading-relaxed ${
                    item.level === 'SUCCESS'
                      ? 'text-emerald-400'
                      : item.level === 'WARN'
                      ? 'text-amber-300'
                      : item.level === 'DANGER'
                      ? 'text-rose-400'
                      : 'text-zinc-300'
                  }`}
                >
                  {item.message}
                </span>
              </div>
            );
          })
        ) : (
          <div className="h-full flex items-center justify-center text-zinc-600 text-xs">
            Tidak ada pesan log pada kategori ini
          </div>
        )}
      </div>
    </div>
  );
};

export default TerminalLogs;
