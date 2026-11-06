# Chat, step 1: database — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The database side of the brand–athlete chat: messages, system entries, read state and the "never back to pending after acceptance" rule, all guarded by RLS, with Data API e2e checks. No chat UI yet.

**Architecture:** The chat _is_ the application: `messages.application_id` points at `applications`, and a chat exists once `applications.accepted_at` (new, set by a trigger on the first acceptance) is not null. System entries are rows in `messages` with `kind <> 'text'` and no sender, written by a `SECURITY DEFINER` trigger in the `private` schema when the status changes. Read state is one row per user and chat in `conversation_reads`.

**Tech Stack:** Supabase Postgres (migrations, RLS), Playwright (Data API specs), Next.js Server Actions (one small UI change).

**Spec:** `docs/superpowers/specs/2026-11-06-in-app-chat-design.md`

## Global Constraints

- Load the `supabase` and `supabase-postgres-best-practices` skills before writing SQL (AGENTS.md).
- Branch `feat/chat-database` from `dev`; one PR into `dev`; don't commit or push unless the user asks.
- Migrations via `npx supabase migration new <name>`; policies use `(select auth.uid())`; explicit grants; `SECURITY DEFINER` functions live in `private` with `set search_path = ''` and execute revoked from `public, anon, authenticated`.
- Message text: trimmed (`btrim(body, E' \t\n\r')`), at most **2000** characters, at least one visible character — the exact regex from `20261025200624_create_applications.sql` (`applications.message` check).
- The athlete's last name, email and phone are never reachable through messages or reads.
- After the migration: `npm run db:types`; `npx supabase db reset` wipes the user's local accounts — **ask the user first**, and afterwards `npx supabase stop && npx supabase start`. Prefer `npx supabase migration up` (keeps data).
- Before calling it done: `npm run lint`, `npm run typecheck`, `npm run format:check`, `npm run test:unit`, and the touched e2e specs.

## Review Focus

1. A brand flips accepted → rejected → accepted quickly: exactly one `closed` and one `reopened` entry per flip, never a second `accepted` entry.
2. Setting the same status again (accepted → accepted, a double submit) must add no system entry.
3. A rejected application that was **never** accepted can still go back to pending and be withdrawn (the rule is only for ever-accepted ones).
4. An athlete re-applying after withdrawing a never-accepted application gets a fresh application with no chat.
5. A user forging `kind`, `sender_id` of the other side, or `created_at` through the Data API is refused.

Each has a test in Task 2 or Task 3.

---

## File Structure

- Create `supabase/migrations/<ts>_create_messages.sql` — everything in Tasks 1–2's schema (one migration).
- Modify `src/lib/supabase/database.types.ts` — regenerated.
- Create `src/lib/messages/kinds.ts` (+ enum drift check like `src/lib/applications/statuses.ts`).
- Create `e2e/messages-rls.spec.ts`; add it to `apiSpecs` in `playwright.config.ts`.
- Modify `src/lib/applications/queries.ts`, `src/lib/applications/mutations.ts`, `src/components/applications/ReviewApplication.tsx`, `src/components/applications/ApplicantList.tsx`, `e2e/brand-review.spec.ts`, `e2e/applications-rls.spec.ts`.
- Modify `AGENTS.md` (Product, access rules, Status, Next).
- Add `.superpowers/` to `.gitignore`.

---

### Task 1: `accepted_at` and the "never back to pending" rule

**Files:**

- Create: `supabase/migrations/<ts>_create_messages.sql` (first part)
- Modify: `src/lib/applications/queries.ts:28-39`, `src/lib/applications/mutations.ts` (`setApplicationStatus`), `src/components/applications/ReviewApplication.tsx`, `src/components/applications/ApplicantList.tsx`
- Test: `e2e/applications-rls.spec.ts`, `e2e/brand-review.spec.ts`

**Interfaces:**

- Produces: column `applications.accepted_at timestamptz null` (no insert/update grant; readable with the row). Trigger `private.track_application_acceptance()` `before update of status on applications`: sets `new.accepted_at = now()` when `new.status = 'accepted' and old.accepted_at is null`; raises `errcode = 'check_violation'` (23514) with message `'An accepted application can''t go back to pending'` when `new.status = 'pending' and old.accepted_at is not null`. Backfill: `update applications set accepted_at = created_at where status = 'accepted'` (before creating the trigger).
- Produces: `listCampaignApplications` rows gain `accepted_at: string | null`. `setApplicationStatus` returns `{ ok: false, reason: "locked" }` on 23514; `reviewApplication` treats `"locked"` like `"gone"` (re-render, no throw).
- Produces: `ReviewApplication` gets prop `everAccepted: boolean`; when true, `"pending"` is not among the targets.

