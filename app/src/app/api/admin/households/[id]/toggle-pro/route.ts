import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendProGrantedEmail } from "@/lib/email";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "mikaelberglund1976@gmail.com";

// POST /api/admin/households/[id]/toggle-pro
// 2026-09-28 body options:
//   { days: 30 }        → Pro until (today or current end, whichever is later) + 30 days
//   { forever: true }   → manual "Pro forever" flag (is_pro)
//   { off: true }       → remove Pro (clears both)
//   { adFreeDays: 365 } → ad-free (no ads, no Pro features) for N days
//   {}                  → legacy toggle of the forever flag
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const household = await prisma.household.findUnique({
      where: { id: params.id },
      include: { members: { where: { role: "OWNER" }, include: { user: { select: { email: true, name: true } } } } },
    });
    if (!household) return NextResponse.json({ error: "Not found" }, { status: 404 });

    let data: Record<string, unknown>;
    if (typeof body?.adFreeDays === "number" && body.adFreeDays > 0 && body.adFreeDays <= 3650) {
      // 2026-09-28: ad-free only (future cheaper add-on) — no Pro features.
      const now = new Date();
      const base = household.adFreeUntil && household.adFreeUntil > now ? household.adFreeUntil : now;
      const updatedAdFree = await prisma.household.update({ where: { id: params.id }, data: { adFreeUntil: new Date(base.getTime() + Math.round(body.adFreeDays) * 86400000) } });
      return NextResponse.json({ adFreeUntil: updatedAdFree.adFreeUntil });
    } else if (typeof body?.days === "number" && body.days > 0 && body.days <= 3650) {
      const now = new Date();
      const base = household.proUntil && household.proUntil > now ? household.proUntil : now;
      data = { proUntil: new Date(base.getTime() + Math.round(body.days) * 86400000), proSource: "admin", plan: "pro_manual", proRequestedAt: null };
    } else if (body?.forever === true) {
      data = { is_pro: true, proSource: "admin", plan: "pro_forever", proRequestedAt: null };
    } else if (body?.off === true) {
      data = { is_pro: false, proUntil: null, proSource: null, plan: null };
    } else {
      data = { is_pro: !household.is_pro };
    }

    const updated = await prisma.household.update({ where: { id: params.id }, data });

    const turnedOn = (!household.is_pro && updated.is_pro) || (updated.proUntil && (!household.proUntil || updated.proUntil > household.proUntil));
    if (turnedOn) {
      for (const m of household.members) {
        await sendProGrantedEmail({ to: m.user.email, name: m.user.name, until: updated.is_pro ? null : updated.proUntil })
          .catch((e) => console.error("Pro granted email failed:", e));
      }
    }

    return NextResponse.json({ is_pro: updated.is_pro, proUntil: updated.proUntil, proSource: updated.proSource });
  } catch (err) {
    console.error("Toggle pro error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
