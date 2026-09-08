'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal as TerminalIcon,
  Play,
  Pause,
  Trash2,
  Copy,
  Check,
  ArrowDownCircle,
  Filter,
  Radio,
  ExternalLink,
  ChevronDown
} from 'lucide-react';

export interface TerminalLog {
  id: string;
  timestamp: string;
  level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR';
  source: string;
  message: string;
}

export const LiveTerminalPanel: React.FC = () => {
  const [logs, setLogs] = useState<TerminalLog[]>([]);
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [isAutoScroll, setIsAutoScroll] = useState<boolean>(true);
  const [logFilter, setLogFilter] = useState<'ALL' | 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR'>('ALL');
  const [copied, setCopied] = useState<boolean>(false);
  const terminalEndRef = useRef<HTMLDivElement | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Subscribe to SSE PM2 logs endpoint
  useEffect(() => {
    let es: EventSource | null = null;

    if (isStreaming) {
      es = new EventSource('/api/vps/pm2-logs?stream=true');
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        try {
          const logEntry: TerminalLog = JSON.parse(event.data);
          setLogs((prev) => {
            // Keep max 250 log entries to ensure fast rendering
            const updated = [...prev, logEntry];
            return updated.length > 250 ? updated.slice(updated.length - 250) : updated;
          });
        } catch (e) {
          console.error('Error parsing SSE log:', e);
        }
      };

      es.onerror = () => {
        // SSE disconnected, attempt fallback
      };
    }

    return () => {
      if (es) es.close();
    };
  }, [isStreaming]);

  // Auto-scroll to bottom whenever logs change and autoScroll is on
  useEffect(() => {
    if (isAutoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isAutoScroll]);

  const handleCopyLogs = () => {
    const rawText = logs
      .map((l) => `[${l.timestamp}] [${l.level}] [${l.source}]: ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setLogs([]);
  };

  const filteredLogs = logs.filter((l) => {
    if (logFilter === 'ALL') return true;
    return l.level === logFilter;
  });

  return (
    <div className="flex flex-col w-full h-full bg-[#101010] border border-[#2e2e2e] rounded-xl overflow-hidden shadow-2xl font-mono text-xs">
      {/* Terminal Header Bar */}
      <div className="h-11 bg-[#171717] border-b border-[#2e2e2e] px-4 flex items-center justify-between gap-3 shrink-0 select-none">
        {/* Left: Terminal Process Tag */}
        <div className="flex items-center gap-2.5">
          <TerminalIcon className="w-4 h-4 text-[#3ecf8e]" />
          <span className="font-bold text-zinc-200">
            pm2: <span className="text-[#3ecf8e]">signal-daemon</span> (id: 0)
          </span>
          <span className="text-zinc-600 hidden sm:inline">•</span>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#1f1f1f] border border-[#2b2b2b] text-[10px] text-zinc-400">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isStreaming ? 'bg-[#3ecf8e] animate-pulse' : 'bg-amber-400'
              }`}
            />
            <span>{isStreaming ? 'LIVE STREAM' : 'PAUSED'}</span>
          </div>
        </div>

        {/* Right: Controls & Filters */}
        <div className="flex items-center gap-2">
          {/* Level Filter Dropdown / Buttons */}
          <div className="hidden md:flex items-center bg-[#1c1c1c] border border-[#2e2e2e] rounded-md p-0.5 text-[11px]">
            {(['ALL', 'INFO', 'SUCCESS', 'WARN', 'ERROR'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setLogFilter(filter)}
                className={`px-2 py-0.5 rounded transition-all ${
                  logFilter === filter
                    ? 'bg-[#2b2b2b] text-zinc-100 font-bold'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Pause / Resume Button */}
          <button
            onClick={() => setIsStreaming((prev) => !prev)}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1c1c1c] hover:bg-[#252525] border border-[#2e2e2e] text-zinc-300 transition-colors"
            title={isStreaming ? 'Pause streaming logs' : 'Resume streaming logs'}
          >
            {isStreaming ? (
              <>
                <Pause className="w-3 h-3 text-amber-400" />
                <span className="hidden sm:inline text-[11px]">Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3 h-3 text-[#3ecf8e]" />
                <span className="hidden sm:inline text-[11px]">Resume</span>
              </>
            )}
          </button>

          {/* Auto-Scroll Toggle */}
          <button
            onClick={() => setIsAutoScroll((prev) => !prev)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded border transition-colors ${
              isAutoScroll
                ? 'bg-[#3ecf8e]/10 border-[#3ecf8e]/40 text-[#3ecf8e]'
                : 'bg-[#1c1c1c] border-[#2e2e2e] text-zinc-400'
            }`}
            title="Toggle auto-scroll to bottom"
          >
            <ArrowDownCircle className="w-3 h-3" />
            <span className="hidden sm:inline text-[11px]">Auto-Scroll</span>
          </button>

          {/* Copy Logs */}
          <button
            onClick={handleCopyLogs}
            className="p-1.5 rounded bg-[#1c1c1c] hover:bg-[#252525] border border-[#2e2e2e] text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Copy logs to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#3ecf8e]" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Clear Terminal */}
          <button
            onClick={handleClear}
            className="p-1.5 rounded bg-[#1c1c1c] hover:bg-[#252525] border border-[#2e2e2e] text-zinc-400 hover:text-rose-400 transition-colors"
            title="Clear terminal screen"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Body Window */}
      <div className="flex-1 bg-[#0b0b0b] p-4 overflow-y-auto space-y-1 select-text scrollbar-thin scrollbar-thumb-zinc-800">
        {filteredLogs.length === 0 ? (
          <div className="text-zinc-600 italic py-8 text-center">
            [Waiting for PM2 stdout/stderr stream from VPS daemon...]
          </div>
        ) : (
          filteredLogs.map((log) => {
            let levelColor = 'text-zinc-300';
            let badgeBg = 'bg-zinc-800 text-zinc-400 border-zinc-700';

            if (log.level === 'SUCCESS') {
              levelColor = 'text-[#3ecf8e]';
              badgeBg = 'bg-[#3ecf8e]/10 text-[#3ecf8e] border-[#3ecf8e]/30';
            } else if (log.level === 'WARN') {
              levelColor = 'text-amber-400';
              badgeBg = 'bg-amber-500/10 text-amber-400 border-amber-500/30';
            } else if (log.level === 'ERROR') {
              levelColor = 'text-rose-400 font-bold';
              badgeBg = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
            } else if (log.level === 'INFO') {
              levelColor = 'text-zinc-200';
              badgeBg = 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30';
            }

            return (
              <div
                key={log.id}
                className="flex items-start gap-2 hover:bg-[#151515] px-2 py-0.5 rounded transition-colors"
              >
                {/* Timestamp */}
                <span className="text-zinc-600 shrink-0 text-[11px] select-none">
                  [{log.timestamp.slice(-8)}]
                </span>

                {/* Level Pill */}
                <span
                  className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded border shrink-0 select-none ${badgeBg}`}
                >
                  {log.level}
                </span>

                {/* Service Tag */}
                <span className="text-zinc-400 font-semibold shrink-0 text-[11px]">
                  [{log.source}]:
                </span>

                {/* Message */}
                <span className={`break-all ${levelColor}`}>{log.message}</span>
              </div>
            );
          })
        )}

        {/* Live Terminal Prompt Anchor */}
        <div className="flex items-center gap-2 pt-2 text-zinc-500 select-none">
          <span className="text-[#3ecf8e]">solana-bot@vps-production</span>:
          <span className="text-cyan-400">~/app</span>$
          <span className="inline-block w-2 h-3.5 bg-[#3ecf8e] animate-pulse align-middle" />
        </div>

        {/* Scroll anchor target */}
        <div ref={terminalEndRef} />
      </div>

      {/* Terminal Footer Status */}
      <div className="h-7 bg-[#141414] border-t border-[#262626] px-4 flex items-center justify-between text-[10px] text-zinc-500 shrink-0">
        <div className="flex items-center gap-3">
          <span>Buffer: {filteredLogs.length} events</span>
          <span>•</span>
          <span>Encoding: UTF-8</span>
          <span>•</span>
          <span>Target: ~/.pm2/logs/signal-daemon-out.log</span>
        </div>
        <div className="flex items-center gap-2 text-[#3ecf8e]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#3ecf8e]" />
          <span>gRPC & Jito Subscriptions Active</span>
        </div>
      </div>
    </div>
  );
};

export default LiveTerminalPanel;
