import { Context, Next } from 'hono';
import { env } from '../env';
import { logger } from '../logger';
import { ApiException } from '../types/api';
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

export async function generateToken(c: Context): Promise<string> {
  const ip = c.req.header('x-forwarded-for') || 'unknown';
  
  // Check token limit per IP
  if (getTokensForIp(ip) >= MAX_TOKENS_PER_IP) {
    throw new ApiException(
      'TOKEN_LIMIT_EXCEEDED',
      'Too many active tokens for this IP',
      429
    );
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
    throw new ApiException(
      'TOKEN_GENERATION_FAILED',
      'Failed to generate token',
      500
    );
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
    const ip = c.req.header('x-forwarded-for') || 'unknown';

    if (!token) {
      logger.warn({
        method: c.req.method,
        path: c.req.path,
        ip
      }, 'Missing CSRF token');
      
      throw new ApiException(
        'CSRF_TOKEN_MISSING',
        'CSRF token is required',
        403
      );
    }

    try {
      // Validate token format
      if (!validateTokenFormat(token)) {
        throw new ApiException(
          'CSRF_TOKEN_INVALID',
          'Invalid token format',
          403
        );
      }

      // Check if token exists
      const tokenData = statements.get.get({ $token: token }) as { ip: string; timestamp: number } | null;
      if (!tokenData) {
        throw new ApiException(
          'CSRF_TOKEN_INVALID',
          'Token not found or already used',
          403
        );
      }

      // Verify IP matches
      if (tokenData.ip !== ip) {
        throw new ApiException(
          'CSRF_TOKEN_INVALID',
          'Token not valid for this IP',
          403
        );
      }

      // Check token expiration
      if (isTokenExpired(tokenData.timestamp)) {
        statements.deleteByToken.run({ $token: token });
        throw new ApiException(
          'CSRF_TOKEN_EXPIRED',
          'Token has expired',
          403
        );
      }

      // Delete token after successful use (one-time use)
      statements.deleteByToken.run({ $token: token });

      logger.debug({
        method: c.req.method,
        path: c.req.path,
        ip
      }, 'CSRF token validated and consumed');

    } catch (error) {
      logger.error({
        error,
        method: c.req.method,
        path: c.req.path,
        token,
        ip
      }, 'CSRF token validation failed');

      if (error instanceof ApiException) {
        throw error;
      }

      throw new ApiException(
        'CSRF_TOKEN_INVALID',
        'Invalid CSRF token',
        403
      );
    }
  }

  await next();
}