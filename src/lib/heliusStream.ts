/**
 * Helius / Solana WebSocket Streamer
 * Menghubungkan WebSocket on-chain secara langsung ke Helius RPC untuk streaming sub-slot,
 * deteksi program Raydium / Pump.fun, dan pembaruan slot instan.
 *
 * [v2 — QA Reliability Update]
 * + Event counter per menit untuk monitoring throughput stream
 * + Watchdog timer: deteksi zombie connection (WS OPEN tapi 0 event > 3 menit) → force reconnect
 * + Log [CRITICAL] saat koneksi terputus atau stream membeku
 * + getStreamHealth() publik untuk health check API endpoint
 */

export interface PoolCreationEvent {
  platform: 'Pump.fun' | 'Raydium';
  programId: string;
  signature: string;
  slot?: number;
  detectedAt: number; // Date.now()
  instruction: string;
  rawLogs: string[];
}

export interface BlockchainStreamCallbacks {
  onSlot?: (slot: number) => void;
  onNewTokenEvent?: (mintOrSig: string) => void;
  onPoolCreated?: (event: PoolCreationEvent) => void;
  onStatusChange?: (status: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING') => void;
}

export interface StreamHealthReport {
  status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL' | 'OFFLINE';
  wsReadyState: 'CONNECTING' | 'OPEN' | 'CLOSING' | 'CLOSED' | 'UNAVAILABLE';
  eventsLastMinute: number;
  reconnectCount: number;
  uptimeSec: number;
  lastEventAt: string | null; // ISO 8601
  frozenMinutes: number; // Berapa menit tidak ada event (watchdog counter)
}

// Program IDs untuk Sniping Detik ke-0 (Block 0/1 Sniffer)
export const SOLANA_DEX_PROGRAMS = {
  PUMP_FUN: '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P',
  RAYDIUM_V4: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
  RAYDIUM_CPMM: 'CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C'
};

// Watchdog: Batas menit tanpa event sebelum dianggap zombie connection
const WATCHDOG_FROZEN_THRESHOLD_MINUTES = 3;
const WATCHDOG_CHECK_INTERVAL_MS = 60 * 1000; // Cek setiap 1 menit

export class HeliusBlockchainStream {
  private ws: any = null;
  private rpcUrl: string;
  private wsUrl: string;
  private callbacks: BlockchainStreamCallbacks = {};
  private reconnectTimer: NodeJS.Timeout | null = null;
  private watchdogTimer: NodeJS.Timeout | null = null;
  private isDestroyed = false;

  // — Stream Health Metrics —
  private eventsThisMinute = 0;
  private eventsLastMinute = 0;
  private reconnectCount = 0;
  private startedAt: number = Date.now();
  private lastEventAt: number | null = null;
  private frozenMinutes = 0; // Berapa menit berturut-turut tanpa event

  constructor(rpcHttpUrl?: string) {
    this.rpcUrl =
      rpcHttpUrl ||
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
      'https://mainnet.helius-rpc.com/?api-key=b1346052-9ac3-47b8-89ec-2ce7e88fa91b';
    this.wsUrl = this.rpcUrl.replace(/^http/, 'ws');
  }

  public connect(callbacks: BlockchainStreamCallbacks) {
    this.callbacks = callbacks;
    this.isDestroyed = false;
    this.startedAt = Date.now();
    this.initWebSocket();
    this.startWatchdog();
  }

