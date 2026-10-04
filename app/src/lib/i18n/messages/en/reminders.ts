// Shared words for reminders — used on Home, the calendar, the reminder pages and emails.
export const reminders = {
  categories: {
    SUBSCRIPTION: "Subscription", BIRTHDAY: "Birthday", INSURANCE: "Insurance", CONTRACT: "Contract",
    HEALTH: "Health", BILL: "Bill", OTHER: "Other", SCHOOL: "School", CHORE: "Chore", TRAINING: "Activity",
  } as Record<string, string>,
  categoriesPlural: {
    SUBSCRIPTION: "Subscriptions", BIRTHDAY: "Birthdays", INSURANCE: "Insurance", CONTRACT: "Contracts",
    HEALTH: "Health", BILL: "Bills", OTHER: "Other",
  } as Record<string, string>,
  recurrence: { ONCE: "Once", DAILY: "Daily", WEEKLY: "Weekly", MONTHLY: "Monthly", YEARLY: "Yearly" } as Record<string, string>,
  visibility: { PRIVATE: "Private", PARENTS: "Parents", HOUSEHOLD: "Family" } as Record<string, string>,
  relative: {
    today: "Today",
    tomorrow: "Tomorrow",
    onWeekday: (weekday: string) => `On ${weekday}`,
    inDays: (n: number) => `In ${n} days`,
    inWeeks: (n: number) => `In ${n} weeks`,
    inMonths: (n: number) => `In ${n} months`,
    daysAgo: (n: number) => (n === 1 ? "1 day ago" : `${n} days ago`),
  },
  overdue: "Overdue",
  overdueOn: (date: string) => `Overdue · ${date}`,
  schoolKinds: { TEST: "Test", HOMEWORK: "Homework", OTHER: "School" } as Record<string, string>,
};
