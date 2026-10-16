"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

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
            className="lineup-row"
            onMouseEnter={() => setHoveredCat("punchline")}
            onMouseLeave={() => setHoveredCat(null)}
          >
            <span className="idx">SET 01</span>
            <span className="title">Punchline</span>
            <span className="premise">
              Set up a confident assumption, then flip it on the last word.
            </span>
            <span className="cat">Expectation Flip</span>
            <span className="arr">↗</span>
          </a>

          <a
            href="#subtext"
            className="lineup-row"
            onMouseEnter={() => setHoveredCat("subtext")}
            onMouseLeave={() => setHoveredCat(null)}
          >
            <span className="idx">SET 02</span>
            <span className="title">Subtext</span>
            <span className="premise">
              Say something polite while every human in the room hears the
              dagger.
            </span>
            <span className="cat">Polite vs. Real</span>
            <span className="arr">↗</span>
          </a>

          <a
            href="#irl"
            className="lineup-row"
            onMouseEnter={() => setHoveredCat("irl")}
            onMouseLeave={() => setHoveredCat(null)}
          >
            <span className="idx">SET 03</span>
            <span className="title">IRL</span>
            <span className="premise">
              Physical comedy, gravity, and awkward bodies that text-only models
              can&apos;t picture.
            </span>
            <span className="cat">Physical World</span>
            <span className="arr">↗</span>
          </a>

          <a
            href="#double-meaning"
            className="lineup-row"
            onMouseEnter={() => setHoveredCat("double-meaning")}
            onMouseLeave={() => setHoveredCat(null)}
          >
            <span className="idx">SET 04</span>
            <span className="title">Double Meaning</span>
            <span className="premise">
              One sentence holding two complete worlds at the exact same time.
            </span>
            <span className="cat">Two Readings</span>
            <span className="arr">↗</span>
          </a>
        </div>

        {/* Cursor-following floating preview card */}
        <div
          ref={thumbRef}
          className={`pointer-events-none fixed z-50 hidden h-[180px] w-[260px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-[#ffb13b]/50 bg-[#14100d]/95 p-4 shadow-[0_24px_60px_rgba(0,0,0,0.75)] backdrop-blur-md transition-opacity duration-200 md:flex md:flex-col md:justify-between ${
            hoveredCat ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden="true"
        >
          <div className="flex justify-between font-mono text-[10px] uppercase tracking-widest text-[#ffb13b]">
            <span>{hoveredCat?.toUpperCase() ?? "SET"}</span>
            <span>SM-01 Blindspot</span>
          </div>
          <div className="font-serif text-lg leading-snug text-[#fff6ed]">
            {hoveredCat === "punchline" &&
              "Last-word frame switches break greedy token prediction."}
            {hoveredCat === "subtext" &&
              "Polite surface syntax masks 180° opposite emotional intent."}
            {hoveredCat === "irl" &&
              "Momentum, spilled coffee, and spatial embarrassment."}
            {hoveredCat === "double-meaning" &&
              "Collapse of two valid parses into a single pun."}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-[#a49b8e]">
            Click to inspect set →
          </div>
        </div>
      </section>

      {/* ==================== SET 01 · PUNCHLINE ==================== */}
      <article className="case" id="punchline">
        <div className="case-head">
          <div>
            <span className="eyebrow">Set 01 · Expectation Flip</span>
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
              <dd>Instant recognition on the final 2–3 words.</dd>
            </div>
            <div>
              <dt>Action</dt>
              <dd>
                <Link
                  href="/stage?category=PUNCHLINE"
                  className="font-mono text-xs uppercase tracking-widest text-[#ffb13b] underline"
                >
                  Try Punchline on Stage →
                </Link>
              </dd>
            </div>
          </dl>
        </div>

        <div className="hero-art">
          <svg viewBox="0 0 1200 600" fill="none" aria-hidden="true">
            <line
              x1="120"
              y1="420"
              x2="780"
              y2="240"
              stroke="rgba(239,232,220,0.28)"
              strokeWidth="2"
              strokeDasharray="6 8"
            />
            <line
              x1="780"
              y1="240"
              x2="1080"
              y2="158"
              stroke="rgba(239,232,220,0.16)"
              strokeWidth="2"
              strokeDasharray="3 8"
            />
            <path
              d="M120 420 Q 520 310 780 240 T 1040 470"
              stroke="#ffb13b"
              strokeWidth="3"
              fill="none"
            />
            <circle cx="780" cy="240" r="8" fill="#ffb13b" />
            <circle
              cx="780"
              cy="240"
              r="24"
              stroke="#ffb13b"
              strokeOpacity="0.35"
            />
            <circle cx="1040" cy="470" r="10" fill="#ffb13b" />
            <text
              x="140"
              y="395"
              fill="#a49b8e"
              fontFamily="Geist Mono, monospace"
              fontSize="13"
              letterSpacing="3"
            >
              SETUP TRAJECTORY (97% CONFIDENCE)
            </text>
            <text
              x="805"
              y="225"
              fill="#ffb13b"
              fontFamily="Geist Mono, monospace"
              fontSize="13"
              letterSpacing="3"
            >
              PIVOT WORD
            </text>
            <text
              x="860"
              y="515"
              fill="#fff6ed"
              fontFamily="Fraunces, serif"
              fontStyle="italic"
              fontSize="28"
            >
              Where the laugh lands
            </text>
          </svg>
          <div className="caption">
            <span>Fig 01 · Expectation Trajectory vs. Pivot Drop</span>
            <span>Category: PUNCHLINE</span>
          </div>
        </div>

        <div className="prose">
          <div className="side">01 · Anatomy of the Flip</div>
          <div className="body">
            <p className="lead">
              A great punchline doesn&apos;t invent a new world — it reveals
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

        {/* Pinned 280vh Signature Moment 01 */}
        <div ref={sig0Ref} className="sig">
          <div className="sig-Stage">
            <div className="sig-chrome">
              <span>Signature Moment 01 · Pronoun &amp; Idiom Pivot</span>
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
                  className="rounded-xl border p-5 text-left transition-all duration-300"
                  style={{
                    borderColor:
                      p0 < 0.5
                        ? "rgba(255,177,59,0.55)"
                        : "rgba(239,232,220,0.12)",
                    background:
                      p0 < 0.5
                        ? "rgba(255,177,59,0.08)"
                        : "rgba(20,16,13,0.6)",
                  }}
                >
                  <div className="font-mono text-[10px] uppercase tracking-widest text-[#a49b8e]">
                    Frame A · Straight Man Parse (Idiomatic)
                  </div>
                  <p className="mt-2 font-mono text-xs leading-relaxed text-[#efe8dc]">
                    [put_foot_down = assert_authority] → &ldquo;Setting a firm
                    boundary in a marriage is healthy. Good for you.&rdquo;
                  </p>
                </div>

                <div
                  className="rounded-xl border p-5 text-left transition-all duration-300"
                  style={{
                    borderColor:
                      p0 >= 0.5
                        ? "rgba(255,177,59,0.65)"
                        : "rgba(239,232,220,0.12)",
                    background:
                      p0 >= 0.5
                        ? "rgba(255,177,59,0.12)"
                        : "rgba(20,16,13,0.6)",
                  }}
                >
                  <div className="font-mono text-[10px] uppercase tracking-widest text-[#ffb13b]">
                    Frame B · Human Crowd Parse (Physical Flamingo)
                  </div>
                  <p className="mt-2 font-mono text-xs leading-relaxed text-[#fff6ed]">
                    [speaker_standing_on_one_leg = true] → Lowering the second
                    flamingo leg to the floor.{" "}
                    <b className="text-[#ffb13b]">97% CONFIDENT · 0% CORRECT</b>
                  </p>
                </div>
              </div>
            </div>

            <div className="sig-foot">
              <span>Bit #0417 · Verified Stumper</span>
              <span>
                {p0 >= 0.5
                  ? "★ Verdict: STUMPED (Entered Joke Vault)"
                  : "Reading setup trajectory…"}
              </span>
            </div>
          </div>
        </div>

        {/* 3-Step Flow */}
        <div className="flow-grid">
          <div className="screen">
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

          <div className="screen">
            <div className="screen-bar">
              <span>2 · Straight Man</span>
              <span>SM-01</span>
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

          <div className="screen">
            <div className="screen-bar">
              <span>3 · The Crowd</span>
              <span>Quorum 9/9</span>
            </div>
            <div className="screen-body">
              <p className="text-sm leading-relaxed text-[#d8d0c2]">
                8 of 9 staked judges voted <b>AI Missed It + Funny</b>. Added to
                the Joke Vault and queued for tonight&apos;s Tip Jar payout.
              </p>
              <span className="stamp">★ Stumped · +145 pts</span>
            </div>
          </div>
        </div>
      </article>

      {/* ==================== SET 02 · SUBTEXT ==================== */}
      <article className="case" id="subtext">
        <div className="case-head">
          <div>
            <span className="eyebrow">Set 02 · Polite vs. Real</span>
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
                  href="/stage?category=SUBTEXT"
                  className="font-mono text-xs uppercase tracking-widest text-[#ffb13b] underline"
                >
                  Try Subtext on Stage →
                </Link>
              </dd>
            </div>
          </dl>
        </div>

        {/* Pinned 280vh Signature Moment 02 */}
        <div ref={sig1Ref} className="sig">
          <div className="sig-Stage">
            <div className="sig-chrome">
              <span>Signature Moment 02 · Passive-Aggressive Decoder</span>
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
                },
                {
                  polite: "“Sure, whenever you get a chance.”",
                  ai: "AI Sentiment: +0.88 Flexible & Low Urgency",
                  real: "REAL SUBTEXT: It was due forty-five minutes ago and I am watching you type.",
                  threshold: 0.48,
                },
                {
                  polite: "“Per my last email—”",
                  ai: "AI Sentiment: +0.72 Helpful Cross-Reference",
                  real: "REAL SUBTEXT: Can you read, or are we just clicking buttons today?",
                  threshold: 0.75,
                },
              ].map((row, idx) => {
                const active = p1 >= row.threshold;
                return (
                  <div
                    key={idx}
                    className="rounded-2xl border p-6 transition-all duration-300"
                    style={{
                      borderColor: active
                        ? "rgba(201,59,43,0.55)"
                        : "rgba(239,232,220,0.12)",
                      background: active
                        ? "rgba(201,59,43,0.08)"
                        : "rgba(20,16,13,0.65)",
                    }}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-serif text-2xl text-[#fff6ed] md:text-3xl">
                        {row.polite}
                      </span>
                      <span className="font-mono text-[11px] uppercase tracking-widest text-[#a49b8e]">
                        {row.ai}
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
                        : "Scroll to reveal what every human actually heard…"}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="sig-foot">
              <span>Set 02 · Subtext Calibration</span>
              <span>Polite Surface ≠ Human Intent</span>
            </div>
          </div>
        </div>
      </article>

      {/* ==================== SET 03 · IRL ==================== */}
      <article className="case" id="irl">
        <div className="case-head">
          <div>
            <span className="eyebrow">Set 03 · Physical World</span>
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
                  href="/stage?category=IRL"
                  className="font-mono text-xs uppercase tracking-widest text-[#ffb13b] underline"
                >
                  Try IRL on Stage →
                </Link>
              </dd>
            </div>
          </dl>
        </div>

        {/* Pinned 280vh Signature Moment 03 */}
        <div ref={sig2Ref} className="sig">
          <div className="sig-Stage">
            <div className="sig-chrome">
              <span>Signature Moment 03 · Inertial Comedy Physics</span>
              <div className="flex items-center gap-3">
                <span>Scroll to hit the brakes</span>
                <div className="sig-meter">
                  <i style={{ transform: `scaleX(${p2})` }} />
                </div>
              </div>
            </div>

            <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-[1fr_1.1fr]">
              <div className="mx-auto w-full max-w-xs">
                <svg viewBox="0 0 260 280" className="w-full">
                  {/* Cup */}
                  <path
                    d="M65 50 L82 230 L178 230 L195 50 Z"
                    stroke="#efe8dc"
                    strokeWidth="2.5"
                    fill="rgba(239,232,220,0.03)"
                  />
                  {/* Tilting liquid */}
                  <g
                    transform={`rotate(${(p2 * 34).toFixed(1)} 130 130)`}
                  >
                    <rect
                      x="72"
                      y="95"
                      width="116"
                      height="130"
                      fill="rgba(255,177,59,0.38)"
                    />
                    <line
                      x1="68"
                      y1="95"
                      x2="192"
                      y2="95"
                      stroke="#ffb13b"
                      strokeWidth="3"
                    />
                  </g>
                  {/* Spilled droplets when p2 > 0.55 */}
                  {p2 > 0.55 ? (
                    <g>
                      <circle cx="215" cy="78" r="6" fill="#ffb13b" />
                      <circle cx="232" cy="105" r="4.5" fill="#ffb13b" />
                      <circle cx="224" cy="135" r="5" fill="#ffb13b" />
                    </g>
                  ) : null}
                </svg>
              </div>

              <div>
                <p className="font-serif text-3xl leading-snug text-[#fff6ed] md:text-4xl">
                  “I put a full glass of water on the dashboard to test my new
                  brakes. Good news: the brakes work.”
                </p>
                <div className="mt-6 rounded-xl border border-[#efe8dc]/15 bg-[#14100d]/80 p-5 font-mono text-xs leading-relaxed">
                  {p2 < 0.55 ? (
                    <p className="text-[#a49b8e]">
                      <b className="text-[#efe8dc]">STRAIGHT MAN (96% CONF):</b>{" "}
                      “That is a practical way to verify deceleration. Glad your
                      vehicle&apos;s braking system passed.”
                    </p>
                  ) : (
                    <p className="text-[#ffb13b]">
                      <b>NEWTON&apos;S FIRST LAW (THE PUNCHLINE):</b> The car
                      stopped. The water kept going at 35 mph straight into your
                      lap. ★ STUMPED.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="sig-foot">
              <span>Set 03 · Embodied World Physics</span>
              <span>
                Tilt Angle: {(p2 * 34).toFixed(0)}°{" "}
                {p2 > 0.55 ? "· SPLASH DETECTED" : "· Decelerating"}
              </span>
            </div>
          </div>
        </div>
      </article>

      {/* ==================== SET 04 · DOUBLE MEANING ==================== */}
      <article className="case pb-20" id="double-meaning">
        <div className="case-head">
          <div>
            <span className="eyebrow">Set 04 · Two Readings</span>
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
                  href="/stage?category=DOUBLE_MEANING"
                  className="font-mono text-xs uppercase tracking-widest text-[#ffb13b] underline"
                >
                  Try Double Meaning on Stage →
                </Link>
              </dd>
            </div>
          </dl>
        </div>

        {/* Pinned 280vh Signature Moment 04 */}
        <div ref={sig3Ref} className="sig">
          <div className="sig-Stage">
            <div className="sig-chrome">
              <span>Signature Moment 04 · Binocular Ambiguity Split</span>
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
                  className="rounded-2xl border border-[#efe8dc]/15 bg-[#14100d]/85 p-6 text-left transition-transform duration-300"
                  style={{
                    transform: `translateX(${(-p3 * 12).toFixed(1)}px)`,
                  }}
                >
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#a49b8e]">
                    Reading A · The AI&apos;s Only View
                  </span>
                  <h3 className="display-serif mt-2 text-2xl text-[#fff6ed]">
                    [flies = verb] · Aerodynamics
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#a49b8e]">
                    Straight Man compares the flight trajectory of thrown
                    produce to archery projectiles and concludes bananas have
                    poor lift.
                  </p>
                </div>

                <div
                  className="rounded-2xl border border-[#ffb13b]/50 bg-[#ffb13b]/10 p-6 text-left transition-transform duration-300"
                  style={{
                    transform: `translateX(${(p3 * 12).toFixed(1)}px)`,
                  }}
                >
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#ffb13b]">
                    Reading B · Where the Laugh Lives
                  </span>
                  <h3 className="display-serif mt-2 text-2xl text-[#fff6ed]">
                    [fruit flies = noun] · [like = enjoy]
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#efe8dc]">
                    Tiny kitchen insects{" "}
                    <b className="text-[#ffb13b]">(Drosophila)</b> are fond of
                    overripe bananas. One sentence, two complete worlds.
                  </p>
                </div>
              </div>
            </div>

            <div className="sig-foot">
              <span>Set 04 · Syntactic Superposition</span>
              <span>One Sentence · Two Complete Worlds</span>
            </div>
          </div>
        </div>
      </article>
    </>
  );
}
