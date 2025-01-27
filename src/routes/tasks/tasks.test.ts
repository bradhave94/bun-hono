import { describe, expect, it, beforeEach } from 'bun:test';
import { app } from '../../app';

describe('Tasks API', () => {
  let csrfToken: string;

  beforeEach(async () => {
    // Get a new CSRF token before each test
    const res = await app.request('/api/v1/csrf');
    const data = await res.json();
    csrfToken = data.token;
  });

  it('should create a new task', async () => {
    const res = await app.request('/api/v1/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken
      },
      body: JSON.stringify({ title: 'Test task' }),
    });

    expect(res.status).toBe(201);
    const task = await res.json();
    expect(task.title).toBe('Test task');
    expect(task.completed).toBe(false);
    expect(task.id).toBeDefined();
  });

  it('should get all tasks', async () => {
    const res = await app.request('/api/v1/tasks');
    expect(res.status).toBe(200);
    const tasks = await res.json();
    expect(Array.isArray(tasks)).toBe(true);
  });

  it('should return 404 for non-existent task', async () => {
    const res = await app.request('/api/v1/tasks/non-existent-id');
    expect(res.status).toBe(404);
  });
});