- [ ] **Step 1: Write the failing tests**

In `e2e/applications-rls.spec.ts`, new test `"an accepted application never goes back to pending, so it can't be withdrawn"`:
brand accepts via PATCH → 204; `accepted_at` read by the athlete is not null; PATCH `{status:"rejected"}` → 204; PATCH `{status:"pending"}` → 400 with `code === "23514"`; status still `"rejected"`; athlete DELETE → status stays `"rejected"` (row still there). PATCH `{accepted_at: null}` as the brand → 403.
Second test `"a never-accepted rejection can still go back to pending"`: pending → rejected → pending (204 each), athlete DELETE → row gone.

In `e2e/brand-review.spec.ts`, replace the tail of `"a brand accepts, rejects and resets…"` (rename it `"a brand accepts and rejects, and the athlete sees each status"`): after Reject, `applicant.getByRole("button", { name: /Reset to pending/ })` has count 0, and Accept is visible; the athlete's campaign page still has no "Withdraw application". Add a test where the brand rejects a pending application and `Reset to pending` **is** visible.

- [ ] **Step 2: Run them, expect failures** — `npx playwright test e2e/applications-rls.spec.ts e2e/brand-review.spec.ts --project=chromium` (check `playwright.config.ts` for the desktop project name). Expected: the new assertions fail (pending is accepted; reset button shown).
- [ ] **Step 3: Write the migration part** (column, backfill, function, trigger, revoke execute) and apply it: `npx supabase migration up`, then `npm run db:types`.
- [ ] **Step 4: App changes** — select `accepted_at` in `listCampaignApplications`; pass `everAccepted={accepted_at !== null}` from `ApplicantList`; filter `"pending"` in `ReviewApplication` when `everAccepted`; map 23514 in `setApplicationStatus` and handle `"locked"` in `src/app/dashboard/campaigns/[id]/applications/actions.ts`.
- [ ] **Step 5: Run the tests again** — same command. Expected: PASS. Also `npm run typecheck`.
- [ ] **Step 6: Commit** — `git commit -m "Keep accepted applications from going back to pending"`

### Task 2: `messages` with system entries

**Files:**

- Modify: the same migration (second part)
- Create: `src/lib/messages/kinds.ts`, `e2e/messages-rls.spec.ts`; modify `playwright.config.ts` (`apiSpecs`)

**Interfaces:**

- Consumes: `applications.accepted_at` (Task 1).
- Produces: enum `public.message_kind ('text', 'accepted', 'closed', 'reopened')` mirrored by `messageKinds` in `src/lib/messages/kinds.ts` with the `Assert<SameUnion<…>>` drift check (copy the pattern of `src/lib/applications/statuses.ts`).
- Produces: table `public.messages`:
  `id uuid pk default gen_random_uuid()`, `application_id uuid not null references applications(id) on delete restrict`, `kind message_kind not null default 'text'`, `sender_id uuid references profiles(id) on delete cascade` (null for system entries), `body text` (null for system entries; the visible-text/2000/btrim check when not null), `created_at timestamptz not null default now()`, and `check ((kind = 'text') = (sender_id is not null and body is not null))`. Index `(application_id, created_at desc)`.
