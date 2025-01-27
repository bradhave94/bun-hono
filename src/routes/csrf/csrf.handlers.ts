import { Context } from 'hono';
import { generateToken } from '../../middleware/csrf';
import { logger } from '../../logger';

export const handlers = {
  getToken: async (c: Context) => {
    const token = await generateToken(c);
    
    logger.debug({ token }, 'Generated new CSRF token');
    
    return c.json({ token }, 200);
  },
};