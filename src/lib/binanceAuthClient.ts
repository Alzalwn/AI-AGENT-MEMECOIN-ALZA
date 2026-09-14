import crypto from 'crypto';

export interface BinanceApiCredentials {
  apiKey: string;
  apiSecret: string;
  isTestnet?: boolean;
}

export interface BinanceAccountInfo {
  totalWalletBalance: string;
  availableBalance: string;
  totalUnrealizedProfit: string;
  totalMarginBalance: string;
  canTrade: boolean;
  canDeposit: boolean;
  canWithdraw: boolean;
  updateTime: number;
  positions: Array<{
    symbol: string;
    initialMargin: string;
    maintMargin: string;
    unrealizedProfit: string;
    positionInitialMargin: string;
    openOrderInitialMargin: string;
    leverage: string;
    isolated: boolean;
    entryPrice: string;
    breakEvenPrice?: string;
    maxNotional: string;
    positionSide: string;
    positionAmt: string;
    notional: string;
    isolatedWallet: string;
    updateTime: number;
  }>;
  assets: Array<{
    asset: string;
    walletBalance: string;
    unrealizedProfit: string;
    marginBalance: string;
    maintMargin: string;
    initialMargin: string;
    positionInitialMargin: string;
    openOrderInitialMargin: string;
    crossWalletBalance: string;
    crossUnPnl: string;
    availableBalance: string;
    maxWithdrawAmount: string;
  }>;
}

export interface BinancePositionRisk {
  symbol: string;
  positionAmt: string;
  entryPrice: string;
  breakEvenPrice: string;
  markPrice: string;
  unRealizedProfit: string;
  liquidationPrice: string;
  leverage: string;
  maxNotionalValue: string;
  marginType: string;
  isolatedMargin: string;
  isAutoAddMargin: string;
  positionSide: string;
  notional: string;
  isolatedWallet: string;
  updateTime: number;
}

export interface BinanceUserTrade {
  id: number;
  buyer: boolean;
  commission: string;
  commissionAsset: string;
  maker: boolean;
  marginAsset: string;
  orderId: number;
  positionSide: string;
  price: string;
  qty: string;
  quoteQty: string;
  realizedPnl: string;
  side: 'BUY' | 'SELL';
  symbol: string;
  time: number;
}

/**
 * Base URL penentu antara Binance Futures Mainnet dan Testnet
 */
export function getBinanceBaseUrl(isTestnet?: boolean): string {
  if (isTestnet) {
    return 'https://testnet.binancefuture.com';
  }
  return 'https://fapi.binance.com';
}

/**
 * Membuat HMAC-SHA256 signature sesuai standar Binance API
 */
export function generateBinanceSignature(queryString: string, apiSecret: string): string {
  return crypto.createHmac('sha256', apiSecret).update(queryString).digest('hex');
}

/**
 * Helper untuk melakukan HTTP signed request ke Binance Futures API
 */
async function makeSignedRequest<T>(
  endpoint: string,
  credentials: BinanceApiCredentials,
  params: Record<string, string | number | boolean | undefined> = {},
  method: 'GET' | 'POST' | 'DELETE' = 'GET'
): Promise<T> {
  const { apiKey, apiSecret, isTestnet } = credentials;

  if (!apiKey || !apiSecret) {
    throw new Error('API Key dan Secret Key Binance wajib diisi.');
  }

  const baseUrl = getBinanceBaseUrl(isTestnet);
  const timestamp = Date.now();
  const recvWindow = 5000;

  // Build query string
  const queryParams = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null) {
      queryParams.append(key, String(val));
    }
  });
  queryParams.append('recvWindow', String(recvWindow));
  queryParams.append('timestamp', String(timestamp));

  const queryString = queryParams.toString();
  const signature = generateBinanceSignature(queryString, apiSecret);
  const fullUrl = `${baseUrl}${endpoint}?${queryString}&signature=${signature}`;

  const headers: Record<string, string> = {
    'X-MBX-APIKEY': apiKey,
    'Content-Type': 'application/json',
    'User-Agent': 'Grok-Trencher-Pro/1.0',
  };

  const response = await fetch(fullUrl, {
    method,
    headers,
    cache: 'no-store',
  });

  const rawData = await response.text();
  let json: unknown;
  try {
    json = JSON.parse(rawData);
  } catch {
    throw new Error(`Respons bukan JSON dari Binance (${response.status}): ${rawData.slice(0, 150)}`);
  }

  if (!response.ok) {
    const binanceError = json as { code?: number; msg?: string };
    const errMsg = binanceError.msg || `HTTP ${response.status}: Gagal memanggil Binance API`;
    if (binanceError.code === -2015) {
      throw new Error(`API Key / IP Whitelist tidak valid atau tidak memiliki izin Futures: ${errMsg}`);
    } else if (binanceError.code === -1021) {
      throw new Error(`Perbedaan waktu sistem (Timestamp out of sync): ${errMsg}`);
    }
    throw new Error(`[Binance Error ${binanceError.code || response.status}] ${errMsg}`);
  }

  return json as T;
}

/**
 * 1. Mengambil Informasi Akun & Saldo (GET /fapi/v2/account)
 */
export async function getBinanceAccountInfo(
  credentials: BinanceApiCredentials
): Promise<BinanceAccountInfo> {
  return makeSignedRequest<BinanceAccountInfo>('/fapi/v2/account', credentials, {}, 'GET');
}

/**
 * 2. Mengambil Posisi Aktif / Terbuka (GET /fapi/v2/positionRisk)
 */
export async function getBinancePositions(
  credentials: BinanceApiCredentials,
  symbol?: string
): Promise<BinancePositionRisk[]> {
  const params: Record<string, string | undefined> = {};
  if (symbol) {
    params.symbol = symbol.trim().toUpperCase();
  }
  const allPositions = await makeSignedRequest<BinancePositionRisk[]>(
    '/fapi/v2/positionRisk',
    credentials,
    params,
    'GET'
  );

  // Filter hanya posisi yang memiliki ukuran tidak nol jika tidak spesifik mencari symbol
  if (!symbol && Array.isArray(allPositions)) {
    return allPositions.filter((pos) => Math.abs(parseFloat(pos.positionAmt)) > 0);
  }

  return allPositions;
}

/**
 * 3. Mengambil Riwayat Transaksi Pengguna (GET /fapi/v1/userTrades)
 */
export async function getBinanceUserTrades(
  credentials: BinanceApiCredentials,
  symbol?: string,
  limit: number = 50
): Promise<BinanceUserTrade[]> {
  const params: Record<string, string | number | undefined> = { limit };
  if (symbol) {
    params.symbol = symbol.trim().toUpperCase();
  }

  return makeSignedRequest<BinanceUserTrade[]>(
    '/fapi/v1/userTrades',
    credentials,
    params,
    'GET'
  );
}
