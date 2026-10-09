import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { normalizeHomePrefs } from "@/lib/homePrefs";
import { getHomePrefs, saveHomePrefs } from "@/lib/homePrefsStore";

export const dynamic = "force-dynamic";

// GET /api/profile/home-prefs — what this person's Home shows (defaults when never set).
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ prefs: await getHomePrefs(session.user.id) });
}

// PUT /api/profile/home-prefs { prefs } — saves the whole set.
export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const prefs = normalizeHomePrefs(body?.prefs);
  try {
    await saveHomePrefs(session.user.id, prefs);
    return NextResponse.json({ prefs });
  } catch (err) {
    console.error("home-prefs PUT error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
