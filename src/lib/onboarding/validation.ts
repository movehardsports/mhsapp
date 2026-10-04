import { isSport, type Sport } from "@/lib/sports";

// Mirrors the database's trimmed_text domain: one line, no surrounding whitespace, not blank.
// Line and paragraph separators count as control characters too: some Postgres locales treat
// them that way.
// Returns the trimmed value, or null when it's blank, too long or spans several lines.
export function cleanText(value: FormDataEntryValue | null, maxLength: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed === "" || trimmed.length > maxLength || /[\p{Cc}\u2028\u2029]/u.test(trimmed)) {
    return null;
  }
  return trimmed;
}

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

// The picked sports, de-duplicated, keeping only known ones. Null when none are left.
export function parseSports(values: FormDataEntryValue[]) {
  const sports = [...new Set(values)].filter(isSport) as Sport[];
  return sports.length > 0 ? sports : null;
}
