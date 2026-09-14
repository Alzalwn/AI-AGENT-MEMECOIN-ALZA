'use client';

import React, { useState, useEffect, useId } from 'react';
import {
  Calculator,
  ShieldCheck,
  AlertTriangle,
  Copy,
  Check,
  DollarSign,
  Percent,
  Sliders,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Info,
} from 'lucide-react';
import { BinanceFuturesSignal, FuturesDirection } from '../../types/futures';

interface InteractiveRiskCalculatorProps {
  activeSignal?: BinanceFuturesSignal | null;
  defaultSymbol?: string;
  onClose?: () => void;
}

export const InteractiveRiskCalculator: React.FC<InteractiveRiskCalculatorProps> = ({
  activeSignal,
  defaultSymbol = 'BTCUSDT',
  onClose,
}) => {
  const balanceInputId = useId();
  const riskInputId = useId();
  const leverageInputId = useId();
  const entryInputId = useId();
  const slInputId = useId();
  const tp1InputId = useId();
  const tp2InputId = useId();
  const tp3InputId = useId();

  // Inputs
  const [accountBalance, setAccountBalance] = useState<number>(100);
  const [riskPercent, setRiskPercent] = useState<number>(2.0); // SOP standard: 2.0%
  const [leverage, setLeverage] = useState<number>(5); // 5x default
  const [copied, setCopied] = useState<boolean>(false);

  // Trade Setup parameters
  const [symbol, setSymbol] = useState<string>(defaultSymbol);
  const [direction, setDirection] = useState<FuturesDirection>('LONG');
  const [entryPrice, setEntryPrice] = useState<number>(65000);
  const [stopLossPrice, setStopLossPrice] = useState<number>(63700);
  const [tp1Price, setTp1Price] = useState<number>(66300);
  const [tp2Price, setTp2Price] = useState<number>(67600);
  const [tp3Price, setTp3Price] = useState<number>(69500);

  // Sync with activeSignal if provided
  useEffect(() => {
    if (activeSignal) {
      setSymbol(activeSignal.symbol);
      setDirection(activeSignal.direction);
      setEntryPrice(activeSignal.entryZone.current || (activeSignal.entryZone.low + activeSignal.entryZone.high) / 2);
      setStopLossPrice(activeSignal.stopLoss.price);
      setTp1Price(activeSignal.targets.tp1.price);
      setTp2Price(activeSignal.targets.tp2.price);
      setTp3Price(activeSignal.targets.tp3.price);
      if (activeSignal.leverage?.safe?.multiplier) {
        setLeverage(activeSignal.leverage.safe.multiplier);
      }
    }
  }, [activeSignal]);

  // Calculations
  const slDistancePct =
    entryPrice > 0 ? Math.abs((entryPrice - stopLossPrice) / entryPrice) * 100 : 0;
  const maxRiskAmountUsd = accountBalance * (riskPercent / 100);
  const notionalPositionUsd =
    slDistancePct > 0 ? maxRiskAmountUsd / (slDistancePct / 100) : 0;
  const marginRequiredUsd = leverage > 0 ? notionalPositionUsd / leverage : 0;
  const unitsCount = entryPrice > 0 ? notionalPositionUsd / entryPrice : 0;

  // Potential Profit breakdown (50% TP1, 30% TP2, 20% TP3)
  const tp1DistPct = entryPrice > 0 ? Math.abs((tp1Price - entryPrice) / entryPrice) * 100 : 0;
  const tp2DistPct = entryPrice > 0 ? Math.abs((tp2Price - entryPrice) / entryPrice) * 100 : 0;
  const tp3DistPct = entryPrice > 0 ? Math.abs((tp3Price - entryPrice) / entryPrice) * 100 : 0;

  const profitTp1Usd = notionalPositionUsd * 0.5 * (tp1DistPct / 100);
  const profitTp2Usd = notionalPositionUsd * 0.3 * (tp2DistPct / 100);
  const profitTp3Usd = notionalPositionUsd * 0.2 * (tp3DistPct / 100);
  const totalTargetProfitUsd = profitTp1Usd + profitTp2Usd + profitTp3Usd;
  const expectedRiskReward = maxRiskAmountUsd > 0 ? totalTargetProfitUsd / maxRiskAmountUsd : 0;

  const isRiskViolation = riskPercent > 2.0;
  const isLeverageViolation = leverage > 10;

  // GAP-5: Liquidation Price & Margin Health Calculation (USDT-M Isolated)
  // Maintenance Margin Rate (MMR) default ~0.5% (0.005)
  const mmr = 0.005;
  const rawLiqPrice =
    direction === 'LONG'
      ? entryPrice * (1 - (1 / leverage) + mmr)
      : entryPrice * (1 + (1 / leverage) - mmr);
  const estimatedLiqPrice = Math.max(rawLiqPrice, 0);

  const liqDistancePct =
    entryPrice > 0 ? Math.abs((entryPrice - estimatedLiqPrice) / entryPrice) * 100 : 0;
  
  // Verify that SL triggers well before liquidation (Anti-Liquidation Assurance)
  const isSlSafeFromLiq = slDistancePct > 0 && slDistancePct < liqDistancePct * 0.75;

  const handleCopyParameters = () => {
    const text = `📋 PARAMETER ORDER BINANCE FUTURES (SOP 2% RISK)
Pair: ${symbol}
Arah: ${direction} (${direction === 'LONG' ? 'BUY' : 'SELL'})
Mode Margin: ISOLATED (Wajib)
Leverage: ${leverage}x
----------------------------------------
Entry Limit: $${entryPrice.toLocaleString()}
Margin USDT Di-input: $${marginRequiredUsd.toFixed(2)} USDT
Ukuran Posisi: $${notionalPositionUsd.toFixed(2)} (${unitsCount.toFixed(4)} ${symbol.replace('USDT', '')})
----------------------------------------
Stop Loss (SL): $${stopLossPrice.toLocaleString()} (-${slDistancePct.toFixed(2)}% | Max Loss: -$${maxRiskAmountUsd.toFixed(2)})
Take Profit 1 (TP1 50%): $${tp1Price.toLocaleString()} (+${tp1DistPct.toFixed(2)}% | +$${profitTp1Usd.toFixed(2)})
Take Profit 2 (TP2 30%): $${tp2Price.toLocaleString()} (+${tp2DistPct.toFixed(2)}% | +$${profitTp2Usd.toFixed(2)})
Take Profit 3 (TP3 20%): $${tp3Price.toLocaleString()} (+${tp3DistPct.toFixed(2)}% | +$${profitTp3Usd.toFixed(2)})
Total Estimasi Profit: +$${totalTargetProfitUsd.toFixed(2)} (R:R 1:${expectedRiskReward.toFixed(2)})
Catatan SOP: Begitu TP1 tercapai, segera geser Stop Loss ke Break-Even (BE)!`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="bg-[#0b0e14] border border-cyan-500/30 rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden font-sans">
      {/* Background ambient glow */}
      <div className="absolute -top-20 -right-20 w-56 h-56 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-56 h-56 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black text-white tracking-wide font-mono">
                KALKULATOR RISIKO & MARGIN INTERAKTIF
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                SOP 2% Rule
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Kalkulasi ukuran posisi dan margin aman untuk akun modal berapapun
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-white/10 text-xs font-mono"
          >
            ✕
          </button>
        )}
      </div>

      {/* Input Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Account & Risk Setup (5 Cols) */}
        <div className="lg:col-span-5 space-y-3.5 bg-black/40 border border-white/5 p-3.5 rounded-xl">
          <div className="text-[11px] font-mono font-bold text-zinc-400 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-cyan-400" />
            <span>PARAMETER MODAL & RISIKO</span>
          </div>

          {/* Account Balance */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <label htmlFor={balanceInputId} className="text-zinc-300 font-mono">Saldo Dompet (Wallet Balance):</label>
              <div className="flex gap-1">
                {[50, 100, 250, 500].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setAccountBalance(preset)}
                    className={`px-1.5 py-0.5 text-[10px] font-mono rounded cursor-pointer ${
                      accountBalance === preset
                        ? 'bg-cyan-500 text-black font-bold'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    ${preset}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-xs">
                $
              </span>
              <input
                id={balanceInputId}
                type="number"
                min="5"
                step="5"
                value={accountBalance}
                onChange={(e) => setAccountBalance(Math.max(1, Number(e.target.value)))}
                className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg pl-7 pr-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {/* Risk Percent */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <label htmlFor={riskInputId} className="text-zinc-300 font-mono">Batas Toleransi Risiko:</label>
              <div className="flex gap-1">
                {[1.0, 1.5, 2.0, 3.0].map((p) => (
                  <button
                    key={p}
                    onClick={() => setRiskPercent(p)}
                    className={`px-1.5 py-0.5 text-[10px] font-mono rounded cursor-pointer ${
                      riskPercent === p
                        ? 'bg-emerald-500 text-black font-bold'
                        : 'bg-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    {p}% {p === 2.0 ? '(SOP)' : ''}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative">
              <input
                id={riskInputId}
                type="number"
                min="0.5"
                max="10"
                step="0.5"
                value={riskPercent}
                onChange={(e) => setRiskPercent(Number(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-700/80 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-400"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 font-mono text-xs">
                %
              </span>
            </div>
            {isRiskViolation && (
              <div className="mt-1 flex items-center gap-1 text-[11px] text-amber-400 font-mono">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                <span>Peringatan: SOP menganjurkan maksimal 2% per transaksi!</span>
              </div>
            )}
          </div>

          {/* Leverage Slider */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <label htmlFor={leverageInputId} className="text-zinc-300 font-mono">Multiplier Leverage (Isolated):</label>
              <span
                className={`font-mono font-bold text-xs px-2 py-0.5 rounded ${
                  leverage <= 5
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : leverage <= 10
                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}
              >
                {leverage}x {leverage <= 5 ? '(SAFE)' : leverage <= 10 ? '(SCALP)' : '(DANGER)'}
              </span>
            </div>
            <input
              id={leverageInputId}
              type="range"
              min="2"
              max="15"
              step="1"
              value={leverage}
              onChange={(e) => setLeverage(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
            />
            {isLeverageViolation && (
              <div className="mt-1 flex items-center gap-1 text-[11px] text-rose-400 font-mono">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                <span>SOP Melarang leverage di atas 10x untuk mencegah likuidasi kilat!</span>
              </div>
            )}
          </div>

          {/* Pair & Direction */}
          <div className="pt-1 border-t border-white/5 flex items-center justify-between gap-2">
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="BTCUSDT"
              className="w-1/2 bg-zinc-900 border border-zinc-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono"
            />
            <div className="flex w-1/2 rounded-lg overflow-hidden border border-zinc-700">
              <button
                onClick={() => setDirection('LONG')}
                className={`flex-1 py-1.5 text-xs font-mono font-bold flex items-center justify-center gap-1 cursor-pointer ${
                  direction === 'LONG'
                    ? 'bg-emerald-500 text-black'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                <ArrowUpRight className="w-3.5 h-3.5" /> LONG
              </button>
              <button
                onClick={() => setDirection('SHORT')}
                className={`flex-1 py-1.5 text-xs font-mono font-bold flex items-center justify-center gap-1 cursor-pointer ${
                  direction === 'SHORT'
                    ? 'bg-rose-500 text-white'
                    : 'bg-zinc-900 text-zinc-400 hover:text-white'
                }`}
              >
                <ArrowDownRight className="w-3.5 h-3.5" /> SHORT
              </button>
            </div>
          </div>
        </div>

        {/* Center Column: Price Levels Setup (3 Cols) */}
        <div className="lg:col-span-3 space-y-2.5 bg-black/40 border border-white/5 p-3.5 rounded-xl">
          <div className="text-[11px] font-mono font-bold text-zinc-400 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-yellow-400" />
            <span>LEVEL HARGA (USD)</span>
          </div>

          <div>
            <label htmlFor={entryInputId} className="text-[10px] font-mono text-zinc-400 block mb-0.5">Entry Price:</label>
            <input
              id={entryInputId}
              type="number"
              value={entryPrice}
              onChange={(e) => setEntryPrice(Number(e.target.value))}
              className="w-full bg-zinc-900 border border-zinc-700/80 rounded px-2 py-1 text-xs text-white font-mono"
            />
          </div>

          <div>
            <label htmlFor={slInputId} className="text-[10px] font-mono text-rose-400 flex justify-between mb-0.5">
              <span>Stop Loss (SL):</span>
              <span>-{slDistancePct.toFixed(2)}%</span>
            </label>
            <input
              id={slInputId}
              type="number"
              value={stopLossPrice}
              onChange={(e) => setStopLossPrice(Number(e.target.value))}
              className="w-full bg-zinc-900 border border-rose-500/40 rounded px-2 py-1 text-xs text-rose-300 font-mono"
            />
          </div>

          <div>
            <label htmlFor={tp1InputId} className="text-[10px] font-mono text-emerald-400 flex justify-between mb-0.5">
              <span>TP1 (50% Out):</span>
              <span>+{tp1DistPct.toFixed(2)}%</span>
            </label>
            <input
              id={tp1InputId}
              type="number"
              value={tp1Price}
              onChange={(e) => setTp1Price(Number(e.target.value))}
              className="w-full bg-zinc-900 border border-emerald-500/30 rounded px-2 py-1 text-xs text-emerald-300 font-mono"
            />
          </div>

          <div>
            <label htmlFor={tp2InputId} className="text-[10px] font-mono text-emerald-400 flex justify-between mb-0.5">
              <span>TP2 (30% Out):</span>
              <span>+{tp2DistPct.toFixed(2)}%</span>
            </label>
            <input
              id={tp2InputId}
              type="number"
              value={tp2Price}
              onChange={(e) => setTp2Price(Number(e.target.value))}
              className="w-full bg-zinc-900 border border-emerald-500/30 rounded px-2 py-1 text-xs text-emerald-300 font-mono"
            />
          </div>

          <div>
            <label htmlFor={tp3InputId} className="text-[10px] font-mono text-emerald-400 flex justify-between mb-0.5">
              <span>TP3 (20% Out):</span>
              <span>+{tp3DistPct.toFixed(2)}%</span>
            </label>
            <input
              id={tp3InputId}
              type="number"
              value={tp3Price}
              onChange={(e) => setTp3Price(Number(e.target.value))}
              className="w-full bg-zinc-900 border border-emerald-500/30 rounded px-2 py-1 text-xs text-emerald-300 font-mono"
            />
          </div>
        </div>

        {/* Right Column: Calculated Execution Output (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col justify-between bg-gradient-to-br from-[#0c1322] to-[#0d1c1a] border border-cyan-500/40 p-4 rounded-xl shadow-lg">
          <div>
            <div className="text-[11px] font-mono font-bold text-cyan-300 flex items-center justify-between mb-3 border-b border-white/10 pb-2">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                OUTPUT EKSEKUSI BINANCE
              </span>
              <span className="text-[10px] bg-cyan-500/20 px-1.5 py-0.5 rounded text-cyan-200">
                1:{expectedRiskReward.toFixed(2)} R:R
              </span>
            </div>

            {/* Crucial Metric 1: Margin to input in Binance */}
            <div className="bg-cyan-950/40 border border-cyan-500/50 rounded-xl p-2.5 mb-2.5">
              <div className="text-[10px] text-cyan-300 font-mono uppercase tracking-wider mb-0.5">
                👉 Margin USDT Wajib Di-Input ke Binance:
              </div>
              <div className="text-xl sm:text-2xl font-black text-cyan-400 font-mono">
                ${marginRequiredUsd.toFixed(2)}{' '}
                <span className="text-xs text-zinc-400 font-normal">USDT</span>
              </div>
              <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                Ukuran Posisi Notional: ${notionalPositionUsd.toFixed(2)} ({unitsCount.toFixed(4)}{' '}
                {symbol.replace('USDT', '')})
              </div>
            </div>

            {/* Crucial Metric 2: Max Dollar Risk if SL is hit */}
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="bg-rose-950/30 border border-rose-500/30 rounded-lg p-2">
                <div className="text-[10px] text-rose-300 font-mono">Maksimal Risiko (SL):</div>
                <div className="text-sm font-bold text-rose-400 font-mono">
                  -${maxRiskAmountUsd.toFixed(2)}
                </div>
                <div className="text-[9px] text-zinc-400 font-mono">Tepat {riskPercent}% saldo</div>
              </div>

              <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-lg p-2">
                <div className="text-[10px] text-emerald-300 font-mono">Target Cuan Total:</div>
                <div className="text-sm font-bold text-emerald-400 font-mono">
                  +${totalTargetProfitUsd.toFixed(2)}
                </div>
                <div className="text-[9px] text-zinc-400 font-mono">
                  +{(accountBalance > 0 ? (totalTargetProfitUsd / accountBalance) * 100 : 0).toFixed(1)}% akun
                </div>
              </div>
            </div>

            {/* GAP-5: Liquidation Health & Safety Metric */}
            <div className="bg-zinc-950/70 border border-white/10 rounded-lg p-2.5 mb-2.5 font-mono">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-zinc-400">Estimasi Harga Likuidasi:</span>
                <span className="text-amber-300 font-bold">${estimatedLiqPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1.5">
                <span>Jarak ke Likuidasi: {liqDistancePct.toFixed(2)}%</span>
                <span>Jarak ke SL: {slDistancePct.toFixed(2)}%</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold">
                {isSlSafeFromLiq ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Anti-Liquidation Safe: SL terkena jauh sebelum Likuidasi
                  </span>
                ) : (
                  <span className="text-rose-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Warning: SL terlalu dekat dengan titik Likuidasi!
                  </span>
                )}
              </div>
            </div>

            {/* SOP Rule Reminder */}
            <div className="text-[10px] font-mono text-zinc-400 bg-black/40 rounded-lg p-2 border border-white/5 space-y-1">
              <div className="text-emerald-400 font-bold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> SOP Exit Golden Rule:
              </div>
              <div>• Kunci TP1 (+${profitTp1Usd.toFixed(2)}), langsung geser SL ke BE (modal $0 risiko).</div>
              <div>• Sisa 50% posisi diarahkan ke TP2 (+${profitTp2Usd.toFixed(2)}) & TP3 (+${profitTp3Usd.toFixed(2)}).</div>
            </div>
          </div>

          {/* Copy Button */}
          <button
            onClick={handleCopyParameters}
            className={`mt-3 w-full py-2.5 px-3 rounded-xl font-mono text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
              copied
                ? 'bg-emerald-500 text-black border border-emerald-400'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.35)] active:scale-98'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                <span>PARAMETER DISALIN KE CLIPBOARD!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>📋 SALIN PARAMETER ORDER BINANCE</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
