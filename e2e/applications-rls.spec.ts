import { type Browser, expect, type Page, test, type TestInfo } from "@playwright/test";
import { completeAthleteOnboarding, completeBrandOnboarding, signUp } from "./auth";
import { createCampaign, isoDate } from "./campaigns";
import { accessToken, rest, userId } from "./supabase";

// The rules on applications, through the Data API with the publishable key, as each user.

const extraPages: Page[] = [];
test.afterEach(async () => {
  await Promise.all(extraPages.splice(0).map((page) => page.close()));
});
async function newUser(browser: Browser, testInfo: TestInfo, accountType: "Athlete" | "Brand") {
  const page = await browser.newPage();
  extraPages.push(page);
  await signUp(page, testInfo, { accountType });
  if (accountType === "Brand") await completeBrandOnboarding(page);
  else await completeAthleteOnboarding(page);
  return { page, id: await userId(page.context()), token: await accessToken(page.context()) };
}

const apply = (token: string, body: Record<string, unknown>) =>
  rest("applications", { method: "POST", token, body });

test("athletes apply only as themselves, once, to open campaigns", async ({
  browser,
}, testInfo) => {
  const brand = await newUser(browser, testInfo, "Brand");
  const open = await createCampaign(brand.page);
  const closed = await createCampaign(brand.page, { deadline: isoDate(-1) });
  const athlete = await newUser(browser, testInfo, "Athlete");
  const other = await newUser(browser, testInfo, "Athlete");

  const application = { campaign_id: open, athlete_id: athlete.id, message: "Hi" };
  expect((await apply(athlete.token, application)).status).toBe(201);
  // Once per campaign.
  expect((await apply(athlete.token, application)).status).toBe(409);
  // Not for someone else, not to a closed campaign, not as a brand, not as a guest.
  expect((await apply(other.token, application)).status).toBe(403);
  const toClosed = await apply(other.token, {
    ...application,
    campaign_id: closed,
    athlete_id: other.id,
  });
  expect(toClosed.status).toBe(403);
  const asBrand = await apply(brand.token, { ...application, athlete_id: brand.id });
  // RLS passes (it's the brand's own id), then the foreign key to athletes refuses it.
  expect(asBrand.status).toBe(409);
  expect((await rest("applications", { method: "POST", body: application })).status).toBe(401);
  // New applications are always pending: status has no insert grant.
  const withStatus = await apply(other.token, {
    ...application,
    athlete_id: other.id,
    status: "accepted",
  });
  expect(withStatus.status).toBe(403);
});

test("only the athlete and the campaign's brand read an application", async ({
  browser,
}, testInfo) => {
  const brand = await newUser(browser, testInfo, "Brand");
  const campaign = await createCampaign(brand.page);
  const athlete = await newUser(browser, testInfo, "Athlete");
  const otherAthlete = await newUser(browser, testInfo, "Athlete");
  const otherBrand = await newUser(browser, testInfo, "Brand");
  await apply(athlete.token, { campaign_id: campaign, athlete_id: athlete.id, message: "Hi" });

  const read = async (token?: string) => {
    const response = await rest(`applications?campaign_id=eq.${campaign}&select=message`, {
      token,
    });
    return response.status === 200
      ? ((await response.json()) as unknown[]).length
      : response.status;
  };
  expect(await read(athlete.token)).toBe(1);
  expect(await read(brand.token)).toBe(1);
  expect(await read(otherAthlete.token)).toBe(0);
  expect(await read(otherBrand.token)).toBe(0);
  expect(await read()).toBe(401);

  // Nor through an embed on the public campaigns.
  const embedded = await rest(`campaigns?id=eq.${campaign}&select=id,applications(message)`, {
    token: otherBrand.token,
  });
  expect(await embedded.json()).toEqual([{ id: campaign, applications: [] }]);

  // The campaign's brand sees the athlete's public profile, never their last name.
  const profile = await rest(
    `applications?campaign_id=eq.${campaign}&select=athletes(first_name,athlete_private(last_name))`,
    { token: brand.token }
  );
  expect(await profile.json()).toEqual([
    { athletes: { first_name: "Jane", athlete_private: null } },
  ]);
});

test("only pending applications can be withdrawn, and only by their athlete", async ({
  browser,
}, testInfo) => {
  const brand = await newUser(browser, testInfo, "Brand");
  const campaign = await createCampaign(brand.page);
  const athlete = await newUser(browser, testInfo, "Athlete");
  await apply(athlete.token, { campaign_id: campaign, athlete_id: athlete.id, message: "Hi" });
  const path = `applications?campaign_id=eq.${campaign}&athlete_id=eq.${athlete.id}`;

  // Nobody can change an application yet (no update grant), its status included.
  const patched = await rest(path, {
    method: "PATCH",
    token: brand.token,
    body: { status: "accepted" },
  });
  expect(patched.status).toBe(403);

  // The brand can't delete it; RLS skips the row without an error.
  await rest(path, { method: "DELETE", token: brand.token });
  const stillThere = await rest(`${path}&select=status`, { token: athlete.token });
  expect(await stillThere.json()).toEqual([{ status: "pending" }]);

  // The athlete can, while it's pending.
  expect((await rest(path, { method: "DELETE", token: athlete.token })).status).toBe(204);
  const gone = await rest(`${path}&select=status`, { token: athlete.token });
  expect(await gone.json()).toEqual([]);
});

test("a campaign with applications can't be deleted", async ({ browser }, testInfo) => {
  const brand = await newUser(browser, testInfo, "Brand");
  const campaign = await createCampaign(brand.page);
  const athlete = await newUser(browser, testInfo, "Athlete");
  await apply(athlete.token, { campaign_id: campaign, athlete_id: athlete.id, message: "Hi" });

  const deleted = await rest(`campaigns?id=eq.${campaign}`, {
    method: "DELETE",
    token: brand.token,
  });
  expect(deleted.status).toBe(409);
  expect((await deleted.json()).code).toBe("23503");
});
