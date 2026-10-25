import "server-only";
import type { Supabase } from "@/lib/supabase/server";
import { isUuid } from "@/lib/validation";

// Reads of applications. Each throws when the database can't be read (the error page catches
// it). RLS limits every read to the athlete's own applications or a brand's campaigns.

// The athlete's application to a campaign, or null when they haven't applied.
export async function getAthleteApplication(
  supabase: Supabase,
  athleteId: string,
  campaignId: string
) {
  if (!isUuid(campaignId)) return null;
  const { data, error } = await supabase
    .from("applications")
    .select("status, message, created_at")
    .eq("campaign_id", campaignId)
    .eq("athlete_id", athleteId)
    .maybeSingle();
  if (error) throw new Error(`Reading the application failed: ${error.code}`);
  return data;
}
