// 2026-10-22: the timetable from the school links (Mikael: "första lektion
// imorgon … sen ska man kunna klicka och se veckans schema"). Pure helpers,
// shared by the server (lib/schoolLessons.ts) and Home / the child's page.
//
// SchoolSoft sends every lesson as its own calendar entry, "Lektion MA" with
// "Christin Lindberg 441 7e MA" as the description. Lessons are NOT school
// items: they are stored on their own (school_lessons) and only ever shown as
// "08:20 Matte" and in the week view — never in the school list, the
// calendar, Home's lists, emails or the change watch.

export type Lesson = {
  /** Stockholm calendar day "YYYY-MM-DD". */
  day: string;
  start: string;          // "HH:MM"
  end: string | null;     // "HH:MM"
  code: string;           // "MA", "SO4", "Elevtid"
  room: string | null;
};

/** Is this calendar entry a timetable lesson (not a test, homework or event)? */
export function isLessonSummary(summary: string, uid = ""): boolean {
  return /^lektion(er)?\b/i.test(summary.trim()) || /(^|[-_.])(lesson|schedule|timetable)[-_.]/i.test(uid);
}

/** "Lektion SO4" → "SO4". */
export function lessonCode(summary: string): string {
  return summary.trim().replace(/^lektion(er)?\s*[:\-–]?\s*/i, "").trim().slice(0, 40) || "Lektion";
}

/** Breaks, food and similar aren't "the first lesson". */
export function countsAsLesson(code: string): boolean {
  return !/^(lunch|rast|frukost|mellanmål|fika|break)\b/i.test(code.trim());
}

/** "Christin Lindberg 441 7e MA" → room "441". */
export function lessonRoom(description: string | null | undefined): string | null {
  if (!description) return null;
  const m = /(?:^|\s)([A-ZÅÄÖ]?\d{2,4}[A-ZÅÄÖ]?)(?=\s|$)/.exec(description);
  return m ? m[1] : null;
}

// Subject codes used by SchoolSoft (Swedish schools) → full + short name.
const SUBJECTS: [RegExp, { sv: string; svShort: string; en: string; enShort: string }][] = [
  [/^(ma|matte|matematik)$/i, { sv: "Matte", svShort: "Matte", en: "Maths", enShort: "Maths" }],
  [/^(sva|sv2|svenska som andraspråk)$/i, { sv: "Svenska som andraspråk", svShort: "Sva", en: "Swedish (2nd lang.)", enShort: "Sva" }],
  [/^(sv|svenska)$/i, { sv: "Svenska", svShort: "Svenska", en: "Swedish", enShort: "Swedish" }],
  [/^(en|eng|engelska)$/i, { sv: "Engelska", svShort: "Eng", en: "English", enShort: "Eng" }],
  [/^(spa|sp|spanska)$/i, { sv: "Spanska", svShort: "Spanska", en: "Spanish", enShort: "Spanish" }],
  [/^(fr|fra|franska)$/i, { sv: "Franska", svShort: "Franska", en: "French", enShort: "French" }],
  [/^(ty|tys|tyska)$/i, { sv: "Tyska", svShort: "Tyska", en: "German", enShort: "German" }],
  [/^(so|so-ämnen)$/i, { sv: "SO", svShort: "SO", en: "Social studies", enShort: "SO" }],
  [/^(no|no-ämnen|nv)$/i, { sv: "NO", svShort: "NO", en: "Science", enShort: "NO" }],
  [/^(bi|bio|biologi)$/i, { sv: "Biologi", svShort: "Bio", en: "Biology", enShort: "Bio" }],
  [/^(fy|fys|fysik)$/i, { sv: "Fysik", svShort: "Fysik", en: "Physics", enShort: "Physics" }],
  [/^(ke|kem|kemi)$/i, { sv: "Kemi", svShort: "Kemi", en: "Chemistry", enShort: "Chem" }],
  [/^(tk|tek|teknik)$/i, { sv: "Teknik", svShort: "Teknik", en: "Technology", enShort: "Tech" }],
  [/^(hi|his|historia)$/i, { sv: "Historia", svShort: "Hist", en: "History", enShort: "History" }],
  [/^(ge|geo|geografi)$/i, { sv: "Geografi", svShort: "Geo", en: "Geography", enShort: "Geo" }],
  [/^(re|rel|religion|religionskunskap)$/i, { sv: "Religion", svShort: "Rel", en: "Religion", enShort: "RE" }],
  [/^(sh|sam|samhällskunskap)$/i, { sv: "Samhällskunskap", svShort: "Samh", en: "Civics", enShort: "Civics" }],
  [/^(idh|id|idrott|idrott och hälsa)$/i, { sv: "Idrott", svShort: "Idrott", en: "PE", enShort: "PE" }],
  [/^(bl|bd|bild)$/i, { sv: "Bild", svShort: "Bild", en: "Art", enShort: "Art" }],
  [/^(mu|mus|musik)$/i, { sv: "Musik", svShort: "Musik", en: "Music", enShort: "Music" }],
  [/^(sl|slö|slöjd|tx|trä|tsl)$/i, { sv: "Slöjd", svShort: "Slöjd", en: "Crafts", enShort: "Crafts" }],
  [/^(hkk|hk|hemkunskap)$/i, { sv: "Hemkunskap", svShort: "Hkk", en: "Home economics", enShort: "Home ec" }],
  [/^(mod|modersmål)$/i, { sv: "Modersmål", svShort: "Modersmål", en: "Mother tongue", enShort: "Mother t." }],
  [/^(elevtid|elevens val|ev)$/i, { sv: "Elevtid", svShort: "Elevtid", en: "Student time", enShort: "Student t." }],
  [/^(mentor|mentorstid|men)$/i, { sv: "Mentorstid", svShort: "Mentor", en: "Mentor time", enShort: "Mentor" }],
];

