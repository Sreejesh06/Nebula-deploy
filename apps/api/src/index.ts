import Fastify from 'fastify'
import cors from '@fastify/cors'

const fastify = Fastify({ logger: true })

fastify.register(cors)

fastify.get('/health', async () => {
  return { status: 'ok', service: 'nebula-deploy-api' }
})

const start = async () => {
  try {
    await fastify.listen({ port: Number(process.env.PORT) || 3000, host: '0.0.0.0' })
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
