# Campaign creation (brands)

Date: 2026-10-06. Branch: `feat/campaigns` (from `dev`, PR into `dev`).

## Goal

A brand that has finished onboarding can create a campaign from `/dashboard` and sees the
list of its own campaigns there. This is the first step of the campaign feature.

Out of scope for this step (later steps): editing, closing or deleting campaigns, a status
(draft/open/closed), the public campaign list and page, applications, invitations. The
athlete's dashboard doesn't change.

## Data model

Migration `create_campaigns` (`npx supabase migration new create_campaigns`).

- `create type public.campaign_type as enum ('sponsorship', 'event', 'ambassador')`.
- Table `public.campaigns`:

  | Column        | Type                   | Rules                                                                                                                                                              |
  | ------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
  | `id`          | `uuid`                 | primary key, `default gen_random_uuid()`                                                                                                                           |
  | `brand_id`    | `uuid`                 | not null, `references public.brands (id) on delete cascade`                                                                                                        |
  | `type`        | `public.campaign_type` | not null                                                                                                                                                           |
  | `title`       | `public.trimmed_text`  | not null, `char_length(title) <= 100`                                                                                                                              |
  | `description` | `text`                 | not null, `char_length(description) <= 5000`, not blank (`description ~ '\S'`), no leading or trailing whitespace (`description = btrim(description, E' \t\n\r')`) |
  | `sports`      | `public.sport[]`       | not null, 1–16 entries, no nulls (same check as `brands`)                                                                                                          |
  | `deadline`    | `date`                 | nullable                                                                                                                                                           |
  | `created_at`  | `timestamptz`          | not null, `default now()`                                                                                                                                          |

  `description` is multi-line, so it can't use `trimmed_text` (which forbids control
  characters, newlines included).

  `brand_id` references `brands`, not `profiles`: only a brand that finished onboarding can
  own campaigns, and the reference keeps campaigns on brand accounts.

- Indexes: `(brand_id, created_at desc)` for the dashboard list (also covers the foreign key);
  GIN on `sports` for the later catalogue filter (`sports @> array[...]`).
- No "deadline not in the past" check in the database: it depends on today's date, so the
  app checks it on create (like the athlete's minimum age).

Access (RLS on, explicit grants, policies scoped with `(select auth.uid())`):

- `revoke all` from `anon, authenticated`, then:
- `grant select` to `anon, authenticated`; policy "Anyone can read campaigns": `using (true)`.
  Campaigns are public and hold no contact details.
- `grant insert (brand_id, type, title, description, sports, deadline)` to `authenticated`;
  policy "Brands can create their own campaigns": `with check ((select auth.uid()) = brand_id)`.
  An athlete can't pass it in practice: the foreign key needs a `brands` row with their id.
- No update or delete grants or policies yet.

After the migration: `npm run db:types`. Add `src/lib/campaignTypes.ts` with the ids and UI
labels (Sponsorship, Event, Ambassador), and a type-level check that it matches the
generated enum, the way `src/lib/sports.ts` does for `sport`.

Duplicate sports are removed by the app (`parseSports`), keeping the first order.

## Pages

All pages are Server Components and check access on the server.

- New helper `requireOnboardedBrand(supabase)` in `src/lib/auth/session.ts`, built from
  `getAccount` and `hasOnboarded`: guests → `/sign-in`, athletes → `/dashboard`, brands
  without a profile → `/onboarding/brand`. Returns `{ userId }`.
- `/dashboard` (`src/app/dashboard/page.tsx`): keeps the current redirects and the
  screen-reader heading. For a brand it adds a "Campaigns" section above Sign out:
  - a "New campaign" link to `/dashboard/campaigns/new`;
  - the brand's campaigns, newest first: title, type label, sports labels, deadline if set;
  - "No campaigns yet" when there are none.
    A failed read throws (error page) rather than showing an empty list.
    The list lives in `src/components/campaigns/CampaignList.tsx`.
- `/dashboard/campaigns/new` (`src/app/dashboard/campaigns/new/page.tsx`): title
  "New campaign", calls `requireOnboardedBrand`, renders the form.

## Form and Server Action

- `src/components/campaigns/CampaignForm.tsx` (`"use client"`, `useActionState`), following
  `BrandOnboardingForm`:
  - Type: three radio tiles (`checkableTile`), required.
  - Title: `Field`, required, `maxLength` 100.
  - Description: `textarea`, required, `maxLength` 5000.
  - Sports: `TagPicker`, at least one.
  - Deadline: `input type="date"`, optional, `min` = today.
  - `SubmitButton` "Create campaign"; the error message above it (`formError`).
  - After an error the form keeps the submitted values.
- `src/app/dashboard/campaigns/new/actions.ts`, `createCampaign(prevState, formData)`:
  1. `requireOnboardedBrand` again (a direct POST skips the page).
  2. Validate: type is a `campaignTypes` id; title through `cleanText(…, 100)`; description
     trimmed, 1–5000 characters, `\r\n` normalised to `\n`; sports through `parseSports`;
     deadline empty or a real `YYYY-MM-DD` date not before today (server date, UTC).
  3. `insert` into `campaigns` with `brand_id = userId`.
  4. On error: log the code, return "We couldn't create the campaign. Try again."
  5. On success: `redirect("/dashboard")`.
- Move `cleanText` and `parseSports` from `src/lib/onboarding/validation.ts` to
  `src/lib/validation.ts` (shared now); onboarding-only helpers stay where they are.

## Testing

`e2e/campaigns.spec.ts`, in the desktop and mobile projects, with a helper that signs up a
brand and finishes its onboarding (`completeBrandOnboarding` in `e2e/auth.ts`):

- A guest opening `/dashboard/campaigns/new` goes to `/sign-in`.
- An athlete opening it goes to `/dashboard` (then to their onboarding if not finished).
- A brand without onboarding goes to `/onboarding/brand`.
- A brand sees "No campaigns yet", creates a campaign, lands on `/dashboard` and sees it in
  the list with its type, sports and deadline.
- Server-side validation: a form posted with a blank description (browser checks bypassed)
  shows the error and keeps the other values; a deadline in the past is rejected.
- RLS through the Data API (publishable key + the user's session): a brand can't insert a
  campaign with another brand's `brand_id`, an athlete can't insert one at all, and a guest
  can read campaigns.

Plus `npm run lint`, `npm run typecheck`, the full e2e suite, AGENTS.md Status update and
the `code-reviewer` agent before the PR.
