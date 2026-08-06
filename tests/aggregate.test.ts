import { describe, expect, it } from "vitest";
import { aggregateResults } from "@/lib/aggregate";
import { validateUsername } from "@/lib/validation/username";
import { source } from "./fixtures";

const valid = validateUsername("Example");

describe("result aggregation", () => {
  it("returns high-confidence taken for an official match", () => {
    const output = aggregateResults(
      valid,
      [source("found", { official: true })],
      10,
    );
    expect(output).toMatchObject({ status: "taken", confidence: "high" });
  });

  it("returns high-confidence taken for multiple tracker matches", () => {
    const output = aggregateResults(
      valid,
      [
        source("found", { providerId: "a" }),
        source("found", { providerId: "b" }),
      ],
      10,
    );
    expect(output).toMatchObject({ status: "taken", confidence: "high" });
  });

  it("returns medium-confidence taken for one third-party exact match", () => {
    expect(aggregateResults(valid, [source("found")], 10)).toMatchObject({
      status: "taken",
      confidence: "medium",
    });
  });

  it("uses low-confidence possibly available only with enough successful no-match evidence", () => {
    const output = aggregateResults(
      valid,
      [
        source("not_found", { providerId: "a" }),
        source("not_found", { providerId: "b" }),
      ],
      10,
    );
    expect(output).toMatchObject({
      status: "possibly_available",
      confidence: "low",
    });
    expect(output.warnings.join(" ")).toContain("only the official in-game");
  });

  it("keeps provider failures and too few sources unknown", () => {
    expect(
      aggregateResults(valid, [source("not_found"), source("timeout")], 10)
        .status,
    ).toBe("unknown");
    expect(
      aggregateResults(valid, [source("unavailable"), source("error")], 10)
        .status,
    ).toBe("unknown");
  });

  it("returns rate limited when too little safe evidence remains", () => {
    expect(
      aggregateResults(
        valid,
        [source("rate_limited"), source("not_found")],
        10,
      ),
    ).toMatchObject({ status: "rate_limited", confidence: "unknown" });
  });

  it("rejects invalid input before evidence is considered", () => {
    expect(aggregateResults(validateUsername("Bad!"), [], 0)).toMatchObject({
      status: "invalid",
      sources: [],
    });
  });
});
