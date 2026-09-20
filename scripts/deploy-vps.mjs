import { Client } from 'ssh2';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const password = process.argv[2] || process.env.VPS_PASSWORD || 'Alza0838';
const username = process.argv[3] || process.env.VPS_USERNAME || 'AlzaSniped';
const host = process.argv[4] || process.env.VPS_HOST || '103.30.194.148';
const port = parseInt(process.env.VPS_PORT || '22', 10);

console.log('===============================================================');
console.log(`🚀 MEMULAI DEPLOYMENT KE VPS (${host}) DARI LOKAL (NO OOM)`);
console.log(`👤 User: ${username}`);
console.log('===============================================================\n');

try {
  console.log('🔨 [1/6] Menjalankan build secara lokal...');
  execSync('npm run build', { stdio: 'inherit' });
  
  console.log('\\n🗜️ [2/6] Mengompresi folder build (.next)...');
  execSync('tar -czf next-build.tar.gz .next', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Gagal saat melakukan build atau kompresi lokal:', error.message);
  process.exit(1);
}

const conn = new Client();

conn
  .on('ready', () => {
    console.log('\\n✅ SSH Terhubung berhasil!');
    console.log('📡 [3/6] Mengunggah file build ke VPS (via SFTP)...');
    
    conn.sftp((err, sftp) => {
      if (err) {
        console.error('❌ Gagal membuka sesi SFTP:', err);
        conn.end();
        return;
      }
      
      const localFile = path.resolve('next-build.tar.gz');
      const remoteFile = '/tmp/next-build.tar.gz';
      
      sftp.fastPut(localFile, remoteFile, (err) => {
        if (err) {
          console.error('❌ Gagal mengunggah file:', err);
          conn.end();
          return;
        }
        
        console.log('✅ Upload selesai!');
        console.log('\\n⚡ [4/6] Menjalankan instruksi sinkronisasi di VPS...\\n');

        const remoteCmd = `
set -e
echo "📂 [5/6] Mendeteksi direktori project & menyinkronkan kode..."
if [ -d "$HOME/AI-AGENT-MEMECOIN-ALZA" ]; then
    cd "$HOME/AI-AGENT-MEMECOIN-ALZA"
elif [ -d "/var/www/AI-AGENT-MEMECOIN-ALZA" ]; then
    cd "/var/www/AI-AGENT-MEMECOIN-ALZA"
elif [ -d "AI-AGENT-MEMECOIN-ALZA" ]; then
    cd "AI-AGENT-MEMECOIN-ALZA"
else
    echo "Direktori saat ini: $(pwd)"
fi

git config --global http.version HTTP/1.1 2>/dev/null || true
git fetch origin main
git reset --hard origin/main

echo "⚙️ Memverifikasi dan menyinkronkan .env.local..."
if [ ! -f .env.local ]; then cp .env.example .env.local; fi

if ! grep -q "NEXT_PUBLIC_SUPABASE_URL=" .env.local; then
    echo "NEXT_PUBLIC_SUPABASE_URL=https://bfygzgmsumkyffhlpmzr.supabase.co" >> .env.local
fi
if ! grep -q "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=" .env.local; then
    echo "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_MTq-Kg3ZRbcq_sdLa0SiwQ_3Ggc7Ghn" >> .env.local
fi
if ! grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY=" .env.local; then
    echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_MTq-Kg3ZRbcq_sdLa0SiwQ_3Ggc7Ghn" >> .env.local
fi

echo "📦 Memeriksa dependencies & Mengekstrak build terbaru..."
npm install --production=false

pm2 stop grok-trencher 2>/dev/null || true
rm -rf .next
tar -xzf /tmp/next-build.tar.gz -C ./
rm -f /tmp/next-build.tar.gz

echo "⚡ [6/6] Memuat ulang PM2 service..."
if [ -f "ecosystem.config.js" ]; then
    pm2 startOrReload ecosystem.config.js --env production || pm2 restart grok-trencher || pm2 start npm --name "grok-trencher" -- start
else
    pm2 restart grok-trencher || pm2 start npm --name "grok-trencher" -- start
fi

if pm2 list | grep -q "grok-sniper"; then
    pm2 restart grok-sniper
fi
pm2 save

echo ""
echo "=========================================================="
echo "🎉 DEPLOYMENT LOKAL BERHASIL 100%! RAM VPS AMAN."
echo "🔗 Domain: https://alzasniped.my.id"
echo "=========================================================="
`;

        conn.exec(remoteCmd, (err, stream) => {
          if (err) {
            console.error('❌ Gagal mengeksekusi perintah remote:', err);
            conn.end();
            process.exit(1);
          }

          stream
            .on('close', (code, signal) => {
              console.log('\n🏁 Proses remote selesai dengan kode exit: ' + code);
              conn.end();
              try { fs.unlinkSync('next-build.tar.gz'); } catch (e) {}
              process.exit(code === 0 ? 0 : 1);
            })
            .on('data', (data) => {
              process.stdout.write(data.toString());
            })
            .stderr.on('data', (data) => {
              process.stderr.write(data.toString());
            });
        });
      });
    });
  })
  .on('error', (err) => {
    console.error('❌ Gagal terhubung ke SSH VPS:', err.message);
    process.exit(1);
  })
  .connect({ host, port, username, password, readyTimeout: 60000, keepaliveInterval: 10000, keepaliveCountMax: 10 });
