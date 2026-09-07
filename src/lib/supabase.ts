import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Supabase Client Instance (Graceful Initializer)
 * Jika kredensial belum diisi di .env.local, client mengembalikan null secara aman
 * tanpa menyebabkan error kompilasi Next.js atau runtime crash.
 */
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Struktur Tabel Rekomendasi di Supabase:
 * 
 * CREATE TABLE public.user_bot_settings (
 *   user_id TEXT PRIMARY KEY,
 *   settings JSONB NOT NULL,
 *   updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
 * );
 */
export interface SupabaseBotSettingsRow {
  user_id: string;
  settings: Record<string, any>;
  updated_at?: string;
}
