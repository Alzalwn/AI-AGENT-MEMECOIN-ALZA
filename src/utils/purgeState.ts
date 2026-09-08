import { useSettingsStore } from '../store/useSettingsStore';

export interface PurgeStateResult {
  success: boolean;
  timestamp: number;
  clearedKeys: string[];
  message: string;
}

/**
 * purgeAllState — Utility Pembersihan Ekstrem Frontend
 * Mereset seluruh Zustand store (dashboardFeed, walletBalance, vetoedCoins, settings)
 * kembali ke initial state (null, [], atau 0), membuang semua data transaksi dari localStorage & sessionStorage,
 * serta menyiarkan event window ('gt_purge_all_state') untuk mereset cache in-memory runtime.
 */
export function purgeAllState(): PurgeStateResult {
  const clearedKeys: string[] = [];

  // 1. Reset Zustand store
  try {
    useSettingsStore.getState().purgeAllState();
  } catch (err) {
    console.warn('[purgeAllState] Warning resetting Zustand store:', err);
  }

  // 2. Clear browser storages (localStorage & sessionStorage)
  if (typeof window !== 'undefined') {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) clearedKeys.push(key);
      }
      localStorage.clear();
      sessionStorage.clear();

      // Dispatch event agar TradingContext dan komponen aktif lainnya mengosongkan state in-memory
      window.dispatchEvent(new CustomEvent('gt_purge_all_state'));
    } catch (err) {
      console.warn('[purgeAllState] Warning clearing browser storages:', err);
    }
  }

  return {
    success: true,
    timestamp: Date.now(),
    clearedKeys,
    message: 'Seluruh state Zustand, preferensi simulasi, localStorage, dan sessionStorage telah dibersihkan secara total.'
  };
}

// Pasang ke global window di browser untuk kemudahan one-click dev run via DevTools console
if (typeof window !== 'undefined') {
  (window as any).purgeAllState = purgeAllState;
}
