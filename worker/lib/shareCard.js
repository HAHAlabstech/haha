"use strict";
// Share card renderer (plan §4.6: 1200×675 PNG, auto-uploaded to R2 when a bit
// settles). Server-safe: sharp rasterizes an inline SVG — no headless browser.
// Text rendering uses librsvg via system fonts (fonts-dejavu-core in image).
const sharp = require("sharp");

const MAINNET_BADGES = {
  killed_it: { label: "KILLED IT", color: "#22c55e" },
  bombed: { label: "BOMBED", color: "#ef4444" },
  heckled_off: { label: "HECKLED OFF", color: "#f59e0b" },
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

// data: { id, category, scenario, result, winStrength, fairRatio, jurorCount }
async function renderShareCard(data) {
  const badge = MAINNET_BADGES[data.result] ?? { label: esc(data.result), color: "#8b5cf6" };
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
    .map((l, i) => `<text x="96" y="${300 + i * 48}" font-size="30" fill="#e8eefc">${esc(l)}</text>`)
    .join("\n    ");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675" viewBox="0 0 1200 675">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0b1020"/><stop offset="1" stop-color="#141c33"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="675" fill="url(#bg)"/>
  <rect x="0" y="0" width="1200" height="675" fill="none" stroke="#26304d" stroke-width="2"/>
  <text x="96" y="104" font-size="40" font-weight="bold" fill="#facc15">HAHA</text>
  <text x="310" y="100" font-size="22" fill="#8fa3c8">the crowd judges</text>
  <rect x="896" y="70" width="208" height="48" rx="24" fill="#1b2540"/>
  <text x="1000" y="101" font-size="24" fill="#9db2dc" text-anchor="middle">${esc(data.category)}</text>
  <rect x="96" y="150" width="${40 + badge.label.length * 26}" height="64" rx="32" fill="${badge.color}"/>
  <text x="120" y="196" font-size="34" font-weight="bold" fill="#0b1020">${esc(badge.label)}</text>
  ${body}
  ${moreWords ? `<text x="96" y="572" font-size="24" fill="#8fa3c8">… +${moreWords} more words</text>` : ""}
  <line x1="96" y1="584" x2="1104" y2="584" stroke="#26304d" stroke-width="2"/>
  <text x="96" y="622" font-size="26" fill="#c7d4ef">${esc(stats)}</text>
  <text x="1104" y="622" font-size="22" fill="#5d6f96" text-anchor="end">${esc(String(data.id).slice(-8))}</text>
</svg>`;

  return sharp(Buffer.from(svg, "utf8"), { density: 96 })
    .resize(1200, 675)
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/// R2 key + PUBLIC URL for a settled bit (deterministic — retrial overwrites).
/// R2_PUBLIC_URL is the public domain bound to the R2_BUCKET_NAME bucket.
function cardKey(bitId) {
  return `public/share/bit-${String(bitId).toLowerCase()}.png`;
}
function cardUrl(bitId) {
  const base = (process.env.R2_PUBLIC_URL ?? "").replace(/\/+$/, "");
  if (!base) return null;
  return base.startsWith("http") ? `${base}/${cardKey(bitId)}` : `https://${base}/${cardKey(bitId)}`;
}
async function ensureCardForBit(prisma, bitId, putR2) {
  const bit = await prisma.bit.findUnique({
    where: { id: bitId },
    include: { outcome: true },
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
  });
  await putR2(cardKey(bitId), png, "image/png");
  return { bitId, url: cardUrl(bitId), bytes: png.length };
}

module.exports = { renderShareCard, ensureCardForBit, cardKey, cardUrl };
