import { type CampaignType, isCampaignType } from "@/lib/campaigns/campaignTypes";
import type { Sport } from "@/lib/sports";
import type { Parsed } from "@/lib/types";
import {
  cleanMultilineText,
  cleanText,
  parseDeadline,
  parseSports,
  todayIsoDate,
} from "@/lib/validation";

// Field limits, used by the form's maxLength and by the parser below. The database checks the
// same limits (supabase/migrations/20261006184543_create_campaigns.sql).
export const CAMPAIGN_TITLE_MAX = 100;
export const CAMPAIGN_DESCRIPTION_MAX = 5000;

// What the user typed, as strings, to echo back into the form after an error.
export type CampaignValues = {
  type: string;
  title: string;
  description: string;
  sports: string[];
  deadline: string;
};

// A checked campaign, ready to save.
export type CampaignInput = {
  type: CampaignType;
  title: string;
  description: string;
  sports: Sport[];
  deadline: string | null;
};

export function readCampaignValues(formData: FormData): CampaignValues {
  return {
    type: String(formData.get("type") ?? ""),
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    sports: formData.getAll("sports").map(String),
    deadline: String(formData.get("deadline") ?? ""),
  };
}

// Reads and checks the campaign form. `savedDeadline` is the campaign's deadline when editing,
// which may stay as it is even once it has passed. `today` is YYYY-MM-DD in UTC.
export function parseCampaign(
  formData: FormData,
  savedDeadline: string | null = null,
  today = todayIsoDate()
): Parsed<CampaignValues, CampaignInput> {
  const values = readCampaignValues(formData);
  const fail = (message: string) => ({ ok: false as const, values, message });

  // The browser checks most of this too, but a form posted before hydration (or by hand)
  // skips that. The database enforces the same rules once more.
  if (!isCampaignType(values.type)) return fail("Choose a campaign type.");
  const title = cleanText(values.title, CAMPAIGN_TITLE_MAX);
  if (!title) return fail(`Enter a title (one line, up to ${CAMPAIGN_TITLE_MAX} characters).`);
  const description = cleanMultilineText(values.description, CAMPAIGN_DESCRIPTION_MAX);
  if (!description) {
    return fail(`Enter a description (up to ${CAMPAIGN_DESCRIPTION_MAX} characters).`);
  }
  const sports = parseSports(values.sports);
  if (!sports) return fail("Choose at least one sport.");
  const deadline = parseDeadline(values.deadline, today, savedDeadline);
  if (!deadline.ok) return fail("Pick a deadline from today on, or leave it empty.");

  return {
    ok: true,
    values,
    input: { type: values.type, title, description, sports, deadline: deadline.deadline },
  };
}
