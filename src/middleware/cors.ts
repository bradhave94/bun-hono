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
  'Accept'
];
const MAX_AGE_SECONDS = 86400; // 24 hours

export async function corsMiddleware(c: Context, next: Next) {
  const origin = c.req.header('Origin');

  // Always set CORS headers for localhost:5500 during development
  if (origin === 'http://localhost:5500') {
    c.header('Access-Control-Allow-Origin', origin);
    c.header('Access-Control-Allow-Methods', ALLOWED_METHODS.join(', '));
    c.header('Access-Control-Allow-Headers', ALLOWED_HEADERS.join(', '));
    c.header('Access-Control-Max-Age', MAX_AGE_SECONDS.toString());
    
    // Handle preflight requests
    if (c.req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: c.res.headers
      });
    }
    
    await next();
    return;
  }

  // For other origins, check if they're allowed
  if (!origin || !ALLOWED_ORIGINS.has(origin)) {
    logger.debug({ origin }, 'Origin not allowed, proceeding without CORS headers');
    return next();
  }

  // Set CORS headers for allowed origins
  c.header('Access-Control-Allow-Origin', origin);
  c.header('Access-Control-Allow-Methods', ALLOWED_METHODS.join(', '));
  c.header('Access-Control-Allow-Headers', ALLOWED_HEADERS.join(', '));
  c.header('Access-Control-Max-Age', MAX_AGE_SECONDS.toString());
  
  // Handle preflight requests
  if (c.req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: c.res.headers
    });
  }

  await next();
}