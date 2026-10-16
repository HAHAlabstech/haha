import type { Metadata } from "next";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import LaocoonChrome from "@/components/LaocoonChrome";
import "./globals.css";

export const metadata: Metadata = {
  title: "HAHA — Humans Are Hard to Automate",
  description:
    "Tell a joke that fools the AI and get paid. An open comedy club & AI lab where people stump the Straight Man AI, verified by a human crowd.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,200..500;1,9..144,200..400&family=Geist+Mono:wght@300;400;500&family=Geist:wght@300;400;500;600&family=Italiana&family=Outfit:wght@200;300;400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <LaocoonChrome />
        <SiteNav />
        <main className="relative z-10 min-h-screen">{children}</main>
        <footer className="relative z-10 border-t border-[#efe8dc]/12 px-[clamp(20px,4vw,56px)] pb-12 pt-20">
          <div className="mx-auto max-w-[1440px]">
            <div className="mb-14 grid gap-10 md:grid-cols-[1.3fr_1fr] md:items-end">
              <div>
                <span className="eyebrow">
                  Curtain Call · Humans Are Hard to Automate
                </span>
                <h2 className="display-serif mt-4 text-4xl text-[#fff6ed] md:text-6xl">
                  Tell a joke that fools the AI — <em>and get paid.</em>
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-3 md:justify-end">
                <Link href="/stage" className="pill-btn hot">
                  <span>🎤 Take the stage</span>
                </Link>
                <Link href="/showtime" className="pill-btn">
                  <span>360° Showtime Orbit</span>
                </Link>
                <Link href="/crowd" className="pill-btn">
                  <span>Join the Crowd</span>
                </Link>
                <Link href="/vault" className="pill-btn">
                  <span>Open the Vault</span>
                </Link>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#efe8dc]/10 pt-6 font-mono text-[11px] uppercase tracking-[0.15em] text-[#a49b8e]">
              <span>
                © HAHA · Season 01 · The Straight Man &amp; The Joke Vault
              </span>
              <nav className="flex flex-wrap gap-5" aria-label="Footer">
                <Link href="/showtime" className="hover:text-[#ffb13b]">
                  Showtime
                </Link>
                <Link href="/rules" className="hover:text-[#ffb13b]">
                  Rules
                </Link>
                <Link href="/faq" className="hover:text-[#ffb13b]">
                  FAQ
                </Link>
                <Link href="/vault/method" className="hover:text-[#ffb13b]">
                  Methodology
                </Link>
                <Link href="/seasons" className="hover:text-[#ffb13b]">
                  Seasons
                </Link>
                <Link href="/producers" className="hover:text-[#ffb13b]">
                  Producers
                </Link>
              </nav>
              <span>Good night · Drive safe · Tip your waitstaff</span>
            </div>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-[#6c6459]">
              Rewards vary and depend on the Tip Jar. Nothing on this site is
              financial advice.
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
