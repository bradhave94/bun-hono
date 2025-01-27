import { Context, Next } from 'hono';
import { env } from '../env';
import { logger } from '../logger';

const ALLOWED_ORIGINS = new Set([
  'http://localhost:5500',
  ...env.ALLOWED_ORIGINS
]);

const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];
const ALLOWED_HEADERS = [
  'Content-Type',
  'Authorization',
  'X-Requested-With',
  'Accept',
  'X-CSRF-Token'
];
const MAX_AGE_SECONDS = 86400; // 24 hours

export async function corsMiddleware(c: Context, next: Next) {
  const origin = c.req.header('Origin');
  const method = c.req.method;

  logger.debug({ origin, method }, 'CORS request received');

  // Always check for origin and set CORS headers if it's allowed
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    // Set CORS headers for all responses
    c.res.headers.set('Access-Control-Allow-Origin', origin);
    c.res.headers.set('Access-Control-Allow-Methods', ALLOWED_METHODS.join(', '));
    c.res.headers.set('Access-Control-Allow-Headers', ALLOWED_HEADERS.join(', '));
    c.res.headers.set('Access-Control-Max-Age', MAX_AGE_SECONDS.toString());
    c.res.headers.set('Access-Control-Allow-Credentials', 'true');

    // Handle preflight request
    if (method === 'OPTIONS') {
      logger.debug('Handling OPTIONS preflight request');
      return new Response(null, {
        status: 204,
        headers: c.res.headers
      });
    }
  }

  await next();

  // Ensure CORS headers are present in the final response
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    const headers = c.res.headers;
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Credentials', 'true');
  }
}