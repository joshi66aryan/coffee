# CLAUDE.md

## Commands

`npm run dev` | `build` | `lint` | `test` | `test:e2e`

## Stack

Next.js 16 App Router · Supabase (Postgres + phone OTP + storage) · Tailwind + shadcn/ui · hand-rolled PWA (`public/sw.js` + `app/manifest.ts`, no next-pwa/Workbox — incompatible with this repo's Turbopack build) · @react-pdf/renderer · Vitest + RTL · Playwright

## Structure

app/(cafe)/ # café routes
app/admin/ # admin routes
app/login/
lib/supabase/ # browser + server clients
lib/types.ts # shared types
components/{ui,cafe,admin}/
tests/ # mirrors source
e2e/
supabase/migrations/

## Auth

Phone OTP via Supabase. Roles: `cafe_manager` | `admin`.  
Always call `supabase.auth.getUser()` + check role on every API route and Server Action.  
Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client. RLS is the primary defense.

## Coding standards

- TypeScript strict mode — no `any`; use `unknown` and narrow
- Shared types in `lib/types.ts`; co-locate component-local types
- Server Components by default; `"use client"` only when needed
- One component per file, filename matches export (PascalCase)
- Files/folders: kebab-case · DB columns/tables: snake_case · Constants: SCREAMING_SNAKE_CASE
- No inline styles — Tailwind only
- No business logic in UI components — extract to `lib/`
- No `console.log` in committed code
- Use `next/image` and `next/link`
- Validate all inputs with Zod on the server
- Use logging (proper logger) in all backend logic and Server Actions — never silent failures

## Data fetching & security

- Fetch on the server whenever possible
- Scope every query to the authenticated café’s `cafe_id`
- Never trust client data — re-validate on server
- Always check the `error` object returned from Supabase queries
- Tight RLS policies (default deny)

## Workflow

1. Implement the feature
2. Write the test case(s)
3. Run and verify one by one (unit → component → e2e)

## Testing

Every feature ships with:

1. Unit test — pure logic
2. Component test — RTL (what the user sees and does)
3. E2E test — Playwright happy path for critical flows

Locations: `__tests__/` (mirrors source), `e2e/`  
Test behavior, not implementation. Mock Supabase at the network boundary.  
Each test must be independent.

## Do / Don’t

**Do**: simplest code that works · Server Components first · Zod on every boundary · proper logging in backend · tests before marking done  
**Don’t**: `any` · business logic in components · service-role key on client · skip Supabase error checks · `useEffect` for data fetching · hardcode values that belong in config/DB
