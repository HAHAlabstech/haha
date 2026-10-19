"use client";

import Link from "next/link";
import { Mic, Orbit, Users, Database } from "lucide-react";

export default function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-white/10 bg-[#060606] px-[clamp(20px,4vw,56px)] pb-12 pt-20">
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-14 grid gap-10 md:grid-cols-[1.3fr_1fr] md:items-end">
          <div>
            <span className="hud-badge text-[10px]">
              Curtain Call · Humans Are Hard to Automate
            </span>
            <h2 className="display-serif mt-4 text-4xl text-white md:text-6xl">
              Tell a joke that fools the AI — <em className="text-[#ffb13b]">and get paid.</em>
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-3 md:justify-end">
            <Link href="/app?tab=stage" className="pill-btn hot flex items-center gap-2">
              <Mic className="w-3.5 h-3.5" />
              <span>Take the stage</span>
            </Link>
            <Link href="/showtime" className="pill-btn flex items-center gap-2">
              <Orbit className="w-3.5 h-3.5 text-zinc-400" />
              <span>360° Showtime Orbit</span>
            </Link>
            <Link href="/app?tab=crowd" className="pill-btn flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-zinc-400" />
              <span>Join the Crowd</span>
            </Link>
            <Link href="/app?tab=vault" className="pill-btn flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-zinc-400" />
              <span>Open the Vault</span>
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 font-mono text-[11px] uppercase tracking-[0.15em] text-zinc-400">
          <span>
            © HAHA · Season 01 · The Straight Man &amp; The Joke Vault
          </span>
          <nav className="flex flex-wrap gap-5" aria-label="Footer">
            <Link href="/showtime" className="hover:text-[#ffb13b] transition-colors">
              Showtime
            </Link>
            <Link href="/rules" className="hover:text-[#ffb13b] transition-colors">
              Rules
            </Link>
            <Link href="/faq" className="hover:text-[#ffb13b] transition-colors">
              FAQ
            </Link>
            <Link href="/vault/method" className="hover:text-[#ffb13b] transition-colors">
              Methodology
            </Link>
            <Link href="/seasons" className="hover:text-[#ffb13b] transition-colors">
              Seasons
            </Link>
            <Link href="/producers" className="hover:text-[#ffb13b] transition-colors">
              Producers
            </Link>
          </nav>
          <span className="text-zinc-500">Good night · Drive safe · Tip your waitstaff</span>
        </div>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-600">
          Rewards vary and depend on the Tip Jar. Nothing on this site is
          financial advice.
        </p>
      </div>
    </footer>
  );
}
