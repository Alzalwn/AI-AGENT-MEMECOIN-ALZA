import { useState, useEffect } from 'react';

/**
 * useHydratedStore
 * Custom hook untuk menyelesaikan masalah Next.js SSR Hydration Mismatch
 * saat mengakses state dari Local Storage (Zustand Persist).
 *
 * Pola Penggunaan:
 * const takeProfitPct = useHydratedStore(useSettingsStore, (s) => s.takeProfitPct);
 * // Nilai akan aman dan tidak memicu "Text content does not match server-rendered HTML"
 */
export const useHydratedStore = <T, F>(
  store: (callback: (state: T) => unknown) => unknown,
  callback: (state: T) => F
): F | undefined => {
  const result = store(callback) as F;
  const [data, setData] = useState<F>();

  useEffect(() => {
    setData(result);
  }, [result]);

  return data;
};

/**
 * useIsMounted
 * Hook penolong sederhana untuk memastikan komponen sudah berada di browser (client-side)
 * sebelum merender elemen yang bergantung langsung pada local storage.
 */
export const useIsMounted = (): boolean => {
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted;
};
