import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import SignOutButton from "@/components/auth/SignOutButton";
import CampaignList from "@/components/campaigns/CampaignList";
import { primaryButton } from "@/components/ui/styles";
import { onboardingPath } from "@/lib/accountTypes";
import { signOut } from "@/lib/auth/actions";
import { getAccount, hasOnboarded } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const account = await getAccount(supabase);
  if (!account) redirect("/sign-in");
  // Users who skipped the onboarding land there until they finish it.
  if (!(await hasOnboarded(supabase, account))) redirect(onboardingPath(account.accountType));

  let campaigns = null;
  if (account.accountType === "brand") {
    const { data, error } = await supabase
      .from("campaigns")
      .select("id, type, title, sports, deadline")
      .eq("brand_id", account.userId)
      .order("created_at", { ascending: false });
    // An empty list would wrongly tell the brand it has no campaigns.
    if (error) throw new Error(`Reading the campaigns failed: ${error.code}`);
    campaigns = data;
  }

  return (
    <main className="mx-auto w-full max-w-sm px-4 py-16 lg:max-w-lg">
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
          <CampaignList campaigns={campaigns} />
        </section>
      )}
      <form action={signOut}>
        <SignOutButton className="w-full rounded-button border border-foreground/15 px-4 py-3 text-sm tracking-wide uppercase transition-colors hover:bg-foreground/5" />
      </form>
    </main>
  );
}
