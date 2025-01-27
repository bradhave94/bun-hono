import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().transform(Number).default("3000"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  API_VERSION: z.string().default("v1"),
  CSRF_SECRET: z.string().min(32).default(() => crypto.randomUUID()),
  ALLOWED_ORIGINS: z.string()
    .transform(str => str.split(',').map(s => s.trim()))
    .default("http://localhost:5500"),
  RATE_LIMIT_MAX: z.string().transform(Number).default("100"),
  RATE_LIMIT_WINDOW: z.string().transform(Number).default("60000"), // 1 minute in ms
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);
  
  if (!result.success) {
    console.error("❌ Invalid environment variables:", result.error.toString());
    process.exit(1);
  }
  
  return result.data;
}

export const env = validateEnv();