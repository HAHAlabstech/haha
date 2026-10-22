import type { Metadata } from "next";
import { Card, Disclaimer, PageHero, SectionTitle, Stamp } from "@/components/ui";

export const metadata: Metadata = {
  title: "Seasons & Rules: HAHA",
  description:
    "Season 01 rulebook: two Straight Man tables (Open Mic vs Pro Stage), reward formula, Crowd jury tiers, quorum rules, and pilot disclosures.",
};

const STAGE_ROWS = [
  {
    label: "Open Mic",
    model: "Thinking-off, fast & cheap",
    multiplier: "1.0× reward",
    quota: "5 bits / day (default account)",
  },
  {
    label: "Pro Stage",
    model: "Thinking-on, full playbook (premium dataset)",
    multiplier: "2.5× reward",
    quota: "Same daily quota",
  },
];

const CROWD_TIERS = [
  {
    tier: "Walk-in",
    quota: "15 votes / day",
    weight: "1.00×",
    unlock: "Pass the 10-case calibration quiz (8/10)",
  },
  {
    tier: "Regular",
    quota: "30 votes / day",
    weight: "1.15×",
    unlock: "≥ 20 consensus votes · plant accuracy ≥ 85%",
  },
  {
    tier: "Front Row",
    quota: "50 votes / day",
    weight: "1.30×",
    unlock: "≥ 60 consensus votes · plant accuracy ≥ 90%",
  },
  {
    tier: "Critic",
    quota: "80 votes / day",
    weight: "1.50× (maximum)",
    unlock: "≥ 150 consensus votes · plant accuracy ≥ 95%",
  },
];

export default function SeasonsPage() {
  return (
    <div className="relative min-h-screen bg-[#070709] text-white overflow-x-clip">
      <div className="relative z-10 mx-auto max-w-[1440px] px-[clamp(20px,4vw,56px)] pt-28 pb-16 space-y-12">
        <PageHero
          kicker="Season 01 · Disclosure"
          title={
            <>
              The <em>rulebook.</em>
            </>
          }
          lede="Everything that decides whether a bit gets paid: which Straight Man table you played, how the Crowd weighs your votes, and where the daily pool goes. No hidden multipliers."
        />

        <section aria-label="Two stage tables">
          <SectionTitle eyebrow="Straight Man · Two Tables">
            Open Mic vs <em>Pro Stage.</em>
          </SectionTitle>
          <Card>
            <div className="grid gap-4 md:grid-cols-2">
              {STAGE_ROWS.map((row, i) => (
                <div
                  key={row.label}
                  className="rounded-xl border border-white/10 bg-[#070709] p-5"
                >
                  <div className="flex items-center justify-between">
                    <p className="display-serif text-2xl text-white">
                      {row.label}
                    </p>
                    <Stamp tone={i === 1 ? "amber" : "green"}>
                      {row.multiplier}
                    </Stamp>
                  </div>
                  <p className="mt-2 text-sm text-zinc-300">{row.model}</p>
                  <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-zinc-500">
                    {row.quota}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs leading-relaxed text-zinc-400">
              The table you pick is recorded on the bit and follows it into the
              dataset license: a killed-it Pro bit and a killed-it Open Mic bit
              are priced differently. That is why the toggle exists, and why it
              is disclosed here.
            </p>
          </Card>
        </section>

        <section aria-label="Reward formula">
          <SectionTitle eyebrow="Daily Epoch · 00:00 UTC">
            How the pool <em>splits.</em>
          </SectionTitle>
          <Card>
            <p className="font-mono text-sm text-white">
              score = win_strength × fairness × stage_mult (1.0 / 2.5) ×
              tier_mult × category_mult
            </p>
            <ul className="mt-4 space-y-2 text-sm leading-relaxed text-zinc-300">
              <li>
                · Each epoch&apos;s pool is split pro-rata by score, capped at
                5% per account (across all of that account&apos;s bits).
              </li>
              <li>
                · Unclaimed dust under $1 rolls over into the next epoch; it is
                never burned.
              </li>
              <li>
                · Claims are cumulative: one transaction covers every epoch.
              </li>
            </ul>
          </Card>
        </section>

        <section aria-label="Crowd tiers">
          <SectionTitle eyebrow="The Crowd · Jury Tiers">
            Vote quotas &amp; <em>weights.</em>
          </SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CROWD_TIERS.map((t) => (
              <Card key={t.tier}>
                <div className="flex items-center justify-between">
                  <p className="display-serif text-xl text-white">
                    {t.tier}
                  </p>
                  <Stamp tone="amber">{t.weight}</Stamp>
                </div>
                <p className="mt-2 font-mono text-[11px] uppercase tracking-widest text-zinc-400">
                  {t.quota}
                </p>
                <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                  {t.unlock}
                </p>
              </Card>
            ))}
          </div>
        </section>

        <section aria-label="Quorum rules">
          <SectionTitle eyebrow="Blind Quorum">
            How verdicts <em>finalize.</em>
          </SectionTitle>
          <Card>
            <ul className="space-y-2 text-sm leading-relaxed text-zinc-300">
              <li>
                · Every disputed bit seats <strong>5 blind jurors</strong>. Thin
                margins expand the jury to <strong>7</strong>, never the other
                way around.
              </li>
              <li>
                · <strong>Killed it:</strong> weighted comedian share ≥ 60% and
                fairness ≥ 60%.
              </li>
              <li>
                · <strong>Heckled off:</strong> fairness ≤ 40% (cheap trick).
              </li>
              <li>
                · <strong>Bombed:</strong> everything else. One autonomous
                Round-2 retrial (fresh 7-seat jury) is available per bombed bit.
              </li>
            </ul>
          </Card>
        </section>

        <section aria-label="Disclosures">
          <SectionTitle eyebrow="Pilot Disclosures">
            What is <em>deliberately different.</em>
          </SectionTitle>
          <Card>
            <ul className="space-y-3 text-sm leading-relaxed text-zinc-300">
              <li>
                <strong>Two tables:</strong> Open Mic runs the Straight Man
                weakened; Pro Stage runs it thinking-on with the full playbook.
                Both are the same model family, so &quot;fool the AI&quot; is
                only meaningful if the table is labeled; hence this page.
              </li>
              <li>
                <strong>Season learning:</strong> this pilot upgrades the
                playbook through retrieval + prompt caching and exports
                preference data every epoch. It does not fine-tune closed
                upstream weights (LoRA on closed weights is impossible); the
                exported data is ready for open-weight training when that
                decision is made.
              </li>
              <li>
                <strong>Finality:</strong> verdicts are decided by the blind
                Crowd only, with no admin overrides. One retrial per bombed bit,
                with a fresh jury.
              </li>
            </ul>
          </Card>
        </section>

        <Disclaimer />
      </div>
    </div>
  );
}
