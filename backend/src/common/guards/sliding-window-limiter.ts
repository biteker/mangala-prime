export class SlidingWindowLimiter {
  private readonly buckets = new Map<string, number[]>();
  private opsSinceLastPrune = 0;

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly pruneIntervalOps = 100,
  ) {
    if (limit <= 0 || windowMs <= 0) {
      throw new Error('SlidingWindowLimiter: limit and windowMs must be positive numbers.');
    }
  }

  tryConsume(key: string, now = Date.now()): boolean {
    this.opsSinceLastPrune += 1;
    if (this.opsSinceLastPrune >= this.pruneIntervalOps) {
      this.prune(now);
      this.opsSinceLastPrune = 0;
    }

    const windowStart = now - this.windowMs;
    const existing = this.buckets.get(key);
    const activeTimestamps = existing
      ? existing.filter((timestamp) => timestamp > windowStart)
      : [];

    if (activeTimestamps.length >= this.limit) {
      if (activeTimestamps.length > 0) {
        this.buckets.set(key, activeTimestamps);
      } else {
        this.buckets.delete(key);
      }
      return false;
    }

    activeTimestamps.push(now);
    this.buckets.set(key, activeTimestamps);
    return true;
  }

  prune(now = Date.now()): void {
    const windowStart = now - this.windowMs;
    for (const [key, timestamps] of this.buckets.entries()) {
      const active = timestamps.filter((timestamp) => timestamp > windowStart);
      if (active.length === 0) {
        this.buckets.delete(key);
      } else if (active.length !== timestamps.length) {
        this.buckets.set(key, active);
      }
    }
  }

  getTrackedKeyCount(): number {
    return this.buckets.size;
  }
}
