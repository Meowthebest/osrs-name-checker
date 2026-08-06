import type { CheckResult } from "@/types/check";

export function isTemporaryNetworkFailure(result: CheckResult): boolean {
  return (
    result.status === "unknown" &&
    result.sources.length > 0 &&
    result.sources.every((source) =>
      ["timeout", "unavailable"].includes(source.status),
    )
  );
}

export async function retryTemporaryFailure(
  checker: (attempt: number) => Promise<CheckResult>,
  retryLimit: number,
  delayMs = 250,
): Promise<CheckResult> {
  let attempt = 0;
  let result = await checker(attempt);
  while (attempt < retryLimit && isTemporaryNetworkFailure(result)) {
    attempt += 1;
    if (delayMs > 0)
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    result = await checker(attempt);
  }
  return result;
}
