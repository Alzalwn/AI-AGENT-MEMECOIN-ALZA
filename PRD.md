# Product Requirements Document (PRD): Grok Trencher

## 1. Project Overview & Objectives
Grok Trencher adalah terminal trading terdesentralisasi otomatis multi-agen yang beroperasi di lingkungan Solana berkecepatan tinggi. Sistem ini menyaring, mengevaluasi narasi pasar, dan mengeksekusiperdagangan koin baru dengan intervensi manusia minimal melalui konsensus 5 AI Agent.

**Tujuan Bisnis & Metrik Sukses:**
* Sub-350ms end-to-end latency (dari emisi slot hingga konfirmasi bundle transaksi terverifikasi).
* 0% False Positives pada honeypot/rug-pull berkat sistem single-veto terdistribusi.
* Single Active Position Constraint: Mencegah fragmentasi modal dan eksposur risiko simultan.
* Mempertahankan expectancy edge rolling $E[R] \ge +3.0R$ dengan batas risiko kebangkrutan (*risk of ruin*) $\le 15\%$.

## 2. Target Audience & Personas
* **Algorithmic On-Chain Sniper:** Memerlukan eksekusi MEV privat tanpa kebocoran ke mempool publik, didukung antarmuka berkepadatan data tinggi.
* **Quantitative Risk Allocator:** Mengutamakan pengamanan modal melalui alokasi dinamis Fractional Kelly dan penolakan otomatis token yang terhubung dengan klaster dompet mencurigakan.

## 3. Core Features & Acceptance Criteria

| ID | Fitur | Deskripsi | Acceptance Criteria |
| :--- | :--- | :--- | :--- |
| **FR-01** | Real-time Ingestion | Mendengarkan peluncuran pool baru di Raydium & Pump.fun via gRPC Geyser RPC. | Event diproses engine dalam waktu $\le 50\text{ ms}$ pasca block commit. |
| **FR-02** | Strict Veto Consensus | 5 agen mengevaluasi sinyal serentak; 1 agen menolak = order dibatalkan seketika. | Jika ada 1 flag `VETO`, batalkan pipeline dalam waktu $\le 10\text{ ms}$ dan catat alasan ke Desk Feed. |
| **FR-03** | Single Position Lock | Terminal membatasi kepemilikan hanya pada 1 posisi aktif dalam satu waktu. | Mutex lock menolak seluruh sinyal baru selama status posisi masih `OPEN`. |
| **FR-04** | Jito MEV Bundling | Mengirim transaksi buy/sell melalui private bundle beserta dynamic tip. | Transaksi terhindar dari sandwich bot publik; tip menyesuaikan kepadatan jaringan. |
| **FR-05** | Desk Feed & Scan Grid | Feed aktivitas real-time dan matriks visual status token yang dipindai. | UI menampilkan pembaruan state via WebSocket tanpa lag rendering DOM (< 60 FPS drop). |

## 4. Multi-Agent Logic & Veto Threshold Matrix

Sinyal dieksekusi HANYA jika kelima agen mengeluarkan status `APPROVE`.

[ New Pool Event ]
│
├──────────────────────┬──────────────────────┬──────────────────────┐
▼                      ▼                      ▼                      ▼
[Scanner Agent]       [Narrative Agent]       [Risk Agent]           [Timing Agent]
LP >= $5,000          Cos-Sim >= 0.85        Mint/Freeze Revoked    Delta Volume > 0
│                      │                      │                      │
└──────────────────────┼──────────────────────┴──────────────────────┘
│
[Consensus Evaluator]
│
┌─────────────┴─────────────┐
[Any Veto == True]          [All Approved]
│                           │
▼                           ▼
Order Rejected             Check Mutex Lock
Log to Desk Feed                   │
┌───────┴───────┐
[Locked]       [Unlocked]
│               │
▼               ▼
Skip Signal    Execute Buy via Jito


