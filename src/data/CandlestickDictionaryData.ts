/**
 * Kamus Pola Candlestick & Reversal Setup Institusional
 * Diadopsi dari riset volume kuantitatif & Smart Money Concepts (SMC)
 * Dilengkapi data koordinat visual proporsional untuk rendering SVG diagram
 */

export interface DiagramCandle {
  isGreen: boolean;
  openPct: number;   // 0 - 100 (dari bawah ke atas)
  closePct: number;  // 0 - 100
  highPct: number;   // 0 - 100
  lowPct: number;    // 0 - 100
  label?: string;    // 'Lilin 1', 'Trigger', dll.
}

export interface CandlestickPatternItem {
  id: string;
  name: string;
  indonesianName: string;
  category: 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'SMC_SPECIAL' | 'CHART_PATTERN';
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  type: 'REVERSAL' | 'CONTINUATION';
  winrate: number;
  idealTimeframe: string;
  recommendedRr: string;
  
  // Koordinat Proporsional untuk Diagram SVG
  diagram: {
    candles: DiagramCandle[];
    entryLevelPct: number;
    stopLossLevelPct: number;
    tp1LevelPct: number;
    tp2LevelPct: number;
    invalidationDescription: string;
  };

  // SOP Eksekusi Disiplin
  executionRules: {
    entryTrigger: string;
    serverStopLoss: string;
    takeProfitPlan: string;
    idealConditions: string;
  };

  // Pengetahuan Smart Money
  smartMoneyRationale: string;
  trapsAndFakeouts: string[];
}

