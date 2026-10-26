"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, CheckCircle2, Sparkles, Orbit, Radio, Layers, Activity } from "lucide-react";

export default function CategorySets() {
  const [hoveredCat, setHoveredCat] = useState<string | null>(null);
  const thumbRef = useRef<HTMLDivElement>(null);

  const sig0Ref = useRef<HTMLDivElement>(null);
  const sig1Ref = useRef<HTMLDivElement>(null);
  const sig2Ref = useRef<HTMLDivElement>(null);
  const sig3Ref = useRef<HTMLDivElement>(null);

  const [sigProg, setSigProg] = useState<[number, number, number, number]>([
    0, 0, 0, 0,
  ]);

  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (thumbRef.current) {
        thumbRef.current.style.left = `${e.clientX}px`;
        thumbRef.current.style.top = `${e.clientY}px`;
      }
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", onPointerMove);
  }, []);

  useEffect(() => {
    let raf = 0;
    const calcProgress = (el: HTMLDivElement | null) => {
      if (!el) return 0;
      const r = el.getBoundingClientRect();
      const total = Math.max(1, el.offsetHeight - window.innerHeight);
      return Math.max(0, Math.min(1, -r.top / total));
    };

    const update = () => {
      setSigProg([
        calcProgress(sig0Ref.current),
        calcProgress(sig1Ref.current),
        calcProgress(sig2Ref.current),
        calcProgress(sig3Ref.current),
      ]);
    };

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const p0 = sigProg[0];
  const p1 = sigProg[1];
  const p2 = sigProg[2];
  const p3 = sigProg[3];

  return (
    <>
      {/* ==================== TONIGHT'S LINEUP ==================== */}
      <section className="lineup" id="lineup">
        <div className="lineup-head">
          <div>
            <span className="eyebrow">Tonight&apos;s Lineup · Four Sets</span>
            <h2>
              Four ways humans stay <em>ahead of the machine.</em>
            </h2>
          </div>
          <p>
            Every bit on stage belongs to one of four comedy sets. Hover a set
            to preview its blindspot, or scroll down to inspect the pinned
            signature moments.
          </p>
        </div>

        <div className="lineup-rows">
          <a
            href="#punchline"
            className="lineup-row group"
            onMouseEnter={() => setHoveredCat("punchline")}
            onMouseLeave={() => setHoveredCat(null)}
          >
            <span className="idx">PUNCHLINE</span>
            <span className="title">Punchline</span>
            <span className="premise">
              Set up a confident assumption, then flip it on the last word.
            </span>
            <span className="cat">Expectation Flip</span>
            <span className="arr"><ArrowUpRight className="w-4 h-4 text-zinc-500 group-hover:text-[#ffb13b] transition-colors" /></span>
          </a>

          <a
            href="#subtext"
            className="lineup-row group"
            onMouseEnter={() => setHoveredCat("subtext")}
            onMouseLeave={() => setHoveredCat(null)}
          >
            <span className="idx">SUBTEXT</span>
            <span className="title">Subtext</span>
            <span className="premise">
              Say something polite while every human in the room hears the
              dagger.
            </span>
            <span className="cat">Polite vs. Real</span>
            <span className="arr"><ArrowUpRight className="w-4 h-4 text-zinc-500 group-hover:text-[#ffb13b] transition-colors" /></span>
          </a>

          <a
            href="#irl"
            className="lineup-row group"
            onMouseEnter={() => setHoveredCat("irl")}
            onMouseLeave={() => setHoveredCat(null)}
          >
            <span className="idx">IRL</span>
            <span className="title">IRL</span>
            <span className="premise">
              Physical comedy, gravity, and awkward bodies that text-only models
              can&apos;t picture.
            </span>
            <span className="cat">Physical World</span>
            <span className="arr"><ArrowUpRight className="w-4 h-4 text-zinc-500 group-hover:text-[#ffb13b] transition-colors" /></span>
          </a>

          <a
            href="#double-meaning"
            className="lineup-row group"
            onMouseEnter={() => setHoveredCat("double-meaning")}
            onMouseLeave={() => setHoveredCat(null)}
          >
            <span className="idx">DOUBLE MEANING</span>
            <span className="title">Double Meaning</span>
            <span className="premise">
              One sentence holding two complete worlds at the exact same time.
            </span>
            <span className="cat">Two Readings</span>
            <span className="arr"><ArrowUpRight className="w-4 h-4 text-zinc-500 group-hover:text-[#ffb13b] transition-colors" /></span>
          </a>
        </div>

        {/* Cursor-following floating preview card with Laocoon styling */}
        <div
          ref={thumbRef}
          className={`pointer-events-none fixed z-50 hidden h-[200px] w-[290px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-white/10 bg-[#09090c]/95 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.85)] backdrop-blur-xl transition-opacity duration-200 md:flex md:flex-col md:justify-between ${
            hoveredCat ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden="true"
        >
          <div className="flex justify-between items-center font-mono text-[10px] uppercase tracking-widest text-[#ffb13b]">
            <span className="flex items-center gap-1.5">
              {hoveredCat?.toUpperCase() ?? "SET"}
            </span>
            <span className="text-zinc-500">Straight Man Telemetry</span>
          </div>
          <div className="font-serif text-lg leading-snug text-white">
            {hoveredCat === "punchline" &&
              "Last-word frame switches shatter greedy token probability."}
            {hoveredCat === "subtext" &&
              "Polite surface syntax masks 180° opposite emotional intent."}
            {hoveredCat === "irl" &&
              "Momentum, spilled coffee, and physical spatial embarrassment."}
            {hoveredCat === "double-meaning" &&
              "Quantum superposition of two valid syntactic parses."}
          </div>
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-zinc-400">
            <span>Click to inspect set</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-[#ffb13b]" />
          </div>
        </div>
      </section>

      {/* ==================== PUNCHLINE ==================== */}
      <article className="case" id="punchline">
        <div className="case-head">
          <div>
            <span className="eyebrow">Expectation Flip · Punchline</span>
            <h2>
              Punch<em>line.</em>
            </h2>
          </div>
          <dl className="case-meta-grid">
            <div>
              <dt>Premise</dt>
              <dd>Lead the listener down a paved road, then move the cliff.</dd>
            </div>
            <div>
              <dt>AI Blindspot</dt>
              <dd>Locks onto the highest-probability first reading.</dd>
            </div>
            <div>
              <dt>Crowd Signal</dt>
              <dd>Instant recognition on the final 2-3 words.</dd>
            </div>
            <div>
              <dt>Action</dt>
              <dd>
                <Link
                  href="/app?tab=stage&category=punchline"
                  className="font-mono text-xs uppercase tracking-widest text-[#ffc53d] underline"
                >
                  Try Punchline on Stage →
                </Link>
              </dd>
            </div>
          </dl>
        </div>

        {/* ULTRA-COOL EXPECTATION TRAJECTORY & COLLAPSE RADAR */}
        <div className="hero-art relative overflow-hidden rounded-2xl border border-[#efe8dc]/12 bg-radial from-[#1e1914] via-[#0d0b09] to-[#060606] p-4">
          <svg viewBox="0 0 1200 620" fill="none" className="w-full h-auto" aria-hidden="true">
            <defs>
              <linearGradient id="pCurveGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                <stop offset="65%" stopColor="#ffb13b" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#ff4500" stopOpacity="1" />
              </linearGradient>
              <linearGradient id="pAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffb13b" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#ffb13b" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="sapphireDrop" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffb13b" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.2" />
              </linearGradient>
              <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Background Telemetry Grid */}
            <g opacity="0.15">
              {[100, 200, 300, 400, 500].map((y) => (
                <line key={`gy-${y}`} x1="80" y1={y} x2="1120" y2={y} stroke="#efe8dc" strokeDasharray="3 6" />
              ))}
              {[200, 400, 600, 780, 950, 1100].map((x) => (
                <line key={`gx-${x}`} x1={x} y1="60" x2={x} y2="540" stroke="#efe8dc" strokeDasharray="3 6" />
              ))}
            </g>

            {/* Probability corridor (Model's greedy confidence) */}
            <path
              d="M 120 450 C 380 340, 580 250, 780 220 L 780 180 C 580 210, 380 290, 120 390 Z"
              fill="url(#pAreaGrad)"
            />

            {/* Predicted trajectory rail that the AI follows blindly */}
            <path
              d="M 120 420 C 380 310, 580 230, 780 200 C 900 180, 1000 160, 1100 150"
              stroke="rgba(239, 232, 220, 0.25)"
              strokeWidth="2"
              strokeDasharray="6 8"
            />
            <text x="890" y="140" fill="#a49b8e" fontFamily="Geist Mono, monospace" fontSize="11" letterSpacing="2">
              GREEDY ARMAX PREDICTION (P ≈ 0.98)
            </text>

            {/* Actual human joke trajectory: steep collapse at pivot */}
            <path
              d="M 120 420 C 380 310, 580 230, 780 200 C 810 200, 830 380, 890 490 C 940 540, 1020 540, 1080 500"
              stroke="url(#pCurveGrad)"
              strokeWidth="4"
              fill="none"
              filter="url(#glowFilter)"
            />

            {/* Drop Cliff connection line */}
            <line x1="780" y1="200" x2="780" y2="490" stroke="url(#sapphireDrop)" strokeWidth="2" strokeDasharray="4 4" />

            {/* Pivot Coordinate Nodes */}
            <circle cx="780" cy="200" r="14" fill="#ffb13b" fillOpacity="0.2" />
            <circle cx="780" cy="200" r="7" fill="#ffb13b" />
            <circle cx="780" cy="200" r="28" stroke="#ffb13b" strokeWidth="1" strokeOpacity="0.4" strokeDasharray="4 4" className="animate-spin-slow" />

            <circle cx="890" cy="490" r="18" fill="#3b82f6" fillOpacity="0.25" />
            <circle cx="890" cy="490" r="8" fill="#3b82f6" />
            <circle cx="1080" cy="500" r="10" fill="#ffb13b" />

            {/* Telemetry Labels & HUD Markers */}
            <g fontFamily="Geist Mono, monospace" fontSize="11">
              <text x="120" y="455" fill="#a49b8e" letterSpacing="2">T_0: SETUP INITIALIZATION</text>
              <text x="760" y="165" fill="#ffb13b" fontWeight="600" letterSpacing="2">
                PIVOT TOKEN: &quot;BURNED&quot;
              </text>
              <text x="795" y="185" fill="#a49b8e" fontSize="10">ΔP = -0.94 / COLLAPSE 12ms</text>

              <text x="890" y="530" fill="#3b82f6" fontWeight="600" letterSpacing="1">
                HUMAN REFRAME CORRIDOR
              </text>
              <text x="960" y="475" fill="#fff6ed" fontFamily="Fraunces, serif" fontStyle="italic" fontSize="24">
                Where the laugh lands.
              </text>
            </g>

            {/* Top-Right HUD Badge */}
            <g transform="translate(940, 30)">
              <rect x="0" y="0" width="220" height="42" rx="8" fill="#060606" fillOpacity="0.8" stroke="rgba(255,177,59,0.3)" strokeWidth="1" />
              <circle cx="16" cy="21" r="4" fill="#ffb13b" />
              <text x="30" y="24" fill="#efe8dc" fontFamily="Geist Mono, monospace" fontSize="10" letterSpacing="1">
                RADAR: 9.8σ SURPRISE
              </text>
            </g>
          </svg>

          <div className="caption flex items-center justify-between border-t border-[#efe8dc]/10 pt-3 font-mono text-[11px] text-[#a49b8e]">
            <span>Non-Linear Expectation Collapse vs. Model Greed</span>
            <span className="text-[#ffb13b]">Category: PUNCHLINE</span>
          </div>
        </div>

        <div className="prose">
          <div className="side">Anatomy of the Flip</div>
          <div className="body">
            <p className="lead">
              A great punchline doesn&apos;t invent a new world; it reveals
              that you were standing in a different room the entire time.
            </p>
            <p>
              Language models commit early. Once a sentence activates a familiar
              script (<b>marriage counseling</b>, <b>setting boundaries</b>),
              the Straight Man rides that rail to the end and offers earnest
              relationship advice.
            </p>
            <p>
              Humans hold both frames open at once. The moment the phrase{" "}
              <b>“put my foot down”</b> snaps back to a literal one-legged
              flamingo, the Straight Man&apos;s deadpan therapy response becomes
              half the comedy.
            </p>
          </div>
        </div>

        {/* Pinned 280vh Signature Moment */}
        <div ref={sig0Ref} className="sig">
          <div className="sig-Stage">
            <div className="sig-chrome">
              <span>Signature Moment · Pronoun &amp; Idiom Pivot</span>
              <div className="flex items-center gap-3">
                <span>Scroll to flip frame</span>
                <div className="sig-meter">
                  <i style={{ transform: `scaleX(${p0})` }} />
                </div>
              </div>
            </div>

            <div className="mx-auto max-w-4xl text-center">
              <p className="font-serif text-[clamp(28px,4.5vw,58px)] font-light leading-[1.18] tracking-tight text-[#fff6ed]">
                “
                <span
                  className="rounded px-2 py-0.5 transition-all duration-300"
                  style={{
                    background:
                      p0 < 0.5
                        ? "rgba(255,177,59,0.22)"
                        : "rgba(239,232,220,0.06)",
                    color: p0 < 0.5 ? "#ffb13b" : "#a49b8e",
                  }}
                >
                  My wife
                </span>{" "}
                told me to stop impersonating a{" "}
                <span
                  className="rounded px-2 py-0.5 transition-all duration-300"
                  style={{
                    background:
                      p0 >= 0.5
                        ? "rgba(255,177,59,0.25)"
                        : "rgba(239,232,220,0.06)",
                    color: p0 >= 0.5 ? "#ffb13b" : "#fff6ed",
                  }}
                >
                  flamingo
                </span>
                . So{" "}
                <span
                  className=" underline decoration-[#ffb13b] underline-offset-8"
                  style={{ color: p0 >= 0.5 ? "#ffb13b" : "#fff6ed" }}
                >
                  I had to put my foot down.
                </span>
                ”
              </p>

              <div className="mt-10 grid gap-4 md:grid-cols-2">
                <div
                  className="laocoon-card p-6 text-left transition-all duration-300"
                  style={{
                    borderColor:
                      p0 < 0.5
                        ? "rgba(255,177,59,0.65)"
                        : "rgba(239,232,220,0.12)",
                  }}
                >
                  <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-[#a49b8e]">
                    <span>Frame A · Straight Man Parse</span>
                    <span className="hud-badge">Idiomatic</span>
                  </div>
                  <p className="mt-3 font-mono text-xs leading-relaxed text-[#efe8dc]">
                    [put_foot_down = assert_authority] → &ldquo;Setting a firm
                    boundary in a marriage is healthy. Good for you.&rdquo;
                  </p>
                </div>

                <div
                  className="laocoon-card p-6 text-left transition-all duration-300"
                  style={{
                    borderColor:
                      p0 >= 0.5
                        ? "rgba(255,177,59,0.85)"
                        : "rgba(239,232,220,0.12)",
                    background:
                      p0 >= 0.5
                        ? "radial-gradient(80% 120% at 50% 0%, rgba(255, 177, 59, 0.16) 0%, rgba(30, 58, 138, 0.08) 60%, transparent 85%), #0c0a08"
                        : undefined,
                  }}
                >
                  <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-[#ffb13b]">
                    <span>Frame B · Human Crowd Parse</span>
                    <span className="hud-badge bg-[#ffb13b]/20 text-[#ffb13b]">
                      Physical Flamingo
                    </span>
                  </div>
                  <p className="mt-3 font-mono text-xs leading-relaxed text-[#fff6ed]">
                    [speaker_standing_on_one_leg = true] → Lowering the second
                    flamingo leg to the floor.{" "}
                    <b className="text-[#ffb13b]">98% CONFIDENT · 0% CORRECT</b>
                  </p>
                </div>
              </div>
            </div>

            <div className="sig-foot">
              <span>Bit #417 · Verified Stumper</span>
              <span>
                {p0 >= 0.5
                  ? "VERDICT: STUMPED (Entered Joke Vault)"
                  : "Reading setup trajectory…"}
              </span>
            </div>
          </div>
        </div>

        {/* 3-Step Flow */}
        <div className="flow-grid">
          <div className="screen laocoon-card">
            <div className="screen-bar">
              <span>1 · The Stage</span>
              <span className="dots">
                <i />
                <i />
                <i />
              </span>
            </div>
            <div className="screen-body">
              <p className="quote">
                “I asked the librarian if the library had books on paranoia. She
                whispered, ‘They&apos;re right behind you.’”
              </p>
              <span className="font-mono text-[11px] uppercase tracking-widest text-[#a49b8e]">
                Submitted by @deadpan_dan · Open Mic
              </span>
            </div>
          </div>

          <div className="screen laocoon-card">
            <div className="screen-bar">
              <span>2 · Straight Man</span>
              <span>Straight Man AI</span>
            </div>
            <div className="screen-body">
              <div className="ai">
                “Librarians typically whisper to maintain a quiet study
                environment, and psychology sections are often shelved nearby.”
              </div>
              <div className="confidence">
                <span>Literal Confidence 98%</span>
                <span className="bar">
                  <i style={{ width: "98%" }} />
                </span>
              </div>
            </div>
          </div>

          <div className="screen laocoon-card">
            <div className="screen-bar">
              <span>3 · The Crowd</span>
              <span>Quorum 9/9</span>
            </div>
            <div className="screen-body">
              <p className="text-sm leading-relaxed text-[#d8d0c2]">
                8 of 9 staked judges voted <b>AI Missed It + Funny</b>. Added to
                the Joke Vault and queued for tonight&apos;s Tip Jar payout.
              </p>
              <span className="stamp flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5" /> Stumped · +145 pts</span>
            </div>
          </div>
        </div>
      </article>

      {/* ==================== SUBTEXT ==================== */}
      <article className="case" id="subtext">
        <div className="case-head">
          <div>
            <span className="eyebrow">Polite vs. Real · Subtext</span>
            <h2>
              Sub<em>text.</em>
            </h2>
          </div>
          <dl className="case-meta-grid">
            <div>
              <dt>Premise</dt>
              <dd>Say the nicest possible words with the sharpest possible edge.</dd>
            </div>
            <div>
              <dt>AI Blindspot</dt>
              <dd>Scores sentiment on surface vocabulary, missing social frost.</dd>
            </div>
            <div>
              <dt>Crowd Signal</dt>
              <dd>Every office worker and partner winces in instant recognition.</dd>
            </div>
            <div>
              <dt>Action</dt>
              <dd>
                <Link
                  href="/app?tab=stage&category=subtext"
                  className="font-mono text-xs uppercase tracking-widest text-[#ffc53d] underline"
                >
                  Try Subtext on Stage →
                </Link>
              </dd>
            </div>
          </dl>
        </div>

        {/* Pinned 280vh Signature Moment with Frequency Spectrum */}
        <div ref={sig1Ref} className="sig">
          <div className="sig-Stage">
            <div className="sig-chrome">
              <span>Signature Moment · Passive-Aggressive Spectrum Decoder</span>
              <div className="flex items-center gap-3">
                <span>Scroll to X-ray subtext</span>
                <div className="sig-meter">
                  <i style={{ transform: `scaleX(${p1})` }} />
                </div>
              </div>
            </div>

            <div className="mx-auto w-full max-w-4xl space-y-6">
              {[
                {
                  polite: "“No worries at all! Totally fine.”",
                  ai: "AI Sentiment: +0.94 Warm & Forgiving",
                  real: "REAL SUBTEXT: I am engraving this betrayal onto a stone tablet.",
                  threshold: 0.18,
                  tone: "Molten Danger",
                },
                {
                  polite: "“Sure, whenever you get a chance.”",
                  ai: "AI Sentiment: +0.88 Flexible & Low Urgency",
                  real: "REAL SUBTEXT: It was due forty-five minutes ago and I am watching you type.",
                  threshold: 0.48,
                  tone: "Subterranean Frost",
                },
                {
                  polite: "“Per my last email...”",
                  ai: "AI Sentiment: +0.72 Helpful Cross-Reference",
                  real: "REAL SUBTEXT: Can you read, or are we just clicking buttons today?",
                  threshold: 0.75,
                  tone: "Terminal Execution",
                },
              ].map((row, idx) => {
                const active = p1 >= row.threshold;
                return (
                  <div
                    key={idx}
                    className="laocoon-card p-6 transition-all duration-300"
                    style={{
                      borderColor: active
                        ? "rgba(255,177,59,0.75)"
                        : "rgba(239,232,220,0.12)",
                      boxShadow: active
                        ? "0 0 35px -10px rgba(255,177,59,0.3)"
                        : undefined,
                    }}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-serif text-2xl text-[#fff6ed] md:text-3xl">
                        {row.polite}
                      </span>
                      <span className="hud-badge">
                        {row.ai}
                      </span>
                    </div>

                    {/* Acoustic Subtext Telemetry Bars */}
                    <div className="mt-4 flex items-center gap-2">
                      <span className="font-mono text-[9px] uppercase tracking-wider text-[#a49b8e]">
                        ACOUSTIC TENSION:
                      </span>
                      <div className="flex gap-1 h-3 flex-1 items-end">
                        {[40, 65, 80, 50, 95, 70, 85, 100, 60, 90, 75].map((h, bIdx) => (
                          <div
                            key={bIdx}
                            className="w-full rounded-t transition-all duration-300"
                            style={{
                              height: active ? `${h}%` : "15%",
                              backgroundColor: active ? (bIdx % 2 === 0 ? "#ffb13b" : "#3b82f6") : "#3a3026",
                            }}
                          />
                        ))}
                      </div>
                      <span className="font-mono text-[10px] text-[#ffb13b] font-semibold">
                        {active ? "+14.2 dB" : "0.0 dB"}
                      </span>
                    </div>

                    <div
                      className="mt-3 font-mono text-xs uppercase tracking-widest transition-all duration-300"
                      style={{
                        color: active ? "#ffb13b" : "#6c6459",
                        opacity: active ? 1 : 0.35,
                      }}
                    >
                      {active
                        ? row.real
                        : "Scroll down to reveal what every human in the room actually heard…"}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="sig-foot">
              <span>Subtext Calibration</span>
              <span>Polite Surface Syntax ≠ Real Human Intent</span>
            </div>
          </div>
        </div>
      </article>

      {/* ==================== IRL (PHYSICS & INERTIA) ==================== */}
      <article className="case" id="irl">
        <div className="case-head">
          <div>
            <span className="eyebrow">Physical World · IRL</span>
            <h2>
              I<em>RL.</em>
            </h2>
          </div>
          <dl className="case-meta-grid">
            <div>
              <dt>Premise</dt>
              <dd>Gravity, momentum, glass doors, and bodies in real rooms.</dd>
            </div>
            <div>
              <dt>AI Blindspot</dt>
              <dd>Has never carried two full coffees through a pull-only door.</dd>
            </div>
            <div>
              <dt>Crowd Signal</dt>
              <dd>Visceral physical memory makes the room laugh together.</dd>
            </div>
            <div>
              <dt>Action</dt>
              <dd>
                <Link
                  href="/app?tab=stage&category=irl"
                  className="font-mono text-xs uppercase tracking-widest text-[#ffc53d] underline"
                >
                  Try IRL on Stage →
                </Link>
              </dd>
            </div>
          </dl>
        </div>

        {/* HIGH-PRECISION INERTIA TELEMETRY SIMULATOR */}
        <div ref={sig2Ref} className="sig">
          <div className="sig-Stage">
            <div className="sig-chrome">
              <span>Signature Moment · Inertial Fluid Dynamics &amp; Deceleration HUD</span>
              <div className="flex items-center gap-3">
                <span>Scroll to brake</span>
                <div className="sig-meter">
                  <i style={{ transform: `scaleX(${p2})` }} />
                </div>
              </div>
            </div>

            <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-[1.1fr_1fr]">
              {/* Cockpit HUD & Fluid Splash Telemetry Graphic */}
              <div className="laocoon-card p-6 relative overflow-hidden">
                <svg viewBox="0 0 540 320" className="w-full h-auto" aria-hidden="true">
                  <defs>
                    <linearGradient id="fluidGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#ffb13b" stopOpacity="0.85" />
                      <stop offset="100%" stopColor="#ffa582" stopOpacity="0.95" />
                    </linearGradient>
                    <radialGradient id="spillGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#ffb13b" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="#ffb13b" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  {/* Aerodynamic Windshield & Dashboard Platform */}
                  <line x1="310" y1="30" x2="490" y2="250" stroke="#efe8dc" strokeWidth="3" strokeLinecap="round" />
                  <text x="450" y="70" fill="#a49b8e" fontFamily="Geist Mono, monospace" fontSize="11" letterSpacing="1">
                    WINDSHIELD
                  </text>

                  {/* Dashboard Shelf */}
                  <path d="M 80 250 Q 280 220, 500 255 L 500 300 L 80 300 Z" fill="#14100d" stroke="rgba(239,232,220,0.3)" strokeWidth="1.5" />
                  <text x="100" y="285" fill="#a49b8e" fontFamily="Geist Mono, monospace" fontSize="11" letterSpacing="2">
                    DASHBOARD PLATFORM
                  </text>

                  {/* Velocity Vector Streamlines */}
                  <g opacity={Math.max(0.1, 1 - p2)}>
                    <line x1="40" y1="80" x2="150" y2="80" stroke="#a49b8e" strokeWidth="2" strokeDasharray="6 6" />
                    <line x1="60" y1="110" x2="140" y2="110" stroke="#a49b8e" strokeWidth="2" strokeDasharray="6 6" />
                    <line x1="20" y1="140" x2="120" y2="140" stroke="#a49b8e" strokeWidth="2" strokeDasharray="6 6" />
                    <text x="40" y="55" fill="#ffb13b" fontFamily="Geist Mono, monospace" fontSize="11" letterSpacing="2">
                      → VELOCITY 35 MPH
                    </text>
                  </g>

                  {/* Deceleration Brake G-Force Warning */}
                  {p2 > 0.35 && (
                    <g opacity={p2}>
                      <line x1="240" y1="55" x2="160" y2="55" stroke="#ef4444" strokeWidth="2" markerEnd="url(#arrow)" />
                      <text x="160" y="45" fill="#ef4444" fontFamily="Geist Mono, monospace" fontSize="11" fontWeight="700">
                        ← BRAKE FORCE: -{(p2 * 9.8).toFixed(1)} m/s²
                      </text>
                    </g>
                  )}

                  {/* Double-Walled Tumbler (Tilting with Scroll Inertia) */}
                  <g transform={`rotate(${(p2 * 26).toFixed(1)} 295 240)`}>
                    {/* Glass Walls */}
                    <path
                      d="M 265 240 L 255 140 L 335 140 L 325 240 Z"
                      stroke="#efe8dc"
                      strokeWidth="2.5"
                      fill="rgba(255,255,255,0.04)"
                      strokeLinejoin="round"
                    />
                    {/* Liquid Body with Dynamic Slosh Crest */}
                    <path
                      d={`M 262 236 L 257 175 Q 295 ${175 - p2 * 35}, 333 ${175 + p2 * 15} L 328 236 Z`}
                      fill="url(#fluidGrad)"
                    />
                  </g>

                  {/* Parabolic Splash Wave Erupting Forward */}
                  {p2 > 0.42 && (
                    <g>
                      <path
                        d="M 325 150 C 355 90, 400 95, 435 145 C 455 175, 465 195, 475 210"
                        stroke="#ffb13b"
                        strokeWidth="5"
                        strokeLinecap="round"
                        fill="none"
                        style={{
                          strokeDasharray: 260,
                          strokeDashoffset: Math.max(0, 260 * (1 - (p2 - 0.42) * 2)),
                        }}
                      />
                      {/* Airborne Droplet Cluster */}
                      <circle cx="435" cy="145" r="7" fill="#ffb13b" />
                      <circle cx="452" cy="125" r="5" fill="#ffa582" />
                      <circle cx="475" cy="210" r="8" fill="#ffb13b" />
                      <circle cx="488" cy="180" r="4.5" fill="#ffd27d" />
                    </g>
                  )}
                </svg>

                {/* Live G-Force & Impact Telemetry HUD readout */}
                <div className="mt-4 flex flex-wrap items-center justify-between border-t border-[#efe8dc]/10 pt-3 font-mono text-[10px] uppercase tracking-wider text-[#a49b8e]">
                  <span>DECEL: -{(p2 * 9.81).toFixed(2)} m/s²</span>
                  <span>G-FORCE: {(1 + p2 * 0.45).toFixed(2)}G</span>
                  <span className={p2 > 0.5 ? "text-[#ffb13b] font-bold" : "text-[#a49b8e]"}>
                    {p2 > 0.5 ? "STATUS: WINDSHIELD IMPACT" : "STATUS: STEADY DECELERATION"}
                  </span>
                </div>
              </div>

              <div>
                <p className="font-serif text-3xl leading-snug text-[#fff6ed] md:text-4xl">
                  “I put a full glass of water on the dashboard to test my new
                  brakes. Good news: the brakes work.”
                </p>
                <div className="mt-6 laocoon-card p-5 font-mono text-xs leading-relaxed">
                  {p2 < 0.5 ? (
                    <p className="text-[#a49b8e]">
                      <b className="text-[#efe8dc]">STRAIGHT MAN (98% CONF):</b>{" "}
                      “That is an empirical way to verify vehicular deceleration.
                      Glad your braking pads achieved adequate friction.”
                    </p>
                  ) : (
                    <p className="text-[#ffb13b]">
                      <b>NEWTON&apos;S FIRST LAW (THE PUNCHLINE):</b> The car
                      stopped at 0 mph. The water continued at 35 mph directly into
                      the windshield and passenger seat. STUMPED.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="sig-foot">
              <span>Embodied World Physics</span>
              <span>
                Tilt Angle: {(p2 * 26).toFixed(0)}°{" "}
                {p2 > 0.45 ? "· SPLASH DETECTED" : "· Decelerating"}
              </span>
            </div>
          </div>
        </div>
      </article>

      {/* ==================== DOUBLE MEANING ==================== */}
      <article className="case pb-20" id="double-meaning">
        <div className="case-head">
          <div>
            <span className="eyebrow">Two Readings · Double Meaning</span>
            <h2>
              Double <em>Meaning.</em>
            </h2>
          </div>
          <dl className="case-meta-grid">
            <div>
              <dt>Premise</dt>
              <dd>One grammatical structure carrying two incompatible truths.</dd>
            </div>
            <div>
              <dt>AI Blindspot</dt>
              <dd>Collapses ambiguity to a single argmax interpretation.</dd>
            </div>
            <div>
              <dt>Crowd Signal</dt>
              <dd>The groan-laugh when both meanings click simultaneously.</dd>
            </div>
            <div>
              <dt>Action</dt>
              <dd>
                <Link
                  href="/app?tab=stage&category=double_meaning"
                  className="font-mono text-xs uppercase tracking-widest text-[#ffc53d] underline"
                >
                  Try Double Meaning on Stage →
                </Link>
              </dd>
            </div>
          </dl>
        </div>

        {/* Pinned 280vh Signature Moment with Superposition Matrix */}
        <div ref={sig3Ref} className="sig">
          <div className="sig-Stage">
            <div className="sig-chrome">
              <span>Signature Moment · Quantum Syntactic Superposition</span>
              <div className="flex items-center gap-3">
                <span>Scroll to split readings</span>
                <div className="sig-meter">
                  <i style={{ transform: `scaleX(${p3})` }} />
                </div>
              </div>
            </div>

            <div className="mx-auto w-full max-w-4xl text-center">
              <p className="font-serif text-3xl text-[#fff6ed] md:text-5xl">
                “Time flies like an arrow;{" "}
                <em className="text-[#ffb13b]">fruit flies like a banana.</em>”
              </p>

              <div className="mt-10 grid gap-6 md:grid-cols-2">
                <div
                  className="laocoon-card p-6 text-left transition-transform duration-300"
                  style={{
                    transform: `translateX(${(-p3 * 14).toFixed(1)}px)`,
                    borderColor: "rgba(59, 130, 246, 0.4)",
                  }}
                >
                  <span className="hud-badge text-[#3b82f6] border-[#3b82f6]/30 bg-[#3b82f6]/10">
                    Reading A · The AI&apos;s Only View
                  </span>
                  <h3 className="display-serif mt-3 text-2xl text-[#fff6ed]">
                    [flies = verb] · Aerodynamics
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-[#a49b8e]">
                    Straight Man compares the ballistic flight trajectory of thrown
                    produce to archery projectiles and concludes bananas have
                    insufficient aerodynamic lift.
                  </p>
                </div>

                <div
                  className="laocoon-card p-6 text-left transition-transform duration-300"
                  style={{
                    transform: `translateX(${(p3 * 14).toFixed(1)}px)`,
                    borderColor: "rgba(255, 177, 59, 0.7)",
                    background: "radial-gradient(80% 120% at 50% 0%, rgba(255, 177, 59, 0.14) 0%, rgba(30, 58, 138, 0.05) 50%, transparent 80%), #0c0a08",
                  }}
                >
                  <span className="hud-badge text-[#ffb13b] border-[#ffb13b]/40 bg-[#ffb13b]/15">
                    Reading B · Where the Laugh Lives
                  </span>
                  <h3 className="display-serif mt-3 text-2xl text-[#fff6ed]">
                    [fruit flies = noun] · [like = enjoy]
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-[#efe8dc]">
                    Tiny kitchen insects{" "}
                    <b className="text-[#ffb13b]">(Drosophila melanogaster)</b> are
                    enthusiastically fond of overripe bananas. One sentence, two
                    complete worlds.
                  </p>
                </div>
              </div>
            </div>

            <div className="sig-foot">
              <span>Syntactic Superposition</span>
              <span>One Sentence · Two Complete Worlds</span>
            </div>
          </div>
        </div>
      </article>
    </>
  );
}
