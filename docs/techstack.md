# Tech Stack

## Frontend
- Next.js 14 (App Router)
- TypeScript (strict mode)
- Tailwind CSS — all styling, no custom CSS files
- Lucide React — icons only

## Backend / Database
- Supabase — database, auth, storage
- Supabase Auth — email/password to start
- Supabase Realtime — only if the feature needs it

## Key decisions
- No Redux or Zustand unless state gets genuinely complex. Start with useState + context.
- No ORM. Use Supabase client directly.
- No component library (shadcn/ui is fine if needed, but don't install it preemptively).
- Fetch data in Server Components where possible. Use client components only when you need interactivity.
- Keep API routes thin. Logic goes in /lib functions.

## Folder structure
src/
  app/          → Next.js pages and layouts
  components/   → shared UI components
  lib/          → helper functions, Supabase client, utilities
  types/        → TypeScript interfaces and types
