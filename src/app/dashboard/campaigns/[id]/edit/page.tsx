import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { updateCampaign } from "@/app/dashboard/campaigns/actions";
import CampaignForm from "@/components/campaigns/CampaignForm";
import DeleteCampaign from "@/components/campaigns/DeleteCampaign";
import PageMain from "@/components/ui/PageMain";
import PageTitle from "@/components/ui/PageTitle";
import { requireOnboardedBrand } from "@/lib/auth/session";
import { getBrandCampaign } from "@/lib/campaigns/queries";
import { createClient } from "@/lib/supabase/server";
import { todayIsoDate } from "@/lib/validation";

// The signed-in brand's campaign, read once per request for both the metadata and the page.
// Another brand's campaign is a 404 here, like a missing one or a malformed id.
const getCampaign = cache(async (id: string) => {
  const supabase = await createClient();
  const { userId } = await requireOnboardedBrand(supabase);
  const campaign = await getBrandCampaign(supabase, userId, id);
  if (!campaign) notFound();
  return campaign;
});

export async function generateMetadata({
  params,
}: PageProps<"/dashboard/campaigns/[id]/edit">): Promise<Metadata> {
  // Called here too, so a 404 gets the not-found page's title instead of this one.
  await getCampaign((await params).id);
  return { title: "Edit campaign" };
}

export default async function EditCampaignPage({
  params,
}: PageProps<"/dashboard/campaigns/[id]/edit">) {
  const { id } = await params;
  const campaign = await getCampaign(id);

  const today = todayIsoDate();
  // A saved deadline that has passed may stay, so the date input must accept it.
  const minDeadline = campaign.deadline && campaign.deadline < today ? campaign.deadline : today;

  return (
    <PageMain width="form">
      <PageTitle>Edit campaign</PageTitle>
      <CampaignForm
        action={updateCampaign.bind(null, id)}
        initialValues={{
          type: campaign.type,
          title: campaign.title,
          description: campaign.description,
          sports: campaign.sports,
          deadline: campaign.deadline ?? "",
        }}
        submitLabel="Save changes"
        pendingLabel="Saving…"
        minDeadline={minDeadline}
      />

      {campaign.applicationCount === 0 ? (
        <DeleteCampaign campaignId={id} label="Delete campaign" className="mt-10 text-center" />
      ) : (
        // The database keeps campaigns with applications, so athletes don't lose them.
        <p className="mt-10 text-center text-sm text-foreground/70">
          Athletes have applied to this campaign, so it can&apos;t be deleted.
        </p>
      )}
    </PageMain>
  );
}
