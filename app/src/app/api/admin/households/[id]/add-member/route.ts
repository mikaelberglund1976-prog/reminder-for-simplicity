import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "mikaelberglund1976@gmail.com";

// POST /api/admin/households/[id]/add-member — add a user by email directly
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const household = await prisma.household.findUnique({ where: { id: params.id } });
    if (!household) return NextResponse.json({ error: "Household not found" }, { status: 404 });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ error: `No account found for ${email}` }, { status: 404 });

    // Remove from any existing household first
    await prisma.householdMember.deleteMany({ where: { userId: user.id } });

    // Add to this household
    await prisma.householdMember.create({
      data: { householdId: params.id, userId: user.id, role: "MEMBER" },
    });

    return NextResponse.json({ success: true, userName: user.name ?? user.email });
  } catch (err) {
    console.error("Admin add-member error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
