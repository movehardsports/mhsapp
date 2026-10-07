# Editing and deleting campaigns (brands)

Date: 2026-10-07. Branch: `feat/campaign-edit-delete` (from `dev`, PR into `dev`).

## Goal

A brand edits or deletes its own campaigns from `/dashboard`. Out of scope: closing campaigns
(a status), the public campaign list and page, applications.

## Decisions

- Deleting is a hard `DELETE`. There are no applications yet, so nothing depends on a campaign;
  revisit this (e.g. closing instead of deleting) once applications exist.
- A deadline that has already passed may stay as it is when editing, so a brand can fix a typo
  without touching the date. A changed deadline must be from today on, as on creation.

## Data model

Migration `campaigns_update_delete`:

- `grant update (type, title, description, sports, deadline)` and `grant delete` on
  `public.campaigns` to `authenticated`. `brand_id` isn't updatable, so a campaign can't move
  to another brand.
- Policies for update (`using` and `with check` on `(select auth.uid()) = brand_id`) and delete
  (`using` on the same). Update can read the row through the existing public select policy.

## App

- `src/app/dashboard/campaigns/actions.ts` (moved from `new/`): `createCampaign`,
  `updateCampaign(id, …)` and `deleteCampaign(id)`, the last two bound to the id by the edit
  page. Both check `requireOnboardedBrand`, the id's format, and filter by `brand_id`; update
  asks for the updated row back, since RLS skips rows silently.
- `/dashboard/campaigns/[id]/edit`: the campaign form filled with the saved values, and a
  "Delete campaign" button. Another brand's campaign, an unknown id or a malformed one is a 404.
- Deleting doesn't ask to confirm (the user's call). `DeleteCampaign` is a one-button form, so it
  works before hydration too.
- `CampaignForm` takes the action, initial values, submit label and the deadline's `min`.
- Each campaign in the dashboard list has Edit and Delete buttons; its title links to the edit page too.

## Tests

`e2e/campaigns.spec.ts` (edit and delete flows, server-side checks, access) and
`e2e/campaigns-rls.spec.ts` (update and delete through the Data API as the owner, another
brand and a guest; changing `brand_id`).
