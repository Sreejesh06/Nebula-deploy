# NebulaDeploy

## What this repo is
This project uses a docs-first build approach.
Before writing code, the plan lives in the docs/ folder.
Read those files to understand what's being built and why.

## Docs folder
| file | what it's for |
|------|---------------|
| docs/prd.md | what we're building and for who |
| docs/techstack.md | stack decisions and folder structure |
| docs/flow.md | how users move through the system |
| docs/requirements.md | data model and technical constraints |

## How to add a new feature
1. Add the feature to docs/prd.md under Core Features
2. Add or update data models in docs/requirements.md
3. Add the flow to docs/flow.md if it changes behavior
4. Open Copilot Agent, attach the relevant docs file, and say: "Build [feature name] as described in docs/prd.md"

## Setup
See docs for stack and configuration. This repo is a monorepo with:
- apps/api (Fastify + Prisma)
- apps/worker (BullMQ + Docker + MinIO)
- apps/dashboard (Next.js 14)
- packages/types (shared types)
