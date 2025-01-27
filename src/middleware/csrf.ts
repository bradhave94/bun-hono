import { Context, Next } from 'hono';
import type { StatusCode } from 'hono/utils/http-status';
import { env } from '../env';
import { logger } from '../logger';
import { statements } from '../db';

const CSRF_TOKEN_HEADER = 'X-CSRF-Token';
const TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const MAX_TOKENS_PER_IP = 10; // Limit tokens per IP
const CLEANUP_INTERVAL = 60 * 60 * 1000; // Cleanup every hour

// Periodic cleanup of expired tokens
setInterval(() => {
  const expiryTimestamp = Date.now() - TOKEN_EXPIRY;
  const result = statements.deleteExpired.run({ $timestamp: expiryTimestamp });

  if (result.changes > 0) {
    logger.debug({ cleanedCount: result.changes }, 'Cleaned up expired tokens');
  }
}, CLEANUP_INTERVAL);

function getTokensForIp(ip: string): number {
  const result = statements.countByIp.get({ $ip: ip }) as { count: number };
  return result.count;
}

function getClientIp(c: Context): string {
  // For local development, use a consistent IP
  if (env.NODE_ENV === 'development') {
    return '127.0.0.1';
  }

  // In production, try various headers
  const forwardedFor = c.req.header('x-forwarded-for');
  if (forwardedFor) {
    const ips = forwardedFor.split(',').map(ip => ip.trim());
    if (ips[0]) return ips[0];
  }

  // Fallback to a default value
  return 'unknown';
}

function getRequestHeaders(c: Context) {
  return {
    'user-agent': c.req.header('user-agent'),
    'content-type': c.req.header('content-type'),
    'accept': c.req.header('accept'),
    'origin': c.req.header('origin'),
    'referer': c.req.header('referer'),
    'x-csrf-token': c.req.header('x-csrf-token'),
    'x-forwarded-for': c.req.header('x-forwarded-for')
  };
}

function deleteToken(token: string): boolean {
  try {
    const result = statements.deleteByToken.run({ $token: token });
    logger.debug({ token, deleted: result.changes > 0 }, 'Token deletion attempt');
    return result.changes > 0;
  } catch (error) {
    logger.error({ error, token }, 'Failed to delete token');
    return false;
  }
}

export async function generateToken(c: Context): Promise<string> {
  const ip = getClientIp(c);

  logger.debug({
    ip,
    headers: getRequestHeaders(c),
    environment: env.NODE_ENV
  }, 'Generating token for IP');

  // Check token limit per IP
  if (getTokensForIp(ip) >= MAX_TOKENS_PER_IP) {
    c.status(429 as StatusCode);
    c.json({
      message: 'Too many active tokens for this IP'
    });
    return ''; // Return empty string for failed token generation
  }

  const timestamp = Date.now();
  const data = new TextEncoder().encode(`${timestamp}${env.CSRF_SECRET}${ip}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const token = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  // Store token in database
  try {
    statements.insert.run({
      $token: token,
      $ip: ip,
      $timestamp: timestamp
    });

    logger.debug({
      ip,
      tokenCount: getTokensForIp(ip)
    }, 'Token generated and stored in database');

    return token;
  } catch (error) {
    logger.error({ error, ip }, 'Failed to store token in database');
    c.status(500 as StatusCode);
    c.json({
      message: 'Failed to generate token'
    });
    return ''; // Return empty string for failed token generation
  }
}

function validateTokenFormat(token: string): boolean {
  return /^[a-f0-9]{64}$/.test(token);
}

function isTokenExpired(timestamp: number): boolean {
  return Date.now() - timestamp > TOKEN_EXPIRY;
}

export async function csrfMiddleware(c: Context, next: Next) {
  const method = c.req.method;

  // Only check CSRF for state-changing methods
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const token = c.req.header(CSRF_TOKEN_HEADER);
    const ip = getClientIp(c);

    logger.debug({
      method,
      path: c.req.path,
      ip,
      token: token ? 'present' : 'missing',
      environment: env.NODE_ENV
    }, 'Checking CSRF token');

    if (!token) {
      logger.warn({
        method: c.req.method,
        path: c.req.path,
        ip
      }, 'Missing CSRF token');

      c.status(403 as StatusCode);
      return c.json({
        message: 'CSRF token is required'
      });
    }

    try {
      // Validate token format
      if (!validateTokenFormat(token)) {
        c.status(403 as StatusCode);
        return c.json({
          message: 'Invalid token format'
        });
      }

      // Check if token exists
      const tokenData = statements.get.get({ $token: token }) as { ip: string; timestamp: number } | null;
      if (!tokenData) {
        c.status(403 as StatusCode);
        return c.json({
          message: 'Token not found or already used'
        });
      }

      // In development, skip IP check
      if (env.NODE_ENV !== 'development' && tokenData.ip !== ip) {
        c.status(403 as StatusCode);
        return c.json({
          message: 'Token not valid for this IP'
        });
      }

      // Check token expiration
      if (isTokenExpired(tokenData.timestamp)) {
        deleteToken(token);
        c.status(403 as StatusCode);
        return c.json({
          message: 'Token has expired'
        });
      }

      // Delete token BEFORE processing the request
      // This ensures the token is invalidated even if the request fails
      if (!deleteToken(token)) {
        c.status(500 as StatusCode);
        return c.json({
          message: 'Failed to invalidate token'
        });
      }

      logger.debug({
        method: c.req.method,
        path: c.req.path,
        ip,
        token
      }, 'CSRF token validated and consumed');

      // Continue with the request
      await next();

    } catch (error) {
      logger.error({
        error,
        method: c.req.method,
        path: c.req.path,
        token,
        ip
      }, 'CSRF token validation failed');

      c.status(403 as StatusCode);
      return c.json({
        message: 'Invalid CSRF token'
      });
    }
  } else {
    await next();
  }
}