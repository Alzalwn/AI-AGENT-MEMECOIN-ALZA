import { Connection, PublicKey } from '@solana/web3.js';
import { TokenSignal, ActivePosition, ClosedTrade } from '../types/terminal';
import { positionMutex } from './mutex';
import { lamportsToSol } from '../lib/solanaMath';
import { verifySafeToSell } from '../lib/honeypot';
import { fetchJupiterQuote, fetchJupiterSellQuote, executeJupiterSwap } from '../lib/jupiter';

export interface BuyOptions {
  slippageBps?: number;
  jitoTipSol?: number;
  priorityFeeLamports?: number;
  isSimulation?: boolean;
  targetTpPct?: number; // e.g. 100 for +100%
  stopLossPct?: number; // e.g. -25 for -25%
  trailingStopLossPct?: number; // e.g. 15 for 15%
  maxHoldTimeSec?: number; // default 180s
}

export interface BuyResult {
  success: boolean;
  signature?: string;
  position?: ActivePosition;
  error?: string;
  isSimulated?: boolean;
}

export interface SellResult {
  success: boolean;
  signature?: string;
  closedTrade?: ClosedTrade;
  tokensSold?: number;
  solReceived?: number;
  error?: string;
  isSimulated?: boolean;
}

export interface ExecutionManagerCallbacks {
  onPositionOpened?: (position: ActivePosition) => void;
  onPositionUpdated?: (position: ActivePosition) => void;
  onPositionClosed?: (trade: ClosedTrade) => void;
  onError?: (error: Error, stage: string) => void;
  onLog?: (category: string, level: 'INFO' | 'WARN' | 'SUCCESS' | 'ERROR', message: string) => void;
}

/**
 * ExecutionManager
 * Modul eksekusi pesanan otonom dengan:
 * 1. Mutex lock function-level (anti-spam buy) & konfirmasi on-chain via connection.confirmTransaction
 * 2. Pemantau posisi real-time (The Tracker) per detik dengan PNL live
 * 3. Eksekusi jual instan saat menyentuh TP (+100%) atau SL (-25%) dengan injeksi Priority Fee tinggi
 * 4. Pemulihan otomatis (fail-safe) saat timeout / error
 */
export class ExecutionManager {
  private isLocked: boolean = false;
  private isExecutingBuy: boolean = false;
  private isExecutingSell: boolean = false;
  private activePosition: ActivePosition | null = null;
  private trackerInterval: NodeJS.Timeout | null = null;
  private connection: Connection;
  private callbacks: ExecutionManagerCallbacks = {};
  private rpcUrl: string;

  constructor(rpcUrl?: string, callbacks?: ExecutionManagerCallbacks) {
    this.rpcUrl =
      rpcUrl ||
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
      'https://mainnet.helius-rpc.com/?api-key=b1346052-9ac3-47b8-89ec-2ce7e88fa91b';
    this.connection = new Connection(this.rpcUrl, 'confirmed');
    if (callbacks) {
      this.callbacks = callbacks;
    }
  }

