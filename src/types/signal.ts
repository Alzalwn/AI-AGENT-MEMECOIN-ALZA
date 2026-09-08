/**
 * Solana AI Alpha Signal Terminal — TradingSignal Type Definitions
 * Semua tipe data untuk sistem sinyal (Entry/TP/SL/ETA/Confidence)
 */

import { TokenSignal, MoonshotVerdict } from './terminal';

// ─────────────────────────────────────────────────────────
// CORE SIGNAL DATA STRUCTURES
// ─────────────────────────────────────────────────────────

export type SignalTier = 'SUPERNOVA' | 'HIGH' | 'MODERATE';
export type ConfidenceTier = 'ALPHA' | 'STRONG' | 'MODERATE' | 'WEAK';
export type SignalStatus =
  | 'ACTIVE'
  | 'TP1_HIT'
  | 'TP2_HIT'
  | 'TP3_HIT'
  | 'SL_HIT'
  | 'EXPIRED'
  | 'CANCELLED';

export interface EntryZone {
  low: number;      // SOL — Batas bawah zona beli
  high: number;     // SOL — Batas atas zona beli
  current: number;  // SOL — Harga saat deteksi
  label: string;    // e.g. "$0.0000412 – $0.0000445 SOL"
  marketCapLow: number;   // USD estimasi MC saat entry bawah
  marketCapHigh: number;  // USD estimasi MC saat entry atas
}

export interface TakeProfitTarget {
  tier: 'TP1' | 'TP2' | 'TP3';
  priceSol: number;         // Target harga dalam SOL
  gainPct: number;          // % gain dari entry tengah
  marketCapUsd: number;     // Estimasi MC dalam USD saat hit
  etaMinutes: { min: number; max: number; };  // Estimasi waktu
  rationale: string;        // Penjelasan singkat kenapa di level ini
  isHit: boolean;           // Apakah sudah tercapai
  hitAt?: number;           // Timestamp saat hit
}

export interface StopLoss {
  priceSol: number;      // Hard stop price
  pctFromEntry: number;  // % penurunan dari entry (negatif, mis. -20)
  label: string;         // e.g. "$0.0000330 SOL (-20%)"
  rationale: string;     // "Tepat di bawah LP floor support"
  isHit: boolean;
  hitAt?: number;
}

export interface MarketContext {
  marketCapUsd: number;       // MC saat deteksi
  liquidityUsd: number;       // Total LP dalam USD
  lpBurntPct: number;         // % LP yang dibakar
  bondingProgress?: number;   // % bonding curve (Pump.fun)
  isGraduated: boolean;       // Sudah graduate ke Raydium?
  totalSupply?: number;       // Estimasi total suplai token
}

export interface TradingLinks {
  bullx: string;
  photon: string;
  gmgn: string;
  dexscreener: string;
  jupiter: string;
  birdeye: string;
  rugcheck: string;
  copyCA: string;  // Sama dengan mint, untuk 1-klik copy
}

export interface SignalPerformanceData {
  peakGainPct: number;      // Puncak gain tertinggi yang dicapai sinyal
  peakPriceSol: number;     // Harga tertinggi setelah sinyal
  bestTPHit: 'TP1' | 'TP2' | 'TP3' | 'SL' | 'NONE';
  actualDurationMin: number;  // Berapa menit sejak sinyal hingga resolusi
  resolvedAt?: number;
}

export interface TradingSignal {
  id: string;               // UUID unik sinyal
  timestamp: number;        // Waktu sinyal dibuat (ms)
  expiresAt: number;        // Sinyal kedaluwarsa (timestamp ms)

  // Token info
  token: TokenSignal;
  moonshotVerdict: MoonshotVerdict;

  // ─── Kalkulasi Sinyal Inti ───
  entryZone: EntryZone;
  stopLoss: StopLoss;
  targets: [TakeProfitTarget, TakeProfitTarget, TakeProfitTarget]; // TP1, TP2, TP3

  // Risk/Reward & Timing
  riskRewardRatio: number;       // Rasio R/R ke TP2 (standar)
  riskRewardToTP3: number;       // Rasio R/R ke TP3 (moonbag)
  etaToTP1: { min: number; max: number; };  // Estimasi menit ke TP1
  etaToTP2: { min: number; max: number; };  // Estimasi menit ke TP2

  // Confidence & Tier
  confidenceScore: number;       // 0–100
  confidenceTier: ConfidenceTier;
  signalTier: SignalTier;        // Berdasarkan Moonshot tier
  pumpThesis: string;            // Narasi singkat kenapa token ini menarik

  // Context
  marketContext: MarketContext;
  tradingLinks: TradingLinks;

  // Metadata AI scoring
  grokViralityScore: number;     // 0–1 (dari Grok API)
  smartMoneyCount: number;       // Jumlah Smart Money wallet terdeteksi
  smartMoneyLabels: string[];    // Label dompet (e.g. "TopTrader_7xKv")
  scanTier?: 'EARLY_GEM' | 'BREAKOUT_RUNNER';

  // Status tracking
  status: SignalStatus;
  performance?: SignalPerformanceData;
}

// ─────────────────────────────────────────────────────────
// SIGNAL FEED & STATS AGGREGATES
// ─────────────────────────────────────────────────────────

export interface SignalStats {
  totalSignals: number;
  totalToday: number;
  winCount: number;       // TP1+ hit
  lossCount: number;      // SL hit
  winRate: number;        // 0–100%
  tp2Rate: number;        // % sinyal yang mencapai TP2
  tp3Rate: number;        // % sinyal yang mencapai TP3 (moonbag)
  avgRR: number;          // Rata-rata R/R yang direalisasikan
  avgDurationMin: number; // Rata-rata durasi sinyal sampai resolusi
  supernovaCount: number;
  highCount: number;
  moderateCount: number;
  lastUpdated: number;
}

// ─────────────────────────────────────────────────────────
// TELEGRAM BROADCAST PAYLOAD
// ─────────────────────────────────────────────────────────

export interface TelegramSignalPayload {
  signal: TradingSignal;
  messageType: 'NEW_SIGNAL' | 'TP1_HIT' | 'TP2_HIT' | 'TP3_HIT' | 'SL_HIT' | 'EXPIRED';
  updateText?: string;   // Pesan tambahan saat status update
}
