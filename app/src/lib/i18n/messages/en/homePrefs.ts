// 2026-10-09: Settings → Home (components/HomePrefsSettings.tsx) + the
// "Next up per child" section on Home.
export const homePrefs = {
  cardTitle: "Home",
  intro: "Choose what your start page shows. Only affects you.",
  todayTitle: "Today",
  todayEmptyDone: "All done for today",
  kindReminder: "Reminder",
  sections: {
    today: "Today — the whole family, in time order",
    family: "Family photos row",
    quick: "Quick actions",
    comingUp: "Coming up (reminders, next 7 days)",
    perChild: "Next up per child",
    stats: "Overview numbers",
    chores: "Chores this week",
    reminders: "All reminders list",
  } as Record<string, string>,
  perChildTitle: "In “Next up per child”",
  kinds: { tests: "Tests", homework: "Homework & assignments", activities: "Activities (trainings, matches)", schoolOther: "Other school events" } as Record<string, string>,
  countLabel: "How many per child",
  childrenLabel: "Children to show",
  saved: "Saved",
  reset: "Reset to default",
  // Home section
  nextUpTitle: "Next up per child",
  nothingSoon: "Nothing coming up",
  moreSoon: (n: number) => `+${n} more coming up`,
  kindTest: "Test",
  kindHomework: "Homework",
  kindActivity: "Activity",
  kindSchool: "School",
  customize: "Customize",
};
