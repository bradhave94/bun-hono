import { describe, expect, it } from 'bun:test';
import { app } from '../../app';

describe('Tasks API', () => {
  it('should create a new task', async () => {
    const res = await app.request('/api/v1/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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