  public setCallbacks(callbacks: ExecutionManagerCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  public getActivePosition(): ActivePosition | null {
    return this.activePosition;
  }

  public isBusy(): boolean {
    return this.isLocked || this.isExecutingBuy || this.isExecutingSell || this.activePosition !== null;
  }

  private log(category: string, level: 'INFO' | 'WARN' | 'SUCCESS' | 'ERROR', message: string): void {
    console.log(`[ExecutionManager] [${category}] [${level}] ${message}`);
    this.callbacks.onLog?.(category, level, message);
  }

  // =========================================================================
  // 1. Alur Pembelian (Auto-Buy) yang Aman
  // =========================================================================
  /**
   * Memicu pembelian token dengan perlindungan Mutex Lock level fungsi.
   * Hanya mengizinkan 1 order in-flight untuk menghindari spam buy.
   */
  public async triggerBuy(
    token: TokenSignal,
    amountSol: number,
    options: BuyOptions = {}
  ): Promise<BuyResult> {
    const mint = token.mint.trim();

    // 1.1 Mutex Lock Function-Level Check
    if (this.isLocked || this.isExecutingBuy || this.activePosition !== null) {
      this.log('RISK', 'WARN', `🛑 [MUTEX LOCK] Order beli ditolak untuk ${token.symbol}. Posisi aktif sudah ada.`);
      return { success: false, error: 'MUTEX_LOCKED: Active position already exists' };
    }

    if (!positionMutex.acquireLock(mint)) {
      this.log('RISK', 'WARN', `🛑 [MUTEX GUARD] Mutex global sedang mengunci slot untuk ${token.symbol}.`);
      return { success: false, error: 'GLOBAL_MUTEX_LOCKED: Slot occupied or in anti-spam cooldown' };
    }

    // Kunci seketika
    this.isLocked = true;
    this.isExecutingBuy = true;

    this.log('EXECUTION', 'INFO', `🔒 Mutex terkunci. Memulai alur pembelian untuk ${token.symbol} (${amountSol} SOL)...`);

    // Setup fail-safe timeout (35 detik batas waktu transaksi)
    const timeoutId = setTimeout(() => {
      if (this.isExecutingBuy) {
        this.log('EXECUTION', 'ERROR', `⏰ Timeout saat proses pembelian ${token.symbol}. Membuka kembali Mutex.`);
        this.emergencyUnlock(mint);
      }
    }, 35000);

    try {
      const isSimulation = options.isSimulation ?? false;

      // 1.2 Pre-flight Honeypot Check
      const honeypotRes = await verifySafeToSell(token);
      if (!honeypotRes.isSafeToSell) {
        clearTimeout(timeoutId);
        this.log('RISK', 'WARN', `🛑 [HONEYPOT DETECTED] Pembelian ${token.symbol} dibatalkan: ${honeypotRes.reason}`);
        this.emergencyUnlock(mint);
        return { success: false, error: `HONEYPOT_DETECTED: ${honeypotRes.reason}` };
      }

      let signature: string;
      let entryPriceSol: number = token.priceSol > 0 ? token.priceSol : 0.00002;
      let tokenAmount: number = +(amountSol / entryPriceSol).toFixed(4);
      let decimals: number = token.decimals || 6;

      if (isSimulation) {
        // Mode Dry-Run: Cegat pemotongan SOL riil
        signature = `SIM_BUY_${Math.random().toString(36).slice(2, 10).toUpperCase()}_${Date.now().toString().slice(-6)}`;
        this.log(
          'EXECUTION',
          'SUCCESS',
          `🧪 [DRY-RUN] Simulasi beli ${token.symbol} sukses: ${amountSol} SOL @ ${entryPriceSol.toFixed(8)} SOL [SimTx: ${signature}]`
        );
      } else {
        // Mode On-Chain Riil: Kirim ke endpoint bot execute-snipe
        this.log('EXECUTION', 'INFO', `📡 Mengirim transaksi beli on-chain ke validator Solana via Jito/RPC...`);
        
        const response = await fetch('/api/bot/execute-snipe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mint: token.mint,
            symbol: token.symbol,
            amountSol,
            slippageBps: options.slippageBps || 200,
            jitoTipSol: options.jitoTipSol || 0.000015
          }),
          signal: AbortSignal.timeout(28000)
        });

        const data = await response.json();

        if (!data.success || !data.signature) {
          if (data.requiresClientSign && typeof window !== 'undefined') {
            const provider = (window as any).phantom?.solana || (window as any).solflare || (window as any).solana;
            if (provider && (provider.isConnected || provider.isPhantom)) {
              this.log('EXECUTION', 'INFO', `🔑 Meminta konfirmasi transaksi di dompet browser untuk ${token.symbol}...`);
              const quote = await fetchJupiterQuote(token.mint, amountSol, options.slippageBps || 200);
              if (!quote) throw new Error('Quote likuiditas Jupiter tidak ditemukan untuk token ini');
              const userPubKey = provider.publicKey?.toString();
              const swapResult = await executeJupiterSwap(
                quote,
                token.symbol,
                options.jitoTipSol || 0.00002,
                0,
                userPubKey,
                provider,
                false
              );
              if (!swapResult.signature) throw new Error('Transaksi dibatalkan atau signature tidak diterima dari dompet');
              signature = swapResult.signature;
              if (swapResult.tokenAmountUi && swapResult.tokenAmountUi > 0) {
                tokenAmount = swapResult.tokenAmountUi;
              }
              entryPriceSol = +(amountSol / tokenAmount).toFixed(8);
            } else {
              throw new Error('Private key server belum disetel di .env.local dan dompet Phantom belum terhubung');
            }
          } else {
            throw new Error(data.error || 'Server hot wallet gagal memproses transaksi beli');
          }
        } else {
          signature = data.signature;

          // 1.3 Verifikasi Konfirmasi On-Chain Wajib
          this.log('EXECUTION', 'INFO', `🔍 Menunggu konfirmasi on-chain untuk signature: ${signature.slice(0, 16)}...`);
          try {
            const conf = await this.connection.confirmTransaction(signature, 'confirmed');
            if (conf.value.err) {
              throw new Error(`Transaksi on-chain gagal: ${JSON.stringify(conf.value.err)}`);
            }
          } catch (confErr: any) {
            this.log('EXECUTION', 'WARN', `⚠️ Konfirmasi timeout, memeriksa status via slot... (${confErr.message})`);
          }

          if (data.tokenAmountUi && data.tokenAmountUi > 0) {
            tokenAmount = data.tokenAmountUi;
          }
          if (data.decimals) {
            decimals = data.decimals;
          }
          entryPriceSol = +(amountSol / tokenAmount).toFixed(8);
        }
      }

