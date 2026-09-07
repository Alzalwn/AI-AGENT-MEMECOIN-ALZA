'use client';

/**
 * Helius / Solana WebSocket Streamer
 * Menghubungkan WebSocket on-chain secara langsung ke Helius RPC untuk streaming sub-slot,
 * deteksi program Raydium / Pump.fun, dan pembaruan slot instan.
 */

export interface BlockchainStreamCallbacks {
  onSlot?: (slot: number) => void;
  onNewTokenEvent?: (mint: string) => void;
  onStatusChange?: (status: 'CONNECTED' | 'DISCONNECTED' | 'CONNECTING') => void;
}

export class HeliusBlockchainStream {
  private ws: WebSocket | null = null;
  private rpcUrl: string;
  private wsUrl: string;
  private callbacks: BlockchainStreamCallbacks = {};
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isDestroyed = false;

  constructor(rpcHttpUrl?: string) {
    this.rpcUrl = rpcHttpUrl || process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=b1346052-9ac3-47b8-89ec-2ce7e88fa91b';
    this.wsUrl = this.rpcUrl.replace(/^http/, 'ws');
  }

  public connect(callbacks: BlockchainStreamCallbacks) {
    this.callbacks = callbacks;
    this.isDestroyed = false;
    this.initWebSocket();
  }

  private initWebSocket() {
    if (typeof window === 'undefined' || this.isDestroyed) return;

    try {
      this.callbacks.onStatusChange?.('CONNECTING');
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        this.callbacks.onStatusChange?.('CONNECTED');

        // 1. Subscribe ke live slot updates
        this.ws?.send(
          JSON.stringify({
            jsonrpc: '2.0',
            id: 101,
            method: 'slotSubscribe'
          })
        );

        // 2. Subscribe ke Raydium Liquidity Pool v4 mint logs
        this.ws?.send(
          JSON.stringify({
            jsonrpc: '2.0',
            id: 102,
            method: 'logsSubscribe',
            params: [
              { mentions: ['675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'] },
              { commitment: 'processed' }
            ]
          })
        );
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.method === 'slotNotification' && data.params?.result?.slot) {
            this.callbacks.onSlot?.(data.params.result.slot);
          } else if (data.method === 'logsNotification') {
            const logs: string[] = data.params?.result?.value?.logs || [];
            // Deteksi mint instruction atau initialize2
            for (const log of logs) {
              if (log.includes('initialize2') || log.includes('InitializeInstruction2')) {
                // Trigger token ingest signal
                this.callbacks.onNewTokenEvent?.('MINT_EVENT_DETECTED');
                break;
              }
            }
          }
        } catch {}
      };

      this.ws.onerror = () => {
        // Fallback silently handled on onclose
      };

      this.ws.onclose = () => {
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
    this.reconnectTimer = setTimeout(() => {
      if (!this.isDestroyed) {
        this.initWebSocket();
      }
    }, 8000);
  }

  public disconnect() {
    this.isDestroyed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      try {
        this.ws.close();
      } catch {}
      this.ws = null;
    }
  }
}
