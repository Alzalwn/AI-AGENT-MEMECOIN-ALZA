'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';

export type SupabaseRealtimeStatus =
  | 'CONNECTING'
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'UNAVAILABLE'; // Supabase belum dikonfigurasi di env

export interface SupabaseRealtimeState {
  status: SupabaseRealtimeStatus;
  isConnected: boolean;
  lastEventAt: number | null; // timestamp ms
  eventCount: number;
}

/**
 * useSupabaseRealtime — Custom React Hook
 *
 * Membuka Supabase Realtime channel ke tabel signals_history.
 * Melacak status koneksi dan event yang masuk secara live.
 *
 * Penggunaan:
 * const { status, isConnected, lastEventAt, eventCount } = useSupabaseRealtime();
 */
export function useSupabaseRealtime(): SupabaseRealtimeState {
  const [status, setStatus] = useState<SupabaseRealtimeStatus>(
    supabase ? 'CONNECTING' : 'UNAVAILABLE'
  );
  const [lastEventAt, setLastEventAt] = useState<number | null>(null);
  const [eventCount, setEventCount] = useState(0);
  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>['channel']> | null>(null);

  useEffect(() => {
    // Jika Supabase belum dikonfigurasi → graceful UNAVAILABLE state
    if (!supabase) {
      setStatus('UNAVAILABLE');
      return;
    }

    setStatus('CONNECTING');

    const channel = supabase!
      .channel('gt-realtime-signals-history')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'signals_history',
        },
        (_payload) => {
          setLastEventAt(Date.now());
          setEventCount((prev) => prev + 1);
        }
      )
      .subscribe((subscribeStatus) => {
        if (subscribeStatus === 'SUBSCRIBED') {
          setStatus('CONNECTED');
        } else if (
          subscribeStatus === 'CLOSED' ||
          subscribeStatus === 'CHANNEL_ERROR'
        ) {
          setStatus('DISCONNECTED');
        } else {
          setStatus('CONNECTING');
        }
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase!.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      setStatus('DISCONNECTED');
    };
  }, []);

  return {
    status,
    isConnected: status === 'CONNECTED',
    lastEventAt,
    eventCount,
  };
}
