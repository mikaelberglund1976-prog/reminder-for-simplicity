import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { runReminderCron } from "@/lib/cron";

// Constant-time comparison (2026-08-02, security review — see OPERATIONS.md
// §8). The previous `!==` check leaked a timing signal proportional to how
// many leading characters matched, which in theory lets an attacker recover
// CRON_SECRET byte-by-byte. timingSafeEqual requires equal-length buffers,
// so a length mismatch (including "no CRON_SECRET configured") is handled
// as a plain false rather than throwing.
function isAuthorized(authHeader: string | null): boolean {
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  const provided = authHeader ?? "";
  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(provided);
  if (expectedBuf.length !== providedBuf.length) return false;
  return timingSafeEqual(expectedBuf, providedBuf);
}

export async function GET(req: Request) {
  if (!isAuthorized(req.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const result = await runReminderCron();
  return NextResponse.json(result);
}
