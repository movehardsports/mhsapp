import type { Metadata } from "next";
import { createCampaign } from "@/app/dashboard/campaigns/actions";
import CampaignForm from "@/components/campaigns/CampaignForm";
import PageTitle from "@/components/ui/PageTitle";
import { requireOnboardedBrand } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { todayIsoDate } from "@/lib/validation";

export const metadata: Metadata = {
  title: "New campaign",
};

export default async function NewCampaignPage() {
  const supabase = await createClient();
  await requireOnboardedBrand(supabase);

  return (
    <main className="mx-auto w-full max-w-sm px-4 py-16 lg:max-w-xl">
      <PageTitle>New campaign</PageTitle>
      <CampaignForm
        action={createCampaign}
        initialValues={{ type: "", title: "", description: "", sports: [], deadline: "" }}
        submitLabel="Create campaign"
        minDeadline={todayIsoDate()}
      />
    </main>
  );
}
