'use client';

/**
 * useWalletBalance — Real-Time Solana Hot Wallet Balance Listener
 *
 * Menggunakan connection.onAccountChange() dari @solana/web3.js sebagai PRIMARY listener.
 * Tidak menggunakan polling (setInterval + getBalance) — murni event-driven via WebSocket RPC.
 *
 * Fitur:
 * - Subscription langsung ke RPC node via WebSocket (Helius/QuikNode/PublicNode)
 * - Cleanup otomatis via removeAccountChangeListener saat unmount / publicKey berubah
 * - Animasi flash visual: flashState 'up' (hijau) / 'down' (merah) / 'neutral' selama 1.2 detik
 * - Fallback polling via /api/wallet/balance jika WebSocket subscription gagal
 * - isLive: true jika WebSocket aktif, false jika fallback polling
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';

export type BalanceFlashState = 'up' | 'down' | 'neutral';

export interface WalletBalanceResult {
  /** Saldo SOL saat ini */
  balanceSol: number;
  /** True jika terhubung via WebSocket onAccountChange (real-time), false jika polling */
  isLive: boolean;
  /** Timestamp terakhir kali balance diupdate */
  lastUpdated: number;
  /** State untuk animasi flash UI: 'up' (hijau), 'down' (merah), 'neutral' */
  flashState: BalanceFlashState;
  /** Manual refresh fallback */
  refresh: () => Promise<void>;
}

const FLASH_DURATION_MS = 1200;

/**
 * Hook untuk mendapatkan saldo SOL wallet secara real-time via onAccountChange subscription.
 *
 * @param publicKey - Full public key string (base58), atau null/undefined jika wallet belum terhubung
 * @param initialBalance - Saldo awal untuk inisialisasi sebelum subscription aktif
 */
