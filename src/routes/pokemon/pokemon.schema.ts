import { z } from 'zod';

export const PokemonSchema = z.object({
  id: z.number(),
  name: z.string(),
  height: z.number(),
  weight: z.number(),
  types: z.array(z.object({
    type: z.object({
      name: z.string(),
    }),
  })),
  sprites: z.object({
    front_default: z.string().nullable(),
  }),
});

export type Pokemon = z.infer<typeof PokemonSchema>;