**Matriks Ambang Batas Agen:**
* **Scanner Agent:** Veto jika Initial LP $< \$5,000$ USD atau burnt liquidity $< 100\%$.
* **Narrative Agent:** Veto jika vector cosine similarity terhadap active narrative cluster $< 0.85$.
* **Risk Agent:** Veto jika Mint Authority aktif, Freeze Authority ada, atau kepemilikan Top 10 non-LP holders $> 15\%$.
* **Timing Agent:** Veto jika buy/sell volume delta 15 detik bernilai negatif atau transaksi terkonsentrasi hanya pada 1 dompet.
* **Exit Agent:** Mengambil kendali penuh saat posisi `OPEN`. Memicu sell order jika mencapai target take-profit dinamis, trailing stop (loss $> 0.33R$), atau terjadi lonjakan tekanan jual (*exit pressure*).

## 5. UI/UX & High-Density Visual Specification
* **Skema Warna:** Hacker terminal dark (`#030706` background, `#0DF289` positive green, `#E5484D` veto red, `#161B19` cards).
* **Top Bar Telemetry:** Status engine (`LIVE`), runtime timer, Initial stake vs Current balance, PnL Multiplier tracker, dan counter penolakan token.
* **Main Visual Modules:**
  * **Cumulative Curve:** Grafik logaritmik saldo portofolio terintegrasi volume bar.
  * **4D Strategy Manifold:** Poligon radar 4 sumbu (Theme $\times$ Liquidity $\times$ Timing $\times$ Risk) dengan indikator skor koherensi.
  * **Narrative Embedding Cluster:** Visualisasi sebaran klaster 2D/3D (titik hijau: diterima, titik kuning/merah: ditolak).
  * **Scan Grid:** Matriks status 96 sel ringkas untuk memantau rasio token yang dipindai vs dieksekusi.

## 6. Risk Management & Quantitative Rules
* **Expectancy Formula:**
  $$E[R] = (p \cdot W) - ((1 - p) \cdot L)$$
  Terminal beroperasi dalam mode agresif hanya jika $E[R] \ge +1.5R$.
* **Sizing via Fractional Kelly:**
  $$f_{\text{used}} = 0.25 \times \left( \frac{p(b + 1) - 1}{b} \right)$$
  Batas maksimal alokasi modal per posisi dibatasi pada $\approx 6.2\%$ untuk menjaga estimasi *Risk of Ruin* tetap di bawah batas toleransi $15\%$.
* **Wallet Linkage Defense:** Pelacakan interaksi on-chain secara instan. Jika dompet deployer terafiliasi dengan riwayat scam, sistem langsung memberikan label *Risk Veto*.

## 7. Release Phases, Milestones & Edge-Case Handling

### 7.1 Release Roadmap
* **Milestone 1 (Data Ingestion & Filtering):** Integrasi Geyser gRPC plugin, pembuatan parser DEX, dan filter likuiditas dasar.
* **Milestone 2 (Agent Consensus Core):** Pipeline evaluasi paralel 5 agen berbasis async runtime.
* **Milestone 3 (Execution & MEV Engine):** Integrasi Jito Block Engine, penyusun transaksi bundle, dan single position mutex guard.
* **Milestone 4 (Telemetry & Dashboard):** Real-time WebSocket bridge, antarmuka terminal, dan visualisasi Canvas/WebGL.
* **Milestone 5 (Hardening & Auditing):** Replay testing pada 10.000 peluncuran token historis, fault-tolerance test, dan deployment bare-metal.

### 7.2 Edge Cases & Fallback Procedures
* **RPC Disconnect saat Posisi Terbuka:** Sistem langsung beralih (*failover*) ke secondary private RPC dalam $< 100\text{ ms}$. Jika sambungan putus total, Exit Agent mengeksekusi emergency sell via fallback relayer.
* **Jito Bundle Dropped:** Jika bundle tidak masuk ke dalam 2 slot blok berturut-turut, transaksi dibatalkan guna mencegah eksekusi pada deviasi harga yang terlalu tinggi.
* **Flash Rug / Liquidity Drain Mendadak:** Exit Agent memantau neraca pool secara kontinu. Penurunan likuiditas mendadak memicu order jual darurat dengan validator tip prioritas tinggi.