export function useWalletBalance(
  publicKey: string | null | undefined,
  initialBalance: number = 0
): WalletBalanceResult {
  const [balanceSol, setBalanceSol] = useState<number>(initialBalance);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
  const [flashState, setFlashState] = useState<BalanceFlashState>('neutral');

  const prevBalanceRef = useRef<number>(initialBalance);
  const flashTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Terapkan animasi flash: hijau jika saldo naik, merah jika turun.
   * Reset otomatis ke 'neutral' setelah FLASH_DURATION_MS.
   */
  const triggerFlash = useCallback((newBalance: number, oldBalance: number) => {
    if (Math.abs(newBalance - oldBalance) < 0.000001) return; // Abaikan perubahan noise

    const direction: BalanceFlashState = newBalance > oldBalance ? 'up' : 'down';
    setFlashState(direction);

    if (flashTimeoutRef.current) {
      clearTimeout(flashTimeoutRef.current);
    }
    flashTimeoutRef.current = setTimeout(() => {
      setFlashState('neutral');
      flashTimeoutRef.current = null;
    }, FLASH_DURATION_MS);
  }, []);

  /**
   * Update balance state dengan animasi flash dan timestamp.
   */
  const updateBalance = useCallback(
    (newBalance: number) => {
      const rounded = +newBalance.toFixed(6);
      const prev = prevBalanceRef.current;
      if (Math.abs(rounded - prev) < 0.000001) return; // Deduplicate no-change events

      triggerFlash(rounded, prev);
      prevBalanceRef.current = rounded;
      setBalanceSol(rounded);
      setLastUpdated(Date.now());
    },
    [triggerFlash]
  );

  /**
   * Fallback: Ambil saldo via server API (CORS-safe, dengan RPC failover internal).
   */
  const fetchBalanceViaApi = useCallback(
    async (key: string): Promise<number | null> => {
      try {
        const res = await fetch(`/api/wallet/balance?address=${encodeURIComponent(key)}`, {
          signal: AbortSignal.timeout(6000)
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && typeof data.balanceSol === 'number') {
            return data.balanceSol;
          }
        }
      } catch {
        // Fallback gagal — tidak ada saldo baru
      }
      return null;
    },
    []
  );

  /**
   * Manual refresh: Paksa fetch via API tanpa menunggu event WebSocket.
   */
  const refresh = useCallback(async () => {
    if (!publicKey) return;
    const balance = await fetchBalanceViaApi(publicKey);
    if (balance !== null) {
      updateBalance(balance);
    }
  }, [publicKey, fetchBalanceViaApi, updateBalance]);

  /**
   * EFFECT UTAMA: Setup onAccountChange WebSocket subscription.
   * Runs setiap kali publicKey berubah (wallet disconnect / ganti wallet).
   */
  useEffect(() => {
    if (!publicKey || publicKey.length < 32) {
      setIsLive(false);
      return;
    }

    const rpcUrl =
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
      'https://mainnet.helius-rpc.com/?api-key=b1346052-9ac3-47b8-89ec-2ce7e88fa91b';

    // Gunakan Connection baru khusus untuk subscription agar tidak konflik
    // dengan Connection yang dipakai oleh ExecutionManager
    const connection = new Connection(rpcUrl, {
      commitment: 'confirmed',
      wsEndpoint: rpcUrl.replace('https://', 'wss://').replace('http://', 'ws://')
    });

    let subscriptionId: number | null = null;
    let isCleaned = false;
    let fallbackInterval: ReturnType<typeof setInterval> | null = null;

    const setupSubscription = async () => {
      // 1. Parse PublicKey — jika gagal, key tidak valid
      let pubKey: PublicKey;
      try {
        pubKey = new PublicKey(publicKey);
      } catch {
        console.warn('[useWalletBalance] Invalid public key:', publicKey);
        setIsLive(false);
        return;
      }

      // 2. Ambil saldo awal menggunakan connection.getBalance('confirmed')
      try {
        const lamports = await connection.getBalance(pubKey, 'confirmed');
        if (!isCleaned) {
          const initialSol = +(lamports / 1_000_000_000).toFixed(6);
          updateBalance(initialSol);
        }
      } catch (err) {
        // Fallback ke fetch API jika RPC langsung diblokir CORS
        const initial = await fetchBalanceViaApi(publicKey);
        if (initial !== null && !isCleaned) {
          updateBalance(initial);
        }
      }

      // 3. Coba daftarkan onAccountChange WebSocket subscription
      try {
        subscriptionId = connection.onAccountChange(
          pubKey,
          (accountInfo) => {
            if (isCleaned) return;
            // Konversi lamports ke SOL (1 SOL = 1_000_000_000 lamports)
            const newBalance = +(accountInfo.lamports / 1_000_000_000).toFixed(6);
            updateBalance(newBalance);
          },
          'confirmed' // Commitment level: tunggu 2/3 validator confirm
        );

        if (!isCleaned) {
          setIsLive(true);
          console.log(
            `[useWalletBalance] ✅ onAccountChange subscription aktif (subId: ${subscriptionId}) untuk ${publicKey.slice(0, 8)}...`
          );
        }
      } catch (wsErr) {
        // WebSocket gagal — fallback ke polling 10 detik
        console.warn('[useWalletBalance] WebSocket subscription gagal, menggunakan polling fallback:', wsErr);
        setIsLive(false);

        if (!isCleaned) {
          fallbackInterval = setInterval(async () => {
            if (isCleaned) return;
            const balance = await fetchBalanceViaApi(publicKey);
            if (balance !== null && !isCleaned) {
              updateBalance(balance);
            }
          }, 10_000);
        }
      }
    };

    setupSubscription();

    // CLEANUP: Hapus listener saat component unmount atau publicKey berubah
    // Ini mencegah memory leak dan duplicate subscription
    return () => {
      isCleaned = true;
      setIsLive(false);

      // Hapus WebSocket subscription
      if (subscriptionId !== null) {
        connection
          .removeAccountChangeListener(subscriptionId)
          .then(() => {
            console.log(
              `[useWalletBalance] 🔌 onAccountChange listener dihapus (subId: ${subscriptionId})`
            );
          })
          .catch((err) => {
            console.warn('[useWalletBalance] Gagal remove listener:', err);
          });
      }

      // Hapus fallback polling interval
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
        fallbackInterval = null;
      }

      // Hapus flash timeout
      if (flashTimeoutRef.current) {
        clearTimeout(flashTimeoutRef.current);
        flashTimeoutRef.current = null;
      }
    };
  }, [publicKey, fetchBalanceViaApi, updateBalance]);

  // Sinkronisasi jika initialBalance berubah dari luar (misal: setelah trade closed)
  useEffect(() => {
    if (initialBalance > 0 && Math.abs(initialBalance - prevBalanceRef.current) > 0.0001) {
      updateBalance(initialBalance);
    }
  }, [initialBalance, updateBalance]);

  return {
    balanceSol,
    isLive,
    lastUpdated,
    flashState,
    refresh
  };
}
