import type { Metadata } from "next";
import { redirect } from "next/navigation";
import SignOutButton from "@/components/auth/SignOutButton";
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

  return (
    <main className="mx-auto w-full max-w-sm px-4 py-16 lg:max-w-lg">
      {/* No visible title for now; the heading is for screen readers. */}
      <h1 className="sr-only">Dashboard</h1>
      <form action={signOut}>
        <SignOutButton className="w-full rounded-button border border-foreground/15 px-4 py-3 text-sm tracking-wide uppercase transition-colors hover:bg-foreground/5" />
      </form>
    </main>
  );
}