  /**
   * Mengembalikan laporan kesehatan stream saat ini.
   * Digunakan oleh /api/health/rpc-stream endpoint.
   */
  public getStreamHealth(): StreamHealthReport {
    let wsReadyState: StreamHealthReport['wsReadyState'] = 'UNAVAILABLE';
    if (this.ws) {
      const states = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'] as const;
      wsReadyState = states[this.ws.readyState] ?? 'UNAVAILABLE';
    }

    let status: StreamHealthReport['status'] = 'OFFLINE';
    if (this.isDestroyed) {
      status = 'OFFLINE';
    } else if (wsReadyState === 'OPEN' && this.eventsLastMinute > 0) {
      status = 'HEALTHY';
    } else if (wsReadyState === 'OPEN' && this.frozenMinutes >= 1 && this.frozenMinutes < WATCHDOG_FROZEN_THRESHOLD_MINUTES) {
      status = 'DEGRADED';
    } else if (this.frozenMinutes >= WATCHDOG_FROZEN_THRESHOLD_MINUTES || wsReadyState === 'CLOSED') {
      status = 'CRITICAL';
    } else if (wsReadyState === 'CONNECTING') {
      status = 'DEGRADED';
    }

    return {
      status,
      wsReadyState,
      eventsLastMinute: this.eventsLastMinute,
      reconnectCount: this.reconnectCount,
      uptimeSec: Math.round((Date.now() - this.startedAt) / 1000),
      lastEventAt: this.lastEventAt ? new Date(this.lastEventAt).toISOString() : null,
      frozenMinutes: this.frozenMinutes,
    };
  }

  private getWebSocketConstructor(): any {
    if (typeof window !== 'undefined' && window.WebSocket) {
      return window.WebSocket;
    }
    if (typeof global !== 'undefined' && (global as any).WebSocket) {
      return (global as any).WebSocket;
    }
    return null;
  }

