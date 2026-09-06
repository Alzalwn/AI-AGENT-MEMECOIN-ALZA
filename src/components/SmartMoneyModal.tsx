'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  X,
  Zap,
  Check,
  AlertCircle,
  TrendingUp,
  Sliders,
  Plus,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Flame,
  Clock,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Copy
} from 'lucide-react';
import {
  TrackedWallet,
  WalletTransactionActivity,
  CopyTradingMasterConfig
} from '../types/smartMoney';
import {
  getTrackedWallets,
  saveTrackedWallets,
  getCopyTradeMasterConfig,
  saveCopyTradeMasterConfig,
  generateMockWhaleActivity
} from '../lib/smartMoney';
import { createJitoBundleReceipt } from '../lib/jito';
import { soundFx } from '../engine/audioEngine';

interface SmartMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogMessage?: (category: 'EXECUTION' | 'SYSTEM' | 'JITO', level: 'INFO' | 'WARN' | 'SUCCESS', msg: string) => void;
}

export default function SmartMoneyModal({
  isOpen,
  onClose,
  onLogMessage
}: SmartMoneyModalProps) {
  const [activeTab, setActiveTab] = useState<'feed' | 'wallets' | 'config' | 'add'>('feed');
  const [wallets, setWallets] = useState<TrackedWallet[]>([]);
  const [activities, setActivities] = useState<WalletTransactionActivity[]>([]);
  const [config, setConfig] = useState<CopyTradingMasterConfig>(getCopyTradeMasterConfig());
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  // New Wallet Form State
  const [newAddress, setNewAddress] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newCategory, setNewCategory] = useState<TrackedWallet['category']>('WHALE');
  const [newMultiplier, setNewMultiplier] = useState('1.0');
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    if (isOpen) {
      const loadedWallets = getTrackedWallets();
      setWallets(loadedWallets);
      setConfig(getCopyTradeMasterConfig());

      // Fetch initial activities
      fetch('/api/smart-money/activity')
        .then(res => res.json())
        .then(data => {
          if (data.success && Array.isArray(data.activities)) {
            setActivities(data.activities);
          }
        })
        .catch(() => {
          const fallback = [
            generateMockWhaleActivity(loadedWallets),
            generateMockWhaleActivity(loadedWallets),
            generateMockWhaleActivity(loadedWallets)
          ];
          setActivities(fallback);
        });
    }
  }, [isOpen]);

  // Live activity stream ticker
  useEffect(() => {
    if (!isOpen || wallets.length === 0) return;

    const interval = setInterval(() => {
      const newAct = generateMockWhaleActivity(wallets);
      setActivities(prev => [newAct, ...prev.slice(0, 24)]);

      // Auto-copy simulation if master is active
      if (config.isMasterEnabled && newAct.action === 'BUY' && newAct.copyTradeStatus === 'COPIED') {
        soundFx.playApproval();
        if (onLogMessage) {
          onLogMessage(
            'EXECUTION',
            'SUCCESS',
            `[COPY-TRADE] Auto-sniped ${newAct.tokenSymbol} following ${newAct.walletLabel} (${(config.baseBuyAmountSol * (wallets.find(w => w.id === newAct.walletId)?.copyMultiplier || 1)).toFixed(2)} SOL via Jito)`
          );
        }
      }
    }, 4500);

    return () => clearInterval(interval);
  }, [isOpen, wallets, config, onLogMessage]);

  if (!isOpen) return null;

  const handleToggleCopyTrading = (walletId: string) => {
    const updated = wallets.map(w => {
      if (w.id === walletId) {
        const next = !w.isCopyTradingActive;
        if (onLogMessage) {
          onLogMessage(
            'SYSTEM',
            next ? 'SUCCESS' : 'WARN',
            `${next ? 'Mengaktifkan' : 'Menonaktifkan'} Copy-Trading untuk ${w.label}`
          );
        }
        return { ...w, isCopyTradingActive: next };
      }
      return w;
    });
    setWallets(updated);
    saveTrackedWallets(updated);
  };

  const handleMultiplierChange = (walletId: string, multiplier: number) => {
    const updated = wallets.map(w => (w.id === walletId ? { ...w, copyMultiplier: multiplier } : w));
    setWallets(updated);
    saveTrackedWallets(updated);
  };

  const handleDeleteWallet = (walletId: string) => {
    const updated = wallets.filter(w => w.id !== walletId);
    setWallets(updated);
    saveTrackedWallets(updated);
  };

  const handleAddWallet = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const cleanAddr = newAddress.trim();
    if (!cleanAddr || cleanAddr.length < 32 || cleanAddr.length > 44) {
      setFormError('Alamat wallet Solana tidak valid (harus 32-44 karakter Base58).');
      return;
    }

    if (wallets.some(w => w.address.toLowerCase() === cleanAddr.toLowerCase())) {
      setFormError('Wallet ini sudah terdaftar di daftar pemantauan.');
      return;
    }

    const mult = parseFloat(newMultiplier) || 1.0;
    const newEntry: TrackedWallet = {
      id: `custom-w-${Date.now()}`,
      address: cleanAddr,
      label: newLabel.trim() || `Whale #${wallets.length + 1}`,
      category: newCategory,
      winRatePct: +(68 + Math.random() * 22).toFixed(1),
      totalPnlSol: +(12 + Math.random() * 85).toFixed(1),
      totalTradesCount: Math.floor(40 + Math.random() * 120),
      avgHoldTimeMin: Math.floor(5 + Math.random() * 30),
      isCopyTradingActive: true,
      copyMultiplier: mult,
      maxSolPerCopy: +(0.5 * mult).toFixed(2),
      addedAt: Date.now(),
      isPreset: false
    };

    const updated = [newEntry, ...wallets];
    setWallets(updated);
    saveTrackedWallets(updated);
    setFormSuccess(`Berhasil memantau ${newEntry.label}! Copy-trading langsung aktif.`);
    setNewAddress('');
    setNewLabel('');

    if (onLogMessage) {
      onLogMessage('SYSTEM', 'SUCCESS', `Menambahkan tracked insider wallet: ${newEntry.label}`);
    }
  };

  const handleSaveConfig = () => {
    saveCopyTradeMasterConfig(config);
    if (onLogMessage) {
      onLogMessage('SYSTEM', 'SUCCESS', `Konfigurasi Master Copy-Trading berhasil diperbarui.`);
    }
    soundFx.playApproval();
  };

  const handleInstantCopy = (act: WalletTransactionActivity) => {
    soundFx.playApproval();
    const bundle = createJitoBundleReceipt(
      {
        id: act.id,
        mint: act.tokenMint,
        symbol: act.tokenSymbol,
        name: act.tokenName,
        platform: 'Raydium',
        initialLpUsd: 50000,
        burntLiquidityPct: 100,
        mintAuthorityRevoked: true,
        freezeAuthorityRevoked: true,
        top10HolderPct: 12,
        volumeDelta15s: 15,
        uniqueBuyersCount: 20,
        narrativeCosineSim: 0.92,
        narrativeTheme: 'AI / AGENTIC',
        priceSol: act.priceSol,
        detectedAt: Date.now()
      },
      config.preferredJitoTipSol,
      284192500,
      'TOKYO'
    );

    if (onLogMessage) {
      onLogMessage(
        'JITO',
        'SUCCESS',
        `⚡ INSTANT COPY SNIPE: Meniru ${act.walletLabel} beli ${act.tokenSymbol} via Jito Bundle #${bundle.bundleId} (Tip: ${config.preferredJitoTipSol} SOL)`
      );
    }

    setActivities(prev =>
      prev.map(a => (a.id === act.id ? { ...a, copyTradeStatus: 'COPIED' as const } : a))
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(text);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-zinc-950 border border-zinc-800/90 rounded-2xl w-full max-w-3xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.9)] font-mono flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:px-6 border-b border-zinc-800 bg-zinc-900/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-black text-sm sm:text-base text-zinc-100 uppercase tracking-wider">
                  Smart Money & Insider Tracker
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  FASE D • COPY-TRADING
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Deteksi transaksi whale Solana & otomatis tiru beli via Jito Tokyo Sub-Slot
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-4 sm:px-6 pt-3 border-b border-zinc-800/80 bg-zinc-950 shrink-0 text-xs">
          <button
            onClick={() => setActiveTab('feed')}
            className={`px-3 py-2 rounded-t-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'feed'
                ? 'bg-zinc-900 text-emerald-400 border-t-2 border-emerald-400'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            Live Whale Feed ({activities.length})
          </button>

          <button
            onClick={() => setActiveTab('wallets')}
            className={`px-3 py-2 rounded-t-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'wallets'
                ? 'bg-zinc-900 text-cyan-400 border-t-2 border-cyan-400'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Tracked Wallets ({wallets.length})
          </button>

          <button
            onClick={() => setActiveTab('config')}
            className={`px-3 py-2 rounded-t-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'config'
                ? 'bg-zinc-900 text-amber-400 border-t-2 border-amber-400'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Copy Settings
          </button>

          <button
            onClick={() => setActiveTab('add')}
            className={`px-3 py-2 rounded-t-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'add'
                ? 'bg-zinc-900 text-emerald-400 border-t-2 border-emerald-400'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            + Tambah Wallet
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* TAB 1: LIVE FEED */}
          {activeTab === 'feed' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-400 pb-1">
                <span>Aliran transaksi real-time dompet whale terpantau:</span>
                <span className="text-emerald-400 text-[11px] flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  Auto-Stream Active
                </span>
              </div>

              <div className="space-y-2">
                {activities.map(act => {
                  const isBuy = act.action === 'BUY';
                  return (
                    <div
                      key={act.id}
                      className="p-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800/80 hover:border-zinc-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border font-black text-sm ${
                            isBuy
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                          }`}
                        >
                          {isBuy ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-zinc-100">{act.walletLabel}</span>
                            <span
                              onClick={() => copyToClipboard(act.walletAddress)}
                              className="text-[10px] text-zinc-500 font-mono hover:text-zinc-300 cursor-pointer flex items-center gap-1"
                              title="Klik untuk salin alamat"
                            >
                              {act.walletAddress.slice(0, 4)}...{act.walletAddress.slice(-4)}
                              {copiedAddress === act.walletAddress ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                            </span>
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded font-black ${
                                isBuy ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                              }`}
                            >
                              {act.action}
                            </span>
                          </div>

                          <div className="text-[11px] text-zinc-300 flex items-center gap-2 flex-wrap">
                            <span className="font-black text-zinc-100">{act.tokenSymbol}</span>
                            <span className="text-zinc-500">({act.tokenName})</span>
                            <span className="text-emerald-400 font-bold">{act.amountSol} SOL</span>
                            {act.profitEstimatePct && (
                              <span className="text-emerald-400 font-bold text-[10px]">
                                (+{act.profitEstimatePct}% Profit)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right Action */}
                      <div className="flex items-center gap-2 justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800">
                        {act.copyTradeStatus === 'COPIED' ? (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                            <Check className="w-3 h-3" /> Auto-Copied
                          </span>
                        ) : isBuy ? (
                          <button
                            onClick={() => handleInstantCopy(act)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/40 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                          >
                            <Zap className="w-3.5 h-3.5" /> Instant Copy
                          </button>
                        ) : (
                          <span className="text-[10px] text-zinc-500">Whale Dumped</span>
                        )}

                        <a
                          href={`https://solscan.io/tx/${act.txSignature}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
                          title="Lihat di Solscan"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: TRACKED WALLETS */}
          {activeTab === 'wallets' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-400 pb-1">
                <span>Daftar insider & whale yang sedang dipantau terminal:</span>
                <span className="text-zinc-300 font-bold">{wallets.filter(w => w.isCopyTradingActive).length} Aktif Copy-Trading</span>
              </div>

              <div className="space-y-2.5">
                {wallets.map(w => (
                  <div
                    key={w.id}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                      w.isCopyTradingActive
                        ? 'bg-zinc-900/80 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.08)]'
                        : 'bg-zinc-900/40 border-zinc-800/80 opacity-70'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-zinc-100 text-sm">{w.label}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                          {w.category}
                        </span>
                        {w.isPreset && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                            Verified Alpha
                          </span>
                        )}
                      </div>

                      <div
                        onClick={() => copyToClipboard(w.address)}
                        className="text-[10px] text-zinc-500 font-mono hover:text-zinc-300 cursor-pointer flex items-center gap-1"
                        title="Klik untuk salin alamat"
                      >
                        <code>{w.address}</code>
                        {copiedAddress === w.address ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-zinc-400 pt-1 flex-wrap">
                        <span>Win Rate: <strong className="text-emerald-400">{w.winRatePct}%</strong></span>
                        <span>PnL: <strong className="text-emerald-400">+{w.totalPnlSol} SOL</strong></span>
                        <span>Trades: <strong>{w.totalTradesCount}</strong></span>
                        <span>Avg Hold: <strong>{w.avgHoldTimeMin}m</strong></span>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-3 justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-zinc-500">Mult:</span>
                        <select
                          value={w.copyMultiplier}
                          onChange={e => handleMultiplierChange(w.id, parseFloat(e.target.value))}
                          className="bg-zinc-800 border border-zinc-700 rounded px-1.5 py-0.5 text-xs text-zinc-200 font-mono focus:outline-none"
                        >
                          <option value="0.25">0.25x</option>
                          <option value="0.5">0.5x</option>
                          <option value="1.0">1.0x</option>
                          <option value="1.5">1.5x</option>
                          <option value="2.0">2.0x</option>
                        </select>
                      </div>

                      <button
                        onClick={() => handleToggleCopyTrading(w.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          w.isCopyTradingActive
                            ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                            : 'bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {w.isCopyTradingActive ? 'COPY ACTIVE' : 'MUTED'}
                      </button>

                      {!w.isPreset && (
                        <button
                          onClick={() => handleDeleteWallet(w.id)}
                          className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors cursor-pointer"
                          title="Hapus wallet ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: CONFIGURATION */}
          {activeTab === 'config' && (
            <div className="space-y-4 max-w-lg">
              <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-zinc-200 block">Master Copy-Trading Engine</span>
                    <span className="text-[10px] text-zinc-500">Aktifkan eksekusi otomatis ketika whale membuka posisi</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.isMasterEnabled}
                      onChange={e => setConfig({ ...config, isMasterEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 border border-zinc-700"></div>
                  </label>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-[11px] text-zinc-400 font-bold block mb-1">
                    Base Buy Amount per Copy (SOL)
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0.05"
                    value={config.baseBuyAmountSol}
                    onChange={e => setConfig({ ...config, baseBuyAmountSol: parseFloat(e.target.value) || 0.1 })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 font-mono focus:outline-none focus:border-emerald-400"
                  />
                  <span className="text-[10px] text-zinc-500 mt-0.5 block">
                    Total beli = Base Buy × Multiplier dompet whale masing-masing
                  </span>
                </div>

                <div>
                  <label className="text-[11px] text-zinc-400 font-bold block mb-1">
                    Max Toleransi Slippage (%)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={config.maxSlippagePct}
                    onChange={e => setConfig({ ...config, maxSlippagePct: parseFloat(e.target.value) || 2.5 })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 font-mono focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-zinc-400 font-bold block mb-1">
                    Jito MEV Tip per Copy Trade (SOL)
                  </label>
                  <select
                    value={config.preferredJitoTipSol}
                    onChange={e => setConfig({ ...config, preferredJitoTipSol: parseFloat(e.target.value) })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 font-mono focus:outline-none focus:border-emerald-400"
                  >
                    <option value="0.0001">0.0001 SOL (Economy)</option>
                    <option value="0.0005">0.0005 SOL (Standard)</option>
                    <option value="0.001">0.0010 SOL (Fast Front-run)</option>
                    <option value="0.002">0.0020 SOL (Turbo Sub-slot)</option>
                  </select>
                </div>

                <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-zinc-200 block">Auto-Sell Saat Whale Jual</span>
                    <span className="text-[10px] text-zinc-500">Otomatis jual posisi saat mendeteksi transaksi sell dari whale</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={config.autoSellWhenWhaleSells}
                      onChange={e => setConfig({ ...config, autoSellWhenWhaleSells: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500 border border-zinc-700"></div>
                  </label>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleSaveConfig}
                    className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black rounded-lg text-xs transition-all cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                  >
                    Simpan Konfigurasi Copy-Trading
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ADD WALLET */}
          {activeTab === 'add' && (
            <form onSubmit={handleAddWallet} className="space-y-3 max-w-lg">
              <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 text-xs text-zinc-400 leading-relaxed">
                Tambahkan alamat wallet Solana (KOL, Dev, atau Whale) yang ingin Anda ikuti pergerakannya secara otomatis.
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <label className="text-[11px] text-zinc-400 font-bold block mb-1">
                    Solana Wallet Address (Base58)
                  </label>
                  <input
                    type="text"
                    placeholder="misal: 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
                    value={newAddress}
                    onChange={e => setNewAddress(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 font-mono focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-zinc-400 font-bold block mb-1">
                    Label / Nama Pengenal
                  </label>
                  <input
                    type="text"
                    placeholder="misal: Insider Dev Swarm #3"
                    value={newLabel}
                    onChange={e => setNewLabel(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 font-mono focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-zinc-400 font-bold block mb-1">
                      Kategori
                    </label>
                    <select
                      value={newCategory}
                      onChange={e => setNewCategory(e.target.value as any)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 font-mono focus:outline-none"
                    >
                      <option value="WHALE">Whale Trader</option>
                      <option value="INSIDER_DEV">Insider Developer</option>
                      <option value="KOL_SNIPER">KOL / Influencer Sniper</option>
                      <option value="EARLY_ACCUMULATOR">Early Accumulator</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] text-zinc-400 font-bold block mb-1">
                      Copy Multiplier
                    </label>
                    <select
                      value={newMultiplier}
                      onChange={e => setNewMultiplier(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 font-mono focus:outline-none"
                    >
                      <option value="0.5">0.5x (Safe)</option>
                      <option value="1.0">1.0x (Standard)</option>
                      <option value="1.5">1.5x (Aggressive)</option>
                      <option value="2.0">2.0x (Heavy)</option>
                    </select>
                  </div>
                </div>

                {formError && (
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {formSuccess && (
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>{formSuccess}</span>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-black rounded-lg text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Mulai Pantau &amp; Aktifkan Copy-Trading
                  </button>
                </div>
              </div>
            </form>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:px-6 border-t border-zinc-800 bg-zinc-900/40 flex items-center justify-between text-[11px] text-zinc-500 shrink-0">
          <span>Jito Tokyo Sub-Slot: Copy-trade dilindungi dari sandwich attack</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-all cursor-pointer"
          >
            Tutup
          </button>
        </div>

      </div>
    </div>
  );
}
