import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import PageMain from "@/components/ui/PageMain";
import PageTitle from "@/components/ui/PageTitle";
import { campaignTypeLabels } from "@/lib/campaigns/campaignTypes";
import { formatDeadline } from "@/lib/campaigns/format";
import { getPublicCampaign } from "@/lib/campaigns/queries";
import { sportLabels } from "@/lib/sports";
import { createClient } from "@/lib/supabase/server";
import { todayIsoDate } from "@/lib/validation";

// Read once per request, for both the metadata and the page. Null when there's no such campaign.
const getCampaign = cache(async (id: string) => getPublicCampaign(await createClient(), id));

export async function generateMetadata({
  params,
}: PageProps<"/campaigns/[id]">): Promise<Metadata> {
  const campaign = await getCampaign((await params).id);
  // The not-found page sets its own title.
  if (!campaign) notFound();
  return { title: campaign.title };
}

export default async function CampaignPage({ params }: PageProps<"/campaigns/[id]">) {
  const campaign = await getCampaign((await params).id);
  if (!campaign) notFound();

  const closed = campaign.deadline !== null && campaign.deadline < todayIsoDate();

  return (
    <PageMain width="wide">
      <PageTitle>{campaign.title}</PageTitle>
      <dl className="mb-8 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        <dt className="text-foreground/70">Brand</dt>
        <dd>{campaign.brand.name}</dd>
        <dt className="text-foreground/70">Type</dt>
        <dd>{campaignTypeLabels[campaign.type]}</dd>
        <dt className="text-foreground/70">Sports</dt>
        <dd>{campaign.sports.map((sport) => sportLabels[sport]).join(", ")}</dd>
        {campaign.deadline && (
          <>
            <dt className="text-foreground/70">Apply by</dt>
            <dd>{formatDeadline(campaign.deadline)}</dd>
          </>
        )}
      </dl>
      {closed && (
        <p className="mb-8 rounded-button border border-foreground/15 px-4 py-3 text-sm">
          Applications closed
        </p>
      )}
      {/* The description is multi-line; keep its line breaks. */}
      <p className="whitespace-pre-line">{campaign.description}</p>
    </PageMain>
  );
}
