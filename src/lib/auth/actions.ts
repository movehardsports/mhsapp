"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signOut() {
  const supabase = await createClient();
  // Signs out this device only; other sessions of the user stay signed in.
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) console.error("Sign-out failed", error.code, error.message);

  revalidatePath("/", "layout");
  redirect("/");
}
