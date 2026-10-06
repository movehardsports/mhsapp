import { expect, test } from "@playwright/test";
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
