// 2026-10-24 (launch list rows 57–64): the refreshed start pages — adult
// Home (attention, next up per child) and the child's "my day".
export const home3 = {
  // Attention (row 59)
  attentionTitle: "Needs your attention",
  attSeen: "OK",
  attClash: (text: string) => text,
  attNoRide: (title: string, who: string | null) => `No ride yet: ${title}${who ? ` (${who})` : ""}`,
  attTestSoon: (who: string, title: string, when: string) => `${who}: ${title} ${when}`,
  attUnassigned: (n: number) => (n === 1 ? "1 activity has no one assigned" : `${n} activities have no one assigned`),
  attFix: "Fix",
  // 2026-10-25 (Etapp 0 G8): a school/activity link that stopped syncing
  attFeedFailed: (source: string, who: string) => `${source}${who ? ` for ${who}` : ""} isn't syncing`,
  attFeedStale: (source: string, who: string, since: string) => `${source}${who ? ` for ${who}` : ""} hasn't synced since ${since}`,
  attFeedNever: (source: string, who: string) => `${source}${who ? ` for ${who}` : ""} hasn't synced yet`,
  attCheck: "Check",
  // Next up per child (row 57)
  startsAt: (day: string, time: string) => `Starts ${day} ${time}`,
  offDay: (day: string) => `${day} · off school`,
  nextLabel: "Next:",
  more: (n: number) => `+${n}`,
  openChild: (name: string) => `Open ${name}'s day`,
  // Today (row 58) / coming up (row 60)
  showCalendar: "Show calendar",
  showAll: "Show all",
  comingUp: "Coming up",
  // Child's Home (row 62)
  nextLesson: "Next lesson",
  testsHomework: "Tests & homework",
  activities: "Activities",
  chores: "Chores",
  nothing: "Nothing",
  noneToday: "None today",
  allClear: "All clear",
  choresLeft: (n: number) => `${n} left`,
  choresDone: "All done",
  noChoresRow: "No chores this week",
  today: "Today",
  todayNothing: "Nothing else today",
  childsDay: (name: string) => `${name}'s day`,
  viewing: (name: string) => `You're looking at ${name}'s day — you can tick off, add and change here.`,
  backHome: "Back to Home",
  // About me (moved from the child's Home to More)
  aboutMe: "About me",
  aboutMeTitle: "What does the app save about me?",
};
