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
