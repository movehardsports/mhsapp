import { describe, expect, it } from "vitest";
import {
  birthYearRange,
  MIN_AGE,
  parseAthleteProfile,
  parseBirthYear,
  parseBrandProfile,
} from "@/lib/profiles/validation";

describe("birthYearRange", () => {
  it("allows athletes turning 18 this year at the latest", () => {
    expect(birthYearRange(new Date("2026-06-01T12:00:00Z"))).toEqual({ min: 1926, max: 2008 });
    expect(MIN_AGE).toBe(18);
  });

  it("uses the UTC year, like the database", () => {
    // Already 2027 in Poland, still 2026 in UTC.
    expect(birthYearRange(new Date("2027-01-01T00:30:00+01:00")).max).toBe(2008);
    expect(birthYearRange(new Date("2027-01-01T00:30:00Z")).max).toBe(2009);
  });
});

describe("parseBirthYear", () => {
  it("parses a four-digit year, ignoring surrounding spaces", () => {
    expect(parseBirthYear("1998")).toBe(1998);
    expect(parseBirthYear(" 1998 ")).toBe(1998);
  });

  it("leaves the range to birthYearRange", () => {
    expect(parseBirthYear("0000")).toBe(0);
    expect(parseBirthYear("9999")).toBe(9999);
  });

  it("rejects anything else", () => {
    expect(parseBirthYear("98")).toBeNull();
    expect(parseBirthYear("19980")).toBeNull();
    expect(parseBirthYear("1998.5")).toBeNull();
    expect(parseBirthYear("")).toBeNull();
    expect(parseBirthYear(null)).toBeNull();
    expect(parseBirthYear(new File(["x"], "x.txt"))).toBeNull();
  });
});

describe("parseAthleteProfile", () => {
  const today = new Date("2026-06-01T12:00:00Z");
  const valid = {
    firstName: " Jane ",
    lastName: "Doe",
    nickname: "JD",
    birthYear: "1998",
    city: "Warsaw",
    sports: "hyrox",
  };
  const form = (fields: Record<string, string>) => {
    const data = new FormData();
    for (const [name, value] of Object.entries(fields)) data.append(name, value);
    return data;
  };

  it("returns the cleaned profile", () => {
    expect(parseAthleteProfile(form(valid), today)).toMatchObject({
      ok: true,
      input: {
        firstName: "Jane",
        lastName: "Doe",
        nickname: "JD",
        birthYear: 1998,
        city: "Warsaw",
        sports: ["hyrox"],
      },
    });
  });

  it("accepts athletes turning 18 this year, not 17", () => {
    expect(parseAthleteProfile(form({ ...valid, birthYear: "2008" }), today).ok).toBe(true);
    expect(parseAthleteProfile(form({ ...valid, birthYear: "2009" }), today)).toMatchObject({
      ok: false,
      message: "Enter your year of birth. You must be 18 or older to join.",
    });
  });

  it("rejects each invalid field with its message", () => {
    const cases: [Record<string, string>, string][] = [
      [{ ...valid, firstName: "" }, "Enter your first name (up to 100 characters)."],
      [{ ...valid, lastName: "x".repeat(101) }, "Enter your last name (up to 100 characters)."],
      [{ ...valid, nickname: "x".repeat(51) }, "Enter a nickname (up to 50 characters)."],
      [{ ...valid, city: " " }, "Enter your city (up to 100 characters)."],
      [{ ...valid, sports: "chess" }, "Choose at least one sport."],
    ];
    for (const [fields, message] of cases) {
      expect(parseAthleteProfile(form(fields), today)).toMatchObject({ ok: false, message });
    }
  });
});

describe("parseBrandProfile", () => {
  const form = (brandName: string, sports: string[]) => {
    const data = new FormData();
    data.append("brandName", brandName);
    for (const sport of sports) data.append("sports", sport);
    return data;
  };

  it("returns the cleaned profile", () => {
    expect(parseBrandProfile(form(" Move Hard ", ["hyrox", "surf"]))).toMatchObject({
      ok: true,
      input: { name: "Move Hard", sports: ["hyrox", "surf"] },
    });
  });

  it("rejects a blank name and no sports", () => {
    expect(parseBrandProfile(form(" ", ["hyrox"]))).toMatchObject({
      ok: false,
      message: "Enter your brand name (up to 100 characters).",
    });
    expect(parseBrandProfile(form("Move Hard", []))).toMatchObject({
      ok: false,
      message: "Choose at least one sport.",
    });
  });
});
