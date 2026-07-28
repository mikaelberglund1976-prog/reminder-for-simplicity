import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { randomBytes } from "crypto";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const APP_URL = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function feedUrl(token: string): string {
  return `${APP_URL}/api/calendar/feed/${token}.ics`;
}

// GET /api/profile/calendar-feed — returns the user's feed URL, generating
// (but not rotating) a token on first request. Same lazy-generation pattern
// as List.shareToken.
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { calendarFeedToken: true } });
    let token = user?.calendarFeedToken;
    if (!token) {
      token = randomBytes(18).toString("base64url");
      await prisma.user.update({ where: { id: session.user.id }, data: { calendarFeedToken: token } });
    }
    return NextResponse.json({ url: feedUrl(token) });
  } catch (err) {
    console.error("Calendar feed GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/profile/calendar-feed — rotates the token, invalidating any
// previously-subscribed link (e.g. if it was shared with the wrong person).
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const token = randomBytes(18).toString("base64url");
    await prisma.user.update({ where: { id: session.user.id }, data: { calendarFeedToken: token } });
    return NextResponse.json({ url: feedUrl(token) });
  } catch (err) {
    console.error("Calendar feed POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
