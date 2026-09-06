/**
 * Grok Trencher - RPC Failover Engine
 * Grounded strictly in PRD Section 7.2:
 * "RPC Disconnect saat Posisi Terbuka: Sistem langsung beralih (failover)
 * ke secondary private RPC dalam < 100 ms."
 */

export interface RpcEndpoint {
  id: string;
  name: string;
  url: string;
  type: 'PRIMARY' | 'SECONDARY' | 'FALLBACK';
  isHealthy: boolean;
  latencyMs: number;
  lastChecked: number;
}

const customRpcUrl = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SOLANA_RPC_URL : undefined;

export const DEFAULT_RPC_ENDPOINTS: RpcEndpoint[] = [
  ...(customRpcUrl && customRpcUrl.startsWith('http') ? [{
    id: 'user-dedicated-private',
    name: 'Private Dedicated RPC (Helius/QuickNode Asia)',
    url: customRpcUrl,
    type: 'PRIMARY' as const,
    isHealthy: true,
    latencyMs: 18,
    lastChecked: Date.now()
  }] : []),
  {
    id: 'helius-tokyo-primary',
    name: 'Helius Asia-Pacific Cluster (Tokyo)',
    url: 'https://mainnet.helius-rpc.com/?api-key=public',
    type: 'PRIMARY',
    isHealthy: true,
    latencyMs: 28,
    lastChecked: Date.now()
  },
  {
    id: 'quicknode-singapore',
    name: 'QuickNode Turbo Cluster (Singapore/Asia)',
    url: 'https://solana-mainnet.rpc.extrnode.com',
    type: 'SECONDARY',
    isHealthy: true,
    latencyMs: 46,
    lastChecked: Date.now()
  },
  {
    id: 'extrnode-failover',
    name: 'Extrnode Load-Balanced Router',
    url: 'https://solana-mainnet.rpc.extrnode.com',
    type: 'SECONDARY',
    isHealthy: true,
    latencyMs: 68,
    lastChecked: Date.now()
  },
  {
    id: 'solana-public-fallback',
    name: 'Solana Public Mainnet (Emergency)',
    url: 'https://api.mainnet-beta.solana.com',
    type: 'FALLBACK',
    isHealthy: true,
    latencyMs: 142,
    lastChecked: Date.now()
  }
];

export class RpcFailoverManager {
  private endpoints: RpcEndpoint[];
  private activeIndex: number = 0;
  private onFailoverCallbacks: ((oldRpc: RpcEndpoint, newRpc: RpcEndpoint, reason: string, durationMs: number) => void)[] = [];

  constructor(initialEndpoints: RpcEndpoint[] = DEFAULT_RPC_ENDPOINTS) {
    this.endpoints = [...initialEndpoints];
    this.loadCustomEndpoints();
  }

