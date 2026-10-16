import type { ReactNode } from "react";

export function PageHero({
  kicker,
  title,
  lede,
  rightMeta,
}: {
  kicker: string;
  title: ReactNode;
  lede?: string;
  rightMeta?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-[#efe8dc]/12 bg-gradient-to-b from-[#1b150f] to-[#0e0b09] p-8 md:p-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/3 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-[#ffb13b]/12 blur-3xl"
      />
      <div className="relative grid gap-8 md:grid-cols-[1.35fr_1fr] md:items-end">
        <div>
          <span className="eyebrow">{kicker}</span>
          <h1 className="display-serif mt-4 text-4xl text-[#fff6ed] md:text-6xl">
            {title}
          </h1>
          {lede ? (
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-[#a49b8e] md:text-lg">
              {lede}
            </p>
          ) : null}
        </div>
        {rightMeta ? (
          <div className="border-t border-[#efe8dc]/12 pt-5 md:border-t-0 md:border-l md:pl-7 md:pt-0">
            {rightMeta}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function Card({
  children,
  className = "",
  hot = false,
}: {
  children: ReactNode;
  className?: string;
  hot?: boolean;
}) {
  return (
    <div className={`editorial-card ${hot ? "hot" : ""} ${className}`}>
      {children}
    </div>
  );
}

export function SectionTitle({
  children,
  hint,
  eyebrow,
}: {
  children: ReactNode;
  hint?: string;
  eyebrow?: string;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-[#efe8dc]/10 pb-3">
      <div>
        {eyebrow ? <span className="eyebrow mb-1.5">{eyebrow}</span> : null}
        <h2 className="display-serif text-2xl text-[#fff6ed] md:text-3xl">
          {children}
        </h2>
      </div>
      {hint ? (
        <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-[#a49b8e]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Stamp({
  children,
  tone = "amber",
}: {
  children: ReactNode;
  tone?: "amber" | "green" | "red";
}) {
  const cls =
    tone === "green"
      ? "stamp green"
      : tone === "red"
        ? "stamp red"
        : "stamp";
  return <span className={cls}>{children}</span>;
}

export function Disclaimer() {
  return (
    <p className="mt-10 rounded-xl border border-[#efe8dc]/10 bg-[#14100d]/80 p-4 font-mono text-[11px] uppercase tracking-[0.13em] leading-relaxed text-[#6c6459]">
      Rewards vary and depend on the Tip Jar — nothing here is a promise of any
      amount. Nothing on this page is financial advice.
    </p>
  );
}
