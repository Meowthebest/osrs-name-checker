import { describe, expect, it } from "vitest";
import {
  escapeCsv,
  protectCsvFormula,
  resultsToCsv,
  resultsToJson,
} from "@/lib/export/results";
import { result, source } from "./fixtures";

describe("exports", () => {
  it("escapes quotes, commas, and line breaks", () => {
    expect(escapeCsv('A,"B"\nC')).toBe('"A,""B""\nC"');
  });

  it.each(["=SUM(A1:A2)", "+cmd", "-2+3", "@mention"])(
    "prevents CSV formula injection for %s",
    (value) => expect(protectCsvFormula(value)).toBe(`'${value}`),
  );

  it("exports the required CSV fields and source categories", () => {
    const csv = resultsToCsv([
      result({
        query: "=Risky",
        status: "possibly_available",
        sources: [
          source("found", {
            providerName: "Found Source",
            details: { overallLevel: 1500 },
          }),
          source("not_found", { providerName: "Missing Source" }),
          source("timeout", { providerName: "Failed Source" }),
        ],
      }),
    ]);
    expect(csv).toContain("normalized_username");
    expect(csv).toContain("Found Source");
    expect(csv).toContain("Missing Source");
    expect(csv).toContain("Failed Source");
    expect(csv).toContain("'=Risky");
  });

  it("exports valid JSON and supports prefiltered subsets", () => {
    const available = result({ status: "possibly_available" });
    expect(JSON.parse(resultsToJson([available]))).toHaveLength(1);
  });
});
