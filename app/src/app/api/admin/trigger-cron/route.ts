import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "mikaelberglund1976@gmail.com";

// POST /api/admin/trigger-cron — manually trigger the reminder cron
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const appUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET not set" }, { status: 500 });
  }

  const response = await fetch(`${appUrl}/api/cron/send-reminders`, {
    method: "GET",
    headers: { Authorization: `Bearer ${cronSecret}` },
  });

  const data = await response.json();
  return NextResponse.json(data);
}
