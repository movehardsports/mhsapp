"use server";

import { redirect } from "next/navigation";
import { requireOnboardedBrand } from "@/lib/auth/session";
import { isCampaignType } from "@/lib/campaignTypes";
import { createClient } from "@/lib/supabase/server";
import {
  cleanMultilineText,
  cleanText,
  parseDeadline,
  parseSports,
  todayIsoDate,
} from "@/lib/validation";

export type CampaignValues = {
  type: string;
  title: string;
  description: string;
  sports: string[];
  deadline: string;
};

export type CampaignFormState =
  | { status: "idle" }
  // Echo back what the user typed so the form keeps it after an error.
  | { status: "error"; message: string; values: CampaignValues };

export async function createCampaign(
  _prevState: CampaignFormState,
  formData: FormData
): Promise<CampaignFormState> {
  const supabase = await createClient();
  // The page checks this too, but the action can be posted to directly.
  const { userId } = await requireOnboardedBrand(supabase);

  const values: CampaignValues = {
    type: String(formData.get("type") ?? ""),
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    sports: formData.getAll("sports").map(String),
    deadline: String(formData.get("deadline") ?? ""),
  };
  const fail = (message: string): CampaignFormState => ({ status: "error", message, values });

  // The browser checks most of this too, but a form posted before hydration (or by hand)
  // skips that. The database enforces the same rules once more.
  if (!isCampaignType(values.type)) return fail("Choose a campaign type.");
  const title = cleanText(values.title, 100);
  if (!title) return fail("Enter a title (one line, up to 100 characters).");
  const description = cleanMultilineText(values.description, 5000);
  if (!description) return fail("Enter a description (up to 5000 characters).");
  const sports = parseSports(values.sports);
  if (!sports) return fail("Choose at least one sport.");
  const deadline = parseDeadline(values.deadline, todayIsoDate());
  if (!deadline.ok) return fail("Pick a deadline from today on, or leave it empty.");

  // brand_id comes from the verified token, never from the form; RLS checks it again.
  const { error } = await supabase.from("campaigns").insert({
    brand_id: userId,
    type: values.type,
    title,
    description,
    sports,
    deadline: deadline.deadline,
  });
  if (error) {
    console.error("Creating a campaign failed", error.code, error.message);
    return fail("We couldn't create the campaign. Try again.");
  }

  redirect("/dashboard");
}
