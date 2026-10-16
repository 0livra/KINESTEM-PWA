import { Request, Response, NextFunction } from 'express';
import { createSafeDict } from '../utils/safe-object.util';
import { env } from '../../config/env';

interface Bucket {
  tokens: number;
  lastRefillAt: number;
}

/**
 * Token Bucket Rate Limiter
 * T = min(B, floor(C + r * delta_t))
 * B = capacity, C = current tokens, r = refill rate per ms, delta_t = elapsed ms
 */
export class TokenBucketLimiter {
  private readonly capacity: number;
  private readonly refillRatePerMs: number;
  private readonly buckets = createSafeDict<Bucket>();

  constructor(
    capacity = env.RATE_LIMIT_CAPACITY,
    refillRatePerMs = env.RATE_LIMIT_REFILL_RATE_PER_MS
  ) {
    this.capacity = capacity;
    this.refillRatePerMs = refillRatePerMs;
    setInterval(() => this.evict(), 120_000).unref();
  }

  private refill(bucket: Bucket, now: number): void {
    const deltaT = now - bucket.lastRefillAt;
    bucket.tokens = Math.min(this.capacity, Math.floor(bucket.tokens + this.refillRatePerMs * deltaT));
    bucket.lastRefillAt = now;
  }

  private evict(): void {
    const now = Date.now();
    for (const key of Object.keys(this.buckets)) {
      const b = this.buckets[key];
      if (b && now - b.lastRefillAt > 120_000) delete this.buckets[key];
    }
  }

  public middleware = (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
    const now = Date.now();
    let bucket = this.buckets[ip];
    if (!bucket) {
      bucket = { tokens: this.capacity, lastRefillAt: now };
      this.buckets[ip] = bucket;
    } else {
      this.refill(bucket, now);
    }
    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      res.setHeader('X-RateLimit-Limit', String(this.capacity));
      res.setHeader('X-RateLimit-Remaining', String(bucket.tokens));
      next();
    } else {
      const retryAfter = Math.ceil(1 / this.refillRatePerMs / 1000);
      res.setHeader('Retry-After', String(retryAfter));
      res.status(429).json({ success: false, error: 'Too Many Requests', retryAfterSeconds: retryAfter });
    }
  };
}

export const rateLimiter = new TokenBucketLimiter();
