import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "HAHA — Humans Are Hard to Automate",
  description:
    "Tell a joke that fools the AI and get paid. An open lab where people stump the Straight Man AI, verified by a human crowd.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="club-bg antialiased">
        <SiteNav />
        <main className="mx-auto w-full max-w-6xl px-4 py-8">{children}</main>
        <footer className="mx-auto w-full max-w-6xl px-4 pb-10 pt-4">
          <div className="flex flex-col gap-3 border-t border-white/10 pt-6 text-sm text-zinc-400 md:flex-row md:items-center md:justify-between">
            <p>
              <span className="font-semibold text-amber-100">HAHA</span> —
              Humans Are Hard to Automate.
            </p>
            <nav className="flex flex-wrap gap-4" aria-label="Footer">
              <Link href="/rules" className="hover:text-zinc-100">
                Rules
              </Link>
              <Link href="/faq" className="hover:text-zinc-100">
                FAQ
              </Link>
              <Link href="/vault/method" className="hover:text-zinc-100">
                Methodology
              </Link>
              <Link href="/producers" className="hover:text-zinc-100">
                Producers
              </Link>
            </nav>
          </div>
          <p className="mt-3 text-xs text-zinc-600">
            Rewards vary and depend on the Tip Jar. Not financial advice.
          </p>
        </footer>
      </body>
    </html>
  );
}
