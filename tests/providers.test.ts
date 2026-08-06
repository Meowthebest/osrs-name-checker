import { afterEach, describe, expect, it, vi } from "vitest";
import {
  OsrsHiscoresProvider,
  parseHiscores,
} from "@/lib/providers/osrs-hiscores";
import { TempleOsrsProvider } from "@/lib/providers/temple-osrs";
import { WiseOldManProvider } from "@/lib/providers/wise-old-man";

afterEach(() => vi.unstubAllGlobals());

describe("OSRS Hiscores provider", () => {
  it("parses overall rank and level", () => {
    expect(parseHiscores("12345,2100,100000000\n1,99,13034431")).toEqual({
      overallRank: 12345,
      overallLevel: 2100,
    });
  });

  it("returns found for a valid response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("12345,2100,100000000\n")),
    );
    await expect(
      new OsrsHiscoresProvider().check("Example"),
    ).resolves.toMatchObject({
      status: "found",
      official: true,
      details: { overallRank: 12345, overallLevel: 2100 },
    });
  });

  it("maps 404 and 429 without guessing", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 404 }))
      .mockResolvedValueOnce(new Response("", { status: 429 }));
    vi.stubGlobal("fetch", fetchMock);
    const provider = new OsrsHiscoresProvider();
    expect((await provider.check("Missing")).status).toBe("not_found");
    expect((await provider.check("Limited")).status).toBe("rate_limited");
  });

  it("reports malformed responses and timeouts", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(new Response("not,csv")),
    );
    expect((await new OsrsHiscoresProvider().check("Broken")).status).toBe(
      "error",
    );
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValueOnce(new DOMException("Aborted", "AbortError")),
    );
    expect((await new OsrsHiscoresProvider().check("Slow")).status).toBe(
      "timeout",
    );
  });
});

describe("third-party providers", () => {
  it("accepts only an exact normalized Wise Old Man match", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          username: "rune_player",
          displayName: "Rune Player",
          combatLevel: 126,
          latestSnapshot: {
            data: { skills: { overall: { rank: 10, level: 2277 } } },
          },
        }),
      ),
    );
    expect(await new WiseOldManProvider().check("rune player")).toMatchObject({
      status: "found",
      details: { combatLevel: 126, overallLevel: 2277 },
    });
  });

  it("rejects a nonmatching Wise Old Man response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json({ username: "Someone Else" })),
    );
    expect((await new WiseOldManProvider().check("Example")).status).toBe(
      "error",
    );
  });

  it("handles TempleOSRS found, not found, and malformed data", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(Response.json({ Username: "Example" }))
      .mockResolvedValueOnce(Response.json({ error: "Player not found" }))
      .mockResolvedValueOnce(new Response("<html>bad gateway</html>"));
    vi.stubGlobal("fetch", fetchMock);
    const provider = new TempleOsrsProvider();
    expect((await provider.check("Example")).status).toBe("found");
    expect((await provider.check("Missing")).status).toBe("not_found");
    expect((await provider.check("Broken")).status).toBe("error");
  });
});
