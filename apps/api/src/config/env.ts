import { z } from 'zod'

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  MINIO_ENDPOINT: z.string().min(1),
  MINIO_PORT: z.coerce.number().int().positive(),
  MINIO_ACCESS_KEY: z.string().min(1),
  MINIO_SECRET_KEY: z.string().min(1),
  MINIO_BUCKET: z.string().min(1),
  GITHUB_WEBHOOK_SECRET: z.string().min(1),
  JWT_SECRET: z.string().min(1)
})

export const envJsonSchema = {
  type: 'object',
  required: [
    'DATABASE_URL',
    'REDIS_URL',
    'MINIO_ENDPOINT',
    'MINIO_PORT',
    'MINIO_ACCESS_KEY',
    'MINIO_SECRET_KEY',
    'MINIO_BUCKET',
    'GITHUB_WEBHOOK_SECRET',
    'JWT_SECRET'
  ],
  properties: {
    NODE_ENV: { type: 'string', default: 'development' },
    PORT: { type: 'number', default: 3000 },
    DATABASE_URL: { type: 'string' },
    REDIS_URL: { type: 'string' },
    MINIO_ENDPOINT: { type: 'string' },
    MINIO_PORT: { type: 'number' },
    MINIO_ACCESS_KEY: { type: 'string' },
    MINIO_SECRET_KEY: { type: 'string' },
    MINIO_BUCKET: { type: 'string' },
    GITHUB_WEBHOOK_SECRET: { type: 'string' },
    JWT_SECRET: { type: 'string' }
  }
} as const

export type Env = z.infer<typeof envSchema>

export const formatEnvErrors = (error: z.ZodError): string => {
  // Keep the error readable so missing variables are obvious.
  return error.issues
    .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
    .join('\n')
}
