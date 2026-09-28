import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { planDeletion, requestDeletion, softDeleteAccount, RESTORE_WINDOW_DAYS } from "@/lib/accountDeletion";

// 2026-09-27 — self-service account deletion.
// GET    → what will happen (confirm now / request approval / blocked) + pending state
// POST   → do it: soft-delete now, or send the request to the family admin
// DELETE → cancel a pending request
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { deletionRequestedAt: true } });
  const plan = await planDeletion(session.user.id);
  return NextResponse.json({
    pendingSince: user?.deletionRequestedAt ?? null,
    restoreDays: RESTORE_WINDOW_DAYS,
    mode: plan.mode,
    approverNames: plan.mode === "request" ? plan.approvers.map((a) => a.name ?? a.email) : [],
    promoteName: plan.mode === "confirm" ? plan.promoteName ?? null : null,
    blockedReason: plan.mode === "blocked" ? plan.reason : null,
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (body?.confirm !== true) return NextResponse.json({ error: "Confirmation required" }, { status: 400 });

  const plan = await planDeletion(session.user.id);
  if (plan.mode === "blocked") return NextResponse.json({ error: plan.reason }, { status: 409 });
  if (plan.mode === "request") {
    await requestDeletion(session.user.id, plan.approvers);
    return NextResponse.json({ status: "requested" });
  }
  await softDeleteAccount(session.user.id, session.user.id, plan.promoteUserId);
  return NextResponse.json({ status: "deleted" });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await prisma.user.update({ where: { id: session.user.id }, data: { deletionRequestedAt: null } });
  return NextResponse.json({ status: "cancelled" });
}
