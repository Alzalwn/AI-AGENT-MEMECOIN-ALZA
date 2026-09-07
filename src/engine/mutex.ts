/**
 * Single Active Position Mutex Guard & Anti-Spam Execution Engine
 * Guarantees that only ONE trading position can be OPEN or ACQUIRING at any given time.
 * Rejects any new buy signals instantly while a position is held or in-flight.
 * Enforces cooldown per token mint to prevent infinite buy loops.
 */

class PositionMutex {
  private isLocked: boolean = false;
  private isExecutingBuy: boolean = false;
  private isExecutingSell: boolean = false;
  private activeTokenMint: string | null = null;
  private lockTimestamp: number = 0;
  private recentMintsCooldown: Map<string, number> = new Map();
  private listeners: Set<(isLocked: boolean, mint: string | null) => void> = new Set();

  /**
   * Synchronously acquire exclusive lock BEFORE initiating any RPC transaction.
   * If already locked or in-flight, immediately returns false.
   */
  public acquireLock(mint: string): boolean {
    const cleanMint = mint.trim();
    if (this.isLocked || this.isExecutingBuy) {
      console.warn(`[MUTEX] 🛑 Lock acquisition rejected for ${cleanMint}. Already locked by ${this.activeTokenMint}`);
      return false;
    }

    if (this.isCooldownActive(cleanMint)) {
      console.warn(`[MUTEX] 🛑 Token ${cleanMint} is in anti-spam cooldown. Buy rejected.`);
      return false;
    }

    this.isLocked = true;
    this.isExecutingBuy = true;
    this.activeTokenMint = cleanMint;
    this.lockTimestamp = Date.now();
    this.notify();
    console.log(`[MUTEX] 🔒 Mutex lock acquired for ${cleanMint} at ${new Date(this.lockTimestamp).toISOString()}`);
    return true;
  }

  /**
   * Mark on-chain buy instruction confirmed. Position is now officially OPEN.
   */
  public markBuyCompleted(mint: string): void {
    this.isLocked = true;
    this.isExecutingBuy = false;
    this.activeTokenMint = mint.trim();
    this.notify();
    console.log(`[MUTEX] ✅ Buy completed on-chain for ${this.activeTokenMint}. Mutex remains LOCKED until sold.`);
  }

  /**
   * Set execution flag for selling.
   */
  public markSelling(mint: string): void {
    this.isExecutingSell = true;
    this.notify();
  }

  /**
   * Release mutex lock upon successful sell confirmation or explicit cancellation.
   */
  public releaseLock(mint?: string, cooldownMs: number = 600000): boolean {
    const targetMint = mint ? mint.trim() : this.activeTokenMint;
    if (targetMint) {
      // Put token in cooldown to prevent instant repeat buys (default 10 minutes)
      this.recentMintsCooldown.set(targetMint, Date.now() + cooldownMs);
    }

    this.isLocked = false;
    this.isExecutingBuy = false;
    this.isExecutingSell = false;
    const prevMint = this.activeTokenMint;
    this.activeTokenMint = null;
    this.lockTimestamp = 0;
    this.notify();
    console.log(`[MUTEX] 🔓 Mutex lock released from ${prevMint || 'unknown'}. Slot is now ready.`);
    return true;
  }

  /**
   * Synchronous check if a position is currently open or in-flight.
   */
  public isPositionOpen(): boolean {
    return this.isLocked || this.isExecutingBuy;
  }

  /**
   * Get active token mint currently holding the lock.
   */
  public getActiveMint(): string | null {
    return this.activeTokenMint;
  }

  /**
   * Check if token is in anti-spam cooldown.
   */
  public isCooldownActive(mint: string): boolean {
    const expireAt = this.recentMintsCooldown.get(mint.trim());
    if (!expireAt) return false;
    if (Date.now() > expireAt) {
      this.recentMintsCooldown.delete(mint.trim());
      return false;
    }
    return true;
  }

  public subscribe(callback: (isLocked: boolean, mint: string | null) => void): () => void {
    this.listeners.add(callback);
    callback(this.isPositionOpen(), this.activeTokenMint);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notify(): void {
    const isOpen = this.isPositionOpen();
    const mint = this.activeTokenMint;
    this.listeners.forEach(cb => {
      try {
        cb(isOpen, mint);
      } catch (err) {
        console.error('[MUTEX] Error in listener callback:', err);
      }
    });
  }
}

export const positionMutex = new PositionMutex();
