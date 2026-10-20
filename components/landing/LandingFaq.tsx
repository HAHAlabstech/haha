"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface FaqItem {
  q: string;
  a: string;
}

const FAQS: FaqItem[] = [
  {
    q: "What is HAHA and how does it work?",
    a: "HAHA is an open comedy club and adversarial AI alignment lab. Comedians walk up to the mic and deliver jokes, deadpan observations, and double entendres designed to stump the Straight Man AI. When a bit passes the AI's literal filter, it enters a blind human crowd quorum. Verified wins earn real USDG rewards daily from the Tip Jar.",
  },
  {
    q: "How does a comedian get paid?",
    a: "When your bit beats the Straight Man and gets verified by the blind Crowd jury (≥60% consensus), it qualifies for that day's Tip Jar distribution. At midnight UTC, rewards are compiled into a Merkle root on Robinhood Chain, allowing you to claim real USDG tokens directly to your wallet.",
  },
  {
    q: "What does it cost to play (Open Mic vs Pro Stage)?",
    a: "Open Mic is 100% free: every creator receives 5 free bits recharged every 24 hours against the baseline Straight Man model (1.0× reward weight). Pro Stage lets you stake for 2.5× reward weight against the full Straight Man reasoning engine with retrieval from previous seasons.",
  },
  {
    q: "Who are the Crowd and how is jury judging kept fair?",
    a: "Verified human jurors judge blind: two answers are displayed side-by-side with zero author or AI labels. Jurors must pass a 10-case blind calibration quiz (8/10 pass requirement) and maintain a minimum stake in $HAHA. Random honeypots and consensus checks prevent bot collusion, and dishonest accounts forfeit their stake.",
  },
  {
    q: "Why is human humor valuable enough for AI labs to license?",
    a: "Current frontier LLMs are trained on internet scrapes where obvious patterns predominate. They frequently fail at irony, deadpan subtext, cultural nuance, and comedic timing. The Joke Vault provides high-signal, human-verified adversarial data that AI labs license to benchmark and align complex reasoning models.",
  },
  {
    q: "What is the Joke Vault & lifetime royalties?",
    a: "Every verified bit becomes provenance-signed, immutable data in the Joke Vault. When frontier AI labs license datasets from the Vault, revenue flows directly back: 30% to replenish the Tip Jar pool, 20% to Mic Drop burns, and 10% perpetual royalties to the original contributing comedians forever.",
  },
  {
    q: "What is a Mic Drop ($HAHA buyback & burn)?",
    a: "The 20% protocol fee that automatically buys $HAHA on Robinhood Chain and burns it permanently — verifiable on-chain in the Tip Jar and contract telemetry.",
  },
  {
    q: "Can I appeal a verdict?",
    a: "Yes, once per bit, for bombed or heckled-off bits only. A fresh jury of 7 retries it; winning restores reputation, while losing costs a point to prevent spam.",
  },
  {
    q: "Which blockchain and wallet do I need?",
    a: "HAHA operates natively on Robinhood Chain (Testnet 46630 now, Mainnet 4663 at launch). Any EIP-6963 browser wallet (MetaMask, Coinbase Wallet, Rabby, etc.) connects seamlessly with zero seed phrases leaving your device.",
  },
  {
    q: "Is this financial advice or guaranteed income?",
    a: "No. Rewards vary and depend entirely on the daily Tip Jar pool and consensus results. Nothing on this platform promises any guaranteed amount, and nothing here is financial advice.",
  },
];

export default function LandingFaq() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section id="faq" className="relative haha-sec-divider bg-[#070709] py-28 px-[clamp(20px,4vw,56px)] text-white overflow-hidden">
      {/* Ambient Stage Spotlight */}
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-1/4 right-1/4 w-[750px] h-[450px] bg-radial from-[#ffc53d]/05 via-transparent to-transparent blur-[140px]"
      />

      <div className="max-w-[1440px] mx-auto relative z-10">
        {/* Header */}
        <div className="max-w-3xl mb-16">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#ffc53d] font-semibold flex items-center gap-2 mb-3">
            <span className="w-1.5 h-1.5 rotate-45 bg-[#ffc53d] inline-block" />
            06 — Box Office FAQ
          </p>
          <h2 className="display-serif text-3xl sm:text-5xl lg:text-6xl text-white font-bold tracking-tight leading-[1.04]">
            Common Questions from <em className="italic text-[#ffc53d]">the Crowd.</em>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-zinc-400 leading-relaxed font-light">
            Everything you need to know about taking the stage, judging blind, and claiming USDG rewards.
          </p>
        </div>

        {/* Accordion List */}
        <div className="max-w-4xl space-y-4">
          {FAQS.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <div
                key={faq.q}
                className={`haha-glass-panel rounded-2xl transition-all duration-300 overflow-hidden ${
                  isOpen
                    ? "border-[#ffc53d]/45 shadow-[0_0_35px_rgba(255,197,61,0.12)]"
                    : "hover:border-white/20"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : idx)}
                  className="w-full p-6 text-left flex items-center justify-between gap-4 cursor-pointer"
                >
                  <span className="font-serif text-xl sm:text-2xl text-white font-normal">
                    {faq.q}
                  </span>
                  <span
                    className={`p-2.5 rounded-full border border-white/10 bg-white/5 text-zinc-400 transition-transform duration-300 shrink-0 ${
                      isOpen ? "rotate-180 text-[#ffc53d] border-[#ffc53d]/40 bg-[#ffc53d]/10" : ""
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </span>
                </button>

                {isOpen ? (
                  <div className="px-6 pb-6 pt-0 border-t border-white/5 text-sm sm:text-base text-zinc-300 leading-relaxed font-light">
                    <p className="pt-4">{faq.a}</p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
