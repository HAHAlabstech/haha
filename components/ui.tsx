import type { ReactNode } from "react";

export function PageHero({
  kicker,
  title,
  lede,
}: {
  kicker: string;
  title: string;
  lede?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-amber-200/15 bg-gradient-to-b from-[#1c1426] to-[#100c18] p-8 md:p-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-amber-300/15 blur-3xl"
      />
      <p className="relative text-xs font-semibold uppercase tracking-[0.2em] text-amber-300/80">
        {kicker}
      </p>
      <h1 className="relative mt-2 max-w-2xl text-3xl font-bold leading-tight text-amber-50 md:text-5xl">
        {title}
      </h1>
      {lede ? (
        <p className="relative mt-4 max-w-2xl text-base leading-relaxed text-zinc-300 md:text-lg">
          {lede}
        </p>
      ) : null}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/[0.03] p-5 ${className}`}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  children,
  hint,
}: {
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-4">
      <h2 className="text-xl font-semibold text-amber-50">{children}</h2>
      {hint ? <p className="text-xs text-zinc-500">{hint}</p> : null}
    </div>
  );
}

export function Disclaimer() {
  return (
    <p className="mt-8 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs leading-relaxed text-zinc-500">
      Rewards vary and depend on the Tip Jar — nothing here is a promise of
      any amount. Nothing on this page is financial advice.
    </p>
  );
}
