const fastify = require('fastify')({ logger: true })

// This is your ONE endpoint for week 1
fastify.post('/webhook', async (request, reply) => {
  console.log('✅ Someone pushed!')
  console.log('Payload:', request.body) // see what GitHub sends
  return reply.status(200).send({ ok: true })
})

// Start the server on port 3000
fastify.listen({ port: 3000 }, (err) => {
  if (err) throw err
  console.log('Server running on http://localhost:3000')
})
