import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendPushToUser } from "@/lib/webPush";
import { getLocaleForUser } from "@/lib/i18n/server";
import { getMessages } from "@/lib/i18n/messages";

// 2026-10-09: "Send a test notification" from Settings.
export async function POST() {
  const session = await getServerSession(authOptions);
  const uid = session?.user?.id;
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const m = getMessages(await getLocaleForUser(uid));
  const reached = await sendPushToUser(uid, { title: m.push.testTitle, body: m.push.testBody, url: "/profile", tag: "test" });
  return NextResponse.json({ ok: reached > 0, reached });
}
