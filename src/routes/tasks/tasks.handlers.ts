import type { Context } from 'hono';
import type { StatusCode } from 'hono/utils/http-status';
import type { CreateTask, UpdateTask, Task } from './tasks.schema';
import { CreateTaskSchema, UpdateTaskSchema } from './tasks.schema';
import { logger } from '../../logger';
import type { ZodError } from 'zod';

// In-memory store for demo purposes
const tasks = new Map<string, Task>();

type ValidationError = {
  message: string;
  details?: { field: string; message: string; }[];
};

async function parseAndValidateBody<T>(c: Context, schema: any): Promise<T | ValidationError> {
  const contentType = c.req.header('content-type')?.toLowerCase() || '';

  try {
    let body: any;

    if (contentType.includes('application/json')) {
      body = await c.req.json();
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await c.req.parseBody();
      // Convert form data to JSON-like object
      body = Object.fromEntries(
        Object.entries(formData).map(([key, value]) => {
          // Handle boolean values
          if (value === 'true') return [key, true];
          if (value === 'false') return [key, false];
          // Handle numbers
          if (!isNaN(value as any)) return [key, Number(value)];
          return [key, value];
        })
      );
    } else {
      c.status(415 as StatusCode);
      return {
        message: 'Unsupported content type. Use application/json or application/x-www-form-urlencoded'
      };
    }

    const result = schema.safeParse(body);

    if (!result.success) {
      c.status(400 as StatusCode);
      return {
        message: 'Invalid request data',
        details: (result.error as ZodError).issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      };
    }

    return result.data;
  } catch (error) {
    logger.error({ error, contentType }, 'Failed to parse request body');
    c.status(400 as StatusCode);
    return {
      message: 'Could not parse request body'
    };
  }
}

export const handlers = {
  getTasks: async (c: Context) => {
    const taskList = Array.from(tasks.values());
    logger.debug({ count: taskList.length }, 'Returning task list');
    return c.json(taskList);
  },

  getTask: async (c: Context) => {
    const id = c.req.param('id');
    const task = tasks.get(id);

    if (!task) {
      logger.warn({ taskId: id }, 'Task not found');
      c.status(404 as StatusCode);
      return c.json({
        message: 'Task not found'
      });
    }

    logger.debug({ taskId: id }, 'Returning task details');
    return c.json(task);
  },

  createTask: async (c: Context) => {
    const body = await parseAndValidateBody<CreateTask>(c, CreateTaskSchema);
    if ('message' in body) return c.json(body); // Return error response if validation failed

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const task: Task = {
      id,
      title: body.title.trim(),
      completed: false,
      createdAt: now,
      updatedAt: now,
    };

    tasks.set(id, task);
    logger.info({ taskId: id, title: task.title }, 'Task created');
    c.status(201 as StatusCode);
    return c.json(task);
  },

  updateTask: async (c: Context) => {
    const id = c.req.param('id');
    const body = await parseAndValidateBody<UpdateTask>(c, UpdateTaskSchema);
    if ('message' in body) return c.json(body); // Return error response if validation failed

    const task = tasks.get(id);

    if (!task) {
      logger.warn({ taskId: id }, 'Task not found for update');
      c.status(404 as StatusCode);
      return c.json({
        message: 'Task not found'
      });
    }

    const updatedTask: Task = {
      ...task,
      title: body.title?.trim() ?? task.title,
      completed: body.completed ?? task.completed,
      updatedAt: new Date().toISOString(),
    };

    tasks.set(id, updatedTask);
    logger.info({ taskId: id, changes: body }, 'Task updated');
    return c.json(updatedTask);
  },

  deleteTask: async (c: Context) => {
    const id = c.req.param('id');

    if (!tasks.has(id)) {
      logger.warn({ taskId: id }, 'Task not found for deletion');
      c.status(404 as StatusCode);
      return c.json({
        message: 'Task not found'
      });
    }

    tasks.delete(id);
    logger.info({ taskId: id }, 'Task deleted');
    c.status(204 as StatusCode);
    return new Response(null);
  },
};