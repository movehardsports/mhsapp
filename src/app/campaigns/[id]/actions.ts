"use server";

import { revalidatePath } from "next/cache";
import { RedirectType, redirect } from "next/navigation";
import { deletePendingApplication, insertApplication } from "@/lib/applications/mutations";
import { type ApplicationValues, parseApplication } from "@/lib/applications/validation";
import { requireOnboardedAccount } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { formDataOf, isUuid } from "@/lib/validation";

export type ApplicationFormState =
  | { status: "idle" }
  // Echo back what the athlete typed so the form keeps it after an error.
  | { status: "error"; message: string; values: ApplicationValues };

// The campaign page shows the application, and the dashboard will list them.
function revalidateApplicationPages(campaignId: string) {
  revalidatePath(`/campaigns/${campaignId}`);
  revalidatePath("/dashboard");
}

// Signed-in athletes who finished onboarding, as the page offers the form only to them; anyone
// else posting here directly goes back to the campaign.
async function requireAthlete(campaignId: unknown) {
  const supabase = await createClient();
  const account = await requireOnboardedAccount(supabase);
  // The bound id comes back from the client, so it can be anything in a forged call.
  if (typeof campaignId !== "string" || !isUuid(campaignId)) redirect("/campaigns");
  if (account.accountType !== "athlete") redirect(`/campaigns/${campaignId}`);
  return { supabase, athleteId: account.userId, campaignId };
}

// Bound to the campaign's id by the campaign page.
export async function applyToCampaign(
  boundId: unknown,
  _prevState: ApplicationFormState,
  payload: unknown
): Promise<ApplicationFormState> {
  const formData = formDataOf(payload);
  const { supabase, athleteId, campaignId } = await requireAthlete(boundId);

  const parsed = parseApplication(formData);
  if (!parsed.ok) return { status: "error", message: parsed.message, values: parsed.values };

  const result = await insertApplication(supabase, athleteId, campaignId, parsed.input);
  // Applied in another tab meanwhile: keep this message on screen rather than drop it.
  if (!result.ok && result.reason === "duplicate") {
    return {
      status: "error",
      message:
        "You've already applied to this campaign, maybe in another tab. Reload the page to see your application.",
      values: parsed.values,
    };
  }
  if (!result.ok && result.reason === "error") {
    return {
      status: "error",
      message: "We couldn't send your application. Try again.",
      values: parsed.values,
    };
  }

  // Sent, or the campaign closed or went away meanwhile: either way, show the page as it is
  // now ("Your application", "Applications closed" or not found).
  revalidateApplicationPages(campaignId);
  // Replace, not push: Back shouldn't stop on the same page before the action.
  redirect(`/campaigns/${campaignId}`, RedirectType.replace);
}

// Bound to the campaign's id by the campaign page.
export async function withdrawApplication(boundId: unknown) {
  const { supabase, athleteId, campaignId } = await requireAthlete(boundId);
  const result = await deletePendingApplication(supabase, athleteId, campaignId);
  if (!result.ok) throw new Error("Withdrawing the application failed");

  revalidateApplicationPages(campaignId);
  // Replace, not push: Back shouldn't stop on the same page before the action.
  redirect(`/campaigns/${campaignId}`, RedirectType.replace);
}
