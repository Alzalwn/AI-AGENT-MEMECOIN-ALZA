'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Shield,
  Zap,
  Target,
  Clock,
  Radio,
  Lock,
  Unlock,
  AlertTriangle,
  Play,
  Pause,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Award
} from 'lucide-react';
import { TokenSignal, ConsensusResult, ActivePosition, TerminalTelemetry } from '../types/terminal';
import { generateRandomTokenSignal } from '../engine/simulator';
import { runAgentConsensus } from '../agents/consensus';
import { evaluateExitAgent } from '../agents/exit';
import { PRD_THRESHOLDS } from '../config/constants';

export default function TerminalDashboard() {
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [telemetry, setTelemetry] = useState<TerminalTelemetry>({
    engineStatus: 'LIVE',
    slotLatencyMs: 42,
    currentSlot: 284192040,
    initialBalanceSol: 10.0,
    currentBalanceSol: 12.84,
    totalPnlSol: +2.84,
    rollingExpectancyR: 3.4,
    winCount: 7,
    lossCount: 2,
    scannedCount: 142,
    vetoCount: 135,
    activePositionLocked: false,
  });

  const [consensusFeed, setConsensusFeed] = useState<ConsensusResult[]>([]);
  const [activePosition, setActivePosition] = useState<ActivePosition | null>(null);
  const [selectedResult, setSelectedResult] = useState<ConsensusResult | null>(null);
  const [scanGridCells, setScanGridCells] = useState<('APPROVED' | 'VETOED')[]>(() =>
    Array(96).fill('VETOED').map(() => (Math.random() > 0.92 ? 'APPROVED' : 'VETOED'))
  );

  const feedEndRef = useRef<HTMLDivElement>(null);

  // Streaming Engine Loop
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      // 1. Generate new pool event from Pump.fun / Raydium
      const token = generateRandomTokenSignal();

      // 2. Evaluate 5-Agent Consensus
      const result = runAgentConsensus(token);

      // 3. Update Scan Grid & Consensus Feed
      setScanGridCells((prev) => [...prev.slice(1), result.verdict]);
      setConsensusFeed((prev) => [result, ...prev.slice(0, 49)]);
      if (!selectedResult) setSelectedResult(result);

      // 4. Update Telemetry
      setTelemetry((prev) => {
        const newVetoCount = result.verdict === 'VETOED' ? prev.vetoCount + 1 : prev.vetoCount;
        return {
          ...prev,
          currentSlot: prev.currentSlot + 1,
          slotLatencyMs: Math.floor(Math.random() * 25) + 30, // 30-55ms
          scannedCount: prev.scannedCount + 1,
          vetoCount: newVetoCount,
        };
      });

      // 5. Execution Logic with Single Position Mutex Lock
      setActivePosition((currentPos) => {
        if (!currentPos && result.verdict === 'APPROVED') {
          // Open new position (Fractional Kelly size = ~0.62 SOL)
          const solInvested = 0.62;
          const entryPrice = token.priceSol;
          const tokenAmount = solInvested / entryPrice;

          setTelemetry((t) => ({ ...t, activePositionLocked: true }));

          return {
            id: `POS-${Date.now().toString().slice(-4)}`,
            token,
            entryPriceSol: entryPrice,
            currentPriceSol: entryPrice,
            solInvested,
            tokenAmount,
            pnlSol: 0,
            pnlPct: 0,
            rMultiplier: 0,
            highestPriceSol: entryPrice,
            trailingStopPriceSol: entryPrice * (1 - PRD_THRESHOLDS.TRAILING_STOP_LOSS_R),
            entryTimestamp: Date.now(),
            status: 'OPEN',
          };
        }

        // If position is active, update price & evaluate Exit Agent
        if (currentPos && currentPos.status === 'OPEN') {
          const priceChangeDelta = (Math.random() - 0.44) * 0.12; // slightly positive drift
          const newPrice = +(currentPos.currentPriceSol * (1 + priceChangeDelta)).toFixed(8);
          const highestPrice = Math.max(currentPos.highestPriceSol, newPrice);
          const pnlPct = +(((newPrice - currentPos.entryPriceSol) / currentPos.entryPriceSol) * 100).toFixed(2);
          const pnlSol = +((currentPos.solInvested * pnlPct) / 100).toFixed(4);
          const rMultiplier = +(pnlPct / 15).toFixed(2); // 1R = 15%

          const updatedPos: ActivePosition = {
            ...currentPos,
            currentPriceSol: newPrice,
            highestPriceSol: highestPrice,
            pnlPct,
            pnlSol,
            rMultiplier,
          };

          // Check Exit Agent condition
          const exitDecision = evaluateExitAgent(updatedPos);
          if (exitDecision.shouldExit) {
            // Close position and release Mutex lock
            setTelemetry((t) => {
              const won = pnlPct > 0;
              return {
                ...t,
                activePositionLocked: false,
                currentBalanceSol: +(t.currentBalanceSol + pnlSol).toFixed(3),
                totalPnlSol: +(t.totalPnlSol + pnlSol).toFixed(3),
                winCount: won ? t.winCount + 1 : t.winCount,
                lossCount: !won ? t.lossCount + 1 : t.lossCount,
              };
            });
            return null; // Position Closed
          }

          return updatedPos;
        }

        return currentPos;
      });
    }, 1200);

    return () => clearInterval(interval);
  }, [isRunning, selectedResult]);

  const handleManualExit = () => {
    if (!activePosition) return;
    setTelemetry((t) => ({
      ...t,
      activePositionLocked: false,
      currentBalanceSol: +(t.currentBalanceSol + activePosition.pnlSol).toFixed(3),
      totalPnlSol: +(t.totalPnlSol + activePosition.pnlSol).toFixed(3),
    }));
    setActivePosition(null);
  };

  return (
    <main className="min-h-screen p-3 md:p-5 flex flex-col gap-4 max-w-[1720px] mx-auto text-xs font-mono select-none">
      
      {/* 1. TOP BAR TELEMETRY (PRD Section 5) */}
      <header className="bg-terminal-panel border border-terminal-border rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-terminal-card border border-terminal-border rounded-lg text-terminal-green">
              <Zap className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm tracking-wider text-terminal-green glow-green">
                  GROK TRENCHER
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-terminal-card border border-terminal-border text-terminal-muted">
                  v1.0-MEV
                </span>
              </div>
              <p className="text-[10px] text-terminal-muted">SOLANA MULTI-AGENT SNIPER TERMINAL</p>
            </div>
          </div>

          <div className="h-7 w-[1px] bg-terminal-border hidden sm:block" />

          {/* Engine Status Toggle */}
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
              isRunning
                ? 'bg-terminal-green/10 border-terminal-green text-terminal-green glow-green'
                : 'bg-terminal-red/10 border-terminal-red text-terminal-red'
            }`}
          >
            {isRunning ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5 fill-current" />}
            <span>{isRunning ? 'ENGINE LIVE' : 'ENGINE PAUSED'}</span>
          </button>

          {/* Mutex Single Position Lock Status */}
          <div className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 border text-[11px] ${
            telemetry.activePositionLocked
              ? 'bg-terminal-amber/10 border-terminal-amber text-terminal-amber'
              : 'bg-terminal-card border-terminal-border text-terminal-green'
          }`}>
            {telemetry.activePositionLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            <span className="font-bold">
              {telemetry.activePositionLocked ? 'MUTEX: 1 POS LOCKED' : 'MUTEX: UNLOCKED (STANDBY)'}
            </span>
          </div>
        </div>

        {/* Telemetry Metrics */}
        <div className="flex items-center gap-4 flex-wrap">
          <div className="text-right">
            <span className="text-[10px] text-terminal-muted block">GEYSER RPC LATENCY</span>
            <span className="font-bold text-terminal-green flex items-center gap-1 justify-end">
              <Radio className="w-3 h-3 text-terminal-green animate-ping" />
              {telemetry.slotLatencyMs} ms (Sub-350ms)
            </span>
          </div>

          <div className="h-6 w-[1px] bg-terminal-border" />

          <div className="text-right">
            <span className="text-[10px] text-terminal-muted block">BALANCE / PNL</span>
            <span className="font-bold text-terminal-text">
              {telemetry.currentBalanceSol.toFixed(2)} SOL{' '}
              <span className={telemetry.totalPnlSol >= 0 ? 'text-terminal-green' : 'text-terminal-red'}>
                ({telemetry.totalPnlSol >= 0 ? '+' : ''}{telemetry.totalPnlSol.toFixed(2)} SOL)
              </span>
            </span>
          </div>

          <div className="h-6 w-[1px] bg-terminal-border" />

          <div className="text-right">
            <span className="text-[10px] text-terminal-muted block">WINRATE / EXPECTANCY</span>
            <span className="font-bold text-terminal-cyan flex items-center gap-1 justify-end">
              <Award className="w-3.5 h-3.5" />
              {((telemetry.winCount / (telemetry.winCount + telemetry.lossCount || 1)) * 100).toFixed(0)}% (E[R]: +{telemetry.rollingExpectancyR}R)
            </span>
          </div>

          <div className="h-6 w-[1px] bg-terminal-border" />

          <div className="text-right">
            <span className="text-[10px] text-terminal-muted block">SCANNED / VETOED</span>
            <span className="font-bold text-terminal-text">
              {telemetry.scannedCount} / <span className="text-terminal-red">{telemetry.vetoCount} VETO</span>
            </span>
          </div>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
        
        {/* LEFT COLUMN: DESK FEED (Real-time stream of incoming signals) */}
        <section className="lg:col-span-5 bg-terminal-panel border border-terminal-border rounded-xl p-3.5 flex flex-col gap-3 shadow-xl">
          <div className="flex items-center justify-between border-b border-terminal-border pb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-terminal-green" />
              <span className="font-bold tracking-wider text-terminal-text uppercase">
                Desk Feed & gRPC Geyser Stream
              </span>
            </div>
            <span className="text-[10px] text-terminal-muted">SLOT: #{telemetry.currentSlot}</span>
          </div>

          {/* Feed List */}
          <div className="flex-1 overflow-y-auto space-y-2 max-h-[720px] pr-1 scrollbar-thin">
            {consensusFeed.map((item) => {
              const isSelected = selectedResult?.token.id === item.token.id;
              const isApproved = item.verdict === 'APPROVED';

              return (
                <div
                  key={item.token.id}
                  onClick={() => setSelectedResult(item)}
                  className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-terminal-card border-terminal-green/70 border-glow-green'
                      : 'bg-terminal-card/50 border-terminal-border hover:border-terminal-border-active'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-terminal-text">{item.token.symbol}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-terminal-bg text-terminal-muted border border-terminal-border">
                        {item.token.platform}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-terminal-muted">{item.consensusLatencyMs}ms</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-black tracking-wider ${
                        isApproved
                          ? 'bg-terminal-green/20 text-terminal-green border border-terminal-green/50'
                          : 'bg-terminal-red/20 text-terminal-red border border-terminal-red/50'
                      }`}>
                        {item.verdict}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-terminal-muted">
                    <span className="truncate max-w-[200px]">{item.token.name}</span>
                    <span>LP: ${item.token.initialLpUsd.toLocaleString()}</span>
                    <span>Cosine: {item.token.narrativeCosineSim}</span>
                  </div>

                  {/* Veto reason preview if vetoed */}
                  {!isApproved && item.vetoReason && (
                    <div className="mt-1.5 text-[10px] text-terminal-red/90 bg-terminal-red/10 px-2 py-1 rounded border border-terminal-red/20 flex items-start gap-1">
                      <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5 text-terminal-red" />
                      <span className="truncate">[{item.vetoAgent?.toUpperCase()}] {item.vetoReason}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* MIDDLE COLUMN: CONSENSUS EVALUATION MATRIX & 4D MANIFOLD */}
        <section className="lg:col-span-4 flex flex-col gap-4">
          
          {/* Active Evaluated Token Card */}
          <div className="bg-terminal-panel border border-terminal-border rounded-xl p-3.5 space-y-3 shadow-xl">
            <div className="flex items-center justify-between border-b border-terminal-border pb-2">
              <span className="font-bold text-terminal-text flex items-center gap-1.5 uppercase">
                <Shield className="w-4 h-4 text-terminal-green" /> 5-Agent Consensus Evaluator
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                selectedResult?.verdict === 'APPROVED'
                  ? 'bg-terminal-green/20 text-terminal-green border border-terminal-green'
                  : 'bg-terminal-red/20 text-terminal-red border border-terminal-red'
              }`}>
                {selectedResult ? selectedResult.verdict : 'NO TOKEN SELECTED'}
              </span>
            </div>

            {selectedResult ? (
              <div className="space-y-3">
                <div className="bg-terminal-card p-3 rounded-lg border border-terminal-border flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-base text-terminal-text">{selectedResult.token.symbol}</h3>
                    <p className="text-[11px] text-terminal-muted">{selectedResult.token.name}</p>
                    <span className="text-[10px] text-terminal-cyan font-mono truncate block max-w-[200px]">
                      {selectedResult.token.mint}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-terminal-muted block">INITIAL LP</span>
                    <span className="text-sm font-bold text-terminal-green">${selectedResult.token.initialLpUsd.toLocaleString()}</span>
                  </div>
                </div>

                {/* 5-Agent Status Breakdown */}
                <div className="space-y-2">
                  {(['scanner', 'narrative', 'risk', 'timing', 'exit'] as const).map((agentKey) => {
                    const verdict = selectedResult.verdicts[agentKey];
                    const isPass = verdict.status === 'APPROVE';

                    return (
                      <div
                        key={agentKey}
                        className={`p-2.5 rounded-lg border text-xs flex flex-col gap-1 transition-all ${
                          isPass
                            ? 'bg-terminal-card/80 border-terminal-border'
                            : 'bg-terminal-red/10 border-terminal-red/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-terminal-text uppercase text-[11px] flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${isPass ? 'bg-terminal-green' : 'bg-terminal-red'}`} />
                            {verdict.agentName}
                          </span>
                          <span className={`text-[10px] px-2 py-0.2 rounded font-black ${
                            isPass ? 'bg-terminal-green/20 text-terminal-green' : 'bg-terminal-red/20 text-terminal-red'
                          }`}>
                            {verdict.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-terminal-muted leading-relaxed">
                          {verdict.reason}
                        </p>
                        <div className="flex items-center justify-between text-[9px] text-terminal-muted pt-1 border-t border-terminal-border/50">
                          <span>Value: <strong className="text-terminal-text">{verdict.metricValue}</strong></span>
                          <span>Target: <strong className="text-terminal-text">{verdict.threshold}</strong></span>
                          <span>Latency: {verdict.latencyMs}ms</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-terminal-muted">Menunggu sinyal pool baru...</div>
            )}
          </div>

          {/* 96-CELL SCAN GRID (PRD Section 5) */}
          <div className="bg-terminal-panel border border-terminal-border rounded-xl p-3.5 space-y-2 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="font-bold text-terminal-text text-[11px] uppercase">
                Scan Grid (96 Slots Matrix)
              </span>
              <span className="text-[10px] text-terminal-muted">Ratio: 1 Approved : 15 Veto</span>
            </div>
            
            <div className="grid grid-cols-12 gap-1 bg-terminal-bg p-2 rounded-lg border border-terminal-border">
              {scanGridCells.map((verdict, idx) => (
                <div
                  key={idx}
                  className={`h-3 rounded-xs transition-all ${
                    verdict === 'APPROVED'
                      ? 'bg-terminal-green glow-green'
                      : 'bg-terminal-card border border-terminal-border hover:bg-terminal-red/40'
                  }`}
                  title={`Slot #${idx + 1}: ${verdict}`}
                />
              ))}
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN: ACTIVE POSITION & JITO MEV EXECUTION */}
        <section className="lg:col-span-3 flex flex-col gap-4">
          
          {/* Active Position Card (Mutex Guarded) */}
          <div className="bg-terminal-panel border border-terminal-border rounded-xl p-3.5 flex flex-col gap-3 shadow-xl">
            <div className="flex items-center justify-between border-b border-terminal-border pb-2">
              <span className="font-bold text-terminal-text flex items-center gap-1.5 uppercase">
                <Target className="w-4 h-4 text-terminal-green" /> Single Active Position
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-black ${
                activePosition ? 'bg-terminal-green text-terminal-bg' : 'bg-terminal-card text-terminal-muted border border-terminal-border'
              }`}>
                {activePosition ? 'STATUS: OPEN' : 'STANDBY'}
              </span>
            </div>

            {activePosition ? (
              <div className="space-y-3 bg-terminal-card p-3 rounded-lg border border-terminal-green/50 border-glow-green">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-black text-base text-terminal-text">{activePosition.token.symbol}</h4>
                    <span className="text-[10px] text-terminal-muted">{activePosition.id}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-base font-black ${activePosition.pnlPct >= 0 ? 'text-terminal-green glow-green' : 'text-terminal-red glow-red'}`}>
                      {activePosition.pnlPct >= 0 ? '+' : ''}{activePosition.pnlPct}%
                    </span>
                    <span className="text-[10px] text-terminal-muted block">
                      ({activePosition.pnlSol >= 0 ? '+' : ''}{activePosition.pnlSol} SOL)
                    </span>
                  </div>
                </div>

                {/* Progress metrics */}
                <div className="space-y-1 text-[11px] pt-2 border-t border-terminal-border">
                  <div className="flex justify-between">
                    <span className="text-terminal-muted">Investasi (Kelly Sizing):</span>
                    <span className="font-bold text-terminal-text">{activePosition.solInvested} SOL</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-terminal-muted">Entry Price:</span>
                    <span className="font-mono text-terminal-text">{activePosition.entryPriceSol} SOL</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-terminal-muted">Current Price:</span>
                    <span className="font-mono text-terminal-green">{activePosition.currentPriceSol} SOL</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-terminal-muted">R-Expectancy:</span>
                    <span className="font-bold text-terminal-cyan">+{activePosition.rMultiplier}R / 3.0R</span>
                  </div>
                </div>

                {/* Trailing stop status */}
                <div className="p-2 bg-terminal-bg rounded border border-terminal-border text-[10px] space-y-1">
                  <div className="flex justify-between text-terminal-muted">
                    <span>Trailing Stop Trigger:</span>
                    <span className="text-terminal-amber font-mono">
                      &lt; {activePosition.trailingStopPriceSol.toFixed(7)} SOL
                    </span>
                  </div>
                  <div className="w-full bg-terminal-card h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-terminal-green h-full transition-all"
                      style={{ width: `${Math.min(Math.max((activePosition.rMultiplier / 3.0) * 100, 5), 100)}%` }}
                    />
                  </div>
                </div>

                <button
                  onClick={handleManualExit}
                  className="w-full py-2 bg-terminal-red/20 hover:bg-terminal-red/30 text-terminal-red font-bold rounded-lg border border-terminal-red/60 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <AlertTriangle className="w-3.5 h-3.5" /> Force Emergency Exit (Jito MEV)
                </button>
              </div>
            ) : (
              <div className="bg-terminal-card/50 p-6 rounded-lg border border-terminal-border text-center space-y-2">
                <Clock className="w-6 h-6 mx-auto text-terminal-muted" />
                <p className="font-bold text-terminal-text text-xs">Tidak Ada Posisi Terbuka</p>
                <p className="text-[10px] text-terminal-muted leading-relaxed">
                  Single Position Mutex Guard siap mengeksekusi order pertama yang disetujui 5/5 konsensus agen.
                </p>
              </div>
            )}
          </div>

          {/* Jito MEV Private Bundle Telemetry */}
          <div className="bg-terminal-panel border border-terminal-border rounded-xl p-3.5 space-y-2.5 shadow-xl">
            <div className="flex items-center justify-between border-b border-terminal-border pb-2">
              <span className="font-bold text-terminal-text text-[11px] uppercase flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-terminal-cyan" /> Jito MEV Private Bundler
              </span>
              <span className="text-[9px] text-terminal-green font-mono">0% Sandwich Leak</span>
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-terminal-muted">Block Engine Relayer:</span>
                <span className="text-terminal-text font-mono">mainnet.block-engine.jito.wtf</span>
              </div>
              <div className="flex justify-between">
                <span className="text-terminal-muted">Dynamic Validator Tip:</span>
                <span className="text-terminal-cyan font-mono">0.000050 SOL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-terminal-muted">Bundle Ingestion Speed:</span>
                <span className="text-terminal-green font-bold font-mono">22ms</span>
              </div>
            </div>
          </div>
        </section>
      </div>

    </main>
  );
}
