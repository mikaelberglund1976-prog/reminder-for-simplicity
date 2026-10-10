import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasFamilyAccess } from "@/lib/entitlements";
import { INTAKE_LIMIT_PER_MONTH, MAX_BYTES, countUsage, intakeConfigured, readDocument, toSuggestions, usageThisMonth } from "@/lib/intake";

// 2026-10-10: AI intake (lib/intake.ts). Adults in a Pro/trial family.
// GET → { configured, available, used, limit }
// POST { file: "data:image/jpeg;base64,…" | "data:application/pdf;base64,…" }
//   → { suggestions, children } — nothing is saved here; see /api/intake/save.
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const ADULT = ["OWNER", "PARENT", "ADULT"];
const TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"];

async function adult() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const m = await prisma.householdMember.findFirst({
    where: { userId: session.user.id },
    include: { household: { include: { familyTrial: true, members: { where: { role: "CHILD" }, include: { user: { select: { id: true, name: true, deletedAt: true } } } } } } },
  });
  return m;
}

export async function GET() {
  const m = await adult();
  if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const available = ADULT.includes(m.role) && hasFamilyAccess(m.household);
  return NextResponse.json({
    configured: intakeConfigured(),
    isAdult: ADULT.includes(m.role),
    available,
    used: available ? await usageThisMonth(m.householdId).catch(() => 0) : 0,
    limit: INTAKE_LIMIT_PER_MONTH,
  });
}

export async function POST(req: Request) {
  const m = await adult();
  if (!m) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!ADULT.includes(m.role)) return NextResponse.json({ error: "Only adults can scan documents" }, { status: 403 });
  if (!hasFamilyAccess(m.household)) return NextResponse.json({ error: "Scanning is part of Pro", upgrade: true }, { status: 403 });
  if (!intakeConfigured()) return NextResponse.json({ error: "Scanning isn't switched on yet" }, { status: 503 });
  if ((await usageThisMonth(m.householdId)) >= INTAKE_LIMIT_PER_MONTH) {
    return NextResponse.json({ error: "You've reached this month's scans" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const match = typeof body?.file === "string" ? /^data:([a-z]+\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/.exec(body.file) : null;
  if (!match || !TYPES.includes(match[1])) return NextResponse.json({ error: "Pick a photo or a PDF" }, { status: 400 });
  if (match[2].length * 0.75 > MAX_BYTES) return NextResponse.json({ error: "The file is too big — max about 3 MB" }, { status: 413 });

  try {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Stockholm", year: "numeric", month: "2-digit", day: "2-digit", weekday: "long" }).format(new Date());
    const raw = await readDocument({ mediaType: match[1], data: match[2] }, today);
    await countUsage(m.householdId);
    const children = m.household.members.filter((c) => !c.user.deletedAt).map((c) => ({ id: c.user.id, name: c.user.name }));
    return NextResponse.json({ suggestions: toSuggestions(raw, children), children });
  } catch (err) {
    console.error("Intake POST error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't read the document. Try a sharper photo." }, { status: 502 });
  }
}
