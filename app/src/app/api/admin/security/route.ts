import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/ads";
import { enableRlsEverywhere, getRlsStatus } from "@/lib/dbSecurity";

export const dynamic = "force-dynamic";

// 2026-11-02 (H-Reminder-21-001): Row Level Security status per table.
// GET — status. POST — turn RLS on everywhere now (the build and the daily
// cron do the same automatically).
export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  try {
    return NextResponse.json(await getRlsStatus());
  } catch (err) {
    console.error("RLS status error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function POST() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  try {
    const result = await enableRlsEverywhere();
    return NextResponse.json({ ...result, status: await getRlsStatus() });
  } catch (err) {
    console.error("Enable RLS error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
