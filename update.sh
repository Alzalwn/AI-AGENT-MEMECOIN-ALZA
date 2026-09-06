#!/bin/bash
# ==============================================================================
# Grok Trencher v2.0 PRO - 1-Click Fast Update & Rebuild Script
# ==============================================================================

set -e

echo "🚀 [1/4] Mendeteksi direktori repository Grok Trencher..."
if [ -d "$HOME/AI-AGENT-MEMECOIN-ALZA" ]; then
    cd "$HOME/AI-AGENT-MEMECOIN-ALZA"
elif [ -d "/var/www/AI-AGENT-MEMECOIN-ALZA" ]; then
    cd "/var/www/AI-AGENT-MEMECOIN-ALZA"
elif [ -d "AI-AGENT-MEMECOIN-ALZA" ]; then
    cd "AI-AGENT-MEMECOIN-ALZA"
else
    echo "Direktori saat ini: $(pwd)"
fi

echo "📥 [2/4] Mengambil update kode terbaru dari GitHub (main branch)..."
git fetch origin main
git reset --hard origin/main

echo "📦 [3/4] Memeriksa dependencies dan mengompilasi Next.js production build..."
npm install --production=false
npm run build

echo "⚡ [4/4] Memuat ulang instance PM2 dengan kode baru..."
pm2 restart grok-trencher 2>/dev/null || pm2 start npm --name "grok-trencher" -- start

# Memuat ulang grok-sniper daemon jika aktif
if pm2 list 2>/dev/null | grep -q "grok-sniper"; then
    echo "⚡ Memuat ulang grok-sniper 24/7 autonomous bot daemon..."
    pm2 restart grok-sniper
fi
pm2 save

echo ""
echo "=========================================================================="
echo "🎉 UPDATE BERHASIL 100%! Grok Trencher telah aktif dengan fitur terbaru."
echo "🔗 Buka dashboard: https://alzasniped.my.id"
echo "💡 CATATAN: Di browser Anda, tekan Ctrl + F5 (Hard Refresh) untuk"
echo "   memastikan browser memuat tampilan dan tombol 'Copy-Trade' terbaru."
echo "=========================================================================="
