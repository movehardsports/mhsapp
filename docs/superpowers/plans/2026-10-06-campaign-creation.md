# Campaign Creation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A brand that has finished onboarding creates campaigns from `/dashboard` and sees the list of its own campaigns there.

**Architecture:** A `campaigns` table (RLS: public read, brands insert their own rows) in a new migration. A Server Action on `/dashboard/campaigns/new` validates the form and inserts the row with supabase-js; `/dashboard` lists the brand's campaigns. Access is checked on the server by a new `requireOnboardedBrand` helper.

**Tech Stack:** Next.js 16 App Router (Server Components, Server Actions, `useActionState`), React 19, TypeScript strict, Tailwind 4, Supabase (Postgres + RLS, `@supabase/ssr`), Playwright e2e.

**Spec:** `docs/superpowers/specs/2026-10-06-campaign-creation-design.md`

## Global Constraints

- Branch `feat/campaigns` (already created from `dev`, spec committed). One PR into `dev` at the end. Don't push or open the PR: the user does that.
- Code, comments, commit messages and UI text in English. Commit messages end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Local Supabase only. Never touch the hosted project `pusytwxvocgklcgpnsqq`. Apply the migration with `npx supabase migration up` (keeps local users), **not** `npx supabase db reset`.
- Every exposed table: RLS on, policies scoped with `(select auth.uid())`, explicit grants after `revoke all`.
- Server code checks the user with `getClaims()` (via the helpers in `src/lib/auth/session.ts`), never `getSession()`.
- Mutations through Server Actions with `useActionState`, validated on the server.
- Field limits: title ≤ 100 characters (single line), description 1–5000 characters (multi-line), sports 1–16, deadline optional and not before today (UTC date).
- Campaign types: `sponsorship`, `event`, `ambassador` (labels Sponsorship, Event, Ambassador).
- Before finishing: `npm run lint`, `npm run typecheck`, `npm run test:e2e` all pass; local Supabase must be running (`npx supabase start`).
- Load the `supabase` and `supabase-postgres-best-practices` skills before writing the SQL (AGENTS.md).

## Review Focus

1. **Description with Windows line endings or surrounding blank lines** — a textarea submits `\r\n`; the saved description must keep the inner line breaks, drop surrounding whitespace, and never trip the database check. Pinned in Task 3 (multi-line description test).
2. **Deadline exactly today** — must be accepted (the `min` attribute and the server use the same UTC date). Pinned in Task 3.
3. **Double submit** — `SubmitButton` disables itself while pending; no extra test (existing component behaviour).
4. **A brand posting the form for another brand's id** — `brand_id` never comes from the form, always from the token; the RLS test in Task 1 pins the database side.
5. **Many campaigns on the dashboard** — newest first; pinned in Task 4 (two campaigns, order checked).

---

## File Structure

| File                                                            | Responsibility                                                                                                 |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `supabase/migrations/<timestamp>_create_campaigns.sql` (create) | `campaign_type` enum, `campaigns` table, indexes, grants, RLS                                                  |
| `src/lib/supabase/database.types.ts` (regenerate)               | generated types                                                                                                |
| `src/lib/campaignTypes.ts` (create)                             | campaign type ids, labels, `isCampaignType`, enum drift check                                                  |
| `src/lib/sports.ts` (modify)                                    | add `sportLabels` for showing sports in lists                                                                  |
| `src/lib/validation.ts` (create)                                | shared form parsing: `cleanText`, `parseSports` (moved), `cleanMultilineText`, `todayIsoDate`, `parseDeadline` |
| `src/lib/onboarding/validation.ts` (modify)                     | keeps only onboarding helpers (`MIN_AGE`, `birthYearRange`, `parseBirthYear`)                                  |
| `src/lib/auth/session.ts` (modify)                              | add `requireOnboardedBrand`                                                                                    |
| `src/app/dashboard/campaigns/new/page.tsx` (create)             | "New campaign" page                                                                                            |
| `src/app/dashboard/campaigns/new/actions.ts` (create)           | `createCampaign` Server Action                                                                                 |
| `src/components/campaigns/CampaignForm.tsx` (create)            | the form (client)                                                                                              |
| `src/components/campaigns/CampaignList.tsx` (create)            | the brand's campaign list (server)                                                                             |
| `src/app/dashboard/page.tsx` (modify)                           | brand: campaigns section + "New campaign" link                                                                 |
| `e2e/supabase.ts` (create)                                      | Data API helpers for tests: session from cookies, REST calls                                                   |
| `e2e/session.spec.ts` (modify)                                  | import `readSession` from `e2e/supabase.ts`                                                                    |
| `e2e/campaigns-rls.spec.ts` (create)                            | RLS through the Data API                                                                                       |
| `e2e/campaigns.spec.ts` (create)                                | pages and form                                                                                                 |
| `playwright.config.ts` (modify)                                 | register the two specs                                                                                         |
| `AGENTS.md` (modify)                                            | Status                                                                                                         |

---

### Task 1: Database table, types and RLS tests

**Files:**

- Create: `e2e/supabase.ts`, `e2e/campaigns-rls.spec.ts`, `supabase/migrations/<timestamp>_create_campaigns.sql`, `src/lib/campaignTypes.ts`
- Modify: `e2e/session.spec.ts` (use the shared `readSession`), `playwright.config.ts`, `src/lib/supabase/database.types.ts` (regenerated)

**Interfaces:**

