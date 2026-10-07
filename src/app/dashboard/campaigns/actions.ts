"use server";

import { redirect } from "next/navigation";
import { requireOnboardedBrand } from "@/lib/auth/session";
import { isCampaignType } from "@/lib/campaignTypes";
import { createClient } from "@/lib/supabase/server";
import {
  cleanMultilineText,
  cleanText,
  isUuid,
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

// What the user typed, to echo back after an error.
function readValues(formData: FormData): CampaignValues {
  return {
    type: String(formData.get("type") ?? ""),
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    sports: formData.getAll("sports").map(String),
    deadline: String(formData.get("deadline") ?? ""),
  };
}

// Reads and checks the campaign form. `savedDeadline` is the campaign's deadline when editing,
// which may stay as it is even once it has passed.
function parseCampaign(formData: FormData, savedDeadline: string | null = null) {
  const values = readValues(formData);
  const fail = (message: string) => ({ ok: false as const, values, message });

  // The browser checks most of this too, but a form posted before hydration (or by hand)
  // skips that. The database enforces the same rules once more.
  if (!isCampaignType(values.type)) return fail("Choose a campaign type.");
  const title = cleanText(values.title, 100);
  if (!title) return fail("Enter a title (one line, up to 100 characters).");
  const description = cleanMultilineText(values.description, 5000);
  if (!description) return fail("Enter a description (up to 5000 characters).");
  const sports = parseSports(values.sports);
  if (!sports) return fail("Choose at least one sport.");
  const deadline = parseDeadline(values.deadline, todayIsoDate(), savedDeadline);
  if (!deadline.ok) return fail("Pick a deadline from today on, or leave it empty.");

  return {
    ok: true as const,
    values,
    campaign: { type: values.type, title, description, sports, deadline: deadline.deadline },
  };
}

export async function createCampaign(
  _prevState: CampaignFormState,
  formData: FormData
): Promise<CampaignFormState> {
  const supabase = await createClient();
  // The page checks this too, but the action can be posted to directly.
  const { userId } = await requireOnboardedBrand(supabase);

  const parsed = parseCampaign(formData);
  if (!parsed.ok) return { status: "error", message: parsed.message, values: parsed.values };

  // brand_id comes from the verified token, never from the form; RLS checks it again.
  const { error } = await supabase
    .from("campaigns")
    .insert({ brand_id: userId, ...parsed.campaign });
  if (error) {
    console.error("Creating a campaign failed", error.code, error.message);
    return {
      status: "error",
      message: "We couldn't create the campaign. Try again.",
      values: parsed.values,
    };
  }

  redirect("/dashboard");
}

// Bound to the campaign's id by the edit page.
export async function updateCampaign(
  campaignId: string,
  _prevState: CampaignFormState,
  formData: FormData
): Promise<CampaignFormState> {
  const supabase = await createClient();
  const { userId } = await requireOnboardedBrand(supabase);
  if (!isUuid(campaignId)) redirect("/dashboard");

  // Only the brand's own campaign; the saved deadline decides whether a past one may stay.
  const { data: saved, error: readError } = await supabase
    .from("campaigns")
    .select("deadline")
    .eq("id", campaignId)
    .eq("brand_id", userId)
    .maybeSingle();
  if (readError) throw new Error(`Reading the campaign failed: ${readError.code}`);
  // Deleted meanwhile (e.g. in another tab), or not this brand's: say so rather than retry.
  const gone = (): CampaignFormState => ({
    status: "error",
    message: "This campaign no longer exists.",
    values: readValues(formData),
  });
  if (!saved) return gone();

  const parsed = parseCampaign(formData, saved.deadline);
  if (!parsed.ok) return { status: "error", message: parsed.message, values: parsed.values };

  // RLS skips rows the brand doesn't own without an error, so ask for the updated row back:
  // none means the campaign went away after the read above.
  const { data, error } = await supabase
    .from("campaigns")
    .update(parsed.campaign)
    .eq("id", campaignId)
    .eq("brand_id", userId)
    .select("id");
  if (error) {
    console.error("Updating a campaign failed", error.code, error.message);
    return {
      status: "error",
      message: "We couldn't save the campaign. Try again.",
      values: parsed.values,
    };
  }
  if (data.length === 0) return gone();

  redirect("/dashboard");
}

// Bound to the campaign's id by DeleteCampaign (dashboard list and edit page).
export async function deleteCampaign(campaignId: string) {
  const supabase = await createClient();
  const { userId } = await requireOnboardedBrand(supabase);
  if (!isUuid(campaignId)) redirect("/dashboard");

  const { error } = await supabase
    .from("campaigns")
    .delete()
    .eq("id", campaignId)
    .eq("brand_id", userId);
  if (error) throw new Error(`Deleting the campaign failed: ${error.code}`);

  redirect("/dashboard");
}
