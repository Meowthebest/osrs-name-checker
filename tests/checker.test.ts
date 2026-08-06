import { afterEach, describe, expect, it, vi } from "vitest";
import { checkUsername, clearCheckCache } from "@/lib/checker";
import type { UsernameProvider } from "@/lib/providers";
import { source } from "./fixtures";

afterEach(() => clearCheckCache());

describe("shared checker", () => {
  it("does not call providers for invalid usernames", async () => {
    const check = vi.fn();
    const provider = {
      id: "a",
      name: "A",
      official: false,
      check,
    } as UsernameProvider;
    expect((await checkUsername("Bad!", [provider])).status).toBe("invalid");
    expect(check).not.toHaveBeenCalled();
  });

  it("isolates a rejected provider with Promise.allSettled", async () => {
    const providers: UsernameProvider[] = [
      {
        id: "a",
        name: "A",
        official: false,
        check: async () => source("not_found", { providerId: "a" }),
      },
      {
        id: "b",
        name: "B",
        official: false,
        check: async () => Promise.reject(new Error("boom")),
      },
    ];
    const output = await checkUsername("Example", providers, {
      skipCache: true,
    });
    expect(output.sources).toHaveLength(2);
    expect(output.sources[1]?.status).toBe("unavailable");
    expect(output.status).toBe("unknown");
  });

  it("reuses a short-lived normalized cache", async () => {
    const check = vi
      .fn()
      .mockResolvedValue(source("found", { official: true }));
    const provider = {
      id: "a",
      name: "A",
      official: true,
      check,
    } as UsernameProvider;
    await checkUsername("Rune   Player", [provider]);
    await checkUsername("rune player", [provider]);
    expect(check).toHaveBeenCalledTimes(1);
  });
});
