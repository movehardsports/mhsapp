import { describe, expect, it } from "vitest";
import { EMAIL_MAX, isEmailLike, passwordProblem } from "@/lib/auth/validation";

describe("passwordProblem", () => {
  it("accepts 8 characters or more", () => {
    expect(passwordProblem("secret12")).toBeNull();
    expect(passwordProblem("zażółćgę")).toBeNull();
  });

  it("counts characters, not UTF-16 units", () => {
    expect(passwordProblem("😀😀😀ab")).toBe("Use at least 8 characters for your password.");
    expect(passwordProblem("😀😀😀😀abcd")).toBeNull();
  });

  it("rejects passwords made only of whitespace", () => {
    expect(passwordProblem("        ")).toBe("Your password can't be only spaces.");
    expect(passwordProblem("  pass  word  ")).toBeNull();
  });

  it("rejects passwords over 72 bytes", () => {
    expect(passwordProblem("a".repeat(72))).toBeNull();
    expect(passwordProblem("a".repeat(73))).toBe("Your password is too long.");
    // 36 two-byte letters fit, 37 don't.
    expect(passwordProblem("ż".repeat(36))).toBeNull();
    expect(passwordProblem("ż".repeat(37))).toBe("Your password is too long.");
  });
});

describe("isEmailLike", () => {
  it("accepts an address with one @ and no spaces", () => {
    expect(isEmailLike("jane@example.com")).toBe(true);
  });

  it("rejects malformed and overlong addresses", () => {
    expect(isEmailLike("jane")).toBe(false);
    expect(isEmailLike("jane doe@example.com")).toBe(false);
    expect(isEmailLike("a@b@example.com")).toBe(false);
    const local = "a".repeat(EMAIL_MAX - "@example.com".length);
    expect(isEmailLike(`${local}@example.com`)).toBe(true);
    expect(isEmailLike(`a${local}@example.com`)).toBe(false);
  });
});
