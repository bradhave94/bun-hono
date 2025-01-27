import { createRoute } from '@hono/zod-openapi';
import { z } from 'zod';

export const routes = {
  getToken: createRoute({
    method: 'get',
    path: '/',
    tags: ['CSRF'],
    responses: {
      200: {
        content: {
          'application/json': {
            schema: z.object({
              token: z.string(),
            }),
          },
        },
        description: 'New CSRF token',
      },
    },
  }),
};