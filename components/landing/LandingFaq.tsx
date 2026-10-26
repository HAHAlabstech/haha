"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { ScrollReveal } from "@/components/ScrollReveal";

interface FaqItem {
  q: string;
  a: string;
}

const FAQS: FaqItem[] = [
  {
    q: "What is HAHA and how does it work?",
    a: "HAHA is an open comedy club and adversarial AI alignment lab. Comedians submit jokes for the Straight Man AI and blind human Crowd. Verified wins can qualify for USDG rewards only with verified USDG funding and an activated settlement root.",
  },
  {
    q: "How does a comedian get paid?",
    a: "When your bit meets the rules and is verified by the blind Crowd jury (≥60% consensus), it may qualify for a settlement. Payouts depend on verified USDG funding, finalization, and the activated Merkle root; they are not guaranteed or necessarily daily.",
  },
  {
    q: "What does it cost to play (Open Mic vs Pro Stage)?",
    a: "Open Mic is 100% free: every creator receives 5 free bits recharged every 24 hours against the baseline Straight Man model (1.0× reward weight). Pro Stage lets you compete for 2.5× reward weight against the full Straight Man reasoning engine with retrieval from previous seasons.",
  },
  {
    q: "Who are the Crowd and how is jury judging kept fair?",
    a: "Jurors judge two answers side-by-side without author or AI labels. Access requires a connected, signed-in wallet and a 10-case blind calibration quiz (8/10 pass requirement); there is currently no HAHA minimum for juror access. A separate 10 HAHA lock applies only to above-quota bits when that feature is used.",
  },
  {
    q: "Why is human humor valuable enough for AI labs to license?",
    a: "Current frontier LLMs are trained on internet scrapes where obvious patterns predominate. They frequently fail at irony, deadpan subtext, cultural nuance, and comedic timing. The Joke Vault provides high-signal, human-verified adversarial data that AI labs license to benchmark and align complex reasoning models.",
  },
  {
    q: "What is the Joke Vault and contributor royalty reserve?",
    a: "Verified bits may be included in licensed datasets. When a B2B payment is received, configured shares are recorded through the Producer Gateway; the 20% Mic Drop allocation remains on hold while no verified standalone-token buyback route is active. Contributor royalties remain reserved until their batch manifest is verified.",
  },
  {
    q: "Is HAHA buyback active?",
    a: "No. The standalone HAHA token has no configured market route, so the Mic Drop allocation remains on hold. No creator-fee revenue or automatic token buybacks are assumed.",
  },
  {
    q: "Can I appeal a verdict?",
    a: "Yes, once per bit, for bombed or heckled-off bits only. A fresh jury of 7 retries it; winning restores reputation, while losing costs a point to prevent spam.",
  },
  {
    q: "Which blockchain and wallet do I need?",
    a: "HAHA currently operates on Robinhood Chain mainnet (chain ID 4663). An EIP-6963 browser wallet can connect; always verify the requested network and transaction details in your wallet. There is no HAHA trading pool in the app today. This site should never request your seed phrase.",
  },
  {
    q: "Is this financial advice or guaranteed income?",
    a: "No. Rewards are variable and depend on verified USDG funding, eligibility, and settlement. Payouts are not guaranteed; nothing here is financial advice.",
  },
];

export default function LandingFaq() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section
      id="faq"
      className="relative haha-sec-divider bg-[#070709] py-28 px-[clamp(20px,4vw,56px)] text-white overflow-hidden"
    >
      <div className="max-w-[1440px] mx-auto relative z-10 grid gap-12 lg:grid-cols-[1fr_1.5fr] items-start">
        {/* Left Column Header */}
        <ScrollReveal direction="left" className="lg:sticky lg:top-28">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#ffc53d] font-semibold mb-3">
            Box Office FAQ
          </p>
          <h2 className="display-serif text-3xl sm:text-5xl lg:text-6xl text-white font-bold tracking-tight leading-[1.04]">
            Common Questions from <em className="italic text-[#ffc53d]">the Crowd.</em>
          </h2>
          <p className="mt-4 text-base sm:text-lg text-zinc-400 leading-relaxed font-light max-w-md">
            Everything you need to know about taking the stage, judging blind, and claiming USDG rewards.
          </p>
        </ScrollReveal>

        {/* Right Column Accordion List: spans flush to the 1440px right edge */}
        <div className="space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openIdx === idx;
            return (
              <ScrollReveal key={faq.q} delayMs={Math.min(idx * 55, 350)}>
                <div
                  className={`haha-glass-panel rounded-2xl transition-colors duration-300 overflow-hidden ${
                    isOpen ? "border-[#ffc53d]/40" : "hover:border-white/20"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenIdx(isOpen ? null : idx)}
                    className="w-full p-6 text-left flex items-center justify-between gap-4 cursor-pointer"
                  >
                    <span className="display-serif text-xl sm:text-2xl text-white font-normal tracking-tight">
                      {faq.q}
                    </span>
                    <span
                      className={`p-2 rounded-full border border-white/10 bg-white/5 text-zinc-400 transition-transform duration-300 shrink-0 ${
                        isOpen
                          ? "rotate-180 text-[#ffc53d] border-[#ffc53d]/40 bg-[#ffc53d]/10"
                          : ""
                      }`}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </span>
                  </button>

                  <div
                    className={`grid transition-all duration-300 ease-out ${
                      isOpen
                        ? "grid-rows-[1fr] opacity-100"
                        : "grid-rows-[0fr] opacity-0"
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="px-6 pb-6 pt-0 border-t border-white/[0.07] text-sm sm:text-[15px] text-zinc-300 leading-relaxed font-light">
                        <p className="pt-4">{faq.a}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
