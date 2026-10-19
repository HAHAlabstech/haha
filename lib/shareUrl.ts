// Share-card public URL convention (single source of truth:
// worker/lib/shareCard.js cardKey/cardUrl). Kept in sync as a pure function
// so app routes can serve the deterministic URL without importing worker code.
export function cardKey(bitId: string): string {
  return `public/share/v2/bit-${bitId.toLowerCase()}.png`;
}

export function cardUrl(bitId: string): string | null {
  const base = (process.env.R2_PUBLIC_URL ?? "").replace(/\/+$/, "");
  if (!base) return null;
  return base.startsWith("http")
    ? `${base}/${cardKey(bitId)}`
    : `https://${base}/${cardKey(bitId)}`;
}
