# NebulaDeploy — Copilot Instructions

## What this project is
A self-hosted deployment platform (mini Vercel).
git push → webhook → build in Docker → upload artifact → serve at preview URL.

## Monorepo Structure
/apps/api          → Fastify backend
/apps/worker       → BullMQ build worker (separate process)
/apps/dashboard    → Next.js 14 frontend
/packages/types    → shared TypeScript types

## Stack (non-negotiable)
- API: Fastify v4 + TypeScript — NEVER Express
- ORM: Prisma — NEVER raw SQL or other ORMs
- Queue: BullMQ + Redis
- Worker: dockerode, simple-git, minio JS SDK
- Frontend: Next.js 14 App Router + Tailwind + TanStack Query
- Validation: zod ONLY for env vars at startup and webhook body — nowhere else
- Reverse proxy: Traefik v3 (file provider)

## Code Rules
- TypeScript only — never .js files
- async/await only — never .then() or callbacks
- named exports only — default exports only in Next.js pages/layouts
- Always wrap route handlers in try/catch
- Never use console.log — use fastify.log.error / fastify.log.info
- Never hardcode secrets or URLs — always process.env
- Use fastify.register() for route groups
- Use fastify-plugin for shared decorators (db, redis)

## Zod Usage (keep it simple)
Only use zod in TWO places:
1. Env validation at startup in both api and worker — fail fast if vars are missing
2. GitHub webhook body — it's untrusted external input

Do NOT use zod for: internal functions, route schemas, frontend forms, anywhere else.
Use TypeScript types for everything else.

## Fastify Route Pattern
```typescript
import type { FastifyPluginAsync } from 'fastify'

const webhookRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post<{ Body: WebhookBody }>('/webhooks/github', async (request, reply) => {
    try {
      // handler
    } catch (err) {
      fastify.log.error(err)
      return reply.status(500).send({ error: 'internal server error' })
    }
  })
}

export { webhookRoutes }
```

## BullMQ Pattern
- Queue defined in apps/api/src/lib/queue.ts
- Job processors in apps/worker/src/jobs/
- Job types (name + data shape) defined in packages/types/index.ts

## Database Models
```
Project  { id, name, repoUrl, activeDeployId, createdAt }
Deploy   { id, projectId, commitSha, branch, status, artifactKey, artifactHash, previewUrl, buildDurationMs, nebulaConfig, statusUpdatedAt, createdAt }
Route    { id, host, deployId, projectId, isPrimary, createdAt }

Deploy status enum: QUEUED | BUILDING | UPLOADING | ACTIVATING | READY | FAILED
```

## Build Order (follow this, do not skip ahead)
Phase 1 — core pipeline:
  1. Fastify server bootstrap + zod env validation
  2. Prisma schema + migrate
  3. GitHub webhook receiver + HMAC validation
  4. BullMQ queue setup
  5. Build worker: clone → Docker container → stream logs
  6. MinIO artifact upload
  7. Traefik dynamic config write → preview URL live

Phase 2 — realtime:
  8. Redis pub/sub log streaming
  9. WebSocket endpoint in API
  10. Next.js dashboard: project list, deploy history, live log viewer

Phase 3 — hard engineering:
  11. Docker resource limits (512MB RAM, 1 CPU, --network=none)
  12. Content-addressed artifact dedup (SHA-256 hash)
  13. Rollback endpoint (swap Traefik pointer, no rebuild)
  14. Worker concurrency control (Redis INCR/DECR counter)

Phase 4 — open source tier:
  15. nebula.json route rules → Traefik middleware chain
  16. nebula-cli npm package (deploy, rollback, logs commands)
  17. Deploy diff viewer (git diff --stat between commits)
  18. GitHub PR status checks

## NEVER
- Use Express
- Use mongoose, knex, or raw pg
- Use .then() or callbacks
- Hardcode any value that should be in .env
- Use console.log
- Use zod outside of env validation and webhook body
- Write plain .js files