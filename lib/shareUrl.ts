// Share-card public URL convention (single source of truth:
// worker/lib/shareCard.js cardKey/cardUrl). Kept in sync as a pure function
// so app routes can serve the deterministic URL without importing worker code.
export function cardKey(bitId: string, opts?: { holdout?: boolean }): string {
  const id = bitId.toLowerCase();
  return opts?.holdout
    ? `public/share/v4/sealed-bit-${id}.png`
    : `public/share/v4/bit-${id}.png`;
}

export function cardUrl(bitId: string, opts?: { holdout?: boolean }): string | null {
  const base = (process.env.R2_PUBLIC_URL ?? "").replace(/\/+$/, "");
  if (!base) return null;
  return base.startsWith("http")
    ? `${base}/${cardKey(bitId, opts)}`
    : `https://${base}/${cardKey(bitId, opts)}`;
}
