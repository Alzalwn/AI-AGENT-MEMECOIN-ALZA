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

/**
 * Hasil eksekusi order dari Binance Futures API
 */
export interface BinanceOrderResult {
  orderId: number;
  symbol: string;
  status: string; // 'NEW' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELED' | 'EXPIRED'
  clientOrderId: string;
  price: string;
  avgPrice: string;
  origQty: string;
  executedQty: string;
  type: string;
  side: string;
  positionSide: string;
  timeInForce: string;
  reduceOnly: boolean;
  closePosition: boolean;
  stopPrice: string;
  workingType: string;
  updateTime: number;
}

/**
 * Tipe request untuk membuka posisi futures
 */
export interface PlaceOrderParams {
  symbol: string;         // e.g. 'BTCUSDT'
  side: 'BUY' | 'SELL';  // BUY = LONG baru / tutup SHORT; SELL = SHORT baru / tutup LONG
  type: 'MARKET' | 'LIMIT' | 'STOP_MARKET' | 'TAKE_PROFIT_MARKET';
  quantity?: string;      // qty dalam base asset (e.g. '0.01' BTC)
  price?: string;         // untuk LIMIT order
  stopPrice?: string;     // untuk STOP_MARKET / TAKE_PROFIT_MARKET
  positionSide?: 'BOTH' | 'LONG' | 'SHORT'; // default 'BOTH' (one-way mode)
  reduceOnly?: boolean;   // true = hanya menutup posisi
  timeInForce?: 'GTC' | 'IOC' | 'FOK'; // untuk LIMIT
  closePosition?: boolean; // true = tutup seluruh posisi
  workingType?: 'CONTRACT_PRICE' | 'MARK_PRICE';
}

/**
 * 4. Membuka Posisi Futures Baru (POST /fapi/v1/order)
 * Gunakan hati-hati — ini adalah eksekusi nyata dengan uang nyata jika isTestnet=false.
 */
export async function placeFuturesOrder(
  credentials: BinanceApiCredentials,
  params: PlaceOrderParams
): Promise<BinanceOrderResult> {
  const orderParams: Record<string, string | number | boolean | undefined> = {
    symbol: params.symbol.trim().toUpperCase(),
    side: params.side,
    type: params.type,
    positionSide: params.positionSide || 'BOTH',
  };

  if (params.quantity) orderParams.quantity = params.quantity;
  if (params.price) orderParams.price = params.price;
  if (params.stopPrice) orderParams.stopPrice = params.stopPrice;
  if (params.reduceOnly !== undefined) orderParams.reduceOnly = String(params.reduceOnly);
  if (params.closePosition !== undefined) orderParams.closePosition = String(params.closePosition);
  if (params.timeInForce) orderParams.timeInForce = params.timeInForce;
  if (params.workingType) orderParams.workingType = params.workingType;

  return makeSignedRequest<BinanceOrderResult>('/fapi/v1/order', credentials, orderParams, 'POST');
}

/**
 * 5. Menutup Seluruh Posisi pada Simbol Tertentu (Market Close)
 * Otomatis menentukan sisi berlawanan berdasarkan positionAmt.
 */
export async function closeFuturesPosition(
  credentials: BinanceApiCredentials,
  symbol: string,
  positionAmt: string // nilai positionAmt dari getBinancePositions
): Promise<BinanceOrderResult> {
  const qty = Math.abs(parseFloat(positionAmt));
  if (qty <= 0) throw new Error(`Posisi ${symbol} tidak ditemukan atau sudah tertutup.`);

  // positionAmt positif = LONG (perlu SELL untuk tutup), negatif = SHORT (perlu BUY untuk tutup)
  const closeSide: 'BUY' | 'SELL' = parseFloat(positionAmt) > 0 ? 'SELL' : 'BUY';

  return placeFuturesOrder(credentials, {
    symbol,
    side: closeSide,
    type: 'MARKET',
    quantity: qty.toString(),
    reduceOnly: true,
  });
}

/**
 * 6. Mengambil Income/PnL Harian Dari Riwayat (GET /fapi/v1/income)
 * Digunakan untuk Daily Performance Summary & Drawdown Guard.
 */
export interface BinanceIncomeRecord {
  symbol: string;
  incomeType: string; // 'REALIZED_PNL' | 'FUNDING_FEE' | 'COMMISSION' | etc
  income: string;
  asset: string;
  info: string;
  time: number;
  tranId: string;
  tradeId: string;
}

export async function getBinanceDailyIncome(
  credentials: BinanceApiCredentials,
  startTime?: number,
  endTime?: number,
  limit: number = 1000
): Promise<BinanceIncomeRecord[]> {
  const params: Record<string, string | number | undefined> = {
    incomeType: 'REALIZED_PNL',
    limit,
  };
  if (startTime) params.startTime = startTime;
  if (endTime) params.endTime = endTime;

  return makeSignedRequest<BinanceIncomeRecord[]>('/fapi/v1/income', credentials, params, 'GET');
}

