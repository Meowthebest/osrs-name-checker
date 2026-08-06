import { describe, expect, it, vi } from "vitest";
import {
  mapWithConcurrency,
  processBulkInput,
  splitBulkInput,
} from "@/lib/bulk/input";
import { PausableQueue } from "@/lib/bulk/queue";
import { filterAndSortResults } from "@/lib/bulk/results";
import { result, source } from "./fixtures";

describe("bulk input", () => {
  it("splits newline, comma, TXT, and CSV-style input", () => {
    expect(splitBulkInput("Alpha\nBeta,Gamma\r\nDelta")).toEqual([
      "Alpha",
      "Beta",
      "Gamma",
      "Delta",
    ]);
  });

  it("removes empty rows and case/whitespace-insensitive duplicates", () => {
    const output = processBulkInput("Rune Player\n\nRUNE   player, Other");
    expect(output).toMatchObject({ entered: 3, duplicatesRemoved: 1 });
    expect(output.valid.map((item) => item.display)).toEqual([
      "Rune Player",
      "Other",
    ]);
  });

  it("separates invalid names without losing them", () => {
    const output = processBulkInput("Good Name,Bad!,Another");
    expect(output.valid).toHaveLength(2);
    expect(output.invalid).toHaveLength(1);
    expect(output.invalid[0]?.display).toBe("Bad!");
  });
});

describe("bulk concurrency and stopping", () => {
  it("never exceeds configured concurrency and preserves ordering", async () => {
    let active = 0;
    let peak = 0;
    const output = await mapWithConcurrency(
      [1, 2, 3, 4, 5],
      2,
      async (value) => {
        active += 1;
        peak = Math.max(peak, active);
        await new Promise((resolve) => setTimeout(resolve, 2));
        active -= 1;
        return value * 2;
      },
    );
    expect(peak).toBeLessThanOrEqual(2);
    expect(output).toEqual([2, 4, 6, 8, 10]);
  });

  it("stops active work and preserves completed results", async () => {
    const queue = new PausableQueue([1, 2, 3], 1, async (value, signal) => {
      if (value === 1) return value;
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, 200);
        signal.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
      return value;
    });
    const running = queue.start();
    await vi.waitFor(() => expect(queue.completed).toEqual([1]));
    queue.stop();
    await running;
    expect(queue.state).toBe("stopped");
    expect(queue.completed).toEqual([1]);
  });
});

describe("bulk result controls", () => {
  const rows = [
    result({
      query: "Zulu",
      normalizedUsername: "zulu",
      status: "taken",
      responseTimeMs: 80,
      sources: [source("found", { details: { overallLevel: 1000 } })],
    }),
    result({
      query: "Alpha",
      normalizedUsername: "alpha",
      status: "possibly_available",
      responseTimeMs: 20,
      checkedAt: "2026-08-06T18:00:00.000Z",
    }),
  ];

  it("filters by status, shortlist, and username search", () => {
    expect(
      filterAndSortResults(rows, {
        query: "alp",
        status: "all",
        sortKey: "username",
        shortlisted: new Set(),
      }),
    ).toHaveLength(1);
    expect(
      filterAndSortResults(rows, {
        query: "",
        status: "taken",
        sortKey: "username",
        shortlisted: new Set(),
      })[0]?.query,
    ).toBe("Zulu");
    expect(
      filterAndSortResults(rows, {
        query: "",
        status: "shortlisted",
        sortKey: "username",
        shortlisted: new Set(["alpha"]),
      })[0]?.query,
    ).toBe("Alpha");
  });

  it("sorts by username, level, response time, and checked time", () => {
    expect(
      filterAndSortResults(rows, {
        query: "",
        status: "all",
        sortKey: "username",
        shortlisted: new Set(),
      })[0]?.query,
    ).toBe("Alpha");
    expect(
      filterAndSortResults(rows, {
        query: "",
        status: "all",
        sortKey: "overall",
        shortlisted: new Set(),
      })[0]?.query,
    ).toBe("Zulu");
    expect(
      filterAndSortResults(rows, {
        query: "",
        status: "all",
        sortKey: "response",
        shortlisted: new Set(),
      })[0]?.query,
    ).toBe("Alpha");
    expect(
      filterAndSortResults(rows, {
        query: "",
        status: "all",
        sortKey: "checked",
        shortlisted: new Set(),
      })[0]?.query,
    ).toBe("Alpha");
  });
});
