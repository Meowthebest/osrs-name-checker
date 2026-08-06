import { ConfidenceBadge, StatusBadge } from "@/components/status-badge";
import type { CheckResult, ProviderStatus } from "@/types/check";

const sourceStatusLabel: Record<ProviderStatus, string> = {
  found: "Found",
  not_found: "Not found",
  unavailable: "Unavailable",
  rate_limited: "Rate limited",
  timeout: "Timed out",
  error: "Error",
};

export function ResultCard({ result }: { result: CheckResult }) {
  return (
    <article className="surface overflow-hidden rounded-2xl" aria-live="polite">
      <div className="flex flex-col gap-4 border-b border-[#33382f] p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div>
          <p className="text-xs font-black tracking-[0.18em] text-[#8f815a] uppercase">
            Search result
          </p>
          <h2 className="display-font mt-2 text-3xl font-bold break-words text-[#f7edcc]">
            {result.query}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#c4c7bd]">
            {result.summary}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <StatusBadge status={result.status} />
          <ConfidenceBadge confidence={result.confidence} />
        </div>
      </div>

      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1fr_0.62fr]">
        <section>
          <h3 className="text-sm font-extrabold text-[#e7dfc7]">
            Source evidence
          </h3>
          {result.sources.length === 0 ? (
            <p className="mt-3 rounded-xl border border-[#343832] bg-black/15 p-4 text-sm text-[#9ea39a]">
              No provider requests were made.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {result.sources.map((source) => (
                <li
                  key={source.providerId}
                  className="rounded-xl border border-[#353a33] bg-black/15 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#ece6d5]">
                        {source.providerName}
                      </span>
                      {source.official && (
                        <span className="rounded bg-[#463b20] px-1.5 py-0.5 text-[10px] font-black text-[#dfc271] uppercase">
                          Official
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-bold text-[#aaa99f]">
                      {sourceStatusLabel[source.status]} ·{" "}
                      {source.responseTimeMs} ms
                    </span>
                  </div>
                  {source.message && (
                    <p className="mt-2 text-xs leading-5 text-[#989e95]">
                      {source.message}
                    </p>
                  )}
                  {source.details && (
                    <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs">
                      {source.details.overallLevel !== undefined && (
                        <div>
                          <dt className="inline text-[#82887f]">Overall </dt>
                          <dd className="inline font-bold">
                            {source.details.overallLevel}
                          </dd>
                        </div>
                      )}
                      {source.details.combatLevel !== undefined && (
                        <div>
                          <dt className="inline text-[#82887f]">Combat </dt>
                          <dd className="inline font-bold">
                            {source.details.combatLevel}
                          </dd>
                        </div>
                      )}
                      {source.details.overallRank !== undefined && (
                        <div>
                          <dt className="inline text-[#82887f]">Rank </dt>
                          <dd className="inline font-bold">
                            #{source.details.overallRank.toLocaleString()}
                          </dd>
                        </div>
                      )}
                    </dl>
                  )}
                  {source.profileUrl && (
                    <a
                      className="mt-3 inline-flex text-xs font-extrabold text-[#d7b65d] underline decoration-[#6d5b2e] underline-offset-4 hover:text-[#f1d47e]"
                      href={source.profileUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open public profile ↗
                    </a>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="rounded-xl border border-[#413d2b] bg-[#1b1912] p-4">
          <h3 className="text-sm font-extrabold text-[#e9dba9]">
            What this means
          </h3>
          <p className="mt-2 text-sm leading-6 text-[#bdb9a8]">
            {result.confidenceExplanation}
          </p>
          {result.warnings.map((warning) => (
            <p
              key={warning}
              className="mt-3 border-l-2 border-[#b78b34] pl-3 text-xs leading-5 text-[#c9bd96]"
            >
              {warning}
            </p>
          ))}
          <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-[#3b3727] pt-4 text-xs">
            <div>
              <dt className="text-[#797b72]">Checked</dt>
              <dd className="mt-1 font-bold text-[#d5d0bf]">
                {new Date(result.checkedAt).toLocaleTimeString()}
              </dd>
            </div>
            <div>
              <dt className="text-[#797b72]">Total time</dt>
              <dd className="mt-1 font-bold text-[#d5d0bf]">
                {result.responseTimeMs} ms
              </dd>
            </div>
          </dl>
        </aside>
      </div>
    </article>
  );
}
