import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendAccountApprovedEmail } from "@/lib/email";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "mikaelberglund1976@gmail.com";

// PATCH /api/admin/users/[id] — approve a pending signup
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  if (body.action !== "approve") {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    data: { approved: true, approvedAt: new Date() },
  });

  sendAccountApprovedEmail({ to: user.email, name: user.name }).catch(console.error);

  return NextResponse.json({ success: true, user: { id: user.id, approved: user.approved } });
}

// DELETE /api/admin/users/[id] — permanently delete a user and all their data
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  // Safety: don't allow admin to delete themselves
  if (params.id === session.user.id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  await prisma.user.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
