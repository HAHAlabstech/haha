import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { bad, getPrisma } from "@/lib/server";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 64 * 1024;
const PASS_RATIO = 0.8;

// GET /api/crowd/onboarding -> returns up to 10 calibration items from is_plant_bank
// (without exposing plant_correct_pos).
export async function GET() {
  try {
    const prisma = getPrisma();
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
      { items: bank },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return bad("onboarding unavailable", 503);
  }
}

// POST /api/crowd/onboarding {wallet, answers?: (number | "A" | "B")[], correct?: number, total?: number}
// Grades against the plant bank (is_plant_bank). Pass >= 8/10 equivalent
// (correct/total >= 0.8). Numeric answers map 0 -> "A", 1 (or non-zero) -> "B".
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
    const bank = await prisma.bit.findMany({
      where: { is_plant_bank: true },
      orderBy: { created_at: "asc" },
      take: 10,
      select: { id: true, plant_correct_pos: true },
    });

    let correct = 0;
    let total = bank.length;

    if (Array.isArray(b.answers) && bank.length > 0) {
      const answers = b.answers as unknown[];
      if (answers.length !== bank.length) {
        return bad(`expected ${bank.length} answers`, 400);
      }
      for (let i = 0; i < bank.length; i++) {
        const a = answers[i];
        let picked: "A" | "B";
        if (typeof a === "number") {
          picked = a === 0 ? "A" : "B";
        } else if (a === "A" || a === "B") {
          picked = a;
        } else {
          return bad("answers must be numbers (0/1) or 'A'/'B'", 400);
        }
        const expected = bank[i]?.plant_correct_pos ?? "A";
        if (picked === expected) correct++;
      }
    } else if (
      typeof b.correct === "number" &&
      typeof b.total === "number" &&
      b.total >= 10
    ) {
      correct = Math.max(0, Math.min(b.total, Math.floor(b.correct)));
      total = Math.floor(b.total);
    } else if (bank.length === 0) {
      return bad("onboarding bank empty", 503);
    } else {
      return bad("answers must be an array", 400);
    }

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
