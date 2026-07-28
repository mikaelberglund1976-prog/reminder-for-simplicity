import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// POST /api/suggestions/[id]/vote — toggles the current user's vote on a
// suggestion (upvote if not voted, remove vote if already voted). Same
// interaction pattern as Canny/GitHub reactions. Returns the new count so
// the UI can update optimistically without a full refetch.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const suggestion = await prisma.suggestion.findUnique({ where: { id: params.id } });
    if (!suggestion) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const existing = await prisma.suggestionVote.findUnique({
      where: { suggestionId_userId: { suggestionId: params.id, userId: session.user.id } },
    });

    if (existing) {
      await prisma.suggestionVote.delete({ where: { id: existing.id } });
    } else {
      await prisma.suggestionVote.create({ data: { suggestionId: params.id, userId: session.user.id } });
    }

    const voteCount = await prisma.suggestionVote.count({ where: { suggestionId: params.id } });
    return NextResponse.json({ hasVoted: !existing, voteCount });
  } catch (err) {
    console.error("Suggestion vote error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
