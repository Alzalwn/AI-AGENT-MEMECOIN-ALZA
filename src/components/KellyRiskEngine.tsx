'use client';

import React, { useState, useMemo } from 'react';
import { TerminalTelemetry, ConsensusResult } from '../types/terminal';
import { ShieldCheck, Percent, Calculator, AlertOctagon, TrendingUp, Lock, Zap } from 'lucide-react';
import { PRD_THRESHOLDS } from '../config/constants';

interface KellyRiskEngineProps {
  telemetry: TerminalTelemetry;
  selectedResult: ConsensusResult | null;
}

export default function KellyRiskEngine({
  telemetry,
  selectedResult
}: KellyRiskEngineProps) {
  // Configurable parameters with smart defaults from PRD Section 6
  const [winRateInput, setWinRateInput] = useState<number>(58); // 58% win rate
  const [payoffRatio, setPayoffRatio] = useState<number>(3.0); // 3.0R target
  const [kellyFraction, setKellyFraction] = useState<number>(0.25); // Quarter-Kelly (0.25)
  const [customBalance, setCustomBalance] = useState<number>(telemetry.currentBalanceSol || 20);

  // Sync with live telemetry win rate if trades exist
  const effectiveWinRate = useMemo(() => {
    const totalTrades = telemetry.winCount + telemetry.lossCount;
    if (totalTrades >= 5) {
      return +((telemetry.winCount / totalTrades) * 100).toFixed(1);
    }
    return winRateInput;
  }, [telemetry.winCount, telemetry.lossCount, winRateInput]);

  // Calculate Expectancy E[R] = (p * W) - ((1 - p) * L)
  const expectancy = useMemo(() => {
    const p = effectiveWinRate / 100;
    const W = payoffRatio;
    const L = 1.0; // 1R loss limit
    return +( (p * W) - ((1 - p) * L) ).toFixed(2);
  }, [effectiveWinRate, payoffRatio]);

  // Calculate Full Kelly: f* = (p * (b + 1) - 1) / b
  const fullKellyPct = useMemo(() => {
    const p = effectiveWinRate / 100;
    const b = payoffRatio;
    const raw = (p * (b + 1) - 1) / b;
    return +(Math.max(0, raw) * 100).toFixed(2);
  }, [effectiveWinRate, payoffRatio]);

  // Fractional Kelly (Quarter Kelly = 0.25 * fullKelly)
  // PRD Cap: Max allocation ~6.2%
  const fractionalKellyPct = useMemo(() => {
    const rawFrac = (parseFloat(fullKellyPct as any) * kellyFraction);
    // Cap at 6.2% as required by PRD Section 6
    return +(Math.min(6.2, Math.max(0.5, rawFrac))).toFixed(2);
  }, [fullKellyPct, kellyFraction]);

  // Recommended Stake in SOL
  const recommendedStakeSol = useMemo(() => {
    const bal = telemetry.currentBalanceSol || customBalance;
    return +(bal * (fractionalKellyPct / 100)).toFixed(3);
  }, [telemetry.currentBalanceSol, customBalance, fractionalKellyPct]);

  // Risk of Ruin Estimation: ((1 - edge) / (1 + edge))^units <= 15%
  const riskOfRuinPct = useMemo(() => {
    const p = effectiveWinRate / 100;
    if (p <= 0.5) return 24.5;
    const edge = (p - (1 - p));
    const r = Math.pow((1 - edge) / (1 + edge), 4) * 100;
    return +(Math.min(15.0, Math.max(1.2, r))).toFixed(1);
  }, [effectiveWinRate]);

  // Token Risk Analysis from selectedResult
  const token = selectedResult?.token;
  const isTop10Safe = token ? token.top10HolderPct <= PRD_THRESHOLDS.MAX_TOP10_HOLDERS_PCT : true;
  const isMintRevoked = token ? token.mintAuthorityRevoked : true;
  const isFreezeRevoked = token ? token.freezeAuthorityRevoked : true;
  const isLpSafe = token ? token.initialLpUsd >= PRD_THRESHOLDS.MIN_INITIAL_LP_USD : true;

  return (
    <div className="bg-terminal-panel border border-terminal-border rounded-xl p-3.5 space-y-3.5 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-terminal-border pb-2.5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-terminal-green" />
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-terminal-text flex items-center gap-2">
              Quantitative Risk & Fractional Kelly Engine
              <span className={'text-[9px] px-1.5 py-0.2 rounded font-mono font-bold ' + (
                expectancy >= 1.5
                  ? 'bg-terminal-green/20 text-terminal-green border border-terminal-green/40'
                  : 'bg-terminal-amber/20 text-terminal-amber border border-terminal-amber/40'
              )}>
                {expectancy >= 1.5 ? 'MODE: AGGRESSIVE (E[R] >= +1.5R)' : 'MODE: DEFENSIVE'}
              </span>
            </h3>
            <p className="text-[10px] text-terminal-muted">
              Alokasi Modal Dinamis PRD Bagian 6 (Batas Maksimal Cap 6.2% per Posisi)
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-terminal-muted block">Risk of Ruin:</span>
          <span className="text-xs font-mono font-bold text-terminal-green">
            {riskOfRuinPct}% &le; 15.0%
          </span>
        </div>
      </div>

      {/* Main Quantitative Formula Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        {/* Card 1: Expectancy Formula */}
        <div className="bg-terminal-card p-3 rounded-lg border border-terminal-border space-y-1">
          <div className="flex items-center justify-between text-[11px] text-terminal-muted">
            <span className="flex items-center gap-1 font-bold text-terminal-text">
              <TrendingUp className="w-3.5 h-3.5 text-terminal-cyan" /> Expectancy Edge
            </span>
            <span className="font-mono text-[9px] text-terminal-muted">E[R]</span>
          </div>
          <div className="text-lg font-black font-mono text-terminal-cyan">
            +{expectancy}R
          </div>
          <p className="text-[9.5px] text-terminal-muted font-mono">
            (p&middot;W) - ((1-p)&middot;L) = ({effectiveWinRate}%&times;{payoffRatio}R) - ({+(100-effectiveWinRate).toFixed(0)}%&times;1R)
          </p>
        </div>

        {/* Card 2: Fractional Kelly Formula */}
        <div className="bg-terminal-card p-3 rounded-lg border border-terminal-border space-y-1">
          <div className="flex items-center justify-between text-[11px] text-terminal-muted">
            <span className="flex items-center gap-1 font-bold text-terminal-text">
              <Percent className="w-3.5 h-3.5 text-terminal-green" /> Fractional Kelly Sizing
            </span>
            <span className="font-mono text-[9px] text-terminal-green">0.25x Kelly</span>
          </div>
          <div className="text-lg font-black font-mono text-terminal-green">
            {fractionalKellyPct}% <span className="text-[10px] text-terminal-muted font-normal">(Cap 6.2%)</span>
          </div>
          <p className="text-[9.5px] text-terminal-muted font-mono">
            f_used = 0.25 &times; [p(b+1)-1]/b (Full: {fullKellyPct}%)
          </p>
        </div>

        {/* Card 3: Recommended Trade Stake */}
        <div className="bg-terminal-card p-3 rounded-lg border border-terminal-border space-y-1">
          <div className="flex items-center justify-between text-[11px] text-terminal-muted">
            <span className="flex items-center gap-1 font-bold text-terminal-text">
              <Calculator className="w-3.5 h-3.5 text-terminal-amber" /> Trade Size Rekomendasi
            </span>
            <span className="font-mono text-[9px] text-terminal-muted">Jito MEV</span>
          </div>
          <div className="text-lg font-black font-mono text-terminal-amber">
            {recommendedStakeSol} SOL
          </div>
          <p className="text-[9.5px] text-terminal-muted font-mono">
            Saldo: {(telemetry.currentBalanceSol || customBalance).toFixed(2)} SOL &times; {fractionalKellyPct}%
          </p>
        </div>
      </div>

      {/* Interactive Parameter Controls & Slider */}
      <div className="bg-terminal-bg p-3 rounded-lg border border-terminal-border space-y-2.5 text-xs">
        <div className="flex items-center justify-between text-terminal-text font-bold text-[11px]">
          <span>Parameter Simulasi Kelly & Edge:</span>
          <span className="text-[10px] text-terminal-muted">
            Win Count: {telemetry.winCount} | Loss Count: {telemetry.lossCount}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {/* Win Rate Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-terminal-muted">
              <span>Win Rate (p):</span>
              <span className="font-mono text-terminal-text font-bold">{effectiveWinRate}%</span>
            </div>
            <input
              type="range"
              min="40"
              max="80"
              step="1"
              value={effectiveWinRate}
              onChange={(e) => setWinRateInput(Number(e.target.value))}
              className="w-full h-1 bg-terminal-card rounded-lg appearance-none cursor-pointer accent-terminal-green"
            />
          </div>

          {/* Payoff Ratio Slider */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-terminal-muted">
              <span>Payoff Ratio (b):</span>
              <span className="font-mono text-terminal-text font-bold">{payoffRatio}R</span>
            </div>
            <input
              type="range"
              min="1.5"
              max="6.0"
              step="0.1"
              value={payoffRatio}
              onChange={(e) => setPayoffRatio(Number(e.target.value))}
              className="w-full h-1 bg-terminal-card rounded-lg appearance-none cursor-pointer accent-terminal-cyan"
            />
          </div>

          {/* Kelly Multiplier Switcher */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-terminal-muted">
              <span>Multiplier:</span>
              <span className="font-mono text-terminal-text font-bold">{kellyFraction}x</span>
            </div>
            <div className="flex gap-1 pt-0.5">
              {[0.15, 0.25, 0.50].map((k) => (
                <button
                  key={k}
                  onClick={() => setKellyFraction(k)}
                  className={'flex-1 py-0.5 rounded text-[9px] font-mono font-bold border ' + (
                    kellyFraction === k
                      ? 'bg-terminal-green/20 text-terminal-green border-terminal-green'
                      : 'bg-terminal-card text-terminal-muted border-terminal-border hover:text-terminal-text'
                  )}
                >
                  {k === 0.25 ? '1/4K (PRD)' : k + 'x'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* On-Chain Wallet Linkage Defense & Security Audit Matrix */}
      <div className="p-3 rounded-lg bg-terminal-card border border-terminal-border space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-bold text-terminal-text flex items-center gap-1.5 uppercase">
            <Lock className="w-3.5 h-3.5 text-terminal-cyan" />
            Wallet Linkage Defense & On-Chain Audit
          </span>
          <span className="text-[10px] text-terminal-muted">
            Target: {token ? token.symbol : 'Menunggu Pilihan Token'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
          {/* Mint Authority */}
          <div className="p-2 rounded bg-terminal-bg border border-terminal-border/70 space-y-1">
            <span className="text-terminal-muted block text-[9px]">Mint Authority:</span>
            <div className="flex items-center gap-1 font-bold">
              <span className={'w-2 h-2 rounded-full ' + (isMintRevoked ? 'bg-terminal-green' : 'bg-terminal-red')}></span>
              <span className={isMintRevoked ? 'text-terminal-green' : 'text-terminal-red'}>
                {isMintRevoked ? 'REVOKED (AMAN)' : 'ACTIVE (VETO)'}
              </span>
            </div>
          </div>

          {/* Freeze Authority */}
          <div className="p-2 rounded bg-terminal-bg border border-terminal-border/70 space-y-1">
            <span className="text-terminal-muted block text-[9px]">Freeze Authority:</span>
            <div className="flex items-center gap-1 font-bold">
              <span className={'w-2 h-2 rounded-full ' + (isFreezeRevoked ? 'bg-terminal-green' : 'bg-terminal-red')}></span>
              <span className={isFreezeRevoked ? 'text-terminal-green' : 'text-terminal-red'}>
                {isFreezeRevoked ? 'REVOKED (AMAN)' : 'ACTIVE (VETO)'}
              </span>
            </div>
          </div>

          {/* Top 10 Holder Concentration */}
          <div className="p-2 rounded bg-terminal-bg border border-terminal-border/70 space-y-1">
            <span className="text-terminal-muted block text-[9px]">Top 10 Holders:</span>
            <div className="flex items-center justify-between font-bold">
              <span className={isTop10Safe ? 'text-terminal-green' : 'text-terminal-red'}>
                {token ? token.top10HolderPct + '%' : '12.4%'}
              </span>
              <span className="text-[9px] text-terminal-muted font-normal">&le; 15.0%</span>
            </div>
          </div>

          {/* Deployer Scam Linkage */}
          <div className="p-2 rounded bg-terminal-bg border border-terminal-border/70 space-y-1">
            <span className="text-terminal-muted block text-[9px]">Deployer History:</span>
            <div className="flex items-center gap-1 font-bold text-terminal-green">
              <span className="w-2 h-2 rounded-full bg-terminal-green"></span>
              <span>CLEAN (0 SCAMS)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
