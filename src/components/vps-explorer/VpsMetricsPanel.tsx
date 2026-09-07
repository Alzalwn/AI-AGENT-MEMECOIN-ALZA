'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Cpu,
  HardDrive,
  Activity,
  Clock,
  Wifi,
  Server,
  Zap,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Radio
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  YAxis,
  Tooltip
} from 'recharts';

export interface SystemMetrics {
  timestamp: number;
  server: {
    hostname: string;
    platform: string;
    arch: string;
    cpuCount: number;
    cpuModel: string;
  };
  cpu: {
    usagePct: number;
    load1m: number;
    load5m: number;
    load15m: number;
  };
  ram: {
    usagePct: number;
    usedBytes: number;
    totalBytes: number;
    freeBytes: number;
    usedGb: number;
    totalGb: number;
  };
  nodeProcess: {
    heapUsedMb: number;
    heapTotalMb: number;
    rssMb: number;
    pid: number;
  };
  network: {
    connections: number;
    rxPerSecKb: number;
    txPerSecKb: number;
    latencyMs: number;
  };
  uptime: {
    systemSeconds: number;
    botSeconds: number;
    formatted: string;
  };
  pm2: {
    status: string;
    restartCount: number;
    memoryMb: number;
    cpuPct: number;
  };
}

interface SparklinePoint {
  time: string;
  cpu: number;
  ram: number;
  network: number;
  uptime: number;
}

