import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasFamilyAccess } from "@/lib/entitlements";
import { ensureDefaultList, freeShoppingListId, listsVisibleTo, type HouseholdRoleStr } from "@/lib/lists";
import { resolveCategoryId } from "@/lib/shoppingCategories";
import { normalizeTime, setTime } from "@/lib/reminderTimes";
import { guessSubject } from "@/lib/schoolFeeds";
import {
  QUICK_LIMIT_PER_MONTH, QUICK_TYPES, countQuickUsage, matchList, parseLocally, parseWithAi,
  quickAiConfigured, quickUsage, toItems, type QuickItem, type QuickType,
} from "@/lib/quickAdd";

// 2026-10-11: the "just write it" row on Home (lib/quickAdd.ts).
// POST { text }            → { items, people, lists, ai } — a preview, nothing saved
// POST { action: "save", items } → { saved, shopping, other }
export const dynamic = "force-dynamic";
export const maxDuration = 30;
const ADULT = ["OWNER", "PARENT", "ADULT"];

async function ctx() {
  const session = await getServerSession(authOptions);
  const uid = session?.user?.id;
  if (!uid) return null;
  const m = await prisma.householdMember.findFirst({
    where: { userId: uid },
    include: { household: { include: { familyTrial: true, members: { include: { user: { select: { id: true, name: true, deletedAt: true } } } } } } },
  });
  if (!m) return null;
  const role = m.role as HouseholdRoleStr;
  await ensureDefaultList({ householdId: m.householdId, kind: "SHOPPING", createdBy: uid, name: "Shopping list" });
  const full = hasFamilyAccess(m.household);
  let lists = (await listsVisibleTo(m.householdId, "SHOPPING", uid, role)).map((l) => ({ id: l.id, name: l.name }));
  const freeId = await freeShoppingListId(m.householdId);
  if (!full) lists = lists.filter((l) => l.id === freeId);
  const people = m.household.members.filter((x) => !x.user.deletedAt).map((x) => ({ id: x.userId, name: x.user.name, role: x.role }));
  return { uid, m, isAdult: ADULT.includes(m.role), full, lists, defaultListId: freeId && lists.some((l) => l.id === freeId) ? freeId : lists[0]?.id ?? null, people };
}

const stockholmToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Stockholm", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

export async function POST(req: Request) {
  const c = await ctx();
  if (!c) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (body?.action === "save") return save(c, body);

  const text = typeof body?.text === "string" ? body.text.trim().slice(0, 500) : "";
  if (!text) return NextResponse.json({ error: "Write something first" }, { status: 400 });
  const base = { people: c.people.map((p) => ({ id: p.id, name: (p.name ?? "").split(" ")[0] })), lists: c.lists, full: c.full, isAdult: c.isAdult, me: c.uid };

  // Plain shopping words — no AI needed.
  let local = parseLocally(text);
  if (local?.listText && !matchList(local.listText, c.lists, null)) local = parseLocally(text, false);
  if (local) {
    const listId = matchList(local.listText, c.lists, c.defaultListId);
    const items: QuickItem[] = local.items.map((title) => ({ type: "SHOPPING", title, date: null, startTime: null, endTime: null, subject: null, whoText: null, listText: local!.listText, personId: null, listId }));
    return NextResponse.json({ ...base, items, ai: false });
  }

  if (!quickAiConfigured()) {
    // "2 liter mjölk" is still shopping.
    const plain = parseLocally(text, true, true);
    if (plain) {
      const listId = matchList(plain.listText, c.lists, c.defaultListId);
      return NextResponse.json({ ...base, ai: false, items: plain.items.map((title) => ({ type: "SHOPPING", title, date: null, startTime: null, endTime: null, subject: null, whoText: null, listText: plain.listText, personId: null, listId })) });
    }
    // Without the AI, anything that isn't plain shopping becomes a reminder for today, to adjust.
    const items: QuickItem[] = [{ type: "REMINDER", title: text.slice(0, 80), date: stockholmToday(), startTime: null, endTime: null, subject: null, whoText: null, listText: null, personId: null, listId: null }];
    return NextResponse.json({ ...base, items, ai: false });
  }
  if ((await quickUsage(c.m.householdId)) >= QUICK_LIMIT_PER_MONTH) {
    return NextResponse.json({ error: "You've used this month's quick adds — add it the usual way" }, { status: 429 });
  }
  try {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Stockholm", year: "numeric", month: "2-digit", day: "2-digit", weekday: "long" }).format(new Date());
    const raw = await parseWithAi(text, today);
    await countQuickUsage(c.m.householdId);
    let items = toItems(raw, c.people, c.lists, c.defaultListId, stockholmToday());
    // A child adds for themselves.
    if (!c.isAdult) items = items.map((i) => ({ ...i, personId: i.type === "SHOPPING" ? null : c.uid }));
    return NextResponse.json({ ...base, items, ai: true });
  } catch (err) {
    console.error("Quick add parse error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't understand that" }, { status: 502 });
  }
}

