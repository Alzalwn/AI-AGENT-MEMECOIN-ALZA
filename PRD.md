# Product Requirements Document (PRD): AI Alpha Signal Terminal
**Domain Produksi:** [https://alzasniped.my.id](https://alzasniped.my.id)  
**Versi:** 2.0 PRO — AI-Powered Solana Alpha Signal Provider  
**Status:** Active & Deployed in Production (AlmaLinux VPS / Caddy Reverse Proxy / PM2)

---

## 1. Project Overview & Objectives (Gambaran Proyek & Tujuan)

**AI Alpha Signal Terminal (Grok Trencher v2.0)** adalah platform intelijen dan penyedia sinyal perdagangan (*Alpha Signal Provider*) terdesentralisasi berbasis **Multi-Agent AI Consensus** yang beroperasi di ekosistem blockchain Solana berkecepatan tinggi.

Aplikasi ini telah bertransformasi dari bot sniper saldo lokal menjadi **stasiun kurasi dan penyedia sinyal presisi tinggi (High-Conviction Alpha Signal Platform)**. Sistem ini secara kontinu memindai peluncuran pool baru (Pump.fun & Raydium), memfilter 99% koin sampah/honeypot melalui konsensus 5 Agen AI, dan menyajikan sinyal terstruktur lengkap dengan zona entri, target take-profit berjenjang (TP1/TP2/TP3), stop loss terukur, serta tautan copy-trade 1-klik ke bot trading favorit pengguna.

### Tujuan Utama & Metrik Sukses:
* **0% False Positives pada Honeypot/Rugpull:** Proteksi mutlak melalui *Single-Veto Architecture* (jika 1 agen mendeteksi bahaya, koin langsung dieliminasi).
* **High-Conviction Filtering:** Hanya menerbitkan koin dengan probabilitas kemenangan tinggi (*Sweet-spot Market Cap* \$15k – \$60k dan Likuiditas aman $\ge \$8,000$).
* **Sub-500ms Signal Emisi:** Dari terdeteksinya pool baru di RPC Helius hingga publikasi sinyal di dasbor dan Telegram.
* **Transparansi Pemindaian (Scan Proof):** Pengguna dapat melihat bukti nyata bahwa scanner aktif menyaring ratusan token sampah per jam melalui *Heartbeat Indicator* dan metrik *Scanned & Rejected*.
* **Non-Custodial & Zero-Risk Execution:** Pengguna tidak perlu memasukkan private key dompet ke web; eksekusi dilakukan via integrasi tautan langsung ke Trojan, BonkBot, BullX, Photon, dan GMGN.

---

## 2. Target Audience & Core Value Proposition

* **Solana Momentum & Memecoin Traders:** Trader yang membutuhkan kurasi token berkualitas tinggi tanpa harus memantau ratusan token scam setiap menit.
* **Telegram Bot Copy-Traders:** Pengguna bot trading kilat (Trojan, BonkBot, Maestro) yang memerlukan umpan sinyal instan dengan tombol eksekusi 1-klik.
* **Risk-Conscious De-Fi Investors:** Investor yang mengutamakan proteksi modal dan menolak masuk ke koin tanpa kepastian status LP Burnt, Mint Revoked, dan Freeze Authority dinonaktifkan.

---

## 3. Core Features & Acceptance Criteria (Fitur Utama & Kriteria Penerimaan)

| ID | Fitur | Deskripsi | Acceptance Criteria |
| :--- | :--- | :--- | :--- |
| **FR-01** | **Dedicated RPC Stream Ingestion** | Mendengarkan peluncuran token dan transaksi swap secara live via node dedicated **Helius RPC (Asia Cluster)**. | Latensi penerimaan event $\le 100\text{ ms}$; auto-reconnect dengan exponential backoff jika koneksi terputus. |
| **FR-02** | **5-Agent AI Consensus Engine** | Evaluasi serentak 5 agen (Liquidity, Honeypot, Momentum, Moonshot, dan Grok Virality). | Koin HANYA lolos jika memperoleh konsensus mutlak (5/5 Approval). 1 penolakan = koin langsung di-drop. |
| **FR-03** | **Precision Alpha Signal Calculator** | Menghitung otomatis: Entry Zone ($\pm 3\%$), TP1 (+50%), TP2 (+100%), TP3 (+300%), Hard SL (-20%), dan Risk/Reward Ratio. | Nilai $R:R$ wajib $\ge 3.0$; kartu sinyal menampilkan tier: `SUPERNOVA` ($\ge 90$), `HIGH` ($\ge 80$), `MODERATE` ($\ge 70$). |
| **FR-04** | **1-Click Copy-Trading Links** | Tombol eksekusi instan di setiap kartu sinyal: Trojan, BonkBot, BullX, Photon, GMGN, DexScreener, Rugcheck, dan Copy CA. | Klik membuka deep-link resmi dengan parameter Contract Address (CA) terisi otomatis; Copy CA menyalin ke clipboard. |
| **FR-05** | **Multi-Channel Alert Dispatcher** | Notifikasi otomatis ke Telegram Channel/Grup dan Discord saat sinyal lolos konsensus. | Dilengkapi Inline Keyboard untuk 1-klik beli di Telegram; proteksi deduplikasi CA 6 jam dan rate-limit 3 sinyal per 5 menit. |
| **FR-06** | **Scanner Heartbeat Indicator** | Komponen status scanner aktif di Header dan Banner atas feed sinyal (`📡 LIVE: Sniffing Block #[Slot]`). | Menampilkan titik hijau pulsing dan counter real-time *"Tokens Scanned & Rejected (Last 1 Hour)"* yang bertambah secara reaktif. |
| **FR-07** | **Radar Scanning Empty State** | Tampilan futuristik lingkaran radar berputar saat tidak ada sinyal yang memenuhi kriteria ketat. | Lingkaran konsentris dengan berkas sapuan radar 360°, partikel blip koin yang tertolak, dan teks transparan penjelas filter. |
| **FR-08** | **Signal Dismiss / Archive Action** | Tombol `[ ✕ ]` di sudut kanan setiap kartu sinyal untuk membersihkan kartu yang sudah lama atau tidak diminati. | Menghapus sinyal dari state global `activeSignals` dengan animasi fade-out 220ms dan sinkronisasi status `is_archived = true` ke Supabase. |
| **FR-09** | **Production Reliability & Watchdog** | Server Next.js 14 di bawah PM2 dengan memory guard 900M, auto-restart, dan reverse proxy Caddy HTTPS. | Uptime 99.9%, endpoint `/api/health/rpc-stream` aktif memantau status stream RPC. |

---

## 4. Multi-Agent Quality Filter & Consensus Architecture

```
                       [ Solana New Pool Event (Raydium / Pump.fun) ]
                                            │
                                            ▼
                    ┌───────────────────────────────────────────────┐
                    │      5-AGENT ASYNCHRONOUS EVALUATION CORE     │
                    └───────────────────────────────────────────────┘
                                            │
        ┌───────────────────┬───────────────┴───────────────┬───────────────────┐
        ▼                   ▼                               ▼                   ▼
 [Liquidity Agent]   [Honeypot Shield]              [Momentum Agent]    [Moonshot & Grok AI]
  LP >= $8,000       Mint: Revoked                  Volume Delta > 0    Organic Growth Score
  Burnt: 100%        Freeze: Revoked                Buyers / Sellers    Viral Narrative Match
  No Unlocked LP     Top 10 Holders <= 15%          Velocity Tracker    Dev Wallet Scan
        │                   │                               │                   │
        └───────────────────┼───────────────────────────────┴───────────────────┘
                            │
                            ▼
                [ Consensus Evaluator (5/5) ]
                            │
               ┌────────────┴────────────┐
               ▼                         ▼
      [ Any Veto == True ]       [ 5/5 Full Consensus ]
               │                         │
               ▼                         ▼
      Reject & Increment          Generate Alpha Signal
   "Scanned & Rejected Counter"   - Entry Zone Bracket
               │                  - TP1 (+50%), TP2 (+100%), TP3 (+300%)
               ▼                  - Hard Stop Loss (-20%)
       Discard Silently           - Assign Tier (SUPERNOVA / HIGH)
                                         │
                                         ├──────────────────────────┐
                                         ▼                          ▼
                                [ Live UI Dashboard ]     [ Telegram & Discord ]
                                 alzasniped.my.id          Instant Alert with Links
```

### Matriks Kriteria Penolakan (Veto Rules):
1. **Liquidity Agent:** Veto jika Initial LP $< \$8,000$ USD atau Liquidity Pool belum di-burn 100%.
2. **Honeypot Shield Agent:** Veto jika Mint Authority masih aktif, Freeze Authority ada, atau kepemilikan Top 10 non-LP holders $> 15\%$.
3. **Momentum & Velocity Agent:** Veto jika rasio transaksi beli berbanding jual negatif atau terjadi anomali volume palsu (wash trading dari 1 dompet).
4. **Early-Entry Guard Agent:** Veto jika Market Cap berada di luar rentang aman (\$15,000 – \$60,000). Koin di atas \$60k dianggap terlambat untuk alpha entry.
5. **Grok Virality & Narrative Agent:** Veto jika narasi token tidak memiliki resonansi tren (meme culture, AI meta, xAI trending topics) atau dev wallet terhubung dengan klaster rug historis.

---

## 5. Signal Economics & Mathematical Specifications

### A. Risk-to-Reward Ratio ($R:R$)
Setiap sinyal yang diterbitkan wajib memiliki rasio potensi keuntungan terhadap risiko minimal $3.0$:
$$R:R = \frac{\text{Target TP1} - \text{Entry Current}}{\text{Entry Current} - \text{Stop Loss}} \ge 3.0$$

### B. Rumus Perhitungan Target & Proteksi Modal:
* **Entry Zone Low:** $\text{Price}_{\text{current}} \times 0.97$ (-3% slippage window)
* **Entry Zone High:** $\text{Price}_{\text{current}} \times 1.03$ (+3% ceiling)
* **Target Take Profit 1 (TP1):** $\text{Price}_{\text{current}} \times 1.50$ (+50% Gain) — Rekomendasi jual 50% modal
* **Target Take Profit 2 (TP2):** $\text{Price}_{\text{current}} \times 2.00$ (+100% Gain / 2x) — Ambil sisa modal pokok
* **Target Take Profit 3 (TP3):** $\text{Price}_{\text{current}} \times 4.00$ (+300% Gain / 4x Moonbag)
* **Hard Stop Loss (SL):** $\text{Price}_{\text{current}} \times 0.80$ (-20% Maksimum toleransi risiko)

### C. Klasifikasi Tier Sinyal:
* 🚀 **SUPERNOVA (Score 90 – 100):** Konsensus sempurna, likuiditas $\ge \$15\text{k}$, narasi viral kuat, momentum pembeli agresif.
* 🔥 **HIGH CONVICTION (Score 80 – 89):** Parameter keamanan 100% lolos, volume stabil, rasio pembeli mendominasi.
* ⚡ **MODERATE (Score 70 – 79):** Memenuhi standar dasar keamanan, cocok untuk scalping cepat.

---

## 6. UI/UX Design System & Cyberpunk Terminal Specifications

* **Palette Desain:** Cyberpunk Dark Glassmorphism
  * Latar Belakang: `#030706` (Deep Terminal Black)
  * Aksen Utama Positif: `#0DF289` (Emerald Neon Glow)
  * Aksen Peringatan / Veto: `#E5484D` (Crimson Rose)
  * Aksen Intelijen / AI: `#00E5FF` (Electric Cyan) & `#A855F7` (Deep Purple)
  * Kartu Sinyal: `#111111` dengan border glow adaptif sesuai Tier.
* **Header Telemetry Bar:**
  * **Brand Identity:** `AI Alpha Signal v2.0 PRO`
  * **Scanner Heartbeat:** `📡 LIVE: Sniffing Block #[Slot]` (animasi titik berkedip hijau neon).
  * **Rejection Metric:** `Tokens Scanned & Rejected (Last 1 Hour): [Count]` (angka terakumulasi yang membuktikan bot sedang bekerja).
  * **RPC Telemetry:** Indikator latensi node Helius Asia Cluster & Failover status.
  * **Supabase Realtime Indicator:** Status sinkronisasi cloud (`CONNECTED`, `CONNECTING`, `UNAVAILABLE`).
  * **Kalkulator Kurs:** Konversi live 1 SOL $\leftrightarrow$ IDR / USD.
* **Radar Empty State (`RadarEmptyState`):**
  * Layar radar melingkar dengan 3 ring konsentris dan sumbu crosshairs.
  * Animasi sapuan berkas radar 360° yang berputar terus menerus (`@keyframes radar-sweep`).
  * Partikel blip koin sampah yang berkedip dan memudar (`@keyframes radar-blip`).
  * Tipografi: *"Menunggu anomali Smart Money... Filter ketat memblokir 99% koin sampah."*
* **Interactive Signal Card Management:**
  * Tombol `[ ✕ ]` di sudut kanan atas kartu untuk menutup/mengarsipkan sinyal yang tidak ingin dilihat.
  * Animasi fade-out & scale-down reaktif (220ms).
  * Sinkronisasi otomatis ke Supabase database (`is_archived = true`).

---

## 7. Infrastructure, Deployment & Reliability Architecture

```
[ Internet User / Browser ] ──HTTPS (Port 443)──► [ Caddy Reverse Proxy & Auto-SSL ]
                                                              │
                                                              ▼ HTTP (Port 3000)
                                                    [ PM2 Process Manager ]
                                                              │
                                            ┌─────────────────┴─────────────────┐
                                            ▼                                   ▼
                                  [ grok-trencher ]                   [ ecosystem.config.js ]
                                  Next.js 14 App SSR                  Max Memory: 900M
                                  Health & Dev API                    Exp Backoff Auto-Restart
                                            │
                   ┌────────────────────────┼────────────────────────┐
                   ▼                        ▼                        ▼
      [ Helius Dedicated RPC ]     [ Supabase Database ]    [ Telegram & Discord ]
      Asia Cluster (Tokyo)         Realtime State Sync       Alpha Alert Webhooks
```

### Rincian Konfigurasi Server:
* **Host VPS:** AlmaLinux 9 / IP: `103.30.194.148` (IDCloudHost)
* **Domain:** `https://alzasniped.my.id`
* **Process Manager:** PM2 (`grok-trencher`), memori restart guard di `900M`, auto-restart dengan jeda eksponensial.
* **Web Server:** Caddy v2 (Reverse Proxy otomatis ke port 3000 dengan sertifikat SSL Let's Encrypt gratis dan HTTP/3 enabled).
* **Automated Deploy Script:** Script remote deployment 1-klik via SSH:
  ```bash
  node scripts/deploy-vps.mjs
  ```
  Menjalankan otomatis: `git pull origin main` $\rightarrow$ `.env.local` sync $\rightarrow$ `npm install` $\rightarrow$ `npm run build` $\rightarrow$ `pm2 reload ecosystem.config.js`.

---

## 8. Edge-Case Handling & Diagnostic API

* **Stream RPC Beku / Terputus:** Watchdog timer di `heliusStream.ts` mendeteksi jika tidak ada event selama $\ge 3$ menit, mencetak log `[CRITICAL]`, dan melakukan reconnect otomatis.
* **Diagnostic & Health Endpoint:** `GET /api/health/rpc-stream` menyajikan laporan status koneksi, event per menit, dan waktu aktif stream.
* **Mock Signal Dev Simulator:** `POST /api/dev/trigger-mock-signal` dilindungi passcode admin (`Alza0839`) untuk menguji alur pembuatan sinyal dan pengiriman Telegram tanpa mengotori database produksi.
