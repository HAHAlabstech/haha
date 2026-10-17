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
    <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#121217] via-[#09090c] to-[#060606] p-8 md:p-12 shadow-2xl">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/3 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-[#ffb13b]/10 blur-3xl"
      />
      <div className="relative grid gap-8 md:grid-cols-[1.35fr_1fr] md:items-end">
        <div>
          <span className="eyebrow">{kicker}</span>
          <h1 className="display-serif mt-4 text-4xl text-[#f4f4f5] md:text-6xl tracking-tight">
            {title}
          </h1>
          {lede ? (
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-400 md:text-lg">
              {lede}
            </p>
          ) : null}
        </div>
        {rightMeta ? (
          <div className="border-t border-white/10 pt-5 md:border-t-0 md:border-l md:pl-7 md:pt-0">
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
    <div className="mb-5 flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-3">
      <div>
        {eyebrow ? <span className="eyebrow mb-1.5">{eyebrow}</span> : null}
        <h2 className="display-serif text-2xl text-[#f4f4f5] md:text-3xl">
          {children}
        </h2>
      </div>
      {hint ? (
        <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-zinc-400">
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
    <p className="mt-10 rounded-xl border border-white/10 bg-[#09090c]/80 p-4 font-mono text-[11px] uppercase tracking-[0.13em] leading-relaxed text-zinc-500 backdrop-blur-md">
      Rewards vary and depend on the Tip Jar — nothing here is a promise of any
      amount. Nothing on this page is financial advice.
    </p>
  );
}
