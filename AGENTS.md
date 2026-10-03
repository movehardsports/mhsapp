<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project rules

MHS (Move Hard Sports): Next.js 16 App Router, React 19, Tailwind CSS 4, Supabase (auth + Postgres), Playwright e2e.

## Commands

- `npm run dev`: dev server on http://localhost:3000
- `npm run lint`, `npm run typecheck`: run both before calling work done
- `npm run test:e2e`: builds the app and runs Playwright (desktop + mobile, Chromium + WebKit)
- `npx supabase start` / `npx supabase stop`: local Supabase in Docker (Studio http://127.0.0.1:54323, mail catcher http://127.0.0.1:54324)
- `npx supabase status -o env`: local URLs and keys

CI (`.github/workflows/ci.yml`) runs lint, typecheck and e2e on pull requests and on pushes to `dev` and `main`.

## Workflow

- Work in small steps. Finish and verify one step, then wait for the user's go-ahead before the next.
- One branch and one pull request per step: `feat/*` or `chore/*`, branched from `dev`, PR into `dev`.
- Commit messages and code comments in English.
- Don't commit, push or open PRs unless asked.

## Supabase

- Develop against local Supabase; `.env.local` points there. The hosted project (`pusytwxvocgklcgpnsqq`) only gets finished, reviewed changes.
- Load the `supabase` skill for any Supabase task and `supabase-postgres-best-practices` before writing SQL.
- Schema changes go through migrations in `supabase/migrations/` (`npx supabase migration new <name>`), never ad hoc on the hosted project. Ask before applying anything to the hosted project.
- Every table in an exposed schema gets RLS, policies scoped with `(select auth.uid())`, and explicit grants: new tables aren't exposed to the Data API by default.
- Server code checks the user with `getClaims()`, never `getSession()`.
- Only the publishable key goes in `NEXT_PUBLIC_*`. Never put the secret or service-role key in app code.
