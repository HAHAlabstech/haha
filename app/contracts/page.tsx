import type { Metadata } from "next";
import {
  ShieldCheck,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import ContractDirectory from "@/components/contracts/ContractDirectory";
import {
  ACTIVE_MAINNET_CONTRACTS,
  MAINNET_CONTRACTS_CHAIN,
} from "@/lib/deployed-contracts";
import { ScrollReveal } from "@/components/ScrollReveal";

export const metadata: Metadata = {
  title: "Contracts: HAHA Mainnet",
  description:
    "Current HAHA product contract addresses on Robinhood Chain mainnet, with roles and Blockscout links.",
};

export default function ContractsPage() {
  return (
    <div className="relative min-h-screen bg-[#070709] text-white selection:bg-[#ffc53d]/30 selection:text-[#ffc53d] overflow-x-clip px-[clamp(20px,4vw,56px)] pt-32 pb-24">
      {/* Ambient Stage Lighting Glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[550px] bg-radial from-[#ffc53d]/08 via-[#ffc53d]/02 to-transparent blur-[160px] rounded-full z-0"
      />

      <div className="relative z-10 mx-auto max-w-[1440px] space-y-12">
        {/* Editorial Page Hero */}
        <section className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-b from-[#12121c]/90 via-[#0c0c13]/90 to-[#07070a]/90 p-8 sm:p-12 lg:p-14 shadow-2xl backdrop-blur-xl">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 left-1/4 h-80 w-[42rem] -translate-x-1/2 rounded-full bg-[#ffc53d]/10 blur-3xl"
          />

          <div className="relative grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2.5 rounded-full border border-[#ffc53d]/25 bg-[#ffc53d]/[0.06] px-3.5 py-1.5 backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                </span>
                <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#ffc53d] font-semibold">
                  Robinhood Chain Mainnet · Chain ID {MAINNET_CONTRACTS_CHAIN.id}
                </span>
              </div>

              <h1 className="display-serif mt-5 text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.05]">
                Verified Contract <em className="italic text-[#ffc53d]">Directory.</em>
              </h1>

              <p className="mt-4 max-w-2xl text-base sm:text-lg font-light leading-relaxed text-zinc-300">
                The smart contract infrastructure currently powering HAHA on Robinhood Chain mainnet. Every bit verdict, tip settlement, dataset proof, and staking escrow is immutably anchored on-chain.
              </p>
            </div>

            {/* Quick Chain Telemetry Card */}
            <div className="rounded-2xl border border-white/[0.08] bg-black/40 p-5 sm:p-6 backdrop-blur-md space-y-4">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#ffc53d] font-semibold">
                  Network Specification
                </span>
                <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" /> Live
                </span>
              </div>

              <div className="space-y-2.5 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 uppercase tracking-wider">Network</span>
                  <span className="text-zinc-200 font-semibold">{MAINNET_CONTRACTS_CHAIN.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 uppercase tracking-wider">Chain ID</span>
                  <span className="text-[#ffc53d] font-semibold">{MAINNET_CONTRACTS_CHAIN.id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 uppercase tracking-wider">Gas Token</span>
                  <span className="text-zinc-200 font-semibold">ETH (Native Layer 2)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 uppercase tracking-wider">Settlement</span>
                  <span className="text-zinc-200 font-semibold">USDG Stablecoin (6 Decimals)</span>
                </div>
              </div>

              <div className="pt-2 border-t border-white/[0.06]">
                <a
                  href={MAINNET_CONTRACTS_CHAIN.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-300 transition-all hover:border-[#ffc53d]/40 hover:bg-[#ffc53d]/[0.08] hover:text-white"
                >
                  <span>Blockscout Network Explorer</span>
                  <ExternalLink className="h-3.5 w-3.5 text-[#ffc53d]" />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Directory Card Grid */}
        <ContractDirectory contracts={ACTIVE_MAINNET_CONTRACTS} />

        {/* Security & Architecture Note */}
        <ScrollReveal direction="up">
          <aside className="relative overflow-hidden rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/[0.05] via-amber-500/[0.02] to-transparent p-6 sm:p-7 backdrop-blur-xl">
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#ffc53d]/30 bg-[#ffc53d]/10 text-[#ffc53d]">
                <ShieldCheck aria-hidden="true" className="h-6 w-6" />
              </span>
              <div className="space-y-1.5">
                <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#ffc53d] font-semibold">
                  Product Architecture &amp; Settlement Note
                </p>
                <p className="text-sm leading-relaxed text-zinc-300 font-light">
                  Contract deployment does not imply market liquidity or funded rewards. HAHA operates without a secondary trading pool: TipJar claims require verified USDG funding and an activated Merkle settlement root. All protocol contracts listed above are verified and immutable on Blockscout.
                </p>
              </div>
            </div>
          </aside>
        </ScrollReveal>
      </div>
    </div>
  );
}
