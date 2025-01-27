import { createRoute } from '@hono/zod-openapi';
import { PokemonSchema } from './pokemon.schema';
import { z } from 'zod';

export const routes = {
  getPokemon: createRoute({
    method: 'get',
    path: '/{id}',
    tags: ['Pokemon'],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string' },
        description: 'Pokemon ID or name',
      },
    ],
    responses: {
      200: {
        content: {
          'application/json': {
            schema: PokemonSchema,
          },
        },
        description: 'Pokemon details',
      },
      404: {
        description: 'Pokemon not found',
      },
    },
  }),

  listPokemon: createRoute({
    method: 'get',
    path: '/',
    tags: ['Pokemon'],
    parameters: [
      {
        name: 'limit',
        in: 'query',
        required: false,
        schema: { type: 'number', minimum: 1, maximum: 100, default: 20 },
        description: 'Number of Pokemon to return',
      },
      {
        name: 'offset',
        in: 'query',
        required: false,
        schema: { type: 'number', minimum: 0, default: 0 },
        description: 'Number of Pokemon to skip',
      },
    ],
    responses: {
      200: {
        content: {
          'application/json': {
            schema: z.object({
              count: z.number(),
              next: z.string().nullable(),
              previous: z.string().nullable(),
              results: z.array(z.object({
                name: z.string(),
                url: z.string(),
              })),
            }),
          },
        },
        description: 'List of Pokemon',
      },
    },
  }),
};