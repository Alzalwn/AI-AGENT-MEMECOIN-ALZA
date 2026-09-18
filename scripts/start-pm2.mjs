import { Client } from 'ssh2';

const password = process.argv[2] || process.env.VPS_PASSWORD || 'Alza0838';
const username = process.argv[3] || process.env.VPS_USERNAME || 'AlzaSniped';
const host = process.argv[4] || process.env.VPS_HOST || '103.30.194.148';
const port = parseInt(process.env.VPS_PORT || '22', 10);

console.log(`⚡ Menghubungkan ke VPS (${host}) untuk menyalakan PM2 & Caddy...`);

const conn = new Client();

conn
  .on('ready', () => {
    console.log('✅ SSH Terhubung!');
    const cmd = `
if [ -d "$HOME/AI-AGENT-MEMECOIN-ALZA" ]; then
    cd "$HOME/AI-AGENT-MEMECOIN-ALZA"
elif [ -d "/var/www/AI-AGENT-MEMECOIN-ALZA" ]; then
    cd "/var/www/AI-AGENT-MEMECOIN-ALZA"
elif [ -d "AI-AGENT-MEMECOIN-ALZA" ]; then
    cd "AI-AGENT-MEMECOIN-ALZA"
fi

echo "🚀 Menyalakan service grok-trencher..."
if [ -f "ecosystem.config.js" ]; then
    pm2 startOrReload ecosystem.config.js --env production || pm2 restart grok-trencher || pm2 start npm --name "grok-trencher" -- start
else
    pm2 restart grok-trencher || pm2 start npm --name "grok-trencher" -- start
fi

pm2 save
pm2 status

echo "🔄 Merestart Caddy web server..."
sudo systemctl restart caddy 2>/dev/null || true
echo "✅ SEMUA SERVICE BERHASIL AKTIF!"
`;

    conn.exec(cmd, (err, stream) => {
      if (err) {
        console.error('❌ Error exec:', err);
        conn.end();
        process.exit(1);
      }
      stream
        .on('close', (code) => {
          console.log(`\n🏁 Selesai dengan kode: ${code}`);
          conn.end();
          process.exit(code === 0 ? 0 : 1);
        })
        .on('data', (data) => process.stdout.write(data.toString()))
        .stderr.on('data', (data) => process.stderr.write(data.toString()));
    });
  })
  .on('error', (err) => {
    console.error('❌ Error SSH:', err.message);
    process.exit(1);
  })
  .connect({ host, port, username, password, readyTimeout: 15000 });
