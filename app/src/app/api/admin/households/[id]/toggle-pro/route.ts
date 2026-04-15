import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "mikaelberglund1976@gmail.com";

export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email || session.user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const household = await prisma.household.findUnique({ where: { id: params.id } });
    if (!household) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updated = await prisma.household.update({
      where: { id: params.id },
      data: { is_pro: !household.is_pro },
    });

    return NextResponse.json({ is_pro: updated.is_pro });
  } catch (err) {
    console.error("Toggle pro error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
