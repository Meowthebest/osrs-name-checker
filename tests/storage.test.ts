import { afterEach, describe, expect, it, vi } from "vitest";
import { readLocal, removeLocal, writeLocal } from "@/lib/storage/client";

afterEach(() => vi.unstubAllGlobals());

function fakeStorage(throws = false) {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) =>
      throws
        ? (() => {
            throw new Error("blocked");
          })()
        : (data.get(key) ?? null),
    setItem: (key: string, value: string) => {
      if (throws) throw new Error("blocked");
      data.set(key, value);
    },
    removeItem: (key: string) => {
      if (throws) throw new Error("blocked");
      data.delete(key);
    },
  };
}

describe("local restoration", () => {
  it("persists, restores, and removes shortlist/search data", () => {
    vi.stubGlobal("window", { localStorage: fakeStorage() });
    expect(writeLocal("shortlist", { example: true })).toBe(true);
    expect(readLocal("shortlist", {})).toEqual({ example: true });
    removeLocal("shortlist");
    expect(readLocal("shortlist", {})).toEqual({});
  });

  it("fails safely when storage is blocked", () => {
    vi.stubGlobal("window", { localStorage: fakeStorage(true) });
    expect(writeLocal("bulk", { progress: 2 })).toBe(false);
    expect(readLocal("bulk", { progress: 0 })).toEqual({ progress: 0 });
    expect(() => removeLocal("bulk")).not.toThrow();
  });
});
