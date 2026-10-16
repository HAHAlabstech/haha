import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 64 * 1024;
const PASS_RATIO = 0.8;

function getPrisma(): PrismaClient {
  const g = globalThis as unknown as { __hahaPrisma?: PrismaClient };
  g.__hahaPrisma ??= new PrismaClient();
  return g.__hahaPrisma;
}

function bad(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

// POST /api/crowd/onboarding {wallet, answers: number[]}
// Grades against the plant bank (is_plant_bank). Pass >= 8/10 equivalent
// (correct/total >= 0.8). Answers map 0 -> "A", any other number -> "B".
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
  if (!Array.isArray(b.answers)) return bad("answers must be an array", 400);
  const answers = b.answers as unknown[];

  try {
    const prisma = getPrisma();
    const bank = await prisma.bit.findMany({
      where: { is_plant_bank: true },
      orderBy: { created_at: "asc" },
      take: 10,
      select: { id: true, plant_correct_pos: true },
    });
    if (bank.length === 0) {
      return bad("onboarding bank empty", 503);
    }
    if (answers.length !== bank.length) {
      return bad(`expected ${bank.length} answers`, 400);
    }
    let correct = 0;
    for (let i = 0; i < bank.length; i++) {
      const a = answers[i];
      if (typeof a !== "number") return bad("answers must be numbers", 400);
      const picked = a === 1 ? "B" : "A";
      const expected = bank[i]?.plant_correct_pos ?? "A";
      if (picked === expected) correct++;
    }
    const passed = correct / bank.length >= PASS_RATIO;

    let user = await prisma.user.findUnique({
      where: { wallet },
      select: { id: true, onboarding_passed: true },
    });
    if (!user) {
      user = await prisma.user.create({
        data: { wallet, handle: `anon_${wallet.slice(2, 10)}` },
        select: { id: true, onboarding_passed: true },
      });
    }
    await prisma.user.update({
      where: { id: user.id },
      data: {
        plant_total: { increment: bank.length },
        plant_correct: { increment: correct },
        onboarding_passed: passed ? true : user.onboarding_passed,
      },
    });
    return NextResponse.json(
      { passed, correct, total: bank.length },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return bad("onboarding unavailable", 503);
  }
}
