import { expect, type Page, test, type TestInfo } from "@playwright/test";
import { completeBrandOnboarding, signUp } from "./auth";
import { accessToken, rest, userId } from "./supabase";

const campaign = (brandId: string) => ({
  brand_id: brandId,
  type: "event",
  title: "Spring Hyrox Open",
  description: "Line one\nLine two",
  sports: ["hyrox"],
});

test("a brand creates its own campaign, and guests can read it", async ({ page }, testInfo) => {
  await signUp(page, testInfo, { accountType: "Brand" });
  await completeBrandOnboarding(page);
  const id = await userId(page.context());

  const created = await rest("campaigns", {
    method: "POST",
    token: await accessToken(page.context()),
    body: campaign(id),
  });
  expect(created.status).toBe(201);

  const read = await rest(`campaigns?brand_id=eq.${id}&select=title,type,sports,deadline`);
  expect(await read.json()).toEqual([
    { title: "Spring Hyrox Open", type: "event", sports: ["hyrox"], deadline: null },
  ]);
});

test("a brand can't create a campaign for another brand", async ({ browser }, testInfo) => {
  const first = await browser.newPage();
  await signUp(first, testInfo, { accountType: "Brand" });
  await completeBrandOnboarding(first);
  const victim = await userId(first.context());

  const second = await browser.newPage();
  await signUp(second, testInfo, { accountType: "Brand" });
  await completeBrandOnboarding(second);

  const response = await rest("campaigns", {
    method: "POST",
    token: await accessToken(second.context()),
    body: campaign(victim),
  });
  expect(response.status).toBe(403);
});

test("an athlete can't create a campaign", async ({ page }, testInfo) => {
  await signUp(page, testInfo, { accountType: "Athlete" });
  const response = await rest("campaigns", {
    method: "POST",
    token: await accessToken(page.context()),
    body: campaign(await userId(page.context())),
  });
  // No brands row with the athlete's id, so the foreign key rejects it (409).
  expect(response.status).toBe(409);
});

test("guests can't create campaigns", async ({ page }, testInfo) => {
  await signUp(page, testInfo, { accountType: "Brand" });
  await completeBrandOnboarding(page);
  const response = await rest("campaigns", {
    method: "POST",
    body: campaign(await userId(page.context())),
  });
  expect(response.status).toBe(401);
});

test("the database rejects a blank or padded description", async ({ page }, testInfo) => {
  await signUp(page, testInfo, { accountType: "Brand" });
  await completeBrandOnboarding(page);
  const id = await userId(page.context());
  const token = await accessToken(page.context());

  for (const description of ["   ", "\nPadded\n"]) {
    const response = await rest("campaigns", {
      method: "POST",
      token,
      body: { ...campaign(id), description },
    });
    expect(response.status, JSON.stringify(description)).toBe(400);
  }
});

test.describe("updating and deleting", () => {
  // A brand with one campaign, as seen through the Data API.
  async function brandWithCampaign(page: Page, testInfo: TestInfo) {
    await signUp(page, testInfo, { accountType: "Brand" });
    await completeBrandOnboarding(page);
    const brandId = await userId(page.context());
    const token = await accessToken(page.context());
    const created = await rest("campaigns", {
      method: "POST",
      token,
      body: campaign(brandId),
    });
    expect(created.status).toBe(201);
    const [{ id }] = await (await rest(`campaigns?brand_id=eq.${brandId}&select=id`)).json();
    return { id: id as string, brandId, token };
  }

  const titleOf = async (id: string) =>
    (await (await rest(`campaigns?id=eq.${id}&select=title`)).json())[0]?.title;

  test("a brand updates and deletes its own campaign", async ({ page }, testInfo) => {
    const { id, token } = await brandWithCampaign(page, testInfo);

    const updated = await rest(`campaigns?id=eq.${id}`, {
      method: "PATCH",
      token,
      body: { title: "Renamed" },
    });
    expect(updated.status).toBe(204);
    expect(await titleOf(id)).toBe("Renamed");

    const deleted = await rest(`campaigns?id=eq.${id}`, { method: "DELETE", token });
    expect(deleted.status).toBe(204);
    expect(await titleOf(id)).toBeUndefined();
  });

  test("a brand can't move its campaign to another brand", async ({ browser }, testInfo) => {
    const first = await browser.newPage();
    const { id, token } = await brandWithCampaign(first, testInfo);
    const second = await browser.newPage();
    await signUp(second, testInfo, { accountType: "Brand" });
    await completeBrandOnboarding(second);

    const response = await rest(`campaigns?id=eq.${id}`, {
      method: "PATCH",
      token,
      body: { brand_id: await userId(second.context()) },
    });
    // No update grant on brand_id: permission denied.
    expect(response.status).toBe(403);
    await first.close();
    await second.close();
  });

  test("another brand can't update or delete it", async ({ browser }, testInfo) => {
    const owner = await browser.newPage();
    const { id } = await brandWithCampaign(owner, testInfo);
    const other = await browser.newPage();
    await signUp(other, testInfo, { accountType: "Brand" });
    await completeBrandOnboarding(other);
    const token = await accessToken(other.context());

    // RLS hides the row from the update and delete, so nothing changes and nothing errors.
    const updated = await rest(`campaigns?id=eq.${id}`, {
      method: "PATCH",
      token,
      body: { title: "Hijacked" },
    });
    expect(updated.status).toBe(204);
    const deleted = await rest(`campaigns?id=eq.${id}`, { method: "DELETE", token });
    expect(deleted.status).toBe(204);
    expect(await titleOf(id)).toBe("Spring Hyrox Open");
    await owner.close();
    await other.close();
  });

  test("guests can't update or delete it", async ({ page }, testInfo) => {
    const { id } = await brandWithCampaign(page, testInfo);
    const updated = await rest(`campaigns?id=eq.${id}`, {
      method: "PATCH",
      body: { title: "Hijacked" },
    });
    expect(updated.status).toBe(401);
    const deleted = await rest(`campaigns?id=eq.${id}`, { method: "DELETE" });
    expect(deleted.status).toBe(401);
    expect(await titleOf(id)).toBe("Spring Hyrox Open");
  });
});
