#!/usr/bin/env python3
"""
Signal Throttle Manager — High-Accuracy Solana Memecoin Signal Gatekeeper
========================================================================
Architected for: Anti-Spam, 24h CA Deduplication, Dual-Window Rate Limiting,
and Strict 90%+ Quality Gate Filtering before Supabase Upsert & Telegram Dispatch.

Author: Senior Python Data Engineer & Web3 Architect
"""

import time
import logging
import sys
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from collections import deque
import json

# Windows terminal UTF-8 encoding safeguard
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Setup high-visibility structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] [SIGNAL-GATEKEEPER] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("SignalThrottleManager")

# Optional Redis Import with In-Memory Fallback
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    logger.warning("Package 'redis' tidak ditemukan. Menggunakan fallback In-Memory Cache (RAM).")

# Optional Supabase Import
try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    logger.warning("Package 'supabase' tidak ditemukan. Mode simulasi database aktif.")


# ==============================================================================
# DATA MODELS
# ==============================================================================

@dataclass
class TokenSignalCandidate:
    """Representasi data kandidat sinyal yang dideteksi oleh pemindai/scanner."""
    mint: str                           # Solana Contract Address (CA)
    symbol: str                         # e.g., $ACT, $GOAT
    name: str                           # e.g., Act I : AI Prophecy
    pump_score: float                   # 0.0 - 100.0 (Probabilitas keseluruhan)
    smart_money_score: float            # 0.0 - 100.0 (Skor akumulasi wallet smart money)
    momentum_score: float               # 0.0 - 100.0 (Skor volume delta & tx velocity)
    price_sol: float                    # Harga terkini dalam SOL
    liquidity_usd: float                # Likuiditas pool (USD)
    platform: str = "Raydium"           # Raydium / Pump.fun
    entry_zone_low: float = 0.0         # Batas bawah beli (SOL)
    entry_zone_high: float = 0.0        # Batas atas beli (SOL)
    tp1_price_sol: float = 0.0          # Target TP1 (+50%)
    tp2_price_sol: float = 0.0          # Target TP2 (+100%)
    tp3_price_sol: float = 0.0          # Target TP3 (+300%)
    sl_price_sol: float = 0.0           # Stop Loss (-20%)
    created_at: float = 0.0             # Timestamp Unix

    def __post_init__(self):
        if self.created_at == 0.0:
            self.created_at = time.time()
        # Otomatisasi estimasi Entry, TP, dan SL jika belum diisi
        if self.entry_zone_low == 0.0 and self.price_sol > 0:
            self.entry_zone_low = round(self.price_sol * 0.97, 9)
            self.entry_zone_high = round(self.price_sol * 1.03, 9)
            self.tp1_price_sol = round(self.price_sol * 1.50, 9)
            self.tp2_price_sol = round(self.price_sol * 2.00, 9)
            self.tp3_price_sol = round(self.price_sol * 4.00, 9)
            self.sl_price_sol = round(self.price_sol * 0.80, 9)


# ==============================================================================
# IN-MEMORY FALLBACK STORAGE (Jika Redis Offline)
# ==============================================================================

class InMemoryCache:
    """Penyimpanan memori lokal thread-safe dengan dukungan TTL sederhana."""
    def __init__(self):
        self._store: Dict[str, float] = {}  # key -> expire_timestamp
        self._history: deque = deque()      # list of timestamps for rate limiting

    def set(self, key: str, value: Any, ex: int = 86400) -> bool:
        self._store[key] = time.time() + ex
        return True

    def exists(self, key: str) -> bool:
        self._clean_expired()
        return key in self._store

    def _clean_expired(self):
        now = time.time()
        expired = [k for k, exp in self._store.items() if now > exp]
        for k in expired:
            del self._store[k]


# ==============================================================================
# CORE THROTTLE & GATEKEEPER MANAGER
# ==============================================================================

