// Simple in-memory token bucket rate limiter

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, TokenBucket>();

export interface RateLimitConfig {
  maxTokens: number;
  refillRate: number; // tokens per second
  identifier: string;
}

export function checkRateLimit(config: RateLimitConfig): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  let bucket = buckets.get(config.identifier);

  if (!bucket) {
    bucket = {
      tokens: config.maxTokens - 1,
      lastRefill: now,
    };
    buckets.set(config.identifier, bucket);

    return {
      allowed: true,
      remaining: bucket.tokens,
      resetAt: now + 1000 / config.refillRate,
    };
  }

  // Refill tokens based on time elapsed
  const elapsed = (now - bucket.lastRefill) / 1000;
  const tokensToAdd = Math.floor(elapsed * config.refillRate);

  if (tokensToAdd > 0) {
    bucket.tokens = Math.min(config.maxTokens, bucket.tokens + tokensToAdd);
    bucket.lastRefill = now;
  }

  // Check if we have tokens available
  if (bucket.tokens > 0) {
    bucket.tokens--;
    return {
      allowed: true,
      remaining: bucket.tokens,
      resetAt: now + (1 - bucket.tokens / config.maxTokens) * (1000 / config.refillRate),
    };
  }

  return {
    allowed: false,
    remaining: 0,
    resetAt: now + 1000 / config.refillRate,
  };
}

// Cleanup old buckets periodically
setInterval(() => {
  const now = Date.now();
  const maxAge = 3600000; // 1 hour

  for (const [key, bucket] of buckets.entries()) {
    if (now - bucket.lastRefill > maxAge) {
      buckets.delete(key);
    }
  }
}, 300000); // Every 5 minutes
