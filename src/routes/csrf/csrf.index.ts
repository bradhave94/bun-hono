import { Hono } from 'hono';
import { handlers } from './csrf.handlers';

export function createCsrfRouter() {
  const router = new Hono();
  router.get('/', handlers.getToken);
  return router;
}
