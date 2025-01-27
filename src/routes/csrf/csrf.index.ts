import { OpenAPIHono } from '@hono/zod-openapi';
import { handlers } from './csrf.handlers';
import { routes } from './csrf.routes';

export function createCsrfRouter() {
  const router = new OpenAPIHono();
  router.openapi(routes.getToken, handlers.getToken);
  return router;
}