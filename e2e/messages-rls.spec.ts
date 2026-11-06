import { type Browser, expect, type Page, test, type TestInfo } from "@playwright/test";
import { newApiUser } from "./auth";
import { createCampaign } from "./campaigns";
import { rest } from "./supabase";

// The rules on the chat (messages and read state), through the Data API with the publishable
// key, as each user. The chat is the application: it opens when the brand first accepts it.

const extraPages: Page[] = [];
test.afterEach(async () => {
  await Promise.all(extraPages.splice(0).map((page) => page.close()));
});
const newUser = (browser: Browser, testInfo: TestInfo, accountType: "Athlete" | "Brand") =>
  newApiUser(browser, testInfo, accountType, extraPages);

type User = Awaited<ReturnType<typeof newUser>>;

// A brand's campaign with one application from an athlete; returns the application's id.
async function applicationFrom(brand: User, athlete: User) {
  const campaign = await createCampaign(brand.page);
  const response = await rest("applications", {
    method: "POST",
    token: athlete.token,
    body: { campaign_id: campaign, athlete_id: athlete.id, message: "Hi" },
    prefer: "return=representation",
  });
  expect(response.status).toBe(201);
  return ((await response.json()) as { id: string }[])[0].id;
}

const setStatus = (brand: User, applicationId: string, status: string) =>
  rest(`applications?id=eq.${applicationId}`, {
    method: "PATCH",
    token: brand.token,
    body: { status },
  });

const send = (token: string | undefined, body: Record<string, unknown>) =>
  rest("messages", { method: "POST", token, body });

async function readMessages(token: string | undefined, applicationId: string) {
  const response = await rest(
    `messages?application_id=eq.${applicationId}&select=kind,sender_id,body&order=created_at,id`,
    { token }
  );
  return response.status === 200
    ? ((await response.json()) as { kind: string; sender_id: string | null; body: string | null }[])
    : response.status;
}

const kinds = async (token: string, applicationId: string) => {
  const messages = await readMessages(token, applicationId);
  return typeof messages === "number" ? messages : messages.map((m) => m.kind);
};

test("a chat opens on acceptance with a system entry", async ({ browser }, testInfo) => {
  const brand = await newUser(browser, testInfo, "Brand");
  const athlete = await newUser(browser, testInfo, "Athlete");
  const application = await applicationFrom(brand, athlete);

  // No chat before the brand accepts.
  const early = await send(athlete.token, {
    application_id: application,
    sender_id: athlete.id,
    body: "Hello?",
  });
  expect(early.status).toBe(403);

  expect((await setStatus(brand, application, "accepted")).status).toBe(204);
  const entry = [{ kind: "accepted", sender_id: null, body: null }];
  expect(await readMessages(athlete.token, application)).toEqual(entry);
  expect(await readMessages(brand.token, application)).toEqual(entry);
});

test("only the two sides read and write", async ({ browser }, testInfo) => {
  const brand = await newUser(browser, testInfo, "Brand");
  const athlete = await newUser(browser, testInfo, "Athlete");
  const otherBrand = await newUser(browser, testInfo, "Brand");
  const otherAthlete = await newUser(browser, testInfo, "Athlete");
  const application = await applicationFrom(brand, athlete);
  await setStatus(brand, application, "accepted");

  const message = (user: User, body: string) => ({
    application_id: application,
    sender_id: user.id,
    body,
  });
  expect((await send(athlete.token, message(athlete, "Hi from the athlete"))).status).toBe(201);
  expect((await send(brand.token, message(brand, "Hi from the brand"))).status).toBe(201);

  expect(await readMessages(otherAthlete.token, application)).toEqual([]);
  expect(await readMessages(otherBrand.token, application)).toEqual([]);
  expect(await readMessages(undefined, application)).toBe(401);

  // Outsiders can't write, and nobody writes as the other side.
  expect((await send(otherBrand.token, message(otherBrand, "Me too"))).status).toBe(403);
  expect((await send(otherAthlete.token, message(otherAthlete, "Me too"))).status).toBe(403);
  expect((await send(undefined, message(athlete, "Guest"))).status).toBe(401);
  expect((await send(athlete.token, message(brand, "Forged"))).status).toBe(403);

  // System entries and timestamps are the database's: no grant on kind or created_at.
  const forgedKind = await send(athlete.token, { ...message(athlete, "x"), kind: "closed" });
  expect(forgedKind.status).toBe(403);
  const forgedTime = await send(athlete.token, {
    ...message(athlete, "x"),
    created_at: "2000-01-01T00:00:00Z",
  });
  expect(forgedTime.status).toBe(403);

  // Text: trimmed, visible, at most 2000 characters.
  for (const body of ["   ", "​", " hi ", "a".repeat(2001)]) {
    const response = await send(athlete.token, message(athlete, body));
    expect(response.status, JSON.stringify(body)).toBe(400);
    expect((await response.json()).code).toBe("23514");
  }
  expect((await send(athlete.token, message(athlete, "a".repeat(2000)))).status).toBe(201);

  // Messages can't be changed or deleted.
  const path = `messages?application_id=eq.${application}&kind=eq.text`;
  await rest(path, { method: "PATCH", token: athlete.token, body: { body: "changed" } });
  await rest(path, { method: "DELETE", token: athlete.token });
  await rest(path, { method: "DELETE", token: brand.token });
  const after = await readMessages(athlete.token, application);
  expect(typeof after === "number" ? after : after.map((m) => m.body)).toEqual([
    null,
    "Hi from the athlete",
    "Hi from the brand",
    "a".repeat(2000),
  ]);
});

