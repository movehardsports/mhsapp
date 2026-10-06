import { existsSync } from "node:fs";
import { type BrowserContext, expect } from "@playwright/test";

// The tests talk to local Supabase with the same URL and publishable key as the app.
// Playwright doesn't read .env.local itself. CI has no such file and sets the variables in
// the environment instead; variables already set win over the file.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} for the e2e tests (see .env.local)`);
  return value;
}
const SUPABASE_URL = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const PUBLISHABLE_KEY = requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

// The Supabase session cookie: `sb-<ref>-auth-token`, split into `.0`, `.1`, … chunks when
// long, holding "base64-" plus the base64url-encoded session JSON.
export const isSessionCookie = (name: string) => /^sb-.+-auth-token(\.\d+)?$/.test(name);

export async function readSession(context: BrowserContext) {
  const chunks = (await context.cookies())
    .filter((cookie) => isSessionCookie(cookie.name))
    .sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true }));
  expect(chunks.length, "session cookie").toBeGreaterThan(0);
  const raw = chunks.map((cookie) => cookie.value).join("");
  const session = JSON.parse(Buffer.from(raw.replace(/^base64-/, ""), "base64url").toString());
  return { session, chunks };
}

export async function accessToken(context: BrowserContext) {
  return (await readSession(context)).session.access_token as string;
}

export async function userId(context: BrowserContext) {
  return (await readSession(context)).session.user.id as string;
}

// A Data API (PostgREST) request as a guest, or as the user whose access token is given.
export function rest(
  path: string,
  { method = "GET", token, body }: { method?: string; token?: string; body?: unknown } = {}
) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: PUBLISHABLE_KEY,
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(body !== undefined && { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