type Ctx = NonNullable<Awaited<ReturnType<typeof ctx>>>;

async function save(c: Ctx, body: { items?: unknown }) {
  const items = Array.isArray(body.items) ? body.items.slice(0, 20) : [];
  if (!items.length) return NextResponse.json({ error: "Nothing to add" }, { status: 400 });
  const memberIds = new Set(c.people.map((p) => p.id));
  const listIds = new Set(c.lists.map((l) => l.id));
  let shopping = 0, other = 0, locked = 0;

  for (const it of items as Record<string, unknown>[]) {
    const type: QuickType = (QUICK_TYPES as string[]).includes(String(it?.type)) ? (it.type as QuickType) : "REMINDER";
    const title = typeof it?.title === "string" ? it.title.trim().slice(0, 120) : "";
    if (!title) continue;

    if (type === "SHOPPING") {
      const listId = typeof it.listId === "string" && listIds.has(it.listId) ? it.listId : c.defaultListId;
      if (!listId) { locked++; continue; }
      const categoryId = await resolveCategoryId(c.m.householdId, title);
      await prisma.shoppingListItem.create({ data: { name: title, listId, householdId: c.m.householdId, addedBy: c.uid, categoryId } });
      shopping++;
      continue;
    }

    const date = typeof it.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(it.date) && !Number.isNaN(Date.parse(it.date)) ? it.date : stockholmToday();
    const day = new Date(date + "T10:00:00.000Z");
    const startTime = normalizeTime(it.startTime);
    let endTime = startTime ? normalizeTime(it.endTime) : null;
    if (startTime && endTime && endTime <= startTime) endTime = null;
    const requested = typeof it.personId === "string" && memberIds.has(it.personId) ? it.personId : null;
    const person = c.isAdult ? requested : c.uid;

    let id: string;
    if (type === "REMINDER") {
      const forOther = !!person && person !== c.uid;
      const r = await prisma.reminder.create({
        data: forOther
          ? { name: title, category: "OTHER", userId: c.uid, householdId: c.m.householdId, assignedTo: person, visibility: "HOUSEHOLD", recurrence: "ONCE", date: day, reminderDaysBefore: 1 }
          : { name: title, category: "OTHER", userId: c.uid, householdId: null, visibility: "PRIVATE", recurrence: "ONCE", date: day, reminderDaysBefore: 1 },
        select: { id: true },
      });
      id = r.id;
    } else {
      // School and activities are part of the family plan (Pro / trial).
      if (!c.full) { locked++; continue; }
      if (type === "ACTIVITY") {
        const r = await prisma.reminder.create({ data: { name: title, category: "TRAINING", userId: c.uid, householdId: c.m.householdId, assignedTo: person ?? c.uid, recurrence: "ONCE", date: day, visibility: "HOUSEHOLD", requiresApproval: false, reminderDaysBefore: 0 }, select: { id: true } });
        id = r.id;
      } else {
        const r = await prisma.reminder.create({
          data: {
            name: title, category: "SCHOOL", userId: c.uid, householdId: c.m.householdId, assignedTo: person ?? c.uid, recurrence: "ONCE", date: day,
            visibility: "HOUSEHOLD", requiresApproval: false, reminderDaysBefore: 1, showInCalendar: true,
            schoolKind: type === "TEST" ? "TEST" : type === "HOMEWORK" ? "HOMEWORK" : "OTHER",
            subject: guessSubject(typeof it.subject === "string" ? it.subject : null, title),
          },
          select: { id: true },
        });
        id = r.id;
        endTime = null;
      }
    }
    if (startTime) await setTime(id, { startTime, endTime });
    other++;
  }
  return NextResponse.json({ saved: shopping + other, shopping, other, locked });
}
