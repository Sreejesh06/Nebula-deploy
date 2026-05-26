# Product Requirements Document

## App Overview
**Name:** NebulaDeploy
**Tagline:** Self-hosted deployments from Git to preview URLs
**Problem it solves:** Teams need a lightweight, self-hosted deployment pipeline like Vercel but controlled within their own infrastructure.
**Who it's for:** Developers and small teams who want preview environments without relying on hosted platforms.

## Core Features (v1)
1. GitHub webhook deploys — receive push events and enqueue builds.
2. Build worker pipeline — clone repo, build in Docker, capture logs.
3. Artifact storage — upload build output to MinIO with content hashing.
4. Preview URLs — publish via Traefik dynamic config and serve artifacts.
5. Deploy tracking — store deploy records with status and metadata.

## User Personas
**Primary user:** Developer setting up internal preview environments for team QA.
**Secondary user:** Ops-minded engineer who wants self-hosted control over deployments.

## What's out of scope for v1
- Multi-tenant billing or plans
- Git providers beyond GitHub
- Advanced auth beyond basic access control

## Future scope
- Real-time log streaming to dashboard
- Rollback endpoint and deploy diff view
- PR status checks on GitHub
