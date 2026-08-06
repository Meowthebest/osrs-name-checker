import { env } from "@/lib/env";
import type { ProviderResult, ProviderStatus } from "@/types/check";

export interface ProviderResponse {
  response: Response;
  responseTimeMs: number;
}

export async function providerFetch(url: string): Promise<ProviderResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.providerTimeoutMs);
  const started = performance.now();

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json, text/plain;q=0.9, */*;q=0.1",
        "User-Agent": env.userAgent,
      },
      cache: "no-store",
      signal: controller.signal,
    });
    return {
      response,
      responseTimeMs: Math.round(performance.now() - started),
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function failureResult(
  providerId: string,
  providerName: string,
  official: boolean,
  error: unknown,
  responseTimeMs: number,
): ProviderResult {
  const timedOut = error instanceof DOMException && error.name === "AbortError";
  const status: ProviderStatus = timedOut ? "timeout" : "unavailable";
  return {
    providerId,
    providerName,
    official,
    status,
    responseTimeMs,
    message: timedOut
      ? "The provider timed out."
      : "The provider could not be reached.",
  };
}
