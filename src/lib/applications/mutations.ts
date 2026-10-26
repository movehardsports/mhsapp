import "server-only";
import type { ApplicationStatus } from "@/lib/applications/statuses";
import type { ApplicationInput } from "@/lib/applications/validation";
import type { Supabase } from "@/lib/supabase/server";

// Writes to applications, always as the signed-in athlete: `athleteId` comes from the verified
// token, never from a form, and RLS checks it again. They log database errors and return a
// result for the Server Action to turn into a message or a redirect.

// "closed" when RLS refused it, which (for an athlete's own row) means the campaign is closed
// or gone; "duplicate" when they already applied.
export async function insertApplication(
  supabase: Supabase,
  athleteId: string,
  campaignId: string,
  application: ApplicationInput
): Promise<{ ok: true } | { ok: false; reason: "closed" | "duplicate" | "error" }> {
  const { error } = await supabase
    .from("applications")
    .insert({ athlete_id: athleteId, campaign_id: campaignId, ...application });
  if (!error) return { ok: true };
  // 42501: the insert policy failed. 23503: no such campaign. 23505: unique violation.
  if (error.code === "42501" || error.code === "23503") return { ok: false, reason: "closed" };
  if (error.code === "23505") return { ok: false, reason: "duplicate" };
  console.error("Applying to a campaign failed", error.code, error.message);
  return { ok: false, reason: "error" };
}

// Withdraws the athlete's pending application. One that's gone, or no longer pending (RLS skips
// it without an error), stays as it is; the page then shows its current state.
export async function deletePendingApplication(
  supabase: Supabase,
  athleteId: string,
  campaignId: string
): Promise<{ ok: boolean }> {
  const { error } = await supabase
    .from("applications")
    .delete()
    .eq("campaign_id", campaignId)
    .eq("athlete_id", athleteId)
    .eq("status", "pending");
  if (error) console.error("Withdrawing an application failed", error.code, error.message);
  return { ok: !error };
}

// Sets an application's status, always as the campaign's brand: RLS allows the update only on
// applications to the brand's own campaigns, and only the status column is grantable. "gone"
// when the row isn't the brand's to change (RLS skipped it) or doesn't exist.
export async function setApplicationStatus(
  supabase: Supabase,
  applicationId: string,
  status: ApplicationStatus
): Promise<{ ok: true } | { ok: false; reason: "gone" | "error" }> {
  const { data, error } = await supabase
    .from("applications")
    .update({ status })
    .eq("id", applicationId)
    .select("id");
  if (error) {
    console.error("Updating an application failed", error.code, error.message);
    return { ok: false, reason: "error" };
  }
  return data.length > 0 ? { ok: true } : { ok: false, reason: "gone" };
}
