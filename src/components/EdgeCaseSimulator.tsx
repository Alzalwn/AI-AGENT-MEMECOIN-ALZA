'use client';

import React, { useState } from 'react';
import { ShieldAlert, Server, ZapOff, Flame, RotateCcw, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { ActivePosition, TerminalTelemetry } from '../types/terminal';

interface EdgeCaseSimulatorProps {
  isOpen: boolean;
  onClose: () => void;
  activePosition: ActivePosition | null;
  onTriggerFailoverRpc: () => void;
  onTriggerBundleDrop: () => void;
  onTriggerFlashRug: () => void;
  onReplayBatchTest: () => void;
  lastSimulatedEvent: string | null;
}

export default function EdgeCaseSimulator({
  isOpen,
  onClose,
  activePosition,
  onTriggerFailoverRpc,
  onTriggerBundleDrop,
  onTriggerFlashRug,
  onReplayBatchTest,
  lastSimulatedEvent,
}: EdgeCaseSimulatorProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-terminal-panel border border-terminal-border rounded-2xl w-full max-w-xl shadow-2xl p-5 space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-terminal-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-terminal-red/10 border border-terminal-red/40 text-terminal-red">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-terminal-text uppercase tracking-wider flex items-center gap-2">
                Edge-Case &amp; Fallback Stress Simulator
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-terminal-card border border-terminal-border text-terminal-cyan font-mono">
                  PRD §7.2
                </span>
              </h2>
              <p className="text-[11px] text-terminal-muted">
                Uji ketahanan sistem &amp; prosedur fallback otomatis multi-agen
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-terminal-card text-terminal-muted hover:text-terminal-text transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Alert Banner */}
        {lastSimulatedEvent && (
          <div className="p-3 rounded-lg bg-terminal-cyan/10 border border-terminal-cyan/40 text-terminal-cyan text-[11px] flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Log Prosedur Fallback:</span>
              <p className="font-mono text-[10px] mt-0.5">{lastSimulatedEvent}</p>
            </div>
          </div>
        )}

        {/* 4 Test Scenarios */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          
          {/* 1. RPC Failover */}
          <div className="p-3.5 rounded-xl bg-terminal-card border border-terminal-border space-y-2 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-terminal-cyan font-bold text-xs">
                <Server className="w-4 h-4" />
                <span>1. RPC Disconnect Failover</span>
              </div>
              <p className="text-[10px] text-terminal-muted leading-relaxed">
                Simulasi pemutusan koneksi gRPC primer saat posisi terbuka. Memverifikasi auto-switch ke secondary private RPC dalam &lt; 100ms.
              </p>
            </div>
            <button
              onClick={onTriggerFailoverRpc}
              className="w-full py-2 bg-terminal-cyan/10 hover:bg-terminal-cyan/20 border border-terminal-cyan/40 text-terminal-cyan font-bold rounded-lg text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              Uji Failover (&lt; 100ms)
            </button>
          </div>

          {/* 2. Jito Bundle Drop */}
          <div className="p-3.5 rounded-xl bg-terminal-card border border-terminal-border space-y-2 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-terminal-amber font-bold text-xs">
                <ZapOff className="w-4 h-4" />
                <span>2. Jito Bundle Dropped</span>
              </div>
              <p className="text-[10px] text-terminal-muted leading-relaxed">
                Simulasi bundle tidak terkonfirmasi selama 2 slot berturut-turut. Transaksi otomatis dibatalkan untuk mencegah deviasi harga.
              </p>
            </div>
            <button
              onClick={onTriggerBundleDrop}
              className="w-full py-2 bg-terminal-amber/10 hover:bg-terminal-amber/20 border border-terminal-amber/40 text-terminal-amber font-bold rounded-lg text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              Uji Drop 2-Slot Cancel
            </button>
          </div>

          {/* 3. Flash Rug Defense */}
          <div className="p-3.5 rounded-xl bg-terminal-card border border-terminal-border space-y-2 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-terminal-red font-bold text-xs">
                <Flame className="w-4 h-4" />
                <span>3. Flash Rug / LP Drain</span>
              </div>
              <p className="text-[10px] text-terminal-muted leading-relaxed">
                Simulasi pengurasan likuiditas kolam mendadak (-85%). Exit Agent memicu emergency sell dengan tip validator prioritas tinggi.
              </p>
            </div>
            <button
              onClick={onTriggerFlashRug}
              disabled={!activePosition}
              className={`w-full py-2 border font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 ${
                activePosition
                  ? 'bg-terminal-red/20 hover:bg-terminal-red/30 border-terminal-red text-terminal-red cursor-pointer'
                  : 'bg-terminal-card text-terminal-muted border-terminal-border cursor-not-allowed opacity-50'
              }`}
            >
              {activePosition ? 'Uji Flash Rug Defense' : 'Perlu Posisi Terbuka'}
            </button>
          </div>

          {/* 4. Batch Replay Stress Test */}
          <div className="p-3.5 rounded-xl bg-terminal-card border border-terminal-border space-y-2 flex flex-col justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-terminal-green font-bold text-xs">
                <RotateCcw className="w-4 h-4" />
                <span>4. 100-Token Replay Test</span>
              </div>
              <p className="text-[10px] text-terminal-muted leading-relaxed">
                PRD §7.1 Milestone 5: Replay deterministik 100 pool peluncuran historis untuk menguji rasio veto konsensus &amp; batas kebangkrutan.
              </p>
            </div>
            <button
              onClick={onReplayBatchTest}
              className="w-full py-2 bg-terminal-green/15 hover:bg-terminal-green/25 border border-terminal-green/50 text-terminal-green font-bold rounded-lg text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              Jalankan Batch Replay
            </button>
          </div>

        </div>

        {/* Footer info */}
        <div className="pt-2 border-t border-terminal-border flex items-center justify-between text-[10px] text-terminal-muted">
          <span>Grok Trencher Multi-Agent Fault Tolerance v1.0</span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-terminal-card border border-terminal-border rounded hover:text-terminal-text transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
