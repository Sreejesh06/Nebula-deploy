import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'

export const healthRoutes: FastifyPluginAsyncTypebox = async (fastify) => {
  fastify.get(
    '/health',
    {
      schema: {
        response: {
          200: Type.Object({
            ok: Type.Boolean(),
            service: Type.Literal('api')
          })
        }
      }
    },
    async () => {
      try {
        return { ok: true, service: 'api' }
      } catch (error) {
        // In case we expand health checks later, keep a defensive try/catch.
        fastify.log.error({ err: error }, 'Health check failed')
        throw error
      }
    }
  )
}
