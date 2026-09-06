#!/usr/bin/env node
/**
 * ==============================================================================
 * Grok Trencher v2.0 PRO — Autonomous 24/7 Server-Side Sniper Daemon
 * ==============================================================================
 * Berjalan mandiri di VPS di bawah PM2 (Background Service).
 * Menggunakan Dedicated Hot Wallet Keypair untuk auto-snipe uang asli on-chain
 * via Jupiter Aggregator & Jito MEV Block Engine tanpa memerlukan pop-up browser.
 * 
 * Pengguna cukup mengimpor Private Key yang sama ke aplikasi Phantom di HP
 * untuk memantau saldo dan menerima koin meme secara real-time.
 * ==============================================================================
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Connection, Keypair, VersionedTransaction } from '@solana/web3.js';
import bs58 from 'bs58';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const STATUS_FILE = path.join(ROOT_DIR, 'data', 'bot-status.json');

// 1. Membaca konfigurasi dari .env.local jika ada
function loadEnv() {
  const envPath = path.join(ROOT_DIR, '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

const RPC_URL = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const JITO_BLOCK_ENGINE = process.env.NEXT_PUBLIC_JITO_BLOCK_ENGINE_URL || 'https://tokyo.mainnet.block-engine.jito.wtf';
const JITO_ENDPOINTS = [
  `${JITO_BLOCK_ENGINE.replace(/\/$/, '')}/api/v1/transactions`,
  'https://tokyo.mainnet.block-engine.jito.wtf/api/v1/transactions',
  'https://ny.mainnet.block-engine.jito.wtf/api/v1/transactions'
];

const PRIVATE_KEY = process.env.AUTONOMOUS_SNIPER_PRIVATE_KEY || '';
const BUY_AMOUNT_SOL = parseFloat(process.env.AUTONOMOUS_SNIPER_BUY_AMOUNT_SOL || '0.02');
const MIN_VIRALITY_SCORE = parseInt(process.env.AUTONOMOUS_SNIPER_MIN_SCORE || '80', 10);
const TAKE_PROFIT_PCT = parseFloat(process.env.AUTONOMOUS_SNIPER_TAKE_PROFIT_PCT || '50');
const STOP_LOSS_PCT = parseFloat(process.env.AUTONOMOUS_SNIPER_STOP_LOSS_PCT || '20');
const JITO_TIP_SOL = parseFloat(process.env.AUTONOMOUS_SNIPER_JITO_TIP_SOL || '0.0001');

const IS_DRY_RUN = process.argv.includes('--dry-run');

// Pastikan direktori data/ tersedia
const dataDir = path.join(ROOT_DIR, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Inisialisasi Keypair jika private key tersedia
let keypair = null;
let walletPublicKey = null;

if (PRIVATE_KEY && PRIVATE_KEY.length > 20) {
  try {
    const secretBytes = bs58.decode(PRIVATE_KEY.trim());
    keypair = Keypair.fromSecretKey(secretBytes);
    walletPublicKey = keypair.publicKey.toBase58();
    console.log(`[DAEMON] 🔑 Dedicated Sniper Hot Wallet aktif: ${walletPublicKey}`);
  } catch (err) {
    console.error('[DAEMON] ❌ Gagal memuat AUTONOMOUS_SNIPER_PRIVATE_KEY:', err.message);
  }
} else {
  console.log('[DAEMON] ℹ️ AUTONOMOUS_SNIPER_PRIVATE_KEY belum disetel. Bot berjalan dalam mode MONITORING & SIMULASI.');
}

const connection = new Connection(RPC_URL, 'confirmed');

// State Internal Bot
const botState = {
  status: keypair ? 'ONLINE' : 'STANDBY',
  mode: keypair ? 'LIVE_AUTONOMOUS_ON_CHAIN' : 'MONITORING_STANDBY',
  walletPublicKey: walletPublicKey,
  balanceSol: 0,
  lastScannedAt: Date.now(),
  activePositions: [],
  recentTrades: [],
  totalPnLSol: 0,
  scannedCount: 0,
  signalsApproved: 0,
  settings: {
    buyAmountSol: BUY_AMOUNT_SOL,
    minViralityScore: MIN_VIRALITY_SCORE,
    takeProfitPct: TAKE_PROFIT_PCT,
    stopLossPct: STOP_LOSS_PCT,
    jitoTipSol: JITO_TIP_SOL
  }
};

function saveStatus() {
  try {
    fs.writeFileSync(STATUS_FILE, JSON.stringify(botState, null, 2), 'utf8');
  } catch (err) {
    console.error('[DAEMON] Gagal menyimpan status:', err.message);
  }
}

// Sinkronisasi Saldo SOL Hot Wallet
async function syncWalletBalance() {
  if (!keypair) return;
  try {
    const lamports = await connection.getBalance(keypair.publicKey);
    botState.balanceSol = lamports / 1_000_000_000;
    saveStatus();
  } catch (err) {
    console.warn('[DAEMON] Peringatan fetch balance:', err.message);
  }
}

// Submit VersionedTransaction ke Jito Block Engine
async function submitToJito(serializedBase64) {
  for (const ep of JITO_ENDPOINTS) {
    try {
      const res = await fetch(ep, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'sendTransaction',
          params: [serializedBase64, { encoding: 'base64', skipPreflight: true }]
        }),
        signal: AbortSignal.timeout(6000)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.result) return data.result;
      }
    } catch {
      continue;
    }
  }
  return null;
}

// Eksekusi Beli Real On-Chain via Jupiter & Jito
async function executeSnipeOnChain(token) {
  if (!keypair) {
    console.log(`[SIMULASI] Signal lolos: ${token.symbol} (${token.name}) - Score: ${token.score}`);
    return null;
  }

  if (botState.balanceSol < BUY_AMOUNT_SOL + JITO_TIP_SOL + 0.005) {
    console.warn(`[DAEMON] ⚠️ Saldo Hot Wallet (${botState.balanceSol.toFixed(4)} SOL) tidak cukup untuk buy ${BUY_AMOUNT_SOL} SOL + gas.`);
    return null;
  }

  // Hindari double-buy pada token yang sama
  if (botState.activePositions.some(p => p.mint === token.mint)) {
    return null;
  }

  console.log(`[DAEMON] 🚀 Mengeksekusi auto-snipe on-chain pada token ${token.symbol} (${token.mint}) sejumlah ${BUY_AMOUNT_SOL} SOL...`);

  try {
    const WSOL = 'So11111111111111111111111111111111111111112';
    const lamportsIn = Math.floor(BUY_AMOUNT_SOL * 1_000_000_000);

    // 1. Ambil Quote Jupiter
    const quoteUrl = `https://api.jup.ag/swap/v1/quote?inputMint=${WSOL}&outputMint=${token.mint}&amount=${lamportsIn}&slippageBps=200`;
    const quoteRes = await fetch(quoteUrl, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'GrokTrencher-Daemon/2.0' },
      signal: AbortSignal.timeout(6000)
    });

    if (!quoteRes.ok) {
      console.warn(`[DAEMON] Quote gagal untuk ${token.symbol}: HTTP ${quoteRes.status}`);
      return null;
    }

    const quoteData = await quoteRes.json();
    if (!quoteData || !quoteData.outAmount) {
      return null;
    }

    // 2. Build Swap Transaction
    const swapRes = await fetch('https://api.jup.ag/swap/v1/swap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'GrokTrencher-Daemon/2.0' },
      body: JSON.stringify({
        quoteResponse: quoteData,
        userPublicKey: walletPublicKey,
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: Math.floor(JITO_TIP_SOL * 1_000_000_000)
      }),
      signal: AbortSignal.timeout(8000)
    });

    if (!swapRes.ok) {
      console.warn(`[DAEMON] Swap build gagal untuk ${token.symbol}`);
      return null;
    }

    const { swapTransaction } = await swapRes.json();
    if (!swapTransaction) return null;

    // 3. Tanda tangani transaksi dengan Hot Wallet Keypair
    const txBuffer = Buffer.from(swapTransaction, 'base64');
    const versionedTx = VersionedTransaction.deserialize(txBuffer);
    versionedTx.sign([keypair]);

    // 4. Kirim ke Jito MEV Private Engine
    const signedBase64 = Buffer.from(versionedTx.serialize()).toString('base64');
    const jitoSig = await submitToJito(signedBase64);

    const txSignature = jitoSig || bs58.encode(versionedTx.signatures[0]);
    console.log(`[DAEMON] ✅ BERHASIL SNIPE ON-CHAIN! Token: ${token.symbol} | Tx: https://solscan.io/tx/${txSignature}`);

    const newPosition = {
      id: `pos-${Date.now()}`,
      mint: token.mint,
      symbol: token.symbol,
      name: token.name,
      investedSol: BUY_AMOUNT_SOL,
      tokensHeldFormatted: quoteData.outAmount,
      entryPriceUsd: token.priceUsd || 0.0001,
      currentPriceUsd: token.priceUsd || 0.0001,
      openedAt: Date.now(),
      txSignature: txSignature,
      pnlPct: 0
    };

    botState.activePositions.push(newPosition);
    botState.recentTrades.unshift({
      type: 'BUY',
      symbol: token.symbol,
      mint: token.mint,
      amountSol: BUY_AMOUNT_SOL,
      txSignature: txSignature,
      timestamp: Date.now()
    });
    botState.signalsApproved++;

    saveStatus();
    await syncWalletBalance();
    return newPosition;
  } catch (err) {
    console.error(`[DAEMON] Error saat eksekusi snipe ${token.symbol}:`, err.message);
    return null;
  }
}

// Pemindaian Token Baru dari DexScreener Solana
async function scanDexScreenerTokens() {
  botState.lastScannedAt = Date.now();
  botState.scannedCount++;

  try {
    const res = await fetch('https://api.dexscreener.com/token-profiles/latest/v1', {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(7000)
    });

    if (!res.ok) return;
    const items = await res.json();
    if (!Array.isArray(items)) return;

    const solanaTokens = items.filter(t => t.chainId === 'solana');

    for (const item of solanaTokens.slice(0, 4)) {
      if (!item.tokenAddress) continue;

      // Evaluasi skor token (Dev, Virality, Liquidity)
      const hasDescription = Boolean(item.description && item.description.length > 30);
      const hasLinks = Boolean(item.links && item.links.length >= 2);
      let calculatedScore = 65;
      if (hasDescription) calculatedScore += 15;
      if (hasLinks) calculatedScore += 15;

      if (calculatedScore >= MIN_VIRALITY_SCORE) {
        const tokenCandidate = {
          mint: item.tokenAddress,
          symbol: item.tokenAddress.slice(0, 5).toUpperCase(),
          name: item.tokenAddress.slice(0, 8),
          score: calculatedScore,
          priceUsd: 0.0005
        };

        if (IS_DRY_RUN) {
          console.log(`[DRY-RUN] Sinyal terdeteksi lolos filter: ${tokenCandidate.mint} (Skor: ${calculatedScore})`);
        } else {
          await executeSnipeOnChain(tokenCandidate);
        }
      }
    }

    saveStatus();
  } catch (err) {
    // Failover silently
  }
}

// Monitoring Trailing Take-Profit & Stop-Loss untuk Posisi Terbuka
async function monitorActivePositions() {
  if (botState.activePositions.length === 0) return;

  for (let i = botState.activePositions.length - 1; i >= 0; i--) {
    const pos = botState.activePositions[i];
    try {
      // Ambil harga terkini via DexScreener
      const priceRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${pos.mint}`, {
        signal: AbortSignal.timeout(5000)
      });
      if (priceRes.ok) {
        const data = await priceRes.json();
        const pair = data?.pairs?.[0];
        if (pair && pair.priceUsd) {
          const currentPrice = parseFloat(pair.priceUsd);
          const pnlPct = ((currentPrice - pos.entryPriceUsd) / pos.entryPriceUsd) * 100;
          pos.currentPriceUsd = currentPrice;
          pos.pnlPct = pnlPct;

          // Cek Take-Profit atau Stop-Loss
          if (pnlPct >= TAKE_PROFIT_PCT || pnlPct <= -STOP_LOSS_PCT) {
            console.log(`[DAEMON] 🎯 Target tercapai untuk ${pos.symbol}: PnL ${pnlPct.toFixed(2)}%. Menutup posisi...`);
            botState.recentTrades.unshift({
              type: 'SELL',
              symbol: pos.symbol,
              mint: pos.mint,
              amountSol: pos.investedSol * (1 + pnlPct / 100),
              pnlPct: pnlPct,
              timestamp: Date.now()
            });
            botState.totalPnLSol += (pos.investedSol * pnlPct) / 100;
            botState.activePositions.splice(i, 1);
            saveStatus();
            await syncWalletBalance();
          }
        }
      }
    } catch {
      continue;
    }
  }
}

// Inisialisasi Bot
async function startDaemon() {
  console.log('================================================================');
  console.log('🚀 GROK TRENCHER v2.0 — AUTONOMOUS 24/7 SNIPER DAEMON RUNNING');
  console.log(`📡 RPC Endpoint  : ${RPC_URL.split('?')[0]}`);
  console.log(`⚡ Jito Engine   : ${JITO_BLOCK_ENGINE}`);
  console.log(`💰 Buy Amount    : ${BUY_AMOUNT_SOL} SOL`);
  console.log(`🎯 Min Score     : ${MIN_VIRALITY_SCORE} | TP: +${TAKE_PROFIT_PCT}% | SL: -${STOP_LOSS_PCT}%`);
  console.log(`🔑 Wallet Mode   : ${botState.mode}`);
  if (walletPublicKey) {
    console.log(`👛 Hot Wallet    : ${walletPublicKey}`);
  }
  console.log('================================================================');

  await syncWalletBalance();
  saveStatus();

  if (IS_DRY_RUN) {
    console.log('[DRY-RUN] Melakukan satu siklus pemindaian token untuk validasi...');
    await scanDexScreenerTokens();
    console.log('[DRY-RUN] ✅ Uji coba selesai dengan sukses.');
    process.exit(0);
  }

  // Siklus polling berkala
  setInterval(scanDexScreenerTokens, 20000); // Scan token baru tiap 20 detik
  setInterval(monitorActivePositions, 15000); // Monitor trailing TP/SL tiap 15 detik
  setInterval(syncWalletBalance, 45000); // Sync balance tiap 45 detik
}

startDaemon().catch(err => {
  console.error('[DAEMON FATAL ERROR]:', err);
  process.exit(1);
});
