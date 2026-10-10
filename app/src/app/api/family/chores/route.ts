import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasPro } from "@/lib/entitlements";
import { importSources } from "@/lib/schoolFeeds";
import { activityImportInfo } from "@/lib/activityFeeds";
import { withTimes, timesFromBody, setTime } from "@/lib/reminderTimes";

// 2026-08-18: MEMBER included too — a chore/activity/school item can be
// created by any household member, not just an OWNER/PARENT/ADULT (Mikael:
// "chores kan ju utföras av en familjemedlem, måste inte vara barn").
const ADULT_ROLES = ["OWNER", "PARENT", "ADULT", "MEMBER"];

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = (day === 0 ? -6 : 1 - day);
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

const BOOKING_CATEGORIES = ["CHORE", "TRAINING", "SCHOOL"] as const;
type BookingCategory = (typeof BOOKING_CATEGORIES)[number];

// GET /api/family/chores?category=CHORE|TRAINING|SCHOOL (default CHORE)
// Same endpoint now serves chores, training bookings ("Karate, Tuesdays")
// and school items (tests/homework) — they share every field (assignedTo,
// recurrence, choreRecurrenceDays) and only differ in whether
// completion/approval applies. Deliberately its own category/section (not
// routed through the general /api/reminders) so it gets the same
// child-only-sees-their-own filtering as Chores/Training, see the isChild
// check below. See PRODUCT_SPEC.md 4b.19/4b.20.
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const categoryParam = searchParams.get("category");
    const category: BookingCategory = BOOKING_CATEGORIES.includes(categoryParam as BookingCategory)
      ? (categoryParam as BookingCategory)
      : "CHORE";

    const membership = await prisma.householdMember.findFirst({
      where: { userId: session.user.id },
      include: {
        household: {
          include: {
            familyTrial: true,
            members: { include: { user: { select: { id: true, name: true, email: true } } } },
          },
        },
      },
    });

    if (!membership) return NextResponse.json({ chores: [], access: "NO_HOUSEHOLD" });

    const { household } = membership;
    const isPro = hasPro(household);
    const trial = household.familyTrial;
    const now = new Date();
    const trialActive = trial ? trial.expiresAt > now : false;

    if (!isPro && !trialActive) {
      return NextResponse.json({ chores: [], access: "LOCKED" });
    }

    const weekStart = getWeekStart(now);
    const isChild = membership.role === "CHILD";
    const whereFilter: Record<string, unknown> = {
      householdId: membership.householdId,
      category,
      isActive: true,
    };
    if (isChild) {
      whereFilter.assignedTo = session.user.id;
    }

    const rawChores = await prisma.reminder.findMany({
      where: whereFilter,
      include: {
        completions: { where: { weekStart } },
        assignedUser: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
    });
    // 2026-10-07: time of day (activities/school), see lib/reminderTimes.ts.
    const chores = await withTimes(rawChores);

    // 2026-10-03: mark items that came from a school link; 2026-10-10: + which
    // platform ("SchoolSoft", "Studybee") for the badge.
    if (category === "SCHOOL") {
      const src = await importSources(chores.map((c) => c.id));
      return NextResponse.json({ chores: chores.map((c) => ({ ...c, imported: src.has(c.id), source: src.get(c.id) ?? null })), weekStart, access: isPro ? "PRO" : "TRIAL" });
    }
    // 2026-10-09: mark activities that came from a calendar link (+ its name).
    if (category === "TRAINING") {
      const info = await activityImportInfo(chores.map((c) => c.id));
      return NextResponse.json({ chores: chores.map((c) => ({ ...c, imported: info.has(c.id), source: info.get(c.id) ?? null })), weekStart, access: isPro ? "PRO" : "TRIAL" });
    }
    return NextResponse.json({ chores, weekStart, access: isPro ? "PRO" : "TRIAL" });
  } catch (err) {
    console.error("Chore GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/family/chores
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const membership = await prisma.householdMember.findFirst({
      where: { userId: session.user.id },
      include: { household: { include: { familyTrial: true } } },
    });

    if (!membership) return NextResponse.json({ error: "No household" }, { status: 400 });

    const isChild = membership.role === "CHILD";
    const isAdult = ADULT_ROLES.includes(membership.role);

    if (!isChild && !isAdult) {
      return NextResponse.json({ error: "Not allowed" }, { status: 403 });
    }

    const isPro = hasPro(membership.household);
    const trial = membership.household.familyTrial;
    const now = new Date();
    const trialActive = trial ? trial.expiresAt > now : false;
    if (!isPro && !trialActive) {
      return NextResponse.json({ error: "Trial or Pro required" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { name, assignedTo, assignees, recurrence, recurrenceDays, startDate, requiresApproval, note, category: rawCategory, schoolKind: rawSchoolKind, subject, showInCalendar } = body ?? {};
    const category: BookingCategory = BOOKING_CATEGORIES.includes(rawCategory) ? rawCategory : "CHORE";

    if (!name?.trim()) return NextResponse.json({ error: "Name required" }, { status: 400 });

    // Children can only create chores for themselves (auto self-assign, ignore any assignedTo in body)
    // 2026-09-28 (test round, row 46): an adult can pick several people at
    // once (e.g. both parents for a parents' meeting) — each person gets
    // their own copy, so it lands in everyone's calendar and feed and can be
    // ticked off / removed per person.
    let targets: string[];
    if (isChild) {
      targets = [session.user.id];
    } else {
      const requested: string[] = Array.isArray(assignees)
        ? assignees.filter((v: unknown): v is string => typeof v === "string")
        : assignedTo ? [assignedTo] : [];
      if (requested.length === 0) return NextResponse.json({ error: "assignedTo required" }, { status: 400 });
      const valid = await prisma.householdMember.findMany({
        where: { householdId: membership.householdId, userId: { in: requested } },
        select: { userId: true },
      });
      const validIds = new Set(valid.map((v) => v.userId));
      targets = Array.from(new Set(requested)).filter((id) => validIds.has(id)).slice(0, 12);
      if (targets.length === 0) return NextResponse.json({ error: "Pick someone in your family" }, { status: 400 });
    }

    // 2026-09-27: School items are one-off (a test/homework has a date, it
    // doesn't repeat) with a type + subject, and get an email the day before.
    const isSchool = category === "SCHOOL";
    const schoolKind = isSchool
      ? (["HOMEWORK", "TEST", "OTHER"].includes(rawSchoolKind) ? rawSchoolKind : "HOMEWORK")
      : null;

    // 2026-10-07: optional time of day — activities (start–end) and school
    // items (start). Chores are "some time today" and have no time.
    const time = category === "CHORE" ? undefined : timesFromBody(body);
    if (time && category === "SCHOOL") time.endTime = null;

    const created = [];
    for (const finalAssignedTo of targets) {
    const chore = await prisma.reminder.create({
      data: {
        name: name.trim(),
        category,
        userId: session.user.id,
        householdId: membership.householdId,
        assignedTo: finalAssignedTo,
        recurrence: isSchool ? "ONCE" : (recurrence ?? "WEEKLY"),
        choreRecurrenceDays: recurrenceDays ?? null,
        date: startDate ? new Date(startDate) : new Date(),
        visibility: "HOUSEHOLD",
        // Approval/completion tracking is a CHORE-only concept — a training
        // booking (e.g. "Karate, Tuesdays") or a school item (test/homework)
        // is just a scheduled thing, nobody "approves" it. Children can't
        // bypass approval on their own chores, but that rule doesn't apply
        // to TRAINING/SCHOOL at all — a child logging their own test date
        // doesn't need a parent to sign off on it.
        requiresApproval: category === "CHORE" ? (isChild ? true : !!requiresApproval) : false,
        note: note ?? null,
        ...(isSchool
          ? {
              schoolKind,
              subject: typeof subject === "string" && subject.trim() ? subject.trim().slice(0, 60) : null,
              showInCalendar: showInCalendar !== false,
              reminderDaysBefore: 1,
            }
          : {}),
      },
      include: { assignedUser: { select: { id: true, name: true } } },
    });
    if (time?.startTime) await setTime(chore.id, time);
    created.push({ ...chore, startTime: time?.startTime ?? null, endTime: time?.endTime ?? null });
    }

    // Single target → the item itself (unchanged response shape); several →
    // the first one plus `created` with all of them.
    return NextResponse.json(created.length === 1 ? created[0] : { ...created[0], created }, { status: 201 });
  } catch (err) {
    console.error("Chore POST error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Server error: ${message}` }, { status: 500 });
  }
}
