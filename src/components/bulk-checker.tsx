"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { StatusBadge, statusLabels } from "@/components/status-badge";
import { processBulkInput } from "@/lib/bulk/input";
import {
  filterAndSortResults,
  getOverallLevel,
  type BulkSortKey,
  type BulkStatusFilter,
} from "@/lib/bulk/results";
import { resultsToCsv, resultsToJson } from "@/lib/export/results";
import { readLocal, removeLocal, writeLocal } from "@/lib/storage/client";
import type {
  BulkResponse,
  CheckResult,
  CheckStatus,
  ValidationResult,
} from "@/types/check";

const BULK_KEY = "osrs-name-checker:bulk:v1";
const SHORTLIST_KEY = "osrs-name-checker:shortlist:v1";
const CLIENT_CHUNK_SIZE = 10;
const PROVIDER_COOLDOWN_SECONDS = 31;

type SearchState = "idle" | "running" | "paused" | "stopped" | "complete";

interface SavedBulkSearch {
  input: string;
  results: CheckResult[];
  state: SearchState;
  lastChecked?: string;
}

type Shortlist = Record<string, { username: string; checkedAt: string }>;

function invalidResult(validation: ValidationResult): CheckResult {
  return {
    query: validation.display,
    normalizedUsername: validation.normalized,
    status: "invalid",
    confidence: "high",
    summary: validation.error ?? "This username is invalid.",
    confidenceExplanation:
      "The name did not pass validation, so no provider request was made.",
    checkedAt: new Date().toISOString(),
    responseTimeMs: 0,
    sources: [],
    warnings: [],
  };
}

