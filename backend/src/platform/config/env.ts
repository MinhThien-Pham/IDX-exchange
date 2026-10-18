import { z } from 'zod';

const originSchema = z.url().refine((value) => {
  if (!URL.canParse(value)) return false;
  const url = new URL(value);
  return ['http:', 'https:'].includes(url.protocol) && url.origin === value;
}, 'Expected an exact HTTP(S) origin without a trailing slash or path');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(5000),
  DATABASE_URL: z
    .url()
    .refine((url) => /^postgres(ql)?:\/\//.test(url), 'Expected a PostgreSQL URL'),
  FRONTEND_ORIGINS: z
    .string()
    .default('http://localhost:5173')
    .transform((value) => value.split(',').map((origin) => origin.trim()))
    .pipe(z.array(originSchema).min(1)),
  LOG_LEVEL: z.enum(['info', 'silent']).default('info'),
});

export type Environment = z.infer<typeof envSchema>;

export function parseEnvironment(values: NodeJS.ProcessEnv): Environment {
  const parsed = envSchema.safeParse(values);
  if (!parsed.success) {
    // Only show variable names and validation messages, never their secret values.
    const fields = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
    throw new Error(`Invalid environment configuration: ${fields.join('; ')}`);
  }
  return parsed.data;
}
