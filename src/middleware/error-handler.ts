import { Context, MiddlewareHandler } from 'hono';
import { logger } from '../logger';
import { ApiException } from '../types/api';

export const errorHandler: MiddlewareHandler = async (c: Context, next) => {
  try {
    await next();
  } catch (error) {
    // Enhanced error logging
    logger.error({
      error: {
        name: (error as Error).name,
        message: (error as Error).message,
        code: error instanceof ApiException ? error.code : 'INTERNAL_SERVER_ERROR',
        stack: (error as Error).stack,
        details: error instanceof ApiException ? error.details : undefined,
      },
      request: {
        method: c.req.method,
        path: c.req.path,
        headers: Object.fromEntries(Object.entries(c.req.header())),
      },
    }, 'Error processing request');

    if (error instanceof ApiException) {
      return new Response(
        JSON.stringify({
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
          },
        }),
        {
          status: error.statusCode,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        },
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};