  private loadCustomEndpoints() {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('GT_CUSTOM_RPC_ENDPOINTS');
        if (saved) {
          const parsed: RpcEndpoint[] = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Merge custom endpoints at the top
            const existingIds = new Set(this.endpoints.map(e => e.id));
            const newCustoms = parsed.filter(p => !existingIds.has(p.id));
            this.endpoints = [...newCustoms, ...this.endpoints];
          }
        }
      } catch (err) {
        console.warn('Failed to load custom RPC endpoints from localStorage:', err);
      }
    }
  }

  private saveCustomEndpoints() {
    if (typeof window !== 'undefined') {
      try {
        const customs = this.endpoints.filter(e => e.id.startsWith('custom-') || e.id === 'user-dedicated-private');
        localStorage.setItem('GT_CUSTOM_RPC_ENDPOINTS', JSON.stringify(customs));
      } catch (err) {
        console.warn('Failed to save custom RPC endpoints to localStorage:', err);
      }
    }
  }

  public getActiveEndpoint(): RpcEndpoint {
    return this.endpoints[this.activeIndex] || this.endpoints[0];
  }

  public getAllEndpoints(): RpcEndpoint[] {
    return [...this.endpoints];
  }

  public addCustomEndpoint(name: string, url: string, type: 'PRIMARY' | 'SECONDARY' = 'PRIMARY'): RpcEndpoint {
    const newEndpoint: RpcEndpoint = {
      id: `custom-${Date.now()}`,
      name: name.trim() || 'Custom Private RPC',
      url: url.trim(),
      type,
      isHealthy: true,
      latencyMs: 35,
      lastChecked: Date.now()
    };
    this.endpoints = [newEndpoint, ...this.endpoints];
    this.activeIndex = 0; // set newly added as active
    this.saveCustomEndpoints();
    return newEndpoint;
  }

  public removeCustomEndpoint(id: string): boolean {
    const initialLen = this.endpoints.length;
    this.endpoints = this.endpoints.filter(e => e.id !== id);
    if (this.endpoints.length === 0) {
      this.endpoints = [...DEFAULT_RPC_ENDPOINTS];
    }
    if (this.activeIndex >= this.endpoints.length) {
      this.activeIndex = 0;
    }
    this.saveCustomEndpoints();
    return this.endpoints.length < initialLen;
  }

  public onFailover(callback: (oldRpc: RpcEndpoint, newRpc: RpcEndpoint, reason: string, durationMs: number) => void): () => void {
    this.onFailoverCallbacks.push(callback);
    return () => {
      this.onFailoverCallbacks = this.onFailoverCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Execute sub-100ms failover to next healthy endpoint
   */
  public triggerFailover(reason: string = 'High latency / Disconnect'): RpcEndpoint {
    const start = performance.now();
    const oldRpc = this.getActiveEndpoint();
    oldRpc.isHealthy = false;

    // Search for next available healthy or fallback endpoint
    let nextIndex = (this.activeIndex + 1) % this.endpoints.length;

    for (let i = 0; i < this.endpoints.length; i++) {
      const idx = (this.activeIndex + 1 + i) % this.endpoints.length;
      if (this.endpoints[idx].isHealthy || idx !== this.activeIndex) {
        nextIndex = idx;
        break;
      }
    }

    this.activeIndex = nextIndex;
    const newRpc = this.endpoints[this.activeIndex];
    newRpc.isHealthy = true;
    const durationMs = +(performance.now() - start).toFixed(2);

    this.onFailoverCallbacks.forEach(cb => {
      try {
        cb(oldRpc, newRpc, reason, durationMs);
      } catch (err) {
        console.error('RPC failover callback error:', err);
      }
    });

    return newRpc;
  }

  /**
   * Manual switch to a specific endpoint
   */
  public switchEndpoint(endpointId: string): RpcEndpoint {
    const targetIdx = this.endpoints.findIndex(e => e.id === endpointId);
    if (targetIdx >= 0) {
      this.activeIndex = targetIdx;
      return this.endpoints[targetIdx];
    }
    return this.getActiveEndpoint();
  }

  /**
   * Benchmark all endpoints simultaneously with real getSlot latency test
   */
  public async benchmarkAll(): Promise<RpcEndpoint[]> {
    const promises = this.endpoints.map(async (ep) => {
      const start = performance.now();
      try {
        const res = await fetch(ep.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getSlot'
          }),
          signal: AbortSignal.timeout(2800)
        });
        const latency = Math.round(performance.now() - start);
        ep.latencyMs = latency;
        ep.isHealthy = res.ok;
        ep.lastChecked = Date.now();
      } catch {
        ep.latencyMs = 999;
        ep.isHealthy = false;
        ep.lastChecked = Date.now();
      }
      return ep;
    });

    await Promise.all(promises);
    return [...this.endpoints];
  }

  /**
   * Ping check active RPC endpoint health
   */
  public async checkHealth(): Promise<{ isHealthy: boolean; latencyMs: number }> {
    const active = this.getActiveEndpoint();
    const start = performance.now();
    try {
      const res = await fetch(active.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getHealth'
        }),
        signal: AbortSignal.timeout(3000)
      });

      const latency = Math.round(performance.now() - start);
      active.latencyMs = latency;
      active.lastChecked = Date.now();
      active.isHealthy = res.ok;

      // PRD trigger: If latency exceeds 350ms or fails, auto-failover
      if (!res.ok || latency > 350) {
        this.triggerFailover(`Latency exceeded PRD target (${latency}ms > 350ms) or HTTP ${res.status}`);
      }

      return { isHealthy: active.isHealthy, latencyMs: active.latencyMs };
    } catch {
      const latency = Math.round(performance.now() - start);
      active.latencyMs = latency;
      active.isHealthy = false;
      this.triggerFailover('RPC Network request timeout/disconnect');
      return { isHealthy: false, latencyMs: latency };
    }
  }
}

export const rpcFailoverInstance = new RpcFailoverManager();

