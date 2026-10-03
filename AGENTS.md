<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# MHS (Move Hard Sports)

A marketplace connecting athletes and brands.

## Status

Update this section in every PR that changes it.

- Done: Next.js scaffold, Claude Code setup (skills, hooks, `code-reviewer` agent).
- Next: local Supabase (CLI, migrations, client), then Playwright and CI.
- Not set up yet: Supabase client and CLI, Playwright. If a task needs one of them, set it up first as its own step.
- The app is being rewritten from scratch: don't look for or recreate code from older branches.

## Product

- **Brands** publish **campaigns**: looking for athletes to work with, event or competition sign-ups, brand ambassadorships.
- **Athletes** browse campaigns in one place and **apply**.
- The brand reviews **applications**; accepting one starts a **collaboration**. Brands can also invite athletes from the **athlete catalogue** (filterable by sport) instead of searching the web.
- Campaigns and profiles are public. Applying, inviting and contact details need an account.
- One role per account (`athlete` or `brand`), chosen at sign-up. Guests can only browse. No admin role yet.
- Out of scope for now: payments and invoicing (settled outside the platform), in-app chat (an accepted collaboration reveals contact details instead).

Access rules (enforce them with RLS, not only in the UI):

- A brand sees and manages only its own campaigns and the applications to them.
- An athlete sees only their own applications and invitations.
- Contact details are visible only to the two sides of a `collaboration`.
- Public pages show campaigns and profiles without contact details.

Glossary, used as-is in code, tables and URLs: `athlete`, `brand`, `campaign` (types: `sponsorship`, `event`, `ambassador`), `application`, `collaboration`.

## Stack and sources of truth

Next.js 16 App Router, React 19, TypeScript (strict), Tailwind CSS 4, Supabase (auth + Postgres), Playwright for e2e.

Don't rely on training data for Next.js or Supabase: both change fast.

- **Next.js**: read the guide in `node_modules/next/dist/docs/` (matches the installed version) or use the `next-devtools` MCP before writing Next code.
- **Supabase**: load the `supabase` skill for any Supabase task and `supabase-postgres-best-practices` before any SQL, RLS or auth work. Prefer the Supabase MCP `search_docs` tool for doc lookups.
- If the docs and your memory disagree, the docs win; mention the difference.

## Commands

- `npm run dev`: dev server on http://localhost:3000
- `npm run lint`, `npm run typecheck`: run both before calling work done

The pre-commit hook (Husky) runs Prettier on staged files and `npm run typecheck`. A Claude Code hook runs ESLint on every file you edit.

## Workflow

- Work in small steps. Finish and verify one step, then wait for the user's go-ahead before the next.
- One branch and one pull request per step: `feat/*` or `chore/*`, branched from `dev_1`, PR into `dev_1`.
- Commit messages and code comments in English. UI text in English only (no i18n for now).
- Don't commit, push or open PRs unless asked. Destructive git commands (`push`, `reset --hard`, `clean -f`, `branch -D`, `checkout .`, `restore .`) are blocked by a hook: leave them to the user.
- Before opening a PR, run the `code-reviewer` agent on the branch.

## Code conventions

- Pages and layouts are Server Components; add `"use client"` only to the components that need it.
- Mutations go through Server Actions (`<form action={...}>` with `useActionState`) and validate on the server. Never submit forms client-side only: a form submitted before hydration must not leak data into the URL.
- Components live in `src/components/<area>/`, shared helpers in `src/lib/`. Import with the `@/` alias.
- New user-facing pages and forms get a Playwright e2e test.

## Supabase

- Develop against local Supabase (Docker, via the Supabase CLI). The hosted project (`pusytwxvocgklcgpnsqq`) only gets finished, reviewed changes. Ask before applying anything to it.
- Schema changes go through migrations in `supabase/migrations/` (`npx supabase migration new <name>`), never ad hoc.
- Every table in an exposed schema gets RLS, policies scoped with `(select auth.uid())`, and explicit grants: new tables aren't exposed to the Data API by default.
- Server code checks the user with `getClaims()`, never `getSession()`.
- Store the account role where users can't change it (`app_metadata` or a table guarded by RLS), never in `user_metadata`: users can edit it.
- Only the publishable key goes in `NEXT_PUBLIC_*`. Never put the secret or service-role key in app code.
