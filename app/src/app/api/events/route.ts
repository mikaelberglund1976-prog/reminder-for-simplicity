import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ANALYTICS_EVENTS, cleanProps, recordAnalyticsEvent } from "@/lib/analyticsStore";

// 2026-10-24: POST /api/events { event, props } — product analytics
// (lib/analytics.ts → lib/analyticsStore.ts). Signed-in only; the user id is
// used to tell child from adult and is not stored.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return new NextResponse(null, { status: 204 });
    const body = await req.json().catch(() => null);
    const event = body?.event;
    if (typeof event !== "string" || !(ANALYTICS_EVENTS as readonly string[]).includes(event)) {
      return NextResponse.json({ error: "Unknown event" }, { status: 400 });
    }
    const membership = await prisma.householdMember.findFirst({ where: { userId: session.user.id }, select: { role: true } });
    await recordAnalyticsEvent(event, cleanProps(body?.props), membership?.role === "CHILD");
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("analytics event failed", err);
    // Never surface analytics trouble to the app.
    return new NextResponse(null, { status: 204 });
  }
}
