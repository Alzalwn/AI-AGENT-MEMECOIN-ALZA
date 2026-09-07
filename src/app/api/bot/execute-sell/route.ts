import { NextRequest, NextResponse } from 'next/server';
import { Connection, Keypair, PublicKey, VersionedTransaction } from '@solana/web3.js';
// @ts-ignore
import bs58 from 'bs58';
import { lamportsToSol } from '@/lib/solanaMath';

export const dynamic = 'force-dynamic';

const JITO_ENDPOINTS = [
  'https://tokyo.mainnet.block-engine.jito.wtf/api/v1/transactions',
  'https://frankfurt.mainnet.block-engine.jito.wtf/api/v1/transactions',
  'https://ny.mainnet.block-engine.jito.wtf/api/v1/transactions'
];

async function submitToJito(serializedBase64: string): Promise<string | null> {
  for (const ep of JITO_ENDPOINTS) {
    try {
      const res = await fetch(ep, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'sendTransaction',
          params: [serializedBase64, { encoding: 'base64', skipPreflight: true }]
        }),
        signal: AbortSignal.timeout(6000)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.result) return data.result;
      }
    } catch {
      continue;
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const privateKey = process.env.AUTONOMOUS_SNIPER_PRIVATE_KEY?.trim();

    if (!privateKey || privateKey.length < 20) {
      return NextResponse.json({
        success: false,
        requiresClientSign: true,
        reason: 'AUTONOMOUS_SNIPER_PRIVATE_KEY tidak disetel di server. Memerlukan sign via dompet Phantom di browser.'
      });
    }

    const body = await req.json();
    const {
      mint,
      percentage = 100,
      slippageBps = 250,
      jitoTipSol = 0.0001
    } = body;

    if (!mint || mint.length < 32) {
      return NextResponse.json(
        { success: false, error: 'Alamat mint tidak valid' },
        { status: 400 }
      );
    }

    // 1. Inisialisasi Keypair
    let keypair: Keypair;
    try {
      const secretBytes = bs58.decode(privateKey);
      keypair = Keypair.fromSecretKey(secretBytes);
    } catch (err: any) {
      return NextResponse.json(
        { success: false, error: `Format private key server tidak valid: ${err.message}` },
        { status: 500 }
      );
    }

    const userPublicKey = keypair.publicKey.toBase58();
    const WSOL = 'So11111111111111111111111111111111111111112';
    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://solana-rpc.publicnode.com';
    const connection = new Connection(rpcUrl, 'confirmed');

    // 2. Ambil token account on-chain untuk mendapatkan saldo token riil
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(keypair.publicKey, {
      mint: new PublicKey(mint)
    });

    if (!tokenAccounts.value || tokenAccounts.value.length === 0) {
      return NextResponse.json(
        { success: false, error: `Dompet tidak memiliki token account untuk mint: ${mint}` },
        { status: 404 }
      );
    }

    const tokenAccountInfo = tokenAccounts.value[0].account.data.parsed.info;
    const rawBalanceStr = tokenAccountInfo.tokenAmount.amount; // raw base units
    const decimals = tokenAccountInfo.tokenAmount.decimals;
    const uiBalance = tokenAccountInfo.tokenAmount.uiAmount || 0;

    if (BigInt(rawBalanceStr) <= BigInt(0)) {
      return NextResponse.json(
        { success: false, error: 'Saldo token di dompet 0 atau sudah terjual.' },
        { status: 400 }
      );
    }

    // Hitung porsi token yang akan dijual
    const portion = Math.max(0.01, Math.min(1.0, (percentage || 100) / 100));
    let rawUnitsToSell = (BigInt(rawBalanceStr) * BigInt(Math.round(portion * 1000))) / BigInt(1000);
    if (rawUnitsToSell <= BigInt(0)) {
      rawUnitsToSell = BigInt(rawBalanceStr);
    }

    const uiTokensSold = uiBalance * portion;

    // 3. Ambil Quote Jupiter (Token -> WSOL)
    const quoteUrl = `https://api.jup.ag/swap/v1/quote?inputMint=${mint}&outputMint=${WSOL}&amount=${rawUnitsToSell.toString()}&slippageBps=${slippageBps}`;
    const quoteRes = await fetch(quoteUrl, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'GrokTrencher-Sniper/2.0' },
      signal: AbortSignal.timeout(6000)
    });

    if (!quoteRes.ok) {
      return NextResponse.json(
        { success: false, error: `Quote Jupiter Sell gagal: HTTP ${quoteRes.status}` },
        { status: 502 }
      );
    }

    const quoteData = await quoteRes.json();
    if (!quoteData || !quoteData.outAmount) {
      return NextResponse.json(
        { success: false, error: 'Tidak ada rute likuiditas untuk menjual token ini ke SOL' },
        { status: 502 }
      );
    }

    const solReceived = lamportsToSol(quoteData.outAmount);

    // 4. Build Swap Transaction (Sell)
    const swapRes = await fetch('https://api.jup.ag/swap/v1/swap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'GrokTrencher-Sniper/2.0' },
      body: JSON.stringify({
        quoteResponse: quoteData,
        userPublicKey,
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: Math.floor(jitoTipSol * 1_000_000_000)
      }),
      signal: AbortSignal.timeout(8000)
    });

    if (!swapRes.ok) {
      return NextResponse.json(
        { success: false, error: 'Penyusunan sell swap transaction gagal' },
        { status: 502 }
      );
    }

    const { swapTransaction } = await swapRes.json();
    if (!swapTransaction) {
      return NextResponse.json(
        { success: false, error: 'Jupiter tidak mengembalikan swapTransaction untuk sell' },
        { status: 502 }
      );
    }

    // 5. Tanda tangani transaksi dengan Keypair
    const txBuffer = Buffer.from(swapTransaction, 'base64');
    const versionedTx = VersionedTransaction.deserialize(txBuffer);
    versionedTx.sign([keypair]);

    // 6. Kirim via Jito atau Fallback RPC
    const signedBase64 = Buffer.from(versionedTx.serialize()).toString('base64');
    let txSignature = await submitToJito(signedBase64);

    if (!txSignature) {
      try {
        txSignature = await connection.sendRawTransaction(versionedTx.serialize(), {
          skipPreflight: true,
          maxRetries: 3
        });
      } catch (rpcErr: any) {
        return NextResponse.json(
          { success: false, error: `Kirim transaksi on-chain gagal: ${rpcErr.message}` },
          { status: 500 }
        );
      }
    }

    // 7. Tunggu konfirmasi on-chain singkat
    try {
      await connection.confirmTransaction(txSignature, 'confirmed');
    } catch (confErr: any) {
      console.warn('[Auto-Sell Server] Konfirmasi timeout (tx sudah broadcast):', confErr.message);
    }

    return NextResponse.json({
      success: true,
      signature: txSignature,
      txHash: txSignature,
      tokensSold: uiTokensSold,
      solReceived,
      mint,
      signer: userPublicKey,
      timestamp: Date.now()
    });
  } catch (err: any) {
    console.error('API /api/bot/execute-sell error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Auto-sell server-side gagal' },
      { status: 500 }
    );
  }
}
