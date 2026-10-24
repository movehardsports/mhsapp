import type { Metadata } from "next";
import PublicCampaignList from "@/components/campaigns/PublicCampaignList";
import PageMain from "@/components/ui/PageMain";
import PageTitle from "@/components/ui/PageTitle";
import { listOpenCampaigns } from "@/lib/campaigns/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Campaigns",
};

// Enough for now; paging comes once there are more campaigns.
const LIMIT = 50;

export default async function CampaignsPage() {
  const supabase = await createClient();
  // Campaigns whose deadline has passed aren't listed; they keep their own page, which says
  // applications are closed.
  const campaigns = await listOpenCampaigns(supabase, LIMIT);

  return (
    <PageMain width="wide">
      <PageTitle>Campaigns</PageTitle>
      <PublicCampaignList campaigns={campaigns} />
    </PageMain>
  );
}
