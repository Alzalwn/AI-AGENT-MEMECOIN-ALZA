/**
 * PM2 Ecosystem Config — alzasniped.my.id Production Server
 * ============================================================
 * Mengelola 2 proses utama:
 *   1. grok-trencher   → Next.js Web Server (platform sinyal utama)
 *   2. grok-ai-signal  → Signal Daemon (pemantau blockchain 24/7)
 *
 * Deploy ke VPS:
 *   pm2 start ecosystem.config.js --env production
 *   pm2 save
 *   pm2 startup
 *
 * Monitoring:
 *   pm2 monit
 *   pm2 logs grok-trencher --lines 100
 */

module.exports = {
  apps: [

    // ──────────────────────────────────────────────────────────────
    // PROSES 1: Next.js Web Server (Platform Sinyal Utama)
    // ──────────────────────────────────────────────────────────────
    {
      name: 'grok-trencher',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '/root/AI-AGENT-MEMECOIN-ALZA',

      // — Resource Guards —
      max_memory_restart: '900M',    // Restart otomatis sebelum OOM Kill
      instances: 1,
      exec_mode: 'fork',

      // — Restart Policy: Eksponensial backoff, batas 10x berturut-turut —
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,           // Jeda minimum 5 detik antar restart
      exp_backoff_restart_delay: 100, // Backoff: 100ms, 200ms, 400ms... maks 16s

      // — File Watching: DINONAKTIFKAN di production (mencegah restart liar) —
      watch: false,

      // — Logging —
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      out_file: '/root/.pm2/logs/grok-trencher-out.log',
      error_file: '/root/.pm2/logs/grok-trencher-err.log',
      log_file: '/root/.pm2/logs/grok-trencher-combined.log',

      // — Environment: Production —
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        // Supabase
        NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        // Solana RPC
        NEXT_PUBLIC_SOLANA_RPC_URL: process.env.NEXT_PUBLIC_SOLANA_RPC_URL || '',
        // Telegram
        NEXT_PUBLIC_TELEGRAM_BOT_TOKEN: process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN || '',
        NEXT_PUBLIC_TELEGRAM_CHAT_ID: process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID || '',
        TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
        TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID || '',
        // Admin
        ADMIN_PASSCODE: process.env.ADMIN_PASSCODE || '',
        // xAI Grok
        NEXT_PUBLIC_GROK_API_KEY: process.env.NEXT_PUBLIC_GROK_API_KEY || '',
        // Gemini AI
        NEXT_PUBLIC_GEMINI_API_KEY: process.env.NEXT_PUBLIC_GEMINI_API_KEY || '',
      },

      // — Environment: Development (for local testing with pm2) —
      env_development: {
        NODE_ENV: 'development',
        PORT: 3000,
      }
    },

    // ──────────────────────────────────────────────────────────────
    // PROSES 2: AI Signal Daemon (Pemantau Blockchain 24/7)
    // Opsional — aktifkan jika autonomous-worker dijalankan terpisah
    // ──────────────────────────────────────────────────────────────
    // {
    //   name: 'grok-ai-signal',
    //   script: 'scripts/autonomous-worker.ts',
    //   interpreter: 'node',
    //   interpreter_args: '--loader ts-node/esm',
    //   cwd: '/root/AI-AGENT-MEMECOIN-ALZA',
    //
    //   // — Resource Guards —
    //   max_memory_restart: '400M',
    //   instances: 1,
    //   exec_mode: 'fork',
    //
    //   // — Restart Policy —
    //   autorestart: true,
    //   max_restarts: 10,
    //   restart_delay: 8000,
    //   exp_backoff_restart_delay: 200,
    //
    //   watch: false,
    //
    //   // — Logging —
    //   log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    //   merge_logs: true,
    //   out_file: '/root/.pm2/logs/grok-ai-signal-out.log',
    //   error_file: '/root/.pm2/logs/grok-ai-signal-err.log',
    //
    //   env_production: {
    //     NODE_ENV: 'production',
    //   }
    // }

  ]
};
