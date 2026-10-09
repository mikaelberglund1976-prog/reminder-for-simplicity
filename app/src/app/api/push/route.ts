import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getPushKinds, PUSH_KINDS, pushConfigured, removeSubscription, saveSubscription, setPushKinds, subscriptionCount, vapidPublicKey, type PushKind } from "@/lib/webPush";

// 2026-10-09: web push settings for the signed-in person.
// GET → { configured, publicKey, devices, kinds }
// POST { subscription } → register this device · DELETE { endpoint } → remove it
// PUT { kinds: ["reminders","tomorrow"] } → what to be pinged about
export const dynamic = "force-dynamic";

async function userId() {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

export async function GET() {
  const uid = await userId();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!pushConfigured()) return NextResponse.json({ configured: false, publicKey: null, devices: 0, kinds: PUSH_KINDS });
  try {
    const [devices, kinds] = await Promise.all([subscriptionCount(uid), getPushKinds(uid)]);
    return NextResponse.json({ configured: true, publicKey: vapidPublicKey(), devices, kinds });
  } catch (err) {
    console.error("Push GET error:", err);
    return NextResponse.json({ error: "Couldn't load notification settings" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const uid = await userId();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const sub = body?.subscription;
  const endpoint = typeof sub?.endpoint === "string" ? sub.endpoint : "";
  const p256dh = sub?.keys?.p256dh, auth = sub?.keys?.auth;
  if (!/^https:\/\//.test(endpoint) || endpoint.length > 1000 || typeof p256dh !== "string" || typeof auth !== "string" || p256dh.length > 200 || auth.length > 100) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }
  try {
    await saveSubscription(uid, { endpoint, keys: { p256dh, auth } }, req.headers.get("user-agent")?.slice(0, 300) ?? null);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Push POST error:", err);
    return NextResponse.json({ error: "Couldn't save notification settings" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const uid = await userId();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (typeof body?.endpoint !== "string") return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  await removeSubscription(uid, body.endpoint).catch((e) => console.error("Push DELETE error:", e));
  return NextResponse.json({ ok: true });
}

export async function PUT(req: Request) {
  const uid = await userId();
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const kinds = Array.isArray(body?.kinds) ? (body.kinds.filter((k: unknown) => (PUSH_KINDS as string[]).includes(String(k))) as PushKind[]) : null;
  if (!kinds) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  try {
    await setPushKinds(uid, kinds);
    return NextResponse.json({ ok: true, kinds });
  } catch (err) {
    console.error("Push PUT error:", err);
    return NextResponse.json({ error: "Couldn't save notification settings" }, { status: 500 });
  }
}