test("rejecting closes the chat, accepting again reopens it", async ({ browser }, testInfo) => {
  const brand = await newUser(browser, testInfo, "Brand");
  const athlete = await newUser(browser, testInfo, "Athlete");
  const application = await applicationFrom(brand, athlete);
  const hello = { application_id: application, sender_id: athlete.id, body: "Hello" };

  await setStatus(brand, application, "accepted");
  // Accepting again (e.g. a double submit) adds nothing.
  await setStatus(brand, application, "accepted");
  await setStatus(brand, application, "rejected");
  expect((await send(athlete.token, hello)).status).toBe(403);
  expect((await send(brand.token, { ...hello, sender_id: brand.id })).status).toBe(403);
  expect(await kinds(athlete.token, application)).toEqual(["accepted", "closed"]);

  await setStatus(brand, application, "accepted");
  expect((await send(athlete.token, hello)).status).toBe(201);
  expect(await kinds(athlete.token, application)).toEqual([
    "accepted",
    "closed",
    "reopened",
    "text",
  ]);
});

test("a never-accepted application has no chat", async ({ browser }, testInfo) => {
  const brand = await newUser(browser, testInfo, "Brand");
  const athlete = await newUser(browser, testInfo, "Athlete");
  const campaign = await createCampaign(brand.page);
  const apply = async () => {
    const response = await rest("applications", {
      method: "POST",
      token: athlete.token,
      body: { campaign_id: campaign, athlete_id: athlete.id, message: "Hi" },
      prefer: "return=representation",
    });
    return ((await response.json()) as { id: string }[])[0].id;
  };

  const first = await apply();
  await setStatus(brand, first, "rejected");
  await setStatus(brand, first, "pending");
  const withdrawn = await rest(`applications?id=eq.${first}`, {
    method: "DELETE",
    token: athlete.token,
  });
  expect(withdrawn.status).toBe(204);
  const second = await apply();

  expect(await readMessages(athlete.token, first)).toEqual([]);
  expect(await readMessages(athlete.token, second)).toEqual([]);
  expect(await readMessages(brand.token, second)).toEqual([]);
});

test("messages don't expose the athlete's last name", async ({ browser }, testInfo) => {
  const brand = await newUser(browser, testInfo, "Brand");
  const athlete = await newUser(browser, testInfo, "Athlete");
  const application = await applicationFrom(brand, athlete);
  await setStatus(brand, application, "accepted");

  const response = await rest(
    `messages?application_id=eq.${application}&select=application:applications(athletes(first_name,athlete_private(last_name)))`,
    { token: brand.token }
  );
  expect(await response.json()).toEqual([
    { application: { athletes: { first_name: "Jane", athlete_private: null } } },
  ]);
});

test("each user keeps only their own read state", async ({ browser }, testInfo) => {
  const brand = await newUser(browser, testInfo, "Brand");
  const athlete = await newUser(browser, testInfo, "Athlete");
  const otherAthlete = await newUser(browser, testInfo, "Athlete");
  const application = await applicationFrom(brand, athlete);
  const markRead = (user: User, userId: string, applicationId = application) =>
    rest("conversation_reads", {
      method: "POST",
      token: user.token,
      body: { application_id: applicationId, user_id: userId },
      prefer: "resolution=merge-duplicates",
    });

  // No chat yet, so nothing to mark read.
  expect((await markRead(athlete, athlete.id)).status).toBe(403);

  await setStatus(brand, application, "accepted");
  expect((await markRead(athlete, athlete.id)).status).toBe(201);
  // Again (an upsert), e.g. on every visit.
  expect((await markRead(athlete, athlete.id)).status).toBe(200);

  const read = async (user: User) =>
    (await rest(`conversation_reads?application_id=eq.${application}&select=user_id`, {
      token: user.token,
    }).then((r) => r.json())) as { user_id: string }[];
  expect(await read(athlete)).toEqual([{ user_id: athlete.id }]);
  expect(await read(brand)).toEqual([]);

  // Each write moves last_read_at to the database's clock; it can't be set by hand.
  const lastRead = async () =>
    (
      (await rest(`conversation_reads?application_id=eq.${application}&select=last_read_at`, {
        token: athlete.token,
      }).then((r) => r.json())) as { last_read_at: string }[]
    )[0].last_read_at;
  const before = await lastRead();
  expect((await markRead(athlete, athlete.id)).status).toBe(200);
  expect(Date.parse(await lastRead())).toBeGreaterThan(Date.parse(before));
  const forged = await rest("conversation_reads", {
    method: "POST",
    token: athlete.token,
    body: {
      application_id: application,
      user_id: athlete.id,
      last_read_at: "2999-01-01T00:00:00Z",
    },
    prefer: "resolution=merge-duplicates",
  });
  expect(forged.status).toBe(403);

  // Nobody marks it read for someone else, nor for a chat that isn't theirs.
  expect((await markRead(brand, athlete.id)).status).toBe(403);
  expect((await markRead(otherAthlete, otherAthlete.id)).status).toBe(403);
});
