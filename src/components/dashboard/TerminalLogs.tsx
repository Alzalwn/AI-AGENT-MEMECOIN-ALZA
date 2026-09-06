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
  Zap,
  Search
} from 'lucide-react';
import Badge from '../ui/Badge';
import CollapsibleCard from '../ui/CollapsibleCard';

export const TerminalLogs: React.FC = () => {
  const { logs, clearLogs } = useTradingAgent();
  const [selectedCategory, setSelectedCategory] = useState<LogCategory | 'ALL'>('ALL');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const filteredLogs = logs.filter((log) => {
    if (selectedCategory !== 'ALL' && log.category !== selectedCategory) return false;
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      const matchMsg = log.message.toLowerCase().includes(q);
      const matchCat = log.category.toLowerCase().includes(q);
      const matchLevel = log.level.toLowerCase().includes(q);
      return matchMsg || matchCat || matchLevel;
    }
    return true;
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
    <CollapsibleCard
      title="Terminal Logs"
      subtitle="Execution Stream"
      badge={`${logs.length} EVENTS`}
      badgeVariant="cyan"
      icon={<TerminalIcon className="w-4 h-4 text-cyan-400" />}
      storageKey="card_terminal_logs"
      defaultCollapsed={false}
      headerActions={
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setAutoScroll((v) => !v)}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
              autoScroll
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400'
            }`}
            title="Toggle Auto Scroll"
          >
            <ArrowDown className="w-3 h-3" />
            <span className="hidden sm:inline">Auto</span>
          </button>

          <button
            type="button"
            onClick={clearLogs}
            className="p-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer"
            title="Bersihkan Log"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      }
    >
      <div className="flex flex-col h-[280px] font-mono">
        {/* Category Pills & Search Filter */}
        <div className="flex flex-col gap-1.5 pb-2 border-b border-zinc-800/60">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
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

          <div className="relative">
            <Search className="w-3 h-3 text-zinc-500 absolute left-2 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Filter log (misal: Jupiter, error, Jito, buy)..."
              className="w-full bg-zinc-950/80 border border-zinc-800 focus:border-cyan-500 text-zinc-200 pl-6 pr-6 py-1 rounded-lg text-[10px] focus:outline-none transition-all placeholder:text-zinc-600"
            />
            {searchFilter && (
              <button
                type="button"
                onClick={() => setSearchFilter('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-[10px]"
              >
                ✕
              </button>
            )}
          </div>
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
                    className={`leading-relaxed break-words flex-1 ${
                      item.level === 'DANGER'
                        ? 'text-rose-400 font-bold'
                        : item.level === 'WARN'
                        ? 'text-amber-300'
                        : item.level === 'SUCCESS'
                        ? 'text-emerald-300'
                        : 'text-zinc-300'
                    }`}
                  >
                    {item.message}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="text-zinc-600 text-center py-8 text-xs">
              {searchFilter
                ? `Tidak ada log yang cocok dengan "${searchFilter}"`
                : 'Belum ada log aktivitas terminal'}
            </div>
          )}
        </div>
      </div>
    </CollapsibleCard>
  );
};

export default TerminalLogs;
