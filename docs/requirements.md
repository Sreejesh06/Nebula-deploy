# Technical Requirements

## Database schema (Supabase)
Define tables here before building.

### users (handled by Supabase Auth)
- id, email, created_at — automatic

### [TABLE NAME]
| column | type | notes |
|--------|------|-------|
| id | uuid | primary key, default gen_random_uuid() |
| user_id | uuid | FK to auth.users |
| [COLUMN] | [TYPE] | [NOTE] |
| created_at | timestamptz | default now() |

## API structure
Keep it simple. Use Supabase client in Server Components directly where possible.
Only create API routes (/app/api/) for:
- Webhooks from external services
- Operations that need a secret key hidden from client

## State management rules
- Server state (data from DB) → fetch in Server Components or React Query
- UI state (open/closed, selected tab) → useState locally
- Auth state → Supabase Auth helpers + middleware
- Don't lift state higher than needed

## TypeScript rules
- Define types in /types before using them
- No `any` — use `unknown` and narrow it
- Supabase generated types go in /types/supabase.ts (run: npx supabase gen types)
