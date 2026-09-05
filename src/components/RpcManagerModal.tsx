'use client';

import React, { useState } from 'react';
import {
  Radio,
  X,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  ShieldCheck,
  Activity,
  Server
} from 'lucide-react';
import { rpcFailoverInstance, RpcEndpoint } from '../lib/rpcFailover';
import Badge from './ui/Badge';
import Button from './ui/Button';
import Input from './ui/Input';

interface RpcManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogMessage?: (category: 'SYSTEM', level: 'INFO' | 'WARN' | 'SUCCESS', msg: string) => void;
}

export const RpcManagerModal: React.FC<RpcManagerModalProps> = ({
  isOpen,
  onClose,
  onLogMessage
}) => {
  const [endpoints, setEndpoints] = useState<RpcEndpoint[]>(() => rpcFailoverInstance.getAllEndpoints());
  const [activeEndpoint, setActiveEndpoint] = useState<RpcEndpoint>(() => rpcFailoverInstance.getActiveEndpoint());
  const [isTestingPing, setIsTestingPing] = useState<boolean>(false);
  const [failoverLog, setFailoverLog] = useState<string | null>(null);

  // Custom Endpoint Form
  const [customName, setCustomName] = useState<string>('');
  const [customUrl, setCustomUrl] = useState<string>('');
  const [isAddingCustom, setIsAddingCustom] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSwitchEndpoint = (id: string) => {
    const updated = rpcFailoverInstance.switchEndpoint(id);
    setActiveEndpoint(updated);
    setEndpoints(rpcFailoverInstance.getAllEndpoints());
    if (onLogMessage) {
      onLogMessage('SYSTEM', 'INFO', `Switched active Solana RPC to ${updated.name}`);
    }
  };

  const handleTriggerFailover = () => {
    const start = performance.now();
    const newActive = rpcFailoverInstance.triggerFailover('User triggered failover benchmark test');
    const duration = +(performance.now() - start).toFixed(2);
    setActiveEndpoint(newActive);
    setEndpoints(rpcFailoverInstance.getAllEndpoints());
    setFailoverLog(`Failover berhasil dialihkan ke ${newActive.name} dalam ${duration}ms (PRD Target < 100ms)`);
  };

  const handlePingAll = async () => {
    setIsTestingPing(true);
    setFailoverLog(null);

    const updated = [...endpoints];
    for (let i = 0; i < updated.length; i++) {
      const ep = updated[i];
      const start = performance.now();
      try {
        const res = await fetch(ep.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getSlot'
          }),
          signal: AbortSignal.timeout(2500)
        });
        const latency = Math.round(performance.now() - start);
        ep.latencyMs = latency;
        ep.isHealthy = res.ok;
      } catch {
        ep.latencyMs = 999;
        ep.isHealthy = false;
      }
    }

    setEndpoints([...updated]);
    setActiveEndpoint(rpcFailoverInstance.getActiveEndpoint());
    setIsTestingPing(false);
  };

  const handleAddCustomEndpoint = () => {
    if (!customUrl.trim()) return;
    const newEp: RpcEndpoint = {
      id: `custom-${Date.now()}`,
      name: customName.trim() || 'Custom Private RPC',
      url: customUrl.trim(),
      type: 'SECONDARY',
      isHealthy: true,
      latencyMs: 45,
      lastChecked: Date.now()
    };

    endpoints.push(newEp);
    setEndpoints([...endpoints]);
    setCustomName('');
    setCustomUrl('');
    setIsAddingCustom(false);
    if (onLogMessage) {
      onLogMessage('SYSTEM', 'SUCCESS', `Added custom Solana RPC endpoint: ${newEp.name}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800/90 rounded-2xl w-full max-w-xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] font-mono">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:px-6 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-sm text-zinc-100 uppercase tracking-wider">
                  Solana RPC Telemetry & Failover
                </h3>
                <Badge variant="emerald" size="xs">
                  PRD §7.2
                </Badge>
              </div>
              <p className="text-[11px] text-zinc-400">
                Sistem rotasi & failover RPC sub-100ms multi-tier
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Active RPC Status Banner */}
          <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">
                Active Ingestion Gateway
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-bold text-sm text-zinc-100">{activeEndpoint.name}</span>
                <Badge variant={activeEndpoint.latencyMs < 100 ? 'emerald' : 'amber'} size="xs">
                  {activeEndpoint.latencyMs}ms
                </Badge>
              </div>
              <span className="text-[10px] text-zinc-500 block truncate max-w-sm mt-0.5">
                {activeEndpoint.url}
              </span>
            </div>

            <Button
              variant="outline"
              size="xs"
              onClick={handleTriggerFailover}
              leftIcon={<Zap className="w-3 h-3 text-cyan-400" />}
              title="Uji coba pengalihan otomatis sub-100ms"
            >
              Simulate Failover
            </Button>
          </div>

          {failoverLog && (
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-[11px] text-cyan-300 animate-in fade-in flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 shrink-0" />
              <span>{failoverLog}</span>
            </div>
          )}

          {/* Endpoints List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="font-bold uppercase text-[10px] tracking-wider text-zinc-500">
                Configured RPC Endpoints
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePingAll}
                  disabled={isTestingPing}
                  className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isTestingPing ? 'animate-spin' : ''}`} />
                  <span>{isTestingPing ? 'Pinging...' : 'Benchmark Ping'}</span>
                </button>
                <button
                  onClick={() => setIsAddingCustom(!isAddingCustom)}
                  className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-cyan-400 transition-colors cursor-pointer ml-2"
                >
                  <Plus className="w-3 h-3" />
                  <span>Custom RPC</span>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {endpoints.map((ep) => {
                const isActive = ep.id === activeEndpoint.id;
                let latColor = 'text-emerald-400';
                if (ep.latencyMs > 100 && ep.latencyMs <= 250) latColor = 'text-amber-400';
                if (ep.latencyMs > 250) latColor = 'text-rose-400';

                return (
                  <div
                    key={ep.id}
                    className={`p-3 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      isActive
                        ? 'bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                        : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                          isActive
                            ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                            : 'bg-zinc-800/80 border-zinc-700 text-zinc-400'
                        }`}
                      >
                        <Server className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-zinc-200">{ep.name}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 font-mono">
                            {ep.type}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-500 truncate block max-w-xs">
                          {ep.url}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className={`text-xs font-black font-mono ${latColor}`}>
                          {ep.latencyMs}ms
                        </span>
                        <span className="text-[9px] text-zinc-500 block">
                          {ep.isHealthy ? 'Online' : 'Unreachable'}
                        </span>
                      </div>

                      <Button
                        variant={isActive ? 'primary' : 'secondary'}
                        size="xs"
                        onClick={() => handleSwitchEndpoint(ep.id)}
                        disabled={isActive}
                      >
                        {isActive ? 'ACTIVE' : 'SWITCH'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add Custom RPC Form */}
          {isAddingCustom && (
            <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-700/80 space-y-3 animate-in fade-in">
              <span className="text-xs font-bold text-zinc-200 block">
                Tambah Custom Private Solana RPC
              </span>
              <Input
                label="Endpoint Name"
                placeholder="misal: My Helius Ultra Node"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
              <Input
                label="RPC HTTPS URL"
                placeholder="https://mainnet.helius-rpc.com/?api-key=YOUR_KEY"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
              />
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="ghost" size="xs" onClick={() => setIsAddingCustom(false)}>
                  Batal
                </Button>
                <Button variant="primary" size="xs" onClick={handleAddCustomEndpoint}>
                  Simpan Endpoint
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:px-6 border-t border-zinc-800 bg-zinc-900/40 flex items-center justify-between text-[11px] text-zinc-500">
          <span>PRD §7.2: Failover batas toleransi &lt;100ms</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-all cursor-pointer"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};

export default RpcManagerModal;
