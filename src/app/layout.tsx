import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "OSRS Name Checker", template: "%s · OSRS Name Checker" },
  description:
    "Check evidence from OSRS Hiscores and public trackers for one or many RuneScape usernames.",
  applicationName: "OSRS Name Checker",
  openGraph: {
    title: "OSRS Name Checker",
    description: "Transparent single and bulk OSRS username evidence checks.",
    type: "website",
    url: "/",
  },
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <header className="border-b border-[#292d28] bg-[#0d0f0e]/90 backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
            <Link
              href="/"
              className="group flex items-center gap-3"
              aria-label="OSRS Name Checker home"
            >
              <span className="grid size-10 place-items-center rounded-xl border border-[#806a36] bg-[#211d13] text-xl text-[#e0bd68] shadow-inner">
                ◈
              </span>
              <span>
                <span className="display-font block text-lg leading-none font-bold text-[#f4e7bd]">
                  OSRS Name Checker
                </span>
                <span className="mt-1 block text-[10px] font-bold tracking-[0.22em] text-[#95855b] uppercase">
                  Public evidence, clearly labeled
                </span>
              </span>
            </Link>
            <nav
              className="flex items-center gap-1 text-sm font-bold text-[#b8bcae]"
              aria-label="Main navigation"
            >
              <Link
                className="rounded-lg px-3 py-2 hover:bg-white/5 hover:text-white"
                href="/"
              >
                Single
              </Link>
              <Link
                className="rounded-lg px-3 py-2 hover:bg-white/5 hover:text-white"
                href="/bulk"
              >
                Bulk
              </Link>
              <Link
                className="hidden rounded-lg px-3 py-2 hover:bg-white/5 hover:text-white sm:block"
                href="/generator"
              >
                Generator
              </Link>
            </nav>
          </div>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="mt-20 border-t border-[#292d28] bg-[#0a0c0b]">
          <div className="mx-auto max-w-6xl px-4 py-8 text-center text-xs leading-6 text-[#858b82] sm:px-6">
            <p>
              OSRS Name Checker is an unofficial community tool and is not
              endorsed by or affiliated with Jagex. RuneScape and Old School
              RuneScape are trademarks of Jagex Ltd.
            </p>
            <p className="mt-2 text-[#686e67]">
              No login, account data, or continuous monitoring.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
