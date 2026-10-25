import { describe, expect, it } from "vitest";
import { isCampaignClosed } from "@/lib/campaigns/deadline";

describe("isCampaignClosed", () => {
  const today = "2026-03-10";

  it("stays open without a deadline and on the deadline day", () => {
    expect(isCampaignClosed(null, today)).toBe(false);
    expect(isCampaignClosed("2026-03-10", today)).toBe(false);
    expect(isCampaignClosed("2026-04-01", today)).toBe(false);
  });

  it("closes the day after the deadline", () => {
    expect(isCampaignClosed("2026-03-09", today)).toBe(true);
  });
});
