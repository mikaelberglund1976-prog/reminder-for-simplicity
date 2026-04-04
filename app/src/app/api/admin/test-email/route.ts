import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendReminderEmail } from "@/lib/email";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "mikaelberglund1976@gmail.com";

// POST /api/admin/test-email — send a test reminder email to the admin
export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  await sendReminderEmail({
    to: session.user.email,
    name: session.user.name ?? "Mikael",
    reminderName: "Netflix (test reminder)",
    date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
    amount: 149,
    currency: "SEK",
    note: "This is a test email from the admin panel.",
    reminderId: "test-id",
  });

  return NextResponse.json({ success: true });
}
