/**
 * Helius / Solana WebSocket Streamer
 * Menghubungkan WebSocket on-chain secara langsung ke Helius RPC untuk streaming sub-slot,
 * deteksi program Raydium / Pump.fun, dan pembaruan slot instan.
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

// Program IDs untuk Sniping Detik ke-0 (Block 0/1 Sniffer)
export const SOLANA_DEX_PROGRAMS = {
  PUMP_FUN: '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P',
  RAYDIUM_V4: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
  RAYDIUM_CPMM: 'CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C'
};

export class HeliusBlockchainStream {
  private ws: any = null;
  private rpcUrl: string;
  private wsUrl: string;
  private callbacks: BlockchainStreamCallbacks = {};
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isDestroyed = false;

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
    this.initWebSocket();
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
    }, 6000);
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
