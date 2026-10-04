import { createClient } from "@/lib/supabase/server";

// The signed-in user's email, or null for guests. getClaims verifies the token instead of
// trusting the cookie as-is, unlike getSession.
export async function getSignedInEmail() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = data?.claims.email;
  return typeof email === "string" && email !== "" ? email : null;
}
