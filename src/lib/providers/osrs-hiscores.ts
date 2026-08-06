import { failureResult, providerFetch } from "./http";
import type { UsernameProvider } from "./types";
import type { ProviderResult } from "@/types/check";
import { providerRateLimiter } from "@/lib/rate-limit/memory";

export function parseHiscores(text: string): {
  overallRank: number;
  overallLevel: number;
} {
  const firstLine = text.trim().split(/\r?\n/, 1)[0];
  const [rankText, levelText] = (firstLine ?? "").split(",");
  const overallRank = Number(rankText);
  const overallLevel = Number(levelText);
  if (
    !Number.isInteger(overallRank) ||
    !Number.isInteger(overallLevel) ||
    overallLevel < 1
  ) {
    throw new Error("Malformed Hiscores response");
  }
  return { overallRank, overallLevel };
}

export class OsrsHiscoresProvider implements UsernameProvider {
  readonly id = "osrs-hiscores";
  readonly name = "OSRS Hiscores";
  readonly official = true;

  async check(username: string): Promise<ProviderResult> {
    const started = performance.now();
    const rate = providerRateLimiter.consume(this.id, 60, 60_000, 4);
    if (!rate.allowed) {
      return {
        providerId: this.id,
        providerName: this.name,
        official: this.official,
        status: "rate_limited",
        responseTimeMs: 0,
        message: "A local safety limit paused requests to this provider.",
      };
    }
    try {
      const url = new URL(
        "https://secure.runescape.com/m=hiscore_oldschool/index_lite.ws",
      );
      url.searchParams.set("player", username);
      const { response, responseTimeMs } = await providerFetch(url.toString());
      const base = {
        providerId: this.id,
        providerName: this.name,
        official: this.official,
        responseTimeMs,
      };

      if (response.status === 404) {
        return {
          ...base,
          status: "not_found",
          message: "No ranked Hiscores entry was found.",
        };
      }
      if (response.status === 429) {
        return {
          ...base,
          status: "rate_limited",
          message: "Jagex rate limited the request.",
        };
      }
      if (!response.ok) {
        return {
          ...base,
          status: "unavailable",
          message: "Hiscores returned an unavailable response.",
        };
      }

      try {
        const details = parseHiscores(await response.text());
        return {
          ...base,
          status: "found",
          details,
          profileUrl: `https://secure.runescape.com/m=hiscore_oldschool/hiscorepersonal?user1=${encodeURIComponent(username)}`,
          message: "A ranked OSRS Hiscores entry was found.",
        };
      } catch {
        return {
          ...base,
          status: "error",
          message: "Hiscores returned an unexpected format.",
        };
      }
    } catch (error) {
      return failureResult(
        this.id,
        this.name,
        this.official,
        error,
        Math.round(performance.now() - started),
      );
    } finally {
      rate.release();
    }
  }
}
