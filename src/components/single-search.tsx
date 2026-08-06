"use client";

import { useEffect, useState } from "react";
import { ResultCard } from "@/components/result-card";
import { StatusBadge } from "@/components/status-badge";
import { readLocal, writeLocal } from "@/lib/storage/client";
import type { CheckResult } from "@/types/check";

const HISTORY_KEY = "osrs-name-checker:single-history:v1";

export function SingleSearch() {
  const [username, setUsername] = useState("");
  const [result, setResult] = useState<CheckResult | null>(null);
  const [history, setHistory] = useState<CheckResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      setHistory(readLocal<CheckResult[]>(HISTORY_KEY, []).slice(0, 10)),
    );
    return () => cancelAnimationFrame(frame);
  }, []);

  async function checkName(name = username) {
    if (!name.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/check?username=${encodeURIComponent(name)}`,
      );
      const body = (await response.json()) as CheckResult | { error?: string };
      if (!("status" in body))
        throw new Error(body.error ?? "The search could not be completed.");
      setResult(body);
      setUsername(body.query);
      const next = [
        body,
        ...history.filter(
          (item) => item.normalizedUsername !== body.normalizedUsername,
        ),
      ].slice(0, 10);
      setHistory(next);
      writeLocal(HISTORY_KEY, next);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The search could not be completed.",
      );
    } finally {
      setLoading(false);
    }
  }

  function removeHistory(normalizedUsername: string) {
    const next = history.filter(
      (item) => item.normalizedUsername !== normalizedUsername,
    );
    setHistory(next);
    writeLocal(HISTORY_KEY, next);
  }

  return (
    <div className="space-y-8">
      <form
        className="surface rounded-2xl p-3 sm:p-4"
        onSubmit={(event) => {
          event.preventDefault();
          void checkName();
        }}
      >
        <label className="sr-only" htmlFor="username">
          OSRS username
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="username"
            className="field min-h-14 flex-1 px-4 text-lg font-bold placeholder:font-normal placeholder:text-[#646a63]"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            maxLength={100}
            autoComplete="off"
            placeholder="Enter an OSRS username"
          />
          <button
            className="primary-button min-h-14 px-7"
            disabled={loading || !username.trim()}
          >
            {loading ? "Checking sources…" : "Check name"}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-[#858b82]">
          <span>
            1–12 characters · Letters, numbers, spaces, hyphens, underscores
          </span>
          <span>Never labeled guaranteed available</span>
        </div>
      </form>

      {loading && !result && (
        <div
          className="surface animate-pulse rounded-2xl p-6"
          aria-label="Loading result"
        >
          <div className="h-4 w-28 rounded bg-white/8" />
          <div className="mt-4 h-9 w-52 rounded bg-white/8" />
          <div className="mt-5 h-28 rounded-xl bg-white/5" />
        </div>
      )}
      {error && (
        <div
          className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200"
          role="alert"
        >
          {error}
        </div>
      )}
      {result && <ResultCard result={result} />}

      {history.length > 0 && (
        <section>
          <div className="flex items-center justify-between">
            <h2 className="display-font text-xl font-bold text-[#ece4ca]">
              Recent checks
            </h2>
            <button
              className="text-xs font-bold text-[#91968d] hover:text-white"
              onClick={() => {
                setHistory([]);
                writeLocal(HISTORY_KEY, []);
              }}
            >
              Clear history
            </button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {history.map((item) => (
              <div
                key={`${item.normalizedUsername}-${item.checkedAt}`}
                className="flex items-center gap-3 rounded-xl border border-[#30342f] bg-[#141715] p-3"
              >
                <button
                  className="min-w-0 flex-1 text-left"
                  onClick={() => void checkName(item.query)}
                >
                  <span className="block truncate text-sm font-bold text-[#e3dfd1]">
                    {item.query}
                  </span>
                  <span className="mt-1 block text-[11px] text-[#777d76]">
                    {new Date(item.checkedAt).toLocaleString()}
                  </span>
                </button>
                <StatusBadge status={item.status} />
                <button
                  className="grid size-8 place-items-center rounded-lg text-[#777d76] hover:bg-white/5 hover:text-white"
                  onClick={() => void navigator.clipboard.writeText(item.query)}
                  aria-label={`Copy ${item.query}`}
                  title="Copy username"
                >
                  ⧉
                </button>
                <button
                  className="grid size-8 place-items-center rounded-lg text-[#777d76] hover:bg-white/5 hover:text-red-300"
                  onClick={() => removeHistory(item.normalizedUsername)}
                  aria-label={`Remove ${item.query} from history`}
                  title="Remove"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
