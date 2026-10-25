"use server";

import { revalidatePath } from "next/cache";
import { RedirectType, redirect } from "next/navigation";
import { requireOnboardedBrand } from "@/lib/auth/session";
import {
  deleteBrandCampaign,
  insertBrandCampaign,
  updateBrandCampaign,
} from "@/lib/campaigns/mutations";
import { getBrandCampaign } from "@/lib/campaigns/queries";
import { type CampaignValues, parseCampaign, readCampaignValues } from "@/lib/campaigns/validation";
import { createClient } from "@/lib/supabase/server";
import { formDataOf, isUuid } from "@/lib/validation";

export type CampaignFormState =
  | { status: "idle" }
  // Echo back what the user typed so the form keeps it after an error.
  | { status: "error"; message: string; values: CampaignValues };

// Pages that show campaigns: the brand's dashboard and edit pages, and the public list and
// campaign pages.
// Without this, going Back after a change can show a cached copy from before it.
function revalidateCampaignPages() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/campaigns/[id]/edit", "page");
  revalidatePath("/campaigns");
  revalidatePath("/campaigns/[id]", "page");
}

export async function createCampaign(
  _prevState: CampaignFormState,
  payload: unknown
): Promise<CampaignFormState> {
  const formData = formDataOf(payload);
  const supabase = await createClient();
  // The page checks this too, but the action can be posted to directly.
  const { userId } = await requireOnboardedBrand(supabase);

  const parsed = parseCampaign(formData);
  if (!parsed.ok) return { status: "error", message: parsed.message, values: parsed.values };

  const result = await insertBrandCampaign(supabase, userId, parsed.input);
  if (!result.ok) {
    return {
      status: "error",
      message: "We couldn't create the campaign. Try again.",
      values: parsed.values,
    };
  }

  revalidateCampaignPages();
  redirect("/dashboard");
}

// Bound to the campaign's id by the edit page.
export async function updateCampaign(
  campaignId: string,
  _prevState: CampaignFormState,
  payload: unknown
): Promise<CampaignFormState> {
  const formData = formDataOf(payload);
  const supabase = await createClient();
  const { userId } = await requireOnboardedBrand(supabase);
  if (!isUuid(campaignId)) redirect("/dashboard");

  // Deleted meanwhile (e.g. in another tab), or not this brand's: say so rather than retry.
  const gone = (): CampaignFormState => ({
    status: "error",
    message: "This campaign no longer exists.",
    values: readCampaignValues(formData),
  });
  // Only the brand's own campaign; the saved deadline decides whether a past one may stay.
  const saved = await getBrandCampaign(supabase, userId, campaignId);
  if (!saved) return gone();

  const parsed = parseCampaign(formData, saved.deadline);
  if (!parsed.ok) return { status: "error", message: parsed.message, values: parsed.values };

  const result = await updateBrandCampaign(supabase, userId, campaignId, parsed.input);
  if (!result.ok && result.reason === "gone") return gone();
  if (!result.ok) {
    return {
      status: "error",
      message: "We couldn't save the campaign. Try again.",
      values: parsed.values,
    };
  }

  revalidateCampaignPages();
  redirect("/dashboard");
}

// Bound to the campaign's id by DeleteCampaign (dashboard list and edit page).
export async function deleteCampaign(campaignId: string) {
  const supabase = await createClient();
  const { userId } = await requireOnboardedBrand(supabase);
  if (!isUuid(campaignId)) redirect("/dashboard");

  const result = await deleteBrandCampaign(supabase, userId, campaignId);
  // Someone applied since the page offered Delete: the dashboard says why it's still there.
  if (!result.ok && result.reason === "has-applications") {
    revalidateCampaignPages();
    redirect("/dashboard?notice=not-deleted", RedirectType.replace);
  }
  if (!result.ok) throw new Error("Deleting the campaign failed");

  revalidateCampaignPages();
  // Replace, not push: Back shouldn't return to the edit page of a campaign that's gone, or,
  // when deleting from the dashboard, to a second copy of it.
  redirect("/dashboard", RedirectType.replace);
}
