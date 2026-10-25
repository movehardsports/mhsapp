import "server-only";
import type { Supabase } from "@/lib/supabase/server";
import { isUuid, todayIsoDate } from "@/lib/validation";

// Reads of campaigns. Each throws when the database can't be read, rather than returning an
// empty result that would look like "no campaigns" (the error page catches it). Lookups by id
// return null for ids that aren't UUIDs, instead of a database error.

// Open campaigns for the public list, newest first: no deadline, or one from today on.
export async function listOpenCampaigns(supabase: Supabase, limit: number) {
  const { data, error } = await supabase
    .from("campaigns")
    .select("id, type, title, sports, deadline, brand:brands(name)")
    .or(`deadline.is.null,deadline.gte.${todayIsoDate()}`)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Reading the campaigns failed: ${error.code}`);
  return data;
}

// Any campaign, open or closed, for its public page. Null when there's no such campaign.
export async function getPublicCampaign(supabase: Supabase, id: string) {
  if (!isUuid(id)) return null;
  const { data, error } = await supabase
    .from("campaigns")
    .select("type, title, description, sports, deadline, brand:brands(name)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Reading the campaign failed: ${error.code}`);
  return data;
}

// How many applications a campaign has, from an embedded `applications(count)`.
const countOf = (applications: { count: number }[]) => applications[0]?.count ?? 0;

// A brand's own campaigns for its dashboard, newest first, with their number of applications
// (RLS lets a brand read the applications to its own campaigns).
export async function listBrandCampaigns(supabase: Supabase, brandId: string) {
  const { data, error } = await supabase
    .from("campaigns")
    .select("id, type, title, sports, deadline, applications(count)")
    .eq("brand_id", brandId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Reading the campaigns failed: ${error.code}`);
  return data.map(({ applications, ...campaign }) => ({
    ...campaign,
    applicationCount: countOf(applications),
  }));
}

// One of the brand's own campaigns, for editing. Campaigns are public, so this filters by
// brand too: another brand's campaign is null here, like a missing one.
export async function getBrandCampaign(supabase: Supabase, brandId: string, id: string) {
  if (!isUuid(id)) return null;
  const { data, error } = await supabase
    .from("campaigns")
    .select("type, title, description, sports, deadline, applications(count)")
    .eq("id", id)
    .eq("brand_id", brandId)
    .maybeSingle();
  if (error) throw new Error(`Reading the campaign failed: ${error.code}`);
  if (!data) return null;
  const { applications, ...campaign } = data;
  return { ...campaign, applicationCount: countOf(applications) };
}
