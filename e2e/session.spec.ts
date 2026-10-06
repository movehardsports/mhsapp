import { type BrowserContext, expect, test } from "@playwright/test";
import { signUp } from "./auth";
import { readSession } from "./supabase";

// @supabase/ssr splits the session cookie into chunks of this many characters.
const MAX_CHUNK_SIZE = 3180;

// Makes the stored access token look expired, so the next request has to refresh the session.
async function expireSession(context: BrowserContext) {
  const { session, chunks } = await readSession(context);
  session.expires_at = Math.floor(Date.now() / 1000) - 60;
  const value = "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");

  // Write it back the way @supabase/ssr does: one cookie, or `.0`, `.1`, … chunks when long.
  const [first] = chunks;
  const baseName = first.name.replace(/\.\d+$/, "");
  const parts = value.match(new RegExp(`.{1,${MAX_CHUNK_SIZE}}`, "g")) ?? [];
  await context.clearCookies({ name: /^sb-.+-auth-token(\.\d+)?$/ });
  await context.addCookies(
    parts.map((part, i) => ({
      name: parts.length === 1 ? baseName : `${baseName}.${i}`,
      value: part,
      domain: first.domain,
      path: first.path,
    }))
  );
  return session.refresh_token as string;
}

test("an expired session is refreshed and stays signed in", async ({ page, context }, testInfo) => {
  // Signing up and confirming signs the page in.
  await signUp(page, testInfo);
  const oldRefreshToken = await expireSession(context);

  await page.goto("/");
  const banner = page.getByRole("banner");
  await expect(banner.getByRole("link", { name: "Dashboard" }).first()).toBeAttached();
  // The proxy refreshed the session and saved the new tokens in the browser.
  const { session } = await readSession(context);
  expect(session.refresh_token).not.toBe(oldRefreshToken);
  expect(session.expires_at * 1000).toBeGreaterThan(Date.now());
});
