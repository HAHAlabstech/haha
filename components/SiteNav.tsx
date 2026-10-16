"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import WalletModal from "./WalletModal";
import { truncateAddress } from "@/lib/wallets";

const LINKS: { href: string; label: string }[] = [
  { href: "/vault", label: "Vault" },
  { href: "/stage", label: "Stage" },
  { href: "/crowd", label: "Crowd" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/tipjar", label: "Tip Jar" },
  { href: "/seasons", label: "Seasons" },
  { href: "/producers", label: "Producers" },
];

export default function SiteNav() {
  const pathname = usePathname();
  const [modalOpen, setModalOpen] = useState(false);
  const [accounts, setAccounts] = useState<string[]>([]);
  const first = accounts[0] ?? null;

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0a0812]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <span
            aria-hidden
            className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-300 text-lg text-black shadow-[0_0_24px_rgba(251,191,36,0.5)]"
          >
            🎤
          </span>
          <span className="text-lg font-bold tracking-tight text-amber-50">
            HAHA
          </span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {LINKS.map((l) => {
            const active =
              pathname === l.href || pathname?.startsWith(`${l.href}/`);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "bg-amber-300/15 text-amber-200"
                    : "text-zinc-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="rounded-full bg-amber-300 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-200"
        >
          {first ? truncateAddress(first) : "Connect"}
        </button>
      </div>
      <nav
        className="flex gap-1 overflow-x-auto px-4 pb-2 md:hidden"
        aria-label="Main mobile"
      >
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm text-zinc-300 hover:bg-white/5"
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <WalletModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onConnected={(accs) => setAccounts(accs)}
      />
    </header>
  );
}
