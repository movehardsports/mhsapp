import type { Metadata } from "next";
import PublicCampaignList from "@/components/campaigns/PublicCampaignList";
import PageMain from "@/components/ui/PageMain";
import PageTitle from "@/components/ui/PageTitle";
import { createClient } from "@/lib/supabase/server";
import { todayIsoDate } from "@/lib/validation";

export const metadata: Metadata = {
  title: "Campaigns",
};

// Enough for now; paging comes once there are more campaigns.
const LIMIT = 50;

export default async function CampaignsPage() {
  const supabase = await createClient();
  // Only open campaigns: no deadline, or one from today on. Campaigns whose deadline has
  // passed keep their own page, which says applications are closed.
  const { data: campaigns, error } = await supabase
    .from("campaigns")
    .select("id, type, title, sports, deadline, brand:brands(name)")
    .or(`deadline.is.null,deadline.gte.${todayIsoDate()}`)
    .order("created_at", { ascending: false })
    .limit(LIMIT);
  // An empty list would wrongly say there are no campaigns.
  if (error) throw new Error(`Reading the campaigns failed: ${error.code}`);

  return (
    <PageMain width="wide">
      <PageTitle>Campaigns</PageTitle>
      <PublicCampaignList campaigns={campaigns} />
    </PageMain>
  );
}
