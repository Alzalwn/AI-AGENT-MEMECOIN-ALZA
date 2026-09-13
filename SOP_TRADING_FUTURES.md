# STANDARD OPERATING PROCEDURE (SOP)
## TRADING CRYPTOCURRENCY FUTURES (USDT-M)
### Sistem Presisi AI Alpha Terminal — Grok Trencher v2.0 Pro

> **DOKUMEN RESMI OPERASIONAL TRADING**  
> **Versi:** 1.0 (Edisi Institusional)  
> **Target Pasar:** Binance Futures USDT-M (Derivatif Kripto)  
> **Prinsip Utama:** *"Capital Preservation is Priority #1. Keuntungan adalah hasil alami dari disiplin eksekusi tanpa emosi."*

---

## 📑 DAFTAR ISI
1. [Prinsip Dasar & Filosofi Trading](#1-prinsip-dasar--filosofi-trading)
2. [BAB I: Manajemen Risiko Modal (Money Management & Sizing)](#bab-i-manajemen-risiko-modal-money-management--sizing)
3. [BAB II: Checklist Analisis Pra-Eksekusi (Pre-Trade Checklist)](#bab-ii-checklist-analisis-pra-eksekusi-pre-trade-checklist)
4. [BAB III: Protokol Uji Silang Adversarial (Bull vs Bear & Gatekeeper)](#bab-iii-protokol-uji-silang-adversarial-bull-vs-bear--gatekeeper)
5. [BAB IV: Prosedur Eksekusi Order di Binance](#bab-iv-prosedur-eksekusi-order-di-binance)
6. [BAB V: Manajemen Posisi Aktif & Exit Strategy](#bab-v-manajemen-posisi-aktif--exit-strategy)
7. [BAB VI: Protokol Darurat Lindung Nilai (Delta-Neutral Auto-Hedging)](#bab-vi-protokol-darurat-lindung-nilai-delta-neutral-auto-hedging)
8. [BAB VII: Disiplin Psikologi & Batas Harian (Anti-Revenge Trading)](#bab-vii-disiplin-psikologi--batas-harian-anti-revenge-trading)

---

## 1. PRINSIP DASAR & FILOSOFI TRADING

1. **Pasar Derivatif adalah Arena Zero-Sum:** Untuk menghasilkan keuntungan, kita mengeksploitasi inefisiensi pasar, anomali funding rate, dan likuidasi paksa trader ritel yang tidak disiplin.
2. **Tidak Ada Tempat untuk Spekulasi Tanpa Data:** Setiap entri wajib memiliki konfluensi teknikal teruji, dukungan orderbook riil, dan lulus uji Gatekeeper.
3. **Patuhi Rencana, Bukan Emosi:** Entry, Target Profit (TP1/TP2/TP3), dan Stop Loss (SL) ditentukan **sebelum** order dikirim ke bursa, bukan ditentukan di tengah kepanikan saat harga bergejolak.

---

## BAB I: MANAJEMEN RISIKO MODAL (MONEY MANAGEMENT & SIZING)

### 1. Aturan Batas Risiko Maksimal 2% (Rule Anti-Rungkad)
- **Toleransi Kerugian Maksimal:** Kerugian saat Stop Loss (SL) tersentuh **DILARANG MELEBIHI 2.0%** dari total saldo dompet (Wallet Balance).
- **Rumus Kalkulasi Notional & Margin:**
  $$\text{Max Risk Amount (USD)} = \text{Wallet Balance} \times 0.02$$
  $$\text{Notional Position (USD)} = \frac{\text{Max Risk Amount}}{\text{Stop Loss \%} / 100}$$
  $$\text{Margin Order (USD)} = \frac{\text{Notional Position}}{\text{Leverage Multiplier}}$$

*Contoh Kasus Riil (Modal Akun \$50 USD, Jarak SL 2.5%, Leverage 5x):*
- Max Risk Amount: $\$50 \times 2\% = \$1.00$ USD.
- Posisi Notional: $\$1.00 / 0.025 = \$40.00$ USD.
- Margin yang dimasukkan: $\$40.00 / 5 = \$8.00$ USD.
- **Hasil:** Jika Stop Loss tertabrak (-2.5%), modal Anda hanya berkurang $-\$1.00$ USD (sisa modal \$49.00 USD). Akun Anda terlindungi dari kehancuran modal (*anti-wipeout*).

### 2. Kebijakan Leverage Wajib (Isolated Mode)
- **Wajib Mode ISOLATED:** Dilarang keras menggunakan mode *CROSS MARGIN*, agar kerugian pada satu koin tidak pernah menyedot sisa saldo aset lainnya.
- **Profil Leverage:**
  - **Profil SAFE (Swing / Santai):** `2x – 5x`  
    *Untuk trader yang ingin tidur nyenyak, proteksi maksimal dari sumbu jarum likuidasi (wick hunting).*
  - **Profil SCALP (Intraday / Disiplin Tinggi):** `7x – 10x` (Maksimal 12x)  
    *Hanya untuk koin berlikuiditas super tebal dengan eksekusi TP1 kilat.*
- **Larangan Keras:** Dilarang menggunakan leverage $\ge 20\text{x}$ pada altcoin volatil!

---

## BAB II: CHECKLIST ANALISIS PRA-EKSEKUSI (PRE-TRADE CHECKLIST)

Sebelum membuka posisi apa pun di terminal Binance Futures, trader wajib memastikan 6 filter berikut terpenuhi:

```
[1. FILTER LIKUIDITAS] ➔ [2. PERISAI BTC GUARD] ➔ [3. KONFLUENSI TEKNIKAL] ➔ 
[4. POLA CANDLESTICK] ➔ [5. ORDERBOOK WALL] ➔ [6. TELEMETRI FUNDING]
```

### 1. Filter Likuiditas Pasar Minimum
- **Syarat Mutlak:** Total Volume 24 Jam $\ge \$12.000.000$ USD.
- **Tujuan:** Menghindari koin gorengan berspread lebar, manipulasi wash trading, dan slippage eksekusi.

### 2. Perisai Induk Pasar (Bitcoin Market Guard)
- Periksa status BTC 15m dan 1h di terminal:
  - **Jika BTC Dump Alert ($< -1.5\%$ dalam 15 menit):** DILARANG KERAS membuka posisi `LONG` pada altcoin apa pun!
  - **Keputusan:** Wajib `WAIT & SEE` atau ikuti tren `SHORT` yang selaras dengan pelemahan Bitcoin.

### 3. Konfluensi 5 Pilar Indikator Teknikal
- **Moving Averages (MA 7 / MA 25 / MA 99):**
  - Posisi `LONG`: Wajib formasi *Golden Stack* (MA7 > MA25 > MA99) atau harga memantul di atas MA25.
  - Posisi `SHORT`: Wajib formasi *Death Stack* (MA7 < MA25 < MA99) atau harga tertolak di bawah MA25.
- **MACD (12, 26, 9):**
  - Garis DIF wajib berada di atas DEA dengan histogram positif untuk konfirmasi momentum beli.
- **Triple RSI (6, 12, 24):**
  - Posisi `LONG` dilarang masuk jika RSI(6) $\ge 75$ (*Pucuk Overbought*).
  - Posisi `SHORT` dilarang masuk jika RSI(6) $\le 25$ (*Dasar Oversold*).
- **Bollinger Bands (20, 2):** Waspadai rejection jika harga menembus Upper Band tanpa lonjakan volume baru.

### 4. Konfirmasi Pola Candlestick Elit
- Prioritaskan koin yang membentuk pola pembalikan/kelanjutan terkonfirmasi (contoh: *Bullish Engulfing*, *Hammer*, *Morning Star*, *Bearish Harami*).
- Validasi syarat: Tingkat akurasi historis pola $\ge 70\%$.

### 5. Analisis Kedalaman Orderbook (Whale Walls)
- Periksa rasio ketidakseimbangan (Imbalance Ratio):
  - **Sinyal LONG Kuat:** Rasio Bids / Asks $\ge 1.2\text{x}$ (Didukung *Bid Wall* tebal sebagai bantalan harga).
  - **Sinyal SHORT Kuat:** Rasio Asks / Bids $\ge 1.2\text{x}$ (Didukung *Ask Wall* tebal sebagai atap resistensi).

### 6. Analisis Telemetri Derivatif & Funding Rate
- **Peluang Short Squeeze (LONG):** Funding Rate negatif tajam ($\le -0.03\%$) dengan harga yang bertahan di atas support.
- **Bahaya Long Squeeze (Waspada):** Funding Rate sangat tinggi ($> +0.05\%$). Penjual siap menjebak posisi long ritel yang terlalu padat (*crowded trade*).

---

## BAB III: PROTOKOL UJI SILANG ADVERSARIAL (BULL VS BEAR & GATEKEEPER)

### 1. Uji Arena Debat Adversarial (Bull vs Bear Debate)
- Setiap sinyal wajib melalui uji silang argumen antara:
  - **Advokat Banteng (Bull Case):** Argumen tren, dorongan volume, dan momentum naik.
  - **Skeptik Beruang (Bear Devil's Advocate):** Mencari titik lemah, tembok resistensi pucuk, dan risiko BTC dump.
- **Vonis Arbiter:** Hanya eksekusi posisi jika Arbiter memutuskan pemenang searah (`BULL` atau `BEAR`) dengan skor keyakinan $\ge 80\%$. Jika vonis `NEUTRAL / WAIT & SEE`, tunda entri!

### 2. Verifikasi Risk Manager Gatekeeper (AutoHedge Protocol)
- Periksa badge Gatekeeper di kartu analisis:
  - **`APPROVED` (Hijau):** Parameter risiko aman. Eksekusi diperbolehkan.
  - **`CAUTION` (Kuning):** Terdapat friksi funding atau overbought; wajib turunkan leverage ke mode Safe (3x).
  - **`RESTRICTED` (Merah):** Bahaya makro terdeteksi. Dilarang membuka posisi baru!

---

## BAB IV: PROSEDUR EKSEKUSI ORDER DI BINANCE

1. **Buka Pasangan di Binance Futures:** Klik tombol *"Buka di Binance Futures"* dari terminal untuk memastikan ticker simbol tidak keliru (misal koin berawalan `1000PEPE` vs `PEPE`).
2. **Set Margin Mode:** Pilih **ISOLATED** (Bukan Cross).
3. **Set Multiplier Leverage:** Sesuaikan dengan rekomendasi terminal (Safe `3x-5x` atau Scalp `7x-10x`).
4. **Pasang Entry Limit:**
   - Gunakan *Limit Order* pada zona entri yang disarankan (`entryZone.low` s.d. `entryZone.high`).
   - Hindari mengejar harga (*Market FOMO*) jika lilin sudah terbang menjauhi zona entri.
5. **Pasang Stop Loss Wajib Seketika:**
   - Masukkan harga `Stop Loss` di kolom *Stop Market / TP-SL* sebelum menekan tombol Beli/Jual.
   - **Prinsip Besi:** Jangan pernah membiarkan posisi berjalan tanpa Stop Loss terpasang di server bursa!

---

## BAB V: MANAJEMEN POSISI AKTIF & EXIT STRATEGY

```
[ ENTRY TERCAPAI ] ──> [ HARGA MENUJU TP1 ] ──> [ AMANKAN 50% MUATAN ] ──> [ GESER SL KE BREAK-EVEN ]
                                                                                   │
                                                                                   ▼
                                                             [ SISA 50% RUNNING MENUJU TP2 & TP3 ]
```

### 1. Aturan Golden TP1 (Amankan 50% Profit)
- Ketika harga menyentuh target **TP1**:
  - **Wajib Close 50% Ukuran Posisi.**
  - Mengunci profit riil ke saldo dompet dan menurunkan tekanan psikologis trading.

### 2. Aturan Free-Trade (Break-Even Stop Loss)
- **Seketika setelah TP1 tertembus:**
  - **Geser Stop Loss (SL) dari posisi awal ke level Entry Price (Break-Even Point).**
  - **Dampak Psikologis:** Trade ini kini berstatus **100% BEBAS RISIKO (Risk-Free Trade)**. Skenario terburuk adalah sisa muatan ter-close di harga entri tanpa ada kerugian saldo sepeser pun.

### 3. Trailing Menuju TP2 dan TP3
- Sisa muatan $50\%$ dibiarkan berjalan menuju **TP2** (target swing intraday) dan **TP3** (target ekstensi tren besar).
- Saat TP2 tercapai, amankan lagi $25\%$ muatan, dan geser SL ke level profit TP1.

### 4. Disiplin Penerimaan Stop Loss (Anti-Revenge Trading)
- Jika harga berbalik arah dan menyentuh Stop Loss:
  - **Terima kerugian sebagai biaya operasional bisnis.**
  - Dilarang keras menggeser atau memperlebar Stop Loss saat harga mendekatinya!
  - Dilarang melakukan *Martingale* (melipatgandakan ukuran posisi untuk membalas kerugian).

---

## BAB VI: PROTOKOL DARURAT LINDUNG NILAI (DELTA-NEUTRAL AUTO-HEDGING)

### 1. Kapan Protokol Auto-Hedge Digunakan?
- Trader memegang posisi `LONG` pada altcoin (misal: SOL, PEPE, DOGE), tetapi tiba-tiba Bitcoin mengalami koreksi tajam (*flash dump*) di atas $-2\%$ yang dapat memicu likuidasi berantai pada pasar altcoin.

### 2. Langkah-Langkah Eksekusi Hedging:
1. Periksa rekomendasi Auto-Hedge di terminal.
2. Buka posisi **SHORT pada `BTCUSDT`** (atau `ETHUSDT`) dengan ukuran notional sebesar **$50\% – 75\%$** dari nominal posisi Long altcoin Anda.
3. Gunakan leverage konservatif **`3x Isolated`** dengan Stop Loss terukur $+1.5\%$ di atas entry hedge.
4. **Mekanisme Kerja:** Penurunan drastis pada altcoin Anda akan diimbangi oleh keuntungan dari posisi Short BTC. Nilai total portofolio Anda terkunci stabil (*Delta-Neutral*).
5. **Penutupan Posisi Hedge:**
   - Tutup posisi short hedge ketika Bitcoin menunjukkan pola pembalikan (*bottom reversal candle*) dan support 24 jam berhasil dipertahankan.

---

## BAB VII: DISIPLIN PSIKOLOGI & BATAS HARIAN (ANTI-REVENGE TRADING)

### 1. Aturan Batas Kerugian Harian (Max Daily Drawdown 5%)
- Jika dalam 1 hari kalender Anda mengalami **2 kali Stop Loss beruntun** atau akumulasi drawdown mencapai **$5.0\%$ modal dompet**:
  - **STOP TRADING HARI INI.**
  - Matikan terminal, tutup chart, dan lakukan *cooling-down* minimal 12 hingga 24 jam.
  - Pasar selalu ada besok; modal yang habis tidak bisa dikembalikan dalam sekejap.

### 2. Aturan Batas Kemenangan Harian (Greed Cap)
- Jika target keuntungan harian Anda sudah tercapai ($+5\%$ s.d. $+10\%$ pertumbuhan portofolio), kurangi frekuensi trading atau kunci profit ke dompet Spot / Rekening Bank. Jangan mengembalikan profit kepada bandar karena keserakahan (*overtrading*).

### 3. Jurnal Trading Berkala
- Catat setiap trade yang dilakukan:
  - Simbol koin, alasan entry, konfluensi yang terdeteksi, kepatuhan terhadap SL/TP, dan evaluasi hasil.

---

## 🎯 RINGKASAN CHEATSHEET 10 PERINTAH TRADER FUTURES

```
1.  Wajib Mode ISOLATED, Dilarang CROSS.
2.  Maksimal risiko per trade 2% modal (Dihitung via kalkulator terminal).
3.  Leverage aman 3x–5x (Swing) atau 7x–10x (Scalp).
4.  Cek Bitcoin Guard: Dilarang Long Altcoin jika BTC sedang dump.
5.  Volume 24h koin wajib minimal $12 Juta USD.
6.  Wajib pasang Stop Loss di server bursa SEBELUM menekan order.
7.  TP1 tercapai? Amankan 50% profit sekarang juga!
8.  TP1 tercapai? Langsung geser Stop Loss ke BREAK-EVEN!
9.  Rugi 2x beruntun hari ini? Tutup laptop, istirahat sampai besok.
10. Lindungi modal di atas segalanya — profit akan datang dengan sendirinya.
```

---
*Dokumen ini diterbitkan oleh AI Alpha Terminal Engineering Core untuk menjamin keselamatan modal dan konsistensi profitabilitas trader dalam ekosistem Binance Futures.*
