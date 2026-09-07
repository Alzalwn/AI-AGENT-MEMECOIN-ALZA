import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey, TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import {
  createCloseAccountInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID
} from '@solana/spl-token';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userPublicKey, mint, isToken2022 = false } = body;

    if (!userPublicKey || userPublicKey.length < 32 || !mint || mint.length < 32) {
      return NextResponse.json(
        { success: false, error: 'Valid userPublicKey and mint address required' },
        { status: 400 }
      );
    }

    const owner = new PublicKey(userPublicKey);
    const mintPubkey = new PublicKey(mint);
    const programId = isToken2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
    const ata = getAssociatedTokenAddressSync(mintPubkey, owner, false, programId);

    const rpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://solana-rpc.publicnode.com';
    const connection = new Connection(rpcUrl, 'confirmed');

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    const closeIx = createCloseAccountInstruction(ata, owner, owner, [], programId);

    const messageV0 = new TransactionMessage({
      payerKey: owner,
      recentBlockhash: blockhash,
      instructions: [closeIx]
    }).compileToV0Message();

    const transaction = new VersionedTransaction(messageV0);
    const serializedBase64 = Buffer.from(transaction.serialize()).toString('base64');

    return NextResponse.json({
      success: true,
      transaction: serializedBase64,
      lastValidBlockHeight,
      accountClosed: ata.toBase58()
    });
  } catch (err: any) {
    console.error('Close account API error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to assemble close account transaction' },
      { status: 500 }
    );
  }
}