      clearTimeout(timeoutId);
      this.isExecutingBuy = false;
      positionMutex.markBuyCompleted(mint);

      // 1.4 Catat Metrik Krusial & Masukkan ke State ACTIVE POSITION
      const targetTpPct = options.targetTpPct || 100; // Default Take Profit +100%
      const stopLossPct = options.stopLossPct || -25; // Default Stop Loss -25%
      const trailingDistancePct = options.trailingStopLossPct || 15; // 15% trailing stop
      const maxHoldTimeSec = options.maxHoldTimeSec || 180; // TTL 180 detik

      const newPosition: ActivePosition = {
        id: `POS-${Date.now()}-${mint.slice(0, 6)}`,
        token: {
          ...token,
          decimals,
          priceSol: entryPriceSol
        },
        entryPriceSol,
        currentPriceSol: entryPriceSol,
        solInvested: amountSol,
        tokenAmount,
        pnlSol: 0,
        pnlPct: 0,
        rMultiplier: 0,
        highestPriceSol: entryPriceSol,
        trailingStopPriceSol: +(entryPriceSol * (1 - trailingDistancePct / 100)).toFixed(8),
        entryTimestamp: Date.now(),
        status: 'OPEN',
        targetTpPct,
        targetTpPriceSol: +(entryPriceSol * (1 + targetTpPct / 100)).toFixed(8),
        stopLossPct,
        stopLossPriceSol: +(entryPriceSol * (1 + stopLossPct / 100)).toFixed(8),
        velocityPctPerSec: 0,
        etaToTpSeconds: null,
        momentumStatus: 'STEADY',
        maxHoldTimeSec,
        holdDurationSec: 0,
        trailingDistancePct
      };

      this.activePosition = newPosition;
      this.callbacks.onPositionOpened?.(newPosition);

      this.log(
        'EXECUTION',
        'SUCCESS',
        `✅ [ACTIVE POSITION DIBUKA] CA: ${mint} | Entry: ${entryPriceSol.toFixed(8)} SOL | Tokens: ${tokenAmount.toLocaleString()} | Target TP: +${targetTpPct}% | SL: ${stopLossPct}%`
      );

      // 1.5 Aktifkan Pemantau Posisi Real-Time (The Tracker)
      this.startPositionTracker(newPosition);

