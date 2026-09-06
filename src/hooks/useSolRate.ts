'use client';

import { useState, useEffect, useCallback } from 'react';

export interface SolRateData {
  solUsd: number;
  usdIdr: number;
  solIdr: number;
  change24h: number;
  timestamp: number;
}

export function useSolRate() {
  const [rate, setRate] = useState<SolRateData>({
    solUsd: 103.20,
    usdIdr: 17650,
    solIdr: 1821480,
    change24h: 1.5,
    timestamp: Date.now()
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchRate = useCallback(async () => {
    try {
      const res = await fetch('/api/sol-rate');
      if (res.ok) {
        const data = await res.json();
        setRate({
          solUsd: data.solUsd,
          usdIdr: data.usdIdr,
          solIdr: data.solIdr,
          change24h: data.change24h,
          timestamp: data.timestamp
        });
      }
    } catch (err) {
      console.warn('Could not fetch real-time SOL rate, using fallback', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRate();
    // Poll every 30 seconds
    const interval = setInterval(fetchRate, 30_000);
    return () => clearInterval(interval);
  }, [fetchRate]);

  // Format SOL to Full Indonesian Rupiah (e.g. "Rp 1.823.957")
  const formatIdr = useCallback(
    (solAmount: number) => {
      const totalIdr = Math.round(solAmount * rate.solIdr);
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0
      }).format(totalIdr);
    },
    [rate.solIdr]
  );

  // Format SOL to Compact Rupiah (e.g. "Rp 1.82 Jt" or "Rp 350 Rb")
  const formatIdrShort = useCallback(
    (solAmount: number) => {
      const totalIdr = solAmount * rate.solIdr;
      if (totalIdr >= 1_000_000_000) {
        return `Rp ${(totalIdr / 1_000_000_000).toFixed(2)} M`;
      }
      if (totalIdr >= 1_000_000) {
        return `Rp ${(totalIdr / 1_000_000).toFixed(2)} Jt`;
      }
      if (totalIdr >= 1_000) {
        return `Rp ${(totalIdr / 1_000).toFixed(0)} Rb`;
      }
      return `Rp ${Math.round(totalIdr)}`;
    },
    [rate.solIdr]
  );

  // Format SOL to USD (e.g. "$103.20")
  const formatUsd = useCallback(
    (solAmount: number) => {
      const totalUsd = solAmount * rate.solUsd;
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(totalUsd);
    },
    [rate.solUsd]
  );

  // Convert raw IDR to SOL (e.g. Rp 500,000 -> 0.274 SOL)
  const convertIdrToSol = useCallback(
    (idrAmount: number) => {
      if (rate.solIdr <= 0) return 0;
      return idrAmount / rate.solIdr;
    },
    [rate.solIdr]
  );

  // Convert raw USD to SOL
  const convertUsdToSol = useCallback(
    (usdAmount: number) => {
      if (rate.solUsd <= 0) return 0;
      return usdAmount / rate.solUsd;
    },
    [rate.solUsd]
  );

  return {
    rate,
    isLoading,
    formatIdr,
    formatIdrShort,
    formatUsd,
    convertIdrToSol,
    convertUsdToSol,
    refetch: fetchRate
  };
}