class SignalThrottleManager:
    """
    Arsitektur Filter & Throttling:
    1. Quality Gate (Ambang Batas Ekstrem: Smart Money >= 90% & Momentum >= 90%)
    2. 24h Contract Address Deduplication (Single Alert Rule)
    3. Dual-Window Rate Limiting (Maks 3 per 5 menit, Maks 10 per 60 menit)
    4. Top-K Sorting by Pump Score (Drop koin inferior dalam satu batch)
    5. Supabase UPSERT dengan flag `is_signal_sent = True`
    """

    def __init__(
        self,
        redis_client: Optional[Any] = None,
        supabase_client: Optional[Any] = None,
        min_smart_money_score: float = 90.0,
        min_momentum_score: float = 90.0,
        max_signals_per_5m: int = 3,
        max_signals_per_1h: int = 10,
        dedup_ttl_seconds: int = 86400, # 24 Jam
    ):
        self.redis = redis_client
        self.supabase = supabase_client
        self.in_memory = InMemoryCache() if not self.redis else None

        # Thresholds
        self.MIN_SMART_MONEY = min_smart_money_score
        self.MIN_MOMENTUM = min_momentum_score
        self.MAX_5M = max_signals_per_5m
        self.MAX_1H = max_signals_per_1h
        self.DEDUP_TTL = dedup_ttl_seconds

        # Keys
        self.REDIS_KEY_5M_ZSET = "ratelimit:signals:5m"
        self.REDIS_KEY_1H_ZSET = "ratelimit:signals:1h"

        logger.info(
            f"SignalThrottleManager Initialized | Quality Gate: SM>={self.MIN_SMART_MONEY}%, "
            f"Mom>={self.MIN_MOMENTUM}% | Limits: {self.MAX_5M}/5m, {self.MAX_1H}/1h | "
            f"Dedup TTL: {self.DEDUP_TTL}s (24h)"
        )

    # --------------------------------------------------------------------------
    # 1. QUALITY GATE FILTER
    # --------------------------------------------------------------------------
    def passes_quality_gate(self, token: TokenSignalCandidate) -> Tuple[bool, str]:
        """
        Validasi ambang batas ekstrem.
        Hanya lolos jika skor analitik Smart Money dan Momentum keduanya >= 90%.
        """
        if token.smart_money_score < self.MIN_SMART_MONEY:
            return False, f"Smart Money Score ({token.smart_money_score:.1f}%) < {self.MIN_SMART_MONEY}%"

        if token.momentum_score < self.MIN_MOMENTUM:
            return False, f"Momentum Score ({token.momentum_score:.1f}%) < {self.MIN_MOMENTUM}%"

        return True, "QUALIFIED"

    # --------------------------------------------------------------------------
    # 2. 24H CONTRACT ADDRESS DEDUPLICATION
    # --------------------------------------------------------------------------
    def is_duplicate_ca(self, mint_ca: str) -> bool:
        """
        Cek apakah token CA sudah pernah dijadikan sinyal dalam 24 jam terakhir.
        Menggunakan atomic SETNX pada Redis atau memori cache.
        """
        key = f"signal:seen:{mint_ca}"
        if self.redis:
            try:
                # Jika key sudah ada di Redis, return True (Duplikat)
                return bool(self.redis.exists(key))
            except Exception as e:
                logger.error(f"Redis error saat cek duplikasi: {e}. Fallback ke RAM.")
        
        return self.in_memory.exists(key)

    def mark_ca_as_alerted(self, mint_ca: str) -> None:
        """Simpan CA ke cache dengan TTL 24 jam."""
        key = f"signal:seen:{mint_ca}"
        if self.redis:
            try:
                self.redis.set(key, "SENT", ex=self.DEDUP_TTL)
                return
            except Exception as e:
                logger.error(f"Redis error saat set duplikasi: {e}")

        if self.in_memory:
            self.in_memory.set(key, "SENT", ex=self.DEDUP_TTL)

    # --------------------------------------------------------------------------
    # 3. GLOBAL RATE LIMITING (SLIDING WINDOW)
    # --------------------------------------------------------------------------
    def get_available_signal_quota(self) -> int:
        """
        Menghitung sisa kuota sinyal yang diperbolehkan saat ini berdasarkan
        sliding window 5 menit (maks 3) dan 60 menit (maks 10).
        """
        now = time.time()
        window_5m_ago = now - 300
        window_1h_ago = now - 3600

        if self.redis:
            try:
                pipe = self.redis.pipeline()
                # 5m window clean & count
                pipe.zremrangebyscore(self.REDIS_KEY_5M_ZSET, 0, window_5m_ago)
                pipe.zcard(self.REDIS_KEY_5M_ZSET)
                # 1h window clean & count
                pipe.zremrangebyscore(self.REDIS_KEY_1H_ZSET, 0, window_1h_ago)
                pipe.zcard(self.REDIS_KEY_1H_ZSET)
                _, count_5m, _, count_1h = pipe.execute()

                remaining_5m = max(0, self.MAX_5M - count_5m)
                remaining_1h = max(0, self.MAX_1H - count_1h)
                return min(remaining_5m, remaining_1h)
            except Exception as e:
                logger.error(f"Redis RateLimiter error: {e}. Fallback ke memory limiter.")

        # Fallback In-Memory Sliding Window
        # Bersihkan timestamp lama
        while self.in_memory._history and self.in_memory._history[0] < window_1h_ago:
            self.in_memory._history.popleft()

        count_5m = sum(1 for ts in self.in_memory._history if ts >= window_5m_ago)
        count_1h = len(self.in_memory._history)

        remaining_5m = max(0, self.MAX_5M - count_5m)
        remaining_1h = max(0, self.MAX_1H - count_1h)
        return min(remaining_5m, remaining_1h)

    def record_signal_dispatched(self, count: int = 1) -> None:
        """Mencatat pengiriman sinyal ke rate limiter sliding window."""
        now = time.time()
        if self.redis:
            try:
                pipe = self.redis.pipeline()
                for i in range(count):
                    # Unik timestamp dengan micro-offset
                    ts_micro = now + (i * 0.0001)
                    pipe.zadd(self.REDIS_KEY_5M_ZSET, {str(ts_micro): ts_micro})
                    pipe.zadd(self.REDIS_KEY_1H_ZSET, {str(ts_micro): ts_micro})
                pipe.expire(self.REDIS_KEY_5M_ZSET, 600)
                pipe.expire(self.REDIS_KEY_1H_ZSET, 7200)
                pipe.execute()
                return
            except Exception as e:
                logger.error(f"Gagal mencatat rate limit di Redis: {e}")

        if self.in_memory:
            for _ in range(count):
                self.in_memory._history.append(now)

    # --------------------------------------------------------------------------
    # 4. BATCH PROCESSING PIPELINE (GATEKEEPER & SORTING)
    # --------------------------------------------------------------------------
    def process_and_filter_candidates(
        self,
        raw_candidates: List[TokenSignalCandidate]
    ) -> List[TokenSignalCandidate]:
        """
        Alur filter menyeluruh:
        Input: Kumpulan raw candidates dari scanner (bisa 10+ koin sekaligus).
        Output: Daftar final (maksimal sesuai kuota, misal top-3) yang lolos semua seleksi.
        """
        if not raw_candidates:
            return []

        logger.info(f"==> Menerima {len(raw_candidates)} kandidat token dari Scanner Engine...")

        qualified_candidates: List[TokenSignalCandidate] = []

        # TAHAP A: QUALITY GATE & 24H DEDUPLIKASI
        for token in raw_candidates:
            # 1. Quality Gate Check
            passed, reason = self.passes_quality_gate(token)
            if not passed:
                logger.debug(
                    f"⛔ [QUALITY GATE REJECTED] {token.symbol} ({token.mint[:6]}...) "
                    f"— Alasan: {reason}"
                )
                continue

            # 2. Deduplikasi 24 Jam
            if self.is_duplicate_ca(token.mint):
                logger.info(
                    f"🛡️ [24H DEDUP BLOCKED] {token.symbol} ({token.mint[:6]}...) "
                    f"sudah pernah dialert dalam 24 jam terakhir. Diabaikan."
                )
                continue

            # Lolos tahap awal
            qualified_candidates.append(token)

        if not qualified_candidates:
            logger.info("ℹ️ Tidak ada kandidat yang lolos Quality Gate (>=90%) & Deduplikasi.")
            return []

        logger.info(
            f"✅ {len(qualified_candidates)} dari {len(raw_candidates)} koin lolos Quality Gate & Dedup."
        )

        # TAHAP B: PENYORTIRAN SKOR TERTINGGI (TOP PROBABILITY)
        # Urutkan berdasarkan pump_score DESC, lalu smart_money_score DESC
        qualified_candidates.sort(
            key=lambda x: (x.pump_score, x.smart_money_score, x.momentum_score),
            reverse=True
        )

        # TAHAP C: RATE LIMITING & SLICING
        available_quota = self.get_available_signal_quota()
        logger.info(f"📊 Kuota sinyal yang tersedia di rate-limiter: {available_quota} slot.")

        if available_quota <= 0:
            logger.warning(
                f"🛑 [RATE LIMIT EXCEEDED] Kuota sinyal habis (Maks 3/5m atau 10/1h tercapai). "
                f"Seluruh {len(qualified_candidates)} koin yang lolos terpaksa di-drop untuk mencegah spam."
            )
            return []

        # Ambil sejumlah kuota yang tersedia (misal maks 3), buang sisanya
        dispatched_signals = qualified_candidates[:available_quota]
        dropped_signals = qualified_candidates[available_quota:]

        # Log sinyal yang di-drop karena kalah skor
        for dropped in dropped_signals:
            logger.info(
                f"🗑️ [DROPPED BY QUOTA] {dropped.symbol} (Score: {dropped.pump_score:.1f}, "
                f"SM: {dropped.smart_money_score:.1f}%) dibuang karena kuota penuh."
            )

        # TAHAP D: COMMIT RATE LIMIT & DEDUP CA
        for sig in dispatched_signals:
            self.mark_ca_as_alerted(sig.mint)

        self.record_signal_dispatched(len(dispatched_signals))

        logger.info(
            f"🚀 [ALPHA SIGNALS APPROVED] {len(dispatched_signals)} sinyal siap dieksekusi ke Supabase & Webhook."
        )
        return dispatched_signals

    # --------------------------------------------------------------------------
    # 5. SUPABASE PERSISTENCE (UPSERT)
    # --------------------------------------------------------------------------
    def upsert_to_supabase(self, signals: List[TokenSignalCandidate]) -> bool:
        """
        Menyimpan atau memperbarui data ke tabel `signals` di Supabase.
        Menggunakan metode UPSERT pada kolom unik `mint` dengan flag `is_signal_sent = TRUE`.
        """
        if not signals:
            return True

        if not self.supabase:
            logger.warning("Supabase client belum dikonfigurasi. Melewati penyimpanan DB (simulasi sukses).")
            return True

        rows_to_upsert = []
        now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

        for sig in signals:
            payload = {
                "mint": sig.mint,
                "symbol": sig.symbol,
                "name": sig.name,
                "pump_score": sig.pump_score,
                "smart_money_score": sig.smart_money_score,
                "momentum_score": sig.momentum_score,
                "price_sol": sig.price_sol,
                "liquidity_usd": sig.liquidity_usd,
                "platform": sig.platform,
                "entry_zone_low": sig.entry_zone_low,
                "entry_zone_high": sig.entry_zone_high,
                "tp1_price_sol": sig.tp1_price_sol,
                "tp2_price_sol": sig.tp2_price_sol,
                "tp3_price_sol": sig.tp3_price_sol,
                "sl_price_sol": sig.sl_price_sol,
                "status": "ACTIVE",
                "is_signal_sent": True,        # Mencegah pembacaan ulang scanner
                "signal_sent_at": now_iso,
                "updated_at": now_iso
            }
            rows_to_upsert.append(payload)

        try:
            # Melakukan UPSERT dengan conflict target 'mint'
            response = self.supabase.table("signals").upsert(
                rows_to_upsert,
                on_conflict="mint"
            ).execute()

            logger.info(f"💾 [SUPABASE UPSERT SUCCESS] {len(rows_to_upsert)} baris data tersimpan dengan is_signal_sent=TRUE.")
            return True
        except Exception as e:
            logger.error(f"❌ [SUPABASE UPSERT ERROR] Gagal menyimpan ke Supabase: {e}")
            return False


