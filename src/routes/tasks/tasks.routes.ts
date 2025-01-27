import { TaskSchema, CreateTaskSchema, UpdateTaskSchema } from './tasks.schema';
import { createRoute } from '@hono/zod-openapi';

export const routes = {
  getTasks: createRoute({
    method: 'get',
    path: '/',
    tags: ['Tasks'],
    responses: {
      200: {
        content: {
          'application/json': {
            schema: TaskSchema.array(),
          },
        },
        description: 'List all tasks',
      },
    },
  }),

  getTask: createRoute({
    method: 'get',
    path: '/{id}',
    tags: ['Tasks'],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'uuid' },
      },
    ],
    responses: {
      200: {
        content: {
          'application/json': {
            schema: TaskSchema,
          },
        },
        description: 'Task details',
      },
      404: {
        description: 'Task not found',
      },
    },
  }),

  createTask: createRoute({
    method: 'post',
    path: '/',
    tags: ['Tasks'],
    security: [{ csrf: [] }],
    request: {
      body: {
        content: {
          'application/json': {
            schema: CreateTaskSchema,
          },
        },
      },
    },
    responses: {
      201: {
        content: {
          'application/json': {
            schema: TaskSchema,
          },
        },
        description: 'Task created',
      },
      403: {
        description: 'CSRF token missing or invalid',
      },
    },
  }),

  updateTask: createRoute({
    method: 'patch',
    path: '/{id}',
    tags: ['Tasks'],
    security: [{ csrf: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'uuid' },
      },
    ],
    request: {
      body: {
        content: {
          'application/json': {
            schema: UpdateTaskSchema,
          },
        },
      },
    },
    responses: {
      200: {
        content: {
          'application/json': {
            schema: TaskSchema,
          },
        },
        description: 'Task updated',
      },
      404: {
        description: 'Task not found',
      },
      403: {
        description: 'CSRF token missing or invalid',
      },
    },
  }),

  deleteTask: createRoute({
    method: 'delete',
    path: '/{id}',
    tags: ['Tasks'],
    security: [{ csrf: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'uuid' },
      },
    ],
    responses: {
      204: {
        description: 'Task deleted',
      },
      404: {
        description: 'Task not found',
      },
      403: {
        description: 'CSRF token missing or invalid',
      },
    },
  }),
};