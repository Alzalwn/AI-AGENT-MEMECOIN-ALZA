/**
 * Single Active Position Mutex Guard
 * Guarantees that only ONE trading position can be OPEN at any given time.
 * Rejects any new buy signals instantly while a position is held.
 */

class PositionMutex {
  private isLocked: boolean = false;
  private activeTokenMint: string | null = null;

  public lock(mint: string): boolean {
    if (this.isLocked) {
      return false; // Already locked
    }
    this.isLocked = true;
    this.activeTokenMint = mint;
    return true;
  }

  public unlock(mint: string): boolean {
    if (this.activeTokenMint === mint) {
      this.isLocked = false;
      this.activeTokenMint = null;
      return true;
    }
    return false;
  }

  public isPositionOpen(): boolean {
    return this.isLocked;
  }

  public getActiveMint(): string | null {
    return this.activeTokenMint;
  }
}

export const positionMutex = new PositionMutex();
