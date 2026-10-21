"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Card, Disclaimer, SectionTitle, Stamp } from "@/components/ui";
import { authHeaders, truncateAddress } from "@/lib/wallets";

interface UserProfileResponse {
  found: boolean;
  is_owner?: boolean;
  profile: {
    wallet: string | null;
    handle: string;
    comedian_tier: string;
    comedian_rep: number;
    crowd_tier: string;
    crowd_rep: number;
    onboarding_passed?: boolean;
  };
  stats: {
    bits_count: number;
    killed_it_count: number;
    crowd_votes_count: number;
    earned_usdg_micro: string;
  };
  recent_bits: {
    id: string;
    category: string;
    scenario: string;
    question: string;
    stage: string;
    status: string;
    reject_reason?: string | null;
    created_at: string;
  }[];
}

const COMEDIAN_TIER_LABELS: Record<string, string> = {
  open_mic: "Open Mic",
  opener: "Opener",
  feature: "Feature",
  headliner: "Headliner",
  legend: "Legend",
};

const CROWD_TIER_LABELS: Record<string, string> = {
  walk_in: "Walk-in",
  regular: "Regular",
  front_row: "Front Row",
  critic: "Critic",
};

export default function ProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = use(params);
  const display = decodeURIComponent(handle).replace(/^@/, "");
  const [data, setData] = useState<UserProfileResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/u/${encodeURIComponent(display)}`, {
      headers: authHeaders(),
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (!cancelled && res?.profile) {
          setData(res as UserProfileResponse);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [display]);

  const comedianLabel =
    COMEDIAN_TIER_LABELS[data?.profile.comedian_tier ?? "open_mic"] ??
    "Open Mic";
  const crowdLabel =
    CROWD_TIER_LABELS[data?.profile.crowd_tier ?? "walk_in"] ?? "Walk-in";

  let earnedDisplay = "—";
  if (data?.stats) {
    try {
      const val = Number(BigInt(data.stats.earned_usdg_micro || "0")) / 1e6;
      earnedDisplay = `$${val.toFixed(2)}`;
    } catch {
      earnedDisplay = "$0.00";
    }
  }

  return (
    <div className="relative min-h-screen bg-[#070709] text-white selection:bg-[#ffc53d]/30 selection:text-[#ffc53d] overflow-x-clip">
      {/* Ambient Stage Lighting Glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed top-0 left-1/2 -translate-x-1/2 w-[1100px] h-[550px] bg-radial from-[#ffc53d]/06 via-[#ffc53d]/01 to-transparent blur-[160px] rounded-full z-0"
      />

      <div className="relative z-10 mx-auto max-w-[1440px] px-[clamp(20px,4vw,56px)] pt-28 pb-16 space-y-12">
      <div className="flex flex-wrap items-end justify-between gap-6 border-b border-white/10 pb-10">
        <div>
          <span className="eyebrow">Performer &amp; Juror Dossier</span>
          <h1 className="display-serif mt-3 text-5xl text-[#f4f4f5] md:text-6xl tracking-tight">
            @{data?.profile.handle ?? display}
          </h1>
          <p className="mt-3 font-mono text-xs uppercase tracking-[0.16em] text-zinc-400">
            {comedianLabel} Comedian · {crowdLabel} Juror
            {data?.profile.wallet
              ? ` · ${truncateAddress(data.profile.wallet)}`
              : ""}
          </p>
        </div>
        <Stamp>{comedianLabel}</Stamp>
      </div>

      <section aria-label="Stats">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              label: "Bits Performed",
              value: data ? data.stats.bits_count.toString() : "—",
            },
            {
              label: "Verified Stumpers",
              value: data ? data.stats.killed_it_count.toString() : "—",
            },
            {
              label: "Crowd Ballots",
              value: data ? data.stats.crowd_votes_count.toString() : "—",
            },
            { label: "Earned (USDG)", value: earnedDisplay },
          ].map((s) => (
            <Card key={s.label}>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-400">
                {s.label}
              </span>
              <p className="display-serif mt-3 text-4xl text-white tabular-nums">
                {s.value}
              </p>
            </Card>
          ))}
        </div>
      </section>

      <section aria-label="Recent bits">
        <SectionTitle
          eyebrow="Stage Archive"
          hint={
            data?.is_owner
              ? "Your full archive · pending and rejected included"
              : "Public bits only"
          }
        >
          Recent <em>Performances.</em>
        </SectionTitle>
        {data && data.recent_bits.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2">
            {data.recent_bits.map((b) => (
              <div
                key={b.id}
                className="haha-glass-panel rounded-2xl p-6 sm:p-7 flex flex-col justify-between gap-6"
              >
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] font-mono text-[10px] uppercase tracking-[0.16em] text-zinc-400">
                    <span className="text-[#ffc53d]">{b.category}</span>
                    <span>{b.stage}</span>
                  </div>
                  <p className="font-serif text-xl leading-relaxed text-zinc-100 mt-4">
                    “{b.scenario}”
                  </p>
                  <p className="mt-3 font-mono text-xs text-zinc-400">
                    {b.question}
                  </p>
                  {b.reject_reason ? (
                    <p className="mt-2 font-mono text-[10px] text-rose-300">
                      {b.reject_reason.replace(/_/g, " ")}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#ffc53d]">
                    {b.status.replace(/_/g, " ")}
                  </span>
                  <Link
                    href={`/bit/${encodeURIComponent(b.id)}`}
                    className="inline-flex items-center gap-1 font-mono text-xs uppercase tracking-widest text-zinc-300 hover:text-[#ffc53d] transition-colors"
                  >
                    Inspect Bit <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card>
            <p className="text-sm text-zinc-400">
              Public bits from @{display} will appear here. Holdout bits stay
              sealed to protect their benchmark evaluation integrity.
            </p>
          </Card>
        )}
      </section>

      <Disclaimer />
      </div>
    </div>
  );
}
