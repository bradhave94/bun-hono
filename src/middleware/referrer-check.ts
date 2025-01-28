import { Context, Next } from 'hono';
import type { StatusCode } from 'hono/utils/http-status';
import { logger } from '../logger';
import { env } from '../env';

export async function referrerCheckMiddleware(c: Context, next: Next) {
  // Skip check for documentation endpoint
  if (c.req.path === '/docs' || c.req.path === '/openapi.json') {
    return next();
  }

  // Skip check in development or test environment
  if (env.NODE_ENV === 'development' || env.NODE_ENV === 'test') {
    return next();
  }

  const referrer = c.req.header('referer') || c.req.header('referrer');

  // If no referrer, deny access
  if (!referrer) {
    logger.warn({
      path: c.req.path,
      method: c.req.method,
      headers: {
        'user-agent': c.req.header('user-agent'),
        'origin': c.req.header('origin')
      }
    }, 'No referrer provided');

    c.status(403 as StatusCode);
    return c.json({
      message: 'Access denied'
    });
  }

  try {
    const referrerUrl = new URL(referrer);
    const referrerHost = referrerUrl.host;

    // Check if referrer is in allowed list
    const isAllowed = env.ALLOWED_ORIGINS.some(origin => {
      try {
        const originUrl = new URL(origin);
        return referrerHost === originUrl.host;
      } catch {
        return false;
      }
    });

    if (!isAllowed) {
      logger.warn({
        referrer,
        path: c.req.path,
        method: c.req.method,
        allowedOrigins: env.ALLOWED_ORIGINS
      }, 'Invalid referrer');

      c.status(403 as StatusCode);
      return c.json({
        message: 'Access denied'
      });
    }

    logger.debug({
      referrer,
      path: c.req.path,
      method: c.req.method
    }, 'Referrer check passed');

    return next();
  } catch (error) {
    logger.error({
      error,
      referrer,
      path: c.req.path,
      method: c.req.method
    }, 'Error processing referrer');

    c.status(403 as StatusCode);
    return c.json({
      message: 'Access denied'
    });
  }
}
