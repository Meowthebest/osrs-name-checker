import { aggregateResults } from "@/lib/aggregate";
import { MemoryCache } from "@/lib/cache/memory";
import { env } from "@/lib/env";
import {
  providers as defaultProviders,
  type UsernameProvider,
} from "@/lib/providers";
import { validateUsername } from "@/lib/validation/username";
import type { CheckResult, ProviderResult } from "@/types/check";

const cache = new MemoryCache<CheckResult>();

export async function checkUsername(
  username: string,
  providers: UsernameProvider[] = defaultProviders,
  options: { skipCache?: boolean } = {},
): Promise<CheckResult> {
  const validation = validateUsername(username);
  if (!validation.valid) return aggregateResults(validation, [], 0);

  if (!options.skipCache) {
    const cached = cache.get(validation.normalized);
    if (cached) return { ...cached, query: validation.display };
  }

  const started = performance.now();
  const settled = await Promise.allSettled(
    providers.map((provider) => provider.check(validation.display)),
  );
  const sources: ProviderResult[] = settled.map((result, index) => {
    if (result.status === "fulfilled") return result.value;
    const provider = providers[index];
    return {
      providerId: provider?.id ?? "unknown",
      providerName: provider?.name ?? "Unknown provider",
      official: provider?.official ?? false,
      status: "unavailable",
      responseTimeMs: Math.round(performance.now() - started),
      message: "The provider failed unexpectedly.",
    };
  });

  const result = aggregateResults(
    validation,
    sources,
    Math.round(performance.now() - started),
  );
  cache.set(validation.normalized, result, env.cacheTtlMs);
  return result;
}

export function clearCheckCache(): void {
  cache.clear();
}
