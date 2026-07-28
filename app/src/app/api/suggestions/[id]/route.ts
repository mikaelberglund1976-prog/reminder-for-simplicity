import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ADMIN_EMAIL } from "@/lib/adminConfig";

const ALLOWED_STATUSES = ["OPEN", "PLANNED", "IN_PROGRESS", "DONE", "DECLINED"] as const;

// PATCH /api/suggestions/[id]
// - Admin (ADMIN_EMAIL) can change `status` — this is the triage/roadmap step.
// - The author can edit `title`/`description` while status is still OPEN
//   (once it's PLANNED/IN_PROGRESS/etc. the wording shouldn't shift under
//   people who already voted on it).
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const suggestion = await prisma.suggestion.findUnique({ where: { id: params.id } });
    if (!suggestion) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const body = await req.json().catch(() => ({}));
    const isAdmin = session.user.email === ADMIN_EMAIL;
    const isAuthor = suggestion.userId === session.user.id;

    const data: { status?: (typeof ALLOWED_STATUSES)[number]; title?: string; description?: string | null } = {};

    if (body.status !== undefined) {
      if (!isAdmin) return NextResponse.json({ error: "Only an admin can change status" }, { status: 403 });
      if (!ALLOWED_STATUSES.includes(body.status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      data.status = body.status;
    }

    if (body.title !== undefined || body.description !== undefined) {
      if (!isAuthor && !isAdmin) return NextResponse.json({ error: "Only the author can edit this" }, { status: 403 });
      if (!isAdmin && suggestion.status !== "OPEN") {
        return NextResponse.json({ error: "This idea is already being triaged and can no longer be edited" }, { status: 403 });
      }
      if (body.title !== undefined) {
        if (!body.title?.trim()) return NextResponse.json({ error: "Title required" }, { status: 400 });
        data.title = body.title.trim();
      }
      if (body.description !== undefined) data.description = body.description?.toString().trim() || null;
    }

    if (Object.keys(data).length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

    const updated = await prisma.suggestion.update({ where: { id: params.id }, data });
    return NextResponse.json({ id: updated.id, title: updated.title, description: updated.description, category: updated.category, status: updated.status });
  } catch (err) {
    console.error("Suggestion PATCH error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/suggestions/[id] — author (only while OPEN) or admin, any time.
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const suggestion = await prisma.suggestion.findUnique({ where: { id: params.id } });
    if (!suggestion) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const isAdmin = session.user.email === ADMIN_EMAIL;
    const isAuthor = suggestion.userId === session.user.id;
    if (!isAdmin && !(isAuthor && suggestion.status === "OPEN")) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }

    await prisma.suggestion.delete({ where: { id: params.id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Suggestion DELETE error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
