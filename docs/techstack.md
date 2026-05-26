# Tech Stack

## Frontend
- Next.js 14 (App Router)
- TypeScript (strict mode)
- Tailwind CSS
- TanStack Query

## Backend / Storage
- Fastify v4 API
- Prisma ORM
- BullMQ + Redis
- Docker (build sandbox)
- MinIO (artifact storage)
- Traefik v3 (reverse proxy, file provider)

## Key decisions
- Fastify only. No Express.
- Prisma only. No raw SQL.
- Zod only for env validation and GitHub webhook body.
- Named exports only (default exports only in Next.js pages/layouts).
- Async/await only; no .then() chains.

## Monorepo structure
/apps/api          → Fastify backend
/apps/worker       → BullMQ build worker
/apps/dashboard    → Next.js 14 frontend
/packages/types    → shared TypeScript types
