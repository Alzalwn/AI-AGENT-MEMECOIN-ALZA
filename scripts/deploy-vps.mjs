import { Client } from 'ssh2';

const password = process.argv[2] || process.env.VPS_PASSWORD || 'Alza0838';
const username = process.argv[3] || process.env.VPS_USERNAME || 'AlzaSniped';
const host = process.argv[4] || process.env.VPS_HOST || '103.30.194.148';
const port = parseInt(process.env.VPS_PORT || '22', 10);

console.log('===============================================================');
console.log(`🚀 MEMULAI REMOTE DEPLOYMENT KE VPS (${host})`);
console.log(`👤 User: ${username}`);
console.log('===============================================================\n');

const conn = new Client();

conn
  .on('ready', () => {
    console.log('✅ SSH Terhubung berhasil!');
    console.log('⚡ Menjalankan instruksi update, sync env, dan rebuild di VPS...\n');

    const remoteCmd = `
set -e
echo "📂 [1/5] Mendeteksi direktori project..."
if [ -d "$HOME/AI-AGENT-MEMECOIN-ALZA" ]; then
    cd "$HOME/AI-AGENT-MEMECOIN-ALZA"
elif [ -d "/var/www/AI-AGENT-MEMECOIN-ALZA" ]; then
    cd "/var/www/AI-AGENT-MEMECOIN-ALZA"
elif [ -d "AI-AGENT-MEMECOIN-ALZA" ]; then
    cd "AI-AGENT-MEMECOIN-ALZA"
else
    echo "Direktori saat ini: $(pwd)"
fi

echo "📥 [2/5] Mengambil kode terbaru dari GitHub (main branch)..."
git config --global http.version HTTP/1.1 2>/dev/null || true
git config --global http.lowSpeedLimit 1000 2>/dev/null || true
git config --global http.lowSpeedTime 30 2>/dev/null || true
git fetch origin main
git reset --hard origin/main

echo "⚙️ [3/5] Memverifikasi dan menyinkronkan .env.local..."
if [ ! -f .env.local ]; then
    cp .env.example .env.local
fi

# Pastikan Supabase URL & Key tersimpan di .env.local
if ! grep -q "NEXT_PUBLIC_SUPABASE_URL=" .env.local; then
    echo "NEXT_PUBLIC_SUPABASE_URL=https://bfygzgmsumkyffhlpmzr.supabase.co" >> .env.local
    echo "✅ Ditambahkan: NEXT_PUBLIC_SUPABASE_URL"
fi
if ! grep -q "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=" .env.local; then
    echo "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_MTq-Kg3ZRbcq_sdLa0SiwQ_3Ggc7Ghn" >> .env.local
    echo "✅ Ditambahkan: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
fi
if ! grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY=" .env.local; then
    echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_MTq-Kg3ZRbcq_sdLa0SiwQ_3Ggc7Ghn" >> .env.local
fi

# Pastikan Solana Helius RPC tersinkron jika masih default placeholder
if grep -q "YOUR_HELIUS_KEY" .env.local; then
    sed -i 's|https://mainnet.helius-rpc.com/?api-key=YOUR_HELIUS_KEY|https://mainnet.helius-rpc.com/?api-key=b1346052-9ac3-47b8-89ec-2ce7e88fa91b|g' .env.local
    echo "✅ Disinkronkan: Helius Dedicated RPC URL"
fi

echo "📦 [4/5] Memeriksa dependencies & mengompilasi Next.js production build..."
npm config set registry https://registry.npmmirror.com/ 2>/dev/null || true
npm config set fetch-retries 5 2>/dev/null || true
npm config set fetch-retry-maxtimeout 120000 2>/dev/null || true

# Install dependencies yang baru ditambahkan (@supabase/supabase-js, @supabase/ssr)
npm install --production=false

# Hentikan sementara PM2 process agar tidak mengunci file .next selama build
pm2 stop grok-trencher 2>/dev/null || true

# Bersihkan cache .next sebelumnya untuk menghindari collision rename
rm -rf .next

# Jalankan build Next.js
npm run build

echo "⚡ [5/5] Memuat ulang PM2 service dengan ecosystem config..."
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
echo "🎉 DEPLOYMENT BERHASIL 100%! Server aktif dengan update terbaru."
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
          console.log(`\n🏁 Proses remote selesai dengan kode exit: ${code}`);
          conn.end();
          process.exit(code === 0 ? 0 : 1);
        })
        .on('data', (data) => {
          process.stdout.write(data.toString());
        })
        .stderr.on('data', (data) => {
          process.stderr.write(data.toString());
        });
    });
  })
  .on('error', (err) => {
    console.error('❌ Gagal terhubung ke SSH VPS:', err.message);
    process.exit(1);
  })
  .connect({
    host,
    port,
    username,
    password,
    readyTimeout: 15000
  });