/** "MA" → "Matte" (short = for the tiny line under a photo). Unknown codes stay as written. */
export function lessonName(code: string, locale: "sv" | "en" = "sv", short = false): string {
  // "SO4", "MA2", "EN 7B" → look up by the letters.
  const letters = code.trim().replace(/[\s\d]+[A-Za-zÅÄÖåäö]?$/, "").replace(/\d+$/, "").trim() || code.trim();
  for (const [re, n] of SUBJECTS) {
    if (re.test(letters) || re.test(code.trim())) return locale === "sv" ? (short ? n.svShort : n.sv) : (short ? n.enShort : n.en);
  }
  return short && code.length > 9 ? code.slice(0, 8) + "…" : code;
}

function ymdOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Monday of the week `ymd` is in. */
export function mondayOf(ymd: string): string {
  const d = new Date(ymd + "T12:00:00");
  const back = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - back);
  return ymdOf(d);
}

export function addDaysYmd(ymd: string, n: number): string {
  const d = new Date(ymd + "T12:00:00");
  d.setDate(d.getDate() + n);
  return ymdOf(d);
}

export type FirstLesson = {
  lesson: Lesson;
  /** "today" = before today's first lesson; "tomorrow"; otherwise "later" (e.g. Monday after a weekend). */
  when: "today" | "tomorrow" | "later";
};

/**
 * The lesson that matters next: today's first lesson until it has started,
 * then the first lesson of the next school day. `now` is the device's local
 * time (Stockholm for these families).
 */
export function nextFirstLesson(lessons: Lesson[], now = new Date()): FirstLesson | null {
  const today = ymdOf(now);
  const nowHm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const firstByDay = new Map<string, Lesson>();
  for (const l of lessons) {
    if (!countsAsLesson(l.code) || l.day < today) continue;
    const cur = firstByDay.get(l.day);
    if (!cur || l.start < cur.start) firstByDay.set(l.day, l);
  }
  const days = Array.from(firstByDay.keys()).sort();
  for (const day of days) {
    const l = firstByDay.get(day)!;
    if (day === today && l.start <= nowHm) continue;
    const tomorrow = addDaysYmd(today, 1);
    return { lesson: l, when: day === today ? "today" : day === tomorrow ? "tomorrow" : "later" };
  }
  return null;
}
