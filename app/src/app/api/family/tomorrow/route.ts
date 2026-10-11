import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLocaleForUser } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/messages";
import { addCustomCheck, buildPlan, removeCustomCheck, setCheck, setRide, tomorrowYmd } from "@/lib/tomorrowPlan";
import { sendPushToUser } from "@/lib/webPush";

// 2026-10-11: the "Tomorrow" card on Home (lib/tomorrowPlan.ts).
// GET  → Plan for tomorrow (Stockholm).
// POST { action: "check", key, label, checked } — tick something to bring
//      { action: "add", label }                 — add your own thing to bring
//      { action: "remove", key }                — remove one you added
//      { action: "ride", reminderId, take }     — "I'll take it" / undo (adults)
export const dynamic = "force-dynamic";
const ADULT = ["OWNER", "PARENT", "ADULT"];

async function ctx() {
  const session = await getServerSession(authOptions);
  const uid = session?.user?.id;
  if (!uid) return null;
  const m = await prisma.householdMember.findFirst({ where: { userId: uid }, include: { user: { select: { name: true } } } });
  if (!m) return null;
  const locale = await getLocaleForUser(uid);
  return { uid, m, t: getMessages(locale).assist };
}

export async function GET() {
  const c = await ctx();
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await buildPlan(c.uid, c.t));
  } catch (err) {
    console.error("Tomorrow plan GET error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const c = await ctx();
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const ymd = tomorrowYmd();
  const label = typeof body?.label === "string" ? body.label.trim().slice(0, 60) : "";
  const key = typeof body?.key === "string" ? body.key.slice(0, 120) : "";
  try {
    switch (body?.action) {
      case "check":
        if (!key || !label) break;
        await setCheck(c.m.householdId, ymd, key, label, !!body.checked, c.uid);
        return NextResponse.json({ ok: true });
      case "add":
        if (!label) break;
        return NextResponse.json({ ok: true, key: await addCustomCheck(c.m.householdId, ymd, label, c.uid) });
      case "remove":
        if (!key) break;
        await removeCustomCheck(c.m.householdId, ymd, key);
        return NextResponse.json({ ok: true });
      case "ride": {
        if (!ADULT.includes(c.m.role)) return NextResponse.json({ error: "Only an adult can take a ride" }, { status: 403 });
        const reminderId = typeof body?.reminderId === "string" ? body.reminderId : "";
        const r = await prisma.reminder.findFirst({ where: { id: reminderId, householdId: c.m.householdId, category: "TRAINING", isActive: true }, select: { id: true, name: true, assignedTo: true } });
        if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });
        await setRide(c.m.householdId, r.id, ymd, body.take ? c.uid : null);
        if (body.take) {
          // Tell the other adults — that's the whole point of "I'll take it".
          const plan = await buildPlan(c.uid, c.t);
          const item = plan?.items.find((i) => i.reminderId === r.id);
          const others = await prisma.householdMember.findMany({ where: { householdId: c.m.householdId, role: { in: ["OWNER", "PARENT", "ADULT"] }, userId: { not: c.uid } }, select: { userId: true } });
          const me = (c.m.user.name ?? "").split(" ")[0] || "?";
          for (const o of others) {
            const t = getMessages(await getLocaleForUser(o.userId)).assist;
            await sendPushToUser(o.userId, { title: t.ridePushTitle, body: t.ridePushBody(me, item?.who ?? "", r.name, item?.startTime ?? null), url: "/dashboard#tomorrow", tag: `ride-${r.id}-${ymd}` }, "tomorrow");
          }
        }
        return NextResponse.json({ ok: true });
      }
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (err) {
    console.error("Tomorrow plan POST error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
