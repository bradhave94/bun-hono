import { OpenAPIHono } from '@hono/zod-openapi';
import { handlers } from './pokemon.handlers';
import { routes } from './pokemon.routes';

export function createPokemonRouter() {
  const router = new OpenAPIHono();

  router.openapi(routes.listPokemon, handlers.listPokemon);
  router.openapi(routes.getPokemon, handlers.getPokemon);

  return router;
}