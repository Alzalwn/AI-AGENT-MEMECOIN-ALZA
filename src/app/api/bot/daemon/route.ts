import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);
export const dynamic = 'force-dynamic';

const STATUS_FILE = path.join(process.cwd(), 'data', 'bot-status.json');

// Helper to check PM2 status of alpha-signal-bot or grok-ai-signal
async function getPm2DaemonStatus() {
  try {
    const { stdout } = await execAsync('pm2 jlist');
    const list = JSON.parse(stdout);
    const daemon = list.find((p: any) => p.name === 'alpha-signal-bot' || p.name === 'grok-ai-signal');
    if (daemon) {
      return {
        isRunning: daemon.pm2_env?.status === 'online',
        pm2Status: daemon.pm2_env?.status || 'stopped',
        pid: daemon.pid,
        uptime: daemon.pm2_env?.pm_uptime ? Math.floor((Date.now() - daemon.pm2_env.pm_uptime) / 1000) : 0,
        memoryMb: daemon.monit?.memory ? Math.round(daemon.monit.memory / 1024 / 1024) : 0,
        cpu: daemon.monit?.cpu || 0,
        restartCount: daemon.pm2_env?.restart_time || 0
      };
    }
  } catch (err) {
    // PM2 might not be available or command failed
  }
  return {
    isRunning: false,
    pm2Status: 'offline',
    pid: null,
    uptime: 0,
    memoryMb: 0,
    cpu: 0,
    restartCount: 0
  };
}

