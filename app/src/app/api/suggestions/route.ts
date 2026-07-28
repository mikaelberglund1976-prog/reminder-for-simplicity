import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Cross-customer feedback board — deliberately NOT household-scoped. Every
// logged-in user (any household, any role) sees the same shared list and can
// add/vote. See PRODUCT_SPEC.md 4b.18 and MARKET_RESEARCH_EU.md for why this
// is global rather than per-household, unlike every other family feature.

const ALLOWED_CATEGORIES = ["IMPROVEMENT", "NEW_FEATURE"] as const;
type Category = (typeof ALLOWED_CATEGORIES)[number];

// GET /api/suggestions?category=IMPROVEMENT|NEW_FEATURE (optional)
// Returns every suggestion with a vote count and whether the current user
// has voted, sorted by vote count desc then newest first. Open/Planned/
// In progress first, Done/Declined last, within that sort.
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const where = category && ALLOWED_CATEGORIES.includes(category as Category) ? { category: category as Category } : {};

    const suggestions = await prisma.suggestion.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } },
        votes: { select: { userId: true } },
      },
    });

    type Row = {
      id: string; title: string; description: string | null; category: string; status: string;
      createdAt: Date; userId: string; user: { id: string; name: string | null };
      votes: { userId: string }[];
    };
    const STATUS_ORDER: Record<string, number> = { OPEN: 0, PLANNED: 1, IN_PROGRESS: 2, DONE: 3, DECLINED: 4 };
    const shaped = (suggestions as Row[])
      .map((s) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        category: s.category,
        status: s.status,
        createdAt: s.createdAt,
        authorName: s.user.name ?? "A customer",
        isOwn: s.userId === session.user.id,
        voteCount: s.votes.length,
        hasVoted: s.votes.some((v) => v.userId === session.user.id),
      }))
      .sort((a, b) => {
        const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        if (statusDiff !== 0) return statusDiff;
        if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

    return NextResponse.json({ suggestions: shaped });
  } catch (err) {
    console.error("Suggestions GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/suggestions — body: { title, description?, category }
// Any logged-in customer can post — not gated by Pro/trial, since this is
// feedback infrastructure for the whole product, not a family feature.
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const { title, description, category } = body ?? {};
    if (!title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });
    if (title.trim().length > 140) return NextResponse.json({ error: "Title must be 140 characters or fewer" }, { status: 400 });
    const cat: Category = ALLOWED_CATEGORIES.includes(category) ? category : "NEW_FEATURE";

    const suggestion = await prisma.suggestion.create({
      data: {
        userId: session.user.id,
        title: title.trim(),
        description: description?.toString().trim() || null,
        category: cat,
      },
      include: { user: { select: { id: true, name: true } } },
    });

    // Author auto-votes for their own suggestion — matches every public
    // feedback board (Canny, GitHub reactions): posting an idea is an
    // implicit vote for it, and it makes the count non-zero immediately.
    await prisma.suggestionVote.create({ data: { suggestionId: suggestion.id, userId: session.user.id } });

    return NextResponse.json({
      id: suggestion.id,
      title: suggestion.title,
      description: suggestion.description,
      category: suggestion.category,
      status: suggestion.status,
      createdAt: suggestion.createdAt,
      authorName: suggestion.user.name ?? "A customer",
      isOwn: true,
      voteCount: 1,
      hasVoted: true,
    }, { status: 201 });
  } catch (err) {
    console.error("Suggestions POST error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Server error: ${message}` }, { status: 500 });
  }
}
