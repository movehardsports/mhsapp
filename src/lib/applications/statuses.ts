import type { Database } from "@/lib/supabase/database.types";
import type { Assert, SameUnion } from "@/lib/types";

export const applicationStatuses = ["pending", "accepted", "rejected"] as const;

export type ApplicationStatus = (typeof applicationStatuses)[number];

export function isApplicationStatus(value: unknown): value is ApplicationStatus {
  return applicationStatuses.includes(value as ApplicationStatus);
}

export const applicationStatusLabels: Record<ApplicationStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  rejected: "Rejected",
};

// The database stores the status as the `application_status` enum (supabase/migrations). This
// fails typecheck when the two lists drift apart; regenerate the types with `npm run db:types`.
type DatabaseApplicationStatus = Database["public"]["Enums"]["application_status"];
export type ApplicationStatusesMatchDatabase = Assert<
  SameUnion<ApplicationStatus, DatabaseApplicationStatus>
>;
