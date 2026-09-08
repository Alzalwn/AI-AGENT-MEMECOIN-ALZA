/**
 * Supabase Client Instance (Graceful Initializer)
 *
 * Menggunakan key NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (format baru Supabase SSR).
 * Jika kredensial belum diisi di .env.local, client mengembalikan null secara aman
 * tanpa menyebabkan error kompilasi Next.js atau runtime crash.
 *
 * Untuk penggunaan di Server Components / API Routes:
 *   → import { createClient } from '@/utils/supabase/server'
 *
 * Untuk penggunaan di Client Components / hooks:
 *   → import { createClient } from '@/utils/supabase/client'
 *
 * Instance ini (supabase) dipertahankan untuk kompatibilitas mundur dengan
 * kode yang sudah ada (misalnya: useSupabaseRealtime hook).
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
// Support both old ANON_KEY and new PUBLISHABLE_KEY format
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  '';

export const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey)
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
