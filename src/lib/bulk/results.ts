import type { CheckResult, CheckStatus } from "@/types/check";

export type BulkSortKey =
  "username" | "status" | "confidence" | "overall" | "response" | "checked";
export type BulkStatusFilter = "all" | CheckStatus | "shortlisted";

export function getOverallLevel(result: CheckResult): number | undefined {
  return result.sources.find((source) => source.details?.overallLevel)?.details
    ?.overallLevel;
}

export function filterAndSortResults(
  results: CheckResult[],
  options: {
    query: string;
    status: BulkStatusFilter;
    sortKey: BulkSortKey;
    shortlisted: Set<string>;
  },
): CheckResult[] {
  const query = options.query.trim().toLocaleLowerCase("en-GB");
  const filtered = results.filter((result) => {
    const matchesStatus =
      options.status === "all" ||
      (options.status === "shortlisted"
        ? options.shortlisted.has(result.normalizedUsername)
        : result.status === options.status);
    return (
      matchesStatus && result.query.toLocaleLowerCase("en-GB").includes(query)
    );
  });

  return [...filtered].sort((left, right) => {
    if (options.sortKey === "username") {
      return left.normalizedUsername.localeCompare(right.normalizedUsername);
    }
    if (options.sortKey === "status")
      return left.status.localeCompare(right.status);
    if (options.sortKey === "confidence")
      return left.confidence.localeCompare(right.confidence);
    if (options.sortKey === "overall") {
      return (getOverallLevel(right) ?? -1) - (getOverallLevel(left) ?? -1);
    }
    if (options.sortKey === "response")
      return left.responseTimeMs - right.responseTimeMs;
    return Date.parse(right.checkedAt) - Date.parse(left.checkedAt);
  });
}
