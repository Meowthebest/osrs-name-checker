import type {
  CheckResult,
  ProviderResult,
  ValidationResult,
} from "@/types/check";

const AVAILABILITY_WARNING =
  "Public trackers could not find this name, but only the official in-game RuneScape name-change interface can confirm whether it can actually be claimed.";

export function aggregateResults(
  validation: ValidationResult,
  sources: ProviderResult[],
  responseTimeMs: number,
  checkedAt = new Date().toISOString(),
): CheckResult {
  const base = {
    query: validation.display,
    normalizedUsername: validation.normalized,
    checkedAt,
    responseTimeMs,
    sources,
  };

  if (!validation.valid) {
    return {
      ...base,
      status: "invalid",
      confidence: "high",
      summary: validation.error ?? "This username is invalid.",
      confidenceExplanation:
        "The name does not pass the locally verified syntax rules.",
      warnings: [],
    };
  }

  const found = sources.filter((source) => source.status === "found");
  const officialFound = found.some((source) => source.official);
  const failures = sources.filter((source) =>
    ["unavailable", "timeout", "error"].includes(source.status),
  );
  const rateLimited = sources.filter(
    (source) => source.status === "rate_limited",
  );
  const successful = sources.filter((source) =>
    ["found", "not_found"].includes(source.status),
  );

  if (found.length > 0) {
    const high = officialFound || found.length >= 2;
    return {
      ...base,
      status: "taken",
      confidence: high ? "high" : "medium",
      summary: officialFound
        ? "This username was found on the official OSRS Hiscores."
        : `This username was found by ${found[0]?.providerName ?? "a public tracker"}.`,
      confidenceExplanation: high
        ? officialFound
          ? "The official ranked-player endpoint returned a profile for this name."
          : "Multiple independent public trackers returned an exact match."
        : "One reputable third-party tracker returned an exact match.",
      warnings:
        failures.length > 0
          ? ["Some providers did not respond successfully."]
          : [],
    };
  }

  if (rateLimited.length > 0 && successful.length < 2) {
    return {
      ...base,
      status: "rate_limited",
      confidence: "unknown",
      summary: "Provider rate limits prevented a safe classification.",
      confidenceExplanation:
        "Too little provider evidence remained after rate limiting.",
      warnings: ["Wait before checking this name again."],
    };
  }

  if (successful.length >= 2 && failures.length <= 1) {
    return {
      ...base,
      status: "possibly_available",
      confidence: "low",
      summary: "No responding public source found this username.",
      confidenceExplanation:
        "Multiple sources returned no match, but missing public data cannot prove claimability.",
      warnings: [AVAILABILITY_WARNING],
    };
  }

  return {
    ...base,
    status: "unknown",
    confidence: "unknown",
    summary:
      "There was not enough reliable evidence to classify this username.",
    confidenceExplanation:
      failures.length > 0
        ? "Too many providers failed, timed out, or returned data that could not be interpreted safely."
        : "Too few providers returned a conclusive result.",
    warnings: [
      "Try again later and confirm through the official in-game name-change interface.",
    ],
  };
}

export { AVAILABILITY_WARNING };
