import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasFamilyAccess } from "@/lib/entitlements";
import { addGuest, listGuestsForChild, removeGuest } from "@/lib/wishlistGuests";
import { sendWishlistShareEmail } from "@/lib/email";
import { isManagedEmail } from "@/lib/managedProfile";

// 2026-10-09: adults share a child's wishlist with relatives (lib/wishlistGuests.ts).
// GET ?childId= → { guests } · POST { childId, email } · DELETE { id }
export const dynamic = "force-dynamic";
const ADULT = ["OWNER", "PARENT", "ADULT"];

async function adult() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized", status: 401 } as const;
  const m = await prisma.householdMember.findFirst({
    where: { userId: session.user.id },
    include: { household: { include: { familyTrial: true } }, user: { select: { name: true, email: true } } },
  });
  if (!m) return { error: "No household", status: 400 } as const;
  if (!ADULT.includes(m.role)) return { error: "Only adults can share a wishlist", status: 403 } as const;
  if (!hasFamilyAccess(m.household)) return { error: "Wishlists are part of Pro", status: 403 } as const;
  return { m } as const;
}

async function childInFamily(householdId: string, childId: unknown) {
  if (typeof childId !== "string") return false;
  return !!(await prisma.householdMember.findFirst({ where: { householdId, userId: childId } }));
}

export async function GET(req: Request) {
  const a = await adult();
  if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });
  const childId = new URL(req.url).searchParams.get("childId");
  if (!(await childInFamily(a.m.householdId, childId))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const guests = await listGuestsForChild(a.m.householdId, childId!);
  return NextResponse.json({ guests: guests.map((g) => ({ id: g.id, email: g.email, accepted: !!g.userId })) });
}

export async function POST(req: Request) {
  const a = await adult();
  if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200 || isManagedEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }
  if (!(await childInFamily(a.m.householdId, body?.childId))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // Someone already in this family doesn't need a guest invite.
  const inFamily = await prisma.householdMember.findFirst({ where: { householdId: a.m.householdId, user: { email } } });
  if (inFamily) return NextResponse.json({ error: "That person is already in your family." }, { status: 409 });
  const existing = await listGuestsForChild(a.m.householdId, body.childId);
  if (existing.length >= 20) return NextResponse.json({ error: "You can share with up to 20 people" }, { status: 400 });

  const { created } = await addGuest(a.m.householdId, body.childId, email, a.m.userId);
  const child = await prisma.user.findUnique({ where: { id: body.childId }, select: { name: true } });
  let emailSent = true;
  try {
    await sendWishlistShareEmail({ to: email, inviterName: a.m.user.name ?? a.m.user.email, childName: child?.name?.split(" ")[0] ?? "" });
  } catch (err) {
    console.error("Wishlist share email failed:", err);
    emailSent = false;
  }
  return NextResponse.json({ ok: true, created, emailSent }, { status: 201 });
}

export async function DELETE(req: Request) {
  const a = await adult();
  if ("error" in a) return NextResponse.json({ error: a.error }, { status: a.status });
  const body = await req.json().catch(() => null);
  if (typeof body?.id !== "string") return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  await removeGuest(a.m.householdId, body.id);
  return NextResponse.json({ ok: true });
}
