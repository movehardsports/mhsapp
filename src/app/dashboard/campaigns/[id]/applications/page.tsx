import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import ApplicantList from "@/components/applications/ApplicantList";
import PageMain from "@/components/ui/PageMain";
import PageTitle from "@/components/ui/PageTitle";
import { listCampaignApplications } from "@/lib/applications/queries";
import { requireOnboardedBrand } from "@/lib/auth/session";
import { getBrandCampaign } from "@/lib/campaigns/queries";
import { createClient } from "@/lib/supabase/server";

// The signed-in brand's campaign, read once per request for the metadata and the page. Another
// brand's campaign, a missing one or a malformed id is a 404 here.
const getCampaign = cache(async (id: string) => {
  const supabase = await createClient();
  const { userId } = await requireOnboardedBrand(supabase);
  const campaign = await getBrandCampaign(supabase, userId, id);
  if (!campaign) notFound();
  return campaign;
});

export async function generateMetadata({
  params,
}: PageProps<"/dashboard/campaigns/[id]/applications">): Promise<Metadata> {
  await getCampaign((await params).id);
  return { title: "Applications" };
}

export default async function CampaignApplicationsPage({
  params,
}: PageProps<"/dashboard/campaigns/[id]/applications">) {
  const { id } = await params;
  const campaign = await getCampaign(id);
  const applications = await listCampaignApplications(await createClient(), id);

  return (
    <PageMain width="wide">
      <PageTitle>Applications to {campaign.title}</PageTitle>
      <ApplicantList campaignId={id} applications={applications} />
    </PageMain>
  );
}