/**
 * 7. Mengatur Margin Type (POST /fapi/v1/marginType)
 * Mengunci ke mode ISOLATED agar saldo cross-wallet tidak terancam likuidasi.
 */
export async function setMarginType(
  credentials: BinanceApiCredentials,
  symbol: string,
  marginType: 'ISOLATED' | 'CROSSED'
): Promise<void> {
  try {
    await makeSignedRequest('/fapi/v1/marginType', credentials, {
      symbol: symbol.trim().toUpperCase(),
      marginType,
    }, 'POST');
  } catch (err: unknown) {
    // Error code -4046: "No need to change margin type." (sudah dalam ISOLATED/CROSSED), abaikan error ini
    if (err instanceof Error && (err.message.includes('-4046') || err.message.includes('4046'))) {
      return;
    }
    throw err;
  }
}

/**
 * 8. Mengatur Nilai Leverage (POST /fapi/v1/leverage)
 */
export async function setLeverage(
  credentials: BinanceApiCredentials,
  symbol: string,
  leverage: number
): Promise<{ leverage: number; symbol: string }> {
  return makeSignedRequest<{ leverage: number; symbol: string }>(
    '/fapi/v1/leverage',
    credentials,
    {
      symbol: symbol.trim().toUpperCase(),
      leverage: Math.round(leverage),
    },
    'POST'
  );
}

/**
 * 9. Memasang Auto-Bracket Stop Loss (STOP_MARKET)
 * Menggunakan MARK_PRICE untuk melindungi dari wick manipulation.
 */
export async function placeBracketStopLoss(
  credentials: BinanceApiCredentials,
  symbol: string,
  direction: 'LONG' | 'SHORT',
  stopPrice: number
): Promise<BinanceOrderResult> {
  // Menutup LONG butuh SELL; menutup SHORT butuh BUY
  const side: 'BUY' | 'SELL' = direction === 'LONG' ? 'SELL' : 'BUY';
  
  // Format stop price dengan presisi wajar
  const formattedStopPrice = stopPrice >= 1 ? stopPrice.toFixed(4) : stopPrice.toFixed(8);

  return makeSignedRequest<BinanceOrderResult>('/fapi/v1/order', credentials, {
    symbol: symbol.trim().toUpperCase(),
    side,
    type: 'STOP_MARKET',
    stopPrice: formattedStopPrice,
    closePosition: 'true',
    workingType: 'MARK_PRICE',
  }, 'POST');
}

export interface BracketOrderResult {
  marginType: 'ISOLATED';
  leverage: number;
  entryOrder: BinanceOrderResult;
  stopLossOrder: BinanceOrderResult | null;
  stopLossError?: string;
}

/**
 * 10. Eksekusi Full Bracket Order:
 * 1) Enforce ISOLATED margin
 * 2) Enforce leverage
 * 3) Eksekusi order entry (MARKET/LIMIT)
 * 4) Pasang otomatis bracket Stop Loss (STOP_MARKET @ MARK_PRICE)
 */
export async function placeFullBracketOrder(
  credentials: BinanceApiCredentials,
  params: PlaceOrderParams & {
    direction: 'LONG' | 'SHORT';
    stopLossPrice?: number;
    leverage?: number;
  }
): Promise<BracketOrderResult> {
  const symbol = params.symbol.trim().toUpperCase();
  const targetLeverage = params.leverage || 5;

  // Step 1: Enforce ISOLATED Margin
  try {
    await setMarginType(credentials, symbol, 'ISOLATED');
  } catch (err) {
    console.warn(`[BinanceAuthClient] Gagal setMarginType ${symbol} ke ISOLATED:`, err);
  }

  // Step 2: Enforce Leverage
  try {
    await setLeverage(credentials, symbol, targetLeverage);
  } catch (err) {
    console.warn(`[BinanceAuthClient] Gagal setLeverage ${symbol} ke ${targetLeverage}x:`, err);
  }

  // Step 3: Eksekusi order entry
  const entryOrder = await placeFuturesOrder(credentials, params);

  // Step 4: Pasang Auto Bracket Stop Loss jika stopLossPrice valid (> 0)
  let stopLossOrder: BinanceOrderResult | null = null;
  let stopLossError: string | undefined;

  if (params.stopLossPrice && params.stopLossPrice > 0) {
    try {
      stopLossOrder = await placeBracketStopLoss(
        credentials,
        symbol,
        params.direction,
        params.stopLossPrice
      );
    } catch (err: unknown) {
      stopLossError = err instanceof Error ? err.message : 'Gagal memasang Auto-SL';
      console.error(`[BinanceAuthClient] Gagal memasang Auto-SL ${symbol}:`, stopLossError);
    }
  }

  return {
    marginType: 'ISOLATED',
    leverage: targetLeverage,
    entryOrder,
    stopLossOrder,
    stopLossError,
  };
}

