import "server-only";
import type { CampaignInput } from "@/lib/campaigns/validation";
import type { Supabase } from "@/lib/supabase/server";

// Writes to campaigns, always as the signed-in brand: `brandId` comes from the verified token,
// never from a form, and RLS checks it again. They log database errors and return a result for
// the Server Action to turn into a message or a redirect.

export async function insertBrandCampaign(
  supabase: Supabase,
  brandId: string,
  campaign: CampaignInput
): Promise<{ ok: boolean }> {
  const { error } = await supabase.from("campaigns").insert({ brand_id: brandId, ...campaign });
  if (error) console.error("Creating a campaign failed", error.code, error.message);
  return { ok: !error };
}

// "gone" when the campaign doesn't exist (any more) or isn't the brand's own.
export async function updateBrandCampaign(
  supabase: Supabase,
  brandId: string,
  id: string,
  campaign: CampaignInput
): Promise<{ ok: true } | { ok: false; reason: "gone" | "error" }> {
  // RLS skips rows the brand doesn't own without an error, so ask for the updated row back:
  // none means there was nothing to update.
  const { data, error } = await supabase
    .from("campaigns")
    .update(campaign)
    .eq("id", id)
    .eq("brand_id", brandId)
    .select("id");
  if (error) {
    console.error("Updating a campaign failed", error.code, error.message);
    return { ok: false, reason: "error" };
  }
  return data.length > 0 ? { ok: true } : { ok: false, reason: "gone" };
}

// Deleting a campaign that's already gone counts as done. "has-applications" when athletes
// applied to it: the database keeps such campaigns (the foreign key from applications).
export async function deleteBrandCampaign(
  supabase: Supabase,
  brandId: string,
  id: string
): Promise<{ ok: true } | { ok: false; reason: "has-applications" | "error" }> {
  const { error } = await supabase.from("campaigns").delete().eq("id", id).eq("brand_id", brandId);
  if (!error) return { ok: true };
  if (error.code === "23503") return { ok: false, reason: "has-applications" };
  console.error("Deleting a campaign failed", error.code, error.message);
  return { ok: false, reason: "error" };
}
