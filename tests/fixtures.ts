import type { CheckResult, ProviderResult } from "@/types/check";

export function source(
  status: ProviderResult["status"],
  overrides: Partial<ProviderResult> = {},
): ProviderResult {
  return {
    providerId: "test",
    providerName: "Test Provider",
    official: false,
    status,
    responseTimeMs: 10,
    ...overrides,
  };
}

export function result(overrides: Partial<CheckResult> = {}): CheckResult {
  return {
    query: "Example",
    normalizedUsername: "example",
    status: "unknown",
    confidence: "unknown",
    summary: "Summary",
    confidenceExplanation: "Explanation",
    checkedAt: "2026-08-06T17:00:00.000Z",
    responseTimeMs: 100,
    sources: [],
    warnings: [],
    ...overrides,
  };
}
