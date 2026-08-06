import type { CheckStatus, Confidence } from "@/types/check";

const labels: Record<CheckStatus, string> = {
  taken: "Taken",
  possibly_available: "Possibly available",
  invalid: "Invalid",
  unknown: "Unknown",
  rate_limited: "Rate limited",
  error: "Error",
};

const styles: Record<CheckStatus, string> = {
  taken: "border-red-500/35 bg-red-500/12 text-red-300",
  possibly_available: "border-amber-400/35 bg-amber-400/12 text-amber-200",
  invalid: "border-red-400/70 bg-transparent text-red-300",
  unknown: "border-zinc-500/40 bg-zinc-500/12 text-zinc-300",
  rate_limited: "border-violet-400/35 bg-violet-400/12 text-violet-200",
  error: "border-red-900 bg-red-950/60 text-red-200",
};

export function StatusBadge({ status }: { status: CheckStatus }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-extrabold ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  return (
    <span className="inline-flex rounded-full border border-[#4e503f] bg-[#24271f] px-2.5 py-1 text-xs font-bold text-[#d5cfb9] capitalize">
      {confidence} confidence
    </span>
  );
}

export { labels as statusLabels };
