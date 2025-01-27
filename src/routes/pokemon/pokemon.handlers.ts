import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception'
import type { StatusCode } from 'hono/utils/http-status';
import { Pokemon } from './pokemon.schema';

const POKE_API_BASE = 'https://pokeapi.co/api/v2';

type PokemonListResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: Array<{ name: string; url: string }>;
};

export const handlers = {
  getPokemon: async (c: Context) => {
    const id = c.req.param('id');

    try {
      const response = await fetch(`${POKE_API_BASE}/pokemon/${id}`);

      if (!response.ok) {
        const status = response.status >= 100 && response.status < 600 ? response.status : 500;
        c.status(status as StatusCode);
        return c.json({
          message: 'Pokemon not found'
        });
      }

      const pokemon: Pokemon = await response.json();
      return c.json(pokemon);
    } catch (error) {
      c.status(500 as StatusCode);
      return c.json({
        message: 'Failed to fetch Pokemon data'
      });
    }
  },

  listPokemon: async (c: Context) => {
    const limit = Number(c.req.query('limit') ?? '20');
    const offset = Number(c.req.query('offset') ?? '0');

    try {
      const response = await fetch(
        `${POKE_API_BASE}/pokemon?limit=${limit}&offset=${offset}`
      );

      if (!response.ok) {
        const status = response.status >= 100 && response.status < 600 ? response.status : 500;
        c.status(status as StatusCode);
        return c.json({
          message: 'Failed to fetch Pokemon list'
        });
      }

      const data: PokemonListResponse = await response.json();
      return c.json(data);
    } catch (error) {
      c.status(500 as StatusCode);
      return c.json({
        message: 'Failed to fetch Pokemon list'
      });
    }
  },
};