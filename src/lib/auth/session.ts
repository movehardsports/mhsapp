import { redirect } from "next/navigation";
import { type AccountType, isAccountType, onboardingPath } from "@/lib/accountTypes";
import { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Whether a user is signed in. getClaims verifies the token instead of trusting the cookie
// as-is, unlike getSession.
export async function isSignedIn() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return Boolean(data?.claims.sub);
}

// The signed-in user's id and account type, or null for guests. The account type comes from
// the profiles table: user_metadata has it too, but users can edit that. Throws when the
// profile can't be read, rather than treating a signed-in user as a guest.
export async function getAccount(supabase: Supabase) {
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(`Reading the profile failed: ${error.code}`);
  // The sign-up trigger creates a profile for every user, so a missing one is a bug.
  if (!isAccountType(profile?.account_type)) throw new Error("The signed-in user has no profile");

  return { userId, accountType: profile.account_type };
}

// For the onboarding pages and their actions: sends guests to sign in, and other account
// types to their own onboarding.
export async function requireAccount(supabase: Supabase, accountType: AccountType) {
  const account = await getAccount(supabase);
  if (!account) redirect("/sign-in");
  if (account.accountType !== accountType) redirect(onboardingPath(account.accountType));
  return account;
}

// Whether the user has saved their onboarding, i.e. has an athlete or brand profile.
export async function hasOnboarded(
  supabase: Supabase,
  account: { userId: string; accountType: AccountType }
) {
  const table = account.accountType === "athlete" ? "athletes" : "brands";
  const { data, error } = await supabase
    .from(table)
    .select("id")
    .eq("id", account.userId)
    .maybeSingle();
  if (error) throw new Error(`Reading the ${table} profile failed: ${error.code}`);
  return data !== null;
}
