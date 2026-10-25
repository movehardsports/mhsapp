import { describe, expect, it } from "vitest";
import { APPLICATION_MESSAGE_MAX, parseApplication } from "@/lib/applications/validation";

function form(message?: string) {
  const data = new FormData();
  if (message !== undefined) data.set("message", message);
  return data;
}

describe("parseApplication", () => {
  it("returns the cleaned message", () => {
    expect(parseApplication(form("  Hi!\r\n\r\nI race Hyrox.  "))).toEqual({
      ok: true,
      values: { message: "  Hi!\r\n\r\nI race Hyrox.  " },
      input: { message: "Hi!\n\nI race Hyrox." },
    });
  });

  it("rejects a missing, blank or invisible message", () => {
    for (const message of [undefined, "", " \n ", "​"]) {
      const parsed = parseApplication(form(message));
      expect(parsed.ok, JSON.stringify(message)).toBe(false);
    }
  });

  it("allows up to the limit", () => {
    expect(parseApplication(form("a".repeat(APPLICATION_MESSAGE_MAX))).ok).toBe(true);
    expect(parseApplication(form("a".repeat(APPLICATION_MESSAGE_MAX + 1)))).toEqual({
      ok: false,
      values: { message: "a".repeat(APPLICATION_MESSAGE_MAX + 1) },
      message: "Write a short message (up to 1000 characters).",
    });
  });
});
