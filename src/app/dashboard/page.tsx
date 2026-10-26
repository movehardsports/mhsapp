import type { Metadata } from "next";
import Link from "next/link";
import ApplicationList from "@/components/applications/ApplicationList";
import CampaignList from "@/components/campaigns/CampaignList";
import SubmitButton from "@/components/forms/SubmitButton";
import PageMain from "@/components/ui/PageMain";
import { primaryButton, secondaryButton } from "@/components/ui/styles";
import { signOut } from "@/lib/auth/actions";
import { requireOnboardedAccount } from "@/lib/auth/session";
import { listAthleteApplications } from "@/lib/applications/queries";
import { listBrandCampaigns } from "@/lib/campaigns/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const { notice } = await searchParams;
  const supabase = await createClient();
  const account = await requireOnboardedAccount(supabase);

  const isBrand = account.accountType === "brand";
  const campaigns = isBrand ? await listBrandCampaigns(supabase, account.userId) : null;
  const applications = isBrand ? null : await listAthleteApplications(supabase, account.userId);

  return (
    <PageMain width="narrow">
      {/* No visible title for now; the heading is for screen readers. */}
      <h1 className="sr-only">Dashboard</h1>
      {campaigns && (
        <section aria-labelledby="campaigns-heading" className="mb-8 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <h2 id="campaigns-heading" className="text-lg font-bold tracking-tight">
              Campaigns
            </h2>
            <Link
              href="/dashboard/campaigns/new"
              className={`${primaryButton} px-4 py-2 text-sm tracking-wide uppercase`}
            >
              New campaign
            </Link>
          </div>
          {notice === "not-deleted" && (
            <p
              role="status"
              className="rounded-button border border-foreground/15 px-4 py-3 text-sm"
            >
              An athlete applied before the campaign was deleted, so it&apos;s still here. Campaigns
              with applications can&apos;t be deleted.
            </p>
          )}
          <CampaignList campaigns={campaigns} />
        </section>
      )}
      {applications && (
        <section aria-labelledby="applications-heading" className="mb-8 flex flex-col gap-4">
          <h2 id="applications-heading" className="text-lg font-bold tracking-tight">
            Your applications
          </h2>
          <ApplicationList applications={applications} />
        </section>
      )}
      <form action={signOut}>
        <SubmitButton
          pendingLabel="Signing out…"
          className={`${secondaryButton} w-full px-4 py-3 text-sm tracking-wide uppercase`}
        >
          Sign out
        </SubmitButton>
      </form>
    </PageMain>
  );
}
