import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { updateCampaign } from "@/app/dashboard/campaigns/actions";
import CampaignForm from "@/components/campaigns/CampaignForm";
import DeleteCampaign from "@/components/campaigns/DeleteCampaign";
import PageMain from "@/components/ui/PageMain";
import PageTitle from "@/components/ui/PageTitle";
import { requireOnboardedBrand } from "@/lib/auth/session";
import { getBrandCampaign } from "@/lib/campaigns/queries";
import { createClient } from "@/lib/supabase/server";
import { todayIsoDate } from "@/lib/validation";

export const metadata: Metadata = {
  title: "Edit campaign",
};

export default async function EditCampaignPage({
  params,
}: PageProps<"/dashboard/campaigns/[id]/edit">) {
  const supabase = await createClient();
  const { userId } = await requireOnboardedBrand(supabase);
  const { id } = await params;

  // Another brand's campaign is a 404 here, like a missing one or a malformed id.
  const campaign = await getBrandCampaign(supabase, userId, id);
  if (!campaign) notFound();

  const today = todayIsoDate();
  // A saved deadline that has passed may stay, so the date input must accept it.
  const minDeadline = campaign.deadline && campaign.deadline < today ? campaign.deadline : today;

  return (
    <PageMain width="form">
      <PageTitle>Edit campaign</PageTitle>
      <CampaignForm
        action={updateCampaign.bind(null, id)}
        initialValues={{ ...campaign, deadline: campaign.deadline ?? "" }}
        submitLabel="Save changes"
        pendingLabel="Saving…"
        minDeadline={minDeadline}
      />

      <DeleteCampaign campaignId={id} label="Delete campaign" className="mt-10 text-center" />
    </PageMain>
  );
}
