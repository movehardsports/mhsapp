export const MIN_AGE = 18;
const MAX_AGE = 100;

// We only store the birth year, so "18 or older" means turning 18 this year at the latest.
export function birthYearRange(today = new Date()) {
  const year = today.getFullYear();
  return { min: year - MAX_AGE, max: year - MIN_AGE };
}

export function parseBirthYear(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !/^\d{4}$/.test(value.trim())) return null;
  return Number(value.trim());
}
