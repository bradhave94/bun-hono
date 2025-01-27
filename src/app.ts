import { Hono } from 'hono';
import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { apiReference } from '@scalar/hono-api-reference';
import { logger } from './logger';
import { env } from './env';
import { errorHandler } from './middleware/error-handler';
import { corsMiddleware } from './middleware/cors';
import { csrfMiddleware } from './middleware/csrf';
import { createTasksRouter } from './routes/tasks/tasks.index';
import { createPokemonRouter } from './routes/pokemon/pokemon.index';
import { createCsrfRouter } from './routes/csrf/csrf.index';

// Create base app
const app = new OpenAPIHono();

// Add middleware
app.use('*', errorHandler);
app.use('*', corsMiddleware);
app.use('*', csrfMiddleware);

// Request logging middleware
app.use('*', async (c, next) => {
  const requestId = crypto.randomUUID();
  const start = Date.now();
  const url = new URL(c.req.url);

  // Log request
  logger.info({
    requestId,
    method: c.req.method,
    path: c.req.path,
    query: Object.fromEntries(url.searchParams),
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
    // Log error (this runs before the error handler)
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
    throw error;
  }
});

// API routes
const api = new OpenAPIHono();
api.route('/tasks', createTasksRouter());
api.route('/pokemon', createPokemonRouter());

// CSRF routes (not included in OpenAPI docs)
const csrfRouter = new Hono();
csrfRouter.route('/csrf', createCsrfRouter());

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