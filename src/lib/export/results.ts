import type { CheckResult } from "@/types/check";

const CSV_COLUMNS = [
  "username",
  "normalized_username",
  "status",
  "confidence",
  "summary",
  "overall_level",
  "sources_found",
  "sources_not_found",
  "sources_failed",
  "response_time_ms",
  "checked_at",
] as const;

export function protectCsvFormula(value: string): string {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

export function escapeCsv(value: unknown): string {
  const protectedValue = protectCsvFormula(String(value ?? ""));
  return `"${protectedValue.replaceAll('"', '""')}"`;
}

export function resultsToCsv(results: CheckResult[]): string {
  const rows = results.map((result) => {
    const found = result.sources.filter((source) => source.status === "found");
    const notFound = result.sources.filter(
      (source) => source.status === "not_found",
    );
    const failed = result.sources.filter((source) =>
      ["unavailable", "timeout", "error", "rate_limited"].includes(
        source.status,
      ),
    );
    const overallLevel = found.find((source) => source.details?.overallLevel)
      ?.details?.overallLevel;
    return [
      result.query,
      result.normalizedUsername,
      result.status,
      result.confidence,
      result.summary,
      overallLevel ?? "",
      found.map((source) => source.providerName).join("; "),
      notFound.map((source) => source.providerName).join("; "),
      failed.map((source) => source.providerName).join("; "),
      result.responseTimeMs,
      result.checkedAt,
    ].map(escapeCsv);
  });
  return [
    CSV_COLUMNS.map(escapeCsv).join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");
}

export function resultsToJson(results: CheckResult[]): string {
  return JSON.stringify(results, null, 2);
}
