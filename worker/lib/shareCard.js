"use strict";
// Share card renderer (plan §4.6: 1200×675 PNG, auto-uploaded to R2 when a bit
// settles). Server-safe: sharp rasterizes an inline SVG — no headless browser.
// Text rendering uses librsvg via system fonts (fonts-dejavu-core in image).
// Palette: Luxury Obsidian (#070709 / #0f0f14) + Warm Amber Gold (#ffc53d) + Titanium Zinc (#f4f4f5 / #a1a1aa).
const sharp = require("sharp");

const MAINNET_BADGES = {
  killed_it: { label: "KILLED IT", bg: "#16130a", border: "#ffc53d", textColor: "#ffc53d" },
  bombed: { label: "BOMBED", bg: "#18181b", border: "#3f3f46", textColor: "#e4e4e7" },
  heckled_off: { label: "HECKLED OFF", bg: "#181208", border: "#d97706", textColor: "#fbbf24" },
};

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// word-wrap into visual-width lines (DejaVu ~0.62em per char at this size)
function wrap(text, maxChars, maxLines) {
  const words = String(text ?? "").replace(/\s+/g, " ").trim().split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    const probe = cur ? cur + " " + w : w;
    if (probe.length > maxChars && cur) { lines.push(cur); cur = w; } else cur = probe;
    if (lines.length >= maxLines) break;
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  return lines;
}

function pct(x) {
  const n = Number(x);
  return Number.isFinite(n) ? Math.round(n * 100) : null;
}

