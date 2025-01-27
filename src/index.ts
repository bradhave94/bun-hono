import { serve } from "bun";
import { app } from './app';
import { env } from './env';
import { logger } from './logger';

const server = serve({
  port: env.PORT,
  fetch: app.fetch,
});

logger.info(
  `Server running at http://localhost:${server.port} in ${env.NODE_ENV} mode`
);