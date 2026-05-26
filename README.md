# [APP NAME]

## What this repo is
This project uses a docs-first vibe coding approach.
Before writing code, the plan lives in the docs/ folder.
Read those files to understand what's being built and why.

## Docs folder
| file | what it's for |
|------|---------------|
| docs/prd.md | what we're building and for who |
| docs/techstack.md | stack decisions and folder structure |
| docs/flow.md | how users move through the app |
| docs/requirements.md | database schema and technical constraints |

## How to add a new feature
1. Add the feature to docs/prd.md under Core Features
2. Add any new DB tables to docs/requirements.md
3. Add the user flow to docs/flow.md if it's a new screen
4. Open Copilot Agent, attach the relevant docs file, and say: "Build [feature name] as described in docs/prd.md"

## Setup
```bash
npm install
cp .env.example .env.local
# fill in your Supabase URL and anon key
npm run dev
```

## Env vars needed
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```
