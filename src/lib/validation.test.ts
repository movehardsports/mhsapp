import { describe, expect, it } from "vitest";
import {
  cleanMultilineText,
  cleanText,
  formDataOf,
  isUuid,
  parseDeadline,
  parseSports,
  todayIsoDate,
} from "@/lib/validation";

const file = new File(["x"], "x.txt");

describe("formDataOf", () => {
  it("returns a form as it is", () => {
    const form = new FormData();
    form.set("title", "Spring Hyrox Open");
    expect(formDataOf(form)).toBe(form);
  });

  it("turns anything else into an empty form", () => {
    for (const payload of [undefined, null, "title=x", { title: "x" }]) {
      const form = formDataOf(payload);
      expect(form).toBeInstanceOf(FormData);
      expect([...form.keys()]).toEqual([]);
    }
  });
});

describe("cleanText", () => {
  it("trims a single line", () => {
    expect(cleanText("  Spring Hyrox Open  ", 100)).toBe("Spring Hyrox Open");
  });

  it("rejects blank, too long and non-text values", () => {
    expect(cleanText("   ", 100)).toBeNull();
    expect(cleanText("abcd", 3)).toBeNull();
    expect(cleanText(null, 100)).toBeNull();
    expect(cleanText(file, 100)).toBeNull();
  });

  it("checks the length after trimming", () => {
    expect(cleanText("abc", 3)).toBe("abc");
    expect(cleanText("  abc  ", 3)).toBe("abc");
  });

  it("rejects line breaks and other control characters", () => {
    expect(cleanText("one\ntwo", 100)).toBeNull();
    expect(cleanText("tab\there", 100)).toBeNull();
    expect(cleanText("line\u2028separator", 100)).toBeNull();
    expect(cleanText("para\u2029separator", 100)).toBeNull();
  });
});

describe("cleanMultilineText", () => {
  it("keeps inner line breaks and normalises line endings", () => {
    expect(cleanMultilineText("\n\n  First line\r\n\r\nSecond line  \n", 100)).toBe(
      "First line\n\nSecond line"
    );
    expect(cleanMultilineText("a\rb", 100)).toBe("a\nb");
  });

  it("rejects blank, too long and non-text values", () => {
    expect(cleanMultilineText(" \n\t ", 100)).toBeNull();
    expect(cleanMultilineText("abcd", 3)).toBeNull();
    expect(cleanMultilineText(null, 100)).toBeNull();
    expect(cleanMultilineText(file, 100)).toBeNull();
  });

  it("counts a normalised line ending as one character", () => {
    expect(cleanMultilineText("a\r\nb", 3)).toBe("a\nb");
  });
});

describe("parseSports", () => {
  it("keeps known sports once, in order", () => {
    expect(parseSports(["hyrox", "surf", "hyrox"])).toEqual(["hyrox", "surf"]);
  });

  it("drops unknown values and returns null when none are left", () => {
    expect(parseSports(["hyrox", "chess"])).toEqual(["hyrox"]);
    expect(parseSports(["chess", file])).toBeNull();
    expect(parseSports([])).toBeNull();
  });
});

describe("todayIsoDate", () => {
  it("uses the UTC date", () => {
    expect(todayIsoDate(new Date("2026-03-01T23:30:00-02:00"))).toBe("2026-03-02");
    expect(todayIsoDate(new Date("2026-03-02T00:30:00+02:00"))).toBe("2026-03-01");
  });
});

describe("parseDeadline", () => {
  const today = "2026-03-10";

  it("treats an empty value as no deadline", () => {
    expect(parseDeadline("", today)).toEqual({ ok: true, deadline: null });
    expect(parseDeadline(null, today)).toEqual({ ok: true, deadline: null });
  });

  it("accepts today and later", () => {
    expect(parseDeadline("2026-03-10", today)).toEqual({ ok: true, deadline: "2026-03-10" });
    expect(parseDeadline("2027-01-01", today)).toEqual({ ok: true, deadline: "2027-01-01" });
  });

  it("rejects a date before today", () => {
    expect(parseDeadline("2026-03-09", today)).toEqual({ ok: false });
  });

  it("keeps the saved deadline even once it has passed, but no other past date", () => {
    expect(parseDeadline("2026-01-15", today, "2026-01-15")).toEqual({
      ok: true,
      deadline: "2026-01-15",
    });
    expect(parseDeadline("2026-01-16", today, "2026-01-15")).toEqual({ ok: false });
  });

  it("rejects dates that don't exist and other formats", () => {
    expect(parseDeadline("2027-02-30", today)).toEqual({ ok: false });
    expect(parseDeadline("2027-13-01", today)).toEqual({ ok: false });
    expect(parseDeadline("2027-2-3", today)).toEqual({ ok: false });
    expect(parseDeadline("10.03.2027", today)).toEqual({ ok: false });
    expect(parseDeadline(file, today)).toEqual({ ok: false });
  });

  it("accepts 29 February only in leap years", () => {
    expect(parseDeadline("2028-02-29", today)).toEqual({ ok: true, deadline: "2028-02-29" });
    expect(parseDeadline("2027-02-29", today)).toEqual({ ok: false });
  });
});

describe("isUuid", () => {
  it("accepts canonical UUIDs in either case", () => {
    expect(isUuid("3f2b1c9e-8a4d-4e5f-9b6a-1c2d3e4f5a6b")).toBe(true);
    expect(isUuid("3F2B1C9E-8A4D-4E5F-9B6A-1C2D3E4F5A6B")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isUuid("not-a-uuid")).toBe(false);
    expect(isUuid("3f2b1c9e8a4d4e5f9b6a1c2d3e4f5a6b")).toBe(false);
    expect(isUuid(" 3f2b1c9e-8a4d-4e5f-9b6a-1c2d3e4f5a6b")).toBe(false);
  });
});
