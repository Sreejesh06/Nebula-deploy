# NebulaDeploy — Copilot Instructions

## Project Vision
NebulaDeploy is a self-hosted deployment platform — a mini Vercel.
When a developer pushes code to GitHub, this system:
1. Receives a webhook from GitHub
2. Enqueues a build job
3. Clones the repo and runs the build inside an isolated Docker container
4. Uploads the build artifact to MinIO (S3-compatible storage)
5. Updates the route registry so Traefik serves the new build at a preview URL
6. Streams build logs in real-time to the dashboard via WebSockets

## Monorepo Structure
/apps
  /api          → Fastify REST API server (main backend)
  /worker       → BullMQ build worker (separate long-running process)
  /dashboard    → Next.js 14 frontend (App Router)
/packages
  /types        → shared TypeScript types used across apps
  /config       → shared zod schemas and environment validation

## Full Tech Stack

### Backend (apps/api)
- Runtime: Node.js 20
- Framework: Fastify v4 (NEVER Express)
- Language: TypeScript strict mode
- ORM: Prisma (NEVER raw SQL, NEVER other ORMs)
- Validation: zod (validate ALL external input)
- Auth: JWT via @fastify/jwt
- WebSockets: @fastify/websocket
- Environment: @fastify/env with zod schema

### Worker (apps/worker)
- Queue: BullMQ (backed by Redis)
- Docker control: dockerode (Node.js Docker SDK)
- File upload: minio (official MinIO JS SDK)
- Git: simple-git

### Frontend (apps/dashboard)
- Framework: Next.js 14 with App Router
- Language: TypeScript strict mode
- Styling: Tailwind CSS
- Data fetching: TanStack Query (React Query)
- WebSocket client: native browser WebSocket
- Forms: react-hook-form + zod resolver

### Infrastructure
- Database: PostgreSQL 16 via Prisma
- Queue/Cache: Redis 7 via BullMQ
- Object Storage: MinIO (S3-compatible)
- Reverse Proxy: Traefik v3 (dynamic file provider for routing)
- Containers: Docker (worker spawns sibling containers via Docker socket)

## Database Models (Prisma)
The core models are:

Project {
  id, name, repoUrl, teamId,
  activeDeployId (FK to Deploy),
  createdAt
}

Deploy {
  id, projectId, commitSha, branch, status,
  artifactKey, artifactHash, previewUrl,
  buildDurationMs, nebulaConfig (Json),
  statusUpdatedAt, createdAt
}
Deploy.status enum: QUEUED | BUILDING | UPLOADING | ACTIVATING | READY | FAILED

Route {
  id, host, deployId, projectId,
  isPrimary, createdAt
}

## Environment Variables
Always read from process.env. Always validate at startup with zod. Never hardcode.
API env vars: DATABASE_URL, REDIS_URL, MINIO_ENDPOINT, MINIO_PORT,
MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET, GITHUB_WEBHOOK_SECRET,
JWT_SECRET, PORT, NODE_ENV
Worker env vars: DATABASE_URL, REDIS_URL, MINIO_*, DOCKER_SOCKET_PATH

## Code Style Rules
- TypeScript ONLY — never write plain .js files
- async/await ONLY — never .then() chains
- named exports ONLY — no default exports except Next.js pages/layouts
- Always type Fastify routes with TypeScript generics for request body/params/query
- Always wrap route handlers in try/catch
- Always log errors with a logger (fastify.log.error), never console.log in production code
- Use fastify.register() for all route groups
- Use fastify-plugin for shared decorators (db, redis, auth)

## Fastify Route Pattern
Every route file must follow this pattern:
```typescript
import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox'
import { Type } from '@sinclair/typebox'

const route: FastifyPluginAsyncTypebox = async (fastify) => {
  fastify.post('/webhooks/github', {
    schema: {
      body: Type.Object({ ... }),
      response: { 200: Type.Object({ ... }) }
    }
  }, async (request, reply) => {
    // handler
  })
}

export default route
```

## BullMQ Job Pattern
Jobs go in apps/worker/src/jobs/.
Each job file exports a processor function typed with BullMQ's Processor<JobData, JobResult>.
Job names are string enums defined in packages/types.

## Feature Build Order (follow this sequence)
Phase 1 - Core pipeline:
  1. Fastify server bootstrap with env validation
  2. Prisma schema + migrations
  3. GitHub webhook receiver with HMAC validation
  4. BullMQ queue setup
  5. Build worker: clone → docker build → capture logs
  6. MinIO artifact upload
  7. Traefik route registry update
  8. Preview URL generation

Phase 2 - Realtime:
  9. Redis pub/sub log streaming
  10. WebSocket endpoint in API
  11. Next.js dashboard: deploy list, live log viewer

Phase 3 - Hard engineering:
  12. Docker resource limits (memory, CPU, network isolation)
  13. Content-addressed artifact storage (SHA-256 dedup)
  14. Atomic route registry with PostgreSQL advisory locks
  15. Rollback endpoint
  16. Worker concurrency control with Redis counter

Phase 4 - Open source tier:
  17. nebula.json route rules → Traefik middleware chain
  18. nebula-cli npm package
  19. Deploy diff viewer (git diff between deploys)
  20. GitHub PR status checks via GitHub App

## What Copilot Should Always Do
- When creating a new feature, start with the zod schema
- Then the Prisma model if DB is involved
- Then the Fastify route with full TypeScript types
- Then export types to packages/types
- Always suggest error cases and edge cases
- Always suggest the corresponding BullMQ job if the feature involves async work

## What Copilot Should NEVER Do
- Use Express instead of Fastify
- Use mongoose, knex, or raw pg instead of Prisma
- Use .then() or callbacks
- Hardcode any URL, secret, or config value
- Use console.log (use fastify.log or a passed logger)
- Skip zod validation on any external input
- Write a feature without TypeScript types
- Use default exports except in Next.js files
