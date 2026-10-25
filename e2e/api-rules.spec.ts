import { expect, test } from "@playwright/test";
import { signUp } from "./auth";
import { uniqueEmail } from "./mailpit";
import { accessToken, auth, rest, userId } from "./supabase";

// Rules the app checks in its forms, enforced again by the database and Auth for requests that
// skip the app and call the APIs directly with the publishable key.

const thisYear = new Date().getUTCFullYear();

const profile = (birthYear: number) => ({
  p_first_name: "Jane",
  p_last_name: "Doe",
  p_nickname: "JD",
  p_birth_year: birthYear,
  p_city: "Warsaw",
  p_sports: ["hyrox"],
});

test("athletes must be 18 or older, however they save their profile", async ({
  page,
}, testInfo) => {
  await signUp(page, testInfo, { accountType: "Athlete" });
  const token = await accessToken(page.context());

  const tooYoung = await rest("rpc/save_athlete_profile", {
    method: "POST",
    token,
    body: profile(thisYear - 17),
  });
  expect(tooYoung.status).toBe(400);
  expect((await tooYoung.json()).code).toBe("23514");

  // Turning 18 this year is old enough.
  const saved = await rest("rpc/save_athlete_profile", {
    method: "POST",
    token,
    body: profile(thisYear - 18),
  });
  expect(saved.status).toBe(204);

  // Changing only the birth year, straight on the table, is checked too.
  const id = await userId(page.context());
  const updated = await rest(`athletes?id=eq.${id}`, {
    method: "PATCH",
    token,
    body: { birth_year: thisYear - 10 },
  });
  expect(updated.status).toBe(400);
  expect((await updated.json()).code).toBe("23514");
  const [row] = await (await rest(`athletes?id=eq.${id}&select=birth_year`)).json();
  expect(row.birth_year).toBe(thisYear - 18);
});

test("names and descriptions need a visible character", async ({ page }, testInfo) => {
  await signUp(page, testInfo, { accountType: "Brand" });
  const token = await accessToken(page.context());
  const brandId = await userId(page.context());

  // A zero-width space alone isn't a name (the trimmed_text domain).
  const invisible = await rest("rpc/save_brand_profile", {
    method: "POST",
    token,
    body: { p_name: "\u200B", p_sports: ["hyrox"] },
  });
  expect(invisible.status).toBe(400);
  expect((await invisible.json()).code).toBe("23514");

  const saved = await rest("rpc/save_brand_profile", {
    method: "POST",
    token,
    body: { p_name: "\u200BMove Hard", p_sports: ["hyrox"] },
  });
  expect(saved.status).toBe(204);

  // Nor is a campaign description made of invisible characters.
  const campaign = await rest("campaigns", {
    method: "POST",
    token,
    body: {
      brand_id: brandId,
      type: "event",
      title: "Spring Hyrox Open",
      description: "\u200B\u2060",
      sports: ["hyrox"],
    },
  });
  expect(campaign.status).toBe(400);
  expect((await campaign.json()).code).toBe("23514");
});

test("passwords need at least 8 characters", async ({}, testInfo) => {
  const signUpWith = (password: string) =>
    auth("signup", {
      email: uniqueEmail(testInfo),
      password,
      data: { account_type: "athlete" },
    });

  const short = await signUpWith("1234567");
  expect(short.status).toBe(422);
  expect((await short.json()).error_code).toBe("weak_password");

  expect((await signUpWith("12345678")).status).toBe(200);
});
