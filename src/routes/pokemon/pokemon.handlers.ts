import { Context } from 'hono';
import { ApiException } from '../../types/api';
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
        throw new ApiException('POKEMON_NOT_FOUND', 'Pokemon not found', 404);
      }
      
      const pokemon: Pokemon = await response.json();
      return c.json(pokemon, 200);
    } catch (error) {
      if (error instanceof ApiException) throw error;
      throw new ApiException('POKEMON_FETCH_ERROR', 'Failed to fetch Pokemon data', 500);
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
        throw new ApiException('POKEMON_LIST_ERROR', 'Failed to fetch Pokemon list', 500);
      }
      
      const data: PokemonListResponse = await response.json();
      return c.json(data, 200);
    } catch (error) {
      throw new ApiException('POKEMON_LIST_ERROR', 'Failed to fetch Pokemon list', 500);
    }
  },
};