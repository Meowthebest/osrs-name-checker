function integerEnv(
  name: string,
  fallback: number,
  min: number,
  max: number,
): number {
  const parsed = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(parsed)
    ? Math.min(max, Math.max(min, parsed))
    : fallback;
}

export const env = {
  cacheTtlMs: integerEnv("SEARCH_CACHE_TTL_SECONDS", 60, 10, 300) * 1_000,
  singleRateLimit: integerEnv("SINGLE_SEARCH_RATE_LIMIT", 20, 1, 500),
  bulkRateLimit: integerEnv("BULK_SEARCH_RATE_LIMIT", 5, 1, 100),
  bulkMaxNames: integerEnv("BULK_SEARCH_MAX_NAMES", 100, 1, 250),
  bulkConcurrency: integerEnv("BULK_SEARCH_CONCURRENCY", 4, 1, 8),
  retryLimit: integerEnv("BULK_SEARCH_RETRY_LIMIT", 1, 0, 1),
  providerTimeoutMs: integerEnv("PROVIDER_TIMEOUT_MS", 5_000, 1_000, 15_000),
  userAgent:
    process.env.APP_USER_AGENT ??
    "OSRSNameChecker/1.0 (+https://github.com/your-username/osrs-name-checker)",
} as const;
