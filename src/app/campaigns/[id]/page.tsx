import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import ApplicationSection, { type Applicant } from "@/components/applications/ApplicationSection";
import PageMain from "@/components/ui/PageMain";
import PageTitle from "@/components/ui/PageTitle";
import { getAthleteApplication } from "@/lib/applications/queries";
import { getAccount, hasOnboarded } from "@/lib/auth/session";
import { campaignTypeLabels } from "@/lib/campaigns/campaignTypes";
import { isCampaignClosed } from "@/lib/campaigns/deadline";
import { formatDeadline } from "@/lib/campaigns/format";
import { getPublicCampaign } from "@/lib/campaigns/queries";
import { sportLabels } from "@/lib/sports";
import { createClient, type Supabase } from "@/lib/supabase/server";

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

// Who is looking, for the Apply section: guests, brands, athletes still onboarding, and
// athletes with their application to this campaign, if any.
async function getApplicant(supabase: Supabase, campaignId: string): Promise<Applicant> {
  const account = await getAccount(supabase);
  if (!account) return { kind: "guest" };
  if (account.accountType === "brand") return { kind: "brand" };
  if (!(await hasOnboarded(supabase, account))) return { kind: "athlete-onboarding" };
  const application = await getAthleteApplication(supabase, account.userId, campaignId);
  return { kind: "athlete", application };
}

export default async function CampaignPage({ params }: PageProps<"/campaigns/[id]">) {
  const { id } = await params;
  const campaign = await getCampaign(id);
  if (!campaign) notFound();

  const closed = isCampaignClosed(campaign.deadline);
  const applicant = await getApplicant(await createClient(), id);

  return (
    <PageMain width="wide">
      <PageTitle>{campaign.title}</PageTitle>
      <dl className="mb-8 grid grid-cols-[auto_minmax(0,1fr)] gap-x-6 gap-y-2 text-sm">
        <dt className="text-foreground/70">Brand</dt>
        <dd className="break-words">{campaign.brand.name}</dd>
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
      {/* The description is multi-line; keep its line breaks, and break long words and URLs. */}
      <p className="break-words whitespace-pre-line">{campaign.description}</p>
      <ApplicationSection campaignId={id} closed={closed} applicant={applicant} />
    </PageMain>
  );
}