  private initWebSocket() {
    const WsClass = this.getWebSocketConstructor();
    if (!WsClass || this.isDestroyed) return;

    try {
      this.callbacks.onStatusChange?.('CONNECTING');
      this.ws = new WsClass(this.wsUrl);

      this.ws.onopen = () => {
        this.callbacks.onStatusChange?.('CONNECTED');
        this.frozenMinutes = 0; // Reset frozen counter on successful reconnect

        // 1. Subscribe ke live slot updates
        this.ws?.send(
          JSON.stringify({
            jsonrpc: '2.0',
            id: 101,
            method: 'slotSubscribe'
          })
        );

        // 2. Subscribe ke Pump.fun Creation & Bonding Curve events
        this.ws?.send(
          JSON.stringify({
            jsonrpc: '2.0',
            id: 102,
            method: 'logsSubscribe',
            params: [
              { mentions: [SOLANA_DEX_PROGRAMS.PUMP_FUN] },
              { commitment: 'processed' }
            ]
          })
        );

        // 3. Subscribe ke Raydium Liquidity Pool v4 mint logs (initialize2)
        this.ws?.send(
          JSON.stringify({
            jsonrpc: '2.0',
            id: 103,
            method: 'logsSubscribe',
            params: [
              { mentions: [SOLANA_DEX_PROGRAMS.RAYDIUM_V4] },
              { commitment: 'processed' }
            ]
          })
        );

        // 4. Subscribe ke Raydium CPMM pool initialization logs
        this.ws?.send(
          JSON.stringify({
            jsonrpc: '2.0',
            id: 104,
            method: 'logsSubscribe',
            params: [
              { mentions: [SOLANA_DEX_PROGRAMS.RAYDIUM_CPMM] },
              { commitment: 'processed' }
            ]
          })
        );
      };

      this.ws.onmessage = (event: any) => {
        try {
          const rawText = typeof event.data === 'string' ? event.data : event.data.toString();
          const data = JSON.parse(rawText);

          // — Track event activity untuk watchdog & health report —
          this.eventsThisMinute++;
          this.lastEventAt = Date.now();

          if (data.method === 'slotNotification' && data.params?.result?.slot) {
            this.callbacks.onSlot?.(data.params.result.slot);
          } else if (data.method === 'logsNotification') {
            const value = data.params?.result?.value;
            if (!value) return;

            // Jika transaksi gagal on-chain, abaikan (anti-failed tx snipe)
            if (value.err) return;

            const logs: string[] = value.logs || [];
            const signature: string = value.signature || '';

            // Deteksi Block 0/1 Creation Events:
            for (const log of logs) {
              // A. Pump.fun: Creation event / bonding curve initialization
              if (
                log.includes('Instruction: Create') ||
                log.includes('Program log: Instruction: Create') ||
                log.includes('initialize_mint')
              ) {
                const poolEvent: PoolCreationEvent = {
                  platform: 'Pump.fun',
                  programId: SOLANA_DEX_PROGRAMS.PUMP_FUN,
                  signature,
                  detectedAt: Date.now(),
                  instruction: 'Create',
                  rawLogs: logs
                };
                this.callbacks.onPoolCreated?.(poolEvent);
                this.callbacks.onNewTokenEvent?.(signature);
                break;
              }

              // B. Raydium V4 / CPMM: Initialize pool
              if (
                log.includes('initialize2') ||
                log.includes('InitializeInstruction2') ||
                log.includes('Instruction: Initialize')
              ) {
                const poolEvent: PoolCreationEvent = {
                  platform: 'Raydium',
                  programId: SOLANA_DEX_PROGRAMS.RAYDIUM_V4,
                  signature,
                  detectedAt: Date.now(),
                  instruction: 'initialize2',
                  rawLogs: logs
                };
                this.callbacks.onPoolCreated?.(poolEvent);
                this.callbacks.onNewTokenEvent?.(signature);
                break;
              }
            }
          }
        } catch {}
      };

      this.ws.onerror = () => {
        // Handled in onclose
      };

      this.ws.onclose = () => {
        console.error(`[CRITICAL] RPC Stream Disconnected - Reconnecting... (Reconnect #${this.reconnectCount + 1})`);
        this.callbacks.onStatusChange?.('DISCONNECTED');
        if (!this.isDestroyed) {
          this.scheduleReconnect();
        }
      };
    } catch {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectCount++;
    // Backoff eksponensial: 6s, 12s, 24s... maks 60s
    const backoffMs = Math.min(6000 * Math.pow(1.5, Math.min(this.reconnectCount - 1, 5)), 60000);
    this.reconnectTimer = setTimeout(() => {
      if (!this.isDestroyed) {
        this.initWebSocket();
      }
    }, backoffMs);
  }

  /**
   * Watchdog Timer: Berjalan setiap menit untuk memantau keaktifan stream.
   * Jika stream OPEN tapi tidak ada event masuk selama N menit → zombie connection.
   */
  private startWatchdog() {
    this.stopWatchdog();
    this.watchdogTimer = setInterval(() => {
      // Rekam event menit terakhir dan reset counter
      this.eventsLastMinute = this.eventsThisMinute;
      this.eventsThisMinute = 0;

      // Deteksi zombie connection
      if (this.ws && this.ws.readyState === 1 /* OPEN */) {
        if (this.eventsLastMinute === 0) {
          this.frozenMinutes++;
          if (this.frozenMinutes >= WATCHDOG_FROZEN_THRESHOLD_MINUTES) {
            console.error(
              `[CRITICAL] RPC Stream Frozen — ${this.frozenMinutes} menit tanpa event. Force reconnecting... (Uptime: ${Math.round((Date.now() - this.startedAt) / 1000)}s)`
            );
            try { this.ws.close(); } catch {}
            this.ws = null;
            this.frozenMinutes = 0;
            this.scheduleReconnect();
          } else {
            console.warn(`[WARN] RPC Stream belum aktif menerima event selama ${this.frozenMinutes} menit. Memantau...`);
          }
        } else {
          // Ada event masuk → stream sehat, reset frozen counter
          this.frozenMinutes = 0;
        }
      }
    }, WATCHDOG_CHECK_INTERVAL_MS);
  }

  private stopWatchdog() {
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }
  }

  public disconnect() {
    this.isDestroyed = true;
    this.stopWatchdog();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
  }
}
