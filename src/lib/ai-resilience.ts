export class AIProviderError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
    readonly statusCode?: number
  ) {
    super(message);
    this.name = 'AIProviderError';
  }
}

export class FixedWindowRateLimiter {
  private readonly windows = new Map<string, { startedAt: number; count: number }>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly maxKeys = 10_000
  ) {}

  consume(key: string, now = Date.now()): { allowed: boolean; retryAfterMs: number } {
    const current = this.windows.get(key);
    if (current && now - current.startedAt < this.windowMs) {
      if (current.count >= this.limit) {
        return { allowed: false, retryAfterMs: this.windowMs - (now - current.startedAt) };
      }
      current.count += 1;
      return { allowed: true, retryAfterMs: 0 };
    }

    if (!current && this.windows.size >= this.maxKeys) {
      for (const [candidate, window] of this.windows) {
        if (now - window.startedAt >= this.windowMs) this.windows.delete(candidate);
      }
      if (this.windows.size >= this.maxKeys) {
        return { allowed: false, retryAfterMs: this.windowMs };
      }
    }

    this.windows.set(key, { startedAt: now, count: 1 });
    return { allowed: true, retryAfterMs: 0 };
  }
}

export class CircuitBreaker {
  private failures = 0;
  private openedAt: number | null = null;
  private probeInFlight = false;

  constructor(
    private readonly failureThreshold = 5,
    private readonly cooldownMs = 30_000
  ) {}

  tryAcquire(now = Date.now()): boolean {
    if (this.openedAt === null) return true;
    if (now - this.openedAt < this.cooldownMs || this.probeInFlight) return false;
    this.probeInFlight = true;
    return true;
  }

  recordSuccess(): void {
    this.failures = 0;
    this.openedAt = null;
    this.probeInFlight = false;
  }

  recordFailure(now = Date.now()): void {
    if (this.openedAt !== null || this.probeInFlight) {
      this.failures = this.failureThreshold;
      this.openedAt = now;
      this.probeInFlight = false;
      return;
    }

    this.failures += 1;
    if (this.failures >= this.failureThreshold) this.openedAt = now;
  }
}

export interface AIRetryOptions {
  attempts?: number;
  initialDelayMs?: number;
  isRetryable?: (error: unknown) => boolean;
  random?: () => number;
  sleep?: (delayMs: number) => Promise<void>;
  now?: () => number;
}

export async function runWithAIResilience<T>(
  breaker: CircuitBreaker,
  operation: () => Promise<T | null>,
  options: AIRetryOptions = {}
): Promise<T> {
  const attempts = options.attempts ?? 4;
  const initialDelayMs = options.initialDelayMs ?? 250;
  const isRetryableError = options.isRetryable ?? ((error: unknown) => error instanceof AIProviderError
    ? error.retryable
    : error instanceof TypeError ||
      (error instanceof Error && ['AbortError', 'TimeoutError'].includes(error.name)));
  const random = options.random ?? Math.random;
  const sleep = options.sleep ?? ((delayMs: number) => new Promise((resolve) => setTimeout(resolve, delayMs)));
  const now = options.now ?? Date.now;

  if (!breaker.tryAcquire(now())) {
    throw new AIProviderError('AI provider circuit is open', false);
  }

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const result = await operation();
      if (result === null) throw new AIProviderError('AI provider returned no result', false);
      breaker.recordSuccess();
      return result;
    } catch (error) {
      const retryable = isRetryableError(error);
      const hasRetry = retryable && attempt + 1 < attempts;
      if (!hasRetry) {
        breaker.recordFailure(now());
        throw error;
      }

      const backoff = initialDelayMs * 2 ** attempt;
      await sleep(Math.round(backoff * (0.5 + random())));
    }
  }

  throw new AIProviderError('AI provider attempts exhausted', false);
}