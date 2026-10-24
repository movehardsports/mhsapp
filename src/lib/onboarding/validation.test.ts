import { describe, expect, it } from "vitest";
import { birthYearRange, MIN_AGE, parseBirthYear } from "@/lib/onboarding/validation";

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
