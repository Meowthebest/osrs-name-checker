import { describe, expect, it, vi } from "vitest";
import { retryTemporaryFailure } from "@/lib/bulk/retry";
import { createBulkRequestSchema } from "@/lib/bulk/schema";
import { InMemoryRateLimiter } from "@/lib/rate-limit/memory";
import { result, source } from "./fixtures";

describe("request safety limits", () => {
  it("enforces the configured bulk maximum", () => {
    const schema = createBulkRequestSchema(2);
    expect(schema.safeParse({ usernames: ["One", "Two"] }).success).toBe(true);
    expect(
      schema.safeParse({ usernames: ["One", "Two", "Three"] }).success,
    ).toBe(false);
  });

  it("limits fixed-window count and active requests", () => {
    const limiter = new InMemoryRateLimiter();
    const active = limiter.consume("ip", 2, 60_000, 1);
    expect(active.allowed).toBe(true);
    expect(limiter.consume("ip", 2, 60_000, 1).allowed).toBe(false);
    active.release();
    expect(limiter.consume("ip", 2, 60_000, 1).allowed).toBe(true);
    expect(limiter.consume("ip", 2, 60_000, 1).allowed).toBe(false);
  });
});

describe("temporary-failure retry", () => {
  it("retries a temporary all-provider network failure no more than once", async () => {
    const checker = vi
      .fn()
      .mockResolvedValueOnce(
        result({
          status: "unknown",
          sources: [source("timeout"), source("unavailable")],
        }),
      )
      .mockResolvedValueOnce(result({ status: "taken" }));
    expect(await retryTemporaryFailure(checker, 1, 0)).toMatchObject({
      status: "taken",
    });
    expect(checker).toHaveBeenCalledTimes(2);
  });

  it.each(["invalid", "rate_limited", "possibly_available"] as const)(
    "does not retry %s results",
    async (status) => {
      const checker = vi.fn().mockResolvedValue(result({ status }));
      await retryTemporaryFailure(checker, 1, 0);
      expect(checker).toHaveBeenCalledTimes(1);
    },
  );
});
