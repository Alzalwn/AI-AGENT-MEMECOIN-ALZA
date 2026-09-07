import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const RPC_FALLBACKS = [
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL,
  'https://solana-rpc.publicnode.com',
  'https://api.mainnet-beta.solana.com',
  'https://solana.publicnode.com'
].filter(Boolean) as string[];

const SPL_TOKEN_PROGRAM = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const TOKEN_2022_PROGRAM = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';

const KNOWN_TOKENS_MAP: Record<string, { symbol: string; name: string; iconUrl?: string }> = {
  'So11111111111111111111111111111111111111112': {
    symbol: 'WSOL',
    name: 'Wrapped SOL',
    iconUrl: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png'
  },
  '2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv': {
    symbol: 'PENGU',
    name: 'Pudgy Penguins',
    iconUrl: 'https://cdn.dexscreener.com/cms/images/9d5188f603b49ab02f7a75e5d2c2959ec2947c98181501fb11688672e9394efd?width=800&height=800&quality=95&format=auto'
  },
  '7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr': {
    symbol: 'POPCAT',
    name: 'Popcat',
    iconUrl: 'https://cdn.dexscreener.com/cms/images/Pp6Fvh41hc0bHGK8?width=800&height=800&quality=95&format=auto'
  },
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': {
    symbol: 'Bonk',
    name: 'Bonk',
    iconUrl: 'https://cdn.dexscreener.com/cms/images/ba03c0370670d176dc33bbd212eb023337a460ad7edfa053ca96ae22f31c3dcf?width=800&height=800&quality=95&format=auto'
  },
  '9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump': {
    symbol: 'Fartcoin',
    name: 'Fartcoin',
    iconUrl: 'https://cdn.dexscreener.com/cms/images/9af5672845c89585e9ff1e3b26a640090324aa4d92222052d1043e60ef8182de?width=800&height=800&quality=95&format=auto'
  }
};

export interface TokenHolding {
  mint: string;
  symbol: string;
  name: string;
  decimals: number;
  rawAmount: string;
  uiAmount: number;
  priceUsd: number;
  priceSol: number;
  valueUsd: number;
  valueSol: number;
  iconUrl?: string;
  isToken2022?: boolean;
}

async function fetchProgramTokenAccounts(rpcUrl: string, address: string, programId: string): Promise<any[]> {
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getTokenAccountsByOwner',
      params: [
        address,
        { programId },
        { encoding: 'jsonParsed' }
      ]
    }),
    signal: AbortSignal.timeout(6000)
  });

  if (!response.ok) return [];
  const data = await response.json();
  return data.result?.value || [];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address')?.trim();

    if (!address || address.length < 32 || address.length > 44) {
      return NextResponse.json(
        { success: false, error: 'Valid Solana wallet address required' },
        { status: 400 }
      );
    }

    let rawAccounts: Array<{ pubkey: string; account: any; isToken2022: boolean }> = [];

    for (const rpcUrl of RPC_FALLBACKS) {
      try {
        const [splAccounts, token2022Accounts] = await Promise.all([
          fetchProgramTokenAccounts(rpcUrl, address, SPL_TOKEN_PROGRAM),
          fetchProgramTokenAccounts(rpcUrl, address, TOKEN_2022_PROGRAM).catch(() => [])
        ]);

        if (splAccounts.length > 0 || token2022Accounts.length > 0) {
          rawAccounts = [
            ...splAccounts.map((a: any) => ({ ...a, isToken2022: false })),
            ...token2022Accounts.map((a: any) => ({ ...a, isToken2022: true }))
          ];
          break;
        }
      } catch {
        continue;
      }
    }

    // Filter accounts with actual positive balances
    const activeAccounts = rawAccounts.filter((item) => {
      const parsed = item.account?.data?.parsed?.info;
      if (!parsed) return false;
      const amountStr = parsed.tokenAmount?.amount;
      const uiAmt = parsed.tokenAmount?.uiAmount;
      return uiAmt > 0 && amountStr !== '0';
    });

    if (activeAccounts.length === 0) {
      return NextResponse.json({
        success: true,
        address,
        holdings: [],
        totalTokensCount: 0,
        totalValueUsd: 0,
        totalValueSol: 0
      });
    }

    // Extract unique mints
    const mints: string[] = [];
    activeAccounts.forEach((item) => {
      const mint = item.account.data.parsed.info.mint;
      if (mint && !mints.includes(mint)) {
        mints.push(mint);
      }
    });

    // Query DexScreener for live pricing and metadata (in batches of 30)
    const marketMap: Record<
      string,
      { symbol: string; name: string; priceUsd: number; priceNative: number; iconUrl?: string }
    > = {};

    try {
      const batchMints = mints.slice(0, 30).join(',');
      const dexRes = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${batchMints}`, {
        signal: AbortSignal.timeout(4500)
      });
      if (dexRes.ok) {
        const dexData = await dexRes.json();
        for (const pair of dexData.pairs || []) {
          const base = pair.baseToken;
          if (base?.address && !marketMap[base.address]) {
            marketMap[base.address] = {
              symbol: base.symbol || '',
              name: base.name || '',
              priceUsd: parseFloat(pair.priceUsd || '0'),
              priceNative: parseFloat(pair.priceNative || '0'),
              iconUrl: pair.info?.imageUrl
            };
          }
        }
      }
    } catch (e: any) {
      console.warn('DexScreener enrichment error:', e.message);
    }

    let totalValueUsd = 0;
    let totalValueSol = 0;

    const holdings: TokenHolding[] = activeAccounts.map((item) => {
      const parsed = item.account.data.parsed.info;
      const mint = parsed.mint;
      const rawAmount = parsed.tokenAmount.amount;
      const decimals = parsed.tokenAmount.decimals;
      const uiAmount = parsed.tokenAmount.uiAmount || 0;

      const known = KNOWN_TOKENS_MAP[mint];
      const market = marketMap[mint];

      const symbol = (market?.symbol || known?.symbol || mint.slice(0, 4) + '...' + mint.slice(-4)).trim();
      const name = (market?.name || known?.name || symbol).trim();
      const iconUrl = market?.iconUrl || known?.iconUrl;
      const priceUsd = market?.priceUsd || 0;
      const priceSol = market?.priceNative || 0;

      const valueUsd = +(uiAmount * priceUsd).toFixed(2);
      const valueSol = +(uiAmount * priceSol).toFixed(4);

      totalValueUsd += valueUsd;
      totalValueSol += valueSol;

      return {
        mint,
        symbol,
        name,
        decimals,
        rawAmount,
        uiAmount,
        priceUsd,
        priceSol,
        valueUsd,
        valueSol,
        iconUrl,
        isToken2022: item.isToken2022
      };
    });

    // Sort by USD value descending
    holdings.sort((a, b) => b.valueUsd - a.valueUsd);

    return NextResponse.json({
      success: true,
      address,
      holdings,
      totalTokensCount: holdings.length,
      totalValueUsd: +totalValueUsd.toFixed(2),
      totalValueSol: +totalValueSol.toFixed(4)
    });
  } catch (err: any) {
    console.error('API /api/wallet/holdings error:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch wallet holdings' },
      { status: 500 }
    );
  }
}