- Grants: `select` and `insert (application_id, sender_id, body)` to `authenticated`; nothing to `anon`; no update/delete.
- Policies:
  - select: `application_id in (select id from public.applications where accepted_at is not null)` (applications' own RLS limits this to the two sides).
  - insert: `sender_id = (select auth.uid()) and application_id in (select id from public.applications where status = 'accepted')`.
- Produces: trigger `private.add_status_entry()` `after update of status on applications`, `SECURITY DEFINER`, inserting one row with `kind`:
  `'accepted'` when `new.status = 'accepted' and old.accepted_at is null`; `'reopened'` when `new.status = 'accepted' and old.status <> 'accepted' and old.accepted_at is not null`; `'closed'` when `old.status = 'accepted' and new.status <> 'accepted'`; nothing otherwise (including same-status updates).

- [ ] **Step 1: Write `e2e/messages-rls.spec.ts`** (reuse `newUser`/`apply` pattern from `applications-rls.spec.ts`; extract them to `e2e/` helpers only if both files would otherwise copy them — put them in `e2e/auth.ts` as `newApiUser`). Tests:
  - `"a chat opens on acceptance with a system entry"`: before accepting, athlete POST `messages` → 403; brand accepts; athlete reads `messages?application_id=eq.<id>&select=kind,sender_id,body` → `[{ kind: "accepted", sender_id: null, body: null }]`; brand reads the same.
  - `"only the two sides read and write"`: athlete and brand each POST `{application_id, sender_id: self, body: "Hi"}` → 201; other athlete, other brand read → `[]`; guest read → 401; other brand POST with own id → 403; athlete POST with `sender_id` = brand id → 403; POST with `kind: "closed"` or `created_at` → 403 (no grant); body `"   "` → 400 code 23514; body of 2001 `"a"` → 400 code 23514; body `" hi "` → 400 code 23514; PATCH and DELETE on a message leave it unchanged.
  - `"rejecting closes the chat, accepting again reopens it"`: accept → reject → athlete POST → 403; kinds read in order are `["accepted","closed"]`; accept again → POST 201; kinds `["accepted","closed","reopened","text"]`. Repeating PATCH `{status:"accepted"}` adds no row.
  - `"a never-accepted application has no chat"`: pending → rejected → pending → withdraw → re-apply: athlete reads `messages` for both ids → `[]`.
  - `"messages don't expose the athlete's last name"`: brand reads `messages?select=application:applications(athletes(athlete_private(last_name)))` → `athlete_private` is null.
- [ ] **Step 2: Add the spec to `apiSpecs`; run it** — expected FAIL (no `messages` table).
- [ ] **Step 3: Write the migration part, apply (`npx supabase migration up`), `npm run db:types`, add `kinds.ts`.**
- [ ] **Step 4: Run the spec** — expected PASS. Run `npm run typecheck`.
- [ ] **Step 5: Commit** — `git commit -m "Add chat messages and status entries"`

### Task 3: `conversation_reads`

**Files:**

- Modify: the same migration (third part); `e2e/messages-rls.spec.ts`

**Interfaces:**

- Produces: table `public.conversation_reads`: `application_id uuid references applications(id) on delete restrict`, `user_id uuid references profiles(id) on delete cascade`, `last_read_at timestamptz not null default now()`, `primary key (application_id, user_id)`.
- Grants: `select`, `insert (application_id, user_id, last_read_at)`, `update (last_read_at)` to `authenticated`.
- Policies (select, insert, update): `user_id = (select auth.uid()) and application_id in (select id from public.applications where accepted_at is not null)`.
- Unread rule for later steps (document it in a SQL comment on the table): a message is unread for user U in chat C when `created_at > coalesce(last_read_at, '-infinity')` and either `sender_id` is the other side, or `sender_id is null` and U is the application's athlete.

- [ ] **Step 1: Add tests** in `e2e/messages-rls.spec.ts`: `"each user keeps only their own read state"`: after acceptance the athlete upserts (`POST` with `prefer: "resolution=merge-duplicates"`) their row → 201; the brand reads `conversation_reads` → `[]`; the brand POSTs a row with `user_id` = athlete → 403; the other athlete POSTs for this application → 403; before acceptance (new application) the athlete's POST → 403.
- [ ] **Step 2: Run, expect FAIL; write the migration part; `migration up`; `db:types`; run, expect PASS.**
- [ ] **Step 3: Commit** — `git commit -m "Track when each side last read a chat"`

### Task 4: Docs and full check

**Files:** `AGENTS.md`, `.gitignore`, `docs/superpowers/specs/2026-11-06-in-app-chat-design.md`, this plan.

- [ ] **Step 1: Update `AGENTS.md`** — Product: replace "in-app chat" out of scope and "accepted collaboration reveals contact details" with the chat (one per accepted application, contact details never shown). Access rules: replace the contact-details line with "Messages are visible only to the two sides of an accepted application." Status: add a "Done (database): chat …" line (tables, `accepted_at`, no return to pending, system entries, read state) and note UI not built yet; add hosted Realtime setup and message rate limit under "Not set up yet". Next: chat pages (step 2).
- [ ] **Step 2: Add `.superpowers/` to `.gitignore`.**
- [ ] **Step 3: Full check** — `npm run lint && npm run typecheck && npm run format:check && npm run test:unit`, then `npx playwright test e2e/messages-rls.spec.ts e2e/applications-rls.spec.ts e2e/brand-review.spec.ts e2e/applications.spec.ts e2e/dashboard.spec.ts`. Expected: all pass.
- [ ] **Step 4: Run the `code-reviewer` agent on the branch; fix findings.**
- [ ] **Step 5: Commit** — `git commit -m "Document the chat's database"`
