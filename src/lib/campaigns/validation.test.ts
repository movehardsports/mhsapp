import { describe, expect, it } from "vitest";
import { parseCampaign } from "@/lib/campaigns/validation";

const today = "2026-03-10";

function form(fields: Record<string, string | string[]>) {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    for (const item of [value].flat()) data.append(name, item);
  }
  return data;
}

const valid = {
  type: "event",
  title: "  Spring Hyrox Open ",
  description: "Race day in Warsaw.\r\nBring your crew.",
  sports: ["hyrox", "hyrox", "surf"],
  deadline: "2026-04-01",
};

describe("parseCampaign", () => {
  it("returns the cleaned campaign", () => {
    expect(parseCampaign(form(valid), null, today)).toEqual({
      ok: true,
      values: { ...valid, sports: ["hyrox", "hyrox", "surf"] },
      input: {
        type: "event",
        title: "Spring Hyrox Open",
        description: "Race day in Warsaw.\nBring your crew.",
        sports: ["hyrox", "surf"],
        deadline: "2026-04-01",
      },
    });
  });

  it("treats an empty deadline as none", () => {
    const parsed = parseCampaign(form({ ...valid, deadline: "" }), null, today);
    expect(parsed.ok && parsed.input.deadline).toBeNull();
  });

  it("rejects each invalid field with its message, echoing the values", () => {
    const cases: [Record<string, string | string[]>, string][] = [
      [{ ...valid, type: "party" }, "Choose a campaign type."],
      [{ ...valid, title: "Two\nlines" }, "Enter a title (one line, up to 100 characters)."],
      [{ ...valid, title: "x".repeat(101) }, "Enter a title (one line, up to 100 characters)."],
      [{ ...valid, description: "  " }, "Enter a description (up to 5000 characters)."],
      [{ ...valid, sports: ["chess"] }, "Choose at least one sport."],
      [{ ...valid, deadline: "2026-03-09" }, "Pick a deadline from today on, or leave it empty."],
    ];
    for (const [fields, message] of cases) {
      const parsed = parseCampaign(form(fields), null, today);
      expect(parsed).toMatchObject({ ok: false, message });
      expect(parsed.values.title).toBe(fields.title);
    }
  });

  it("lets a saved deadline that has passed stay, but no other past date", () => {
    const saved = "2026-01-15";
    expect(parseCampaign(form({ ...valid, deadline: saved }), saved, today).ok).toBe(true);
    expect(parseCampaign(form({ ...valid, deadline: "2026-01-16" }), saved, today).ok).toBe(false);
  });
});
