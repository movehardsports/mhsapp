import { todayIsoDate } from "@/lib/validation";

// Whether applications to a campaign are closed: its deadline has passed. Deadlines are UTC
// dates (YYYY-MM-DD), like the database's check on new applications; the deadline day itself
// is still open.
export function isCampaignClosed(deadline: string | null, today = todayIsoDate()) {
  return deadline !== null && deadline < today;
}
