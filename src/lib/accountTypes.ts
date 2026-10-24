import type { Database } from "@/lib/supabase/database.types";
import type { Assert, SameUnion } from "@/lib/types";

export const accountTypes = ["athlete", "brand"] as const;

export type AccountType = (typeof accountTypes)[number];

export const accountTypeLabels: Record<AccountType, string> = {
  athlete: "Athlete",
  brand: "Brand",
};

export function isAccountType(value: unknown): value is AccountType {
  return accountTypes.includes(value as AccountType);
}

// Each account type has its own page under src/app/onboarding/.
export function onboardingPath(accountType: AccountType) {
  return `/onboarding/${accountType}`;
}

// The database stores the type as the `account_type` enum (supabase/migrations). This fails
// typecheck when the two lists drift apart; regenerate the types with `npm run db:types`.
type DatabaseAccountType = Database["public"]["Enums"]["account_type"];
export type AccountTypesMatchDatabase = Assert<SameUnion<AccountType, DatabaseAccountType>>;
