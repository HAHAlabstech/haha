"use client";

import { useState } from "react";
import { HelpCircle, ChevronDown, ArrowUpRight } from "lucide-react";
import Link from "next/link";

interface FaqItem {
  q: string;
  a: string;
}

const FAQS: FaqItem[] = [
  {
    q: "How does a comedian get paid?",
    a: "When your bit beats the Straight Man and gets verified by the blind Crowd jury (≥60% consensus), it qualifies for that day's Tip Jar distribution. At midnight UTC, rewards are compiled into a Merkle root on Robinhood Chain, allowing you to claim real USDG tokens directly to your wallet.",
  },
  {
    q: "Why is human humor valuable enough for AI labs to license?",
    a: "Current frontier models are trained on internet scrapes where obvious patterns predominate. They frequently fail at irony, deadpan subtext, and cultural nuance. The Joke Vault provides high-signal, human-verified adversarial data that helps AI labs benchmark and align complex reasoning models.",
  },
  {
    q: "What is the difference between Open Mic and Pro Stage?",
    a: "Open Mic gives every creator 5 free bits per day against a weakened Straight Man baseline model (1.0× reward weight). Pro Stage lets you stake for 2.5× reward weight against the full Straight Man reasoning engine with retrieval from previous seasons.",
  },
  {
    q: "How does HAHA prevent bots and sybil attacks on the Crowd jury?",
    a: "Jurors must complete a 10-case blind onboarding quiz (8/10 pass requirement) and maintain a minimum stake in $HAHA. Voting is strictly blind: two answers are displayed side-by-side with zero author or AI labels. Honeypot bits are randomly inserted into the queue, and dishonest or automated accounts forfeit their stake.",
  },
  {
    q: "Which blockchain and wallet do I need?",
    a: "HAHA operates natively on Robinhood Chain (Testnet 46630 now, Mainnet 4663 at launch). Any EIP-6963 browser wallet (MetaMask, Coinbase Wallet, Rabby, etc.) connects seamlessly with zero seed phrases leaving your device.",
  },
];

export default function LandingFaq() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section id="faq" className="relative py-24 px-[clamp(20px,4vw,56px)] max-w-[1440px] mx-auto">
      {/* Header */}
      <div className="max-w-3xl mb-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 font-mono text-[10px] uppercase tracking-[0.2em] text-[#ffc53d] mb-4">
          <HelpCircle className="w-3 h-3" />
          <span>Box Office FAQ</span>
        </div>
        <h2 className="display-serif text-3xl sm:text-5xl text-[#f4f4f5] tracking-tight">
          Common Questions from <em>the Crowd.</em>
        </h2>
        <p className="mt-4 text-base sm:text-lg text-zinc-400 leading-relaxed">
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
              className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                isOpen
                  ? "border-[#ffc53d]/30 bg-[#0c0c10]"
                  : "border-white/10 bg-[#0c0c12]/70 hover:border-white/20"
              }`}
            >
              <button
                type="button"
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                className="w-full p-6 text-left flex items-center justify-between gap-4 cursor-pointer"
              >
                <span className="font-serif text-xl sm:text-2xl text-[#f4f4f5]">
                  {faq.q}
                </span>
                <span
                  className={`p-2 rounded-full border border-white/10 bg-white/5 text-zinc-400 transition-transform duration-300 shrink-0 ${
                    isOpen ? "rotate-180 text-[#ffc53d] border-[#ffc53d]/30" : ""
                  }`}
                >
                  <ChevronDown className="w-4 h-4" />
                </span>
              </button>

              {isOpen ? (
                <div className="px-6 pb-6 pt-0 border-t border-white/5 text-sm sm:text-base text-zinc-400 leading-relaxed">
                  <p className="pt-4">{faq.a}</p>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Box Office Link Card */}
      <div className="mt-12 max-w-4xl rounded-xl border border-white/10 bg-[#0c0c12] p-6 flex flex-wrap items-center justify-between gap-4 text-sm text-zinc-400">
        <span>Looking for detailed protocol specs and edge cases?</span>
        <div className="flex items-center gap-4">
          <Link
            href="/faq"
            className="inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wider text-[#ffc53d] hover:text-white transition-colors"
          >
            <span>Full FAQ Archive</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
          <span className="text-zinc-600">|</span>
          <Link
            href="/rules"
            className="inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wider text-zinc-300 hover:text-white transition-colors"
          >
            <span>House Rules</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
