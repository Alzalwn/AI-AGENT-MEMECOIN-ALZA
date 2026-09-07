import { NextRequest, NextResponse } from 'next/server';
import { Connection, Keypair, VersionedTransaction } from '@solana/web3.js';
// @ts-ignore
import bs58 from 'bs58';

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
        reason: 'AUTONOMOUS_SNIPER_PRIVATE_KEY tidak disetel di server. Menggunakan dompet Phantom client-side.'
      });
    }

    const body = await req.json();
    const {
      mint,
      symbol = '$TOKEN',
      amountSol = 0.05,
      slippageBps = 200,
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
    const lamportsIn = Math.floor(amountSol * 1_000_000_000);

    // 2. Ambil Quote Jupiter
    const quoteUrl = `https://api.jup.ag/swap/v1/quote?inputMint=${WSOL}&outputMint=${mint}&amount=${lamportsIn}&slippageBps=${slippageBps}`;
    const quoteRes = await fetch(quoteUrl, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'GrokTrencher-Sniper/2.0' },
      signal: AbortSignal.timeout(6000)
    });

    if (!quoteRes.ok) {
      return NextResponse.json(
        { success: false, error: `Quote Jupiter gagal: HTTP ${quoteRes.status}` },
        { status: 502 }
      );
    }

    const quoteData = await quoteRes.json();
    if (!quoteData || !quoteData.outAmount) {
      return NextResponse.json(
        { success: false, error: 'Quote Jupiter tidak memiliki rute likuiditas' },
        { status: 502 }
      );
    }

    // 3. Build Swap Transaction
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
        { success: false, error: 'Penyusunan swap transaction gagal' },
        { status: 502 }
      );
    }

    const { swapTransaction } = await swapRes.json();
    if (!swapTransaction) {
      return NextResponse.json(
        { success: false, error: 'Jupiter tidak mengembalikan swapTransaction' },
        { status: 502 }
      );
    }

    // 4. Tanda tangani transaksi dengan Hot Wallet Keypair Server
    const txBuffer = Buffer.from(swapTransaction, 'base64');
    const versionedTx = VersionedTransaction.deserialize(txBuffer);
    versionedTx.sign([keypair]);

    // 5. Kirim via Jito MEV Private Engine
    const signedBase64 = Buffer.from(versionedTx.serialize()).toString('base64');
    const jitoSig = await submitToJito(signedBase64);

    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://solana-rpc.publicnode.com';
    const connection = new Connection(rpcUrl, 'confirmed');

    let txSignature = jitoSig;
    if (!txSignature) {
      // Fallback submit via dedicated RPC
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

    // 6. Verifikasi konfirmasi on-chain
    try {
      await connection.confirmTransaction(txSignature, 'confirmed');
    } catch (confErr: any) {
      console.warn('[Auto-Snipe Server] Konfirmasi timeout (tx sudah broadcast):', confErr.message);
    }

    const outAmountFormatted = quoteData.outAmount
      ? (Number(quoteData.outAmount) / 10 ** (quoteData.outputDecimal || 6)).toLocaleString('en-US', { maximumFractionDigits: 2 })
      : 'Token';

    return NextResponse.json({
      success: true,
      signature: txSignature,
      txHash: txSignature,
      inAmountSol: amountSol,
      outAmountFormatted,
      outputMint: mint,
      symbol,
      isSimulated: false,
      signer: userPublicKey,
      timestamp: Date.now()
    });
  } catch (err: any) {
    console.error('API /api/bot/execute-snipe error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Auto-snipe server-side gagal' },
      { status: 500 }
    );
  }
}
