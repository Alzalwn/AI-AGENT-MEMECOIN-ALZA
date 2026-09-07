import { TokenSignal, MoonshotVerdict, MoonshotPillars } from '../types/terminal';
import { DEFAULT_TRACKED_WALLETS } from '../lib/smartMoney';

/**
 * Moonshot Predictor Engine (Mesin Prediksi Pump 1000x)
 * 
 * Melakukan evaluasi kuantitatif multi-faktor terhadap token baru Solana:
 * 1. Velocity & Order Flow (Tx/detik, Rasio Buy/Sell, Lonjakan Unique Buyers) -> Maks 30 Poin
 * 2. Distribusi & Anti-Bundling (Top 10 Holder <= 30%, Creator <= 15%) -> Maks 25 Poin (VETO jika > 30%)
 * 3. Smart Money & Insider Tracking (Paus / Insider win-rate tinggi ikut masuk) -> Maks 25 Poin
 * 4. Verifikasi Keamanan Mutlak (Mint Revoked, Freeze Revoked, LP Burned >= 90%) -> 20 Poin (MANDATORY GATE)
 */
export class MoonshotAnalyzer {
  /**
   * Evaluasi aliran data token baru dan hasilkan probabilitas pump (0 - 100%)
   */
  public static evaluate(token: TokenSignal): MoonshotVerdict {
    const timestamp = Date.now();

    // =========================================================================
    // PILLAR 4: VERIFIKASI KEAMANAN MUTLAK (SYARAT WAJIB PUMP / RUG PROTECTION)
    // =========================================================================
    const mintRevoked = Boolean(token.mintAuthorityRevoked);
    const freezeRevoked = Boolean(token.freezeAuthorityRevoked);
    const lpBurntPct = token.burntLiquidityPct ?? 0;
    const isHoneypot = Boolean(token.isHoneypotDetected || token.rugcheckScore === 'DANGER');

    // Keamanan mutlak mewajibkan: Mint revoked, Freeze revoked, LP >= 90% burn, bukan honeypot
    const isAbsoluteSafe = mintRevoked && freezeRevoked && lpBurntPct >= 90 && !isHoneypot;
    let securityScore = isAbsoluteSafe ? 20 : 0;

    let securityVetoReason: string | undefined;
    if (!mintRevoked) {
      securityVetoReason = 'Mint Authority masih AKTIF: Risiko cetak suplai tak terbatas (Infinite Dilution/Rug).';
    } else if (!freezeRevoked) {
      securityVetoReason = 'Freeze Authority masih AKTIF: Risiko akun pembeli dibekukan pengembang (Blacklist/Can Not Sell).';
    } else if (lpBurntPct < 90) {
      securityVetoReason = `Likuiditas belum dibakar/kunci aman (${lpBurntPct}% < 90%): Risiko rug pull tarik pool LP kapan saja.`;
    } else if (isHoneypot) {
      securityVetoReason = 'Terdeteksi Honeypot / Skor Rugcheck DANGER: Token tidak dapat dijual kembali di DEX.';
    }

    // =========================================================================
    // PILLAR 2: DISTRIBUSI & ANTI-BUNDLING CHECK (MAKS 25 POIN / VETO JIKA > 30%)
    // =========================================================================
    const top10Pct = token.top10HolderPct ?? 0;
    const creatorPct = token.creatorBalancePct;

    // Developer bundling dump trap jika Top 10 > 30% atau creator > 15%
    const isBundled = top10Pct > 30 || (creatorPct !== undefined && creatorPct > 15);
    let distributionScore = 0;
    let distributionStatus: 'ORGANIC' | 'ACCEPTABLE' | 'BUNDLED_RISK' = 'ORGANIC';

    if (isBundled) {
      distributionScore = 0;
      distributionStatus = 'BUNDLED_RISK';
    } else if (top10Pct <= 12) {
      distributionScore = 25; // Distribusi sangat sehat & organik
      distributionStatus = 'ORGANIC';
    } else if (top10Pct <= 20) {
      distributionScore = 20; // Distribusi wajar
      distributionStatus = 'ORGANIC';
    } else {
      distributionScore = 12; // Rentang 21% - 30%
      distributionStatus = 'ACCEPTABLE';
    }

    // =========================================================================
    // PILLAR 1: ANALISIS VELOCITY & ORDER FLOW (MAKS 30 POIN)
    // =========================================================================
    // Gunakan metrik langsung jika ada, atau derivasi dari volumeDelta15s & uniqueBuyers
    const uniqueBuyers = token.uniqueBuyersCount ?? 1;
    let txVelocity = token.txVelocityPerSec;
    if (txVelocity === undefined) {
      // Perkiraan Tx/detik berbasis volume delta dan unique buyers
      txVelocity = +(Math.max(0.5, (uniqueBuyers * 1.8) + (token.volumeDelta15s > 0 ? token.volumeDelta15s * 0.8 : 0))).toFixed(1);
    }

    let buySellRatio = token.buySellRatio;
    if (buySellRatio === undefined) {
      if (token.volumeDelta15s >= 5) buySellRatio = 5.2;
      else if (token.volumeDelta15s >= 2) buySellRatio = 3.4;
      else if (token.volumeDelta15s >= 0) buySellRatio = 1.8;
      else buySellRatio = 0.6;
    }

    let orderFlowScore = 0;
    // Frekuensi Transaksi (Tx/s) - Maks 12 Poin
    if (txVelocity >= 10) orderFlowScore += 12;
    else if (txVelocity >= 5) orderFlowScore += 8;
    else if (txVelocity >= 2) orderFlowScore += 5;
    else orderFlowScore += 2;

    // Rasio Tekanan Beli (Buy/Sell Ratio) - Maks 10 Poin
    if (buySellRatio >= 4.0) orderFlowScore += 10;
    else if (buySellRatio >= 2.5) orderFlowScore += 7;
    else if (buySellRatio >= 1.5) orderFlowScore += 4;
    else if (buySellRatio >= 1.0) orderFlowScore += 1;

    // Unique Buyers Instant Spike - Maks 8 Poin
    if (uniqueBuyers >= 12) orderFlowScore += 8;
    else if (uniqueBuyers >= 6) orderFlowScore += 5;
    else if (uniqueBuyers >= 3) orderFlowScore += 3;
    else orderFlowScore += 1;

    // Penalti jika rasio beli di bawah 1.0 (tekanan jual / dump mendominasi)
    if (buySellRatio < 1.0) {
      orderFlowScore = 0; // Tidak ada momentum beli
    }

    const orderFlowStatus: 'EXPLOSIVE' | 'HEALTHY' | 'WEAK' =
      orderFlowScore >= 24 ? 'EXPLOSIVE' : orderFlowScore >= 14 ? 'HEALTHY' : 'WEAK';

    // =========================================================================
    // PILLAR 3: SMART MONEY & INSIDER TRACKING (MAKS 25 POIN)
    // =========================================================================
    let smartMoneyCount = token.smartMoneyCount ?? 0;
    const walletLabels: string[] = token.smartMoneyWallets ? [...token.smartMoneyWallets] : [];

    // Jika belum ada data eksplisit, cocokkan dengan preset tracked wallets
    if (smartMoneyCount === 0 && token.creatorAddress) {
      const match = DEFAULT_TRACKED_WALLETS.find((w) => w.address === token.creatorAddress);
      if (match) {
        smartMoneyCount += 1;
        walletLabels.push(`${match.label} (${match.winRatePct}% WR)`);
      }
    }

    // Jika unique buyers tinggi dengan volume masif dan narrative cosine > 0.88, deteksi pola whale/insider
    if (smartMoneyCount === 0 && uniqueBuyers >= 10 && token.narrativeCosineSim >= 0.88 && token.volumeDelta15s > 2) {
      smartMoneyCount = 1;
      walletLabels.push('Alpha Sniper Cluster (Early Inflow)');
    }

    let smartMoneyScore = 0;
    let smartMoneyStatus: 'ALPHA_WHALE_IN' | 'INSIDER_DETECTED' | 'RETAIL_ONLY' = 'RETAIL_ONLY';

    if (smartMoneyCount >= 2) {
      smartMoneyScore = 25; // 2+ dompet paus/insider
      smartMoneyStatus = 'ALPHA_WHALE_IN';
      if (walletLabels.length === 0) walletLabels.push('Multi-Whale Cluster Detected', 'Insider Win-Rate >80%');
    } else if (smartMoneyCount === 1) {
      smartMoneyScore = 18; // 1 dompet terdeteksi
      smartMoneyStatus = 'INSIDER_DETECTED';
      if (walletLabels.length === 0) walletLabels.push('Alpha Sniper (Early)');
    } else if (token.narrativeCosineSim >= 0.85 && token.volumeDelta15s > 0 && buySellRatio >= 1.5) {
      smartMoneyScore = 12; // Belum terdeteksi paus langsung, tapi narrative alignment kuat & volume positif
      smartMoneyStatus = 'RETAIL_ONLY';
    } else {
      smartMoneyScore = 2; // Arus ritel murni / volume stagnan
      smartMoneyStatus = 'RETAIL_ONLY';
    }

    // =========================================================================
    // HITUNG SKOR PROBABILITAS KOMPOSIT & STATUS KEPUTUSAN (0 - 100%)
    // =========================================================================
    const pillars: MoonshotPillars = {
      orderFlow: {
        score: orderFlowScore,
        txVelocityPerSec: txVelocity,
        buySellRatio,
        uniqueBuyersCount: uniqueBuyers,
        status: orderFlowStatus
      },
      distribution: {
        score: distributionScore,
        top10HolderPct: top10Pct,
        creatorBalancePct: creatorPct,
        isBundlingDetected: isBundled,
        status: distributionStatus
      },
      smartMoney: {
        score: smartMoneyScore,
        detectedCount: smartMoneyCount,
        walletLabels,
        status: smartMoneyStatus
      },
      security: {
        score: securityScore,
        mintRevoked,
        freezeRevoked,
        lpBurntPct,
        isHoneypot,
        isAbsoluteSafe
      }
    };

    // ATURAN VETO MUTLAK:
    // 1. Jika Keamanan gagal (Mint/Freeze aktif, LP belum burn, Honeypot) -> VETO & SKOR 0%
    if (!isAbsoluteSafe) {
      return {
        tokenMint: token.mint,
        symbol: token.symbol,
        moonshotScore: 0,
        tier: 'VETOED',
        isApproved: false,
        vetoReason: securityVetoReason || 'Keamanan on-chain gagal: Potensi rug pull / honeypot.',
        pumpThesis: `🛑 REJECTED: ${securityVetoReason || 'Gagal syarat mutlak keamanan.'}`,
        pillars,
        timestamp
      };
    }

    // 2. Jika Terindikasi Dev Bundling (Top 10 > 30% atau Creator > 15%) -> VETO & SKOR 0%
    if (isBundled) {
      const reason = top10Pct > 30
        ? `Top 10 wallet memegang ${top10Pct}% suplai (> 30%). Terindikasi developer bundling atau persiapan insider dump massal.`
        : `Creator wallet memegang ${creatorPct}% suplai (> 15%). Risiko rug pull likuidasi sepihak.`;
      return {
        tokenMint: token.mint,
        symbol: token.symbol,
        moonshotScore: 0,
        tier: 'VETOED',
        isApproved: false,
        vetoReason: reason,
        pumpThesis: `🛑 VETOED (ANTI-BUNDLING): ${reason}`,
        pillars,
        timestamp
      };
    }

    // Hitung Total Skor Probabilitas Pump (Maksimal 100%)
    const rawScore = orderFlowScore + distributionScore + smartMoneyScore + securityScore;
    const moonshotScore = Math.min(100, Math.max(0, rawScore));

    // Klasifikasi Tier
    let tier: 'SUPERNOVA' | 'HIGH_POTENTIAL' | 'MODERATE' | 'VETOED' = 'MODERATE';
    if (buySellRatio < 1.0) {
      tier = 'VETOED'; // Tekanan jual mendominasi
    } else if (moonshotScore >= 85) {
      tier = 'SUPERNOVA'; // 1000x potential setup
    } else if (moonshotScore >= 70) {
      tier = 'HIGH_POTENTIAL';
    } else if (moonshotScore >= 50) {
      tier = 'MODERATE';
    } else {
      tier = 'VETOED';
    }

    const isApproved = tier !== 'VETOED';
    const vetoReason = !isApproved
      ? (buySellRatio < 1.0
          ? `Tekanan jual mendominasi (Rasio Buy/Sell: ${buySellRatio.toFixed(1)}x < 1.0x). Risiko dump / sell-off berlanjut.`
          : `Skor probabilitas pump (${moonshotScore}%) berada di bawah ambang batas minimal 50%.`)
      : undefined;

    // Rangkai tesis kuantitatif singkat (Pump Thesis)
    let pumpThesis = '';
    if (tier === 'SUPERNOVA') {
      pumpThesis = `🚀 SUPERNOVA SETUP (${moonshotScore}%): Order flow agresif (${txVelocity} Tx/s, Buy Ratio ${buySellRatio.toFixed(1)}x) didukung akumulasi ${smartMoneyCount} dompet Smart Money. Suplai organik (Top 10: ${top10Pct}%) dengan keamanan mutlak 100% terverifikasi.`;
    } else if (tier === 'HIGH_POTENTIAL') {
      pumpThesis = `🔥 HIGH MOONSHOT (${moonshotScore}%): Lonjakan pembeli unik (${uniqueBuyers} wallets) & rasio beli kuat (${buySellRatio.toFixed(1)}x). Distribusi sehat (Top 10: ${top10Pct}%), mint/freeze aman & LP ${lpBurntPct}% terkunci.`;
    } else if (tier === 'MODERATE') {
      pumpThesis = `⚡ MODERATE PUMP (${moonshotScore}%): Momentum awal terbentuk (${txVelocity} Tx/s). Keamanan aman, namun aktivitas Smart Money masih dalam observasi awal.`;
    } else {
      pumpThesis = `⚠️ LOW CONVICTION (${moonshotScore}%): Order flow dan volume beli terlalu rendah untuk memicu momentum pump berkelanjutan.`;
    }

    return {
      tokenMint: token.mint,
      symbol: token.symbol,
      moonshotScore,
      tier,
      isApproved,
      vetoReason,
      pumpThesis,
      pillars,
      timestamp
    };
  }
}
