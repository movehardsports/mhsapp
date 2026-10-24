import { describe, expect, it } from "vitest";
import { formatDeadline } from "@/lib/campaigns/format";

describe("formatDeadline", () => {
  it("formats a plain date without shifting the day", () => {
    expect(formatDeadline("2099-12-31")).toBe("31 Dec 2099");
    expect(formatDeadline("2026-01-01")).toBe("1 Jan 2026");
  });
});