export const CANDLESTICK_DICTIONARY: CandlestickPatternItem[] = [
  {
    id: 'bullish_pinbar',
    name: 'Bullish Pinbar / Liquidity Sweep Hammer',
    indonesianName: 'Palu Sapuan Likuidasi Bullish (Pinbar Pembeli)',
    category: 'SINGLE',
    bias: 'BULLISH',
    type: 'REVERSAL',
    winrate: 76,
    idealTimeframe: '15m / 1h / 4h',
    recommendedRr: '1 : 3.0',
    diagram: {
      candles: [
        { isGreen: false, openPct: 75, closePct: 55, highPct: 80, lowPct: 50, label: 'Tren Turun' },
        { isGreen: true, openPct: 48, closePct: 62, highPct: 65, lowPct: 15, label: 'Pinbar Sweep' },
        { isGreen: true, openPct: 63, closePct: 85, highPct: 88, lowPct: 60, label: 'Konfirmasi' },
      ],
      entryLevelPct: 66,
      stopLossLevelPct: 12,
      tp1LevelPct: 85,
      tp2LevelPct: 98,
      invalidationDescription: 'Jika harga tembus di bawah ekor terendah lilin pinbar (Low)',
    },
    executionRules: {
      entryTrigger: 'Entry BUY/LONG saat candle berikutnya menembus High lilin Pinbar, atau limit order pada retest 50% wick ekor.',
      serverStopLoss: 'Wajib dipasang di server Binance 2 tick di bawah titik terendah (Low) ekor pinbar.',
      takeProfitPlan: 'TP1 di resistensi terdekat (amankan 50% profit & geser SL ke Break-Even), TP2 di swing high sebelumnya.',
      idealConditions: 'Wajib terjadi di zona Support Kunci, Order Block Bullish, atau setelah false breakdown pivot low.',
    },
    smartMoneyRationale: 'Market maker mendorong harga ke bawah support untuk memicu likuidasi retail buyer dan memancing retail seller (breakdown trap), lalu memborong kembali seluruh suplai dalam waktu singkat sehingga meninggalkan ekor panjang.',
    trapsAndFakeouts: [
      'Jangan tradingkan jika ekor panjang tidak menyentuh support kunci (terjadi di tengah-tengah rentang sideways).',
      'Hindari jika volume pada pinbar sangat tipis (menandakan ketiadaan partisipasi institusi).',
      'Hati-hati jika tren makro Bitcoin sedang dump tajam (melanggar aturan SOP Bitcoin Guard).',
    ],
  },
  {
    id: 'bearish_pinbar',
    name: 'Bearish Pinbar / Shooting Star (Institutional Rejection)',
    indonesianName: 'Bintang Jatuh Penolakan Institusional',
    category: 'SINGLE',
    bias: 'BEARISH',
    type: 'REVERSAL',
    winrate: 75,
    idealTimeframe: '15m / 1h / 4h',
    recommendedRr: '1 : 3.0',
    diagram: {
      candles: [
        { isGreen: true, openPct: 30, closePct: 50, highPct: 55, lowPct: 25, label: 'Tren Naik' },
        { isGreen: false, openPct: 52, closePct: 40, highPct: 88, lowPct: 38, label: 'Shooting Star' },
        { isGreen: false, openPct: 38, closePct: 18, highPct: 40, lowPct: 15, label: 'Konfirmasi' },
      ],
      entryLevelPct: 37,
      stopLossLevelPct: 90,
      tp1LevelPct: 20,
      tp2LevelPct: 5,
      invalidationDescription: 'Jika harga tembus dan close di atas ekor tertinggi lilin (High)',
    },
    executionRules: {
      entryTrigger: 'Entry SELL/SHORT saat candle berikutnya menembus Low lilin shooting star.',
      serverStopLoss: 'Wajib dipasang di server Binance 2 tick di atas titik tertinggi (High) ekor atas.',
      takeProfitPlan: 'TP1 di support terdekat (amankan 50% profit & geser ke BE), TP2 di swing low kunci.',
      idealConditions: 'Terjadi di Resistensi Mayor, Bearish Order Block, atau area Fair Value Gap (FVG) premium.',
    },
    smartMoneyRationale: 'Smart money menyapu likuidasi short seller yang menaruh Stop Loss di atas resistensi (liquidity grab), lalu membuang inventaris besar-besaran sebelum retail sempat bereaksi.',
    trapsAndFakeouts: [
      'Jangan entry jika ekor atas kurang dari 2x panjang body (bukan pinbar murni).',
      'Gagal jika volume beli masih sangat dominan pada candle konfirmasi.',
      'Dilarang short jika koin sedang dalam fase parabolic pump berita fundamental besar.',
    ],
  },
  {
    id: 'bullish_engulfing',
    name: 'Bullish Engulfing (Institutional Absorption)',
    indonesianName: 'Engulfing Bullish (Absorpsi Total Institusi)',
    category: 'DOUBLE',
    bias: 'BULLISH',
    type: 'REVERSAL',
    winrate: 79,
    idealTimeframe: '1h / 4h / 1d',
    recommendedRr: '1 : 3.5',
    diagram: {
      candles: [
        { isGreen: false, openPct: 60, closePct: 45, highPct: 63, lowPct: 42, label: 'Lilin Merah' },
        { isGreen: true, openPct: 40, closePct: 75, highPct: 78, lowPct: 38, label: 'Engulfing Hijau' },
        { isGreen: true, openPct: 76, closePct: 92, highPct: 95, lowPct: 73, label: 'Ekspansi' },
      ],
      entryLevelPct: 76,
      stopLossLevelPct: 36,
      tp1LevelPct: 92,
      tp2LevelPct: 100,
      invalidationDescription: 'Jika candle retest menembus di bawah dasar lilin engulfing',
    },
    executionRules: {
      entryTrigger: 'Entry BUY pada close lilin hijau yang menelan body lilin merah secara penuh.',
      serverStopLoss: 'Pasang di server Binance beberapa tick di bawah Low lilin engulfing hijau.',
      takeProfitPlan: 'TP1 pada swing high lokal (amankan 50% & set BE), TP2 pada resistensi berikutnya.',
      idealConditions: 'Didahului oleh minimal 3-5 candle merah menurun di zona support kuat.',
    },
    smartMoneyRationale: 'Institusi melakukan akumulasi agresif dengan order market beli besar yang melahap seluruh suplai penjualan candle sebelumnya.',
    trapsAndFakeouts: [
      'Engulfing kecil di dalam rentang lilin induk sebelumnya (hanya variasi inside bar, bukan absorpsi murni).',
      'Volume lilin hijau lebih kecil daripada volume lilin merah yang ditelan.',
      'Terjadi di bawah EMA-200 pada tren turun kuat tanpa konfluensi divergensi RSI.',
    ],
  },
  {
    id: 'bearish_engulfing',
    name: 'Bearish Engulfing (Distribution Overwhelm)',
    indonesianName: 'Engulfing Bearish (Banjir Suplai Distribusi)',
    category: 'DOUBLE',
    bias: 'BEARISH',
    type: 'REVERSAL',
    winrate: 78,
    idealTimeframe: '1h / 4h / 1d',
    recommendedRr: '1 : 3.5',
    diagram: {
      candles: [
        { isGreen: true, openPct: 40, closePct: 58, highPct: 60, lowPct: 38, label: 'Lilin Hijau' },
        { isGreen: false, openPct: 65, closePct: 28, highPct: 68, lowPct: 25, label: 'Engulfing Merah' },
        { isGreen: false, openPct: 27, closePct: 10, highPct: 29, lowPct: 6, label: 'Dump Lanjutan' },
      ],
      entryLevelPct: 27,
      stopLossLevelPct: 70,
      tp1LevelPct: 10,
      tp2LevelPct: 0,
      invalidationDescription: 'Jika candle berikutnya menembus kembali di atas High lilin merah',
    },
    executionRules: {
      entryTrigger: 'Entry SHORT saat lilin merah resmi ditutup di bawah open lilin hijau sebelumnya.',
      serverStopLoss: 'Pasang SL di atas High lilin engulfing merah.',
      takeProfitPlan: 'TP1 pada support terdekat, TP2 pada demand zone berikutnya.',
      idealConditions: 'Terjadi di puncak tren naik lokal setelah tanda-tanda kelelahan volume pembeli.',
    },
    smartMoneyRationale: 'Pasokan likuiditas baru didistribusikan secara masif oleh whale sehingga menenggelamkan daya beli retail dalam satu periode lilin.',
    trapsAndFakeouts: [
      'Engulfing pada koin dengan volume 24h tipis seringkali hanya fake wick manipulasi.',
      'Jangan short jika lilin hijau sebelumnya berukuran raksasa dan lilin merah hanya engulfing sebagian.',
      'Perhatikan sentimen makro jika ada rilis CPI atau FOMC yang volatil.',
    ],
  },
  {
    id: 'morning_star',
    name: 'Morning Star (Wyckoff Accumulation Turn)',
    indonesianName: 'Bintang Fajar (Pembalikan Akumulasi 3 Lilin)',
    category: 'TRIPLE',
    bias: 'BULLISH',
    type: 'REVERSAL',
    winrate: 82,
    idealTimeframe: '1h / 4h / 1d',
    recommendedRr: '1 : 4.0',
    diagram: {
      candles: [
        { isGreen: false, openPct: 80, closePct: 45, highPct: 83, lowPct: 42, label: 'Lilin 1 (Sell)' },
        { isGreen: false, openPct: 35, closePct: 30, highPct: 38, lowPct: 22, label: 'Bintang (Base)' },
        { isGreen: true, openPct: 38, closePct: 75, highPct: 78, lowPct: 34, label: 'Lilin 3 (Impuls)' },
      ],
      entryLevelPct: 76,
      stopLossLevelPct: 18,
      tp1LevelPct: 92,
      tp2LevelPct: 100,
      invalidationDescription: 'Jika harga tembus di bawah titik terendah lilin bintang tengah',
    },
    executionRules: {
      entryTrigger: 'Entry BUY pada close lilin ke-3 yang menembus lebih dari 50% body lilin merah pertama.',
      serverStopLoss: 'Pasang SL 2-3 tick di bawah Low lilin bintang tengah.',
      takeProfitPlan: 'TP1 di resistensi terdekat, kunci 50% profit dan trailing stop ke break-even.',
      idealConditions: 'Lilin tengah berukuran kecil (Doji / Spinning Top) yang menunjukkan ekuilibrium pasokan-permintaan.',
    },
    smartMoneyRationale: 'Lilin pertama adalah tekanan jual panik retail. Lilin kedua adalah fase absorpsi diam-diam bandar. Lilin ketiga adalah inisiasi mark-up harga impulsif oleh institusi.',
    trapsAndFakeouts: [
      'Lilin ke-3 gagal ditutup di atas setengah body lilin pertama (momentum pembeli lemah).',
      'Lilin bintang tengah memiliki ekor atas yang sangat panjang (masih ada tekanan jual sisa).',
      'Trading melawan tren 1-hari tanpa ada divergensi RSI bullish.',
    ],
  },
  {
    id: 'evening_star',
    name: 'Evening Star (Wyckoff Distribution Turn)',
    indonesianName: 'Bintang Kejora (Pembalikan Distribusi 3 Lilin)',
    category: 'TRIPLE',
    bias: 'BEARISH',
    type: 'REVERSAL',
    winrate: 81,
    idealTimeframe: '1h / 4h / 1d',
    recommendedRr: '1 : 4.0',
    diagram: {
      candles: [
        { isGreen: true, openPct: 20, closePct: 58, highPct: 62, lowPct: 18, label: 'Lilin 1 (Buy)' },
        { isGreen: true, openPct: 68, closePct: 72, highPct: 82, lowPct: 65, label: 'Bintang (Puncak)' },
        { isGreen: false, openPct: 65, closePct: 25, highPct: 67, lowPct: 22, label: 'Lilin 3 (Dump)' },
      ],
      entryLevelPct: 24,
      stopLossLevelPct: 84,
      tp1LevelPct: 8,
      tp2LevelPct: 0,
      invalidationDescription: 'Jika harga tembus di atas titik tertinggi lilin bintang atas',
    },
    executionRules: {
      entryTrigger: 'Entry SHORT pada close lilin ke-3 yang menembus ke dalam body lilin hijau pertama.',
      serverStopLoss: 'Pasang SL di atas High lilin bintang tengah.',
      takeProfitPlan: 'TP1 pada support terdekat, TP2 pada target likuidasi long terendah.',
      idealConditions: 'Terjadi di area overbought ekstrem dengan divergensi bearish.',
    },
    smartMoneyRationale: 'Fase klimaks pembelian (Buying Climax). Lilin tengah menjebak FOMO buyer, lalu lilin ketiga membanting harga saat suplai didistribusikan secara penuh.',
    trapsAndFakeouts: [
      'Lilin ke-3 ditutup tidak cukup dalam ke body lilin 1.',
      'Volume pada lilin ke-3 lebih kecil dari lilin 1.',
      'Muncul saat koin sedang trending naik super kuat di atas EMA-20 4H.',
    ],
  },
  {
    id: 'three_line_strike_bull',
    name: 'Three Line Strike Bullish (Elite Continuation)',
    indonesianName: 'Three Line Strike Bullish (Retest Cepat Tren Kuat)',
    category: 'SMC_SPECIAL',
    bias: 'BULLISH',
    type: 'CONTINUATION',
    winrate: 84,
    idealTimeframe: '15m / 1h / 4h',
    recommendedRr: '1 : 3.5',
    diagram: {
      candles: [
        { isGreen: true, openPct: 20, closePct: 35, highPct: 38, lowPct: 18, label: 'Lilin 1' },
        { isGreen: true, openPct: 36, closePct: 52, highPct: 55, lowPct: 33, label: 'Lilin 2' },
        { isGreen: true, openPct: 53, closePct: 70, highPct: 73, lowPct: 50, label: 'Lilin 3' },
        { isGreen: false, openPct: 75, closePct: 15, highPct: 78, lowPct: 12, label: 'Strike (Flush)' },
      ],
      entryLevelPct: 22,
      stopLossLevelPct: 8,
      tp1LevelPct: 75,
      tp2LevelPct: 95,
      invalidationDescription: 'Jika harga tembus di bawah Low lilin strike ke-4',
    },
    executionRules: {
      entryTrigger: 'Entry BUY segera setelah lilin strike ke-4 ditutup dan candle ke-5 mulai memantul.',
      serverStopLoss: 'Pasang SL 2 tick di bawah Low lilin ke-4.',
      takeProfitPlan: 'TP1 pada High lilin ke-3, TP2 pada ekstensi Fibonacci 1.618.',
      idealConditions: 'Tren utama adalah UPTREND kuat. Lilin ke-4 membersihkan stop loss penonton tren.',
    },
    smartMoneyRationale: 'Tiga lilin hijau membangun momentum. Satu lilin merah raksasa diciptakan untuk memicu trailing stop dan stop loss retail, memberikan likuiditas bagi institusi untuk menambah muatan sebelum tren berlanjut.',
    trapsAndFakeouts: [
      'Lilin merah ke-4 memicu breakdown struktur pasar (CHoCH) pada timeframe yang lebih tinggi.',
      'Ketiadaan respon pantulan segera pada lilin ke-5.',
      'Terjadi saat tren makro sedang Bearish dominan.',
    ],
  },
  {
    id: 'ict_turtle_soup',
    name: 'ICT Turtle Soup (Liquidity Pool Raid)',
    indonesianName: 'Sup Penyu ICT (Sapuan Stop Loss & Displacement)',
    category: 'SMC_SPECIAL',
    bias: 'BULLISH',
    type: 'REVERSAL',
    winrate: 80,
    idealTimeframe: '15m / 1h',
    recommendedRr: '1 : 4.0',
    diagram: {
      candles: [
        { isGreen: false, openPct: 70, closePct: 40, highPct: 72, lowPct: 38, label: 'Swing Low Lama' },
        { isGreen: false, openPct: 45, closePct: 32, highPct: 48, lowPct: 12, label: 'Raid (Sweep)' },
        { isGreen: true, openPct: 33, closePct: 75, highPct: 78, lowPct: 30, label: 'Displacement' },
      ],
      entryLevelPct: 42,
      stopLossLevelPct: 8,
      tp1LevelPct: 80,
      tp2LevelPct: 96,
      invalidationDescription: 'Jika harga menembus kembali di bawah titik ekor sweep terendah',
    },
    executionRules: {
      entryTrigger: 'Entry BUY saat candle sweep resmi ditutup KEMBALI DI ATAS level swing low yang disapu (Displacement Close).',
      serverStopLoss: 'Pasang SL persis di bawah titik terendah ekor sweep (Low raid).',
      takeProfitPlan: 'TP1 pada Swing High penyeimbang, TP2 pada zona likuidasi buy-side atas.',
      idealConditions: 'Terdapat kumpulan Equal Lows (EQH/EQL) yang jelas sebelum sapuan terjadi.',
    },
    smartMoneyRationale: 'Algoritma perbankan/institusi sengaja menyapu level di mana retail menaruh order Sell Stop / Liquidation, mengisi order posisi buy dalam jumlah besar tanpa menaikkan harga sebelum waktunya.',
    trapsAndFakeouts: [
      'Lilin sweep tidak mampu ditutup kembali di atas level swing low (berubah menjadi breakdown sejati).',
      'Volume sweep sangat kecil (bukan order flow institusional).',
      'Trading pada koin dengan likuidasi yang sudah kering atau volume harian < $10M.',
    ],
  },
  {
    id: 'inside_bar_breakout',
    name: 'Inside Bar (Volatility Compression Squeeze)',
    indonesianName: 'Inside Bar (Kompresi Volatilitas & Ledakan Harga)',
    category: 'DOUBLE',
    bias: 'NEUTRAL',
    type: 'CONTINUATION',
    winrate: 77,
    idealTimeframe: '1h / 4h',
    recommendedRr: '1 : 3.0',
    diagram: {
      candles: [
        { isGreen: true, openPct: 20, closePct: 70, highPct: 85, lowPct: 15, label: 'Lilin Induk (Mother)' },
        { isGreen: false, openPct: 58, closePct: 45, highPct: 65, lowPct: 35, label: 'Inside Bar' },
        { isGreen: true, openPct: 48, closePct: 92, highPct: 96, lowPct: 45, label: 'Breakout Impulsif' },
      ],
      entryLevelPct: 86,
      stopLossLevelPct: 30,
      tp1LevelPct: 96,
      tp2LevelPct: 100,
      invalidationDescription: 'Jika breakout ternyata fakeout dan berbalik menembus sisi berlawanan lilin induk',
    },
    executionRules: {
      entryTrigger: 'Pasang Buy Stop di atas High lilin induk (Mother Bar) atau Sell Stop di bawah Low lilin induk.',
      serverStopLoss: 'Pasang SL di midpoint (50%) lilin induk atau di sisi berlawanan inside bar.',
      takeProfitPlan: 'TP1 sebesar 1x panjang rentang lilin induk, TP2 sebesar 2x panjang rentang.',
      idealConditions: 'Muncul di akhir fase konsolidasi menyempit sebelum pembukaan sesi London/New York.',
    },
    smartMoneyRationale: 'Fase jeda di mana volatilitas dikompresi sebelum salah satu kubu (buyer atau seller) memicu ledakan order breakout secara terkoordinasi.',
    trapsAndFakeouts: [
      'Fake breakout di mana harga hanya menjulurkan wick sedikit lalu masuk kembali ke dalam body induk.',
      'Rentang lilin induk terlalu lebar sehingga jarak stop loss menjadi tidak efisien (R:R buruk).',
      'Muncul di akhir tren yang sudah over-extended (rawan pembalikan arah tiba-tiba).',
    ],
  },
  {
    id: 'tweezer_bottoms',
    name: 'Tweezer Bottoms (Double Equal Lows Sweep)',
    indonesianName: 'Tweezer Bottom (Dua Lilin Kaki Jepit di Support)',
    category: 'DOUBLE',
    bias: 'BULLISH',
    type: 'REVERSAL',
    winrate: 74,
    idealTimeframe: '15m / 1h / 4h',
    recommendedRr: '1 : 3.0',
    diagram: {
      candles: [
        { isGreen: false, openPct: 70, closePct: 35, highPct: 72, lowPct: 18, label: 'Uji Low 1' },
        { isGreen: true, openPct: 35, closePct: 68, highPct: 70, lowPct: 18, label: 'Uji Low 2' },
      ],
      entryLevelPct: 70,
      stopLossLevelPct: 14,
      tp1LevelPct: 88,
      tp2LevelPct: 100,
      invalidationDescription: 'Jika harga breakdown menembus level titik terendah kembar',
    },
    executionRules: {
      entryTrigger: 'Entry BUY saat lilin kedua ditutup hijau dan membuktikan penolakan di harga terendah yang sama.',
      serverStopLoss: 'Pasang SL 2-3 tick di bawah level kaki jepit kembar (Equal Lows).',
      takeProfitPlan: 'TP1 pada swing high penentu, TP2 pada resistensi berikutnya.',
      idealConditions: 'Kedua kaki ekor menyentuh level angka psikologis (misal $100, $50, $1.00) atau support harian.',
    },
    smartMoneyRationale: 'Dua kali pengujian di dasar harga membuktikan bahwa tidak ada lagi suplai jual yang bersedia mengeksekusi di bawah level tersebut (penyerapan selesai).',
    trapsAndFakeouts: [
      'Kedua lilin memiliki selisih low yang terlalu jauh (bukan tweezer sejati).',
      'Terjadi di tengah tren turun tanpa indikasi pelemahan momentum seller.',
      'Lilin kedua ditutup sebagai doji bervolume rendah (indikasi ketidakpastian, bukan daya dorong pembeli).',
    ],
  },
  {
    id: 'bull_flag',
    name: 'Bull Flag (Trend Continuation)',
    indonesianName: 'Bull Flag (Bendera Bullish Lanjutan)',
    category: 'CHART_PATTERN',
    bias: 'BULLISH',
    type: 'CONTINUATION',
    winrate: 78,
    idealTimeframe: '15m / 1h / 4h',
    recommendedRr: '1 : 3.0',
    diagram: {
      candles: [
        { isGreen: true, openPct: 15, closePct: 60, highPct: 65, lowPct: 10, label: 'Tiang (Impuls)' },
        { isGreen: false, openPct: 60, closePct: 50, highPct: 62, lowPct: 48, label: 'Koreksi 1' },
        { isGreen: false, openPct: 50, closePct: 40, highPct: 52, lowPct: 38, label: 'Koreksi 2' },
        { isGreen: true, openPct: 40, closePct: 85, highPct: 90, lowPct: 35, label: 'Breakout' },
      ],
      entryLevelPct: 60,
      stopLossLevelPct: 35,
      tp1LevelPct: 85,
      tp2LevelPct: 100,
      invalidationDescription: 'Jika harga tembus di bawah titik terendah dari zona bendera (bendera batal)',
    },
    executionRules: {
      entryTrigger: 'Entry BUY saat candle breakout ditutup dengan kuat di atas garis resistensi atas bendera.',
      serverStopLoss: 'Pasang SL 2-3 tick di bawah titik terendah (Low) dari bendera konsolidasi.',
      takeProfitPlan: 'TP1 sepanjang tiang bendera awal yang diproyeksikan, amankan 50% profit. TP2 pada target likuiditas lebih tinggi.',
      idealConditions: 'Tren awal sangat kuat (impuls). Volume menurun selama pembentukan bendera, dan meningkat drastis saat breakout.',
    },
    smartMoneyRationale: 'Smart Money sedang mengakumulasi ulang (re-accumulation) setelah dorongan naik besar. Mereka membiarkan retail *take profit* secara bertahap yang menciptakan pola bendera miring ke bawah, sebelum menyuntikkan volume lagi untuk melanjutkan tren.',
    trapsAndFakeouts: [
      'Breakout terjadi dengan volume rendah, indikasi ketiadaan minat institusi.',
      'Bendera turun terlalu dalam hingga melebihi 50% tiang (berubah menjadi pola pembalikan arah).',
      'Terjadi jebakan *fakeout* (breakout palsu ke bawah, lalu langsung ditarik ke atas).',
    ],
  },
  {
    id: 'bear_flag',
    name: 'Bear Flag (Trend Continuation)',
    indonesianName: 'Bear Flag (Bendera Bearish Lanjutan)',
    category: 'CHART_PATTERN',
    bias: 'BEARISH',
    type: 'CONTINUATION',
    winrate: 76,
    idealTimeframe: '15m / 1h / 4h',
    recommendedRr: '1 : 3.0',
    diagram: {
      candles: [
        { isGreen: false, openPct: 85, closePct: 40, highPct: 90, lowPct: 35, label: 'Tiang (Dump)' },
        { isGreen: true, openPct: 40, closePct: 50, highPct: 52, lowPct: 38, label: 'Koreksi 1' },
        { isGreen: true, openPct: 50, closePct: 60, highPct: 62, lowPct: 48, label: 'Koreksi 2' },
        { isGreen: false, openPct: 60, closePct: 15, highPct: 65, lowPct: 10, label: 'Breakdown' },
      ],
      entryLevelPct: 40,
      stopLossLevelPct: 65,
      tp1LevelPct: 15,
      tp2LevelPct: 0,
      invalidationDescription: 'Jika harga tembus di atas titik tertinggi dari zona bendera (pembalikan tren)',
    },
    executionRules: {
      entryTrigger: 'Entry SHORT saat candle breakdown ditutup di bawah garis support bendera.',
      serverStopLoss: 'Pasang SL di atas titik tertinggi (High) dari bendera konsolidasi.',
      takeProfitPlan: 'TP1 memproyeksikan ukuran tiang awal, TP2 pada support makro berikutnya.',
      idealConditions: 'Penurunan harga sangat agresif (panic selling). Volume menyusut saat pantulan, menunjukkan pembeli lemah.',
    },
    smartMoneyRationale: 'Institusi yang melakukan short (jual kosong) sedang menahan harga dan mendistribusikan lebih banyak koin. Pembeli ritel mencoba menangkap pisau jatuh (membuat bendera miring ke atas) sebelum akhirnya terjebak likuidasi.',
    trapsAndFakeouts: [
      'Jika bendera memantul terlalu tinggi menembus level 0.618 Fibonacci dari tiang.',
      'Volume breakout kecil yang menandakan tidak ada sisa penjual.',
      'Hati-hati jika pasar secara umum dalam fase banteng (bull market) ekstrem.',
    ],
  },
  {
    id: 'triangle_pattern',
    name: 'Triangle (Volatility Squeeze)',
    indonesianName: 'Segitiga (Kompresi Volatilitas & Breakout)',
    category: 'CHART_PATTERN',
    bias: 'NEUTRAL',
    type: 'CONTINUATION',
    winrate: 75,
    idealTimeframe: '1h / 4h / 1d',
    recommendedRr: '1 : 3.0',
    diagram: {
      candles: [
        { isGreen: true, openPct: 30, closePct: 70, highPct: 75, lowPct: 25, label: 'Ayunan Lebar' },
        { isGreen: false, openPct: 70, closePct: 40, highPct: 72, lowPct: 38, label: 'Low Naik' },
        { isGreen: true, openPct: 40, closePct: 60, highPct: 62, lowPct: 38, label: 'High Turun' },
        { isGreen: true, openPct: 60, closePct: 90, highPct: 95, lowPct: 58, label: 'Breakout' },
      ],
      entryLevelPct: 62,
      stopLossLevelPct: 38,
      tp1LevelPct: 90,
      tp2LevelPct: 100,
      invalidationDescription: 'Jika breakout gagal dan menembus garis support sebaliknya (fakeout)',
    },
    executionRules: {
      entryTrigger: 'Entry saat harga ditutup (close candle) melewati salah satu sisi garis batas segitiga dengan volume tinggi.',
      serverStopLoss: 'Pasang SL di seberang breakout (misal: jika tembus atas, SL di titik pantul bawah terdekat).',
      takeProfitPlan: 'TP1 sebesar lebar atau ketinggian awal dari mulut segitiga.',
      idealConditions: 'Volume harus terus mengecil selama fase segitiga, dan membesar pada saat breakout.',
    },
    smartMoneyRationale: 'Terjadi pertempuran seimbang antara pembeli dan penjual hingga ruang gerak harga menyempit (kompresi volatilitas). Pada titik ujung, order-order yang terkumpul memicu reaksi berantai stop-loss.',
    trapsAndFakeouts: [
      'Banyak institusi memalsukan breakout ke satu sisi hanya untuk memicu stop-loss ritel, lalu membanting harga ke arah sebenarnya (Turtle Soup).',
      'Menghindari entry sebelum konfirmasi penutupan candle kuat.',
    ],
  },
  {
    id: 'cup_and_handle',
    name: 'Cup & Handle (Accumulation Base)',
    indonesianName: 'Cangkir & Gagang (Dasar Akumulasi Makro)',
    category: 'CHART_PATTERN',
    bias: 'BULLISH',
    type: 'CONTINUATION',
    winrate: 79,
    idealTimeframe: '4h / 1d / 1w',
    recommendedRr: '1 : 4.0',
    diagram: {
      candles: [
        { isGreen: false, openPct: 70, closePct: 30, highPct: 75, lowPct: 25, label: 'Turun Awal' },
        { isGreen: true, openPct: 30, closePct: 30, highPct: 35, lowPct: 20, label: 'Dasar (U-Shape)' },
        { isGreen: true, openPct: 30, closePct: 70, highPct: 75, lowPct: 25, label: 'Naik (Bibir)' },
        { isGreen: false, openPct: 70, closePct: 55, highPct: 72, lowPct: 50, label: 'Gagang' },
        { isGreen: true, openPct: 55, closePct: 90, highPct: 95, lowPct: 50, label: 'Breakout' },
      ],
      entryLevelPct: 72,
      stopLossLevelPct: 50,
      tp1LevelPct: 90,
      tp2LevelPct: 100,
      invalidationDescription: 'Jika gagang menembus terlalu dalam (di bawah 50% tinggi cangkir)',
    },
    executionRules: {
      entryTrigger: 'Entry BUY saat resistance leher (garis bibir cangkir) tertembus oleh candle konfirmasi, atau breakout dari gagang.',
      serverStopLoss: 'Pasang SL di bawah titik terendah dari pola "gagang".',
      takeProfitPlan: 'TP1 diproyeksikan dari kedalaman cangkir ditambahkan ke titik breakout.',
      idealConditions: 'Pola cangkir harus berbentuk "U" bukan "V". Volume di dasar cangkir mengecil, dan breakout memicu spike volume besar.',
    },
    smartMoneyRationale: 'Smart Money secara pelan-pelan menyerap semua suplai jual di dasar cangkir. Bagian "gagang" adalah guncangan terakhir (shakeout) tangan-tangan lemah sebelum lonjakan harga dibiarkan terjadi.',
    trapsAndFakeouts: [
      'Gagang turun melebihi level 0.5 Fibonacci (cangkir cacat).',
      'Dasar yang terlalu lancip ("V" shape) menunjukkan volatilitas tinggi, bukan akumulasi tersembunyi.',
    ],
  },
  {
    id: 'head_and_shoulders',
    name: 'Head and Shoulders (Major Reversal)',
    indonesianName: 'Head & Shoulders (Pembalikan Tren Puncak)',
    category: 'CHART_PATTERN',
    bias: 'BEARISH',
    type: 'REVERSAL',
    winrate: 77,
    idealTimeframe: '1h / 4h / 1d',
    recommendedRr: '1 : 3.5',
    diagram: {
      candles: [
        { isGreen: true, openPct: 40, closePct: 70, highPct: 75, lowPct: 35, label: 'Bahu Kiri' },
        { isGreen: false, openPct: 70, closePct: 40, highPct: 72, lowPct: 35, label: 'Koreksi' },
        { isGreen: true, openPct: 40, closePct: 90, highPct: 95, lowPct: 35, label: 'Kepala' },
        { isGreen: false, openPct: 90, closePct: 40, highPct: 92, lowPct: 35, label: 'Koreksi' },
        { isGreen: true, openPct: 40, closePct: 65, highPct: 70, lowPct: 35, label: 'Bahu Kanan' },
      ],
      entryLevelPct: 40,
      stopLossLevelPct: 70,
      tp1LevelPct: 15,
      tp2LevelPct: 0,
      invalidationDescription: 'Jika harga tembus dan naik melebihi bahu kanan (setup gagal)',
    },
    executionRules: {
      entryTrigger: 'Entry SHORT saat garis leher (Neckline) ditembus dan ditutup dengan candle merah solid.',
      serverStopLoss: 'Pasang SL beberapa tick di atas titik tertinggi dari Bahu Kanan.',
      takeProfitPlan: 'TP1 dihitung dari jarak Kepala ke Neckline lalu diproyeksikan ke bawah. TP2 untuk posisi sisa.',
      idealConditions: 'Volume tertinggi terjadi pada Bahu Kiri. Pada Bahu Kanan volume sangat mengering (tanda kelelahan buyer).',
    },
    smartMoneyRationale: 'Fase distribusi makro (Wyckoff). Institusi mendorong harga untuk membentuk puncak (Kepala) guna menjebak pembeli FOMO, kemudian menjual bertahap pada bahu kanan saat ritel berusaha menangkap pisau jatuh.',
    trapsAndFakeouts: [
      'Garis leher menukik ke atas dengan sangat curam (tanda tren bull masih ada).',
      'Hanya ekor panjang yang menembus garis leher (fake breakdown) yang diakhiri pembalikan cepat.',
    ],
  },
  {
    id: 'double_top_bottom',
    name: 'Double Top / Double Bottom (Liquidity Sweep)',
    indonesianName: 'Double Top/Bottom (Sapu Bersih Likuidasi)',
    category: 'CHART_PATTERN',
    bias: 'NEUTRAL',
    type: 'REVERSAL',
    winrate: 80,
    idealTimeframe: '15m / 1h / 4h',
    recommendedRr: '1 : 3.0',
    diagram: {
      candles: [
        { isGreen: false, openPct: 90, closePct: 35, highPct: 95, lowPct: 30, label: 'Kaki Kiri' },
        { isGreen: true, openPct: 35, closePct: 70, highPct: 75, lowPct: 30, label: 'Lembah Tengah' },
        { isGreen: false, openPct: 70, closePct: 32, highPct: 75, lowPct: 25, label: 'Kaki Kanan' },
        { isGreen: true, openPct: 32, closePct: 90, highPct: 95, lowPct: 28, label: 'Breakout Leher' },
      ],
      entryLevelPct: 70,
      stopLossLevelPct: 25,
      tp1LevelPct: 90,
      tp2LevelPct: 100,
      invalidationDescription: 'Jika harga tembus ekstrem melewati batas double top/bottom (struktur rusak)',
    },
    executionRules: {
      entryTrigger: 'Untuk W-Bottom, Entry BUY ketika garis resistensi tengah (huruf "W") ditembus dengan kuat. Opsi agresif: Buy di kaki kanan setelah ada sweep konfirmasi (Turtle Soup).',
      serverStopLoss: 'Pasang SL tepat di luar batas ekstrem harga terendah/tertinggi kaki kedua.',
      takeProfitPlan: 'TP1 sebesar rentang tinggi "M" atau "W". TP2 pada zona likuiditas berikutnya.',
      idealConditions: 'Kaki kedua dari pola sebaiknya melakukan "sapuan likuidasi" (sweep) sedikit di bawah kaki pertama, sebelum langsung berbalik (deviasi Wyckoff).',
    },
    smartMoneyRationale: 'Smart money menciptakan puncak ganda / lembah ganda untuk mengelabui trader penembusan dan mengambil SL dari trader yang salah arah (Equal Highs / Equal Lows raid).',
    trapsAndFakeouts: [
      'Bentuk "M" atau "W" yang miring terlalu ekstrem biasanya hanyalah struktur tren lanjutan.',
      'Kaki kedua tidak disertai divergensi (RSI / MACD), menandakan momentum pelemahan harga palsu.',
    ],
  }
];
