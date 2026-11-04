import { Request, Response, NextFunction } from 'express';

interface RateLimitStoreEntry {
  count: number;
  resetAt: number;
}

/**
 * Per-user (or per-IP) fixed-window rate limiter middleware.
 * Use for auth endpoints (login, register, password reset) to prevent brute force.
 */
export class PerUserRateLimiter {
  private store = new Map<string, RateLimitStoreEntry>();

  constructor(
    private readonly windowMs: number,
    private readonly maxRequests: number
  ) {}

  consume(identifier: string): { allowed: boolean; retryAfterMs: number } {
    const now = Date.now();
    const entry = this.store.get(identifier);

    if (!entry || now >= entry.resetAt) {
      this.store.set(identifier, { count: 1, resetAt: now + this.windowMs });
      return { allowed: true, retryAfterMs: 0 };
    }

    if (entry.count >= this.maxRequests) {
      return { allowed: false, retryAfterMs: entry.resetAt - now };
    }

    entry.count += 1;
    return { allowed: true, retryAfterMs: 0 };
  }

  middleware(options: {
    identifierExtractor: (req: Request) => string;
    windowMs?: number;
    maxRequests?: number;
  }) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const identifier = options.identifierExtractor(req);
      const result = this.consume(identifier);

      res.setHeader('X-RateLimit-Limit', String(options.maxRequests || this.maxRequests));
      res.setHeader('X-RateLimit-Remaining', String(Math.max(0, (options.maxRequests || this.maxRequests) - 1)));
      res.setHeader('X-RateLimit-Reset', String(Math.ceil((result.retryAfterMs || 0) / 1000)));

      if (!result.allowed) {
        res.setHeader('Retry-After', String(Math.ceil(result.retryAfterMs / 1000)));
        res.status(429).json({
          code: 'RATE_LIMITED',
          error: 'Too many requests. Try again later.',
          retryAfterMs: result.retryAfterMs,
        });
        return;
      }
      next();
    };
  }
}

/**
 * Pre-configured limiters
 */
export const authRateLimiter = new PerUserRateLimiter(15 * 60 * 1000, 10); // 10 req / 15 min per IP
export const apiRateLimiter = new PerUserRateLimiter(60 * 1000, 100); // 100 req / min per IP

/**
 * Extract IP-based identifier for rate limiting.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
  }
  return req.socket.remoteAddress || 'unknown';
}
