import Link from "next/link";
import { SingleSearch } from "@/components/single-search";

export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-14 sm:px-6 sm:pt-20">
      <section className="text-center">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#4c4229] bg-[#201c13] px-3 py-1.5 text-xs font-bold text-[#cdb66f]">
          <span className="size-1.5 rounded-full bg-[#d2aa50] shadow-[0_0_8px_#d2aa50]" />
          Live public-source checks
        </div>
        <h1 className="display-font mx-auto mt-6 max-w-3xl text-4xl leading-tight font-bold text-[#f6edcf] sm:text-6xl">
          Check a name without the false promise.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#aeb3aa] sm:text-lg">
          Search official OSRS Hiscores and reputable public trackers. We show
          the evidence, its confidence, and what it cannot prove.
        </p>
      </section>

      <div className="mt-10">
        <SingleSearch />
      </div>

      <section className="mt-16 grid gap-4 md:grid-cols-3">
        {[
          [
            "Official first",
            "A ranked match from the official OSRS Hiscores is high-confidence evidence that the name is taken.",
          ],
          [
            "Failures stay unknown",
            "Timeouts, malformed responses, and provider outages are never converted into availability.",
          ],
          [
            "Bulk, without flooding",
            "Check up to 100 names through a controlled queue with progress, pause, stop, and exports.",
          ],
        ].map(([title, copy], index) => (
          <article className="surface rounded-xl p-5" key={title}>
            <span className="text-xs font-black text-[#a3843e]">
              0{index + 1}
            </span>
            <h2 className="display-font mt-3 text-lg font-bold text-[#eae1c5]">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#999f96]">{copy}</p>
          </article>
        ))}
      </section>

      <section className="mt-12 rounded-2xl border border-[#494027] bg-[#1c1911] p-6 sm:flex sm:items-center sm:justify-between sm:gap-6">
        <div>
          <h2 className="display-font text-xl font-bold text-[#ead9a2]">
            Checking a list?
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#aaa38e]">
            Paste names or import TXT/CSV, then filter, shortlist, and export
            the evidence.
          </p>
        </div>
        <Link
          href="/bulk"
          className="secondary-button mt-4 inline-flex px-5 py-3 text-sm sm:mt-0"
        >
          Open bulk checker →
        </Link>
      </section>

      <section className="mt-10 text-center text-xs leading-6 text-[#7b817a]">
        <p>
          A missing Hiscores or tracker profile does not mean a name is
          claimable. It may be unranked, inactive, reserved, recently changed,
          filtered, or inappropriate.
        </p>
        <p className="mt-2 font-bold text-[#a69a74]">
          Confirm possible names through the official in-game RuneScape
          name-change interface.
        </p>
      </section>
    </div>
  );
}
