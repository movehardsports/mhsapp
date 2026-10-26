"use server";

import { revalidatePath } from "next/cache";
import { RedirectType, redirect } from "next/navigation";
import { setApplicationStatus } from "@/lib/applications/mutations";
import { isApplicationStatus } from "@/lib/applications/statuses";
import { requireOnboardedBrand } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation";

// Accept or reject (reversibly) an application to the brand's campaign. Bound to the campaign's
// id, the application's id and the target status by each button; all three come back from the
// client, so they're checked here, and RLS lets a brand change only its own campaigns' rows.
export async function reviewApplication(
  campaignId: unknown,
  applicationId: unknown,
  status: unknown
) {
  const supabase = await createClient();
  // Guests and athletes are turned away here too; RLS limits the update to the brand's own rows.
  await requireOnboardedBrand(supabase);

  if (typeof campaignId !== "string" || !isUuid(campaignId)) redirect("/dashboard");
  const back = `/dashboard/campaigns/${campaignId}/applications`;
  if (typeof applicationId !== "string" || !isUuid(applicationId) || !isApplicationStatus(status)) {
    redirect(back);
  }

  const result = await setApplicationStatus(supabase, applicationId, status);
  // "gone" (not this brand's row, or deleted) just re-renders the list as it is now.
  if (!result.ok && result.reason === "error") {
    throw new Error("Updating the application failed");
  }

  revalidatePath(back);
  revalidatePath("/dashboard");
  // The applicant sees their new status on their dashboard and on the campaign page.
  revalidatePath(`/campaigns/${campaignId}`);
  redirect(back, RedirectType.replace);
}
