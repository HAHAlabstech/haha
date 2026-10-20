"use client";

import Link from "next/link";
import { Mic, Users, Database, ArrowUpRight } from "lucide-react";

export default function SiteFooter() {
  return (
    <footer className="relative z-10 border-t border-white/[0.08] bg-[#070709] px-[clamp(20px,4vw,56px)] pb-12 pt-20">
      <div className="mx-auto max-w-[1440px]">
        <div className="mb-14 grid gap-10 md:grid-cols-[1.3fr_1fr] md:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#ffc53d]">
              <span>Curtain Call · Humans Are Hard to Automate</span>
            </div>
            <h2 className="display-serif mt-4 text-4xl text-white md:text-6xl tracking-tight leading-[1.05]">
              Tell a joke that fools the AI &mdash; <em className="text-[#ffc53d]">and get paid.</em>
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-3 md:justify-end">
            <Link
              href="/app?tab=stage"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#ffc53d] to-[#f59e0b] font-mono text-xs font-bold uppercase tracking-wider text-[#070709] shadow-[0_0_20px_rgba(255,197,61,0.3)] hover:scale-[1.02] transition-all"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Take The Stage</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/app?tab=crowd"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-white/10 bg-[#12121a] hover:bg-white/10 font-mono text-xs uppercase tracking-wider text-zinc-300 hover:text-white transition-all"
            >
              <Users className="w-3.5 h-3.5 text-zinc-400" />
              <span>Join The Crowd</span>
            </Link>
            <Link
              href="/app?tab=vault"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-white/10 bg-[#12121a] hover:bg-white/10 font-mono text-xs uppercase tracking-wider text-zinc-300 hover:text-white transition-all"
            >
              <Database className="w-3.5 h-3.5 text-zinc-400" />
              <span>Open The Vault</span>
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/[0.08] pt-6 font-mono text-[11px] uppercase tracking-[0.15em] text-zinc-400">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/logo-transparent.png"
              alt="HAHA Logo"
              className="h-5 w-auto object-contain filter drop-shadow-[0_0_4px_rgba(255,197,61,0.5)]"
            />
            <span>&copy; HAHA &middot; Season 01 &middot; The Straight Man &amp; The Joke Vault</span>
          </div>
          <nav className="flex flex-wrap gap-5" aria-label="Footer">
            <Link href="/#how-it-works" className="hover:text-[#ffc53d] transition-colors">
              How It Works
            </Link>
            <Link href="/#waveform" className="hover:text-[#ffc53d] transition-colors">
              The Science
            </Link>
            <Link href="/#vault" className="hover:text-[#ffc53d] transition-colors">
              Joke Vault
            </Link>
            <Link href="/#faq" className="hover:text-[#ffc53d] transition-colors">
              FAQ
            </Link>
            <Link href="/app?tab=stage" className="hover:text-[#ffc53d] transition-colors">
              App Console
            </Link>
          </nav>
          <span className="text-zinc-500">Good night &middot; Drive safe &middot; Tip your waitstaff</span>
        </div>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-600">
          Rewards vary and depend on the Tip Jar. Nothing on this site is financial advice.
        </p>
      </div>
    </footer>
  );
}
