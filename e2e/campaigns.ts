import { expect, type Page } from "@playwright/test";
import { accessToken, rest, userId } from "./supabase";

// YYYY-MM-DD in UTC, `days` from today; the app uses the UTC date too.
export const isoDate = (days = 0) =>
  new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

// Creates a campaign for the signed-in brand straight through the Data API and returns its id.
// The database doesn't check that the deadline is in the future, so this can also make one
// whose deadline has passed.
export async function createCampaign(
  page: Page,
  fields: { title?: string; description?: string; deadline?: string | null } = {}
) {
  const response = await rest("campaigns?select=id", {
    method: "POST",
    token: await accessToken(page.context()),
    prefer: "return=representation",
    body: {
      brand_id: await userId(page.context()),
      type: "event",
      title: "Spring Hyrox Open",
      description: "Race day in Warsaw.",
      sports: ["hyrox"],
      deadline: null,
      ...fields,
    },
  });
  expect(response.status).toBe(201);
  const [{ id }] = await response.json();
  return id as string;
}