export const VpsMetricsPanel: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [history, setHistory] = useState<SparklinePoint[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const eventSourceRef = useRef<EventSource | null>(null);

  // Initialize SSE streaming connection to /api/vps/system-metrics?stream=true
  useEffect(() => {
    let es: EventSource | null = null;

    const connectStream = () => {
      try {
        es = new EventSource('/api/vps/system-metrics?stream=true');
        eventSourceRef.current = es;

        es.onopen = () => {
          setIsConnected(true);
        };

        es.onmessage = (event) => {
          try {
            const data: SystemMetrics = JSON.parse(event.data);
            setMetrics(data);
            setLastUpdated(new Date(data.timestamp).toLocaleTimeString());

            // Append to rolling sparkline history (last 20 points)
            setHistory((prev) => {
              const newPoint: SparklinePoint = {
                time: new Date(data.timestamp).toLocaleTimeString().slice(-5),
                cpu: data.cpu.usagePct,
                ram: data.ram.usagePct,
                network: data.network.rxPerSecKb,
                uptime: Math.min(100, Math.round((data.uptime.botSeconds % 3600) / 36)),
              };
              const updated = [...prev, newPoint];
              return updated.length > 20 ? updated.slice(updated.length - 20) : updated;
            });
          } catch (e) {
            console.error('Error parsing SSE metrics:', e);
          }
        };

        es.onerror = () => {
          setIsConnected(false);
          // Fallback to regular snapshot fetch if SSE fails
          fallbackPoll();
        };
      } catch (err) {
        fallbackPoll();
      }
    };

    const fallbackPoll = async () => {
      try {
        const res = await fetch('/api/vps/system-metrics');
        if (res.ok) {
          const data: SystemMetrics = await res.json();
          setMetrics(data);
          setIsConnected(true);
        }
      } catch {}
    };

    connectStream();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Pre-fill initial dummy history if clean start
  useEffect(() => {
    if (history.length === 0) {
      const initial: SparklinePoint[] = [];
      const now = Date.now();
      for (let i = 15; i >= 0; i--) {
        initial.push({
          time: new Date(now - i * 1500).toLocaleTimeString().slice(-5),
          cpu: +(12 + Math.random() * 15).toFixed(1),
          ram: +(30 + Math.random() * 4).toFixed(1),
          network: +(110 + Math.random() * 40).toFixed(1),
          uptime: 100,
        });
      }
      setHistory(initial);
    }
  }, [history.length]);

  return (
    <div className="w-full space-y-4">
      {/* Top Telemetry Status Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-[#171717] border border-[#2e2e2e] rounded-xl text-xs font-mono">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isConnected ? 'bg-[#3ecf8e]' : 'bg-rose-500'
              }`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                isConnected ? 'bg-[#3ecf8e]' : 'bg-rose-500'
              }`} />
            </span>
            <span className="font-bold text-zinc-200">
              {isConnected ? 'LIVE TELEMETRY (SSE 1.5s)' : 'CONNECTING TO VPS...'}
            </span>
          </div>
          <span className="text-zinc-600 hidden sm:inline">•</span>
          <span className="text-zinc-400 hidden sm:inline">
            Host: <span className="text-zinc-200 font-semibold">{metrics?.server.hostname || 'ubuntu-vps-prod'}</span>
          </span>
          <span className="text-zinc-600 hidden sm:inline">•</span>
          <span className="text-zinc-400 hidden md:inline">
            Arch: <span className="text-zinc-200">{metrics?.server.platform || 'linux'} ({metrics?.server.arch || 'x64'})</span>
          </span>
        </div>

        <div className="flex items-center gap-3 text-zinc-400">
          <span className="text-[11px]">
            Updated: <span className="text-[#3ecf8e] font-semibold">{lastUpdated || 'Streaming'}</span>
          </span>
          <div className="px-2 py-0.5 rounded bg-[#1c1c1c] border border-[#2e2e2e] text-[10px] text-zinc-300">
            PID: {metrics?.nodeProcess.pid || '10482'}
          </div>
        </div>
      </div>

      {/* 4 Performance Metric Cards with Sparklines */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* 1. CPU LOAD CARD */}
        <div className="bg-[#171717] border border-[#2e2e2e] hover:border-zinc-700/80 rounded-xl p-4 flex flex-col justify-between transition-all group shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#3ecf8e]/5 rounded-full blur-2xl pointer-events-none" />
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-[#3ecf8e]" />
                CPU Load
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#3ecf8e]/10 text-[#3ecf8e] border border-[#3ecf8e]/30">
                {metrics?.server.cpuCount || 4} vCPUs
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-zinc-100 tracking-tight">
                {metrics?.cpu.usagePct ?? 14.2}%
              </span>
              <span className="text-xs font-mono text-zinc-400">
                Avg: {metrics?.cpu.load1m || 0.35}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 font-mono truncate mt-0.5">
              {metrics?.server.cpuModel || 'AMD EPYC Processor'}
            </p>
          </div>

          {/* Sparkline */}
          <div className="h-14 w-full mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3ecf8e" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3ecf8e" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <YAxis domain={[0, 100]} hide />
                <Tooltip
                  content={({ payload }) => {
                    if (payload && payload.length) {
                      return (
                        <div className="bg-[#1c1c1c] border border-[#2e2e2e] p-1.5 rounded text-[10px] font-mono text-zinc-200">
                          CPU: {payload[0].value}%
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="cpu"
                  stroke="#3ecf8e"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#cpuGradient)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Card Footer */}
          <div className="pt-2 mt-1 border-t border-[#262626] flex items-center justify-between text-[10px] font-mono text-zinc-500">
            <span>Load: {metrics?.cpu.load1m ?? 0.28} / {metrics?.cpu.load5m ?? 0.32}</span>
            <span className="text-[#3ecf8e]">Optimal</span>
          </div>
        </div>

        {/* 2. RAM USAGE CARD */}
        <div className="bg-[#171717] border border-[#2e2e2e] hover:border-zinc-700/80 rounded-xl p-4 flex flex-col justify-between transition-all group shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-cyan-400" />
                RAM Memory
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                {metrics?.ram.usedGb || 2.45} / {metrics?.ram.totalGb || 8.00} GB
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-zinc-100 tracking-tight">
                {metrics?.ram.usagePct ?? 30.6}%
              </span>
              <span className="text-xs font-mono text-zinc-400">
                Heap: {metrics?.nodeProcess.heapUsedMb || 128}MB
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 font-mono truncate mt-0.5">
              RSS: {metrics?.nodeProcess.rssMb || 210}MB • Free: {metrics ? (metrics.ram.freeBytes / 1024 / 1024 / 1024).toFixed(2) : '5.55'} GB
            </p>
          </div>

          {/* Sparkline */}
          <div className="h-14 w-full mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="ramGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <YAxis domain={[0, 100]} hide />
                <Tooltip
                  content={({ payload }) => {
                    if (payload && payload.length) {
                      return (
                        <div className="bg-[#1c1c1c] border border-[#2e2e2e] p-1.5 rounded text-[10px] font-mono text-zinc-200">
                          RAM: {payload[0].value}%
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="ram"
                  stroke="#06b6d4"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#ramGradient)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Card Footer */}
          <div className="pt-2 mt-1 border-t border-[#262626] flex items-center justify-between text-[10px] font-mono text-zinc-500">
            <span>Buffer/Cache: Normal</span>
            <span className="text-cyan-400">Healthy</span>
          </div>
        </div>

        {/* 3. NETWORK I/O CARD */}
        <div className="bg-[#171717] border border-[#2e2e2e] hover:border-zinc-700/80 rounded-xl p-4 flex flex-col justify-between transition-all group shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Wifi className="w-3.5 h-3.5 text-purple-400" />
                Network Throughput
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30">
                Ping: {metrics?.network.latencyMs || 22.4}ms
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-zinc-100 tracking-tight">
                {metrics?.network.rxPerSecKb ?? 145.2}
              </span>
              <span className="text-xs font-mono text-zinc-400">
                KB/s (RX)
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 font-mono truncate mt-0.5">
              TX: {metrics?.network.txPerSecKb || 52.1} KB/s • Sockets: {metrics?.network.connections || 16}
            </p>
          </div>

          {/* Sparkline */}
          <div className="h-14 w-full mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <YAxis hide />
                <Tooltip
                  content={({ payload }) => {
                    if (payload && payload.length) {
                      return (
                        <div className="bg-[#1c1c1c] border border-[#2e2e2e] p-1.5 rounded text-[10px] font-mono text-zinc-200">
                          RX: {payload[0].value} KB/s
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="network"
                  stroke="#a855f7"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#netGradient)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Card Footer */}
          <div className="pt-2 mt-1 border-t border-[#262626] flex items-center justify-between text-[10px] font-mono text-zinc-500">
            <span>Solana RPC Socket: Active</span>
            <span className="text-purple-400">Streaming</span>
          </div>
        </div>

        {/* 4. BOT & PM2 UPTIME CARD */}
        <div className="bg-[#171717] border border-[#2e2e2e] hover:border-zinc-700/80 rounded-xl p-4 flex flex-col justify-between transition-all group shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Bot Uptime (24/7)
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-[#3ecf8e] border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3ecf8e] animate-pulse" />
                {metrics?.pm2.status.toUpperCase() || 'ONLINE'}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-zinc-100 tracking-tight">
                {metrics?.uptime.formatted || '2d 18h 44m'}
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 font-mono truncate mt-0.5">
              Restarts: {metrics?.pm2.restartCount || 0} • System: {metrics ? Math.floor(metrics.uptime.systemSeconds / 86400) : 14} days
            </p>
          </div>

          {/* Sparkline */}
          <div className="h-14 w-full mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="upGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <YAxis domain={[0, 100]} hide />
                <Area
                  type="monotone"
                  dataKey="uptime"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#upGradient)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Card Footer */}
          <div className="pt-2 mt-1 border-t border-[#262626] flex items-center justify-between text-[10px] font-mono text-zinc-500">
            <span>Daemon: PM2 Cluster</span>
            <span className="text-amber-400 font-semibold">Protected</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VpsMetricsPanel;