- Consumes: `signUp`, `completeBrandOnboarding` from `e2e/auth.ts`.
- Produces:
  - `e2e/supabase.ts`: `readSession(context: BrowserContext): Promise<{ session: any; chunks: Cookie[] }>`, `accessToken(context: BrowserContext): Promise<string>`, `rest(path: string, init?: { method?: string; token?: string; body?: unknown }): Promise<Response>`, `userId(context: BrowserContext): Promise<string>`.
  - `src/lib/campaignTypes.ts`: `campaignTypes` (readonly tuple), `type CampaignType`, `campaignTypeLabels: Record<CampaignType, string>`, `isCampaignType(value: unknown): value is CampaignType`.
  - Table `public.campaigns` (columns as in the spec) and enum `public.campaign_type`.

- [ ] **Step 1: Extract the session helpers into `e2e/supabase.ts`**

Move `isSessionCookie` and `readSession` from `e2e/session.spec.ts` into the new file (export `readSession`), and add the REST helpers. Playwright doesn't load `.env.local`, so load it with Next's own loader:

```ts
import { loadEnvConfig } from "@next/env";
import { type BrowserContext, expect } from "@playwright/test";

// The tests talk to local Supabase with the same URL and publishable key as the app.
loadEnvConfig(process.cwd());
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

// The Supabase session cookie: `sb-<ref>-auth-token`, split into `.0`, `.1`, … chunks when
// long, holding "base64-" plus the base64url-encoded session JSON.
export const isSessionCookie = (name: string) => /^sb-.+-auth-token(\.\d+)?$/.test(name);

export async function readSession(context: BrowserContext) {
  const chunks = (await context.cookies())
    .filter((cookie) => isSessionCookie(cookie.name))
    .sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true }));
  expect(chunks.length, "session cookie").toBeGreaterThan(0);
  const raw = chunks.map((cookie) => cookie.value).join("");
  const session = JSON.parse(Buffer.from(raw.replace(/^base64-/, ""), "base64url").toString());
  return { session, chunks };
}

export async function accessToken(context: BrowserContext) {
  return (await readSession(context)).session.access_token as string;
}

export async function userId(context: BrowserContext) {
  return (await readSession(context)).session.user.id as string;
}

// A Data API (PostgREST) request as a guest, or as the user whose access token is given.
export function rest(
  path: string,
  { method = "GET", token, body }: { method?: string; token?: string; body?: unknown } = {}
) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: PUBLISHABLE_KEY,
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(body !== undefined && { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
```

In `e2e/session.spec.ts` delete the moved code and add `import { isSessionCookie, readSession } from "./supabase";` (`expireSession` still uses both). Check `@next/env` resolves: `node -e "require('@next/env')"` (it ships with `next`).

- [ ] **Step 2: Write the failing RLS spec `e2e/campaigns-rls.spec.ts`**

```ts
import { expect, test } from "@playwright/test";
import { completeBrandOnboarding, signUp } from "./auth";
import { accessToken, rest, userId } from "./supabase";

const campaign = (brandId: string) => ({
  brand_id: brandId,
  type: "event",
  title: "Spring Hyrox Open",
  description: "Line one\nLine two",
  sports: ["hyrox"],
});

test("a brand creates its own campaign, and guests can read it", async ({ page }, testInfo) => {
  await signUp(page, testInfo, { accountType: "Brand" });
  await completeBrandOnboarding(page);
  const id = await userId(page.context());

  const created = await rest("campaigns", {
    method: "POST",
    token: await accessToken(page.context()),
    body: campaign(id),
  });
  expect(created.status).toBe(201);

  const read = await rest(`campaigns?brand_id=eq.${id}&select=title,type,sports,deadline`);
  expect(await read.json()).toEqual([
    { title: "Spring Hyrox Open", type: "event", sports: ["hyrox"], deadline: null },
  ]);
});

test("a brand can't create a campaign for another brand", async ({ browser }, testInfo) => {
  const first = await browser.newPage();
  await signUp(first, testInfo, { accountType: "Brand" });
  await completeBrandOnboarding(first);
  const victim = await userId(first.context());

  const second = await browser.newPage();
  await signUp(second, testInfo, { accountType: "Brand" });
  await completeBrandOnboarding(second);

  const response = await rest("campaigns", {
    method: "POST",
    token: await accessToken(second.context()),
    body: campaign(victim),
  });
  expect(response.status).toBe(403);
});

test("an athlete can't create a campaign", async ({ page }, testInfo) => {
  await signUp(page, testInfo, { accountType: "Athlete" });
  const response = await rest("campaigns", {
    method: "POST",
    token: await accessToken(page.context()),
    body: campaign(await userId(page.context())),
  });
  // No brands row with the athlete's id, so the foreign key rejects it (409).
  expect(response.ok).toBe(false);
});

test("guests can't create campaigns", async ({ page }, testInfo) => {
  await signUp(page, testInfo, { accountType: "Brand" });
  await completeBrandOnboarding(page);
  const response = await rest("campaigns", {
    method: "POST",
    body: campaign(await userId(page.context())),
  });
  expect(response.status).toBe(401);
});

test("the database rejects a blank or padded description", async ({ page }, testInfo) => {
  await signUp(page, testInfo, { accountType: "Brand" });
  await completeBrandOnboarding(page);
  const id = await userId(page.context());
  const token = await accessToken(page.context());

  for (const description of ["   ", "\nPadded\n"]) {
    const response = await rest("campaigns", {
      method: "POST",
      token,
      body: { ...campaign(id), description },
    });
    expect(response.status, JSON.stringify(description)).toBe(400);
  }
});
```

