import { Context, Next } from 'hono';
import { env } from '../env';

export async function securityHeadersMiddleware(c: Context, next: Next) {
  // Basic security headers
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('X-XSS-Protection', '1; mode=block');

  // Use a more permissive Referrer-Policy for cross-origin requests
  c.header('Referrer-Policy', 'no-referrer-when-downgrade');

  // Content Security Policy
  // Adjust the CSP based on your needs
  c.header(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
  );

  // Permissions Policy
  c.header(
    'Permissions-Policy',
    'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()'
  );

  // HSTS (Only in production)
  if (env.NODE_ENV === 'production') {
    c.header(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  await next();
}