import { usernamesMatch } from "@/lib/validation/username";
import type { ProviderResult } from "@/types/check";
import { providerRateLimiter } from "@/lib/rate-limit/memory";
import { failureResult, providerFetch } from "./http";
import type { UsernameProvider } from "./types";

type TempleBody = Record<string, unknown> & {
  Username?: string;
  player_name_with_capitalization?: string;
  error?: string | boolean;
};

export class TempleOsrsProvider implements UsernameProvider {
  readonly id = "temple-osrs";
  readonly name = "TempleOSRS";
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
          "A conservative local safety limit paused requests to this provider.",
      };
    }
    try {
      const url = new URL("https://templeosrs.com/api/player_info.php");
      url.searchParams.set("player", username);
      url.searchParams.set("formattedrsn", "1");
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
          message: "No TempleOSRS profile was found.",
        };
      }
      if (response.status === 429) {
        return {
          ...base,
          status: "rate_limited",
          message: "TempleOSRS rate limited the request.",
        };
      }
      if (!response.ok) {
        return {
          ...base,
          status: "unavailable",
          message: "TempleOSRS was unavailable.",
        };
      }

      let body: TempleBody;
      try {
        body = (await response.json()) as TempleBody;
      } catch {
        return {
          ...base,
          status: "error",
          message: "TempleOSRS returned malformed data.",
        };
      }
      const returnedName =
        body.player_name_with_capitalization ?? body.Username;
      if (!returnedName && body.error) {
        return {
          ...base,
          status: "not_found",
          message: "No tracked player matched this name.",
        };
      }
      if (!returnedName) {
        return {
          ...base,
          status: "not_found",
          message: "No TempleOSRS profile was found.",
        };
      }
      if (!usernamesMatch(returnedName, username)) {
        return {
          ...base,
          status: "error",
          message: "The provider response did not exactly match.",
        };
      }
      return {
        ...base,
        status: "found",
        profileUrl: `https://templeosrs.com/player/overview.php?player=${encodeURIComponent(returnedName)}`,
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
