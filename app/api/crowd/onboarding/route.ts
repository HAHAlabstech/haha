import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { bad, getPrisma, requireWalletSession } from "@/lib/server";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 64 * 1024;
const PASS_RATIO = 0.8;

// Calibration answer key — server-side only. The UI quiz (static cases in
// app/crowd/join/page.tsx) renders these same 10 items; grading here must
// match exactly what the user sees. Never ship this to the client bundle.
const CALIB_KEY: Array<"A" | "B"> = [
  "B", "B", "B", "B", "B", "B", "B", "A", "B", "B",
];


// GET /api/crowd/onboarding[?wallet=0x..] -> calibration items + (session-gated)
// status { onboarded, crowd_tier } so an already-passed juror skips the quiz.
export async function GET(req: Request) {
  try {
    const prisma = getPrisma();
    let status: { onboarded: boolean; crowd_tier: string | null } | null = null;
    const wallet = (new URL(req.url).searchParams.get("wallet") ?? "")
      .toLowerCase()
      .trim();
    if (/^0x[0-9a-f]{40}$/.test(wallet)) {
      const gate = await requireWalletSession(req, prisma, wallet).catch(
        () => ({ ok: false } as const),
      );
      if (gate.ok) {
        const u = await prisma.user.findUnique({
          where: { wallet },
          select: { onboarding_passed: true, crowd_tier: true },
        });
        status = u
          ? {
              onboarded: u.onboarding_passed === true,
              crowd_tier: u.crowd_tier ?? null,
            }
          : { onboarded: false, crowd_tier: null };
      }
    }
    const bank = await prisma.bit.findMany({
      where: { is_plant_bank: true },
      orderBy: { created_at: "asc" },
      take: 10,
      select: {
        id: true,
        category: true,
        scenario: true,
        question: true,
      },
    });
    return NextResponse.json(
      { items: bank, status },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return bad("onboarding unavailable", 503);
  }
}

// POST /api/crowd/onboarding {wallet, answers: (number | "A" | "B")[]}
// Grades against the server-side CALIB_KEY (matches the UI quiz cases).
// Session required; pass ratio 0.8. The forgeable correct/total path was removed.
export async function POST(req: Request) {
  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return bad("Failed to read request body", 400);
  }
  if (raw.length > MAX_BODY_BYTES) return bad("Request too large", 413);
  let body: unknown;
  try {
    body = JSON.parse(raw) as unknown;
  } catch {
    return bad("Invalid JSON", 400);
  }
  const b = body as Record<string, unknown>;
  const wallet = (
    typeof b.wallet === "string" ? b.wallet : ""
  ).toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(wallet)) return bad("invalid wallet", 400);

  try {
    const prisma = getPrisma();

    // Session must prove the wallet: the quiz result is keyed to a signed
    // account, not to a self-asserted body field.
    const gate = await requireWalletSession(req, prisma, wallet);
    if (!gate.ok) return gate.response;

    // Grade ONLY the per-item answers against the server-side key above.
    // The legacy correct/total self-report path is removed — it was forgeable.
    if (!Array.isArray(b.answers)) {
      return bad("answers must be an array", 400);
    }
    const answers = b.answers as unknown[];
    if (answers.length !== CALIB_KEY.length) {
      return bad(`expected ${CALIB_KEY.length} answers`, 400);
    }
    let correct = 0;
    for (let i = 0; i < CALIB_KEY.length; i++) {
      const a = answers[i];
      let picked: "A" | "B";
      if (typeof a === "number") {
        picked = a === 0 ? "A" : "B";
      } else if (a === "A" || a === "B") {
        picked = a;
      } else {
        return bad("answers must be numbers (0/1) or 'A'/'B'", 400);
      }
      if (picked === CALIB_KEY[i]) correct++;
    }
    const total = CALIB_KEY.length;

    const passed = total > 0 && correct / total >= PASS_RATIO;

    let user = await prisma.user.findUnique({
      where: { wallet },
      select: { id: true, onboarding_passed: true },
    });
    if (!user) {
      for (let attempt = 0; attempt < 3; attempt++) {
        const handle =
          attempt === 0
            ? `anon_${wallet.slice(2, 10)}`
            : `anon_${wallet.slice(2, 8)}${randomBytes(2).toString("hex")}`;
        try {
          user = await prisma.user.create({
            data: { wallet, handle },
            select: { id: true, onboarding_passed: true },
          });
          break;
        } catch (e) {
          const code =
            typeof e === "object" && e !== null && "code" in e
              ? (e as { code?: unknown }).code
              : undefined;
          if (code !== "P2002" || attempt === 2) throw e;
        }
      }
    }
    if (!user) return bad("user creation failed", 503);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        plant_total: { increment: total },
        plant_correct: { increment: correct },
        onboarding_passed: passed ? true : user.onboarding_passed,
      },
    });
    return NextResponse.json(
      { passed, correct, total },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return bad("onboarding unavailable", 503);
  }
}