function downloadFile(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function BulkChecker() {
  const [input, setInput] = useState("");
  const [results, setResults] = useState<CheckResult[]>([]);
  const [state, setState] = useState<SearchState>("idle");
  const [shortlist, setShortlist] = useState<Shortlist>({});
  const [statusFilter, setStatusFilter] = useState<BulkStatusFilter>("all");
  const [sortKey, setSortKey] = useState<BulkSortKey>("username");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const controllerRef = useRef<AbortController | null>(null);
  const pausedRef = useRef(false);
  const stoppedRef = useRef(false);
  const resumeResolverRef = useRef<(() => void) | null>(null);
  const resultsRef = useRef<CheckResult[]>([]);

  const processed = useMemo(() => processBulkInput(input), [input]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const saved = readLocal<SavedBulkSearch | null>(BULK_KEY, null);
      const savedShortlist = readLocal<Shortlist>(SHORTLIST_KEY, {});
      if (saved) {
        setInput(saved.input);
        setResults(saved.results);
        resultsRef.current = saved.results;
        setState(
          saved.state === "running" || saved.state === "paused"
            ? "stopped"
            : saved.state,
        );
        setRestored(saved.results.length > 0 || saved.input.length > 0);
      }
      setShortlist(savedShortlist);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  function persist(nextResults: CheckResult[], nextState: SearchState) {
    writeLocal<SavedBulkSearch>(BULK_KEY, {
      input,
      results: nextResults,
      state: nextState,
      lastChecked: nextResults[0]?.checkedAt,
    });
  }

  function replaceResults(next: CheckResult[], nextState = state) {
    resultsRef.current = next;
    setResults(next);
    persist(next, nextState);
  }

  async function waitWhilePaused() {
    if (!pausedRef.current) return;
    await new Promise<void>((resolve) => {
      resumeResolverRef.current = resolve;
    });
  }

  async function startSearch(onlyNames?: string[]) {
    if (state === "running") return;
    setError(null);
    stoppedRef.current = false;
    pausedRef.current = false;
    setState("running");

    const existingKeys = new Set(
      resultsRef.current.map((result) => result.normalizedUsername),
    );
    const localInvalid = onlyNames
      ? []
      : processed.invalid
          .filter((item) => !existingKeys.has(item.normalized))
          .map(invalidResult);
    if (localInvalid.length > 0) {
      const next = [...resultsRef.current, ...localInvalid];
      resultsRef.current = next;
      setResults(next);
    }

    const validNames =
      onlyNames ?? processed.valid.map((entry) => entry.display);
    const pending = validNames.filter(
      (name) =>
        !new Set(
          resultsRef.current.map((result) => result.normalizedUsername),
        ).has(processBulkInput(name).valid[0]?.normalized ?? ""),
    );

    if (pending.length === 0) {
      setState("complete");
      persist(resultsRef.current, "complete");
      return;
    }

    try {
      for (
        let offset = 0;
        offset < pending.length;
        offset += CLIENT_CHUNK_SIZE
      ) {
        await waitWhilePaused();
        if (stoppedRef.current) break;
        const chunk = pending.slice(offset, offset + CLIENT_CHUNK_SIZE);
        const controller = new AbortController();
        controllerRef.current = controller;
        const response = await fetch("/api/check/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usernames: chunk }),
          signal: controller.signal,
        });
        const body = (await response.json()) as
          BulkResponse | { error?: string };
        if (!("results" in body))
          throw new Error(body.error ?? "Bulk search failed.");

        const resultMap = new Map(
          [...resultsRef.current, ...body.results].map((result) => [
            result.normalizedUsername,
            result,
          ]),
        );
        const next = [...resultMap.values()];
        resultsRef.current = next;
        setResults(next);
        persist(next, "running");

        const hasMore = offset + CLIENT_CHUNK_SIZE < pending.length;
        if (hasMore && !stoppedRef.current) {
          for (
            let seconds = PROVIDER_COOLDOWN_SECONDS;
            seconds > 0 && !stoppedRef.current;
            seconds -= 1
          ) {
            setCooldownSeconds(seconds);
            await waitWhilePaused();
            await new Promise((resolve) => setTimeout(resolve, 1_000));
          }
          setCooldownSeconds(0);
        }
      }
      const nextState = stoppedRef.current ? "stopped" : "complete";
      setState(nextState);
      persist(resultsRef.current, nextState);
    } catch (caught) {
      if (
        caught instanceof DOMException &&
        caught.name === "AbortError" &&
        stoppedRef.current
      ) {
        setState("stopped");
        persist(resultsRef.current, "stopped");
      } else {
        const message =
          caught instanceof Error ? caught.message : "Bulk search failed.";
        setError(message);
        setState("stopped");
        persist(resultsRef.current, "stopped");
      }
    } finally {
      controllerRef.current = null;
      setCooldownSeconds(0);
    }
  }

  function pauseSearch() {
    if (state !== "running") return;
    pausedRef.current = true;
    setState("paused");
    persist(resultsRef.current, "paused");
  }

  function resumeSearch() {
    if (state !== "paused") {
      void startSearch();
      return;
    }
    pausedRef.current = false;
    setState("running");
    resumeResolverRef.current?.();
    resumeResolverRef.current = null;
  }

  function stopSearch() {
    stoppedRef.current = true;
    pausedRef.current = false;
    resumeResolverRef.current?.();
    controllerRef.current?.abort();
    setCooldownSeconds(0);
    setState("stopped");
    persist(resultsRef.current, "stopped");
  }

  function toggleShortlist(result: CheckResult) {
    const next = { ...shortlist };
    if (next[result.normalizedUsername]) delete next[result.normalizedUsername];
    else if (Object.keys(next).length < 100) {
      next[result.normalizedUsername] = {
        username: result.query,
        checkedAt: result.checkedAt,
      };
    }
    setShortlist(next);
    writeLocal(SHORTLIST_KEY, next);
  }

  async function recheck(result: CheckResult) {
    const without = resultsRef.current.filter(
      (item) => item.normalizedUsername !== result.normalizedUsername,
    );
    resultsRef.current = without;
    setResults(without);
    await startSearch([result.query]);
  }

  const visibleResults = useMemo(
    () =>
      filterAndSortResults(results, {
        query,
        status: statusFilter,
        sortKey,
        shortlisted: new Set(Object.keys(shortlist)),
      }),
    [query, results, shortlist, sortKey, statusFilter],
  );

  const counts = useMemo(() => {
    const byStatus = Object.fromEntries(
      (
        [
          "taken",
          "possibly_available",
          "invalid",
          "unknown",
          "rate_limited",
          "error",
        ] as CheckStatus[]
      ).map((status) => [
        status,
        results.filter((result) => result.status === status).length,
      ]),
    ) as Record<CheckStatus, number>;
    return byStatus;
  }, [results]);

  const uniqueTotal = processed.valid.length + processed.invalid.length;
  const completedInputResults = results.filter((result) =>
    processed.all.some((item) => item.normalized === result.normalizedUsername),
  ).length;
  const progress =
    uniqueTotal === 0
      ? 0
      : Math.min(100, Math.round((completedInputResults / uniqueTotal) * 100));

  function exportResults(format: "csv" | "json", subset = visibleResults) {
    const stamp = new Date().toISOString().slice(0, 10);
    if (format === "csv")
      downloadFile(
        resultsToCsv(subset),
        `osrs-name-results-${stamp}.csv`,
        "text/csv;charset=utf-8",
      );
    else
      downloadFile(
        resultsToJson(subset),
        `osrs-name-results-${stamp}.json`,
        "application/json",
      );
  }

  function removeInputEntry(entry: ValidationResult) {
    setInput(
      processed.all
        .filter((item) => item.normalized !== entry.normalized)
        .map((item) => item.display)
        .join("\n"),
    );
  }

  return (
    <div className="space-y-6">
      {restored && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-[#4b432b] bg-[#1c1911] p-3 text-xs text-[#bdb397]">
          <span>
            Restored your most recent bulk workspace from this browser.
          </span>
          <button
            className="font-extrabold text-[#e0c06b]"
            onClick={() => setRestored(false)}
          >
            Dismiss
          </button>
        </div>
      )}

      <section className="surface rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="display-font text-xl font-bold text-[#eee3c4]">
              Username input
            </h2>
            <p className="mt-1 text-sm text-[#92988f]">
              One per line or comma-separated. Import up to 100 names.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="secondary-button inline-flex items-center px-3 py-2 text-xs">
              Import TXT / CSV
              <input
                className="sr-only"
                type="file"
                accept=".txt,.csv,text/plain,text/csv"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file || file.size > 1_000_000) {
                    if (file)
                      setError("Choose a TXT or CSV file smaller than 1 MB.");
                    return;
                  }
                  void file
                    .text()
                    .then((text) =>
                      setInput((current) =>
                        current ? `${current}\n${text}` : text,
                      ),
                    );
                  event.target.value = "";
                }}
              />
            </label>
            <button
              className="secondary-button px-3 py-2 text-xs"
              onClick={() =>
                setInput(
                  "Zezima\nWise Old Man\nIron Example\nRune-Player\nName_One",
                )
              }
            >
              Load examples
            </button>
            <button
              className="secondary-button px-3 py-2 text-xs"
              onClick={() => setInput("")}
            >
              Clear names
            </button>
          </div>
        </div>
        <textarea
          className="field mt-5 min-h-48 resize-y p-4 font-mono text-sm leading-6"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={"Zezima\nRune Player\nIron Example"}
          aria-label="Bulk usernames"
        />
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ["Entered", processed.entered],
            ["Valid", processed.valid.length],
            ["Invalid", processed.invalid.length],
            ["Duplicates removed", processed.duplicatesRemoved],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-lg border border-[#333832] bg-black/15 px-3 py-2"
            >
              <span className="block text-[10px] font-black tracking-wider text-[#737a72] uppercase">
                {label}
              </span>
              <span className="mt-1 block text-lg font-bold text-[#e3decf]">
                {value}
              </span>
            </div>
          ))}
        </div>

        {processed.invalid.length > 0 && (
          <details
            className="mt-4 rounded-xl border border-red-400/25 bg-red-500/5 p-4"
            open
          >
            <summary className="cursor-pointer text-sm font-extrabold text-red-200">
              Review {processed.invalid.length} invalid{" "}
              {processed.invalid.length === 1 ? "name" : "names"}
            </summary>
            <ul className="mt-3 space-y-2">
              {processed.invalid.map((entry) => (
                <li
                  className="flex items-center justify-between gap-3 text-xs"
                  key={`${entry.normalized}-${entry.display}`}
                >
                  <span className="min-w-0">
                    <strong className="text-[#ede6d7]">
                      {entry.display || "(empty)"}
                    </strong>
                    <span className="ml-2 text-red-300/75">{entry.error}</span>
                  </span>
                  <button
                    className="font-bold text-[#aaa] hover:text-white"
                    onClick={() => removeInputEntry(entry)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </details>
        )}

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            className="primary-button px-5 py-3 text-sm"
            disabled={
              processed.valid.length === 0 ||
              state === "running" ||
              state === "paused"
            }
            onClick={() => void startSearch()}
          >
            {results.length > 0 && state !== "complete"
              ? "Resume remaining names"
              : "Check all valid names"}
          </button>
          {state === "running" && (
            <button
              className="secondary-button px-4 py-3 text-sm"
              onClick={pauseSearch}
            >
              Pause after current batch
            </button>
          )}
          {state === "paused" && (
            <button
              className="secondary-button px-4 py-3 text-sm"
              onClick={resumeSearch}
            >
              Resume
            </button>
          )}
          {(state === "running" || state === "paused") && (
            <button
              className="secondary-button px-4 py-3 text-sm text-red-200"
              onClick={stopSearch}
            >
              Stop search
            </button>
          )}
          {results.length > 0 && (
            <button
              className="secondary-button px-4 py-3 text-sm"
              onClick={() => {
                resultsRef.current = [];
                setResults([]);
                setState("idle");
                removeLocal(BULK_KEY);
              }}
            >
              Clear results
            </button>
          )}
        </div>
        {(state !== "idle" || results.length > 0) && (
          <div className="mt-5">
            <div className="flex items-center justify-between text-xs font-bold text-[#999f96]">
              <span className="capitalize">
                {state === "stopped"
                  ? "Stopped — completed results kept"
                  : cooldownSeconds > 0
                    ? `Provider cooldown · ${cooldownSeconds}s`
                    : state}
              </span>
              <span>
                {completedInputResults} of {uniqueTotal} complete ·{" "}
                {Math.max(0, uniqueTotal - completedInputResults)} remaining
              </span>
            </div>
            <div
              className="mt-2 h-2 overflow-hidden rounded-full bg-[#292d28]"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#8d6929] to-[#d8b65d] transition-[width]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}
      </section>

      {error && (
        <div
          className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200"
          role="alert"
        >
          {error}
        </div>
      )}

      {results.length > 0 && (
        <>
          <section className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
            {[
              ["Total", results.length],
              ["Taken", counts.taken],
              ["Possible", counts.possibly_available],
              ["Invalid", counts.invalid],
              ["Unknown", counts.unknown],
              ["Limited", counts.rate_limited],
              ["Error", counts.error],
              ["Shortlisted", Object.keys(shortlist).length],
            ].map(([label, value]) => (
              <div className="surface rounded-xl p-3" key={label}>
                <span className="block text-[10px] font-black tracking-wider text-[#747a72] uppercase">
                  {label}
                </span>
                <strong className="mt-1 block text-xl text-[#ebe4d2]">
                  {value}
                </strong>
              </div>
            ))}
          </section>

          <section className="surface overflow-hidden rounded-2xl">
            <div className="flex flex-col gap-3 border-b border-[#333832] p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="grid gap-2 sm:grid-cols-3">
                <input
                  className="field px-3 py-2 text-sm"
                  placeholder="Search results"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                <select
                  className="field px-3 py-2 text-sm"
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as BulkStatusFilter)
                  }
                  aria-label="Filter results"
                >
                  <option value="all">All statuses</option>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                  <option value="shortlisted">Shortlisted</option>
                </select>
                <select
                  className="field px-3 py-2 text-sm"
                  value={sortKey}
                  onChange={(event) =>
                    setSortKey(event.target.value as BulkSortKey)
                  }
                  aria-label="Sort results"
                >
                  <option value="username">Sort: Username</option>
                  <option value="status">Sort: Status</option>
                  <option value="confidence">Sort: Confidence</option>
                  <option value="overall">Sort: Overall level</option>
                  <option value="response">Sort: Response time</option>
                  <option value="checked">Sort: Checked time</option>
                </select>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="secondary-button px-3 py-2 text-xs"
                  onClick={() => exportResults("csv")}
                >
                  Export view CSV
                </button>
                <button
                  className="secondary-button px-3 py-2 text-xs"
                  onClick={() => exportResults("json")}
                >
                  Export view JSON
                </button>
                {Object.keys(shortlist).length > 0 && (
                  <button
                    className="secondary-button px-3 py-2 text-xs"
                    onClick={() =>
                      void navigator.clipboard.writeText(
                        Object.values(shortlist)
                          .map((item) => item.username)
                          .join("\n"),
                      )
                    }
                  >
                    Copy shortlist
                  </button>
                )}
              </div>
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                <thead className="bg-black/20 text-[10px] tracking-wider text-[#747a72] uppercase">
                  <tr>
                    <th className="px-4 py-3">Username</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Confidence</th>
                    <th className="px-4 py-3">Sources</th>
                    <th className="px-4 py-3">Overall</th>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Checked</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2d312d]">
                  {visibleResults.map((result) => (
                    <tr
                      key={`${result.normalizedUsername}-${result.checkedAt}`}
                      className="hover:bg-white/[0.025]"
                    >
                      <td className="px-4 py-4 font-bold text-[#ece6d5]">
                        {result.query}
                      </td>
                      <td className="px-4 py-4">
                        <StatusBadge status={result.status} />
                      </td>
                      <td className="px-4 py-4 text-[#b7bbb2] capitalize">
                        {result.confidence}
                      </td>
                      <td className="px-4 py-4 text-xs text-[#999f96]">
                        {result.sources
                          .filter((source) => source.status === "found")
                          .map((source) => source.providerName)
                          .join(", ") || `${result.sources.length} checked`}
                      </td>
                      <td className="px-4 py-4 text-[#c9c6bb]">
                        {getOverallLevel(result) ?? "—"}
                      </td>
                      <td className="px-4 py-4 text-[#999f96]">
                        {result.responseTimeMs} ms
                      </td>
                      <td className="px-4 py-4 text-xs text-[#858b82]">
                        {new Date(result.checkedAt).toLocaleTimeString()}
                      </td>
                      <td className="px-4 py-4">
                        <ResultActions
                          result={result}
                          shortlisted={Boolean(
                            shortlist[result.normalizedUsername],
                          )}
                          onToggleShortlist={toggleShortlist}
                          onRecheck={recheck}
                          onRemove={(target) =>
                            replaceResults(
                              resultsRef.current.filter(
                                (item) =>
                                  item.normalizedUsername !==
                                  target.normalizedUsername,
                              ),
                            )
                          }
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-[#2f332e] md:hidden">
              {visibleResults.map((result) => (
                <article
                  className="p-4"
                  key={`${result.normalizedUsername}-${result.checkedAt}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-[#eee8d8]">
                        {result.query}
                      </h3>
                      <p className="mt-1 text-xs text-[#858b82] capitalize">
                        {result.confidence} confidence · {result.responseTimeMs}{" "}
                        ms
                      </p>
                    </div>
                    <StatusBadge status={result.status} />
                  </div>
                  <details className="mt-3 rounded-lg border border-[#343832] bg-black/10 p-3">
                    <summary className="text-xs font-bold text-[#aaaFA7]">
                      Source details
                    </summary>
                    <ul className="mt-2 space-y-1 text-xs text-[#8f958d]">
                      {result.sources.map((source) => (
                        <li key={source.providerId}>
                          {source.providerName}:{" "}
                          {source.status.replace("_", " ")}
                        </li>
                      ))}
                    </ul>
                  </details>
                  <div className="mt-3">
                    <ResultActions
                      result={result}
                      shortlisted={Boolean(
                        shortlist[result.normalizedUsername],
                      )}
                      onToggleShortlist={toggleShortlist}
                      onRecheck={recheck}
                      onRemove={(target) =>
                        replaceResults(
                          resultsRef.current.filter(
                            (item) =>
                              item.normalizedUsername !==
                              target.normalizedUsername,
                          ),
                        )
                      }
                    />
                  </div>
                </article>
              ))}
            </div>
            {visibleResults.length === 0 && (
              <p className="p-8 text-center text-sm text-[#858b82]">
                No results match these filters.
              </p>
            )}
          </section>

          <p className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-xs leading-5 text-[#cbbd92]">
            Names listed as possibly available were not found by the public
            sources checked. This does not guarantee that they can be claimed.
            Confirm each name through the official in-game RuneScape name-change
            interface.
          </p>
          {Object.keys(shortlist).length > 0 && (
            <p className="text-center text-xs text-[#8e928a]">
              Shortlisted usernames are not reserved and may be claimed by
              another player.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function ResultActions({
  result,
  shortlisted,
  onToggleShortlist,
  onRecheck,
  onRemove,
}: {
  result: CheckResult;
  shortlisted: boolean;
  onToggleShortlist: (result: CheckResult) => void;
  onRecheck: (result: CheckResult) => Promise<void>;
  onRemove: (result: CheckResult) => void;
}) {
  const profiles = result.sources.filter((source) => source.profileUrl);
  return (
    <div className="flex flex-wrap items-center gap-1">
      <button
        className="rounded-md px-2 py-1.5 text-xs font-bold text-[#b9bdb4] hover:bg-white/5 hover:text-white"
        onClick={() => void onRecheck(result)}
      >
        Recheck
      </button>
      <button
        className="rounded-md px-2 py-1.5 text-xs font-bold text-[#b9bdb4] hover:bg-white/5 hover:text-white"
        onClick={() => void navigator.clipboard.writeText(result.query)}
      >
        Copy
      </button>
      <button
        className={`rounded-md px-2 py-1.5 text-xs font-bold hover:bg-white/5 ${shortlisted ? "text-[#edc75e]" : "text-[#b9bdb4]"}`}
        onClick={() => onToggleShortlist(result)}
      >
        {shortlisted ? "★ Saved" : "☆ Save"}
      </button>
      {profiles[0]?.profileUrl && (
        <a
          className="rounded-md px-2 py-1.5 text-xs font-bold text-[#d5b45b] hover:bg-white/5"
          href={profiles[0].profileUrl}
          target="_blank"
          rel="noreferrer"
        >
          Profile ↗
        </a>
      )}
      <button
        className="rounded-md px-2 py-1.5 text-xs font-bold text-[#8f948c] hover:bg-red-500/10 hover:text-red-200"
        onClick={() => onRemove(result)}
      >
        Remove
      </button>
    </div>
  );
}
