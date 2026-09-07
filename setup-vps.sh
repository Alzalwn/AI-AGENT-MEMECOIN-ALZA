#!/bin/bash
# ==============================================================================
# Grok Trencher v2.0 PRO — AlmaLinux / RHEL 1-Click Automated VPS Setup Script
# ==============================================================================

set -e

echo "🚀 [1/6] Memulai Setup Otomatis Grok Trencher di AlmaLinux..."


# 0. Perbaiki DNS & Matikan IPv6 agar npm / network tidak ETIMEDOUT
echo "🌐 Mengonfigurasi DNS & Jaringan..."
sudo sysctl -w net.ipv6.conf.all.disable_ipv6=1 2>/dev/null || true
sudo sysctl -w net.ipv6.conf.default.disable_ipv6=1 2>/dev/null || true

sudo bash -c 'echo "nameserver 1.1.1.1" > /etc/resolv.conf'
sudo bash -c 'echo "nameserver 8.8.8.8" >> /etc/resolv.conf'

# 1. Setup 2GB SWAP Memory jika belum ada
if [ ! -f /swapfile ]; then
    echo "⚙️ [2/6] Membuat 2 GB SWAP Memory..."
    sudo dd if=/dev/zero of=/swapfile bs=1M count=2048
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo "✅ SWAP 2 GB berhasil diaktifkan!"
else
    echo "✅ SWAP sudah ada, melewati pembuatan."
fi

# 2. Update & Install Dependencies (Git, Node.js 20, PM2, Build Tools)
echo "📦 [3/6] Menginstal Node.js 20 LTS, Git, dan PM2..."
sudo dnf install -y git curl tar gcc-c++ make

if ! command -v node &> /dev/null; then
    curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
    sudo dnf install -y nodejs
fi

# Konfigurasi npm resilience
sudo npm config set fetch-retries 5
sudo npm config set fetch-retry-maxtimeout 120000

echo "📦 Menginstal PM2..."
sudo npm install -g pm2 --registry=https://registry.npmjs.org/ || sudo npm install -g pm2 --registry=https://registry.npmmirror.com

# 3. Buka Firewall Port 3000, 80, 443
echo "🛡️ [4/6] Mengonfigurasi Firewall Port 3000..."
if systemctl is-active --quiet firewalld; then
    sudo firewall-cmd --permanent --add-port=3000/tcp
    sudo firewall-cmd --permanent --add-service=http
    sudo firewall-cmd --permanent --add-service=https
    sudo firewall-cmd --reload
    echo "✅ Firewall port 3000 berhasil dibuka!"
fi

# 4. Clone atau Update Repository
echo "📥 [5/6] Mengunduh repository Grok Trencher..."
if [ -d "AI-AGENT-MEMECOIN-ALZA" ]; then
    cd AI-AGENT-MEMECOIN-ALZA
    git pull origin main || true
else
    git clone https://github.com/Alzalwn/AI-AGENT-MEMECOIN-ALZA.git
    cd AI-AGENT-MEMECOIN-ALZA
fi

# 5. Salin Environment Variables jika belum ada
if [ ! -f ".env.local" ]; then
    cp .env.example .env.local
    echo "✅ File .env.local berhasil dibuat dari template."
fi

# 6. Install Dependencies & Build
echo "🔨 [6/6] Mengompilasi aplikasi Next.js (npm run build)..."
npm install --registry=https://registry.npmjs.org/ || npm install --registry=https://registry.npmmirror.com
npm run build

# 7. Start dengan PM2
echo "⚡ Menjalankan Grok Trencher Web Terminal dengan PM2..."
pm2 stop grok-trencher 2>/dev/null || true
pm2 start npm --name "grok-trencher" -- start

# Jalankan 24/7 Autonomous Telegram Signal Daemon
echo "🤖 Menjalankan 24/7 Autonomous Telegram Signal Daemon (Headless Worker)..."
pm2 stop alpha-signal-bot 2>/dev/null || true
pm2 stop grok-sniper 2>/dev/null || true
pm2 start scripts/signal-daemon.mjs --name "alpha-signal-bot"
pm2 save
pm2 startup || true

# 8. Setup Caddy Web Server (Reverse Proxy Port 80 & Auto SSL HTTPS)
echo "🌐 [7/7] Mengonfigurasi Caddy Web Server..."
if ! command -v caddy &> /dev/null; then
    sudo dnf install -y 'dnf-command(copr)' 2>/dev/null || true
    sudo dnf copr enable -y @caddy/caddy 2>/dev/null || true
    sudo dnf install -y caddy 2>/dev/null || true
fi

if [ -f "Caddyfile" ]; then
    sudo cp Caddyfile /etc/caddy/Caddyfile
    sudo systemctl enable --now caddy 2>/dev/null || true
    sudo systemctl restart caddy 2>/dev/null || true
fi

echo ""
echo "=========================================================================="
echo "🎉 GROK TRENCHER BERHASIL DI-DEPLOY & BERJALAN 24/7!"
echo "👉 Buka dashboard terminal Anda di:"
echo "   - Langsung (Port 80): http://103.30.194.148"
echo "   - Port Internal:      http://103.30.194.148:3000"
echo ""
echo "🔗 Ingin menghubungkan nama domain kustom (SSL HTTPS Gratis)?"
echo "   Jalankan: sudo ./set-domain.sh namadomainanda.com"
echo "=========================================================================="
