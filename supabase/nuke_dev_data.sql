-- ==============================================================================
-- ALZASNIPED.MY.ID - DATABASE NUKE & DEV DATA PURGE SCRIPT
-- Role: Senior Supabase Database Administrator & Full-Stack Engineer
-- Target: Supabase PostgreSQL (Production Transition)
--
-- ATURAN KRUSIAL:
-- 1. MENGGUNAKAN 'TRUNCATE TABLE ... RESTART IDENTITY CASCADE'
--    - Mengosongkan data transaksi/dummy secara instan & hemat WAL.
--    - Mereset sequence auto-increment (identity column) kembali ke 1.
--    - CASCADE memastikan data anak pada foreign key relasi terhapus bersih.
-- 2. TIDAK ADA 'DROP TABLE' (STRICTLY FORBIDDEN)
--    - Struktur skema, kolom, tipe data, indeks, constraint, triggers,
--      dan Row Level Security (RLS) policies TETAP UTUH 100%.
-- ==============================================================================

BEGIN;

-- 1. Nonaktifkan session replication sementara untuk mempercepat truncate foreign keys
SET session_replication_role = 'replica';

-- 2. Eksekusi TRUNCATE TABLE dengan RESTART IDENTITY CASCADE
-- Menghapus data simulasi, log VPS statis, koin pengujian, sinyal palsu, dan metrik PNL
DO $$
DECLARE
    tbl text;
    target_tables text[] := ARRAY[
        'signals',
        'signals_history',
        'active_positions',
        'vps_metrics',
        'terminal_logs',
        'trade_history'
    ];
BEGIN
    FOREACH tbl IN ARRAY target_tables
    LOOP
        IF EXISTS (
            SELECT FROM pg_tables 
            WHERE schemaname = 'public' 
              AND tablename = tbl
        ) THEN
            EXECUTE format('TRUNCATE TABLE public.%I RESTART IDENTITY CASCADE;', tbl);
            RAISE NOTICE 'Berhasil TRUNCATE TABLE public.%I RESTART IDENTITY CASCADE', tbl;
        ELSE
            RAISE NOTICE 'Tabel public.%I belum ada, lewati.', tbl;
        END IF;
    END LOOP;
END $$;

-- 3. Kembalikan session_replication_role ke default
SET session_replication_role = 'origin';

COMMIT;

-- ==============================================================================
-- 4. STORED PROCEDURE RPC: public.nuke_all_dev_data()
-- Digunakan oleh API endpoint /api/admin/nuke-database untuk eksekusi 1-klik
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.nuke_all_dev_data()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    tbl text;
    target_tables text[] := ARRAY[
        'signals',
        'signals_history',
        'active_positions',
        'vps_metrics',
        'terminal_logs',
        'trade_history'
    ];
    purged_list text[] := ARRAY[]::text[];
BEGIN
    FOREACH tbl IN ARRAY target_tables
    LOOP
        IF EXISTS (
            SELECT FROM pg_tables 
            WHERE schemaname = 'public' 
              AND tablename = tbl
        ) THEN
            EXECUTE format('TRUNCATE TABLE public.%I RESTART IDENTITY CASCADE;', tbl);
            purged_list := array_append(purged_list, tbl);
        END IF;
    END LOOP;

    RETURN json_build_object(
        'success', true,
        'message', 'Semua data transaksi pengujian berhasil dikosongkan (TRUNCATE RESTART IDENTITY CASCADE)',
        'purged_tables', purged_list,
        'executed_at', now()
    );
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'error', SQLERRM,
        'executed_at', now()
    );
END;
$$;

-- Izin eksekusi RPC untuk service_role dan anon/authenticated (jika menggunakan API)
GRANT EXECUTE ON FUNCTION public.nuke_all_dev_data() TO service_role;
GRANT EXECUTE ON FUNCTION public.nuke_all_dev_data() TO anon;
GRANT EXECUTE ON FUNCTION public.nuke_all_dev_data() TO authenticated;

-- ==============================================================================
-- 5. QUERY VERIFIKASI POST-EXECUTION (Jalankan untuk memastikan hitungan baris = 0)
-- ==============================================================================
SELECT 
    schemaname, 
    relname AS table_name, 
    n_live_tup AS estimated_row_count
FROM pg_stat_user_tables
WHERE relname IN (
    'signals', 
    'signals_history', 
    'active_positions', 
    'vps_metrics', 
    'terminal_logs', 
    'trade_history'
)
ORDER BY relname;
