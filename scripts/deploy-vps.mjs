import { Client } from 'ssh2';

const password = process.argv[2] || process.env.VPS_PASSWORD;
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
    console.log('⚡ Menjalankan instruksi update & rebuild di VPS...\n');

    const remoteCmd = `
set -e
echo "📂 [1/4] Mendeteksi direktori project..."
if [ -d "$HOME/AI-AGENT-MEMECOIN-ALZA" ]; then
    cd "$HOME/AI-AGENT-MEMECOIN-ALZA"
elif [ -d "/var/www/AI-AGENT-MEMECOIN-ALZA" ]; then
    cd "/var/www/AI-AGENT-MEMECOIN-ALZA"
elif [ -d "AI-AGENT-MEMECOIN-ALZA" ]; then
    cd "AI-AGENT-MEMECOIN-ALZA"
else
    echo "Direktori saat ini: $(pwd)"
fi

echo "📥 [2/4] Mengambil kode terbaru dari GitHub (main branch)..."
git config --global http.version HTTP/1.1 2>/dev/null || true
git config --global http.lowSpeedLimit 1000 2>/dev/null || true
git config --global http.lowSpeedTime 30 2>/dev/null || true
git fetch origin main
git reset --hard origin/main

echo "📦 [3/4] Mengonfigurasi registry & mengompilasi Next.js production build..."
npm config set registry https://registry.npmmirror.com/ 2>/dev/null || true
npm config set fetch-retries 5 2>/dev/null || true
npm config set fetch-retry-maxtimeout 120000 2>/dev/null || true

# Jalankan build Next.js secara langsung (node_modules sudah ada)
npm run build

echo "⚡ [4/4] Memuat ulang PM2 service..."
pm2 restart grok-trencher || pm2 start npm --name "grok-trencher" -- start
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
