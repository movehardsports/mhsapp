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

// Multi-line text from a textarea: line endings become "\n" (browsers submit "\r\n") and the
// surrounding whitespace is trimmed. Null when it's blank or too long.
export function cleanMultilineText(value: FormDataEntryValue | null, maxLength: number) {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/\r\n?/g, "\n").trim();
  if (cleaned === "" || cleaned.length > maxLength) return null;
  return cleaned;
}

// The picked sports, de-duplicated, keeping only known ones. Null when none are left.
export function parseSports(values: FormDataEntryValue[]) {
  const sports = [...new Set(values)].filter(isSport) as Sport[];
  return sports.length > 0 ? sports : null;
}

// Today's date as YYYY-MM-DD, in UTC, the same on the server and in the form's `min`.
export function todayIsoDate(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

// An optional date input: empty means no deadline; otherwise a real date, not before today.
// `current` is the saved deadline when editing: keeping it is fine even once it has passed.
export function parseDeadline(
  value: FormDataEntryValue | null,
  today: string,
  current: string | null = null
): { ok: true; deadline: string | null } | { ok: false } {
  if (value === null || value === "") return { ok: true, deadline: null };
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return { ok: false };
  // Rejects dates like 2026-02-30, which Date would roll over into March.
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    return { ok: false };
  }
  // Only the "not before today" rule makes an exception for the saved deadline.
  return value >= today || value === current ? { ok: true, deadline: value } : { ok: false };
}

// A UUID in its canonical text form, e.g. a campaign id from the URL. Checking it first turns
// a mistyped link into a 404 instead of a database error.
export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
