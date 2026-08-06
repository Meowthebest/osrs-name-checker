import { describe, expect, it } from "vitest";
import {
  normalizeUsername,
  usernamesMatch,
  validateUsername,
} from "@/lib/validation/username";

describe("username validation", () => {
  it.each([
    "A",
    "Zezima",
    "Rune Player",
    "Rune-Player",
    "Rune_Player",
    "123456789012",
  ])("accepts valid username %s", (username) =>
    expect(validateUsername(username).valid).toBe(true),
  );

  it("trims and collapses whitespace while retaining a display version", () => {
    expect(validateUsername("  Rune   Player  ")).toMatchObject({
      valid: true,
      original: "  Rune   Player  ",
      display: "Rune Player",
      normalized: "rune player",
    });
  });

  it("normalizes repeated whitespace and case while preserving permitted punctuation", () => {
    expect(normalizeUsername(" Rune__PLAYER--One ")).toBe("rune__player--one");
    expect(usernamesMatch("Rune   Player", "rune player")).toBe(true);
    expect(usernamesMatch("Rune_Player", "rune player")).toBe(false);
  });

  it.each([
    ["", "Enter a username"],
    ["             ", "Enter a username"],
    ["1234567890123", "12 characters"],
    ["Rune!", "only letters"],
    ["___---", "letter or number"],
  ])("rejects %j with a clear reason", (username, message) => {
    const validation = validateUsername(username);
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain(message);
  });
});
