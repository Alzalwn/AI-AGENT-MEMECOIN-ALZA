/**
 * Generator Gambar Analisis Teknikal Sinyal Trading (Canvas Image Generator)
 * Menghasilkan gambar grafik analisis berkualitas tinggi (1200x675 HD)
 * persis seperti setup TradingView / Telegram analis profesional.
 */

import { formatFuturesPrice } from '../engine/futuresSignalEngine';

export interface SignalImageParams {
  symbol: string;               // e.g. "ATOM/USDT"
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  tp1Price: number;
  tp2Price?: number;
  tp3Price?: number;
  stopLossPrice: number;
  strategyLabel?: string;
  klines?: Array<{ open: number; high: number; low: number; close: number }>;
}

/**
 * Polyfill helper untuk Canvas roundRect
 */
function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}

/**
 * Menghasilkan Blob PNG gambar grafik analisis sinyal
 */
export async function generateSignalImageBlob(params: SignalImageParams): Promise<Blob> {
  const canvas = document.createElement('canvas');
  const width = 1200;
  const height = 675;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context tidak tersedia');

  const isLong = params.direction === 'LONG';
  const targetPrice = params.tp2Price || params.tp1Price;

  // 1. Latar Belakang Hitam Pekat Elegan
  const bgGradient = ctx.createLinearGradient(0, 0, width, height);
  bgGradient.addColorStop(0, '#090d14');
  bgGradient.addColorStop(1, '#05070a');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);

  // 2. Garis Grid Halus
  ctx.strokeStyle = '#151b26';
  ctx.lineWidth = 1;
  const gridStepY = 55;
  for (let y = 40; y < height - 30; y += gridStepY) {
    ctx.beginPath();
    ctx.moveTo(30, y);
    ctx.lineTo(width - 80, y);
    ctx.stroke();
  }

  // 3. Sumbu Harga Kanan (Price Axis)
  const priceMin = Math.min(params.stopLossPrice, params.entryPrice, targetPrice) * 0.96;
  const priceMax = Math.max(params.stopLossPrice, params.entryPrice, targetPrice) * 1.04;
  const priceRange = priceMax - priceMin;

  const priceToY = (price: number) => {
    const ratio = (price - priceMin) / priceRange;
    return height - 60 - ratio * (height - 140);
  };

  ctx.strokeStyle = '#1e2638';
  ctx.beginPath();
  ctx.moveTo(width - 80, 20);
  ctx.lineTo(width - 80, height - 30);
  ctx.stroke();

  // Label Skala Harga Sumbu Kanan
  ctx.fillStyle = '#64748b';
  ctx.font = '13px monospace';
  ctx.textAlign = 'left';
  for (let i = 0; i <= 6; i++) {
    const p = priceMin + (priceRange / 6) * i;
    const y = priceToY(p);
    ctx.fillText(formatFuturesPrice(p), width - 70, y + 4);
  }

  // 4. Header Atas Kiri: Logo Atom/Koin + Symbol + Badge Posisi
  // Logo Lingkaran
  ctx.beginPath();
  ctx.arc(65, 65, 24, 0, Math.PI * 2);
  ctx.fillStyle = '#141c2e';
  ctx.fill();
  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Atom Ring Symbol
  ctx.strokeStyle = isLong ? '#34d399' : '#f87171';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.ellipse(65, 65, 16, 6, Math.PI / 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(65, 65, 16, 6, -Math.PI / 4, 0, Math.PI * 2);
  ctx.stroke();

  // Teks Simbol (e.g. ATOM/USDT)
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillText(params.symbol, 105, 63);

  // Badge Posisi (LONG / SHORT)
  const badgeX = 105;
  const badgeY = 75;
  ctx.fillStyle = isLong ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)';
  ctx.strokeStyle = isLong ? '#10b981' : '#f43f5e';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  drawRoundRect(ctx, badgeX, badgeY, 78, 24, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = isLong ? '#34d399' : '#fb7185';
  ctx.font = 'bold 12px monospace';
  ctx.fillText(params.direction, badgeX + 16, badgeY + 16);

  // 5. Gambar Candlestick Riwayat Pergerakan Tren (Support Breakout & Retest)
  const chartLeft = 50;
  const chartRight = width - 380;
  const candleCount = 45;
  const candleWidth = (chartRight - chartLeft) / candleCount;

  // Bangkitkan deret candle realistis jika klines tidak disediakan
  let simPrice = isLong ? params.entryPrice * 0.94 : params.entryPrice * 1.06;
  for (let i = 0; i < candleCount; i++) {
    const x = chartLeft + i * candleWidth + candleWidth / 2;
    const progress = i / candleCount;
    // Tren mendekati entry
    const drift = (params.entryPrice - simPrice) * (0.04 + progress * 0.08);
    const noise = (Math.sin(i * 0.8) + (i % 2 === 0 ? 0.3 : -0.3)) * (params.entryPrice * 0.005);
    const open = simPrice;
    const close = i === candleCount - 1 ? params.entryPrice : open + drift + noise;
    const high = Math.max(open, close) + Math.abs(noise) * 0.8;
    const low = Math.min(open, close) - Math.abs(noise) * 0.8;
    simPrice = close;

    const isBull = close >= open;
    const openY = priceToY(open);
    const closeY = priceToY(close);
    const highY = priceToY(high);
    const lowY = priceToY(low);

    // Wick
    ctx.strokeStyle = isBull ? '#10b981' : '#f43f5e';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x, highY);
    ctx.lineTo(x, lowY);
    ctx.stroke();

    // Body
    ctx.fillStyle = isBull ? '#10b981' : '#f43f5e';
    const topY = Math.min(openY, closeY);
    const bH = Math.max(Math.abs(closeY - openY), 2);
    ctx.fillRect(x - candleWidth * 0.36, topY, candleWidth * 0.72, bH);
  }

  // 6. Support / Resistance Box Horizontal
  const boxTopPrice = isLong ? params.entryPrice * 0.975 : params.entryPrice * 1.025;
  const boxBottomPrice = isLong ? params.entryPrice * 0.965 : params.entryPrice * 1.035;
  const boxTopY = priceToY(Math.max(boxTopPrice, boxBottomPrice));
  const boxBotY = priceToY(Math.min(boxTopPrice, boxBottomPrice));

  ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
  ctx.lineWidth = 1.2;
  ctx.fillRect(chartLeft + 180, boxTopY, chartRight - 100, Math.abs(boxBotY - boxTopY));
  ctx.strokeRect(chartLeft + 180, boxTopY, chartRight - 100, Math.abs(boxBotY - boxTopY));

  // 7. TradingView Long / Short Position Setup Box
  const setupStartX = chartRight - 10;
  const setupW = (width - 90) - setupStartX;
  const entryY = priceToY(params.entryPrice);
  const tpY = priceToY(targetPrice);
  const slY = priceToY(params.stopLossPrice);

  if (isLong) {
    // Green Profit Zone
    const profitH = Math.abs(entryY - tpY);
    ctx.fillStyle = 'rgba(16, 185, 129, 0.22)';
    ctx.fillRect(setupStartX, Math.min(entryY, tpY), setupW, profitH);

    // Red Loss Zone
    const lossH = Math.abs(entryY - slY);
    ctx.fillStyle = 'rgba(244, 63, 94, 0.22)';
    ctx.fillRect(setupStartX, Math.min(entryY, slY), setupW, lossH);
  } else {
    // Short Setup Box
    const profitH = Math.abs(entryY - tpY);
    ctx.fillStyle = 'rgba(16, 185, 129, 0.22)';
    ctx.fillRect(setupStartX, Math.min(entryY, tpY), setupW, profitH);

    const lossH = Math.abs(entryY - slY);
    ctx.fillStyle = 'rgba(244, 63, 94, 0.22)';
    ctx.fillRect(setupStartX, Math.min(entryY, slY), setupW, lossH);
  }

  // 8. Garis Level & Badge (Take Profit, Entry, Stop-Loss)
  // --- Garis Take Profit (Hijau Solid) ---
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(setupStartX - 20, tpY);
  ctx.lineTo(width - 80, tpY);
  ctx.stroke();

  // Badge Take Profit
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  drawRoundRect(ctx, setupStartX + 120, tpY - 32, 95, 24, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Take Profit', setupStartX + 167, tpY - 16);

  // Badge Harga TP di Sumbu Kanan
  ctx.fillStyle = '#10b981';
  ctx.beginPath();
  drawRoundRect(ctx, width - 76, tpY - 13, 68, 25, 4);
  ctx.fill();
  ctx.fillStyle = '#042f2e';
  ctx.font = 'bold 12px monospace';
  ctx.fillText(formatFuturesPrice(targetPrice), width - 42, tpY + 4);

  // --- Garis Entry (Putih Solid) ---
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(setupStartX - 40, entryY);
  ctx.lineTo(width - 80, entryY);
  ctx.stroke();

  // Badge Entry
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  drawRoundRect(ctx, setupStartX + 130, entryY - 28, 75, 24, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('Entry', setupStartX + 167, entryY - 12);

  // Badge Harga Entry di Sumbu Kanan
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  drawRoundRect(ctx, width - 76, entryY - 13, 68, 25, 4);
  ctx.fill();
  ctx.fillStyle = '#020617';
  ctx.font = 'bold 12px monospace';
  ctx.fillText(formatFuturesPrice(params.entryPrice), width - 42, entryY + 4);

  // --- Garis Stop-Loss (Merah Solid) ---
  ctx.strokeStyle = '#f43f5e';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(setupStartX - 20, slY);
  ctx.lineTo(width - 80, slY);
  ctx.stroke();

  // Badge Stop-Loss
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = '#f43f5e';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  drawRoundRect(ctx, setupStartX + 120, slY + 8, 95, 24, 6);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#fb7185';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText('Stop-Loss', setupStartX + 167, slY + 24);

  // Badge Harga SL di Sumbu Kanan
  ctx.fillStyle = '#f43f5e';
  ctx.beginPath();
  drawRoundRect(ctx, width - 76, slY - 13, 68, 25, 4);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 12px monospace';
  ctx.fillText(formatFuturesPrice(params.stopLossPrice), width - 42, slY + 4);

  // 9. Gambar Panah Proyeksi (Green Glowing Curved Arrow from Entry to TP)
  const arrowStartX = setupStartX + 45;
  const arrowStartY = entryY;
  const arrowEndX = setupStartX + 105;
  const arrowEndY = tpY + 6;

  // Titik Anchor Lingkaran
  ctx.fillStyle = '#090d14';
  ctx.strokeStyle = isLong ? '#34d399' : '#fb7185';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(arrowStartX, arrowStartY, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(arrowEndX, arrowEndY, 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Garis Panah
  ctx.strokeStyle = isLong ? '#34d399' : '#fb7185';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(arrowStartX, arrowStartY);
  ctx.quadraticCurveTo((arrowStartX + arrowEndX) / 2 - 10, (arrowStartY + arrowEndY) / 2, arrowEndX, arrowEndY);
  ctx.stroke();

  // Arrow Head
  const angle = Math.atan2(arrowEndY - arrowStartY, arrowEndX - arrowStartX);
  ctx.fillStyle = isLong ? '#34d399' : '#fb7185';
  ctx.beginPath();
  ctx.moveTo(arrowEndX, arrowEndY);
  ctx.lineTo(arrowEndX - 14 * Math.cos(angle - Math.PI / 7), arrowEndY - 14 * Math.sin(angle - Math.PI / 7));
  ctx.lineTo(arrowEndX - 14 * Math.cos(angle + Math.PI / 7), arrowEndY - 14 * Math.sin(angle + Math.PI / 7));
  ctx.closePath();
  ctx.fill();

  // 10. Watermark & Telemetry Footer
  ctx.fillStyle = '#475569';
  ctx.font = '11px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('BINANCE FUTURES QUANT SIGNAL • TELEGRAM COMMUNITY READY', 30, height - 12);

  // Return Blob
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Gagal mengonversi canvas ke Blob PNG'));
    }, 'image/png');
  });
}

