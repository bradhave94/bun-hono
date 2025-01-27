import { OpenAPIHono } from '@hono/zod-openapi';
import { handlers } from './tasks.handlers';
import { routes } from './tasks.routes';

export function createTasksRouter() {
  const router = new OpenAPIHono();

  router.openapi(routes.getTasks, handlers.getTasks);
  router.openapi(routes.getTask, handlers.getTask);
  router.openapi(routes.createTask, handlers.createTask);
  router.openapi(routes.updateTask, handlers.updateTask);
  router.openapi(routes.deleteTask, handlers.deleteTask);

  return router;
}