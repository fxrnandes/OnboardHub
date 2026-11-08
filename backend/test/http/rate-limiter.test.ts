import { describe, expect, it } from 'vitest';
import { RateLimiter } from '../../src/http/rate-limit.js';

describe('RateLimiter', () => {
  it('libera de novo quando a janela termina', () => {
    let now = 1_000;
    const limiter = new RateLimiter({ windowMs: 10_000, max: 2 }, () => now);

    expect(limiter.hit('a').allowed).toBe(true);
    expect(limiter.hit('a').allowed).toBe(true);
    const blocked = limiter.hit('a');
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(10);

    now += 10_000;
    expect(limiter.hit('a').allowed).toBe(true);
  });

  it('descarta contagens vencidas para não crescer sem limite', () => {
    let now = 0;
    const limiter = new RateLimiter({ windowMs: 1_000, max: 1 }, () => now);
    for (let i = 0; i < 50; i++) limiter.hit(`ip-${i}`);

    now = 5_000;
    limiter.hit('novo');

    expect(limiter.size).toBe(1);
  });
});
