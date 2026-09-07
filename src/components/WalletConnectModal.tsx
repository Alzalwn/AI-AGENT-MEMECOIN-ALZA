'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Wallet, ShieldCheck, Zap, Check, X, ExternalLink, AlertTriangle, Radio, RefreshCw, Smartphone } from 'lucide-react';
import { WalletState } from '../types/terminal';
import { JITO_TIP_ACCOUNTS } from '../config/constants';
import { rpcFailoverInstance } from '../lib/rpcFailover';

interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletState: WalletState;
  onUpdateWallet: (state: WalletState) => void;
  selectedTipTier: 'ECONOMY' | 'STANDARD' | 'FAST' | 'TURBO';
  onSelectTipTier: (tier: 'ECONOMY' | 'STANDARD' | 'FAST' | 'TURBO') => void;
}

export default function WalletConnectModal({
  isOpen,
  onClose,
  walletState,
  onUpdateWallet,
  selectedTipTier,
  onSelectTipTier,
}: WalletConnectModalProps) {
  const [selectedTipAccount, setSelectedTipAccount] = useState<string>(JITO_TIP_ACCOUNTS[0]);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Helper to fetch balance using server API first (no CORS), then public RPCs as fallback
  const fetchSolBalance = useCallback(async (fullKey: string): Promise<number | null> => {
    // Strategy 1: Dedicated Server API (high-speed, no browser CORS, server-side failover)
    try {
      const res = await fetch(`/api/wallet/balance?address=${encodeURIComponent(fullKey)}`, {
        signal: AbortSignal.timeout(6000)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && typeof data.balanceSol === 'number') {
          return data.balanceSol;
        }
      }
    } catch (e) {
      console.warn('Backend balance API failed, attempting direct public RPC fallback:', e);
    }

    // Strategy 2: Direct public RPC fallback
    const rpcUrls = [
      rpcFailoverInstance.getActiveEndpoint().url,
      'https://solana-rpc.publicnode.com',
      'https://api.mainnet-beta.solana.com'
    ];

    for (const url of rpcUrls) {
      try {
        const balRes = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getBalance',
            params: [fullKey]
          }),
          signal: AbortSignal.timeout(5000)
        });
        if (!balRes.ok) continue;
        const balData = await balRes.json();
        if (balData.result?.value !== undefined) {
          return +(Number(balData.result.value) / 1e9).toFixed(4);
        }
      } catch {
        continue;
      }
    }

    return null;
  }, []);

  // Helper to resolve the active full public key from state or window provider
  const getFullPublicKey = useCallback((): string | null => {
    if (walletState.fullPublicKey) return walletState.fullPublicKey;
    if (typeof window !== 'undefined') {
      const phantom = (window as any).phantom?.solana || (window as any).solana;
      if (phantom?.publicKey) return phantom.publicKey.toString();
      const solflare = (window as any).solflare;
      if (solflare?.publicKey) return solflare.publicKey.toString();
      const backpack = (window as any).backpack;
      if (backpack?.publicKey) return backpack.publicKey.toString();
    }
    return null;
  }, [walletState.fullPublicKey]);

  // Refresh balance on modal open or when requested
  const refreshBalance = useCallback(async () => {
    const fullKey = getFullPublicKey();
    if (!fullKey) return;

    setIsRefreshing(true);
    try {
      const balance = await fetchSolBalance(fullKey);
      if (balance !== null) {
        onUpdateWallet({
          ...walletState,
          isConnected: true,
          fullPublicKey: fullKey,
          publicKey: walletState.publicKey || `${fullKey.slice(0, 4)}...${fullKey.slice(-4)}`,
          balanceSol: balance,
          mode: 'LIVE_ON_CHAIN'
        });
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [getFullPublicKey, fetchSolBalance, onUpdateWallet, walletState]);

  // Auto-fetch balance when modal opens while wallet is connected
  useEffect(() => {
    if (isOpen && walletState.isConnected) {
      refreshBalance();
    }
  }, [isOpen, walletState.isConnected]);

  const handleConnect = async (walletName: 'Phantom' | 'Solflare' | 'Backpack') => {
    setIsConnecting(true);
    try {
      if (typeof window !== 'undefined') {
        let provider: any = null;
        if (walletName === 'Phantom') {
          provider =
            (window as any).phantom?.solana ||
            ((window as any).solana?.isPhantom ? (window as any).solana : (window as any).solana);
        } else if (walletName === 'Solflare') {
          provider = (window as any).solflare;
        } else if (walletName === 'Backpack') {
          provider = (window as any).backpack;
        }

        if (provider) {
          try {
            const resp = await provider.connect();
            const pubKey = resp?.publicKey ? resp.publicKey.toString() : provider.publicKey?.toString();
            if (pubKey) {
              const balance = await fetchSolBalance(pubKey);

              onUpdateWallet({
                isConnected: true,
                publicKey: `${pubKey.slice(0, 4)}...${pubKey.slice(-4)}`,
                fullPublicKey: pubKey,
                balanceSol: balance ?? 0,
                walletName,
                mode: 'LIVE_ON_CHAIN',
              });
              setIsConnecting(false);
              onClose();
              return;
            }
          } catch (err: any) {
            console.warn(`Real wallet ${walletName} connection cancelled or failed:`, err);
          }
        }
      }

      // Check if mobile device and redirect to official app deep link
      if (typeof window !== 'undefined') {
        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        const currentUrl = window.location.href;

        if (isMobile) {
          if (walletName === 'Phantom') {
            window.location.href = `https://phantom.app/ul/browse/${encodeURIComponent(currentUrl)}`;
            return;
          } else if (walletName === 'Solflare') {
            window.location.href = `https://solflare.com/ul/v1/browse/${encodeURIComponent(currentUrl)}`;
            return;
          }
        }
      }

      // Wallet extension not installed
      console.warn(`${walletName} extension not detected. Please install it from the official website.`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    if (typeof window !== 'undefined') {
      try {
        const sol = (window as any).phantom?.solana || (window as any).solana;
        if (sol?.disconnect) sol.disconnect();
      } catch (e) {}
    }
    onUpdateWallet({
      isConnected: false,
      publicKey: null,
      fullPublicKey: null,
      balanceSol: 0,
      walletName: null,
      mode: 'PAPER_TRADING',
    });
  };

  const tipTiers = [
    { id: 'ECONOMY', name: 'Economy', tip: '0.00005 SOL', speed: '~65ms', badge: 'Normal' },
    { id: 'STANDARD', name: 'Standard', tip: '0.00010 SOL', speed: '~25ms', badge: 'PRD' },
    { id: 'FAST', name: 'Fast MEV', tip: '0.00050 SOL', speed: '~15ms', badge: 'Priority' },
    { id: 'TURBO', name: 'TURBO', tip: '0.00200 SOL', speed: '< 8ms', badge: '🔥 Live Sniper' },
    { id: 'ULTRA_DEGEN', name: 'Ultra Degen', tip: '0.00500 SOL', speed: '< 5ms', badge: '⚡ Sub-Slot' },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-200 font-mono select-none">
      <div className="bg-terminal-panel border border-terminal-border rounded-2xl w-full max-w-lg shadow-2xl p-5 space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-terminal-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-terminal-cyan/10 border border-terminal-cyan/40 text-terminal-cyan">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-terminal-text uppercase tracking-wider flex items-center gap-2">
                Solana Wallet &amp; Jito MEV Execution
              </h2>
              <p className="text-[11px] text-terminal-muted">
                Koneksi Dompet Web3 &amp; Manajemen Jalur Private Bundle
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-terminal-card text-terminal-muted hover:text-terminal-text transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dual Mode Switcher */}
        <div className="space-y-1.5">
          <span className="text-[10px] text-terminal-muted uppercase font-bold block">Mode Eksekusi:</span>
          <div className="grid grid-cols-2 gap-2 bg-terminal-card p-1 rounded-xl border border-terminal-border">
            <button
              onClick={() => onUpdateWallet({ ...walletState, mode: 'PAPER_TRADING' })}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                walletState.mode === 'PAPER_TRADING'
                  ? 'bg-terminal-green text-terminal-bg font-black shadow-[0_0_10px_rgba(13,242,137,0.3)]'
                  : 'text-terminal-muted hover:text-terminal-text'
              }`}
            >
              <ShieldCheck className="w-4 h-4" /> Paper Trading (Aman)
            </button>
            <button
              onClick={() => onUpdateWallet({ ...walletState, mode: 'LIVE_ON_CHAIN' })}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                walletState.mode === 'LIVE_ON_CHAIN'
                  ? 'bg-terminal-red text-terminal-bg font-black shadow-[0_0_10px_rgba(229,72,77,0.3)]'
                  : 'text-terminal-muted hover:text-terminal-text'
              }`}
            >
              <Zap className="w-4 h-4" /> Live On-Chain (Jito)
            </button>
          </div>
        </div>

        {/* Wallet Status or Selector */}
        {walletState.isConnected ? (
          <div className="p-3.5 rounded-xl bg-terminal-card border border-terminal-green/50 border-glow-green space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-terminal-green animate-pulse" />
                <span className="font-bold text-sm text-terminal-text">{walletState.walletName} Connected</span>
              </div>
              <button
                onClick={handleDisconnect}
                className="text-[10px] text-terminal-red hover:underline cursor-pointer"
              >
                Disconnect
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-terminal-border/60 text-xs">
              <div>
                <span className="text-[10px] text-terminal-muted block">PUBLIC KEY</span>
                <span className="font-mono text-terminal-cyan" title={walletState.fullPublicKey || walletState.publicKey || ''}>
                  {walletState.publicKey}
                </span>
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-terminal-muted block">RPC BALANCE</span>
                    {walletState.isBalanceLive && (
                      <span className="flex items-center gap-1 text-[8px] font-bold text-terminal-green bg-terminal-green/10 border border-terminal-green/30 px-1 py-0.2 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-terminal-green animate-ping" />
                        LIVE
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={refreshBalance}
                    disabled={isRefreshing}
                    title="Perbarui Saldo dari Blockchain"
                    className="flex items-center gap-1 text-[10px] text-terminal-cyan hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-2.5 h-2.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span className="text-[9px] font-bold">{isRefreshing ? 'Syncing...' : 'Sync'}</span>
                  </button>
                </div>
                <span
                  className={`font-bold transition-all duration-300 block ${
                    walletState.balanceFlashState === 'up'
                      ? 'text-emerald-400 scale-105 inline-block drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                      : walletState.balanceFlashState === 'down'
                      ? 'text-rose-400 scale-105 inline-block drop-shadow-[0_0_8px_rgba(244,63,94,0.8)]'
                      : 'text-terminal-green'
                  }`}
                >
                  {walletState.balanceSol < 1 && walletState.balanceSol > 0
                    ? walletState.balanceSol.toFixed(4)
                    : walletState.balanceSol.toFixed(2)} SOL
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <span className="text-[10px] text-terminal-muted uppercase font-bold block">Pilih Dompet:</span>
            <div className="grid grid-cols-3 gap-2">
              {(['Phantom', 'Solflare', 'Backpack'] as const).map((name) => (
                <button
                  key={name}
                  onClick={() => handleConnect(name)}
                  disabled={isConnecting}
                  className="p-3 rounded-xl bg-terminal-card hover:bg-terminal-card/80 border border-terminal-border hover:border-terminal-cyan transition-all text-center cursor-pointer space-y-1 text-xs font-bold text-terminal-text flex flex-col items-center justify-center"
                >
                  <Wallet className="w-5 h-5 text-terminal-cyan" />
                  <span>{name}</span>
                </button>
              ))}
            </div>

            {/* Mobile Wallet Helper Banner */}
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30 text-[11px] space-y-1.5">
              <div className="flex items-center gap-1.5 text-purple-300 font-bold text-[11px]">
                <Smartphone className="w-3.5 h-3.5" />
                <span>Pengguna HP / Smartphone:</span>
              </div>
              <p className="text-[10px] text-zinc-400 leading-relaxed">
                Jika membuka lewat Chrome/Safari di HP, klik tombol di bawah untuk membuka langsung di <strong>Aplikasi Phantom HP</strong> agar wallet otomatis terhubung:
              </p>
              <a
                href={`https://phantom.app/ul/browse/${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : 'https://alzasniped.my.id')}`}
                className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] transition-all text-center cursor-pointer shadow-sm"
              >
                <span>Buka di Aplikasi Phantom HP</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        {/* Jito Dynamic Tip Tier Selector */}
        <div className="space-y-2 pt-1 border-t border-terminal-border">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-terminal-muted uppercase font-bold">
              Jito Dynamic Validator Tip Tier:
            </span>
            <span className="text-[9px] text-terminal-cyan font-mono">0% Sandwich Slippage</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
            {tipTiers.map((tier) => {
              const isSelected = selectedTipTier === tier.id;
              return (
                <div
                  key={tier.id}
                  onClick={() => onSelectTipTier(tier.id as any)}
                  className={`p-2 rounded-lg border text-center transition-all cursor-pointer space-y-0.5 ${
                    isSelected
                      ? 'bg-terminal-card border-terminal-cyan text-terminal-cyan shadow-[0_0_8px_rgba(0,240,255,0.2)]'
                      : 'bg-terminal-card/50 border-terminal-border hover:border-terminal-border-active text-terminal-muted'
                  }`}
                >
                  <span className="font-bold text-[10px] block truncate">{tier.name}</span>
                  <span className="text-[9px] font-mono block text-terminal-text">{tier.tip}</span>
                  <span className={`text-[8px] font-bold block ${isSelected ? 'text-terminal-cyan' : 'text-zinc-500'}`}>
                    {tier.badge}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Jito Block Engine Regional Router */}
        <div className="p-2.5 bg-terminal-card rounded-lg border border-terminal-border text-[10px] space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-terminal-muted font-bold">Jito Block Engine (Low Latency):</span>
            <span className="text-terminal-green font-bold text-[9px] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-terminal-green animate-pulse" />
              🇯🇵 Tokyo (Asia Sub-60ms)
            </span>
          </div>
          <div className="flex justify-between text-terminal-muted text-[9px]">
            <span>Tip Relayer Account:</span>
            <span className="text-terminal-cyan font-mono truncate max-w-[170px]">{selectedTipAccount}</span>
          </div>
          <p className="text-[9px] text-terminal-muted leading-relaxed">
            Private bundle rute langsung ke validator Solana Tokyo &amp; Frankfurt tanpa mempool publik (0% frontrun leak).
          </p>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-terminal-border flex items-center justify-between text-[11px]">
          <span className="text-terminal-muted text-[10px]">Relayer: tokyo.mainnet.block-engine.jito.wtf</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-terminal-card hover:bg-terminal-card/80 border border-terminal-border rounded-lg text-terminal-text transition-colors cursor-pointer font-bold"
          >
            Selesai
          </button>
        </div>

      </div>
    </div>
  );
}
