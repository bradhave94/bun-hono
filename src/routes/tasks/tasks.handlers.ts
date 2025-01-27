import type { Context } from 'hono';
import { ApiException } from '../../types/api';
import type { CreateTask, UpdateTask, Task } from './tasks.schema';
import { CreateTaskSchema, UpdateTaskSchema } from './tasks.schema';
import { logger } from '../../logger';

// In-memory store for demo purposes
const tasks = new Map<string, Task>();

async function parseAndValidateBody<T>(c: Context, schema: any): Promise<T> {
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
      throw new ApiException(
        'INVALID_CONTENT_TYPE',
        'Unsupported content type. Use application/json or application/x-www-form-urlencoded',
        415
      );
    }

    const result = schema.safeParse(body);
    
    if (!result.success) {
      throw new ApiException(
        'VALIDATION_ERROR',
        'Invalid request data',
        400,
        result.error.issues.map((issue: any) => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      );
    }

    return result.data;
  } catch (error) {
    if (error instanceof ApiException) throw error;
    
    logger.error({ error, contentType }, 'Failed to parse request body');
    throw new ApiException(
      'INVALID_REQUEST_BODY',
      'Could not parse request body',
      400
    );
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
      throw new ApiException('TASK_NOT_FOUND', 'Task not found', 404);
    }

    logger.debug({ taskId: id }, 'Returning task details');
    return c.json(task);
  },

  createTask: async (c: Context) => {
    const body = await parseAndValidateBody<CreateTask>(c, CreateTaskSchema);
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
    return c.json(task, 201);
  },

  updateTask: async (c: Context) => {
    const id = c.req.param('id');
    const body = await parseAndValidateBody<UpdateTask>(c, UpdateTaskSchema);
    const task = tasks.get(id);

    if (!task) {
      logger.warn({ taskId: id }, 'Task not found for update');
      throw new ApiException('TASK_NOT_FOUND', 'Task not found', 404);
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
      throw new ApiException('TASK_NOT_FOUND', 'Task not found', 404);
    }

    tasks.delete(id);
    logger.info({ taskId: id }, 'Task deleted');
    return new Response(null, { status: 204 });
  },
};