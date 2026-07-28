import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { randomBytes } from "crypto";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { userCanAccessList, getListMemberIds, type HouseholdRoleStr } from "@/lib/lists";

const APP_URL = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function shareUrl(token: string) {
  return `${APP_URL}/shop/${token}`;
}

async function accessibleList(userId: string, listId: string) {
  const membership = await prisma.householdMember.findFirst({ where: { userId } });
  if (!membership) return null;
  const list = await prisma.list.findUnique({ where: { id: listId } });
  if (!list || list.householdId !== membership.householdId || list.kind !== "SHOPPING") return null;
  const memberIds = await getListMemberIds(list.id);
  if (!userCanAccessList(list, userId, membership.role as HouseholdRoleStr, memberIds)) return null;
  return list;
}

// GET /api/family/lists/[id]/share — current share status for this list.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const list = await accessibleList(session.user.id, params.id);
    if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return NextResponse.json({ enabled: !!list.shareToken, url: list.shareToken ? shareUrl(list.shareToken) : null });
  } catch (err) {
    console.error("List share GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/family/lists/[id]/share — turn sharing on (idempotent) and
// return the link. Anyone who can see the list can do this — it's a
// convenience for the household, not an admin-only action.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const list = await accessibleList(session.user.id, params.id);
    if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });

    let token = list.shareToken;
    if (!token) {
      token = randomBytes(18).toString("base64url");
      await prisma.list.update({ where: { id: params.id }, data: { shareToken: token } });
    }

    return NextResponse.json({ enabled: true, url: shareUrl(token) });
  } catch (err) {
    console.error("List share POST error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/family/lists/[id]/share — revoke the current link.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const list = await accessibleList(session.user.id, params.id);
    if (!list) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.list.update({ where: { id: params.id }, data: { shareToken: null } });
    return NextResponse.json({ enabled: false, url: null });
  } catch (err) {
    console.error("List share DELETE error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
