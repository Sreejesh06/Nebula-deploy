# NebulaDeploy — Agent Build Prompt

You are a senior full-stack engineer building NebulaDeploy from scratch.
NebulaDeploy is a self-hosted deployment platform (mini Vercel).
git push → webhook → build in Docker → artifact uploaded → served at preview URL.

Read this entire file before writing a single line of code.
Build in the exact phase order below. Do not skip ahead. Do not stop and ask what to build next.

---

## Stack (non-negotiable)

| Layer | Choice |
|---|---|
| API | Fastify v4 + TypeScript — NEVER Express |
| ORM | Prisma — NEVER raw SQL |
| Queue | BullMQ + Redis |
| Worker | dockerode, simple-git, minio JS SDK |
| Frontend | Next.js 14 App Router + Tailwind + TanStack Query |
| Validation | zod ONLY for env vars + webhook body |
| Proxy | Traefik v3 file provider |

---

## Monorepo Structure

```
/apps/api           → Fastify backend
/apps/worker        → BullMQ worker (separate long-running process)
/apps/dashboard     → Next.js 14 frontend
/packages/types     → shared TypeScript types (job data, enums, config shapes)
```

---

## Code Rules

- TypeScript only — never .js files
- async/await only — never .then() or callbacks
- named exports only — default exports only in Next.js pages/layouts
- Always wrap Fastify route handlers in try/catch
- Never use console.log — use fastify.log
- Never hardcode secrets or URLs — always process.env
- Use fastify.register() for route groups
- Use fastify-plugin for shared decorators

---

## Zod — keep it minimal

Only use zod in exactly two places:
1. **Env validation at startup** in both api and worker — so the process crashes immediately with a clear message if a var is missing
2. **GitHub webhook body** — untrusted external input

Use plain TypeScript types for everything else. No zod on route schemas, internal functions, or frontend.

---

## Shared Types — build first in /packages/types/index.ts

```typescript
export enum JobName {
  BUILD = 'BUILD',
}

export interface BuildJobData {
  deployId: string
  projectId: string
  commitSha: string
  branch: string
  repoUrl: string
  buildCommand: string
  outputDir: string
  nodeVersion: string
}

export interface BuildJobResult {
  success: boolean
  artifactKey?: string
  artifactHash?: string
  previewUrl?: string
  durationMs: number
  error?: string
}

export interface NebulaConfig {
  buildCommand: string
  outputDir: string
  nodeVersion: string
  routes: NebulaRouteRule[]
}

export interface NebulaRouteRule {
  src: string
  dest?: string
  status?: number
  headers?: Record<string, string>
}

export type DeployStatus = 'QUEUED' | 'BUILDING' | 'UPLOADING' | 'ACTIVATING' | 'READY' | 'FAILED'
```

---

## Prisma Schema — apps/api/prisma/schema.prisma

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Project {
  id             String   @id @default(cuid())
  name           String
  repoUrl        String
  activeDeployId String?
  activeDeploy   Deploy?  @relation("ActiveDeploy", fields: [activeDeployId], references: [id])
  deploys        Deploy[] @relation("ProjectDeploys")
  routes         Route[]
  createdAt      DateTime @default(now())
}

model Deploy {
  id              String       @id @default(cuid())
  projectId       String
  project         Project      @relation("ProjectDeploys", fields: [projectId], references: [id])
  commitSha       String
  branch          String
  status          DeployStatus @default(QUEUED)
  artifactKey     String?
  artifactHash    String?
  previewUrl      String?
  buildDurationMs Int?
  nebulaConfig    Json?
  diffStat        String?
  statusUpdatedAt DateTime     @default(now())
  createdAt       DateTime     @default(now())
  routes          Route[]
  activeForProject Project[]   @relation("ActiveDeploy")
}

model Route {
  id        String   @id @default(cuid())
  host      String   @unique
  deployId  String
  deploy    Deploy   @relation(fields: [deployId], references: [id])
  projectId String
  project   Project  @relation(fields: [projectId], references: [id])
  isPrimary Boolean  @default(false)
  createdAt DateTime @default(now())
}

