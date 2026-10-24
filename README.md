# MHS — Move Hard Sports

A marketplace connecting athletes and brands: brands publish campaigns, athletes browse them and
apply. Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Supabase (auth and
Postgres), Playwright.

Project rules, status and conventions live in [AGENTS.md](AGENTS.md).

## Development

```bash
npm install
npx supabase start   # local Supabase in Docker (Studio http://127.0.0.1:54323)
npm run dev          # http://localhost:3000
```

`.env.local` needs the local Supabase URL and publishable key: `npx supabase status -o env`.

| Script                 | What it does                                                 |
| ---------------------- | ------------------------------------------------------------ |
| `npm run lint`         | ESLint                                                       |
| `npm run typecheck`    | Generates Next route types, then runs `tsc`                  |
| `npm run format:check` | Prettier check of the whole tree (`npm run format` fixes it) |
| `npm run test:e2e`     | Builds the app and runs Playwright on desktop and mobile     |
| `npm run db:types`     | Regenerates the database types from local Supabase           |

CI runs lint, the formatting check, typecheck and the e2e tests (against local Supabase) on
pull requests and on pushes to `dev` and `main`.

The pre-commit hook (Husky) formats staged files with Prettier and runs `npm run typecheck`. The
Claude Code hooks in `.claude/hooks/` need [`jq`](https://jqlang.org) (`brew install jq`):
without it the git guardrail silently allows everything.

## Structure

```
src/
├── app/
│   ├── (auth)/          sign-in, sign-up, email confirmation (URLs have no prefix)
│   ├── onboarding/      athlete, brand
│   ├── dashboard/       the dashboard; a brand's campaigns (new, edit)
│   ├── campaigns/       public campaign list and campaign page
│   ├── error.tsx        error page
│   └── not-found.tsx    404 page
├── components/
│   ├── header/          Header, menus, navigation links
│   ├── auth/            sign-in and sign-up forms
│   ├── onboarding/      onboarding forms
│   ├── campaigns/       campaign form and lists
│   ├── forms/           Field, SubmitButton, TagPicker
│   └── ui/              PageMain, PageTitle, shared styles
├── lib/
│   ├── auth/            session helpers, sign-out
│   ├── supabase/        server and proxy clients, database types
│   ├── onboarding/      birth year rules
│   └── *.ts             account types, sports, campaign types, validation, shared types
└── proxy.ts             refreshes the Supabase session
supabase/                migrations, config, email templates
e2e/                     Playwright tests and shared helpers
```