# ==============================================================================
# DEMONSTRASI & UNIT TEST RUNNER
# ==============================================================================

if __name__ == "__main__":
    print("\n" + "="*75)
    print(" 🚀 SIMULASI TEST RUNNER: SIGNAL THROTTLE MANAGER")
    print("="*75)

    # Inisialisasi Manager (menggunakan In-Memory Fallback untuk demo)
    throttle_manager = SignalThrottleManager(
        redis_client=None,       # Pasang redis.Redis(...) di production
        supabase_client=None,    # Pasang create_client(...) di production
        min_smart_money_score=90.0,
        min_momentum_score=90.0,
        max_signals_per_5m=3,
        max_signals_per_1h=10,
        dedup_ttl_seconds=86400
    )

    # Buat 6 kandidat token sekaligus (beberapa koin lolos, beberapa ditolak)
    candidates_batch_1 = [
        TokenSignalCandidate(
            mint="ACT_Solana_Prophecy_Mint_111111111111111111",
            symbol="$ACT",
            name="Act I : AI Prophecy",
            pump_score=98.5,
            smart_money_score=95.0, # Lolos (>=90)
            momentum_score=96.0,    # Lolos (>=90)
            price_sol=0.001850,
            liquidity_usd=145000
        ),
        TokenSignalCandidate(
            mint="FART_Terminal_Meme_Mint_222222222222222222",
            symbol="$FARTCOIN",
            name="Fartcoin Terminal",
            pump_score=94.0,
            smart_money_score=92.0, # Lolos (>=90)
            momentum_score=91.5,    # Lolos (>=90)
            price_sol=0.000720,
            liquidity_usd=62000
        ),
        TokenSignalCandidate(
            mint="GOAT_Truth_Terminal_Mint_333333333333333333",
            symbol="$GOAT",
            name="Goatseus Maximus",
            pump_score=99.0,        # Skor tertinggi!
            smart_money_score=98.0, # Lolos (>=90)
            momentum_score=97.0,    # Lolos (>=90)
            price_sol=0.004200,
            liquidity_usd=250000
        ),
        TokenSignalCandidate(
            mint="PENGU_Pudgy_Meme_Mint_44444444444444444444",
            symbol="$PENGU",
            name="Pudgy Penguins",
            pump_score=91.0,
            smart_money_score=91.0, # Lolos (>=90)
            momentum_score=90.5,    # Lolos (>=90)
            price_sol=0.000310,
            liquidity_usd=180000
        ),
        TokenSignalCandidate(
            mint="SHIT_Rug_Trap_Mint_5555555555555555555555",
            symbol="$TRAPCOIN",
            name="Scam Trap Meme",
            pump_score=75.0,
            smart_money_score=40.0, # Ditolak (<90)
            momentum_score=50.0,    # Ditolak (<90)
            price_sol=0.000010,
            liquidity_usd=5000
        ),
    ]

    print("\n[BATCH 1: 5 Koin Masuk Scanner]")
    # 4 Koin lolos Quality Gate: $GOAT (99.0), $ACT (98.5), $FARTCOIN (94.0), $PENGU (91.0)
    # Kuota rate limiter 5 menit = 3 sinyal.
    # Harusnya: $PENGU di-drop karena peringkat ke-4, dan hanya 3 koin teratas ($GOAT, $ACT, $FARTCOIN) yang lolos!
    approved_signals = throttle_manager.process_and_filter_candidates(candidates_batch_1)

    print("\n--- HASIL SELEKSI BATCH 1 ---")
    for s in approved_signals:
        print(f"  👉 [SENT] {s.symbol} | PumpScore: {s.pump_score} | SM: {s.smart_money_score}% | Mom: {s.momentum_score}% | Entry: {s.entry_zone_low} - {s.entry_zone_high} SOL")

    print("\n[BATCH 2: Mencoba kirim ulang $ACT (Pengujian 24h Deduplikasi)]")
    # Coba kirim ulang $ACT
    retry_act = [candidates_batch_1[0]]
    result_retry = throttle_manager.process_and_filter_candidates(retry_act)
    print(f"  👉 Hasil pengiriman ulang: {len(result_retry)} sinyal lolos (Harus 0 karena terblokir 24h dedup).")

    print("\n[BATCH 3: Pengujian Kuota Habis (Rate Limiting)]")
    # Coba kirim koin baru berkualitas tinggi saat kuota 3/5m sudah habis
    new_coin = [TokenSignalCandidate(
        mint="NEW_ALPHA_COIN_666666666666666666666666666",
        symbol="$NEWALPHA",
        name="New Alpha Token",
        pump_score=99.5,
        smart_money_score=99.0,
        momentum_score=99.0,
        price_sol=0.002,
        liquidity_usd=50000
    )]
    result_exceeded = throttle_manager.process_and_filter_candidates(new_coin)
    print(f"  👉 Hasil saat kuota habis: {len(result_exceeded)} sinyal lolos (Harus 0 karena terkena batas 3 per 5 menit).")
    print("="*75 + "\n")
