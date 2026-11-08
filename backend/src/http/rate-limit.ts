import type { Request, RequestHandler } from 'express';

export interface RateLimit {
  windowMs: number;
  max: number;
}

interface Entry {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private readonly entries = new Map<string, Entry>();
  private nextCleanup: number;

  constructor(
    private readonly limit: RateLimit,
    private readonly clock: () => number = Date.now,
  ) {
    this.nextCleanup = clock() + limit.windowMs;
  }

  get size() {
    return this.entries.size;
  }

  hit(key: string): { allowed: boolean; retryAfterSeconds: number } {
    const now = this.clock();
    this.cleanup(now);
    let entry = this.entries.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + this.limit.windowMs };
      this.entries.set(key, entry);
    }
    entry.count++;
    return { allowed: entry.count <= this.limit.max, retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000) };
  }

  private cleanup(now: number) {
    if (now < this.nextCleanup) return;
    for (const [key, entry] of this.entries) {
      if (entry.resetAt <= now) this.entries.delete(key);
    }
    this.nextCleanup = now + this.limit.windowMs;
  }
}

export const byIp = (req: Request) => req.ip ?? 'desconhecido';

export const byIpAndEmail = (req: Request) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  return `${byIp(req)}|${email}`;
};

export function rateLimit(limit: RateLimit, key: (req: Request) => string = byIp): RequestHandler {
  const limiter = new RateLimiter(limit);
  return (req, res, next) => {
    const { allowed, retryAfterSeconds } = limiter.hit(key(req));
    if (allowed) {
      next();
      return;
    }
    res.set('Retry-After', String(retryAfterSeconds));
    res.status(429).json({
      error: { code: 'too_many_requests', message: 'Muitas tentativas. Aguarde alguns minutos e tente de novo.' },
    });
  };
}