Register it in `playwright.config.ts` only for `desktop-chrome` (the browser doesn't matter for API calls): add `"campaigns-rls.spec.ts"` to that project's `testMatch`.

- [ ] **Step 3: Run it to see it fail**

Run: `npx playwright test e2e/campaigns-rls.spec.ts e2e/session.spec.ts`
Expected: the campaigns tests FAIL (404 / `relation "public.campaigns" does not exist`); `session.spec.ts` still PASSES (proves the helper move).

- [ ] **Step 4: Write the migration**

Load the `supabase` and `supabase-postgres-best-practices` skills first. Run `npx supabase migration new create_campaigns` and fill the created file:

```sql
-- Campaigns that brands publish: sponsorships, event sign-ups and ambassadorships.
-- Everything in campaigns is public, guests included; contact details never live here.
-- Brands only create campaigns for now; editing, closing and deleting come later.

create type public.campaign_type as enum ('sponsorship', 'event', 'ambassador');

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  -- Only a brand that finished onboarding (has a brands row) can own campaigns, and brands
  -- rows only exist on brand accounts.
  brand_id uuid not null references public.brands (id) on delete cascade,
  type public.campaign_type not null,
  title public.trimmed_text not null check (char_length(title) <= 100),
  -- Multi-line, so not trimmed_text (which forbids newlines). The app trims it and normalises
  -- line endings; this stops blank or padded values written any other way.
  description text not null
    check (
      char_length(description) <= 5000
      and description ~ '\S'
      and description = btrim(description, E' \t\n\r')
    ),
  sports public.sport[] not null
    check (cardinality(sports) between 1 and 16 and array_position(sports, null) is null),
  -- Optional last day to apply. "Not in the past" depends on today's date, so the app checks it.
  deadline date,
  created_at timestamptz not null default now()
);

-- The dashboard lists a brand's campaigns newest first; this also covers the foreign key.
create index campaigns_brand_id_created_at_idx on public.campaigns (brand_id, created_at desc);
-- The campaign list for athletes will filter by sport (`sports && array[...]`).
create index campaigns_sports_idx on public.campaigns using gin (sports);

alter table public.campaigns enable row level security;

revoke all on table public.campaigns from anon, authenticated;
grant select on table public.campaigns to anon, authenticated;
grant insert (brand_id, type, title, description, sports, deadline)
  on table public.campaigns to authenticated;

create policy "Anyone can read campaigns"
  on public.campaigns for select to anon, authenticated
  using (true);

create policy "Brands can create their own campaigns"
  on public.campaigns for insert to authenticated
  with check ((select auth.uid()) = brand_id);
```

- [ ] **Step 5: Apply it and regenerate the types**

Run: `npx supabase migration up && npm run db:types`
Expected: migration applied; `database.types.ts` now has `campaigns` and `campaign_type`.

- [ ] **Step 6: Add `src/lib/campaignTypes.ts`**

```ts
import type { Database } from "@/lib/supabase/database.types";

export const campaignTypes = ["sponsorship", "event", "ambassador"] as const;

export type CampaignType = (typeof campaignTypes)[number];

export const campaignTypeLabels: Record<CampaignType, string> = {
  sponsorship: "Sponsorship",
  event: "Event",
  ambassador: "Ambassador",
};

export function isCampaignType(value: unknown): value is CampaignType {
  return campaignTypes.includes(value as CampaignType);
}

// The database stores the type as the `campaign_type` enum (supabase/migrations). This fails
// typecheck when the two lists drift apart; regenerate the types with `npm run db:types`.
type DatabaseCampaignType = Database["public"]["Enums"]["campaign_type"];
type Assert<T extends true> = T;
export type CampaignTypesMatchDatabase = Assert<
  [CampaignType] extends [DatabaseCampaignType]
    ? [DatabaseCampaignType] extends [CampaignType]
      ? true
      : false
    : false
>;
```

- [ ] **Step 7: Run the tests and checks**

Run: `npx playwright test e2e/campaigns-rls.spec.ts e2e/session.spec.ts && npm run lint && npm run typecheck`
Expected: all PASS. If the "another brand" test gets 401 instead of 403, check the token is the second page's.

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations src/lib/supabase/database.types.ts src/lib/campaignTypes.ts e2e/supabase.ts e2e/session.spec.ts e2e/campaigns-rls.spec.ts playwright.config.ts
git commit -m "Add the campaigns table with public read and brand-only insert

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Shared form validation

**Files:**

- Create: `src/lib/validation.ts`
- Modify: `src/lib/onboarding/validation.ts`, `src/app/onboarding/brand/actions.ts`, `src/app/onboarding/athlete/actions.ts`

**Interfaces:**

- Produces (in `src/lib/validation.ts`):
  - `cleanText(value: FormDataEntryValue | null, maxLength: number): string | null` (moved, unchanged)
  - `parseSports(values: FormDataEntryValue[]): Sport[] | null` (moved, unchanged)
  - `cleanMultilineText(value: FormDataEntryValue | null, maxLength: number): string | null` — `\r\n`/`\r` → `\n`, trimmed; null when not a string, blank or longer than `maxLength`.
  - `todayIsoDate(now?: Date): string` — UTC date as `YYYY-MM-DD`.
  - `parseDeadline(value: FormDataEntryValue | null, today: string): { ok: true; deadline: string | null } | { ok: false }` — empty → `{ ok: true, deadline: null }`; a real calendar date `>= today` → the date; anything else → `{ ok: false }`.

There's no unit-test runner in this repo; the onboarding e2e tests cover the moved code, and Task 3's e2e tests cover the new helpers.

- [ ] **Step 1: Create `src/lib/validation.ts`**

```ts
import { isSport, type Sport } from "@/lib/sports";

// Mirrors the database's trimmed_text domain: one line, no surrounding whitespace, not blank.
// Line and paragraph separators count as control characters too: some Postgres locales treat
// them that way.
// Returns the trimmed value, or null when it's blank, too long or spans several lines.
export function cleanText(value: FormDataEntryValue | null, maxLength: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed === "" || trimmed.length > maxLength || /[\p{Cc}  ]/u.test(trimmed)) {
    return null;
  }
  return trimmed;
}

// Multi-line text from a textarea: line endings become "\n" (browsers submit "\r\n") and the
// surrounding whitespace is trimmed. Null when it's blank or too long.
export function cleanMultilineText(value: FormDataEntryValue | null, maxLength: number) {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/\r\n?/g, "\n").trim();
  if (cleaned === "" || cleaned.length > maxLength) return null;
  return cleaned;
}

// The picked sports, de-duplicated, keeping only known ones. Null when none are left.
export function parseSports(values: FormDataEntryValue[]) {
  const sports = [...new Set(values)].filter(isSport) as Sport[];
  return sports.length > 0 ? sports : null;
}

// Today's date as YYYY-MM-DD, in UTC, the same on the server and in the form's `min`.
export function todayIsoDate(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

// An optional date input: empty means no deadline; otherwise a real date, not before today.
export function parseDeadline(
  value: FormDataEntryValue | null,
  today: string
): { ok: true; deadline: string | null } | { ok: false } {
  if (value === null || value === "") return { ok: true, deadline: null };
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return { ok: false };
  // Rejects dates like 2026-02-30, which Date would roll over into March.
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    return { ok: false };
  }
  return value >= today ? { ok: true, deadline: value } : { ok: false };
}
```

- [ ] **Step 2: Trim `src/lib/onboarding/validation.ts`**

Delete `cleanText`, `parseSports`, the comment above `cleanText` and the `isSport` import; keep `MIN_AGE`, `MAX_AGE`, `birthYearRange`, `parseBirthYear`.

- [ ] **Step 3: Update the imports**

In `src/app/onboarding/brand/actions.ts`: `import { cleanText, parseSports } from "@/lib/validation";`.
In `src/app/onboarding/athlete/actions.ts`: import `cleanText` and `parseSports` from `@/lib/validation`, keep `parseBirthYear` (and anything else onboarding-only) from `@/lib/onboarding/validation`. Find every use with `grep -rn "onboarding/validation" src`.

- [ ] **Step 4: Check nothing changed in behaviour**

Run: `npm run lint && npm run typecheck && npx playwright test e2e/onboarding.spec.ts`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/validation.ts src/lib/onboarding/validation.ts src/app/onboarding
git commit -m "Move shared form validation out of onboarding

Adds the multi-line text and deadline parsing that campaigns need.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: New campaign page, form and Server Action

**Files:**

- Modify: `src/lib/auth/session.ts`, `playwright.config.ts`
- Create: `src/app/dashboard/campaigns/new/page.tsx`, `src/app/dashboard/campaigns/new/actions.ts`, `src/components/campaigns/CampaignForm.tsx`, `e2e/campaigns.spec.ts`

**Interfaces:**

- Consumes: `getAccount`, `hasOnboarded` (`src/lib/auth/session.ts`); `cleanText`, `cleanMultilineText`, `parseSports`, `parseDeadline`, `todayIsoDate` (`src/lib/validation.ts`); `campaignTypes`, `campaignTypeLabels`, `isCampaignType` (`src/lib/campaignTypes.ts`); `Field`, `TagPicker`, `SubmitButton`, `checkableTile`, `formError`, `PageTitle`; e2e `signUp`, `completeBrandOnboarding`, `gotoHydrated`, `rest`, `userId`.
- Produces:
  - `requireOnboardedBrand(supabase: Supabase): Promise<{ userId: string }>`
  - `type CampaignValues = { type: string; title: string; description: string; sports: string[]; deadline: string }`
  - `type CampaignFormState = { status: "idle" } | { status: "error"; message: string; values: CampaignValues }`
  - `createCampaign(prevState: CampaignFormState, formData: FormData): Promise<CampaignFormState>`
  - `CampaignForm({ today }: { today: string })`
  - e2e helpers in `e2e/campaigns.spec.ts`: `fillCampaign(page, overrides?)`.

- [ ] **Step 1: Write the failing e2e spec `e2e/campaigns.spec.ts`**

```ts
import { expect, type Page, test } from "@playwright/test";
import { completeBrandOnboarding, signUp } from "./auth";
import { gotoHydrated } from "./hydration";
import { rest, userId } from "./supabase";

const main = (page: Page) => page.getByRole("main");
const alert = (page: Page) => main(page).getByRole("alert");
const submit = (page: Page) => main(page).getByRole("button", { name: "Create campaign" });
const sportsGroup = (page: Page) => page.getByRole("group", { name: "Sports" });

// Removes the browser's own checks, to test the Server Action's.
const skipBrowserValidation = (page: Page) =>
  main(page)
    .locator("form")
    .evaluate((form) => form.setAttribute("novalidate", ""));

// YYYY-MM-DD in UTC, `days` from today; the app uses the UTC date too.
const isoDate = (days = 0) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

async function fillCampaign(
  page: Page,
  {
    type = "Event",
    title = "Spring Hyrox Open",
    description = "Race day in Warsaw.\nBring your crew.",
    sport = "Hyrox",
    deadline = "",
  } = {}
) {
  await main(page).getByText(type, { exact: true }).click();
  await page.getByLabel("Title").fill(title);
  await page.getByLabel("Description").fill(description);
  await sportsGroup(page).getByText(sport, { exact: true }).click();
  if (deadline) await page.getByLabel("Deadline").fill(deadline);
}

async function campaignsOf(page: Page) {
  const response = await rest(
    `campaigns?brand_id=eq.${await userId(page.context())}&select=type,title,description,sports,deadline&order=created_at.desc`
  );
  return response.json();
}

test.describe("access", () => {
  test("guests are sent to sign in", async ({ page }) => {
    await page.goto("/dashboard/campaigns/new");
    await expect(page).toHaveURL("/sign-in");
  });

  test("athletes are sent away", async ({ page }, testInfo) => {
    await signUp(page, testInfo, { accountType: "Athlete" });
    await page.goto("/dashboard/campaigns/new");
    // To the dashboard, which sends an athlete without a profile on to their onboarding.
    await expect(page).toHaveURL("/onboarding/athlete");
  });

  test("brands without a profile finish the onboarding first", async ({ page }, testInfo) => {
    await signUp(page, testInfo, { accountType: "Brand" });
    await page.goto("/dashboard/campaigns/new");
    await expect(page).toHaveURL("/onboarding/brand");
  });
});

test.describe("form", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await signUp(page, testInfo, { accountType: "Brand" });
    await completeBrandOnboarding(page);
    await gotoHydrated(page, "/dashboard/campaigns/new");
  });

  test("shows the campaign fields", async ({ page }) => {
    await expect(page).toHaveTitle("New campaign | MHS");
    await expect(main(page).getByRole("heading", { name: "New campaign" })).toBeVisible();
    for (const type of ["Sponsorship", "Event", "Ambassador"]) {
      await expect(main(page).getByText(type, { exact: true })).toBeVisible();
    }
    await expect(page.getByLabel("Deadline")).toHaveAttribute("min", isoDate());
  });

  test("creates a campaign and goes back to the dashboard", async ({ page }) => {
    await fillCampaign(page, { deadline: isoDate(30) });
    await submit(page).click();
    await expect(page).toHaveURL("/dashboard");
    expect(await campaignsOf(page)).toEqual([
      {
        type: "event",
        title: "Spring Hyrox Open",
        description: "Race day in Warsaw.\nBring your crew.",
        sports: ["hyrox"],
        deadline: isoDate(30),
      },
    ]);
  });

  test("keeps inner line breaks and trims the description", async ({ page }) => {
    await fillCampaign(page, { description: "\n\n  First line\r\n\r\nSecond line  \n" });
    await submit(page).click();
    await expect(page).toHaveURL("/dashboard");
    const [campaign] = await campaignsOf(page);
    expect(campaign.description).toBe("First line\n\nSecond line");
  });

  test("accepts today as the deadline", async ({ page }) => {
    await fillCampaign(page, { deadline: isoDate() });
    await submit(page).click();
    await expect(page).toHaveURL("/dashboard");
  });

  test("rejects a blank description on the server, keeping the values", async ({ page }) => {
    await fillCampaign(page, { description: "   " });
    await skipBrowserValidation(page);
    await submit(page).click();
    await expect(alert(page)).toHaveText("Enter a description (up to 5000 characters).");
    await expect(page).toHaveURL("/dashboard/campaigns/new");
    await expect(page.getByLabel("Title")).toHaveValue("Spring Hyrox Open");
    await expect(main(page).getByLabel("Event")).toBeChecked();
    await expect(sportsGroup(page).getByLabel("Hyrox")).toBeChecked();
  });

  test("rejects a deadline in the past on the server", async ({ page }) => {
    await fillCampaign(page, { deadline: isoDate(-1) });
    await skipBrowserValidation(page);
    await submit(page).click();
    await expect(alert(page)).toHaveText("Pick a deadline from today on, or leave it empty.");
    expect(await campaignsOf(page)).toEqual([]);
  });

  test("checks the type and sports on the server too", async ({ page }) => {
    await page.getByLabel("Title").fill("No type");
    await page.getByLabel("Description").fill("Text");
    await skipBrowserValidation(page);
    await submit(page).click();
    await expect(alert(page)).toHaveText("Choose a campaign type.");

    await main(page).getByText("Event", { exact: true }).click();
    await submit(page).click();
    await expect(alert(page)).toHaveText("Choose at least one sport.");
  });
});
```

Register `"campaigns.spec.ts"` in all four projects in `playwright.config.ts` (desktop-chrome, desktop-safari, mobile-chrome, mobile-safari).

- [ ] **Step 2: Run it to see it fail**

Run: `npx playwright test e2e/campaigns.spec.ts --project=desktop-chrome`
Expected: FAIL — `/dashboard/campaigns/new` is a 404, so every test fails, the guest one included (a 404 stays on its URL).

- [ ] **Step 3: Add `requireOnboardedBrand` to `src/lib/auth/session.ts`**

Append:

```ts
// For brand-only pages and their actions after onboarding: guests go to sign in, athletes to
// their dashboard, and brands without a profile to the onboarding.
export async function requireOnboardedBrand(supabase: Supabase) {
  const account = await getAccount(supabase);
  if (!account) redirect("/sign-in");
  if (account.accountType !== "brand") redirect("/dashboard");
  if (!(await hasOnboarded(supabase, account))) redirect(onboardingPath("brand"));
  return { userId: account.userId };
}
```

(`hasOnboarded` is declared below `requireAccount` in the same module; function declarations are hoisted, so the order doesn't matter.)

- [ ] **Step 4: Write the Server Action `src/app/dashboard/campaigns/new/actions.ts`**

```ts
"use server";

import { redirect } from "next/navigation";
import { requireOnboardedBrand } from "@/lib/auth/session";
import { isCampaignType } from "@/lib/campaignTypes";
import { createClient } from "@/lib/supabase/server";
import {
  cleanMultilineText,
  cleanText,
  parseDeadline,
  parseSports,
  todayIsoDate,
} from "@/lib/validation";

export type CampaignValues = {
  type: string;
  title: string;
  description: string;
  sports: string[];
  deadline: string;
};

export type CampaignFormState =
  | { status: "idle" }
  // Echo back what the user typed so the form keeps it after an error.
  | { status: "error"; message: string; values: CampaignValues };

export async function createCampaign(
  _prevState: CampaignFormState,
  formData: FormData
): Promise<CampaignFormState> {
  const supabase = await createClient();
  // The page checks this too, but the action can be posted to directly.
  const { userId } = await requireOnboardedBrand(supabase);

  const values: CampaignValues = {
    type: String(formData.get("type") ?? ""),
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    sports: formData.getAll("sports").map(String),
    deadline: String(formData.get("deadline") ?? ""),
  };
  const fail = (message: string): CampaignFormState => ({ status: "error", message, values });

  // The browser checks most of this too, but a form posted before hydration (or by hand)
  // skips that. The database enforces the same rules once more.
  if (!isCampaignType(values.type)) return fail("Choose a campaign type.");
  const title = cleanText(values.title, 100);
  if (!title) return fail("Enter a title (one line, up to 100 characters).");
  const description = cleanMultilineText(values.description, 5000);
  if (!description) return fail("Enter a description (up to 5000 characters).");
  const sports = parseSports(values.sports);
  if (!sports) return fail("Choose at least one sport.");
  const deadline = parseDeadline(values.deadline, todayIsoDate());
  if (!deadline.ok) return fail("Pick a deadline from today on, or leave it empty.");

  // brand_id comes from the verified token, never from the form; RLS checks it again.
  const { error } = await supabase.from("campaigns").insert({
    brand_id: userId,
    type: values.type,
    title,
    description,
    sports,
    deadline: deadline.deadline,
  });
  if (error) {
    console.error("Creating a campaign failed", error.code, error.message);
    return fail("We couldn't create the campaign. Try again.");
  }

  redirect("/dashboard");
}
```

- [ ] **Step 5: Write the form `src/components/campaigns/CampaignForm.tsx`**

```tsx
"use client";

import { useActionState } from "react";
import {
  type CampaignFormState,
  type CampaignValues,
  createCampaign,
} from "@/app/dashboard/campaigns/new/actions";
import Field from "@/components/forms/Field";
import SubmitButton from "@/components/forms/SubmitButton";
import TagPicker from "@/components/forms/TagPicker";
import { checkableTile, formError } from "@/components/ui/styles";
import { campaignTypeLabels, campaignTypes } from "@/lib/campaignTypes";
import { sportGroups } from "@/lib/sports";

const initialState: CampaignFormState = { status: "idle" };
const empty: CampaignValues = { type: "", title: "", description: "", sports: [], deadline: "" };

// `today` (YYYY-MM-DD, UTC) comes from the server, so the deadline's `min` matches its check.
export default function CampaignForm({ today }: { today: string }) {
  const [state, formAction] = useActionState(createCampaign, initialState);
  const values = state.status === "error" ? state.values : empty;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <fieldset>
        <legend className="mb-2 text-sm font-medium">Type</legend>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {campaignTypes.map((type) => (
            <label key={type} className={`${checkableTile} justify-center px-4 py-3 text-sm`}>
              <input
                type="radio"
                name="type"
                value={type}
                required
                defaultChecked={values.type === type}
                className="sr-only"
              />
              {campaignTypeLabels[type]}
            </label>
          ))}
        </div>
      </fieldset>
      <Field id="title" label="Title" required maxLength={100} defaultValue={values.title} />
      <div className="flex flex-col gap-2">
        <label htmlFor="description" className="text-sm font-medium">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          required
          maxLength={5000}
          rows={6}
          defaultValue={values.description}
          className="w-full rounded-button border border-foreground/20 bg-transparent px-3 py-2 transition-colors outline-none focus:border-foreground"
        />
      </div>
      <TagPicker
        name="sports"
        legend="Sports"
        groups={sportGroups}
        requiredMessage="Choose at least one sport."
        defaultValues={values.sports}
      />
      <Field
        id="deadline"
        label="Deadline"
        type="date"
        min={today}
        hint="Optional. The last day to apply."
        defaultValue={values.deadline}
      />

      {state.status === "error" && (
        <p role="alert" className={formError}>
          {state.message}
        </p>
      )}

      <SubmitButton>Create campaign</SubmitButton>
    </form>
  );
}
```

Note: `useActionState` resets the form after the action returns (React 19); the `key` trick isn't needed because `defaultValue`/`defaultChecked` come from `state.values` on the re-render, the same as `BrandOnboardingForm`.

- [ ] **Step 6: Write the page `src/app/dashboard/campaigns/new/page.tsx`**

```tsx
import type { Metadata } from "next";
import CampaignForm from "@/components/campaigns/CampaignForm";
import PageTitle from "@/components/ui/PageTitle";
import { requireOnboardedBrand } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { todayIsoDate } from "@/lib/validation";

export const metadata: Metadata = {
  title: "New campaign",
};

export default async function NewCampaignPage() {
  const supabase = await createClient();
  await requireOnboardedBrand(supabase);

  return (
    <main className="mx-auto w-full max-w-sm px-4 py-16 lg:max-w-xl">
      <PageTitle>New campaign</PageTitle>
      <CampaignForm today={todayIsoDate()} />
    </main>
  );
}
```

- [ ] **Step 7: Run the tests**

Run: `npx playwright test e2e/campaigns.spec.ts`
Expected: all PASS in the four projects. If "athletes are sent away" lands on `/dashboard` instead, check the athlete really has no profile (it doesn't: `signUp` doesn't onboard).

- [ ] **Step 8: Lint, typecheck, commit**

Run: `npm run lint && npm run typecheck`

```bash
git add src/lib/auth/session.ts src/app/dashboard/campaigns src/components/campaigns/CampaignForm.tsx e2e/campaigns.spec.ts playwright.config.ts
git commit -m "Let onboarded brands create campaigns

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Campaign list on the brand's dashboard

**Files:**

- Modify: `src/lib/sports.ts`, `src/app/dashboard/page.tsx`, `e2e/campaigns.spec.ts`, `e2e/dashboard.spec.ts` (only if its "only the Sign out button" test now fails for brands — see Step 1)
- Create: `src/components/campaigns/CampaignList.tsx`

**Interfaces:**

- Consumes: `campaignTypeLabels`, `CampaignType`; `getAccount`, `hasOnboarded`; `fillCampaign`, `submit` from Task 3's spec.
- Produces: `sportLabels: Record<Sport, string>` in `src/lib/sports.ts`; `CampaignList({ campaigns }: { campaigns: CampaignListItem[] })` with `type CampaignListItem = { id: string; type: CampaignType; title: string; sports: Sport[]; deadline: string | null }`.

- [ ] **Step 1: Write the failing tests**

Append to the `form` describe in `e2e/campaigns.spec.ts`:

```ts
test("the dashboard lists the brand's campaigns, newest first", async ({ page }) => {
  await gotoHydrated(page, "/dashboard");
  const campaigns = main(page).getByRole("region", { name: "Campaigns" });
  await expect(campaigns.getByText("No campaigns yet")).toBeVisible();

  await campaigns.getByRole("link", { name: "New campaign" }).click();
  await expect(page).toHaveURL("/dashboard/campaigns/new");
  await fillCampaign(page, { title: "First", deadline: "2099-12-31" });
  await submit(page).click();
  await expect(page).toHaveURL("/dashboard");

  await gotoHydrated(page, "/dashboard/campaigns/new");
  await fillCampaign(page, { title: "Second", type: "Ambassador", sport: "Surf" });
  await submit(page).click();
  await expect(page).toHaveURL("/dashboard");

  const items = campaigns.getByRole("listitem");
  await expect(items).toHaveCount(2);
  await expect(items.nth(0)).toContainText("Second");
  await expect(items.nth(0)).toContainText("Ambassador");
  await expect(items.nth(0)).toContainText("Surf");
  await expect(items.nth(0)).not.toContainText("Apply by");
  await expect(items.nth(1)).toContainText("First");
  await expect(items.nth(1)).toContainText("Event");
  await expect(items.nth(1)).toContainText("Hyrox");
  await expect(items.nth(1)).toContainText("Apply by 31 Dec 2099");
  await expect(campaigns.getByText("No campaigns yet")).toHaveCount(0);
});
```

`e2e/dashboard.spec.ts` "after onboarding, shows only the Sign out button…" uses a **brand** and asserts there are no links in `main`; the new "New campaign" link breaks it. Change that test to sign up an **athlete** instead (the athlete dashboard is unchanged), finishing onboarding through the athlete form. Add to `e2e/auth.ts`:

```ts
// Saves an athlete's onboarding with the minimum it needs, for a user signed in as an athlete.
export async function completeAthleteOnboarding(page: Page) {
  await gotoHydrated(page, "/onboarding/athlete");
  await page.getByLabel("First name").fill("Jane");
  await page.getByLabel("Last name").fill("Doe");
  await page.getByLabel("Nickname").fill("jd");
  await page.getByLabel("Year of birth").selectOption("1998");
  await page.getByLabel("City").fill("Warsaw");
  await page.getByRole("group", { name: "Sports" }).getByText("Hyrox", { exact: true }).click();
  await page.getByRole("main").getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL("/");
}
```

Before writing it, read `fillAthlete` in `e2e/onboarding.spec.ts` and copy its exact labels and how it sets the birth year (select vs. input); adjust the helper to match. Then in `e2e/dashboard.spec.ts` replace `signUp(page, testInfo, { accountType: "Brand" })`, the `/onboarding/brand` assertion and `completeBrandOnboarding` with the athlete versions (`/onboarding/athlete`, `completeAthleteOnboarding`).

- [ ] **Step 2: Run them to see them fail**

Run: `npx playwright test e2e/campaigns.spec.ts e2e/dashboard.spec.ts --project=desktop-chrome`
Expected: the new list test FAILS (no "Campaigns" region); dashboard tests PASS.

- [ ] **Step 3: Add `sportLabels` to `src/lib/sports.ts`**

After `sportIds`:

```ts
export const sportLabels = Object.fromEntries(
  sportGroups.flatMap((group) => group.options.map((option) => [option.id, option.label]))
) as Record<Sport, string>;
```

- [ ] **Step 4: Write `src/components/campaigns/CampaignList.tsx`**

```tsx
import { type CampaignType, campaignTypeLabels } from "@/lib/campaignTypes";
import { type Sport, sportLabels } from "@/lib/sports";

export type CampaignListItem = {
  id: string;
  type: CampaignType;
  title: string;
  sports: Sport[];
  deadline: string | null;
};

// Deadlines are plain dates (YYYY-MM-DD); format them in UTC so the day never shifts.
const formatDeadline = (deadline: string) =>
  new Date(`${deadline}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

export default function CampaignList({ campaigns }: { campaigns: CampaignListItem[] }) {
  if (campaigns.length === 0) {
    return <p className="text-sm text-foreground/70">No campaigns yet</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {campaigns.map((campaign) => (
        <li key={campaign.id} className="rounded-button border border-foreground/15 px-4 py-3">
          <p className="font-medium">{campaign.title}</p>
          <p className="mt-1 text-xs tracking-wide text-foreground/70 uppercase">
            {campaignTypeLabels[campaign.type]} ·{" "}
            {campaign.sports.map((sport) => sportLabels[sport]).join(", ")}
          </p>
          {campaign.deadline && (
            <p className="mt-1 text-sm text-foreground/70">
              Apply by {formatDeadline(campaign.deadline)}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 5: Add the campaigns section to `src/app/dashboard/page.tsx`**

Keep the existing redirects and the sr-only `<h1>`. After the onboarding check, read the campaigns for brands, and render the section above the Sign out form:

```tsx
// imports to add:
import Link from "next/link";
import CampaignList from "@/components/campaigns/CampaignList";
import { primaryButton } from "@/components/ui/styles";

// after the hasOnboarded redirect:
let campaigns = null;
if (account.accountType === "brand") {
  const { data, error } = await supabase
    .from("campaigns")
    .select("id, type, title, sports, deadline")
    .eq("brand_id", account.userId)
    .order("created_at", { ascending: false });
  // An empty list would wrongly tell the brand it has no campaigns.
  if (error) throw new Error(`Reading the campaigns failed: ${error.code}`);
  campaigns = data;
}

// in <main>, after the h1 and before the Sign out <form>:
{
  campaigns && (
    <section aria-labelledby="campaigns-heading" className="mb-8 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <h2 id="campaigns-heading" className="text-lg font-bold tracking-tight">
          Campaigns
        </h2>
        <Link
          href="/dashboard/campaigns/new"
          className={`${primaryButton} px-4 py-2 text-sm tracking-wide uppercase`}
        >
          New campaign
        </Link>
      </div>
      <CampaignList campaigns={campaigns} />
    </section>
  );
}
```

The generated types type `sports` as the `sport` enum array and `type` as `campaign_type`; if TypeScript complains that they don't match `Sport[]`/`CampaignType`, the drift checks in `sports.ts`/`campaignTypes.ts` guarantee they're the same unions — fix the annotation, don't cast.

- [ ] **Step 6: Run the tests**

Run: `npx playwright test e2e/campaigns.spec.ts e2e/dashboard.spec.ts e2e/sign-in.spec.ts`
Expected: all PASS. (`sign-in.spec.ts` signs out from a brand's dashboard: the Sign out button is still in `main`.)

- [ ] **Step 7: Lint, typecheck, commit**

Run: `npm run lint && npm run typecheck`

```bash
git add src/lib/sports.ts src/components/campaigns/CampaignList.tsx src/app/dashboard/page.tsx e2e/campaigns.spec.ts e2e/dashboard.spec.ts e2e/auth.ts
git commit -m "List a brand's campaigns on its dashboard

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Status, full verification, review

**Files:**

- Modify: `AGENTS.md`

- [ ] **Step 1: Update AGENTS.md Status**

Replace the line `- Not set up yet: campaign, application and collaboration tables and pages.` with:

```markdown
- Done (campaigns): `campaigns` table (public read; brands insert their own rows, `brand_id` references `brands`), `campaign_type` enum mirrored by `src/lib/campaignTypes.ts`. Onboarded brands create campaigns on `/dashboard/campaigns/new` (`requireOnboardedBrand` in `src/lib/auth/session.ts`) and see them on `/dashboard`. Shared form parsing lives in `src/lib/validation.ts`.
- Not set up yet: editing, closing and deleting campaigns, the public campaign list and page, application and collaboration tables and pages.
```

And in the `/dashboard` line, change "`/dashboard` has only the Sign out button for now" to "`/dashboard` has the Sign out button (and a brand's campaigns)".

- [ ] **Step 2: Full verification**

Run: `npm run lint && npm run typecheck && npm run test:e2e`
Expected: everything PASSES (two tests skipped, as before). Report the counts.

- [ ] **Step 3: Commit**

```bash
git add AGENTS.md
git commit -m "Update the status for campaign creation

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 4: Review**

Run the `code-reviewer` agent on `dev..feat/campaigns` with the spec path. Fix Critical and Important findings (new commits), re-run the affected tests, and report the rest to the user. Don't push or open the PR.