enum DeployStatus {
  QUEUED
  BUILDING
  UPLOADING
  ACTIVATING
  READY
  FAILED
}
```

---

## Environment Variables

### apps/api/.env
```
DATABASE_URL="postgresql://nebula:nebula@localhost:5432/nebula"
REDIS_URL="redis://localhost:6379"
MINIO_ENDPOINT="localhost"
MINIO_PORT=9000
MINIO_ACCESS_KEY="nebula"
MINIO_SECRET_KEY="nebula123"
MINIO_BUCKET="deploys"
GITHUB_WEBHOOK_SECRET="supersecretkey"
JWT_SECRET="jwtsupersecret"
PORT=3000
NODE_ENV="development"
```

### apps/worker/.env
```
DATABASE_URL="postgresql://nebula:nebula@localhost:5432/nebula"
REDIS_URL="redis://localhost:6379"
MINIO_ENDPOINT="localhost"
MINIO_PORT=9000
MINIO_ACCESS_KEY="nebula"
MINIO_SECRET_KEY="nebula123"
MINIO_BUCKET="deploys"
DOCKER_SOCKET_PATH="/var/run/docker.sock"
NODE_ENV="development"
```

---

## Docker Compose — root docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_USER: nebula
      POSTGRES_PASSWORD: nebula
      POSTGRES_DB: nebula
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: nebula
      MINIO_ROOT_PASSWORD: nebula123
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:/data

  traefik:
    image: traefik:v3.0
    command:
      - "--api.insecure=true"
      - "--providers.file.directory=/etc/traefik/dynamic"
      - "--providers.file.watch=true"
      - "--entrypoints.web.address=:80"
    ports:
      - "80:80"
      - "8080:8080"
    volumes:
      - "./traefik/dynamic:/etc/traefik/dynamic"
      - "/var/run/docker.sock:/var/run/docker.sock:ro"

volumes:
  postgres_data:
  minio_data:
```

Create: `traefik/dynamic/.gitkeep`

---

## PHASE 1 — Core Pipeline

### Step 1 — Fastify bootstrap (apps/api/src/index.ts)

- Validate all env vars with zod at startup — crash with clear message if missing
- Start Fastify with logger: true
- Register @fastify/cors
- Decorate fastify with Prisma client (fastify.db)
- Decorate fastify with Redis client (fastify.redis) using ioredis
- Register route plugins under /api/v1
- Listen on process.env.PORT
- Graceful shutdown on SIGTERM: disconnect Prisma, quit Redis

### Step 2 — GitHub webhook receiver (apps/api/src/routes/webhooks.ts)

- POST /api/v1/webhooks/github
- Read raw body as Buffer — do NOT parse JSON before HMAC check
- Validate X-Hub-Signature-256 using crypto.timingSafeEqual(
    Buffer.from(signature), 
    Buffer.from('sha256=' + hmac.update(rawBody).digest('hex'))
  )
