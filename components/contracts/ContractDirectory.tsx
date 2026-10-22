"use client";

import { useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Coins,
  Layers,
  CircleDot,
  Terminal,
  Database,
  ShieldCheck,
  FileCode2,
} from "lucide-react";
import { ScrollReveal } from "@/components/ScrollReveal";
import {
  getContractExplorerUrl,
  type DeployedContractEntry,
} from "@/lib/deployed-contracts";
import { copyContractAddress } from "@/lib/copy-contract-address";

interface ContractDirectoryProps {
  contracts: readonly DeployedContractEntry[];
}

function getContractIcon(symbol: string) {
  switch (symbol) {
    case "HAHA":
      return Coins;
    case "STAKING":
      return Layers;
    case "USDG CLAIMS":
      return CircleDot;
    case "B2B GATEWAY":
      return Terminal;
    case "VAULT":
      return Database;
    case "USDG":
      return ShieldCheck;
    default:
      return FileCode2;
  }
}

export default function ContractDirectory({ contracts }: ContractDirectoryProps) {
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [copyErrorAddress, setCopyErrorAddress] = useState<string | null>(null);

  async function copyAddress(address: string) {
    const copied = await copyContractAddress(address, navigator.clipboard);
    if (copied) {
      setCopiedAddress(address);
      setCopyErrorAddress(null);
      setTimeout(() => {
        setCopiedAddress((current) => (current === address ? null : current));
      }, 2500);
    } else {
      setCopiedAddress(null);
      setCopyErrorAddress(address);
    }
  }

  const protocolCount = contracts.filter((c) => c.category === "protocol").length;
  const externalCount = contracts.filter((c) => c.category === "external_dependency").length;

  return (
    <div className="space-y-8">
      {/* Registry Subheader & Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#ffc53d] font-semibold">
            Active Registry
          </p>
          <p className="mt-1 text-sm text-zinc-400">
            {protocolCount} HAHA Protocol Contracts · {externalCount} External Dependency
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/[0.08] px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-emerald-300 backdrop-blur-md">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            Mainnet · Verified
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-400">
            Chain ID 4663
          </span>
        </div>
      </div>

      {/* 3-Column Responsive Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {contracts.map((contract, index) => {
          const copied = copiedAddress === contract.address;
          const copyFailed = copyErrorAddress === contract.address;
          const explorerUrl = getContractExplorerUrl(contract.address);
          const Icon = getContractIcon(contract.symbol);
          const isExternal = contract.category === "external_dependency";

          return (
            <ScrollReveal
              key={contract.address}
              delayMs={Math.min(index * 60, 300)}
              direction="up"
            >
              <article className="group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#12121a]/95 via-[#0e0e14]/95 to-[#08080c]/95 p-6 backdrop-blur-xl transition-all duration-300 hover:border-[#ffc53d]/45 hover:shadow-[0_0_35px_rgba(255,197,61,0.09)]">
                {/* Subtle Amber Glow Accent */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-[#ffc53d]/[0.03] blur-3xl transition-all duration-500 group-hover:bg-[#ffc53d]/[0.1] group-hover:scale-125"
                />

                <div>
                  {/* Card Top: Icon, Ticker & Category Pill */}
                  <div className="relative flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#ffc53d]/25 bg-[#ffc53d]/[0.08] text-[#ffc53d] shadow-inner transition-transform duration-300 group-hover:scale-105">
                        <Icon aria-hidden="true" className="h-5 w-5" />
                      </span>
                      <div>
                        <h2 className="display-serif text-2xl font-bold text-white tracking-tight">
                          {contract.name}
                        </h2>
                        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#ffc53d] font-semibold">
                          {contract.symbol}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.14em] font-medium ${
                        isExternal
                          ? "border-sky-400/25 bg-sky-400/[0.08] text-sky-300"
                          : "border-[#ffc53d]/25 bg-[#ffc53d]/[0.08] text-[#ffd773]"
                      }`}
                    >
                      {isExternal ? "Dependency" : "Protocol"}
                    </span>
                  </div>

                  {/* Role Description */}
                  <p className="relative mt-4 min-h-[44px] text-sm leading-relaxed text-zinc-300 font-light">
                    {contract.role}
                  </p>

                  {/* Deployment Status */}
                  <div className="relative mt-3 flex items-center gap-2 font-mono text-[11px] text-zinc-400">
                    <span
                      aria-hidden="true"
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]"
                    />
                    <span className="truncate">{contract.status}</span>
                  </div>
                </div>

                {/* Monospace Address & Action Buttons */}
                <div className="relative mt-6 rounded-xl border border-white/[0.08] bg-[#050508]/90 p-4 transition-colors group-hover:border-white/[0.14]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-400 font-medium">
                      Contract Address
                    </span>
                    <span className="font-mono text-[10px] text-zinc-500">
                      Robinhood Chain
                    </span>
                  </div>

                  <code className="block break-all font-mono text-xs sm:text-[13px] leading-relaxed text-zinc-100 font-medium bg-white/[0.03] p-2.5 rounded-lg border border-white/[0.05] selection:bg-[#ffc53d]/40 selection:text-[#ffc53d]">
                    <span className="text-[#ffc53d] font-semibold">0x</span>
                    {contract.address.slice(2)}
                  </code>

                  <div className="mt-3.5 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void copyAddress(contract.address)}
                      aria-label={`${copied ? "Copied" : "Copy"} ${contract.name} address`}
                      className={`inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border px-3 py-2 font-mono text-[11px] uppercase tracking-[0.1em] font-semibold transition-all duration-200 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffc53d] ${
                        copied
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                          : "border-white/10 bg-white/[0.04] text-zinc-300 hover:border-[#ffc53d]/40 hover:bg-[#ffc53d]/[0.08] hover:text-white"
                      }`}
                    >
                      {copied ? (
                        <>
                          <Check aria-hidden="true" className="h-3.5 w-3.5 text-emerald-300" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy aria-hidden="true" className="h-3.5 w-3.5" />
                          <span>Copy Address</span>
                        </>
                      )}
                    </button>
                    <a
                      href={explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`View ${contract.name} on Blockscout (opens in a new tab)`}
                      className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-[#ffc53d]/25 bg-[#ffc53d]/[0.06] px-3.5 py-2 font-mono text-[11px] uppercase tracking-[0.1em] font-semibold text-[#ffd773] transition-all duration-200 hover:border-[#ffc53d]/50 hover:bg-[#ffc53d]/[0.12] hover:text-white hover:shadow-[0_0_15px_rgba(255,197,61,0.2)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffc53d]"
                    >
                      <span>Explorer</span>
                      <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                    </a>
                  </div>

                  <p
                    className={copyFailed ? "mt-2 text-xs leading-relaxed text-amber-200" : "sr-only"}
                    role="status"
                    aria-live="polite"
                    aria-atomic="true"
                  >
                    {copied
                      ? `${contract.name} address copied`
                      : copyFailed
                        ? `Could not copy ${contract.name} address. Select the address to copy it manually.`
                        : ""}
                  </p>
                </div>
              </article>
            </ScrollReveal>
          );
        })}
      </div>
    </div>
  );
}
