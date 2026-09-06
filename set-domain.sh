#!/bin/bash
# ==============================================================================
# Grok Trencher — 1-Click Custom Domain & Auto-SSL HTTPS Setup Script
# Usage: sudo ./set-domain.sh yourdomain.com
# ==============================================================================

set -e

DOMAIN=$1

if [ -z "$DOMAIN" ]; then
    echo "❌ Error: Mohon tentukan nama domain!"
    echo "Contoh penggunaan: sudo ./set-domain.sh trading.alzasniper.com"
    exit 1
fi

echo "🌐 Mengonfigurasi Caddy Web Server untuk domain: $DOMAIN ..."

# 1. Pastikan Caddy terinstall
if ! command -v caddy &> /dev/null; then
    echo "📦 Menginstal Caddy..."
    sudo dnf install -y 'dnf-command(copr)'
    sudo dnf copr enable -y @caddy/caddy
    sudo dnf install -y caddy
fi

# 2. Tulis Caddyfile
cat << EOF | sudo tee /etc/caddy/Caddyfile
# Konfigurasi Domain Kustom Grok Trencher (Auto SSL HTTPS Let's Encrypt / ZeroSSL)
$DOMAIN {
    reverse_proxy 127.0.0.1:3000
}

# Akses via IP langsung tetap aktif di port 80
http://103.30.194.148, :80 {
    reverse_proxy 127.0.0.1:3000
}
EOF

# 3. Validasi & Restart Caddy
echo "⚡ Merestart Caddy Web Server..."
sudo systemctl enable --now caddy
sudo systemctl restart caddy

echo ""
echo "=========================================================================="
echo "🎉 DOMAIN $DOMAIN BERHASIL DIHUBUNGKAN KE GROK TRENCHER!"
echo "👉 Buka website Anda di: https://$DOMAIN"
echo "   (Sertifikat SSL Let's Encrypt / ZeroSSL aktif otomatis)"
echo "=========================================================================="
