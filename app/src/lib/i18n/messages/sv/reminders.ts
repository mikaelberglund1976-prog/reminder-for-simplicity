import type { Messages } from "../en";

export const reminders: Messages["reminders"] = {
  categories: {
    SUBSCRIPTION: "Abonnemang", BIRTHDAY: "Födelsedag", INSURANCE: "Försäkring", CONTRACT: "Avtal",
    HEALTH: "Hälsa", BILL: "Räkning", OTHER: "Övrigt", SCHOOL: "Skola", CHORE: "Syssla", TRAINING: "Aktivitet",
  },
  categoriesPlural: {
    SUBSCRIPTION: "Abonnemang", BIRTHDAY: "Födelsedagar", INSURANCE: "Försäkringar", CONTRACT: "Avtal",
    HEALTH: "Hälsa", BILL: "Räkningar", OTHER: "Övrigt",
  },
  recurrence: { ONCE: "En gång", DAILY: "Varje dag", WEEKLY: "Varje vecka", MONTHLY: "Varje månad", YEARLY: "Varje år" },
  visibility: { PRIVATE: "Privat", PARENTS: "Föräldrar", HOUSEHOLD: "Familjen" },
  relative: {
    today: "Idag",
    tomorrow: "Imorgon",
    onWeekday: (weekday) => `På ${weekday}`,
    inDays: (n) => `Om ${n} dagar`,
    inWeeks: (n) => `Om ${n} veckor`,
    inMonths: (n) => `Om ${n} månader`,
    daysAgo: (n) => (n === 1 ? "för 1 dag sedan" : `för ${n} dagar sedan`),
  },
  overdue: "Försenad",
  overdueOn: (date) => `Försenad · ${date}`,
  schoolKinds: { TEST: "Prov", HOMEWORK: "Läxa", OTHER: "Skola" },
};
