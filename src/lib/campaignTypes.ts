import type { Database } from "@/lib/supabase/database.types";

export const campaignTypes = ["sponsorship", "event", "ambassador"] as const;

export type CampaignType = (typeof campaignTypes)[number];

export const campaignTypeLabels: Record<CampaignType, string> = {
  sponsorship: "Sponsorship",
  event: "Event",
  ambassador: "Ambassador",
};

export function isCampaignType(value: unknown): value is CampaignType {
  return campaignTypes.includes(value as CampaignType);
}

// The database stores the type as the `campaign_type` enum (supabase/migrations). This fails
// typecheck when the two lists drift apart; regenerate the types with `npm run db:types`.
type DatabaseCampaignType = Database["public"]["Enums"]["campaign_type"];
type Assert<T extends true> = T;
export type CampaignTypesMatchDatabase = Assert<
  [CampaignType] extends [DatabaseCampaignType]
    ? [DatabaseCampaignType] extends [CampaignType]
      ? true
      : false
    : false
>;
