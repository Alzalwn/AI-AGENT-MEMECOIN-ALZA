'use client';

import React, { useState } from 'react';
import {
  X,
  BookOpen,
  ShieldCheck,
  Calculator,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Zap,
  TrendingUp,
  Layers,
  ArrowRight,
  ExternalLink,
  Globe,
  Brain,
} from 'lucide-react';

interface KnowledgeHubDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KnowledgeHubDrawer: React.FC<KnowledgeHubDrawerProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'sop' | 'calculator' | 'smc' | 'funding' | 'macro'>('sop');

  // Interactive Checklist State for 10 Perintah
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  // Interactive Sizing Calculator State
  const [walletBalance, setWalletBalance] = useState<number>(1000);
  const [riskPercent, setRiskPercent] = useState<number>(2);
  const [entryPrice, setEntryPrice] = useState<number>(150);
  const [stopLossPrice, setStopLossPrice] = useState<number>(145);
  const [leverage, setLeverage] = useState<number>(5);

  const toggleCheck = (id: number) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Sizing calculations
  const dollarRisk = (walletBalance * riskPercent) / 100;
  const priceDistance = Math.abs(entryPrice - stopLossPrice);
  const percentDistance = entryPrice > 0 ? (priceDistance / entryPrice) * 100 : 0;
  const calculatedPositionUsd = percentDistance > 0 ? (dollarRisk / (percentDistance / 100)) : 0;
  const marginRequired = leverage > 0 ? calculatedPositionUsd / leverage : 0;

  const TEN_COMMANDMENTS = [
    {
      id: 1,
      title: 'Wajib Mode ISOLATED, Dilarang Mode CROSS',
      badge: 'Safety Rule',
      desc: 'Jangan pernah mempertaruhkan seluruh saldo wallet untuk satu posisi. Mode Isolated memastikan likuidasi terisolasi pada margin posisi tersebut.',
    },
    {
      id: 2,
      title: 'Maksimal Risiko 2% Modal per Trade',
      badge: 'Risk Rule',
      desc: 'Hitung ukuran posisi dari jarak Stop Loss. Jika SL tersentuh, modal dompet maksimal hanya berkurang 2.0%.',
    },
    {
      id: 3,
      title: 'Batas Leverage Disiplin (3x - 10x)',
      badge: 'Leverage',
      desc: 'Swing trading: 3x s.d. 5x (Max 7x). Scalping 15m: 7x s.d. 10x (Max 12x). Dilarang keras leverage tinggi di atas 15x.',
    },
    {
      id: 4,
      title: 'Protokol BITCOIN GUARD',
      badge: 'Macro Guard',
      desc: 'Dilarang membuka posisi LONG pada Altcoin jika struktur BTC sedang dump, breakdown support, atau di bawah EMA-50/200 4H.',
    },
    {
      id: 5,
      title: 'Volume 24 Jam Koin Wajib Minimal $12 Juta',
      badge: 'Liquidity',
      desc: 'Hindari koin dengan order book tipis yang mudah dimanipulasi dengan fake wicks dan slippage besar.',
    },
    {
      id: 6,
      title: 'Wajib Pasang Stop Loss di Server Binance',
      badge: 'Order Execution',
      desc: 'Pasang SL langsung di bursa bersamaan dengan order masuk. Jangan pernah mengandalkan mental stop loss.',
    },
    {
      id: 7,
      title: 'Amankan 50% Profit saat TP1 Tercapai',
      badge: 'Profit Taking',
      desc: 'Kunci sebagian keuntungan segera saat target pertama tercapai. Modal awal terlindungi dan kurangi eksposur pasar.',
    },
    {
      id: 8,
      title: 'Wajib Geser Stop Loss ke BREAK-EVEN (BE)',
      badge: 'Free Trade',
      desc: 'Begitu TP1 tercapai, langsung ubah level Stop Loss ke harga Entry. Posisi sekarang berstatus Risk-Free Trade.',
    },
    {
      id: 9,
      title: 'Aturan 2-Strike Loss (Cooling-Down 24 Jam)',
      badge: 'Anti-Revenge',
      desc: 'Jika terkena 2x SL beruntun atau drawdown harian mencapai 5%: STOP TRADING HARI INI. Tutup chart dan tenangkan emosi.',
    },
    {
      id: 10,
      title: 'Greed Cap (+5% s.d. +10% Pertumbuhan Harian)',
      badge: 'Discipline',
      desc: 'Jika target harian tercapai, kunci profit atau pindahkan ke Spot. Lindungi modal di atas segalanya — profit akan datang sendiri.',
    },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-sans">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity animate-in fade-in"
      />

      {/* Slide Drawer from Right */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-2xl bg-zinc-950 border-l border-zinc-800/80 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-amber-950/30 border-b border-zinc-800 p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-zinc-100">Alza&apos;s Binance SOP Knowledge Hub</h2>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded font-mono font-bold">
                    OFFICIAL
                  </span>
                </div>
                <p className="text-xs text-zinc-400">Playbook Institusional & Pedoman Disiplin Trading Binance Futures</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 p-2 bg-zinc-900/60 border-b border-zinc-800/80 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('sop')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                activeTab === 'sop'
                  ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              10 Perintah Trader ({Object.values(checkedItems).filter(Boolean).length}/10)
            </button>

            <button
              onClick={() => setActiveTab('calculator')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                activeTab === 'calculator'
                  ? 'bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-500/20'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <Calculator className="w-4 h-4" />
              Kalkulator Sizing 2%
            </button>

            <button
              onClick={() => setActiveTab('smc')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                activeTab === 'smc'
                  ? 'bg-sky-500 text-zinc-950 shadow-md shadow-sky-500/20'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <Layers className="w-4 h-4" />
              SMC & 4-TF Playbook
            </button>

            <button
              onClick={() => setActiveTab('funding')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                activeTab === 'funding'
                  ? 'bg-purple-500 text-zinc-950 shadow-md shadow-purple-500/20'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <Flame className="w-4 h-4" />
              Funding & Squeeze
            </button>

            <button
              onClick={() => setActiveTab('macro')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                activeTab === 'macro'
                  ? 'bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-500/20'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <Globe className="w-4 h-4" />
              Makro &amp; Psikologi
            </button>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* TAB 1: 10 PERINTAH TRADER */}
            {activeTab === 'sop' && (
              <div className="space-y-4">
                <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-200/90 leading-relaxed">
                    <span className="font-bold text-amber-300">Pre-Trade Discipline Checklist:</span> Centang setiap perintah di bawah ini sebelum Anda menekan tombol Order di Binance. Jika ada 1 perintah yang Anda langgar, batalkan trade!
                  </div>
                </div>

                <div className="space-y-3">
                  {TEN_COMMANDMENTS.map((item) => {
                    const isChecked = !!checkedItems[item.id];
                    return (
                      <div
                        key={item.id}
                        onClick={() => toggleCheck(item.id)}
                        className={`p-4 rounded-xl border cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-emerald-950/20 border-emerald-500/50 shadow-sm'
                            : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <button
                              type="button"
                              className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                                isChecked
                                  ? 'bg-emerald-500 text-zinc-950'
                                  : 'border border-zinc-600 hover:border-zinc-400'
                              }`}
                            >
                              {isChecked && <CheckCircle2 className="w-4 h-4" />}
                            </button>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs text-zinc-500">#{item.id}</span>
                                <h4
                                  className={`text-sm font-bold ${
                                    isChecked ? 'text-emerald-300 line-through' : 'text-zinc-200'
                                  }`}
                                >
                                  {item.title}
                                </h4>
                              </div>
                              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{item.desc}</p>
                            </div>
                          </div>
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 shrink-0">
                            {item.badge}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 2: KALKULATOR SIZING 2% */}
            {activeTab === 'calculator' && (
              <div className="space-y-6">
                <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 space-y-4">
                  <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-emerald-400" />
                    Input Parameter Akun & Posisi
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">Total Modal Wallet ($)</label>
                      <input
                        type="number"
                        value={walletBalance}
                        onChange={(e) => setWalletBalance(Number(e.target.value) || 0)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">Batas Toleransi Risiko (%)</label>
                      <input
                        type="number"
                        step="0.5"
                        max="5"
                        value={riskPercent}
                        onChange={(e) => setRiskPercent(Number(e.target.value) || 0)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-emerald-400 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                      <span className="text-[10px] text-zinc-500">SOP Resmi: Maksimal 2.0%</span>
                    </div>

                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">Harga Entry ($)</label>
                      <input
                        type="number"
                        step="any"
                        value={entryPrice}
                        onChange={(e) => setEntryPrice(Number(e.target.value) || 0)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-zinc-400 block mb-1">Harga Stop Loss ($)</label>
                      <input
                        type="number"
                        step="any"
                        value={stopLossPrice}
                        onChange={(e) => setStopLossPrice(Number(e.target.value) || 0)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-rose-400 focus:outline-none focus:border-rose-500 font-mono"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="text-xs text-zinc-400 block mb-1">Leverage ({leverage}x)</label>
                      <input
                        type="range"
                        min="1"
                        max="20"
                        value={leverage}
                        onChange={(e) => setLeverage(Number(e.target.value))}
                        className="w-full accent-emerald-500"
                      />
                      <div className="flex justify-between text-[10px] text-zinc-500 mt-1 font-mono">
                        <span>1x (Spot)</span>
                        <span className="text-emerald-400">3x - 5x (Swing SOP)</span>
                        <span className="text-amber-400">7x - 10x (Scalp SOP)</span>
                        <span className="text-rose-500">20x (Dilarang)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sizing Output Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-gradient-to-br from-zinc-900 to-rose-950/20 border border-rose-500/30 rounded-xl p-4">
                    <span className="text-xs text-zinc-400">Maksimal Risiko Dollar (SL Hit)</span>
                    <div className="text-2xl font-bold font-mono text-rose-400 mt-1">
                      ${dollarRisk.toFixed(2)}
                    </div>
                    <span className="text-[10px] text-zinc-500">Tepat {riskPercent}% dari modal Anda</span>
                  </div>

                  <div className="bg-gradient-to-br from-zinc-900 to-sky-950/20 border border-sky-500/30 rounded-xl p-4">
                    <span className="text-xs text-zinc-400">Jarak Stop Loss</span>
                    <div className="text-2xl font-bold font-mono text-sky-400 mt-1">
                      {percentDistance.toFixed(2)}%
                    </div>
                    <span className="text-[10px] text-zinc-500">${priceDistance.toFixed(4)} jarak harga</span>
                  </div>

                  <div className="bg-gradient-to-br from-zinc-900 to-emerald-950/30 border border-emerald-500/40 rounded-xl p-4 sm:col-span-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wide">
                          Rekomendasi Ukuran Posisi (Position Size)
                        </span>
                        <div className="text-3xl font-extrabold font-mono text-emerald-300 mt-1">
                          ${calculatedPositionUsd.toFixed(2)} <span className="text-sm font-normal text-zinc-400">Notional</span>
                        </div>
                      </div>
                      <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-zinc-800">
                        <span className="text-xs text-zinc-400">Margin Modal Diperlukan</span>
                        <div className="text-xl font-bold font-mono text-zinc-100">
                          ${marginRequired.toFixed(2)} <span className="text-xs text-zinc-400">({leverage}x)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: SMC & 4-TF PLAYBOOK */}
            {activeTab === 'smc' && (
              <div className="space-y-4 text-xs text-zinc-300 leading-relaxed">
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
                  <h4 className="font-bold text-sm text-sky-400 mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" /> 4-Timeframe Alignment Matrix
                  </h4>
                  <p className="text-zinc-400">
                    Sistem memetakan arah tren di 4 timeframe: <span className="font-mono text-zinc-200">15m, 1h, 4h, Daily</span>.
                  </p>
                  <ul className="list-disc pl-5 mt-2 space-y-1 text-zinc-400">
                    <li><strong className="text-emerald-400">Confluence 4/4 atau 3/4:</strong> Sinyal berkekuatan tinggi. Trend searah makro.</li>
                    <li><strong className="text-rose-400">Counter-Trend Trap:</strong> Jika 15m Bullish namun 4h/Daily Bearish, dilarang Swing Long. Hanya diizinkan Scalp cepat dengan TP ketat.</li>
                  </ul>
                </div>

                <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
                  <h4 className="font-bold text-sm text-amber-400 mb-2">Smart Money Concepts (SMC)</h4>
                  <div className="space-y-2">
                    <div>
                      <span className="font-semibold text-zinc-200">1. Liquidity Sweep:</span>
                      <p className="text-zinc-400 mt-0.5">Penembusan palsu (wick) di atas resistance atau di bawah support untuk memicu stop order ritel sebelum pembalikan arah besar.</p>
                    </div>
                    <div>
                      <span className="font-semibold text-zinc-200">2. Fair Value Gap (FVG):</span>
                      <p className="text-zinc-400 mt-0.5">Ketidakseimbangan harga 3-candle berturut-turut yang menjadi magnet harga untuk retest sebelum kelanjutan tren.</p>
                    </div>
                    <div>
                      <span className="font-semibold text-zinc-200">3. Order Block (OB):</span>
                      <p className="text-zinc-400 mt-0.5">Candle terakhir yang berlawanan arah sebelum terjadinya displacement kencang, menandai zona akumulasi institusi.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: FUNDING RATE & SQUEEZE */}
            {activeTab === 'funding' && (
              <div className="space-y-4 text-xs text-zinc-300 leading-relaxed">
                <div className="bg-purple-950/20 border border-purple-500/30 rounded-xl p-4">
                  <h4 className="font-bold text-sm text-purple-300 mb-2 flex items-center gap-2">
                    <Flame className="w-4 h-4 text-purple-400" /> Strategi Funding Rate Arbitrage & Squeeze
                  </h4>
                  <p className="text-zinc-400">
                    Funding Rate adalah mekanisme penyeimbang harga Futures dan Spot di Binance yang di-settle setiap 8 jam atau 4 jam.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
                    <span className="text-rose-400 font-bold uppercase text-[11px]">Negative Funding Rate (-0.05% s.d. -0.20%)</span>
                    <h5 className="font-bold text-zinc-200 text-sm mt-1">Short Squeeze Alert!</h5>
                    <p className="text-zinc-400 mt-2">
                      Mayoritas ritel sedang membuka Short. Pasar over-shorted. Cermati konfluensi bullish SMC untuk menangkap lonjakan harga tajam (short squeeze liquidation).
                    </p>
                  </div>

                  <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
                    <span className="text-emerald-400 font-bold uppercase text-[11px]">Ekstrim Positive Funding (+0.08% s.d. +0.25%)</span>
                    <h5 className="font-bold text-zinc-200 text-sm mt-1">Long Squeeze Warning!</h5>
                    <p className="text-zinc-400 mt-2">
                      Posisi Long terlalu padat dan membayar biaya mahal. Rawan terjadi flush-down liquidation untuk membersihkan over-leveraged longs.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: MAKRO & PSIKOLOGI TRADING */}
            {activeTab === 'macro' && (
              <div className="space-y-4 text-xs text-zinc-300 leading-relaxed">
                <div className="bg-cyan-950/20 border border-cyan-500/30 rounded-xl p-4">
                  <h4 className="font-bold text-sm text-cyan-300 mb-1 flex items-center gap-2">
                    <Globe className="w-4 h-4 text-cyan-400" /> Korelasi Makro Ekonomi &amp; Likuiditas Global
                  </h4>
                  <p className="text-zinc-400">
                    Arah pergerakan pasar crypto sangat dipengaruhi oleh aliran likuiditas global dan indeks makro Amerika Serikat.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5">
                    <span className="text-cyan-400 font-bold uppercase text-[10px]">DXY (US Dollar Index)</span>
                    <h5 className="font-bold text-zinc-200 text-sm mt-0.5">Korelasi Negatif Kuat</h5>
                    <p className="text-zinc-400 mt-1.5 text-[11px]">
                      Jika DXY menguat (breakout resistance), likuiditas ditarik dari aset berisiko sehingga Bitcoin &amp; Altcoin cenderung dump. Saat DXY breakdown support, crypto rally eksplosif.
                    </p>
                  </div>

                  <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-3.5">
                    <span className="text-amber-400 font-bold uppercase text-[10px]">Bitcoin Dominance (BTC.D)</span>
                    <h5 className="font-bold text-zinc-200 text-sm mt-0.5">Altcoin Season Matrix</h5>
                    <p className="text-zinc-400 mt-1.5 text-[11px]">
                      • BTC.D Naik + BTC Naik: Hanya BTC yang terbang, Altcoin lagging.<br />
                      • BTC.D Turun + BTC Sideways: Golden Altcoin Season!<br />
                      • BTC.D Naik + BTC Dump: Altcoin Bloodbath (Dilarang Long).
                    </p>
                  </div>
                </div>

                {/* Anti-FOMO & Revenge Trading Checklist */}
                <div className="bg-zinc-900/70 border border-white/10 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                    <Brain className="w-4 h-4" /> Protokol Psikologi Anti-FOMO &amp; Revenge Trading
                  </div>

                  <div className="space-y-2 text-[11px]">
                    <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
                      <span className="text-amber-300 font-bold block mb-0.5">⚠️ Aturan Anti-FOMO 3.0%:</span>
                      Jika koin sudah naik lebih dari +3.0% dari zona entry ideal SMC, <strong>JANGAN PERNAH MARKET BUY</strong>. Batalkan order atau tunggu pullback retest FVG 50%. Pasar tidak akan kehabisan peluang di 570+ koin Binance!
                    </div>

                    <div className="p-2.5 rounded-lg bg-black/40 border border-white/5">
                      <span className="text-rose-300 font-bold block mb-0.5">🛑 3 Pertanyaan Wajib Sebelum Masuk Trade (Anti-Revenge):</span>
                      1. Apakah trade ini memiliki alasan konfluensi 5-agen atau hanya emosi ingin balik modal?<br />
                      2. Apakah hari ini saya sudah 2x terkena Stop Loss? (Jika ya, wajib tutup laptop).<br />
                      3. Apakah ukuran margin sudah dihitung tepat 2% toleransi risiko modal?
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-zinc-900/80 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
            <span>Terminal: <strong className="text-zinc-200">Grok Trencher v2.0 PRO</strong></span>
            <span className="font-mono text-amber-400/90">Institutional Risk Protocol</span>
          </div>
        </div>
      </div>
    </div>
  );
};
