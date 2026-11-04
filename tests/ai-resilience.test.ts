import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AIProviderError,
  CircuitBreaker,
  FixedWindowRateLimiter,
  runWithAIResilience,
} from '../src/lib/ai-resilience';

test('rate limiter allows the configured quota and resets after the window', () => {
  const limiter = new FixedWindowRateLimiter(2, 1_000);
  assert.equal(limiter.consume('client-a', 0).allowed, true);
  assert.equal(limiter.consume('client-a', 100).allowed, true);
  assert.deepEqual(limiter.consume('client-a', 200), { allowed: false, retryAfterMs: 800 });
  assert.equal(limiter.consume('client-a', 1_000).allowed, true);
});

test('rate limiter bounds the number of tracked client keys', () => {
  const limiter = new FixedWindowRateLimiter(1, 1_000, 1);
  assert.equal(limiter.consume('client-a', 0).allowed, true);
  assert.equal(limiter.consume('client-b', 100).allowed, false);
  assert.equal(limiter.consume('client-b', 1_000).allowed, true);
});

test('circuit breaker opens, permits one half-open probe, then resets on success', () => {
  const breaker = new CircuitBreaker(1, 100);
  assert.equal(breaker.tryAcquire(0), true);
  breaker.recordFailure(0);
  assert.equal(breaker.tryAcquire(50), false);
  assert.equal(breaker.tryAcquire(100), true);
  assert.equal(breaker.tryAcquire(100), false);
  breaker.recordSuccess();
  assert.equal(breaker.tryAcquire(101), true);
});

test('AI resilience retries transient errors at most three times with backoff', async () => {
  const breaker = new CircuitBreaker(5, 100);
  const delays: number[] = [];
  let calls = 0;
  const result = await runWithAIResilience(breaker, async () => {
    calls += 1;
    if (calls < 4) throw new AIProviderError('temporary failure', true, 503);
    return 'success';
  }, {
    random: () => 0.5,
    sleep: async (delayMs) => { delays.push(delayMs); },
  });

  assert.equal(result, 'success');
  assert.equal(calls, 4);
  assert.deepEqual(delays, [250, 500, 1_000]);
});

test('AI resilience does not retry permanent errors and rejects while circuit is open', async () => {
  const breaker = new CircuitBreaker(1, 100);
  let calls = 0;
  await assert.rejects(runWithAIResilience(breaker, async () => {
    calls += 1;
    throw new AIProviderError('bad request', false, 400);
  }, { sleep: async () => {} }), /bad request/);
  assert.equal(calls, 1);

  await assert.rejects(runWithAIResilience(breaker, async () => 'unexpected', { now: () => 50 }), /circuit is open/i);
});