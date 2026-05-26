# Technical Requirements

## Database schema (Prisma)
Define models here before building.

### Project
| column | type | notes |
|--------|------|-------|
| id | string | cuid, primary key |
| name | string | project name |
| repoUrl | string | git repository URL |
| activeDeployId | string | FK to Deploy, nullable |
| createdAt | datetime | default now() |

### Deploy
| column | type | notes |
|--------|------|-------|
| id | string | cuid, primary key |
| projectId | string | FK to Project |
| commitSha | string | git commit |
| branch | string | git branch |
| status | enum | QUEUED | BUILDING | UPLOADING | ACTIVATING | READY | FAILED |
| artifactKey | string | storage key, nullable |
| artifactHash | string | SHA-256 hash, nullable |
| previewUrl | string | preview URL, nullable |
| buildDurationMs | int | build time, nullable |
| nebulaConfig | json | parsed config, nullable |
| statusUpdatedAt | datetime | updated timestamp |
| createdAt | datetime | default now() |

### Route
| column | type | notes |
|--------|------|-------|
| id | string | cuid, primary key |
| host | string | hostname |
| deployId | string | FK to Deploy |
| projectId | string | FK to Project |
| isPrimary | boolean | default false |
| createdAt | datetime | default now() |

## API structure
- Fastify v4 only. No Express.
- Route groups registered via fastify.register().
- Wrap each handler in try/catch and log with fastify.log.
- Use Prisma for data access. No raw SQL.

## Queue and worker
- BullMQ + Redis for job queue.
- Job types defined in packages/types.
- Worker performs build in Docker and uploads artifacts to MinIO.

## TypeScript rules
- TypeScript only, no .js files.
- No `any`; use `unknown` and narrow it.
- Named exports only (default exports only in Next.js pages/layouts).
