import { expect, type TestInfo } from "@playwright/test";

// Local Supabase catches outgoing email in Mailpit (see supabase/config.toml, [local_smtp]).
const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

// A fresh address per test, so parallel projects and repeated runs never share an account.
export function uniqueEmail(testInfo: TestInfo) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `e2e-${testInfo.project.name}-${suffix}@example.com`;
}

// Waits for the sign-up confirmation email sent to `email` and returns the path and query of
// its link. The link points at the Auth site URL (the dev server), so tests open the path on
// their own server instead.
export async function confirmationLinkPath(email: string) {
  let messageId: string | undefined;
  await expect
    .poll(async () => {
      const query = encodeURIComponent(`to:"${email}"`);
      const response = await fetch(`${MAILPIT_URL}/api/v1/search?query=${query}`);
      const { messages } = (await response.json()) as { messages: { ID: string }[] };
      messageId = messages[0]?.ID;
      return messageId;
    })
    .toBeTruthy();

  const response = await fetch(`${MAILPIT_URL}/api/v1/message/${messageId}`);
  const { HTML } = (await response.json()) as { HTML: string };
  const href = HTML.match(/href="([^"]*\/auth\/confirm\?[^"]*)"/)?.[1];
  if (!href) throw new Error(`No confirmation link in the email to ${email}`);

  const url = new URL(href.replaceAll("&amp;", "&"));
  return url.pathname + url.search;
}
