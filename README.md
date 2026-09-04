# Grok Trencher (AI-AGENT-MEMECOIN-ALZA)

⚡ **Grok Trencher** adalah terminal trading otomatis terdesentralisasi multi-agen berkecepatan tinggi untuk ekosistem memecoin Solana (Pump.fun & Raydium).

[![GitHub repo](https://img.shields.io/badge/GitHub-Alzalwn%2FAI--AGENT--MEMECOIN--ALZA-0DF289?logo=github)](https://github.com/Alzalwn/AI-AGENT-MEMECOIN-ALZA)
[![Stack](https://img.shields.io/badge/Stack-Next.js%20%7C%20TypeScript%20%7C%20TailwindCSS-blue)](#)
[![Latency](https://img.shields.io/badge/Target%20Latency-%3C350ms-green)](#)

---

## 🏛️ Arsitektur Sistem 5 AI Agent Consensus

Pipeline evaluasi paralel beroperasi dengan aturan **Single-Veto Distributed Consensus**: Jika salah satu agen mengeluarkan status `VETO`, order langsung dibatalkan dalam waktu $< 10\text{ ms}$.

1. **Scanner Agent**: Memverifikasi Initial LP $\ge \$5.000$ USD dan $100\%$ Burnt Liquidity.
2. **Narrative Agent**: Evaluasi relevansi narasi trending dengan vector cosine similarity $\ge 0.85$.
3. **Risk Agent**: Deteksi honeypot & rug-pull (Mint/Freeze Authority wajib Revoked, Top 10 non-LP holders $\le 15\%$).
4. **Timing Agent**: Delta volume beli/jual 15 detik wajib positif ($> 0\text{ SOL}$) & transaksi tersebar di $\ge 3$ dompet unik.
5. **Exit Agent**: Mengambil alih posisi `OPEN` dengan trailing stop (loss $> 0.33R$), take-profit ($+3.0R$), dan emergency liquidity drain protection.

---

## 🔒 Manajemen Risiko & Eksekusi

- **Single Active Position Mutex Lock**: Mencegah fragmentasi modal; hanya 1 posisi aktif diperbolehkan dalam satu waktu.
- **Sizing via Fractional Kelly**: Alokasi per posisi dibatasi pada $\approx 6.2\%$ untuk menjaga batas *Risk of Ruin* $\le 15\%$.
- **Jito MEV Private Bundling**: Buy/sell dieksekusi secara privat melalui Jito Block Engine untuk menghindari *sandwich attacks* di mempool publik.

---

## 💻 Menjalankan Terminal Lokal

```bash
# Masuk ke direktori
cd "c:\OBU 18 BRAVO\AI\AI-AGENT-MEMECOIN-ALZA"

# Install dependensi (jika belum)
npm install

# Jalankan development server
npm run dev
```

Buka peramban di [http://localhost:3001](http://localhost:3001) (atau port 3000) untuk mengakses **High-Density Dark Terminal Dashboard**.