import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { updateCampaign } from "@/app/dashboard/campaigns/actions";
import CampaignForm from "@/components/campaigns/CampaignForm";
import DeleteCampaign from "@/components/campaigns/DeleteCampaign";
import PageTitle from "@/components/ui/PageTitle";
import { requireOnboardedBrand } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { isUuid, todayIsoDate } from "@/lib/validation";

export const metadata: Metadata = {
  title: "Edit campaign",
};

export default async function EditCampaignPage({
  params,
}: PageProps<"/dashboard/campaigns/[id]/edit">) {
  const supabase = await createClient();
  const { userId } = await requireOnboardedBrand(supabase);
  const { id } = await params;
  if (!isUuid(id)) notFound();

  // Campaigns are public, so filter by brand too: another brand's campaign is a 404 here.
  const { data: campaign, error } = await supabase
    .from("campaigns")
    .select("type, title, description, sports, deadline")
    .eq("id", id)
    .eq("brand_id", userId)
    .maybeSingle();
  if (error) throw new Error(`Reading the campaign failed: ${error.code}`);
  if (!campaign) notFound();

  const today = todayIsoDate();
  // A saved deadline that has passed may stay, so the date input must accept it.
  const minDeadline = campaign.deadline && campaign.deadline < today ? campaign.deadline : today;

  return (
    <main className="mx-auto w-full max-w-sm px-4 py-16 lg:max-w-xl">
      <PageTitle>Edit campaign</PageTitle>
      <CampaignForm
        action={updateCampaign.bind(null, id)}
        initialValues={{ ...campaign, deadline: campaign.deadline ?? "" }}
        submitLabel="Save changes"
        minDeadline={minDeadline}
      />

      <DeleteCampaign campaignId={id} label="Delete campaign" className="mt-10 text-center" />
    </main>
  );
}