- Return 401 if invalid — no details in response
- Check X-GitHub-Event header — only process 'push' events, return 200 silently for others
- Parse body JSON after validation
- Only process pushes to main or master branch
- Extract: ref, repository.clone_url, head_commit.id, head_commit.message
- Validate body shape with zod (this is the one place zod is used on input)
- Look up Project in DB by repoUrl — return 200 silently if not found (don't leak project info)
- Create Deploy record: status QUEUED, commitSha, branch, projectId
- Add job to BullMQ queue with BuildJobData payload
- Return { received: true, deployId }

### Step 3 — Queue setup (apps/api/src/lib/queue.ts)

- Create BullMQ Queue named 'builds' connected to Redis
- Export addBuildJob(data: BuildJobData) with options:
  - attempts: 3
  - backoff: { type: 'exponential', delay: 5000 }
  - removeOnComplete: 100
  - removeOnFail: 500

### Step 4 — Worker bootstrap (apps/worker/src/index.ts)

- Validate env vars with zod at startup
- Connect to Prisma and Redis
- Create BullMQ Worker on queue 'builds' with concurrency: 2
- Wire up the build processor from Step 5
- Log worker started, job started, job completed, job failed

### Step 5 — Build processor (apps/worker/src/jobs/build.ts)

This is the core of the whole project. Build it carefully.

```
1. Update deploy status → BUILDING

2. Clone repo into /tmp/nebula-builds/{deployId}/ using simple-git
   git.clone(repoUrl, cloneDir, ['--depth', '1', '--branch', branch])

3. Read nebula.json from cloneDir root
   - Parse as NebulaConfig
   - If file missing or invalid, use defaults:
     { buildCommand: 'npm run build', outputDir: 'dist', nodeVersion: '20', routes: [] }
   - Save nebulaConfig to Deploy record in DB

4. Record buildStartTime = Date.now()

5. Spawn Docker container via dockerode:
   Image: node:{nodeVersion}-alpine
   Cmd: ['sh', '-c', 'cd /app && npm install && {buildCommand}']
   HostConfig:
     Binds: ['{cloneDir}:/app']
     Memory: 512 * 1024 * 1024
     CpuQuota: 100000
     CpuPeriod: 100000
     NetworkMode: 'none'
   AutoRemove: true

6. Attach to container stdout+stderr
   For each chunk: Redis PUBLISH build-logs:{deployId}
   Message format: JSON.stringify({ deployId, line: chunk.toString(), ts: Date.now() })

7. Start container, wait for it to finish
   If exit code !== 0: update status FAILED, publish { done: true, success: false }, throw

8. buildDurationMs = Date.now() - buildStartTime
   Update deploy: buildDurationMs, status → UPLOADING

9. Tar the output:
   outputPath = path.join(cloneDir, outputDir)
   tarPath = /tmp/{deployId}.tar.gz
   tar -czf {tarPath} -C {outputPath} .

10. SHA-256 hash the tar file
    artifactHash = crypto.createHash('sha256').update(fileBuffer).digest('hex')

11. Check MinIO: does deploys/{artifactHash}.tar.gz already exist?
    If yes: skip upload (deduplication hit — log it)
    If no: upload tarPath to MinIO as deploys/{artifactHash}.tar.gz

12. Update deploy: artifactKey, artifactHash, status → ACTIVATING

13. Generate preview URL host:
    branchSlug = branch.replace(/[^a-z0-9]/gi, '-').toLowerCase()
    shortSha = commitSha.slice(0, 7)
    host = {branchSlug}-{shortSha}.nebula.localhost

14. Create Route record in DB: { host, deployId, projectId, isPrimary: false }

15. Write Traefik dynamic config to /etc/traefik/dynamic/{deployId}.yml:
    (see Traefik Config section below)

16. Update deploy: status → READY, previewUrl → http://{host}, statusUpdatedAt
    Update project: activeDeployId → deployId

17. Publish to Redis: { deployId, line: 'Deploy ready: http://{host}', ts: Date.now(), done: true, success: true }

18. Cleanup: rm -rf cloneDir, rm tarPath
```

### Traefik Dynamic Config format

Write this YAML to /etc/traefik/dynamic/{deployId}.yml:

```yaml
http:
  routers:
    deploy-{deployId}:
      rule: "Host(`{host}`)"
      service: deploy-{deployId}
      entryPoints:
        - web
  services:
    deploy-{deployId}:
      loadBalancer:
        servers:
          - url: "http://minio:9000/deploys/{artifactHash}.tar.gz"
```

Traefik watches the directory and hot-reloads automatically. No restart needed.

---

## PHASE 2 — Realtime + Dashboard

### Step 6 — WebSocket log endpoint (apps/api/src/routes/logs.ts)

- Register @fastify/websocket on the Fastify instance
- GET /api/v1/logs/:deployId — upgrades to WebSocket
- On connect:
  - Check deploy status in DB — if READY or FAILED, send { done: true } and close
  - Subscribe to Redis channel build-logs:{deployId}
  - Forward every message to the WebSocket client
- On client disconnect: unsubscribe from Redis channel

### Step 7 — REST routes for dashboard (apps/api/src/routes/projects.ts + deploys.ts)

```
GET  /api/v1/projects                    → list all projects with their activeDeploy
POST /api/v1/projects                    → create { name, repoUrl }
GET  /api/v1/projects/:id                → project + activeDeploy detail
GET  /api/v1/projects/:id/deploys        → paginated deploy list (default 20, newest first)
GET  /api/v1/deploys/:id                 → deploy detail
POST /api/v1/projects/:id/rollback       → Phase 3
GET  /api/v1/system/stats                → Phase 3
```

### Step 8 — Next.js dashboard (apps/dashboard)

Three pages:

**/ — Project list**
- Fetch /api/v1/projects with TanStack Query, refetch every 5s
- Show: project name, repo URL, latest deploy status badge, preview URL if READY
- Status badge colors: QUEUED=gray, BUILDING=yellow, UPLOADING=blue, ACTIVATING=purple, READY=green, FAILED=red
- Click project → go to /projects/[id]

**/projects/[id] — Deploy history**
- Fetch /api/v1/projects/:id/deploys
- Table: branch, short commit SHA, status badge, duration (formatted), time ago, preview link
- Click row → go to /deploys/[id]

**/deploys/[id] — Deploy detail + live logs**
- Fetch deploy data once on load
- Show: status, branch, commit SHA, preview URL, duration, nebula config JSON
- Log viewer:
  - Open WebSocket to ws://localhost:3000/api/v1/logs/:deployId
  - Append each line to a scrollable dark <pre> block
  - Auto-scroll to bottom on new lines
  - When { done: true } received: show "✓ Deploy complete" or "✗ Build failed", close socket
  - If deploy already READY or FAILED on load: show static message, don't open socket

---

## PHASE 3 — Hard Engineering

### Step 9 — Docker resource limits

Update dockerode config in build.ts:
```typescript
HostConfig: {
  Memory: 512 * 1024 * 1024,
  MemorySwap: 512 * 1024 * 1024,   // no swap
  CpuQuota: 100000,
  CpuPeriod: 100000,
  NetworkMode: 'none',
  ReadonlyRootfs: false,            // app needs to write node_modules
  Binds: [`${cloneDir}:/app`],
}
```

Add build timeout: if container runs > 10 minutes, call container.stop() and mark deploy FAILED.

### Step 10 — Rollback (apps/api/src/routes/projects.ts)

POST /api/v1/projects/:id/rollback
- Find the most recent READY deploy where id !== project.activeDeployId
- If none: return 400 { error: 'no previous deploy to roll back to' }
- Read the previous deploy's Traefik config from /etc/traefik/dynamic/{previousDeployId}.yml
- Copy it as the new active config for this project (or rewrite it)
- Update project.activeDeployId = previousDeploy.id
- Return { rolledBackTo: previousDeploy.id, previewUrl: previousDeploy.previewUrl }
- This must complete in under 1 second — no rebuild, just pointer swap

### Step 11 — Worker concurrency control

In apps/worker/src/index.ts:
- Before processing each job: await redis.incr('nebula:active_builds')
- After job completes or fails (in finally block): await redis.decr('nebula:active_builds')
- If current count > MAX_CONCURRENT_BUILDS (env var, default 5): delay job 10s

GET /api/v1/system/stats:
- active_builds: parseInt(await redis.get('nebula:active_builds') ?? '0')
- queue_depth: await buildsQueue.getWaitingCount()

---

## PHASE 4 — Open Source Tier

### Step 12 — nebula.json route rules → Traefik middlewares

When writing Traefik YAML in Step 5, parse nebulaConfig.routes and generate middlewares:

For redirect rules ({ src, status, headers: { Location } }):
```yaml
middlewares:
  redirect-{deployId}-0:
    redirectRegex:
      regex: "{src}"
      replacement: "{Location value}"
      permanent: {status === 301}
```

For header rules ({ headers }):
```yaml
middlewares:
  headers-{deployId}:
    headers:
      customResponseHeaders:
        X-Frame-Options: "DENY"
```

Chain all generated middleware names onto the router's middlewares array.

### Step 13 — Deploy diff viewer

After cloning in Step 5:
- Get previous deploy's commitSha from DB (last READY deploy for this project)
- If exists: run git diff --stat {prevSha}..{currentSha} using simple-git
- Store result string in deploy.diffStat
- Handle edge cases: first deploy (no prev SHA), force pushes (catch git errors gracefully)
- Show diffStat in the deploy detail page in dashboard

### Step 14 — GitHub PR status checks

File: apps/api/src/lib/github.ts

When deploy reaches READY:
```
POST https://api.github.com/repos/{owner}/{repo}/statuses/{commitSha}
Headers: Authorization: Bearer {GITHUB_TOKEN}
Body: {
  state: "success",
  target_url: "{previewUrl}",
  description: "Preview ready",
  context: "nebula-deploy/preview"
}
```

When deploy FAILS: post state: "failure", description: "Build failed"

Parse owner/repo from the repoUrl stored on the Project.
Add GITHUB_TOKEN to env vars.

### Step 15 — nebula-cli (packages/cli)

Commands built with commander.js:

```
nebula deploy          → POST /api/v1/projects/:id/deploy, stream logs to terminal
nebula rollback        → POST /api/v1/projects/:id/rollback, print result
nebula logs [id]       → connect WebSocket, stream logs with chalk colors
nebula status          → GET /api/v1/projects/:id, print active deploy info
```

Config file: .nebula/config.json in project root
```json
{ "projectId": "...", "apiUrl": "http://localhost:3000" }
```

Publish as: nebula-deploy-cli

---

## API Summary

```
POST   /api/v1/webhooks/github
GET    /api/v1/projects
POST   /api/v1/projects
GET    /api/v1/projects/:id
GET    /api/v1/projects/:id/deploys
POST   /api/v1/projects/:id/rollback
GET    /api/v1/deploys/:id
GET    /api/v1/logs/:deployId        (WebSocket)
GET    /api/v1/system/stats
```

---

## Definition of Done

Phase 1 complete when:
- curl POST /api/v1/webhooks/github creates a Deploy record and enqueues a job
- Worker clones a real repo, builds it in Docker, uploads artifact to MinIO
- Something is served at {branch}-{sha}.nebula.localhost via Traefik

Phase 2 complete when:
- Dashboard shows live log lines appearing in browser while Docker container is still running
- Deploy list shows correct status without manual refresh

Phase 3 complete when:
- Rollback swaps the live URL in under 1 second with no rebuild
- A build with network=none cannot make outbound HTTP calls

Phase 4 complete when:
- nebula deploy in terminal streams live logs and exits with preview URL printed
- GitHub PR shows green check linking to preview deploy

---

## Start here

```bash
docker compose up -d
cd apps/api
npx prisma migrate dev --name init
```

Then build Step 1. Server must start and log "NebulaDeploy API ready on port 3000".
Then Step 2. Then continue in order.
Do not stop between steps. Do not ask what to build next.