import type { Metadata } from "next";
import { PageHero } from "@/components/ui";
import ContractDirectory from "@/components/contracts/ContractDirectory";
import {
  ACTIVE_MAINNET_CONTRACTS,
  MAINNET_CONTRACTS_CHAIN,
} from "@/lib/deployed-contracts";

export const metadata: Metadata = {
  title: "Contracts: HAHA Mainnet",
  description:
    "Current HAHA product contract addresses on Robinhood Chain mainnet, with roles and Blockscout links.",
};

export default function ContractsPage() {
  return (
    <main className="relative min-h-screen overflow-x-clip bg-[#070709] text-white">
      <div className="relative z-10 mx-auto max-w-[1440px] space-y-8 px-[clamp(20px,4vw,56px)] pb-20 pt-28">
        <PageHero
          kicker="On-chain · Current deployments"
          title={<>Contract <em>directory.</em></>}
          lede="The addresses currently used by the HAHA mainnet product. This list excludes retired, testnet, and HOLD-only deployments."
          rightMeta={
            <div className="space-y-3 font-mono text-xs uppercase tracking-[0.12em] text-zinc-400">
              <p className="text-[#ffc53d]">{MAINNET_CONTRACTS_CHAIN.name}</p>
              <p>Chain ID · {MAINNET_CONTRACTS_CHAIN.id}</p>
              <p>Block explorer · Blockscout</p>
            </div>
          }
        />

        <ContractDirectory contracts={ACTIVE_MAINNET_CONTRACTS} />

        <aside className="rounded-2xl border border-amber-300/15 bg-amber-300/[0.035] p-4 sm:p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-amber-200">
            Product status note
          </p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            Contract deployment does not imply market liquidity or funded rewards. HAHA has no trading pool; TipJar claims require verified USDG funding and an activated settlement root.
          </p>
        </aside>
      </div>
    </main>
  );
}
