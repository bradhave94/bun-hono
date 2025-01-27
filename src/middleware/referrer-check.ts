import { Context, Next } from 'hono';
import { logger } from '../logger';
import { ApiException } from '../types/api';
import { env } from '../env';

export async function referrerCheckMiddleware(c: Context, next: Next) {
  // Skip check in development
  if (env.NODE_ENV === 'development') {
    return next();
  }

  const referrer = c.req.header('referer') || c.req.header('referrer');
  
  // If no referrer, deny access
  if (!referrer) {
    logger.warn('No referrer provided');
    throw new ApiException(
      'MISSING_REFERRER',
      'Access denied - missing referrer',
      403
    );
  }

  try {
    const referrerUrl = new URL(referrer);
    const referrerHost = referrerUrl.host;

    // Check if referrer is in allowed list
    if (!env.ALLOWED_ORIGINS.some(origin => {
      try {
        const originUrl = new URL(origin);
        return referrerHost === originUrl.host;
      } catch {
        return false;
      }
    })) {
      logger.warn({ referrer }, 'Invalid referrer');
      throw new ApiException(
        'INVALID_REFERRER',
        'Access denied - invalid referrer',
        403
      );
    }

    return next();
  } catch (error) {
    logger.error({ error, referrer }, 'Error processing referrer');
    throw new ApiException(
      'INVALID_REFERRER',
      'Access denied - invalid referrer format',
      403
    );
  }
}