// data: { id, category, scenario, result, winStrength, fairRatio, jurorCount, holdout, seasonName }
async function renderShareCard(data) {
  const badge = MAINNET_BADGES[data.result] ?? {
    label: esc(data.result),
    bg: "#1c1608",
    border: "#ffc53d",
    textColor: "#ffc53d",
  };
  const seasonChip = esc(data.seasonName ?? "SEASON 01");
  const badgeW = 36 + badge.label.length * 15;
  const badgeCenterX = 96 + Math.round(badgeW / 2);

  // Holdout: rubrik §4.6 — isi skenario/jawaban WAJIB disembunyikan di kartu.
  if (data.holdout) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#070709"/><stop offset="1" stop-color="#0e0e14"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="675" fill="url(#bg)"/>
  <rect x="0" y="0" width="1200" height="675" fill="none" stroke="#27272a" stroke-width="2"/>
  <text x="96" y="104" font-size="36" font-weight="bold" fill="#ffc53d">HAHA</text>
  <text x="230" y="100" font-size="20" fill="#a1a1aa">THE CROWD JUDGES</text>
  <rect x="896" y="70" width="208" height="44" rx="8" fill="#121218" stroke="#27272a" stroke-width="1"/>
  <text x="1000" y="99" font-size="18" font-weight="bold" letter-spacing="1.5" fill="#ffc53d" text-anchor="middle">${esc(String(data.category ?? "").toUpperCase())}</text>
  <rect x="96" y="176" width="${badgeW}" height="46" rx="8" fill="${badge.bg}" stroke="${badge.border}" stroke-width="1.5"/>
  <text x="${badgeCenterX}" y="206" font-size="20" font-weight="bold" letter-spacing="2" fill="${badge.textColor}" text-anchor="middle">${esc(badge.label)}</text>
  <rect x="96" y="256" width="220" height="48" rx="8" fill="#121218" stroke="#27272a" stroke-width="1"/>
  <text x="206" y="288" font-size="20" fill="#e4e4e7" text-anchor="middle">${seasonChip}</text>
  <text x="96" y="396" font-size="32" font-weight="bold" fill="#f4f4f5">CONTENT SEALED</text>
  <text x="96" y="444" font-size="24" fill="#a1a1aa">This bit is reserved for the holdout training set.</text>
  <text x="96" y="484" font-size="24" fill="#a1a1aa">Joke text and reveals are hidden by design.</text>
  <line x1="96" y1="584" x2="1104" y2="584" stroke="#27272a" stroke-width="1.5"/>
  <text x="96" y="622" font-size="22" fill="#ffc53d">jurors ${data.jurorCount ?? 0}</text>
  <text x="1104" y="622" font-size="20" fill="#71717a" text-anchor="end">${esc(String(data.id).slice(-8))}</text>
</svg>`;
    return sharp(Buffer.from(svg, "utf8"), { density: 96 })
      .resize(1200, 675)
      .png({ compressionLevel: 9 })
      .toBuffer();
  }

  // DejaVu advances ~0.51em avg but caps/digits reach ~0.72em -> fs 30 * 46
  // chars stays inside the 1008px text column even all-caps (994px limit).
  const all = wrap(data.scenario, 46, 7);
  const shown = all.length > 6 ? all.slice(0, 6) : all;
  const totalWords = String(data.scenario ?? "").trim().split(/\s+/).length;
  const shownWords = shown.join(" ").trim().split(/\s+/).length;
  const moreWords = Math.max(0, totalWords - shownWords);
  const win = pct(data.winStrength);
  const fair = pct(data.fairRatio);
  const stats = [
    win !== null ? `win ${win}%` : null,
    fair !== null ? `fair ${fair}%` : null,
    `jurors ${data.jurorCount ?? 0}`,
  ].filter(Boolean).join("   ·   ");

  const body = shown
    .map((l, i) => `<text x="96" y="${296 + i * 48}" font-size="30" fill="#f4f4f5">${esc(l)}</text>`)
    .join("\n    ");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#070709"/><stop offset="1" stop-color="#0e0e14"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="675" fill="url(#bg)"/>
  <rect x="0" y="0" width="1200" height="675" fill="none" stroke="#27272a" stroke-width="2"/>
  <text x="96" y="104" font-size="36" font-weight="bold" fill="#ffc53d">HAHA</text>
  <text x="230" y="100" font-size="20" fill="#a1a1aa">THE CROWD JUDGES</text>
  <rect x="896" y="70" width="208" height="44" rx="8" fill="#121218" stroke="#27272a" stroke-width="1"/>
  <text x="1000" y="98" font-size="18" font-weight="bold" letter-spacing="1.5" fill="#ffc53d" text-anchor="middle">${esc(String(data.category ?? "").toUpperCase())}</text>
  <rect x="96" y="152" width="${badgeW}" height="46" rx="8" fill="${badge.bg}" stroke="${badge.border}" stroke-width="1.5"/>
  <text x="${badgeCenterX}" y="182" font-size="20" font-weight="bold" letter-spacing="2" fill="${badge.textColor}" text-anchor="middle">${esc(badge.label)}</text>
  ${body}
  ${moreWords ? `<text x="96" y="572" font-size="24" fill="#a1a1aa">… +${moreWords} more words</text>` : ""}
  <line x1="96" y1="584" x2="1104" y2="584" stroke="#27272a" stroke-width="1.5"/>
  <text x="96" y="622" font-size="22" font-weight="bold" letter-spacing="1" fill="#ffc53d">${esc(stats)}</text>
  <text x="1104" y="622" font-size="20" fill="#71717a" text-anchor="end">${esc(String(data.id).slice(-8))}</text>
</svg>`;

  return sharp(Buffer.from(svg, "utf8"), { density: 96 })
    .resize(1200, 675)
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/// R2 key + PUBLIC URL for a settled bit (deterministic — retrial overwrites).
/// R2_PUBLIC_URL is the public domain bound to the R2_BUCKET_NAME bucket.
/// v2 key prefix: pre-fix renders were edge-cached (CF forces 4h TTL) under
/// public/share/; bumping the prefix gives every card a fresh, cacheable URL.
/// Holdout gets its own key (sealed-bit-…) so a normal->holdout transition
/// never serves stale unsealed art from the edge.
function cardKey(bitId, opts) {
  const id = String(bitId).toLowerCase();
  return opts?.holdout
    ? `public/share/v4/sealed-bit-${id}.png`
    : `public/share/v4/bit-${id}.png`;
}
function cardUrl(bitId, opts) {
  const base = (process.env.R2_PUBLIC_URL ?? "").replace(/\/+$/, "");
  if (!base) return null;
  const key = cardKey(bitId, opts);
  return base.startsWith("http") ? `${base}/${key}` : `https://${base}/${key}`;
}
async function ensureCardForBit(prisma, bitId, putR2) {
  const bit = await prisma.bit.findUnique({
    where: { id: bitId },
    include: { outcome: true, season: { select: { name: true } } },
  });
  if (!bit) throw new Error(`[card] bit ${bitId} not found`);
  const png = await renderShareCard({
    id: bit.id,
    category: bit.category,
    question: bit.question,
    scenario: bit.scenario,
    result: bit.status,
    winStrength: bit.outcome?.win_strength,
    fairRatio: bit.outcome?.fair_ratio,
    jurorCount: bit.outcome?.juror_count,
    holdout: bit.is_holdout,
    seasonName: bit.season?.name,
  });
  const key = cardKey(bitId, { holdout: bit.is_holdout });
  await putR2(key, png, "image/png", { cacheControl: "public, max-age=300" });
  const url = cardUrl(bitId, { holdout: bit.is_holdout });
  await prisma.bit.update({ where: { id: bitId }, data: { share_card_r2_url: url } });
  return { bitId, url, bytes: png.length };
}

module.exports = { renderShareCard, ensureCardForBit, cardKey, cardUrl };
