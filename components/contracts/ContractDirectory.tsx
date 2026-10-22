"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, FileCode2 } from "lucide-react";
import { ScrollReveal } from "@/components/ScrollReveal";
import {
  getContractExplorerUrl,
  type DeployedContractEntry,
} from "@/lib/deployed-contracts";
import { copyContractAddress } from "@/lib/copy-contract-address";

interface ContractDirectoryProps {
  contracts: readonly DeployedContractEntry[];
}

export default function ContractDirectory({ contracts }: ContractDirectoryProps) {
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [copyErrorAddress, setCopyErrorAddress] = useState<string | null>(null);

  async function copyAddress(address: string) {
    const copied = await copyContractAddress(address, navigator.clipboard);
    if (copied) {
      setCopiedAddress(address);
      setCopyErrorAddress(null);
    } else {
      setCopiedAddress(null);
      setCopyErrorAddress(address);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#ffc53d]">
            Current product registry
          </p>
          <p className="mt-1 text-sm text-zinc-400">
            {contracts.length - 1} HAHA product contracts · 1 external dependency
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/[0.07] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-emerald-300">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Mainnet · 4663
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {contracts.map((contract, index) => {
          const copied = copiedAddress === contract.address;
          const copyFailed = copyErrorAddress === contract.address;
          const explorerUrl = getContractExplorerUrl(contract.address);

          return (
            <ScrollReveal
              key={contract.address}
              delayMs={Math.min(index * 65, 325)}
              direction={index % 2 === 0 ? "up" : "scale"}
            >
              <article className="group relative h-full overflow-hidden rounded-2xl border border-white/[0.09] bg-gradient-to-br from-[#111118] via-[#0d0d13] to-[#08080b] p-5 transition-colors duration-300 hover:border-[#ffc53d]/35 sm:p-6">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-12 -top-16 h-36 w-36 rounded-full bg-[#ffc53d]/[0.035] blur-3xl transition-colors group-hover:bg-[#ffc53d]/[0.08]"
                />

                <div className="relative flex min-w-0 items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#ffc53d]/20 bg-[#ffc53d]/[0.07] text-[#ffc53d]">
                      <FileCode2 aria-hidden="true" className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="display-serif text-xl text-white sm:text-2xl">
                        {contract.name}
                      </h2>
                      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                        {contract.symbol}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-full border px-2.5 py-1 text-center font-mono text-[9px] uppercase leading-tight tracking-[0.1em] ${
                      contract.category === "external_dependency"
                        ? "border-sky-400/25 bg-sky-400/[0.07] text-sky-300"
                        : "border-[#ffc53d]/20 bg-[#ffc53d]/[0.06] text-[#ffd773]"
                    }`}
                  >
                    {contract.category === "external_dependency" ? "External dependency" : "Product contract"}
                  </span>
                </div>

                <p className="relative mt-5 min-h-10 text-sm leading-relaxed text-zinc-300">
                  {contract.role}
                </p>
                <p className="relative mt-2 inline-flex items-center gap-2 font-mono text-[10px] uppercase leading-relaxed tracking-[0.11em] text-zinc-500">
                  <span aria-hidden="true" className="h-1 w-1 shrink-0 rounded-full bg-emerald-400" />
                  {contract.status}
                </p>

                <div className="relative mt-5 rounded-xl border border-white/[0.08] bg-black/30 p-3.5">
                  <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.16em] text-zinc-500">
                    Contract address
                  </p>
                  <code className="block break-all font-mono text-xs leading-relaxed text-zinc-200 sm:text-[13px]">
                    {contract.address}
                  </code>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void copyAddress(contract.address)}
                      aria-label={`${copied ? "Copied" : "Copy"} ${contract.name} address`}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-zinc-300 transition-colors hover:border-[#ffc53d]/35 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffc53d]"
                    >
                      {copied ? <Check aria-hidden="true" className="h-3.5 w-3.5 text-emerald-300" /> : <Copy aria-hidden="true" className="h-3.5 w-3.5" />}
                      {copied ? "Copied" : "Copy address"}
                    </button>
                    <a
                      href={explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`View ${contract.name} on Blockscout (opens in a new tab)`}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#ffc53d]/20 bg-[#ffc53d]/[0.05] px-3 py-2 font-mono text-[10px] uppercase tracking-[0.1em] text-[#ffd773] transition-colors hover:border-[#ffc53d]/45 hover:bg-[#ffc53d]/[0.1] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffc53d]"
                    >
                      Explorer <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                    </a>
                  </div>
                  <p className={copyFailed ? "mt-2 text-xs leading-relaxed text-amber-200" : "sr-only"} role="status" aria-live="polite" aria-atomic="true">
                    {copied ? `${contract.name} address copied` : copyFailed ? `Could not copy ${contract.name} address. Select the address to copy it manually.` : ""}
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
