import type { Metadata } from "next";
import { NameGenerator } from "@/components/name-generator";

export const metadata: Metadata = {
  title: "OSRS name generator",
  description:
    "Generate valid OSRS-style name ideas and selectively check public evidence.",
  alternates: { canonical: "/generator" },
};

export default function GeneratorPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-12 sm:px-6 sm:pt-16">
      <header className="max-w-3xl">
        <p className="text-xs font-black tracking-[0.2em] text-[#a98b47] uppercase">
          Ideas first, checks second
        </p>
        <h1 className="display-font mt-3 text-4xl font-bold text-[#f3e8c8] sm:text-5xl">
          OSRS name generator
        </h1>
        <p className="mt-4 text-base leading-7 text-[#a6aca3]">
          Generate rule-compliant ideas locally, select the ones worth checking,
          and keep claimability warnings attached to every result.
        </p>
      </header>
      <div className="mt-9">
        <NameGenerator />
      </div>
    </div>
  );
}
