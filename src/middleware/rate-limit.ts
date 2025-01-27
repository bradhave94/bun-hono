import { Context, Next } from 'hono';
import { env } from '../env';
import { logger } from '../logger';
import { ApiException } from '../types/api';

interface RateLimit {
  count: number;
  resetAt: number;
}

// In-memory store for rate limits
const rateLimits = new Map<string, RateLimit>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, limit] of rateLimits.entries()) {
    if (limit.resetAt <= now) {
      rateLimits.delete(ip);
    }
  }
}, env.RATE_LIMIT_WINDOW);

export async function rateLimitMiddleware(c: Context, next: Next) {
  const ip = c.req.header('x-forwarded-for') || 'unknown-ip';
  const now = Date.now();

  // Get or create rate limit entry for this IP
  let rateLimit = rateLimits.get(ip);
  if (!rateLimit || rateLimit.resetAt <= now) {
    rateLimit = {
      count: 0,
      resetAt: now + env.RATE_LIMIT_WINDOW,
    };
  }

  // Increment request count
  rateLimit.count++;

  // Check if rate limit exceeded
  if (rateLimit.count > env.RATE_LIMIT_MAX) {
    logger.warn({ ip, count: rateLimit.count }, 'Rate limit exceeded');
    throw new ApiException(
      'RATE_LIMIT_EXCEEDED',
      'Too many requests',
      429,
      { resetAt: rateLimit.resetAt }
    );
  }

  // Update rate limit in store
  rateLimits.set(ip, rateLimit);

  // Add rate limit headers
  c.header('X-RateLimit-Limit', env.RATE_LIMIT_MAX.toString());
  c.header('X-RateLimit-Remaining', (env.RATE_LIMIT_MAX - rateLimit.count).toString());
  c.header('X-RateLimit-Reset', rateLimit.resetAt.toString());

  logger.debug({
    ip,
    count: rateLimit.count,
    remaining: env.RATE_LIMIT_MAX - rateLimit.count,
    resetAt: rateLimit.resetAt,
  }, 'Rate limit status');

  await next();
}