export async function GET() {
  const pm2 = await getPm2DaemonStatus();
  let fileData = null;
  if (fs.existsSync(STATUS_FILE)) {
    try {
      fileData = JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8'));
    } catch {}
  }

  // Check .env.local file directly to inspect server configuration
  const envLocalPath = path.join(process.cwd(), '.env.local');
  let envBotToken = process.env.TELEGRAM_BOT_TOKEN || process.env.NEXT_PUBLIC_TELEGRAM_BOT_TOKEN || '';
  let envChatId = process.env.TELEGRAM_CHAT_ID || process.env.NEXT_PUBLIC_TELEGRAM_CHAT_ID || '';

  if (fs.existsSync(envLocalPath)) {
    try {
      const envContent = fs.readFileSync(envLocalPath, 'utf8');
      const tokenMatch = envContent.match(/TELEGRAM_BOT_TOKEN=(.*)/);
      if (tokenMatch && tokenMatch[1]) envBotToken = tokenMatch[1].trim().replace(/^['"]|['"]$/g, '');
      const chatMatch = envContent.match(/TELEGRAM_CHAT_ID=(.*)/);
      if (chatMatch && chatMatch[1]) envChatId = chatMatch[1].trim().replace(/^['"]|['"]$/g, '');
    } catch {}
  }

  const hasTelegram = Boolean(envBotToken && envChatId);

  return NextResponse.json({
    success: true,
    pm2,
    fileData,
    telegramConfigured: hasTelegram,
    telegramChatId: envChatId,
    maskedBotToken: envBotToken ? `${envBotToken.slice(0, 6)}...${envBotToken.slice(-4)}` : '',
    rawBotToken: envBotToken || ''
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body.action; // 'start' | 'stop' | 'restart' | 'save_config' | 'test_telegram'

    // ─── ACTION: SAVE CONFIG OTOMATIS KE .env.local ───
    if (action === 'save_config') {
      const { botToken, chatId } = body;
      if (!botToken || !chatId) {
        return NextResponse.json({ success: false, error: 'Bot Token dan Chat ID wajib diisi' }, { status: 400 });
      }

      const envLocalPath = path.join(process.cwd(), '.env.local');
      let envContent = '';
      if (fs.existsSync(envLocalPath)) {
        envContent = fs.readFileSync(envLocalPath, 'utf8');
      }

      // Update or append TELEGRAM_BOT_TOKEN
      if (/TELEGRAM_BOT_TOKEN=.*/.test(envContent)) {
        envContent = envContent.replace(/TELEGRAM_BOT_TOKEN=.*/g, `TELEGRAM_BOT_TOKEN=${botToken.trim()}`);
      } else {
        envContent += `\nTELEGRAM_BOT_TOKEN=${botToken.trim()}`;
      }

      // Update or append TELEGRAM_CHAT_ID
      if (/TELEGRAM_CHAT_ID=.*/.test(envContent)) {
        envContent = envContent.replace(/TELEGRAM_CHAT_ID=.*/g, `TELEGRAM_CHAT_ID=${chatId.trim()}`);
      } else {
        envContent += `\nTELEGRAM_CHAT_ID=${chatId.trim()}`;
      }

      fs.writeFileSync(envLocalPath, envContent.trim() + '\n', 'utf8');

      // Update runtime process.env
      process.env.TELEGRAM_BOT_TOKEN = botToken.trim();
      process.env.TELEGRAM_CHAT_ID = chatId.trim();

      return NextResponse.json({
        success: true,
        message: '✅ Konfigurasi Telegram berhasil disimpan otomatis ke server (.env.local)!',
        telegramConfigured: true,
        telegramChatId: chatId.trim()
      });
    }

    // ─── ACTION: TEST TELEGRAM DIRECT FROM SERVER ───
    if (action === 'test_telegram') {
      const { botToken, chatId } = body;
      const token = (botToken || process.env.TELEGRAM_BOT_TOKEN || '').trim();
      const chat = (chatId || process.env.TELEGRAM_CHAT_ID || '').trim();

      if (!token || !chat) {
        return NextResponse.json({ success: false, error: 'Bot Token dan Chat ID belum diisi' }, { status: 400 });
      }

      const testMsg = `🤖 *Solana Alpha Agent Test (VPS)*\n\n✅ Koneksi Telegram VPS berhasil terhubung!\n🕒 Jam: ${new Date().toLocaleTimeString()}\n📡 Status: Daemon 24/7 Siap Menembakkan Sinyal ke Channel!`;
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chat,
          text: testMsg,
          parse_mode: 'Markdown'
        })
      });

      const data = await res.json();
      if (!data.ok) {
        return NextResponse.json({ success: false, error: data.description || 'Gagal mengirim pesan ke Telegram' }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: '✅ Pesan tes berhasil terkirim ke Channel/Grup Telegram Anda!'
      });
    }

    if (action === 'start') {
      // Start scripts/signal-daemon.mjs via PM2
      const scriptPath = path.join(process.cwd(), 'scripts', 'signal-daemon.mjs');
      await execAsync(`pm2 start "${scriptPath}" --name "alpha-signal-bot" --update-env || pm2 restart alpha-signal-bot`);
      await execAsync('pm2 save').catch(() => {});
      const pm2 = await getPm2DaemonStatus();
      return NextResponse.json({
        success: true,
        message: 'Daemon 24/7 berhasil dinyalakan di VPS via PM2!',
        pm2
      });
    }

    if (action === 'stop') {
      await execAsync('pm2 stop alpha-signal-bot').catch(() => {});
      await execAsync('pm2 save').catch(() => {});
      const pm2 = await getPm2DaemonStatus();
      return NextResponse.json({
        success: true,
        message: 'Daemon 24/7 berhasil dihentikan.',
        pm2
      });
    }

    if (action === 'restart') {
      await execAsync('pm2 restart alpha-signal-bot || pm2 start scripts/signal-daemon.mjs --name "alpha-signal-bot"');
      await execAsync('pm2 save').catch(() => {});
      const pm2 = await getPm2DaemonStatus();
      return NextResponse.json({
        success: true,
        message: 'Daemon 24/7 berhasil dimuat ulang.',
        pm2
      });
    }

    return NextResponse.json({ success: false, error: 'Aksi tidak valid' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Gagal menjalankan perintah' }, { status: 500 });
  }
}
