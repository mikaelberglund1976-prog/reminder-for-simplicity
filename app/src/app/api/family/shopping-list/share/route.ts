import { NextResponse } from "next/server";

// Deprecated 2026-07-27: sharing moved from one link per household to one
// link per shopping list (a household can have several now). Use
// /api/family/lists/[id]/share instead. Kept as a stub — rather than
// deleting the route file — because this sandbox can't unlink files on the
// synced project mount; the file has no callers left in the app.
export async function GET() {
  return NextResponse.json({ error: "Moved to /api/family/lists/[id]/share" }, { status: 410 });
}
export async function POST() {
  return NextResponse.json({ error: "Moved to /api/family/lists/[id]/share" }, { status: 410 });
}
export async function DELETE() {
  return NextResponse.json({ error: "Moved to /api/family/lists/[id]/share" }, { status: 410 });
}