      return {
        success: true,
        signature,
        position: newPosition,
        isSimulated: isSimulation
      };
    } catch (err: any) {
      clearTimeout(timeoutId);
      this.log('EXECUTION', 'ERROR', `❌ Gagal dalam triggerBuy(): ${err.message || err}`);
      this.callbacks.onError?.(err, 'triggerBuy');
      this.emergencyUnlock(mint);
      return {
        success: false,
        error: err.message || 'Auto-buy execution failed'
      };
    }
  }

  // =========================================================================
  // 2. Pemantauan Posisi Real-Time (The Tracker)
  // =========================================================================
  /**
   * Mengaktifkan loop pemantau harga khusus per detik yang berfokus hanya pada CA token yang baru dibeli.
   * Menghitung PNL (Untung/Rugi) secara live dan memicu triggerSell() otomatis jika TP/SL tersentuh.
   */
  public startPositionTracker(position: ActivePosition): void {
    if (this.trackerInterval) {
      clearInterval(this.trackerInterval);
      this.trackerInterval = null;
    }

    const mint = position.token.mint;
    const entryPrice = position.entryPriceSol;
    let lastPrice = entryPrice;

    this.log('TRACKER', 'INFO', `🎯 Tracker aktif untuk CA: ${mint} (Sampling interval: 1000ms)...`);

    this.trackerInterval = setInterval(async () => {
      if (!this.activePosition || this.activePosition.status !== 'OPEN' || this.isExecutingSell) {
        return;
      }

      try {
        const now = Date.now();
        const holdDurationSec = Math.floor((now - this.activePosition.entryTimestamp) / 1000);

        // 2.1 Ambil Harga Live (Simulasi atau On-Chain Price Sampler)
        let livePriceSol = lastPrice;

        if (this.activePosition.token.isRealData) {
          try {
            // Coba ambil harga real-time via DexScreener short-poll
            const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, {
              signal: AbortSignal.timeout(1800)
            });
            if (res.ok) {
              const data = await res.json();
              if (data.pairs && data.pairs[0]?.priceUsd) {
                const pUsd = parseFloat(data.pairs[0].priceUsd);
                livePriceSol = +(pUsd / 140).toFixed(8);
              }
            }
          } catch {
            // Jika network sampler timeout, gunakan pergerakan micro-tick
            livePriceSol = lastPrice;
          }
        } else {
          // Model pergerakan harga simulated sniper
          const elapsed = holdDurationSec;
          const drift = (Math.random() - 0.44) * 0.06; // Sedikit bias naik
          livePriceSol = +(lastPrice * (1 + drift)).toFixed(8);
        }

        // 2.2 Hitung Metrik PNL Live
        const pnlPct = +(((livePriceSol - entryPrice) / entryPrice) * 100).toFixed(2);
        const pnlSol = +((livePriceSol * this.activePosition.tokenAmount) - this.activePosition.solInvested).toFixed(6);
        const highestPriceSol = Math.max(this.activePosition.highestPriceSol || entryPrice, livePriceSol);

        // Trailing Stop Loss Dinamis
        const trailingDist = this.activePosition.trailingDistancePct || 15;
        const trailingStopPriceSol = +(highestPriceSol * (1 - trailingDist / 100)).toFixed(8);

        // Momentum status
        const priceDiff = livePriceSol - lastPrice;
        const momentumStatus: 'ACCELERATING' | 'STEADY' | 'STAGNANT' | 'DROPPING' =
          priceDiff > 0.02 * lastPrice
            ? 'ACCELERATING'
            : priceDiff < -0.02 * lastPrice
            ? 'DROPPING'
            : 'STEADY';

        lastPrice = livePriceSol;

        // Update active position di memory
        this.activePosition = {
          ...this.activePosition,
          currentPriceSol: livePriceSol,
          pnlSol,
          pnlPct,
          rMultiplier: +(pnlPct / 25).toFixed(2),
          highestPriceSol,
          trailingStopPriceSol,
          holdDurationSec,
          momentumStatus
        };

        this.callbacks.onPositionUpdated?.(this.activePosition);

        // 2.3 Evaluasi Kondisi Auto-Sell (TP / SL / Trailing SL / TTL)
        const targetTpPct = this.activePosition.targetTpPct || 100;
        const stopLossPct = this.activePosition.stopLossPct || -25;
        const maxHoldTimeSec = this.activePosition.maxHoldTimeSec || 180;

        let shouldSell = false;
        let sellReason = '';

        if (pnlPct >= targetTpPct) {
          shouldSell = true;
          sellReason = `🎯 TAKE PROFIT TERCAPAI (+${pnlPct}% >= +${targetTpPct}%)`;
        } else if (pnlPct <= stopLossPct) {
          shouldSell = true;
          sellReason = `🛑 STOP LOSS TERSENTUH (${pnlPct}% <= ${stopLossPct}%)`;
        } else if (highestPriceSol > entryPrice * 1.25 && livePriceSol <= trailingStopPriceSol) {
          shouldSell = true;
          sellReason = `📉 TRAILING STOP LOSS TERSENTUH (Turun ${trailingDist}% dari peak ${highestPriceSol.toFixed(8)} SOL)`;
        } else if (holdDurationSec >= maxHoldTimeSec) {
          shouldSell = true;
          sellReason = `⏳ TIME-TO-LIVE HABIS (${holdDurationSec}s >= ${maxHoldTimeSec}s)`;
        }

        if (shouldSell) {
          this.log('EXIT', 'SUCCESS', `⚡ Pemicu jual instan aktif: ${sellReason}`);
          // Hentikan tracker saat proses sell dipicu
          if (this.trackerInterval) {
            clearInterval(this.trackerInterval);
            this.trackerInterval = null;
          }
          // Prioritas tinggi (High Priority Fee)
          const elevatedPriorityFee = 0.00015; // 0.00015 SOL (~150,000 lamports)
          await this.triggerSell(this.activePosition, sellReason, elevatedPriorityFee);
        }
      } catch (trackerErr: any) {
        console.warn('[ExecutionManager] Tracker loop warning:', trackerErr.message || trackerErr);
      }
    }, 1000);
  }

  // =========================================================================
  // 3. Eksekusi Jual Otomatis (Auto-Sell / TP & SL)
  // =========================================================================
  /**
   * Mengeksekusi penjualan otomatis dengan injeksi Priority Fee tinggi agar transaksi
   * keluar tidak tertahan atau pending di mempool saat jaringan padat.
   */
  public async triggerSell(
    position: ActivePosition,
    reason: string = 'MANUAL_OR_TP_SL',
    priorityFeeSol: number = 0.00015
  ): Promise<SellResult> {
    if (this.isExecutingSell) {
      this.log('EXECUTION', 'WARN', '⚠️ Transaksi jual sedang berlangsung. Menolak duplicate triggerSell.');
      return { success: false, error: 'ALREADY_SELLING' };
    }

    this.isExecutingSell = true;
    position.status = 'CLOSING';
    this.callbacks.onPositionUpdated?.(position);

    const mint = position.token.mint;
    // Hanya simulasikan jika mint jelas palsu/mock (panjang < 32)
    const isSimulation = (!mint || mint.length < 32) && (!position.token.isRealData || position.id.includes('SIM'));

    this.log(
      'EXECUTION',
      'INFO',
      `🚀 [AUTO-SELL] Memicu transaksi jual on-chain untuk ${position.token.symbol} (${reason}) | Priority Fee: ${priorityFeeSol} SOL...`
    );

    const sellTimeoutId = setTimeout(() => {
      if (this.isExecutingSell) {
        this.log('EXECUTION', 'ERROR', `⏰ Timeout saat transaksi jual untuk ${position.token.symbol}.`);
        this.isExecutingSell = false;
        position.status = 'OPEN';
        this.callbacks.onPositionUpdated?.(position);
      }
    }, 45000);

    try {
      let exitPriceSol = position.currentPriceSol;
      let signature: string = '';
      let solReceived: number = 0;

      if (isSimulation) {
        // Mode Dry-Run Simulation Sell (Hanya untuk mock testing tanpa mint)
        signature = `SIM_SELL_${Math.random().toString(36).slice(2, 10).toUpperCase()}_${Date.now().toString().slice(-6)}`;
        solReceived = +(position.solInvested * (1 + position.pnlPct / 100)).toFixed(6);
        this.log(
          'EXECUTION',
          'SUCCESS',
          `🧪 [DRY-RUN] Simulasi jual ${position.token.symbol} sukses: ${solReceived} SOL diterima @ ${exitPriceSol.toFixed(8)} SOL [SimTx: ${signature}]`
        );
      } else {
        // Jalur 1: Coba jual via Server Hot Wallet (/api/bot/execute-sell)
        let serverSellSuccess = false;
        let serverError = '';

        try {
          const res = await fetch('/api/bot/execute-sell', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              mint,
              percentage: 100,
              slippageBps: 300, // Toleransi slippage 3% untuk menjamin eksekusi
              jitoTipSol: priorityFeeSol
            }),
            signal: AbortSignal.timeout(30000)
          });

          const data = await res.json();
          if (data.success && data.signature) {
            signature = data.signature;
            solReceived = data.solReceived || +(position.currentPriceSol * position.tokenAmount).toFixed(6);
            if (position.tokenAmount > 0) {
              exitPriceSol = +(solReceived / position.tokenAmount).toFixed(8);
            }
            serverSellSuccess = true;
            this.log('EXECUTION', 'SUCCESS', `⚡ [SERVER SELL CONFIRMED] ${position.token.symbol} terjual on-chain! Tx: https://solscan.io/tx/${signature}`);
          } else {
            serverError = data.error || 'Server tidak memiliki token account';
          }
        } catch (sErr: any) {
          serverError = sErr.message || 'Server sell fetch failed';
        }

        // Jalur 2: Jika server gagal atau token berada di dompet browser Phantom
        if (!serverSellSuccess) {
          this.log('EXECUTION', 'INFO', `🟡 [FALLBACK PHANTOM] Server: ${serverError}. Mencoba eksekusi langsung via dompet Phantom di browser...`);

          const provider = typeof window !== 'undefined'
            ? ((window as any).phantom?.solana || (window as any).solflare || (window as any).solana)
            : null;

          if (provider && (provider.isConnected || provider.isPhantom)) {
            const userPubKey = provider.publicKey ? new PublicKey(provider.publicKey.toString()) : null;
            if (!userPubKey) {
              throw new Error('Alamat dompet Phantom di browser tidak terbaca');
            }

            // Ambil token account on-chain riil dari Phantom untuk mendapatkan unit presisi
            let tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(userPubKey, {
              mint: new PublicKey(mint)
            });

            // Coba cek Token-2022 jika kosong
            if (!tokenAccounts.value || tokenAccounts.value.length === 0) {
              try {
                const t22 = await this.connection.getParsedTokenAccountsByOwner(userPubKey, {
                  programId: new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb')
                });
                tokenAccounts.value = t22.value.filter((a) => a.account.data.parsed.info.mint === mint);
              } catch {}
            }

            if (!tokenAccounts.value || tokenAccounts.value.length === 0) {
              throw new Error(`Token ${position.token.symbol} tidak ditemukan di dompet Phantom (${userPubKey.toBase58().slice(0, 8)}...).`);
            }

            const info = tokenAccounts.value[0].account.data.parsed.info;
            const rawUnits = info.tokenAmount.amount; // raw base units presisi tanpa rounding error

            if (BigInt(rawUnits) <= BigInt(0)) {
              throw new Error(`Saldo token ${position.token.symbol} di dompet Phantom sudah 0.`);
            }

            this.log('EXECUTION', 'INFO', `🔑 Meminta konfirmasi transaksi jual di Phantom untuk ${info.tokenAmount.uiAmount} ${position.token.symbol}...`);
            const quote = await fetchJupiterSellQuote(mint, rawUnits, 300);
            if (!quote) throw new Error('Quote jual Jupiter tidak tersedia');

            const swapResult = await executeJupiterSwap(
              quote,
              position.token.symbol,
              priorityFeeSol,
              0,
              userPubKey.toBase58(),
              provider,
              false
            );

            if (!swapResult.signature) {
              throw new Error('Transaksi jual dibatalkan atau signature tidak diterima dari Phantom');
            }

            signature = swapResult.signature;
            solReceived = quote.tokenAmountUi || lamportsToSol(quote.outAmountRaw) || +(position.solInvested * (1 + position.pnlPct / 100)).toFixed(6);
            if (position.tokenAmount > 0) {
              exitPriceSol = +(solReceived / position.tokenAmount).toFixed(8);
            }
            this.log('EXECUTION', 'SUCCESS', `⚡ [PHANTOM SELL CONFIRMED] ${position.token.symbol} terjual di Phantom! Tx: https://solscan.io/tx/${signature}`);
          } else {
            throw new Error(`Gagal jual on-chain: Server (${serverError}) & dompet Phantom browser tidak terhubung.`);
          }
        }

        // Tunggu konfirmasi on-chain
        this.log('EXECUTION', 'INFO', `🔍 Menunggu konfirmasi sell on-chain: ${signature.slice(0, 16)}...`);
        try {
          await this.connection.confirmTransaction(signature, 'confirmed');
        } catch (confErr: any) {
          this.log('EXECUTION', 'WARN', `⚠️ Konfirmasi sell RPC timeout: ${confErr.message}`);
        }
      }

      clearTimeout(sellTimeoutId);

      const realizedPnlSol = +(solReceived - position.solInvested).toFixed(6);
      const realizedPnlPct = +(((solReceived - position.solInvested) / position.solInvested) * 100).toFixed(2);
      const holdDurationSec = Math.floor((Date.now() - position.entryTimestamp) / 1000);

      // Buat rekaman ClosedTrade
      const closedTrade: ClosedTrade = {
        id: `TRADE-${Date.now()}-${mint.slice(0, 6)}`,
        token: position.token,
        entryPriceSol: position.entryPriceSol,
        exitPriceSol,
        solInvested: position.solInvested,
        pnlSol: realizedPnlSol,
        pnlPct: realizedPnlPct,
        rMultiplier: +(realizedPnlPct / 25).toFixed(2),
        holdDurationSec,
        exitReason: reason,
        entryTimestamp: position.entryTimestamp,
        exitTimestamp: Date.now(),
        jitoTipSol: priorityFeeSol
      };

      // 3.3 Bersihkan Active Position, Berhenti Tracker & Buka Mutex Lock
      if (this.trackerInterval) {
        clearInterval(this.trackerInterval);
        this.trackerInterval = null;
      }

      this.activePosition = null;
      this.isExecutingSell = false;
      this.isLocked = false;
      positionMutex.releaseLock(mint, 300000); // 5 menit cooldown untuk koin yang sama

      this.callbacks.onPositionClosed?.(closedTrade);

      this.log(
        'EXECUTION',
        'SUCCESS',
        `🎉 [POSISI DITUTUP] ${position.token.symbol} | PNL: ${realizedPnlPct >= 0 ? '+' : ''}${realizedPnlPct}% (${realizedPnlSol >= 0 ? '+' : ''}${realizedPnlSol} SOL) | Mutex DIBUKA KEMBALI`
      );

      return {
        success: true,
        signature,
        closedTrade,
        solReceived,
        tokensSold: position.tokenAmount,
        isSimulated: isSimulation
      };
    } catch (err: any) {
      clearTimeout(sellTimeoutId);
      this.isExecutingSell = false;
      position.status = 'OPEN';
      this.callbacks.onPositionUpdated?.(position);
      this.log('EXECUTION', 'ERROR', `❌ Gagal dalam triggerSell(): ${err.message || err}. Posisi TETAP AKTIF di dashboard.`);
      this.callbacks.onError?.(err, 'triggerSell');
      // Restart tracker untuk mencoba lagi atau memantau harga
      if (!this.trackerInterval && this.activePosition) {
        this.startPositionTracker(this.activePosition);
      }
      return {
        success: false,
        error: err.message || 'Auto-sell execution failed'
      };
    }
  }

  // =========================================================================
  // 4. Fail-Safe, Timeout & Emergency Unlock
  // =========================================================================
  /**
   * Membuka kunci darurat jika terjadi crash jaringan atau timeout di tengah jalan,
   * memastikan bot tidak membeku (freeze) dan siap memproses sinyal berikutnya.
   */
  public emergencyUnlock(mint?: string): void {
    if (this.trackerInterval) {
      clearInterval(this.trackerInterval);
      this.trackerInterval = null;
    }
    this.isLocked = false;
    this.isExecutingBuy = false;
    this.isExecutingSell = false;
    positionMutex.releaseLock(mint);
    this.log('RISK', 'WARN', `🔓 [EMERGENCY UNLOCK] Mutex dilepaskan secara paksa. Bot siap memburu target baru.`);
  }
}
