import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { restoreAccount, purgeAccount } from "@/lib/accountDeletion";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "mikaelberglund1976@gmail.com";

// POST /api/admin/deleted-users/[id] { action: "restore" | "purge" } — 2026-09-27
// restore → undo a soft delete within the 60-day window (puts the person back
//           in their family if it still exists)
// purge   → remove permanently now instead of waiting for the 60 days
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  const body = await req.json().catch(() => ({}));
  try {
    if (body?.action === "restore") { await restoreAccount(params.id); return NextResponse.json({ status: "restored" }); }
    if (body?.action === "purge") { await purgeAccount(params.id); return NextResponse.json({ status: "purged" }); }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("Admin deleted-users error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 500 });
  }
}
