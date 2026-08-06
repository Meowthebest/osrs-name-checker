"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { validateUsername } from "@/lib/validation/username";
import { readLocal, writeLocal } from "@/lib/storage/client";
import type { BulkResponse, CheckResult } from "@/types/check";

const SHORTLIST_KEY = "osrs-name-checker:shortlist:v1";
type Category =
  | "short"
  | "fantasy"
  | "pvm"
  | "pvp"
  | "ironman"
  | "skilling"
  | "funny"
  | "two-word";

const words: Record<Exclude<Category, "short">, [string[], string[]]> = {
  fantasy: [
    ["Ash", "Rune", "Void", "Fae", "Dusk", "Oak"],
    ["Warden", "Seer", "Vale", "Bane", "Song", "Moth"],
  ],
  pvm: [
    ["Raid", "Nex", "Boss", "Prayer", "Drop", "DPS"],
    ["Ready", "Tank", "MVP", "Dry", "Stack", "Skip"],
  ],
  pvp: [
    ["Wildy", "Risk", "Skull", "Barrage", "Spec", "Edge"],
    ["King", "Stack", "Tick", "KO", "Mage", "Pure"],
  ],
  ironman: [
    ["Iron", "Solo", "Helm", "NoGE", "Grey", "DIY"],
    ["Grind", "Drop", "Luck", "Core", "Life", "Mode"],
  ],
  skilling: [
    ["Skill", "Rune", "Max", "Tick", "XP", "Pet"],
    ["Crafter", "Grind", "Cape", "Chop", "Mine", "Gain"],
  ],
  funny: [
    ["Bad", "Tiny", "Lost", "Sleepy", "No", "Free"],
    ["Loot", "Goblin", "Shrimp", "GP", "XP", "Chair"],
  ],
  "two-word": [
    ["Quiet", "Golden", "Soft", "Swift", "Clear", "North"],
    ["River", "Ember", "Stone", "Cloud", "Fox", "Moon"],
  ],
};

function pick<T>(values: T[]): T {
  return values[Math.floor(Math.random() * values.length)] as T;
}

function generate(category: Category, count = 12): string[] {
  const names = new Set<string>();
  let attempts = 0;
  while (names.size < count && attempts++ < 200) {
    const candidate =
      category === "short"
        ? `${pick(["A", "E", "I", "O", "U", "X", "Z"])}${pick(["r", "v", "n", "l", "k", "m"])}${Math.floor(10 + Math.random() * 90)}`
        : `${pick(words[category][0])}${category === "two-word" ? " " : ""}${pick(words[category][1])}`;
    const validation = validateUsername(candidate);
    if (validation.valid) names.add(validation.display);
  }
  return [...names];
}

export function NameGenerator() {
  const [category, setCategory] = useState<Category>("fantasy");
  const [names, setNames] = useState<string[]>(() => generate("fantasy"));
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<Record<string, CheckResult>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function regenerate(nextCategory = category) {
    setCategory(nextCategory);
    setNames(generate(nextCategory));
    setSelected(new Set());
    setResults({});
  }

  async function checkSelected() {
    if (selected.size === 0) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/check/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usernames: [...selected] }),
      });
      const body = (await response.json()) as BulkResponse | { error?: string };
      if (!("results" in body))
        throw new Error(
          body.error ?? "The selected names could not be checked.",
        );
      setResults(
        Object.fromEntries(
          body.results.map((result) => [result.normalizedUsername, result]),
        ),
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The selected names could not be checked.",
      );
    } finally {
      setLoading(false);
    }
  }

  function shortlist(result: CheckResult) {
    const current = readLocal<
      Record<string, { username: string; checkedAt: string }>
    >(SHORTLIST_KEY, {});
    if (
      Object.keys(current).length >= 100 &&
      !current[result.normalizedUsername]
    )
      return;
    current[result.normalizedUsername] = {
      username: result.query,
      checkedAt: result.checkedAt,
    };
    writeLocal(SHORTLIST_KEY, current);
  }

  return (
    <div className="space-y-6">
      <section className="surface rounded-2xl p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="w-full max-w-sm">
            <label
              className="text-xs font-black tracking-wider text-[#8d917f] uppercase"
              htmlFor="category"
            >
              Style
            </label>
            <select
              id="category"
              className="field mt-2 px-3 py-3"
              value={category}
              onChange={(event) => regenerate(event.target.value as Category)}
            >
              <option value="short">Short names</option>
              <option value="fantasy">Fantasy names</option>
              <option value="pvm">PvM names</option>
              <option value="pvp">PvP names</option>
              <option value="ironman">Ironman names</option>
              <option value="skilling">Skilling names</option>
              <option value="funny">Funny names</option>
              <option value="two-word">Clean two-word names</option>
            </select>
          </div>
          <button
            className="secondary-button px-5 py-3 text-sm"
            onClick={() => regenerate()}
          >
            Generate 12 new names
          </button>
        </div>
        <p className="mt-4 text-xs leading-5 text-[#858b82]">
          Generation is local and does not make provider requests. Select only
          the ideas you want to check.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {names.map((name) => {
          const normalized = validateUsername(name).normalized;
          const result = results[normalized];
          const checked = selected.has(name);
          return (
            <label
              key={name}
              className={`surface flex items-center gap-3 rounded-xl p-4 transition-colors ${checked ? "border-[#9b7b36]" : ""}`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() =>
                  setSelected((current) => {
                    const next = new Set(current);
                    if (next.has(name)) next.delete(name);
                    else next.add(name);
                    return next;
                  })
                }
                className="size-4 accent-[#c9a24e]"
              />
              <span className="min-w-0 flex-1 truncate font-bold text-[#ece6d5]">
                {name}
              </span>
              {result && <StatusBadge status={result.status} />}
              {result && (
                <button
                  type="button"
                  className="text-lg text-[#d5ae4f]"
                  title="Add to shortlist"
                  aria-label={`Shortlist ${name}`}
                  onClick={(event) => {
                    event.preventDefault();
                    shortlist(result);
                  }}
                >
                  ☆
                </button>
              )}
            </label>
          );
        })}
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button
          className="primary-button px-5 py-3 text-sm"
          disabled={selected.size === 0 || loading}
          onClick={() => void checkSelected()}
        >
          {loading ? "Checking selected…" : `Check ${selected.size} selected`}
        </button>
        <button
          className="secondary-button px-4 py-3 text-sm"
          disabled={selected.size === 0}
          onClick={() => setSelected(new Set())}
        >
          Clear selection
        </button>
        <span className="text-xs text-[#858b82]">
          Results can only be Taken, Possibly available, Invalid, Unknown, Rate
          limited, or Error.
        </span>
      </div>
      {error && (
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </p>
      )}
      {Object.keys(results).length > 0 && (
        <p className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-xs leading-5 text-[#cbbd92]">
          Generated names marked possibly available were not found by the public
          sources checked. Confirm claimability through the official in-game
          name-change interface.
        </p>
      )}
    </div>
  );
}