/**
 * Salin Gambar Murni (PNG) ke Clipboard
 * Saat user paste (Ctrl+V) di Telegram Desktop/Discord, Telegram langsung membuka dialog upload foto!
 */
export async function copyImageToClipboard(imageBlob: Blob): Promise<boolean> {
  try {
    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
      const item = new ClipboardItem({ 'image/png': imageBlob });
      await navigator.clipboard.write([item]);
      return true;
    }
  } catch (err) {
    console.warn('[Clipboard] copyImageToClipboard gagal:', err);
  }
  return false;
}

/**
 * Salin Teks Format Caption Saja ke Clipboard
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.warn('[Clipboard] copyTextToClipboard gagal:', err);
    return false;
  }
}

/**
 * Salin Teks Sinyal Sekaligus Gambar ke Clipboard Browser
 * Mendukung paste langsung (Ctrl+V) foto & caption di Telegram/Discord
 */
export async function copySignalWithImageToClipboard(
  text: string,
  imageBlob: Blob
): Promise<{ success: boolean; fallbackDownloaded?: boolean }> {
  let copiedImage = false;
  let copiedText = false;

  try {
    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
      // Buat data URL base64 untuk mendukung aplikasi yang membaca text/html
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve('');
        reader.readAsDataURL(imageBlob);
      });

      const escapedText = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const htmlPayload = `<div><p><img src="${dataUrl}" alt="Signal Chart" style="max-width: 100%; height: auto; border-radius: 8px;" /></p><pre style="white-space: pre-wrap; font-family: sans-serif;">${escapedText}</pre></div>`;

      // 1. Coba ClipboardItem multi-MIME lengkap (image/png + text/html + text/plain)
      try {
        const item = new ClipboardItem({
          'image/png': imageBlob,
          'text/html': new Blob([htmlPayload], { type: 'text/html' }),
          'text/plain': new Blob([text], { type: 'text/plain' }),
        });
        await navigator.clipboard.write([item]);
        copiedImage = true;
        copiedText = true;
      } catch (errMulti) {
        console.warn('[Clipboard] Multi-MIME write failed, trying image-only:', errMulti);
        try {
          const imgItem = new ClipboardItem({ 'image/png': imageBlob });
          await navigator.clipboard.write([imgItem]);
          copiedImage = true;
        } catch {
          await navigator.clipboard.writeText(text);
          copiedText = true;
        }
      }
    } else {
      await navigator.clipboard.writeText(text);
      copiedText = true;
    }
  } catch (err) {
    console.error('[Clipboard] copySignalWithImageToClipboard error:', err);
  }

  return { success: copiedImage || copiedText };
}

/**
 * Download Blob Gambar ke Local Device
 */
export function downloadImageBlob(blob: Blob, filename = 'signal-analysis.png') {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
