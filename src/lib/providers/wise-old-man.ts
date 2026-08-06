import { usernamesMatch } from "@/lib/validation/username";
import type { ProviderResult } from "@/types/check";
import { providerRateLimiter } from "@/lib/rate-limit/memory";
import { failureResult, providerFetch } from "./http";
import type { UsernameProvider } from "./types";

interface WiseOldManPlayer {
  username?: string;
  displayName?: string;
  combatLevel?: number;
  latestSnapshot?: {
    data?: { skills?: { overall?: { rank?: number; level?: number } } };
  };
}

export class WiseOldManProvider implements UsernameProvider {
  readonly id = "wise-old-man";
  readonly name = "Wise Old Man";
  readonly official = false;

  async check(username: string): Promise<ProviderResult> {
    const started = performance.now();
    const rate = providerRateLimiter.consume(this.id, 20, 60_000, 4);
    if (!rate.allowed) {
      return {
        providerId: this.id,
        providerName: this.name,
        official: this.official,
        status: "rate_limited",
        responseTimeMs: 0,
        message:
          "The provider's documented anonymous request limit was reached locally.",
      };
    }
    try {
      const url = `https://api.wiseoldman.net/v2/players/${encodeURIComponent(username)}`;
      const { response, responseTimeMs } = await providerFetch(url);
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
          message: "No tracked player matched this name.",
        };
      }
      if (response.status === 429) {
        return {
          ...base,
          status: "rate_limited",
          message: "Wise Old Man rate limited the request.",
        };
      }
      if (!response.ok) {
        return {
          ...base,
          status: "unavailable",
          message: "Wise Old Man was unavailable.",
        };
      }

      const body = (await response.json()) as WiseOldManPlayer;
      const returnedName = body.displayName ?? body.username;
      if (!returnedName || !usernamesMatch(returnedName, username)) {
        return {
          ...base,
          status: "error",
          message: "The provider response did not exactly match.",
        };
      }
      const overall = body.latestSnapshot?.data?.skills?.overall;
      return {
        ...base,
        status: "found",
        profileUrl: `https://wiseoldman.net/players/${encodeURIComponent(returnedName)}`,
        details: {
          overallRank: overall?.rank,
          overallLevel: overall?.level,
          combatLevel: body.combatLevel,
        },
        message: "An exact tracked-player match was found.",
      };
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
