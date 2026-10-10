import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasFamilyAccess } from "@/lib/entitlements";

export const ADULT_ROLES = ["OWNER", "PARENT", "ADULT"];

// 2026-10-03: only an adult in the family manages school links (SchoolSoft, Studybee).
export async function requireAdult() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Unauthorized", status: 401 } as const;
  const membership = await prisma.householdMember.findFirst({
    where: { userId: session.user.id },
    include: { household: { include: { familyTrial: true } } },
  });
  if (!membership) return { error: "No family", status: 400 } as const;
  if (!ADULT_ROLES.includes(membership.role)) return { error: "Only an adult can manage calendar links", status: 403 } as const;
  if (!hasFamilyAccess(membership.household)) return { error: "Homework & tests are part of Pro", status: 403 } as const;
  return { userId: session.user.id, householdId: membership.householdId } as const;
}

export async function childInFamily(householdId: string, childId: string) {
  return prisma.householdMember.findFirst({ where: { householdId, userId: childId, role: "CHILD" }, include: { user: { select: { name: true } } } });
}
