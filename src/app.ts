import { OpenAPIHono } from '@hono/zod-openapi';
import { apiReference } from '@scalar/hono-api-reference';
import { logger } from './logger';
import { env } from './env';
import { corsMiddleware } from './middleware/cors';
import { csrfMiddleware } from './middleware/csrf';
import { securityHeadersMiddleware } from './middleware/security-headers';
import { referrerCheckMiddleware } from './middleware/referrer-check';
import { createTasksRouter } from './routes/tasks/tasks.index';
import { createPokemonRouter } from './routes/pokemon/pokemon.index';
import { createCsrfRouter } from './routes/csrf/csrf.index';

// Create base app
const app = new OpenAPIHono();

// Add middleware
// CORS must be first to set Access-Control-* headers
app.use('*', corsMiddleware);
// Security headers after CORS
app.use('*', securityHeadersMiddleware);
// Referrer check after security headers
app.use('*', referrerCheckMiddleware);
// CSRF after referrer check
app.use('*', csrfMiddleware);

// Request logging middleware
app.use('*', async (c, next) => {
  const requestId = crypto.randomUUID();
  const start = Date.now();
  const url = new URL(c.req.url);

  // Get request body if it exists
  let body = null;
  if (c.req.header('content-type')?.includes('application/json')) {
    try {
      // Clone the request to read the body without consuming it
      const clonedReq = c.req.raw.clone();
      body = await clonedReq.json();
    } catch (e) {
      // Ignore body parsing errors
    }
  }

  // Log request
  logger.info({
    requestId,
    method: c.req.method,
    path: c.req.path,
    query: Object.fromEntries(url.searchParams),
    body,
    headers: {
      'user-agent': c.req.header('user-agent'),
      'content-type': c.req.header('content-type'),
      'accept': c.req.header('accept'),
      'origin': c.req.header('origin'),
      'referer': c.req.header('referer'),
      'x-csrf-token': c.req.header('x-csrf-token'),
    }
  }, 'Incoming request');

  try {
    await next();

    // Log response
    const duration = Date.now() - start;
    logger.info({
      requestId,
      status: c.res.status,
      duration,
      headers: {
        'content-type': c.res.headers.get('content-type'),
        'content-length': c.res.headers.get('content-length'),
      }
    }, `Request completed in ${duration}ms`);
  } catch (error) {
    // Log error and return 500 response
    const duration = Date.now() - start;
    logger.error({
      requestId,
      error: {
        name: (error as Error).name,
        message: (error as Error).message,
        stack: (error as Error).stack,
      },
      duration,
    }, 'Request failed');

    c.status(500);
    return c.json({
      message: 'An unexpected error occurred'
    });
  }
});

// API routes
const api = new OpenAPIHono();

// Mount CSRF routes directly under /api/v1
api.route('/csrf', createCsrfRouter());
api.route('/tasks', createTasksRouter());
api.route('/pokemon', createPokemonRouter());

// Mount API under versioned path
app.route(`/api/${env.API_VERSION}`, api);

// OpenAPI documentation
app.doc31('/openapi.json', {
  openapi: '3.1.0',
  info: {
    title: 'Tasks API',
    version: '1.0.0',
    description: 'A modern REST API with CSRF protection'
  },
  security: [{
    csrf: []
  }]
});

// Define security scheme separately
app.openAPIRegistry.registerComponent('securitySchemes', 'csrf', {
  type: 'apiKey',
  name: 'X-CSRF-Token',
  in: 'header',
  description: 'CSRF token required for mutation operations'
});

// API Reference UI
app.get(
  '/docs',
  apiReference({
    spec: {
      url: '/openapi.json',
    },
  })
);

export { app };