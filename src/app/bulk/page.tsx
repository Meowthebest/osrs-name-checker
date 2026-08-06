import type { Metadata } from "next";
import { BulkChecker } from "@/components/bulk-checker";

export const metadata: Metadata = {
  title: "Bulk username checker",
  description:
    "Check, filter, shortlist, and export evidence for up to 100 OSRS usernames.",
  alternates: { canonical: "/bulk" },
};

export default function BulkPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 pt-12 sm:px-6 sm:pt-16">
      <header className="max-w-3xl">
        <p className="text-xs font-black tracking-[0.2em] text-[#a98b47] uppercase">
          Controlled queue
        </p>
        <h1 className="display-font mt-3 text-4xl font-bold text-[#f3e8c8] sm:text-5xl">
          Bulk name checker
        </h1>
        <p className="mt-4 text-base leading-7 text-[#a6aca3]">
          Import a list, review invalid entries, then check public evidence in
          rate-conscious batches. Stop anytime without losing completed work.
        </p>
      </header>
      <div className="mt-9">
        <BulkChecker />
      </div>
    </div>
  );
}
