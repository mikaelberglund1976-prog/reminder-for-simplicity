import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { EMAIL_KINDS, getEmailKinds, setEmailKinds, type EmailKind } from "@/lib/notifyPrefs";

// 2026-10-22: which emails the signed-in person gets (children choose too).
// GET → { email: [...] } · PUT { email: [...] }
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ email: await getEmailKinds(session.user.id) });
  } catch (err) {
    console.error("Notify prefs GET error:", err);
    return NextResponse.json({ email: EMAIL_KINDS });
  }
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const email = Array.isArray(body?.email) ? (body.email.filter((k: unknown) => (EMAIL_KINDS as string[]).includes(String(k))) as EmailKind[]) : null;
  if (!email) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  try {
    await setEmailKinds(session.user.id, email);
    return NextResponse.json({ ok: true, email });
  } catch (err) {
    console.error("Notify prefs PUT error:", err);
    return NextResponse.json({ error: "Couldn't save notification settings" }, { status: 500 });
  }
}
