import { describe, expect, it } from 'bun:test';
import { app } from '../../app';

describe('Pokemon API', () => {
  it('should get a pokemon by id', async () => {
    const res = await app.request('/api/v1/pokemon/1');
    expect(res.status).toBe(200);
    const pokemon = await res.json();
    expect(pokemon.name).toBe('bulbasaur');
  });

  it('should get a pokemon by name', async () => {
    const res = await app.request('/api/v1/pokemon/pikachu');
    expect(res.status).toBe(200);
    const pokemon = await res.json();
    expect(pokemon.name).toBe('pikachu');
  });

  it('should return 404 for non-existent pokemon', async () => {
    const res = await app.request('/api/v1/pokemon/not-a-pokemon');
    expect(res.status).toBe(404);
  });

  it('should list pokemon with default pagination', async () => {
    const res = await app.request('/api/v1/pokemon');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.results.length).toBe(20);
  });
});