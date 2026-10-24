import type { Sport } from "@/lib/sports";
import type { Parsed } from "@/lib/types";
import { cleanText, parseSports } from "@/lib/validation";

// Field limits, used by the forms' maxLength and by the parsers below. The database checks the
// same limits (supabase/migrations/20261004184142_create_athletes_and_brands.sql).
export const NAME_MAX = 100;
export const NICKNAME_MAX = 50;
export const CITY_MAX = 100;

export const MIN_AGE = 18;
const MAX_AGE = 100;

// We only store the birth year, so "18 or older" means turning 18 this year at the latest.
// The year is the UTC one, like the database's check (supabase/migrations).
export function birthYearRange(today = new Date()) {
  const year = today.getUTCFullYear();
  return { min: year - MAX_AGE, max: year - MIN_AGE };
}

export function parseBirthYear(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !/^\d{4}$/.test(value.trim())) return null;
  return Number(value.trim());
}

// What the user typed, as strings, to echo back into the form after an error.
export type AthleteProfileValues = {
  firstName: string;
  lastName: string;
  nickname: string;
  birthYear: string;
  city: string;
  sports: string[];
};

// A checked athlete profile, ready to save. The last name is private to the athlete.
export type AthleteProfileInput = {
  firstName: string;
  lastName: string;
  nickname: string;
  birthYear: number;
  city: string;
  sports: Sport[];
};

// Reads and checks the athlete onboarding form. `today` decides the allowed birth years.
export function parseAthleteProfile(
  formData: FormData,
  today = new Date()
): Parsed<AthleteProfileValues, AthleteProfileInput> {
  const values: AthleteProfileValues = {
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    nickname: String(formData.get("nickname") ?? ""),
    birthYear: String(formData.get("birthYear") ?? ""),
    city: String(formData.get("city") ?? ""),
    sports: formData.getAll("sports").map(String),
  };
  const fail = (message: string) => ({ ok: false as const, values, message });

  // The browser checks most of this too, but a form posted before hydration (or by hand)
  // skips that. The database enforces the same rules once more.
  const firstName = cleanText(values.firstName, NAME_MAX);
  if (!firstName) return fail(`Enter your first name (up to ${NAME_MAX} characters).`);
  const lastName = cleanText(values.lastName, NAME_MAX);
  if (!lastName) return fail(`Enter your last name (up to ${NAME_MAX} characters).`);
  const nickname = cleanText(values.nickname, NICKNAME_MAX);
  if (!nickname) return fail(`Enter a nickname (up to ${NICKNAME_MAX} characters).`);
  const birthYear = parseBirthYear(values.birthYear);
  const { min, max } = birthYearRange(today);
  if (birthYear === null || birthYear < min || birthYear > max) {
    return fail(`Enter your year of birth. You must be ${MIN_AGE} or older to join.`);
  }
  const city = cleanText(values.city, CITY_MAX);
  if (!city) return fail(`Enter your city (up to ${CITY_MAX} characters).`);
  const sports = parseSports(values.sports);
  if (!sports) return fail("Choose at least one sport.");

  return {
    ok: true,
    values,
    input: { firstName, lastName, nickname, birthYear, city, sports },
  };
}

export type BrandProfileValues = {
  brandName: string;
  sports: string[];
};

export type BrandProfileInput = {
  name: string;
  sports: Sport[];
};

// Reads and checks the brand onboarding form.
export function parseBrandProfile(
  formData: FormData
): Parsed<BrandProfileValues, BrandProfileInput> {
  const values: BrandProfileValues = {
    brandName: String(formData.get("brandName") ?? ""),
    sports: formData.getAll("sports").map(String),
  };
  const fail = (message: string) => ({ ok: false as const, values, message });

  // The browser checks this too, but a form posted before hydration (or by hand) skips that.
  // The database enforces the same rules once more.
  const name = cleanText(values.brandName, NAME_MAX);
  if (!name) return fail(`Enter your brand name (up to ${NAME_MAX} characters).`);
  const sports = parseSports(values.sports);
  if (!sports) return fail("Choose at least one sport.");

  return { ok: true, values, input: { name, sports } };
}
