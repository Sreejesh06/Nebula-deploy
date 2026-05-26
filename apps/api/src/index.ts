import 'dotenv/config'
import Fastify, { type FastifyInstance } from 'fastify'
import fastifyEnv from '@fastify/env'
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox'
import { ZodError } from 'zod'
import { envJsonSchema, envSchema, formatEnvErrors, type Env } from './config/env'
import { healthRoutes } from './routes/health'

const fastify = Fastify({ logger: true }).withTypeProvider<TypeBoxTypeProvider>()

const buildServer = async (): Promise<{ fastify: FastifyInstance; env: Env }> => {
  // Use @fastify/env for loading, then Zod for strict validation and typing.
  await fastify.register(fastifyEnv, {
    schema: envJsonSchema,
    confKey: 'config'
  })

  // fastify-env decorates `fastify.config` at runtime, so we cast for TS.
  const rawConfig = (fastify as FastifyInstance & { config: unknown }).config
  let env: Env

  try {
    // Zod gives us stronger validation and types than JSON schema alone.
    env = envSchema.parse(rawConfig)
  } catch (error) {
    if (error instanceof ZodError) {
      throw new Error(`Invalid environment variables:\n${formatEnvErrors(error)}`)
    }

    throw error
  }

  fastify.register(healthRoutes)

  return { fastify, env }
}

const start = async () => {
  try {
    const { env } = await buildServer()
    await fastify.listen({ port: env.PORT, host: '0.0.0.0' })
    fastify.log.info(`API listening on port ${env.PORT}`)
  } catch (error) {
    fastify.log.error({ err: error }, 'Failed to start server')
    process.exit(1)
  }
}

start()
