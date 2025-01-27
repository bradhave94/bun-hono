import pino from 'pino';
import { env } from './env';

export const logger = pino({
  level: env.LOG_LEVEL,
  transport: env.NODE_ENV === 'development' 
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          ignore: 'pid,hostname',
          translateTime: 'SYS:standard',
        },
      }
    : undefined,
  redact: {
    paths: [
      'headers.authorization',
      'headers.cookie',
      'request.headers.authorization',
      'request.headers.cookie',
    ],
    remove: true,
  },
});