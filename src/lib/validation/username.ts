import type { ValidationResult } from "@/types/check";

export const USERNAME_MIN_LENGTH = 1;
export const USERNAME_MAX_LENGTH = 12;

const ALLOWED_CHARACTERS = /^[A-Za-z0-9 _-]+$/;
const WHITESPACE_RUN = /\s+/g;

/**
 * RuneScape accepts letters, numbers, spaces, hyphens, and underscores in
 * 1–12 character names. Repeated whitespace and case are canonicalized for
 * comparison; permitted hyphens and underscores remain distinct.
 */
export function normalizeUsername(username: string): string {
  return username
    .trim()
    .replace(WHITESPACE_RUN, " ")
    .toLocaleLowerCase("en-GB");
}

export function validateUsername(username: string): ValidationResult {
  const original = username;
  const display = username.trim().replace(/\s+/g, " ");
  const normalized = normalizeUsername(display);

  if (display.length === 0) {
    return {
      valid: false,
      original,
      display,
      normalized,
      error: "Enter a username.",
    };
  }

  if (display.length > USERNAME_MAX_LENGTH) {
    return {
      valid: false,
      original,
      display,
      normalized,
      error: `Username must be ${USERNAME_MAX_LENGTH} characters or fewer.`,
    };
  }

  if (!ALLOWED_CHARACTERS.test(display)) {
    return {
      valid: false,
      original,
      display,
      normalized,
      error: "Use only letters, numbers, spaces, hyphens, and underscores.",
    };
  }

  if (!/[A-Za-z0-9]/.test(display)) {
    return {
      valid: false,
      original,
      display,
      normalized,
      error: "Username must contain at least one letter or number.",
    };
  }

  return { valid: true, original, display, normalized };
}

export function usernamesMatch(left: string, right: string): boolean {
  return normalizeUsername(left) === normalizeUsername(right);
}
