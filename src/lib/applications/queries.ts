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

// The applications to one of the brand's own campaigns, newest first, with each applicant's
// public profile (never the last name, which is owner-only). RLS lets the campaign's brand read
// these; call getBrandCampaign first to confirm ownership and get the title.
export async function listCampaignApplications(supabase: Supabase, campaignId: string) {
  if (!isUuid(campaignId)) return [];
  const { data, error } = await supabase
    .from("applications")
    .select(
      "id, status, message, created_at, athlete:athletes(first_name, nickname, birth_year, city, sports)"
    )
    .eq("campaign_id", campaignId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Reading the applications failed: ${error.code}`);
  return data;
}
